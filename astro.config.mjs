import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://gdnz.org',
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  session: {
    // Site does not use sessions. Null driver prevents the Cloudflare adapter
    // from injecting the KV session driver, which imports miniflare and inflates
    // the Worker bundle by ~21 MB. See: github.com/withastro/astro/issues/15802
    driver: { entrypoint: 'unstorage/drivers/null' },
  },
  integrations: [
    sitemap({
      // The referrals page is intentionally unlisted — reachable only by
      // direct link, so it must not be advertised in the sitemap
      filter: (page) => !page.includes('/referrals'),
    }),
  ],
  vite: {
    optimizeDeps: {
      // These modules are imported outside of .astro frontmatter, so the
      // Cloudflare adapter's esbuild scanner misses them at startup. Without
      // explicit pre-bundling they are discovered lazily mid-startup, triggering
      // a Vite SSR optimizer reload that races with the workerd runner and
      // produces "file does not exist" errors for stale chunk references.
      //
      // astro/zod: imported from actions/index.ts
      // astro/app/entrypoint: imported by @astrojs/cloudflare/dist/utils/handler.js
      //   (the adapter's include list has the /dev variant but not the base path)
      // unstorage/drivers/null: imported by Astro's session vite plugin at startup
      //   via virtual:astro:session-driver — not in the adapter's pre-bundle list
      include: ['astro/zod', 'astro/app/entrypoint', 'unstorage/drivers/null'],
    },
  },
  env: {
    schema: {
      PUBLIC_GA_MEASUREMENT_ID: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: 'client',
        access: 'public',
      }),
      TURNSTILE_SECRET_KEY: envField.string({
        context: 'server',
        access: 'secret',
      }),
      GOOGLE_SERVICE_ACCOUNT_EMAIL: envField.string({
        context: 'server',
        access: 'secret',
      }),
      GOOGLE_PRIVATE_KEY: envField.string({
        context: 'server',
        access: 'secret',
      }),
      GOOGLE_SPREADSHEET_ID: envField.string({
        context: 'server',
        access: 'secret',
      }),
      GOOGLE_CALENDAR_ID_TAURANGA: envField.string({
        context: 'server',
        access: 'secret',
      }),
      GOOGLE_CALENDAR_ID_LAKES: envField.string({
        context: 'server',
        access: 'secret',
      }),
      GOOGLE_CALENDAR_ID_ONLINE: envField.string({
        context: 'server',
        access: 'secret',
      }),
      GOOGLE_CALENDAR_ID_WHAKATANE: envField.string({
        context: 'server',
        access: 'secret',
      }),
    },
  },
});
