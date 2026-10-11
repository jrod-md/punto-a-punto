import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022 },
    rules: { '@typescript-eslint/ban-ts-comment': 'error' },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/core/**'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['react', 'react/*', 'react-dom', 'react-dom/*', 'node:*'],
      }],
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'fetch', 'localStorage', 'sessionStorage', 'indexedDB'],
    },
  },
);
