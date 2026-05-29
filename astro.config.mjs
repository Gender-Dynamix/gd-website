import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://gdnz.org',
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
    prerenderEnvironment: 'node',
  }),
  integrations: [sitemap()],
  vite: {
    optimizeDeps: {
      // astro/zod is imported from actions/index.ts (a .ts file, not .astro).
      // The adapter's frontmatter scanner only scans .astro files, so this
      // import is discovered lazily mid-build, triggering a Vite optimizer
      // reload that races with the workerd runner. Pre-bundling it here
      // prevents the reload entirely.
      include: ['astro/zod'],
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
    },
  },
});
