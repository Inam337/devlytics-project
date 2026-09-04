import { fixupPluginRules } from '@eslint/compat';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import pluginImport from 'eslint-plugin-import';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';

const stylisticConfig = stylistic.configs.customize({
  semi: true,
  quotes: 'single',
  jsxSingleQuote: true,
  tabWidth: 2,
  useTabs: false,
  commaDangle: 'always-multiline',
  braceStyle: '1tbs',
});

export default [
  {
    files: ['**/*.{ts,tsx,js}'],
    ignores: [
      '**/*.config.js',
      '**/*.config.ts',
      '**/*.d.ts',
      '**/dist/**',
      '**/node_modules/**',
      '**/public/**',
    ],
    plugins: {
      '@typescript-eslint': fixupPluginRules(tseslint),
      'react-hooks': fixupPluginRules(pluginReactHooks),
      react: fixupPluginRules(pluginReact),
      '@stylistic': fixupPluginRules(stylistic),
      import: fixupPluginRules(pluginImport),
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: ['./tsconfig.app.json'],
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.app.json',
        },
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      ...stylisticConfig.rules,
      'max-len': ['error', { code: 120 }],
      'no-console': ['warn', { allow: ['error'] }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'eol-last': ['error', 'always'],
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-max-props-per-line': ['error', { maximum: 1 }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { caughtErrors: 'none', args: 'after-used' },
      ],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'never', prev: 'block-like', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'always', prev: '*', next: ['const', 'let', 'var'] },
        { blankLine: 'never', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        { blankLine: 'always', prev: 'if', next: '*' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
        {
          blankLine: 'always',
          prev: 'import',
          next: ['const', 'let', 'var', 'function', 'class', 'export', 'return'],
        },
      ],
      'import/order': [
        'error',
        {
          groups: [
            ['builtin', 'external'],
            'internal',
            ['parent', 'sibling', 'index'],
          ],
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
        },
      ],
      'prefer-const': 'error',
    },
  },
];