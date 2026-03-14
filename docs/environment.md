# Environment Variables

This project uses two separate sets of environment variables, each read by different tools at different stages.

## Overview

| Category   | Read by         | Config file | Cloudflare setting                |
| ---------- | --------------- | ----------- | --------------------------------- |
| Build-time | Astro templates | `.env`      | Environment Variables (plaintext) |
| Runtime    | Pages Functions | `.dev.vars` | Environment Variables (encrypted) |

**Build-time** variables are embedded into the HTML/JS output during `astro build`. They are prefixed with `PUBLIC_` and accessible via `import.meta.env`. The `astro:env` schema in `astro.config.mjs` validates these at build time.

**Runtime** variables are available only inside Pages Functions (the `functions/` directory). They are accessed via the `context.env` object and are never exposed to the browser.

## Variable Reference

| Variable                    | Type                  | Used by                        | Where to set |
| --------------------------- | --------------------- | ------------------------------ | ------------ |
| `PUBLIC_GA_MEASUREMENT_ID`  | Build-time (optional) | `GoogleAnalytics.astro`        | `.env`       |
| `PUBLIC_TURNSTILE_SITE_KEY` | Build-time (required) | Contact/services forms         | `.env`       |
| `RESEND_API_KEY`            | Runtime (secret)      | `functions/api/submit-form.ts` | `.dev.vars`  |
| `TURNSTILE_SECRET_KEY`      | Runtime (secret)      | `functions/api/submit-form.ts` | `.dev.vars`  |
| `FORM_RECIPIENT_EMAIL`      | Runtime               | `functions/api/submit-form.ts` | `.dev.vars`  |
| `FORM_SENDER_EMAIL`         | Runtime               | `functions/api/submit-form.ts` | `.dev.vars`  |

## Local Development

### Build-time setup

```bash
cp .env.example .env
```

Edit `.env` and fill in your values. For local development, you can use the Cloudflare Turnstile test keys:

| Key                         | Test value                                                                        |
| --------------------------- | --------------------------------------------------------------------------------- |
| `PUBLIC_TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` (always passes)                                        |
| `PUBLIC_GA_MEASUREMENT_ID`  | Leave as `G-XXXXXXXXXX` or omit entirely — the GA component falls back gracefully |

Then start the dev server:

```bash
npm run dev
```

### Runtime setup (form submission testing)

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and fill in your values. For the Turnstile secret, use the matching test key:

| Key                    | Test value                                            |
| ---------------------- | ----------------------------------------------------- |
| `TURNSTILE_SECRET_KEY` | `1x0000000000000000000000000000000AA` (always passes) |

Then build and run with Wrangler:

```bash
npm run build
npm run dev:wrangler
```

### Which dev server to use

- **`npm run dev`** (Astro dev server) — use for pages, components, and styles. Faster hot reload, but Pages Functions are not available.
- **`npm run dev:wrangler`** (Wrangler) — use when testing form submissions. Requires a fresh `npm run build` before each run.

## Production (Cloudflare Pages)

The site is deployed via Cloudflare Pages Git Integration, which auto-builds and deploys on push to `main`.

### Setting environment variables

In the Cloudflare dashboard: **Pages project > Settings > Environment Variables**.

Set all 6 variables listed in the [Variable Reference](#variable-reference) above. Both Production and Preview environments need to be configured.

### Encryption

Encrypt these variables (click "Encrypt" after saving):

- `RESEND_API_KEY`
- `TURNSTILE_SECRET_KEY`

The remaining variables do not need encryption — they are either public or non-sensitive.

## One-time Setup

### Resend (transactional email)

1. Create an account at [resend.com](https://resend.com)
2. Add and verify your sending domain (requires adding SPF and DKIM DNS records)
3. Generate an API key and add it as `RESEND_API_KEY`

### Cloudflare Turnstile (bot protection)

1. In the Cloudflare dashboard, go to **Turnstile** and create a widget
2. Add your site's domain(s) to the widget configuration
3. Copy the **Site Key** into `PUBLIC_TURNSTILE_SITE_KEY`
4. Copy the **Secret Key** into `TURNSTILE_SECRET_KEY`
