import javascript from '@eslint/js';
import typescript from 'typescript-eslint';

export default typescript.config(
  { ignores: ['**/node_modules/**', 'research/**', '.local/**', '**/.next/**', '**/.next-e2e/**', '**/dist/**', '**/coverage/**', '**/test-results/**', '**/playwright-report/**', '**/next-env.d.ts'] },
  javascript.configs.recommended,
  ...typescript.configs.recommended,
  {
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: {
      globals: {
        process: 'readonly', console: 'readonly', Buffer: 'readonly', URL: 'readonly', fetch: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
        AbortController: 'readonly', structuredClone: 'readonly', WebSocket: 'readonly'
      }
    }
  },
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] } }
);
