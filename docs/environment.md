# Environment Variables

All environment variables are managed in a single `.env` file. Astro's `env.schema` in `astro.config.mjs` validates them at build time.

## Variable Reference

| Variable                    | Type                  | Used by                 |
| --------------------------- | --------------------- | ----------------------- |
| `PUBLIC_GA_MEASUREMENT_ID`  | Build-time (optional) | `GoogleAnalytics.astro` |
| `PUBLIC_TURNSTILE_SITE_KEY` | Build-time (required) | Contact/services forms  |
| `RESEND_API_KEY`            | Runtime (secret)      | `src/actions/index.ts`  |
| `TURNSTILE_SECRET_KEY`      | Runtime (secret)      | `src/actions/index.ts`  |
| `FORM_RECIPIENT_EMAIL`      | Runtime (secret)      | `src/actions/index.ts`  |
| `FORM_SENDER_EMAIL`         | Runtime (secret)      | `src/actions/index.ts`  |

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
| `FORM_SENDER_EMAIL`         | `onboarding@resend.dev` (Resend test sender)                                      |
| `FORM_RECIPIENT_EMAIL`      | `delivered@resend.dev` (simulates successful delivery)                            |

Resend provides test addresses that work without domain verification:

| Address                 | Simulates           |
| ----------------------- | ------------------- |
| `delivered@resend.dev`  | Successful delivery |
| `bounced@resend.dev`    | Rejected email      |
| `complained@resend.dev` | Spam complaint      |

These addresses support `+` labels (e.g. `delivered+contact-form@resend.dev`) for distinguishing form types in the Resend dashboard. Emails sent to test addresses won't arrive in a real inbox but will appear under **Emails** in the Resend dashboard.

You will still need a real `RESEND_API_KEY` — create one at [resend.com](https://resend.com) under **API Keys** with **Sending access** permission.

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
