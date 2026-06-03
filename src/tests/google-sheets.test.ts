import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SHEET_HEADERS, type FormType } from '../utils/google-sheets';

// ─── appendFormSubmission import (reset per-test for fresh module state) ───────
//
// vi.resetModules() in beforeEach discards the module registry so each test
// starts with cachedToken = null and verifiedSheets empty — without needing
// a test-only reset export in the production module.

let appendFormSubmission!: (
  formType: FormType,
  fields: Record<string, string>,
) => Promise<void>;

// ─── Response helpers ─────────────────────────────────────────────────────────

function mockResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

function metadataWith(...titles: string[]): Response {
  return mockResponse({
    sheets: titles.map((title, i) => ({
      properties: { sheetId: i + 1, title },
    })),
  });
}

const emptyMetadata = (): Response => mockResponse({ sheets: [] });
const tokenResponse = (): Response =>
  mockResponse({ access_token: 'test-access-token', expires_in: 3600 });
const sheetsOk = (): Response => mockResponse({});

// ─── Mock sequence helpers ────────────────────────────────────────────────────

/**
 * Queues the responses for one full cold-start cycle where the sheet does not
 * yet exist (the normal first-run case):
 *   token → emptyMetadata → batchUpdate(ok) → getHeaderRow(match) → appendRow
 */
function mockFullCycle(
  fetchMock: ReturnType<typeof vi.mocked<typeof fetch>>,
  headers: string[],
): void {
  fetchMock
    .mockResolvedValueOnce(tokenResponse()) // #1
    .mockResolvedValueOnce(emptyMetadata()) // #2 sheet doesn't exist yet
    .mockResolvedValueOnce(sheetsOk()) // #3 batchUpdate (createSheet)
    .mockResolvedValueOnce(mockResponse({ values: [headers] })) // #4 getHeaderRow
    .mockResolvedValueOnce(sheetsOk()); // #5 appendRow
}

/** Queues a single response for a sheet-cache-hit call (appendRow only). */
function mockCacheHit(
  fetchMock: ReturnType<typeof vi.mocked<typeof fetch>>,
): void {
  fetchMock.mockResolvedValueOnce(sheetsOk());
}

/** Skips setTimeout delays so backoff tests don't actually wait. */
function skipDelays() {
  vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: TimerHandler) => {
    if (typeof fn === 'function') fn();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  });
}

// ─── Sample field objects ─────────────────────────────────────────────────────

const homeContactFields = {
  'first-name': 'Jane',
  'last-name': 'Doe',
  email: 'jane@example.com',
  subject: 'Hello',
  message: 'Test message',
};

const generalInquiryFields = {
  'first-name': 'Alice',
  'last-name': 'Wong',
  email: 'alice@example.com',
  subject: 'Question',
  message: 'I have a question',
};

const referralFields = {
  'referral-type': 'GP',
  'first-name': 'Bob',
  'last-name': 'Smith',
  email: 'bob@example.com',
  phone: '021000000',
  address: '1 Test St',
  city: 'Auckland',
  suburb: 'CBD',
  'area-code': '1010',
  'referral-source': 'GP',
  'date-of-birth': '15/06/1990',
};

const trainingFields = {
  'contact-name': 'Carol',
  email: 'carol@example.com',
  'contact-phone': '021111111',
  'training-hours': '4',
  'start-date': '2025-06-01',
  'end-date': '2025-06-02',
};

// ─── Global setup / teardown ──────────────────────────────────────────────────

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('crypto', {
    subtle: {
      importKey: vi.fn().mockResolvedValue({ type: 'private' }),
      sign: vi.fn().mockResolvedValue(new Uint8Array(8).buffer),
    },
  });
  vi.resetModules();
  ({ appendFormSubmission } = await import('../utils/google-sheets'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ─── Token caching ────────────────────────────────────────────────────────────

describe('token caching', () => {
  it('fetches a new token on the first request', async () => {
    const fetchMock = vi.mocked(fetch);
    mockFullCycle(fetchMock, SHEET_HEADERS['home-contact']);
    await appendFormSubmission('home-contact', homeContactFields);

    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall[0]).toBe('https://oauth2.googleapis.com/token');
    expect((firstCall[1] as RequestInit).method).toBe('POST');
  });

  it('reuses the cached token within its expiry window', async () => {
    const fetchMock = vi.mocked(fetch);
    mockFullCycle(fetchMock, SHEET_HEADERS['home-contact']);
    await appendFormSubmission('home-contact', homeContactFields);
    const callsAfterFirst = fetchMock.mock.calls.length;

    // 2 minutes — inside the 5-min sheet TTL and the ~59-min token TTL
    vi.advanceTimersByTime(2 * 60 * 1000);

    mockCacheHit(fetchMock);
    await appendFormSubmission('home-contact', homeContactFields);

    // Only one additional fetch (appendRow), no second token request
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst + 1);
    const tokenCallCount = fetchMock.mock.calls.filter((c) =>
      (c[0] as string).includes('oauth2.googleapis.com'),
    ).length;
    expect(tokenCallCount).toBe(1);
  });

  it('re-fetches a token after it expires', async () => {
    const fetchMock = vi.mocked(fetch);
    mockFullCycle(fetchMock, SHEET_HEADERS['home-contact']);
    await appendFormSubmission('home-contact', homeContactFields);

    // Advance past token expiry (3600s − 60s buffer = 3540s)
    vi.advanceTimersByTime(3541 * 1000);

    // Both token and sheet caches are now stale — full cold-start again
    mockFullCycle(fetchMock, SHEET_HEADERS['home-contact']);
    await appendFormSubmission('home-contact', homeContactFields);

    const tokenCallCount = fetchMock.mock.calls.filter((c) =>
      (c[0] as string).includes('oauth2.googleapis.com'),
    ).length;
    expect(tokenCallCount).toBe(2);
  });
});

// ─── fetchWithRetry — 401 handling ───────────────────────────────────────────

describe('fetchWithRetry — 401 token refresh', () => {
  it('invalidates the token cache and retries on 401', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(tokenResponse()) // #1 initial token
      .mockResolvedValueOnce(textResponse('Unauthorized', 401)) // #2 metadata → 401
      .mockResolvedValueOnce(tokenResponse()) // #3 token refresh
      .mockResolvedValueOnce(metadataWith('home-contact')) // #4 metadata retry ok, sheet exists
      // no batchUpdate — sheet already exists
      .mockResolvedValueOnce(
        mockResponse({ values: [SHEET_HEADERS['home-contact']] }),
      ) // #5 getHeaderRow
      .mockResolvedValueOnce(sheetsOk()); // #6 appendRow

    await expect(
      appendFormSubmission('home-contact', homeContactFields),
    ).resolves.toBeUndefined();

    const tokenCalls = fetchMock.mock.calls.filter((c) =>
      (c[0] as string).includes('oauth2.googleapis.com'),
    );
    expect(tokenCalls).toHaveLength(2);
  });

  it('throws if the request still fails after a 401 token refresh', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(textResponse('Unauthorized', 401))
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(textResponse('Still forbidden', 403));

    await expect(
      appendFormSubmission('home-contact', homeContactFields),
    ).rejects.toThrow('Google Sheets API error (403)');
  });
});

// ─── fetchWithRetry — 429 / 5xx backoff ──────────────────────────────────────

describe('fetchWithRetry — exponential backoff', () => {
  it('retries on 429 and succeeds on the next attempt', async () => {
    skipDelays();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(textResponse('Too Many Requests', 429)) // metadata attempt 0
      .mockResolvedValueOnce(metadataWith('home-contact')) // metadata attempt 1 ok, sheet exists
      // no batchUpdate — sheet already exists
      .mockResolvedValueOnce(
        mockResponse({ values: [SHEET_HEADERS['home-contact']] }),
      )
      .mockResolvedValueOnce(sheetsOk()); // appendRow

    await expect(
      appendFormSubmission('home-contact', homeContactFields),
    ).resolves.toBeUndefined();
  });

  it('retries on 500 and succeeds on the next attempt', async () => {
    skipDelays();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(textResponse('Internal Server Error', 500)) // metadata attempt 0
      .mockResolvedValueOnce(metadataWith('home-contact')) // metadata attempt 1 ok, sheet exists
      // no batchUpdate — sheet already exists
      .mockResolvedValueOnce(
        mockResponse({ values: [SHEET_HEADERS['home-contact']] }),
      )
      .mockResolvedValueOnce(sheetsOk()); // appendRow

    await expect(
      appendFormSubmission('home-contact', homeContactFields),
    ).resolves.toBeUndefined();
  });

  it('throws immediately on a non-retryable 4xx (e.g. 403)', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(textResponse('Forbidden', 403));

    await expect(
      appendFormSubmission('home-contact', homeContactFields),
    ).rejects.toThrow('Google Sheets API error (403)');
  });

  it('throws after exhausting all retries on persistent 500s', async () => {
    skipDelays();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(textResponse('Error', 500)) // attempt 0
      .mockResolvedValueOnce(textResponse('Error', 500)) // attempt 1
      .mockResolvedValueOnce(textResponse('Error', 500)); // attempt 2 (MAX_RETRIES=3)

    await expect(
      appendFormSubmission('home-contact', homeContactFields),
    ).rejects.toThrow('Google Sheets API error (500)');
  });
});

// ─── ensureSheet — sheet creation ────────────────────────────────────────────

describe('ensureSheet — sheet creation', () => {
  it('calls createSheet (batchUpdate) when the sheet does not exist', async () => {
    const fetchMock = vi.mocked(fetch);
    mockFullCycle(fetchMock, SHEET_HEADERS['home-contact']);
    await appendFormSubmission('home-contact', homeContactFields);

    const batchUpdateCalls = fetchMock.mock.calls.filter((c) =>
      (c[0] as string).includes('batchUpdate'),
    );
    expect(batchUpdateCalls).toHaveLength(1);
    const body = JSON.parse(
      (batchUpdateCalls[0][1] as RequestInit).body as string,
    );
    expect(body.requests[0].addSheet.properties.title).toBe('home-contact');
  });

  it('skips createSheet when the sheet already exists in metadata', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(metadataWith('home-contact')) // sheet exists
      // no batchUpdate
      .mockResolvedValueOnce(
        mockResponse({ values: [SHEET_HEADERS['home-contact']] }),
      )
      .mockResolvedValueOnce(sheetsOk()); // appendRow

    await appendFormSubmission('home-contact', homeContactFields);

    const batchUpdateCalls = fetchMock.mock.calls.filter((c) =>
      (c[0] as string).includes('batchUpdate'),
    );
    expect(batchUpdateCalls).toHaveLength(0);
  });

  it('swallows "already exists" from createSheet and continues (race condition)', async () => {
    // Correct sequence (token cached after #1, no extra token fetches):
    //   #1 token  →  #2 emptyMetadata (sheet not found yet)
    //   →  #3 batchUpdate→400 (swallowed, race condition)
    //   →  #4 getHeaderRow (headers match)  →  #5 appendRow
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(tokenResponse()) // #1
      .mockResolvedValueOnce(emptyMetadata()) // #2
      .mockResolvedValueOnce(
        // #3 createSheet → "already exists"
        textResponse(
          JSON.stringify({ error: { message: 'already exists' } }),
          400,
        ),
      )
      .mockResolvedValueOnce(
        mockResponse({ values: [SHEET_HEADERS['home-contact']] }),
      ) // #4 headers match
      .mockResolvedValueOnce(sheetsOk()); // #5 appendRow

    await expect(
      appendFormSubmission('home-contact', homeContactFields),
    ).resolves.toBeUndefined();
  });

  it('rethrows createSheet errors that are not "already exists"', async () => {
    skipDelays();
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(tokenResponse()) // #1
      .mockResolvedValueOnce(emptyMetadata()) // #2 sheet doesn't exist → createSheet attempted
      .mockResolvedValueOnce(textResponse('Quota', 429)) // #3 attempt 0
      .mockResolvedValueOnce(textResponse('Quota', 429)) // attempt 1
      .mockResolvedValueOnce(textResponse('Quota', 429)); // attempt 2 → throws

    await expect(
      appendFormSubmission('home-contact', homeContactFields),
    ).rejects.toThrow('Google Sheets API error (429)');
  });
});

// ─── ensureSheet — header validation ─────────────────────────────────────────

describe('ensureSheet — header validation', () => {
  it('does NOT call setHeaderRow when headers already match', async () => {
    const fetchMock = vi.mocked(fetch);
    mockFullCycle(fetchMock, SHEET_HEADERS['home-contact']);
    await appendFormSubmission('home-contact', homeContactFields);

    const putCalls = fetchMock.mock.calls.filter(
      (c) => (c[1] as RequestInit).method === 'PUT',
    );
    expect(putCalls).toHaveLength(0);
  });

  it('calls setHeaderRow when the existing headers are out of date', async () => {
    // Sheet exists in metadata → skip createSheet → getHeaderRow returns stale headers
    // → setHeaderRow called → appendRow
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(metadataWith('home-contact')) // sheet exists, skip createSheet
      .mockResolvedValueOnce(mockResponse({ values: [['OldCol', 'Bad']] })) // wrong headers
      .mockResolvedValueOnce(sheetsOk()) // setHeaderRow PUT
      .mockResolvedValueOnce(sheetsOk()); // appendRow

    await appendFormSubmission('home-contact', homeContactFields);

    const putCall = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit).method === 'PUT',
    );
    expect(putCall).toBeDefined();
    const body = JSON.parse((putCall![1] as RequestInit).body as string);
    expect(body.values[0]).toEqual(SHEET_HEADERS['home-contact']);
  });

  it('skips all verification when the sheet cache is still fresh', async () => {
    const fetchMock = vi.mocked(fetch);
    mockFullCycle(fetchMock, SHEET_HEADERS['home-contact']);
    await appendFormSubmission('home-contact', homeContactFields);
    const callsAfterFirst = fetchMock.mock.calls.length;

    // Within the 5-min TTL — only appendRow should fire
    mockCacheHit(fetchMock);
    await appendFormSubmission('home-contact', homeContactFields);

    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst + 1);
    const lastCall = fetchMock.mock.calls.at(-1)!;
    expect((lastCall[0] as string).includes(':append')).toBe(true);
  });

  it('re-verifies the sheet after the 5-minute cache TTL expires', async () => {
    const fetchMock = vi.mocked(fetch);

    mockFullCycle(fetchMock, SHEET_HEADERS['home-contact']);
    await appendFormSubmission('home-contact', homeContactFields);

    // Expire the sheet cache (5 min + 1 ms)
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    mockFullCycle(fetchMock, SHEET_HEADERS['home-contact']);
    await appendFormSubmission('home-contact', homeContactFields);

    const metadataCalls = fetchMock.mock.calls.filter((c) =>
      (c[0] as string).includes('fields='),
    );
    expect(metadataCalls).toHaveLength(2);
  });
});

// ─── appendFormSubmission — row building (all four form types) ────────────────

describe('appendFormSubmission — row building', () => {
  it('puts an ISO timestamp in the first column', async () => {
    const fetchMock = vi.mocked(fetch);
    mockFullCycle(fetchMock, SHEET_HEADERS['home-contact']);
    await appendFormSubmission('home-contact', homeContactFields);

    const row: string[] = JSON.parse(
      (fetchMock.mock.calls.at(-1)![1] as RequestInit).body as string,
    ).values[0];
    expect(row[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  describe('home-contact', () => {
    it('maps all fields to correct column positions', async () => {
      const fetchMock = vi.mocked(fetch);
      mockFullCycle(fetchMock, SHEET_HEADERS['home-contact']);
      await appendFormSubmission('home-contact', homeContactFields);

      const row: string[] = JSON.parse(
        (fetchMock.mock.calls.at(-1)![1] as RequestInit).body as string,
      ).values[0];

      // Timestamp | First Name | Last Name | Email | Subject | Message
      expect(row).toHaveLength(SHEET_HEADERS['home-contact'].length);
      expect(row[1]).toBe('Jane');
      expect(row[2]).toBe('Doe');
      expect(row[3]).toBe('jane@example.com');
      expect(row[4]).toBe('Hello');
      expect(row[5]).toBe('Test message');
    });

    it('writes empty string for a missing optional field', async () => {
      const fetchMock = vi.mocked(fetch);
      mockFullCycle(fetchMock, SHEET_HEADERS['home-contact']);
      await appendFormSubmission('home-contact', {
        'first-name': 'Bob',
        'last-name': 'Jones',
        email: 'bob@example.com',
        message: 'Hi',
        // subject intentionally omitted
      });

      const row: string[] = JSON.parse(
        (fetchMock.mock.calls.at(-1)![1] as RequestInit).body as string,
      ).values[0];
      expect(row[4]).toBe(''); // Subject
    });
  });

  describe('general-inquiry', () => {
    it('maps fields correctly (same schema as home-contact)', async () => {
      const fetchMock = vi.mocked(fetch);
      mockFullCycle(fetchMock, SHEET_HEADERS['general-inquiry']);
      await appendFormSubmission('general-inquiry', generalInquiryFields);

      const row: string[] = JSON.parse(
        (fetchMock.mock.calls.at(-1)![1] as RequestInit).body as string,
      ).values[0];

      expect(row).toHaveLength(SHEET_HEADERS['general-inquiry'].length);
      expect(row[1]).toBe('Alice');
      expect(row[2]).toBe('Wong');
      expect(row[3]).toBe('alice@example.com');
      expect(row[4]).toBe('Question');
      expect(row[5]).toBe('I have a question');
    });
  });

  describe('referral', () => {
    it('builds the correct number of columns (17)', async () => {
      const fetchMock = vi.mocked(fetch);
      mockFullCycle(fetchMock, SHEET_HEADERS.referral);
      await appendFormSubmission('referral', referralFields);

      const row: string[] = JSON.parse(
        (fetchMock.mock.calls.at(-1)![1] as RequestInit).body as string,
      ).values[0];
      expect(row).toHaveLength(SHEET_HEADERS.referral.length);
    });

    it('maps standard fields to the correct positions', async () => {
      const fetchMock = vi.mocked(fetch);
      mockFullCycle(fetchMock, SHEET_HEADERS.referral);
      await appendFormSubmission('referral', referralFields);

      const row: string[] = JSON.parse(
        (fetchMock.mock.calls.at(-1)![1] as RequestInit).body as string,
      ).values[0];

      // col: 0=Timestamp 1=Referral Type 2=First Name 3=Last Name 4=Email
      //      5=Phone 6=Address 7=City 8=Suburb 9=Area Code 10=Referral Source
      //      11=Identified Name 12=NHI 13=Out Status 14=Services 15=Additional Info
      //      16=Date of Birth
      expect(row[1]).toBe('GP'); // Referral Type
      expect(row[2]).toBe('Bob'); // First Name
      expect(row[3]).toBe('Smith'); // Last Name
      expect(row[4]).toBe('bob@example.com'); // Email
      expect(row[5]).toBe('021000000'); // Phone
      expect(row[10]).toBe('GP'); // Referral Source
      expect(row[16]).toBe('15/06/1990'); // Date of Birth
    });

    it('maps Identified Name, NHI, and Services correctly', async () => {
      const fetchMock = vi.mocked(fetch);
      mockFullCycle(fetchMock, SHEET_HEADERS.referral);
      await appendFormSubmission('referral', {
        ...referralFields,
        'identified-name': 'Bobbie',
        NHI: 'ZXY9876',
        services: 'Mental Health',
      });

      const row: string[] = JSON.parse(
        (fetchMock.mock.calls.at(-1)![1] as RequestInit).body as string,
      ).values[0];
      expect(row[11]).toBe('Bobbie'); // Identified Name
      expect(row[12]).toBe('ZXY9876'); // NHI
      expect(row[14]).toBe('Mental Health'); // Services
    });

    it('writes empty strings for missing optional referral fields', async () => {
      const fetchMock = vi.mocked(fetch);
      mockFullCycle(fetchMock, SHEET_HEADERS.referral);
      await appendFormSubmission('referral', {
        'first-name': 'Minimal',
        'last-name': 'Entry',
      });

      const row: string[] = JSON.parse(
        (fetchMock.mock.calls.at(-1)![1] as RequestInit).body as string,
      ).values[0];
      expect(row[5]).toBe(''); // Phone
      expect(row[11]).toBe(''); // Identified Name
      expect(row[12]).toBe(''); // NHI
      expect(row[13]).toBe(''); // Out Status
      expect(row[15]).toBe(''); // Additional Info
    });
  });

  describe('training', () => {
    it('builds the correct number of columns (10)', async () => {
      const fetchMock = vi.mocked(fetch);
      mockFullCycle(fetchMock, SHEET_HEADERS.training);
      await appendFormSubmission('training', trainingFields);

      const row: string[] = JSON.parse(
        (fetchMock.mock.calls.at(-1)![1] as RequestInit).body as string,
      ).values[0];
      expect(row).toHaveLength(SHEET_HEADERS.training.length);
    });

    it('maps all training fields to the correct positions', async () => {
      const fetchMock = vi.mocked(fetch);
      mockFullCycle(fetchMock, SHEET_HEADERS.training);
      await appendFormSubmission('training', trainingFields);

      const row: string[] = JSON.parse(
        (fetchMock.mock.calls.at(-1)![1] as RequestInit).body as string,
      ).values[0];

      // col: 0=Timestamp 1=Contact Name 2=Email 3=Contact Phone 4=Training Hours
      //      5=Start Date 6=End Date 7=Training Topics 8=Other Topic Details 9=Additional Notes
      expect(row[1]).toBe('Carol'); // Contact Name
      expect(row[2]).toBe('carol@example.com'); // Email
      expect(row[3]).toBe('021111111'); // Contact Phone
      expect(row[4]).toBe('4'); // Training Hours
      expect(row[5]).toBe('2025-06-01'); // Start Date
      expect(row[6]).toBe('2025-06-02'); // End Date
    });

    it('writes empty strings for missing optional training fields', async () => {
      const fetchMock = vi.mocked(fetch);
      mockFullCycle(fetchMock, SHEET_HEADERS.training);
      await appendFormSubmission('training', {
        'contact-name': 'Dave',
        email: 'dave@example.com',
        'contact-phone': '021222222',
        'training-hours': '2',
        'start-date': '2025-07-01',
        'end-date': '2025-07-01',
        // training-topics, other-topic-details, additional-notes all omitted
      });

      const row: string[] = JSON.parse(
        (fetchMock.mock.calls.at(-1)![1] as RequestInit).body as string,
      ).values[0];
      expect(row[7]).toBe(''); // Training Topics
      expect(row[8]).toBe(''); // Other Topic Details
      expect(row[9]).toBe(''); // Additional Notes
    });
  });
});

// ─── appendFormSubmission — cache invalidation retry ─────────────────────────

describe('appendFormSubmission — cache invalidation on appendRow failure', () => {
  it('clears the sheet cache and retries ensureSheet + appendRow on failure', async () => {
    const fetchMock = vi.mocked(fetch);

    // Warm up the cache
    mockFullCycle(fetchMock, SHEET_HEADERS['home-contact']);
    await appendFormSubmission('home-contact', homeContactFields);

    // appendRow fails (404, not retryable) → cache deleted →
    // ensureSheet re-runs (token still cached) → sheet now exists in metadata
    // → skip createSheet → getHeaderRow → appendRow retried ok
    fetchMock
      .mockResolvedValueOnce(textResponse('Not Found', 404)) // #1 appendRow fails
      .mockResolvedValueOnce(metadataWith('home-contact')) // #2 sheet exists
      .mockResolvedValueOnce(
        mockResponse({ values: [SHEET_HEADERS['home-contact']] }),
      ) // #3 getHeaderRow
      .mockResolvedValueOnce(sheetsOk()); // #4 appendRow retry ok

    await expect(
      appendFormSubmission('home-contact', homeContactFields),
    ).resolves.toBeUndefined();

    // Metadata fetched exactly twice (once during warm-up, once during retry)
    const metadataCalls = fetchMock.mock.calls.filter((c) =>
      (c[0] as string).includes('fields='),
    );
    expect(metadataCalls).toHaveLength(2);
  });

  it('throws if the retry appendRow also fails', async () => {
    skipDelays();
    const fetchMock = vi.mocked(fetch);

    // Warm up
    mockFullCycle(fetchMock, SHEET_HEADERS['home-contact']);
    await appendFormSubmission('home-contact', homeContactFields);

    // appendRow fails (3× 500 exhausts retries) → cache deleted →
    // ensureSheet re-runs (sheet exists in metadata, token still cached) →
    // retry appendRow also fails (3× 500)
    fetchMock
      .mockResolvedValueOnce(textResponse('Error', 500)) // appendRow attempt 0
      .mockResolvedValueOnce(textResponse('Error', 500)) // attempt 1
      .mockResolvedValueOnce(textResponse('Error', 500)) // attempt 2 → throws
      // catch block: cache cleared, ensureSheet retried
      .mockResolvedValueOnce(metadataWith('home-contact')) // sheet exists, skip batchUpdate
      .mockResolvedValueOnce(
        mockResponse({ values: [SHEET_HEADERS['home-contact']] }),
      ) // getHeaderRow
      // retry appendRow — also fails
      .mockResolvedValueOnce(textResponse('Error', 500))
      .mockResolvedValueOnce(textResponse('Error', 500))
      .mockResolvedValueOnce(textResponse('Error', 500));

    await expect(
      appendFormSubmission('home-contact', homeContactFields),
    ).rejects.toThrow('Google Sheets API error (500)');
  });
});
