import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * Single flat ESLint config shared by every workspace package.
 * Each package's `lint` script (`eslint "src/**"`) runs from its own dir;
 * ESLint walks up to this root config. The Next.js ruleset is scoped to
 * `apps/web` via `files`, while the TypeScript ruleset covers all packages.
 */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      '**/next-env.d.ts',
      'apps/api/prisma/migrations/**',
    ],
  },
  ...compat
    .config({
      parser: '@typescript-eslint/parser',
      parserOptions: { sourceType: 'module', ecmaVersion: 2022 },
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'warn',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    })
    .map((cfg) => ({ ...cfg, files: ['**/*.ts', '**/*.tsx'] })),
  ...compat
    .config({ extends: ['next/core-web-vitals'] })
    .map((cfg) => ({ ...cfg, files: ['apps/web/**/*.ts', 'apps/web/**/*.tsx'] })),
];
