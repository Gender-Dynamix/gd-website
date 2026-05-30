import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
} from 'astro:env/server';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

const tokenCache = new Map<
  string,
  { accessToken: string; expiresAt: number }
>();

function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function textToBase64Url(text: string): string {
  return base64UrlEncode(new TextEncoder().encode(text));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function createSignedJwt(scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = textToBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = textToBase64Url(
    JSON.stringify({
      iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );

  const signingInput = `${header}.${claims}`;
  const keyData = pemToArrayBuffer(GOOGLE_PRIVATE_KEY);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export async function getAccessToken(scope: string): Promise<string> {
  const cached = tokenCache.get(scope);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.accessToken;
  }

  const jwt = await createSignedJwt(scope);
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache.set(scope, {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  });

  return data.access_token;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  scope: string,
  apiName = 'Google API',
): Promise<Response> {
  let currentHeaders = new Headers(options.headers);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, { ...options, headers: currentHeaders });

    if (response.ok) return response;

    if (response.status === 401) {
      tokenCache.delete(scope);
      const freshToken = await getAccessToken(scope);
      currentHeaders.set('Authorization', `Bearer ${freshToken}`);
      continue;
    }

    const isRetryable = response.status === 429 || response.status >= 500;

    if (!isRetryable || attempt === MAX_RETRIES - 1) {
      const errorBody = await response.text();
      throw new Error(`${apiName} error (${response.status}): ${errorBody}`);
    }

    await response.body?.cancel();

    const delayMs = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Retry loop exhausted');
}
