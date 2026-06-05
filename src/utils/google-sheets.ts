import { GOOGLE_SPREADSHEET_ID } from 'astro:env/server';
import { getAccessToken, fetchWithRetry } from './google-auth';

export type FormType =
  | 'home-contact'
  | 'general-inquiry'
  | 'referral'
  | 'training';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export const SHEET_HEADERS: Record<FormType, string[]> = {
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
    'Date of Birth',
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
  'date-of-birth': 'Date of Birth',
  'contact-name': 'Contact Name',
  'contact-phone': 'Contact Phone',
  'training-hours': 'Training Hours',
  'start-date': 'Start Date',
  'end-date': 'End Date',
  'training-topics': 'Training Topics',
  'other-topic-details': 'Other Topic Details',
  'additional-notes': 'Additional Notes',
};

const HEADER_TO_FIELD: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_TO_HEADER).map(([field, header]) => [header, field]),
);

// --- Sheets Operations ---

interface SheetProperties {
  sheetId: number;
  title: string;
}

interface SpreadsheetMetadata {
  sheets: { properties: SheetProperties }[];
}

async function getSpreadsheetMetadata(): Promise<SpreadsheetMetadata> {
  const token = await getAccessToken(SHEETS_SCOPE);
  const response = await fetchWithRetry(
    `${SHEETS_API_BASE}/${GOOGLE_SPREADSHEET_ID}?fields=sheets.properties(sheetId,title)`,
    { headers: { Authorization: `Bearer ${token}` } },
    SHEETS_SCOPE,
    'Google Sheets API',
  );
  return (await response.json()) as SpreadsheetMetadata;
}

async function createSheet(sheetTitle: string): Promise<void> {
  const token = await getAccessToken(SHEETS_SCOPE);
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
    SHEETS_SCOPE,
    'Google Sheets API',
  );
}

async function getHeaderRow(sheetTitle: string): Promise<string[]> {
  const token = await getAccessToken(SHEETS_SCOPE);
  const range = encodeURIComponent(`'${sheetTitle}'!1:1`);
  const response = await fetchWithRetry(
    `${SHEETS_API_BASE}/${GOOGLE_SPREADSHEET_ID}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } },
    SHEETS_SCOPE,
    'Google Sheets API',
  );
  const data = (await response.json()) as { values?: string[][] };
  return data.values?.[0] ?? [];
}

async function setHeaderRow(
  sheetTitle: string,
  headers: string[],
): Promise<void> {
  const token = await getAccessToken(SHEETS_SCOPE);
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
    SHEETS_SCOPE,
    'Google Sheets API',
  );
}

async function appendRow(sheetTitle: string, values: string[]): Promise<void> {
  const token = await getAccessToken(SHEETS_SCOPE);
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
    SHEETS_SCOPE,
    'Google Sheets API',
  );
}

// --- Sheet Validation ---

const SHEET_CACHE_TTL_MS = 5 * 60 * 1000;
const verifiedSheets = new Map<FormType, number>();

async function ensureSheet(formType: FormType): Promise<void> {
  const cachedAt = verifiedSheets.get(formType);
  if (cachedAt && Date.now() - cachedAt < SHEET_CACHE_TTL_MS) {
    return;
  }

  const expectedHeaders = SHEET_HEADERS[formType];
  const metadata = await getSpreadsheetMetadata();
  const sheets = metadata?.sheets ?? [];
  const sheetExists = sheets.some(
    (sheet) => sheet.properties.title === formType,
  );

  if (!sheetExists) {
    try {
      await createSheet(formType);
    } catch (error: any) {
      const message = error?.message || '';
      if (!message.includes('already exists')) {
        throw error;
      }
    }
  }

  const currentHeaders = await getHeaderRow(formType);
  const expectedHeadersPresent = expectedHeaders.every(
    (header, index) => currentHeaders[index] === header,
  );

  if (!expectedHeadersPresent) {
    await setHeaderRow(formType, expectedHeaders);
  }

  verifiedSheets.set(formType, Date.now());
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
    const fieldName = HEADER_TO_FIELD[header];
    return fieldName ? (fields[fieldName] ?? '') : '';
  });

  try {
    await appendRow(formType, rowValues);
  } catch {
    verifiedSheets.delete(formType);
    await ensureSheet(formType);
    await appendRow(formType, rowValues);
  }
}
