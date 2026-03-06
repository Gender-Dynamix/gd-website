import eslintPluginAstro from 'eslint-plugin-astro';
import tsParser from '@typescript-eslint/parser';

export default [
  ...eslintPluginAstro.configs.recommended,
  ...eslintPluginAstro.configs['jsx-a11y-recommended'],
  {
    ignores: [
      'node_modules/',
      'dist/',
      '.astro/',
      '.wrangler/',
      'public/',
      '.playwright-cli/',
    ],
  },
  {
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
    rules: {
      'no-var': 'off', // All inline scripts use var + IIFE pattern
      'astro/jsx-a11y/anchor-is-valid': 'off', // href="#" links are JS-enhanced (email obfuscation, modal triggers)
      'astro/jsx-a11y/label-has-associated-control': 'off', // Checkbox group labels use a heading label pattern
      'astro/jsx-a11y/no-noninteractive-tabindex': 'off', // Intentional keyboard accessibility on content sections
    },
  },
];
