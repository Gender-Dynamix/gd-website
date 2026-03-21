# Prepare to Go Live

A checklist for launching the production site on `gdnz.org`. Complete each section in order — later steps depend on earlier ones.

## 1. Custom Domain

Add the production domain to Cloudflare Pages so the site is served from `gdnz.org` instead of `*.pages.dev`.

1. In the Cloudflare dashboard: **Workers & Pages > gd-website > Custom domains**
2. Click **Set up a custom domain** and enter `gdnz.org`
3. Cloudflare will configure the DNS record automatically if the domain is on the same Cloudflare account
4. Wait for the SSL certificate to be issued — this usually takes a few minutes

## 2. Turnstile — Add Production Domain

The Turnstile widget must be configured to accept requests from the production domain, otherwise form submissions will fail.

1. In the Cloudflare dashboard, go to **Turnstile**
2. Click on your existing widget (e.g. `GD Website`)
3. Under **Domains**, add `gdnz.org`
4. Save

Keep the existing domains (`gd-website-acc.pages.dev`, `localhost`) so that preview and local development continue to work.

## 3. Google Sheets — Service Account Access

Form submissions are written to a Google Spreadsheet. Follow the [Google Sheets setup](environment.md#google-sheets-form-submissions) in the environment docs if not already done, then ensure the service account has **Editor** access to the production spreadsheet.

## 4. Environment Variables — Production

Set all environment variables for the **Production** environment in Cloudflare Pages.

In the dashboard: **Workers & Pages > gd-website > Settings > Environment Variables**

| Variable                       | Value                                    | Encrypt? |
| ------------------------------ | ---------------------------------------- | -------- |
| `PUBLIC_GA_MEASUREMENT_ID`     | Your GA4 measurement ID                  | No       |
| `PUBLIC_TURNSTILE_SITE_KEY`    | Site key from Turnstile widget           | No       |
| `TURNSTILE_SECRET_KEY`         | Secret key from Turnstile widget         | Yes      |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account `client_email`           | Yes      |
| `GOOGLE_PRIVATE_KEY`           | Service account `private_key` (full PEM) | Yes      |
| `GOOGLE_SPREADSHEET_ID`        | Spreadsheet ID from URL                  | Yes      |

## 5. Google Analytics

1. In [Google Analytics](https://analytics.google.com), create a GA4 property for `gdnz.org` if one doesn't already exist
2. Copy the Measurement ID (starts with `G-`)
3. Set it as `PUBLIC_GA_MEASUREMENT_ID` in the Production environment variables

## 6. Preview Deployment Access

Restrict preview deployments so only the team can access them, while keeping the production site public.

1. In **Workers & Pages > gd-website > Settings > General**, enable the **Access Policy** toggle for preview deployments
2. In **Zero Trust > Access > Applications**, find the auto-created application and configure the policy to allow your team members (e.g. by email address or email domain)
3. If `gd-website-acc.pages.dev` should remain publicly accessible, create a separate Access application for that specific subdomain with a **Bypass** policy — see [Environment Variables > Production](environment.md#production-cloudflare-pages) for context

## 7. Deploy and Verify

1. Push to `main` (or merge a PR) to trigger a production build
2. Wait for the build to complete in the Cloudflare Pages dashboard
3. Visit `https://gdnz.org` and verify:
   - [ ] Site loads and pages render correctly
   - [ ] SSL certificate is active (padlock icon in browser)
   - [ ] Google Analytics is tracking (check GA4 Realtime report)
   - [ ] Turnstile widget appears on contact and services forms
   - [ ] Submit a test form and confirm it appears in the Google Spreadsheet
   - [ ] Preview deployments are restricted (visit a `*.pages.dev` preview URL in an incognito window — should prompt for authentication)
