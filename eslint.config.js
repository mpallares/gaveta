import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.output/**',
      '**/.wxt/**',
      '**/dist/**',
      '**/.next/**',
      '**/test-results/**',
      '**/playwright-report/**',
      'extension/scripts/capture-chatgpt-fixtures.js',
      'extension/scripts/capture-claude-fixtures.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-console': ['error', { allow: ['debug', 'info', 'warn', 'error'] }],
    },
  },
  {
    files: ['extension/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
    languageOptions: { globals: { ...globals.browser, __GAVETA_E2E__: 'readonly' } },
  },
  {
    files: ['extension/src/lib/log.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  prettier,
);
