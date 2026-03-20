import {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
  GOOGLE_SPREADSHEET_ID,
} from 'astro:env/server';

type FormType = 'home-contact' | 'general-inquiry' | 'referral' | 'training';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

const SHEET_HEADERS: Record<FormType, string[]> = {
  'home-contact': [
    'Timestamp',
    'First Name',
    'Last Name',
    'Email',
    'Subject',
    'Message',
  ],
  'general-inquiry': [
    'Timestamp',
    'First Name',
    'Last Name',
    'Email',
    'Subject',
    'Message',
  ],
  referral: [
    'Timestamp',
    'Referral Type',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Address',
    'City',
    'Suburb',
    'Area Code',
    'Referral Source',
    'Identified Name',
    'NHI',
    'Out Status',
    'Services',
    'Additional Info',
  ],
  training: [
    'Timestamp',
    'Contact Name',
    'Email',
    'Contact Phone',
    'Training Hours',
    'Start Date',
    'End Date',
    'Training Topics',
    'Other Topic Details',
    'Additional Notes',
  ],
};

const FIELD_TO_HEADER: Record<string, string> = {
  'first-name': 'First Name',
  'last-name': 'Last Name',
  email: 'Email',
  subject: 'Subject',
  message: 'Message',
  'referral-type': 'Referral Type',
  phone: 'Phone',
  address: 'Address',
  city: 'City',
  suburb: 'Suburb',
  'area-code': 'Area Code',
  'referral-source': 'Referral Source',
  'identified-name': 'Identified Name',
  NHI: 'NHI',
  'out-status': 'Out Status',
  services: 'Services',
  'additional-info': 'Additional Info',
  'contact-name': 'Contact Name',
  'contact-phone': 'Contact Phone',
  'training-hours': 'Training Hours',
  'start-date': 'Start Date',
  'end-date': 'End Date',
  'training-topics': 'Training Topics',
  'other-topic-details': 'Other Topic Details',
  'additional-notes': 'Additional Notes',
};

// --- JWT Auth ---

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

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

async function createSignedJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = textToBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = textToBase64Url(
    JSON.stringify({
      iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: SCOPES,
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

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  const jwt = await createSignedJwt();
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

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.accessToken;
}

// --- Retry Logic ---

async function fetchWithRetry(
  url: string,
  options: RequestInit,
): Promise<Response> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(url, options);

    if (response.ok) return response;

    const isRetryable = response.status === 429 || response.status >= 500;
    const isLastAttempt = attempt === MAX_RETRIES - 1;

    if (!isRetryable || isLastAttempt) {
      const errorBody = await response.text();
      throw new Error(
        `Google Sheets API error (${response.status}): ${errorBody}`,
      );
    }

    const delayMs = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Retry loop exited unexpectedly');
}

// --- Sheets Operations ---

interface SheetProperties {
  sheetId: number;
  title: string;
}

interface SpreadsheetMetadata {
  sheets: { properties: SheetProperties }[];
}

async function getSpreadsheetMetadata(): Promise<SpreadsheetMetadata> {
  const token = await getAccessToken();
  const response = await fetchWithRetry(
    `${SHEETS_API_BASE}/${GOOGLE_SPREADSHEET_ID}?fields=sheets.properties(sheetId,title)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return (await response.json()) as SpreadsheetMetadata;
}

async function createSheet(sheetTitle: string): Promise<void> {
  const token = await getAccessToken();
  await fetchWithRetry(
    `${SHEETS_API_BASE}/${GOOGLE_SPREADSHEET_ID}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: sheetTitle } } }],
      }),
    },
  );
}

async function getHeaderRow(sheetTitle: string): Promise<string[]> {
  const token = await getAccessToken();
  const range = encodeURIComponent(`'${sheetTitle}'!1:1`);
  const response = await fetchWithRetry(
    `${SHEETS_API_BASE}/${GOOGLE_SPREADSHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = (await response.json()) as { values?: string[][] };
  return data.values?.[0] ?? [];
}

async function setHeaderRow(
  sheetTitle: string,
  headers: string[],
): Promise<void> {
  const token = await getAccessToken();
  const range = encodeURIComponent(`'${sheetTitle}'!1:1`);
  await fetchWithRetry(
    `${SHEETS_API_BASE}/${GOOGLE_SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [headers] }),
    },
  );
}

async function appendRow(sheetTitle: string, values: string[]): Promise<void> {
  const token = await getAccessToken();
  const range = encodeURIComponent(`'${sheetTitle}'!A:A`);
  await fetchWithRetry(
    `${SHEETS_API_BASE}/${GOOGLE_SPREADSHEET_ID}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [values] }),
    },
  );
}

// --- Sheet Validation ---

async function ensureSheet(formType: FormType): Promise<void> {
  const expectedHeaders = SHEET_HEADERS[formType];
  const metadata = await getSpreadsheetMetadata();
  const sheetExists = metadata.sheets.some(
    (sheet) => sheet.properties.title === formType,
  );

  if (!sheetExists) {
    await createSheet(formType);
    await setHeaderRow(formType, expectedHeaders);
    return;
  }

  const currentHeaders = await getHeaderRow(formType);
  const expectedHeadersPresent = expectedHeaders.every(
    (header, index) => currentHeaders[index] === header,
  );

  if (!expectedHeadersPresent) {
    await setHeaderRow(formType, expectedHeaders);
  }
}

// --- Public API ---

export async function appendFormSubmission(
  formType: FormType,
  fields: Record<string, string>,
): Promise<void> {
  await ensureSheet(formType);

  const expectedHeaders = SHEET_HEADERS[formType];
  const timestamp = new Date().toISOString();

  const rowValues = expectedHeaders.map((header) => {
    if (header === 'Timestamp') return timestamp;

    for (const [fieldName, headerName] of Object.entries(FIELD_TO_HEADER)) {
      if (headerName === header) {
        return fields[fieldName] ?? '';
      }
    }

    return '';
  });

  await appendRow(formType, rowValues);
}
