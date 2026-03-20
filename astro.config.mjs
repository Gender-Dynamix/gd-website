import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://gdnz.org',
  output: 'static',
  adapter: cloudflare(),
  integrations: [sitemap()],
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
    },
  },
});
