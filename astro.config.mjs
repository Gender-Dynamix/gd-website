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
      RESEND_API_KEY: envField.string({
        context: 'server',
        access: 'secret',
      }),
      TURNSTILE_SECRET_KEY: envField.string({
        context: 'server',
        access: 'secret',
      }),
      FORM_RECIPIENT_EMAIL: envField.string({
        context: 'server',
        access: 'secret',
      }),
      FORM_SENDER_EMAIL: envField.string({
        context: 'server',
        access: 'secret',
      }),
    },
  },
});
