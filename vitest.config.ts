import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    isolate: true,
    environment: 'node',
    alias: {
      'astro:env/server': path.resolve(
        __dirname,
        './src/tests/__mocks__/astro-env-server.ts',
      ),
      'astro:actions': path.resolve(
        __dirname,
        './src/tests/__mocks__/astro-actions.ts',
      ),
      'astro:schema': path.resolve(
        __dirname,
        './src/tests/__mocks__/astro-schema.ts',
      ),
      // Fixes the cloudflare: protocol error
      'cloudflare:test': path.resolve(
        __dirname,
        './src/tests/__mocks__/empty.ts',
      ),
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      clean: true,
      include: [
        'src/utils/google-sheets.ts',
        'src/actions/index.ts',
        'src/scripts/field-labels.ts',
      ],
      reporter: ['text', 'html', 'json'],
    },
  },
});
