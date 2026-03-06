import eslintPluginAstro from 'eslint-plugin-astro';

export default [
  ...eslintPluginAstro.configs.recommended,
  ...eslintPluginAstro.configs['jsx-a11y-recommended'],
  {
    ignores: [
      'node_modules/',
      'dist/',
      '.astro/',
      '.wrangler/',
      'genderdynamix/',
      'public/',
      '.playwright-cli/',
    ],
  },
  {
    files: ['**/*.astro'],
    rules: {
      'no-var': 'off', // All inline scripts use var + IIFE pattern
    },
  },
];
