// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', 'web-build/*', '.expo/*', 'src/game/phaser/generated/*', 'coverage/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    files: ['src/game/core/**/*.ts', 'src/game/shared/**/*.ts'],
    rules: {
      // The rules engine must stay framework-agnostic (shared by React Native and Phaser).
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'react',
            'react-native',
            'react-native/*',
            'expo-*',
            'phaser',
            '@/services/*',
            '@/store/*',
          ],
        },
      ],
    },
  },
  {
    // Phaser's ESM default export is the conventional entry point.
    files: ['src/game/phaser/**/*.ts'],
    rules: { 'import/no-named-as-default-member': 'off' },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly', Buffer: 'readonly' } },
  },
]);
