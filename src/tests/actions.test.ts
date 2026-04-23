// src/tests/actions.test.ts
//
// index.ts uses defineAction (mocked to pass the handler through) and
// ActionError (mocked as a plain Error subclass).  We call handler() directly
// with a plain object that mirrors what Astro's form parser would produce.
//
// appendFormSubmission is mocked at the module level so these tests never
// make real network calls.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActionError } from 'astro:actions';

vi.mock('../utils/google-sheets', () => ({
  appendFormSubmission: vi.fn().mockResolvedValue(undefined),
}));
// Now import the action and the mocked dependency
import { server } from '../actions/index';
import { appendFormSubmission } from '../utils/google-sheets';

// ─── Handler type ─────────────────────────────────────────────────────────────
// Astro's installed node_modules types for `defineAction` don't expose a
// `.handler` property — that's intentional in the framework's public API.
// Our mock DOES return `{ handler }`, but TypeScript resolves the *type* of
// `server.submitForm` from Astro's declarations rather than our mock's return.

type SubmitHandler = (
  input: Record<string, unknown>,
  context: { clientAddress?: string },
) => Promise<{ success: boolean }>;

// This is the only cast in the file — everything below uses `submitForm` directly.
const submitForm = (server.submitForm as unknown as { handler: SubmitHandler })
  .handler;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal Astro action context */
const fakeContext = { clientAddress: '127.0.0.1' };

/** A happy-path home-contact payload */
const validHomeContact = {
  'form-type': 'home-contact',
  'cf-turnstile-response': 'valid-token',
  'first-name': 'Jane',
  'last-name': 'Doe',
  email: 'jane@example.com',
  subject: 'Hello',
  message: 'This is a test',
};

/**
 * Stub fetch so Turnstile verification returns the given success value.
 * Resets between tests via afterEach.
 */
function mockTurnstile(success: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async () => {
      // Returning a NEW Response every time this is called
      return new Response(JSON.stringify({ success }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
}

vi.mock('astro:env/server', () => ({
  TURNSTILE_SECRET_KEY: 'mock-secret-key',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@example.com',
  GOOGLE_PRIVATE_KEY: 'test-key',
  GOOGLE_SPREADSHEET_ID: 'test-id',
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Honeypot ─────────────────────────────────────────────────────────────────

describe('honeypot spam detection', () => {
  it('returns success immediately when the honeypot field is filled', async () => {
    // No fetch mock needed — we should never reach Turnstile or Sheets
    const result = await submitForm(
      { ...validHomeContact, website: 'http://spam.example.com' },
      fakeContext,
    );
    expect(result).toEqual({ success: true });
    expect(appendFormSubmission).not.toHaveBeenCalled();
  });

  it('does not treat an empty honeypot field as spam', async () => {
    mockTurnstile(true);
    const result = await submitForm(
      { ...validHomeContact, website: '' },
      fakeContext,
    );
    expect(result).toEqual({ success: true });
  });

  it('treats a whitespace-only honeypot as spam', async () => {
    const result = await submitForm(
      { ...validHomeContact, website: '   ' },
      fakeContext,
    );
    expect(result).toEqual({ success: true });
    expect(appendFormSubmission).not.toHaveBeenCalled();
  });
});

// ─── Form type validation ─────────────────────────────────────────────────────

describe('form-type validation', () => {
  it('throws BAD_REQUEST for an unknown form type', async () => {
    mockTurnstile(true);
    await expect(
      submitForm(
        { ...validHomeContact, 'form-type': 'unknown-type' },
        fakeContext,
      ),
    ).rejects.toThrow(ActionError);

    await expect(
      submitForm(
        { ...validHomeContact, 'form-type': 'unknown-type' },
        fakeContext,
      ),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Invalid form type',
    });
  });

  it('accepts all four valid form types', async () => {
    mockTurnstile(true);

    const validPayloads = [
      validHomeContact,
      { ...validHomeContact, 'form-type': 'general-inquiry' },
      {
        'form-type': 'referral',
        'cf-turnstile-response': 'tok',
        'referral-type': 'Self',
        'first-name': 'A',
        'last-name': 'B',
        email: 'a@b.com',
        phone: '021000000',
        address: '1 St',
        city: 'Auckland',
        suburb: 'CBD',
        'area-code': '1010',
        'referral-source': 'GP',
      },
      {
        'form-type': 'training',
        'cf-turnstile-response': 'tok',
        'contact-name': 'C',
        email: 'c@d.com',
        'contact-phone': '021111111',
        'org-name': 'Test School',
        'org-type': 'school',
        location: '123 Main St, Tauranga',
        'attendee-count': '20',
        'training-reason': 'Staff requested it',
        'training-hours': '2',
        'start-date': '2025-01-01',
        'end-date': '2025-01-02',
      },
    ];

    for (const fields of validPayloads) {
      await expect(submitForm(fields, fakeContext)).resolves.toEqual({
        success: true,
      });
    }
  });
});

// ─── Turnstile verification ───────────────────────────────────────────────────

describe('Turnstile CAPTCHA verification', () => {
  it('throws BAD_REQUEST when cf-turnstile-response is missing', async () => {
    const { 'cf-turnstile-response': _, ...noToken } = validHomeContact;
    await expect(submitForm(noToken, fakeContext)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Please complete the verification challenge',
    });
  });

  it('throws BAD_REQUEST when cf-turnstile-response is an empty string', async () => {
    await expect(
      submitForm(
        { ...validHomeContact, 'cf-turnstile-response': '' },
        fakeContext,
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('throws BAD_REQUEST when Turnstile returns success: false', async () => {
    mockTurnstile(false);
    await expect(
      submitForm(validHomeContact, fakeContext),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Verification failed. Please try again.',
    });
  });

  it('calls Turnstile with the correct endpoint and fields', async () => {
    mockTurnstile(true);
    await submitForm(validHomeContact, fakeContext);

    const fetchMock = vi.mocked(fetch);
    const turnstileCall = fetchMock.mock.calls.find((c) =>
      (c[0] as string).includes('turnstile'),
    );

    expect(turnstileCall).toBeDefined();
    const body = new URLSearchParams(
      (turnstileCall![1] as RequestInit).body as string,
    );

    expect(body.get('response')).toBe('valid-token');
    expect(body.get('remoteip')).toBe('127.0.0.1');
    expect(body.get('secret')).toBeTruthy(); // This will now pass!
  });
}); // This is the final closing brace for the describe block

// ─── Field validation ─────────────────────────────────────────────────────────

describe('field validation', () => {
  beforeEach(() => mockTurnstile(true));

  it('throws BAD_REQUEST listing missing required fields', async () => {
    const err = await submitForm(
      { 'form-type': 'home-contact', 'cf-turnstile-response': 'tok' },
      fakeContext,
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ActionError);
    const actionErr = err as ActionError;
    expect(actionErr.code).toBe('BAD_REQUEST');
    expect(actionErr.message).toContain('your first name');
    expect(actionErr.message).toContain('your last name');
    expect(actionErr.message).toContain('your email address');
    expect(actionErr.message).toContain('a subject');
    expect(actionErr.message).toContain('a message');
  });

  it('rejects an invalid email address', async () => {
    const err = await submitForm(
      { ...validHomeContact, email: 'not-an-email' },
      fakeContext,
    ).catch((e: unknown) => e);

    const actionErr = err as ActionError;
    expect(actionErr.code).toBe('BAD_REQUEST');
    expect(actionErr.message).toContain('valid email address');
  });

  it('accepts a valid email address', async () => {
    await expect(
      submitForm(
        { ...validHomeContact, email: 'user+tag@sub.domain.co.nz' },
        fakeContext,
      ),
    ).resolves.toEqual({ success: true });
  });

  it('trims whitespace when checking required fields', async () => {
    const err = await submitForm(
      { ...validHomeContact, 'first-name': '   ' },
      fakeContext,
    ).catch((e: unknown) => e);

    const actionErr = err as ActionError;
    expect(actionErr.code).toBe('BAD_REQUEST');
    expect(actionErr.message).toContain('your first name');
  });

  it('uses friendly label names from FIELD_LABELS in error messages', async () => {
    // 'phone' in referral form → "your phone number"
    const err = await submitForm(
      {
        'form-type': 'referral',
        'cf-turnstile-response': 'tok',
        'referral-type': 'Self',
        'first-name': 'A',
        'last-name': 'B',
        email: 'a@b.com',
        // phone intentionally missing
        address: '1 St',
        city: 'Auckland',
        suburb: 'CBD',
        'area-code': '1010',
        'referral-source': 'GP',
      },
      fakeContext,
    ).catch((e: unknown) => e);

    const actionErr = err as ActionError;
    expect(actionErr.code).toBe('BAD_REQUEST');
    expect(actionErr.message).toContain('your phone number');
  });

  it('returns multiple errors joined by newlines', async () => {
    const err = await submitForm(
      {
        'form-type': 'home-contact',
        'cf-turnstile-response': 'tok',
        'first-name': 'Jane',
        // last-name, email, subject, message all missing
      },
      fakeContext,
    ).catch((e: unknown) => e);

    const actionErr = err as ActionError;
    const lines = actionErr.message.split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(1);
  });
});

// ─── Google Sheets submission ─────────────────────────────────────────────────

describe('Google Sheets submission', () => {
  beforeEach(() => mockTurnstile(true));

  it('calls appendFormSubmission with the correct form type and fields', async () => {
    await submitForm(validHomeContact, fakeContext);

    expect(appendFormSubmission).toHaveBeenCalledOnce();
    const [formType, fields] = vi.mocked(appendFormSubmission).mock.calls[0];
    expect(formType).toBe('home-contact');
    expect(fields['first-name']).toBe('Jane');
    expect(fields['email']).toBe('jane@example.com');
  });

  it('throws INTERNAL_SERVER_ERROR when appendFormSubmission rejects', async () => {
    vi.mocked(appendFormSubmission).mockRejectedValueOnce(
      new Error('Network failure'),
    );

    await expect(
      submitForm(validHomeContact, fakeContext),
    ).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: expect.stringContaining('could not save'),
    });
  });

  it('does not call appendFormSubmission when validation fails', async () => {
    await submitForm(
      { 'form-type': 'home-contact', 'cf-turnstile-response': 'tok' },
      fakeContext,
    ).catch(() => {});

    expect(appendFormSubmission).not.toHaveBeenCalled();
  });
});

// ─── Happy path end-to-end ────────────────────────────────────────────────────

describe('end-to-end happy path', () => {
  it('returns { success: true } for a complete valid home-contact submission', async () => {
    mockTurnstile(true);
    const result = await submitForm(validHomeContact, fakeContext);
    expect(result).toEqual({ success: true });
  });

  it('passes clientAddress to Turnstile as remoteip', async () => {
    mockTurnstile(true);
    await submitForm(validHomeContact, { clientAddress: '203.0.113.42' });

    const fetchMock = vi.mocked(fetch);
    const body = new URLSearchParams(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.get('remoteip')).toBe('203.0.113.42');
  });

  it('uses empty string for remoteip when clientAddress is absent', async () => {
    mockTurnstile(true);
    await submitForm(validHomeContact, { clientAddress: undefined });

    const fetchMock = vi.mocked(fetch);
    const body = new URLSearchParams(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.get('remoteip')).toBe('');
  });
});
