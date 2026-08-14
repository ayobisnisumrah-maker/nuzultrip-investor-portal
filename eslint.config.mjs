import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import next from 'eslint-config-next'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

const TS = ['**/*.ts', '**/*.tsx']

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      'src/types/database.ts', // generated — see docs/DATABASE.md §13
      'supabase/.temp/**', // Supabase CLI scratch space
      '.screenshots/**',
    ],
  },

  js.configs.recommended,

  // eslint-config-next registers its own parser. It must come BEFORE the
  // TypeScript config block below, which re-asserts @typescript-eslint/parser so
  // that type-aware rules have the type information they require.
  ...next,

  // --------------------------------------------------------------------------
  // TypeScript — type-aware linting
  // --------------------------------------------------------------------------
  {
    files: TS,
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // --- Async correctness. In this codebase an unawaited mutation means a
      // silently lost audit record, so these are errors, not warnings. ---
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/return-await': ['error', 'always'],

      // --- Type discipline ---
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      // --- Security (docs/SECURITY.md §5) ---
      // The CMS renders a restricted AST. There is no raw-HTML path anywhere.
      'react/no-danger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // Configuration must go through the validated env module so that no
      // secret can reach a browser bundle by accident.
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Import getServerEnv()/getClientEnv() from "@/lib/env" instead of reading process.env directly.',
        },
      ],
    },
  },

  // --------------------------------------------------------------------------
  // Architectural boundaries (docs/ARCHITECTURE.md §4)
  // --------------------------------------------------------------------------
  {
    files: ['src/core/**/*.ts', 'src/core/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/app/*', '@/features/*', 'next', 'next/*'],
              message:
                'src/core is the framework-agnostic domain layer: it must not depend on Next.js, routes, or feature components.',
            },
          ],
        },
      ],
    },
  },

  // The service-role key bypasses RLS entirely (docs/SECURITY.md §3).
  {
    files: TS,
    ignores: ['src/server/admin/**', 'src/lib/env.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Identifier[name='SUPABASE_SERVICE_ROLE_KEY']",
          message:
            'The service-role key may only be referenced from src/server/admin/**. See docs/SECURITY.md §3.',
        },
      ],
    },
  },

  // Config files, scripts, tests and the env module legitimately read
  // process.env. Tests in particular need connection details that never reach
  // the application bundle.
  {
    files: [
      '*.config.ts',
      '*.config.mjs',
      'scripts/**',
      'src/lib/env.ts',
      'src/test/**',
      'tests/**',
    ],
    rules: {
      'no-restricted-properties': 'off',
    },
  },

  // Tests may be looser about types; they exercise failure paths deliberately.
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'tests/**/*.ts', 'src/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },

  // Prettier last: it only turns formatting rules off.
  prettier,
)
