import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://gdnz.org',
  output: 'static',
  adapter: cloudflare(),
});
