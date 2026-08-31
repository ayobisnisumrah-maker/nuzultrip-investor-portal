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
      '.open-next/**',
      '.wrangler/**',
      'out/**',
      'build/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.turbo/**',
      '.cache/**',
      '.screenshots/**',
      'next-env.d.ts',
      'src/types/database.ts',
      'supabase/.temp/**',
    ],
  },

  js.configs.recommended,

  ...next,

  // --------------------------------------------------------------------------
  // TypeScript — fast syntax-aware linting
  //
  // Full type correctness is handled separately by:
  // pnpm typecheck
  // --------------------------------------------------------------------------
  {
    files: TS,

    extends: [...tseslint.configs.recommended],

    languageOptions: {
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },

    rules: {
      // ----------------------------------------------------------------------
      // Async correctness
      //
      // Typed async rules are intentionally disabled.
      // They require TypeScript project analysis and consume excessive memory.
      // ----------------------------------------------------------------------
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/return-await': 'off',

      // ----------------------------------------------------------------------
      // Type discipline
      // ----------------------------------------------------------------------
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],

      '@typescript-eslint/no-explicit-any': 'error',

      // ----------------------------------------------------------------------
      // Security
      // ----------------------------------------------------------------------
      'react/no-danger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // ----------------------------------------------------------------------
      // Environment boundary
      // ----------------------------------------------------------------------
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
  // Architectural boundaries
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
                'src/core is the framework-agnostic domain layer and must not depend on Next.js, routes, or feature components.',
            },
          ],
        },
      ],
    },
  },

  // --------------------------------------------------------------------------
  // Service-role key boundary
  // --------------------------------------------------------------------------
  {
    files: TS,

    ignores: [
      'src/server/admin/**',
      'src/lib/env.ts',
      'src/lib/server-env.ts',
    ],

    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Identifier[name='SUPABASE_SERVICE_ROLE_KEY']",
          message:
            'The service-role key may only be referenced from src/server/admin/**.',
        },
      ],
    },
  },

  // --------------------------------------------------------------------------
  // Files allowed to access process.env directly
  // --------------------------------------------------------------------------
  {
    files: [
      '*.config.ts',
      '*.config.mjs',
      'scripts/**',
      'src/lib/env.ts',
      'src/lib/server-env.ts',
      'src/test/**',
      'tests/**',
    ],

    rules: {
      'no-restricted-properties': 'off',
    },
  },

  // --------------------------------------------------------------------------
  // Tests
  // --------------------------------------------------------------------------
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      'tests/**/*.ts',
      'src/test/**/*.ts',
    ],

    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Prettier must remain last.
  prettier,
)
