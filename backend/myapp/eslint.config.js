const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const eslintConfigPrettier = require('eslint-config-prettier');
const eslintPluginPrettier = require('eslint-plugin-prettier');
const globals = require('globals');

/**
 * Flat config (ESLint 9). No legacy .eslintrc existed to migrate from, so this
 * is written fresh against the project's actual conventions: NestJS decorators,
 * strictNullChecks-but-not-noImplicitAny (see tsconfig.json), CommonJS output.
 * Non-type-checked ruleset deliberately, since `test/**` and `*.spec.ts` are
 * excluded from tsconfig.json's `include` and the lint script covers both.
 */
module.exports = tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { prettier: eslintPluginPrettier },
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: 'commonjs',
    },
    rules: {
      ...eslintConfigPrettier.rules,
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
);
