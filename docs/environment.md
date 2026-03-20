# Environment Variables

All environment variables are managed in a single `.env` file. Astro's `env.schema` in `astro.config.mjs` validates them at build time.

## Variable Reference

| Variable                       | Type                  | Used by                      |
| ------------------------------ | --------------------- | ---------------------------- |
| `PUBLIC_GA_MEASUREMENT_ID`     | Build-time (optional) | `GoogleAnalytics.astro`      |
| `PUBLIC_TURNSTILE_SITE_KEY`    | Build-time (required) | Contact/services forms       |
| `TURNSTILE_SECRET_KEY`         | Runtime (secret)      | `src/actions/index.ts`       |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Runtime (secret)      | `src/utils/google-sheets.ts` |
| `GOOGLE_PRIVATE_KEY`           | Runtime (secret)      | `src/utils/google-sheets.ts` |
| `GOOGLE_SPREADSHEET_ID`        | Runtime (secret)      | `src/utils/google-sheets.ts` |

`PUBLIC_` variables are embedded into the HTML/JS output during `astro build` and accessible via `import.meta.env`.

Runtime variables are available only in server-side code (Astro Actions). They are imported from `astro:env/server` and are never exposed to the browser.

## Local Development

```bash
cp .env.example .env
```

Edit `.env` and fill in your values. For local development, you can use the Cloudflare Turnstile test keys:

| Key                         | Test value                                                                        |
| --------------------------- | --------------------------------------------------------------------------------- |
| `PUBLIC_TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` (always passes)                                        |
| `PUBLIC_GA_MEASUREMENT_ID`  | Leave as `G-XXXXXXXXXX` or omit entirely — the GA component falls back gracefully |
| `TURNSTILE_SECRET_KEY`      | `1x0000000000000000000000000000000AA` (always passes)                             |

For the Google Sheets variables, you'll need to complete the [Google Sheets setup](#google-sheets-form-submissions) below.

Then start the dev server:

```bash
npm run dev
```

## Production (Cloudflare Pages)

The site is deployed via Cloudflare Pages Git Integration, which auto-builds and deploys on push to `main`.

### Setting environment variables

In the Cloudflare dashboard: **Pages project > Settings > Environment Variables**.

Set all 6 variables listed in the [Variable Reference](#variable-reference) above. Both Production and Preview environments need to be configured.

### Encryption

Encrypt these variables (click "Encrypt" after saving):

- `TURNSTILE_SECRET_KEY`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SPREADSHEET_ID`

## One-time Setup

### Google Sheets (form submissions)

Form submissions are written to a Google Spreadsheet via a service account. Each form type writes to a separate sheet (tab).

#### 1. Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Navigate to **APIs & Services → Library**
4. Search for **Google Sheets API** and enable it

#### 2. Service Account

1. Navigate to **APIs & Services → Credentials**
2. Click **Create Credentials → Service Account**
3. Name it something descriptive (e.g., `gd-website-forms`)
4. No roles needed (it only accesses a shared spreadsheet, not project resources)
5. Click **Done**
6. Click the newly created service account → **Keys** tab → **Add Key → Create new key → JSON**
7. Download the JSON file — you'll need `client_email` and `private_key` from it

#### 3. Google Spreadsheet

1. Create a new Google Spreadsheet
2. Copy the spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
3. Click **Share** and add the service account email (`client_email` from step 2) with **Editor** access
4. The code will auto-create the sheet tabs and headers on first submission — no manual sheet setup needed

#### 4. Environment Variables

Set the following in `.env` (local) and Cloudflare Pages dashboard (production):

| Variable                       | Value                                                  | Source               |
| ------------------------------ | ------------------------------------------------------ | -------------------- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from the JSON key file                  | Service account JSON |
| `GOOGLE_PRIVATE_KEY`           | `private_key` from the JSON key file (full PEM string) | Service account JSON |
| `GOOGLE_SPREADSHEET_ID`        | The ID from the spreadsheet URL                        | Spreadsheet URL      |

### Cloudflare Turnstile (bot protection)

1. In the Cloudflare dashboard, go to **Turnstile** and create a widget
2. Add your site's domain(s) to the widget configuration
3. Copy the **Site Key** into `PUBLIC_TURNSTILE_SITE_KEY`
4. Copy the **Secret Key** into `TURNSTILE_SECRET_KEY`
