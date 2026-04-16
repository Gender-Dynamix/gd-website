// src/tests/__mocks__/astro-env-server.ts
//
// Vitest resolves this file whenever any source file imports from 'astro:env/server'.
// We re-export from process.env so the mock uses whatever is in your .env file —
// the same values your app uses locally, with no duplication or hardcoding.
//
// Vitest loads .env automatically (via its built-in dotenv support), so no
// extra setup is needed. Your .env.example documents the expected variable names.
export const GOOGLE_SERVICE_ACCOUNT_EMAIL =
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '';
export const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ?? '';
export const GOOGLE_SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID ?? '';
export const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
