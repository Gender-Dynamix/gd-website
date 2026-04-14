import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    //Run each test file in its own isolated environment.
    //This is critical for google-sheets.ts whose module-level state
    // (cachedToken, verifiedSheets) would bleed between files otherwise
    isolate: true,

    //Use the built-in node environment (No browser globals needed for server tests)
    environment: 'node',

    //Remove Astro's virtual modules to our hand-written stubs
    alias: {
      'astro:env/server': new URL(
        './src/tests/__mocks__/astro-env-server.ts',
        import.meta.url,
      ).pathname,
      'astro:actions': new URL(
        './src/tests/__mocks__/astro-actions.ts',
        import.meta.url,
      ).pathname,
      'astro:schema': new URL(
        './src/tests/__mocks__/astro-actions.ts',
        import.meta.url,
      ).pathname,
    },

    coverage: {
      provider: 'v8',
      include: [
        'src/utils/google-sheets.ts',
        'src/actions/index.ts',
        'src/scripts/field-labels.ts',
      ],
      reporter: ['text', 'html'],
    },
  },
});
