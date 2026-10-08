import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
<<<<<<< HEAD
  { ignores: ['dist', 'node_modules', 'backend/node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['backend/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
=======
  { ignores: ['dist', 'node_modules', '*.config.js', '*.config.mjs'] },
  { extends: [js.configs.recommended, ...tseslint.configs.recommended] },
  { files: ['**/*.{ts,tsx}'], languageOptions: { ecmaVersion: 2020, globals: { browser: true }, parserOptions: { ecmaFeatures: { jsx: true } } } }
);
>>>>>>> 808fceb10c25f8fd236d4714458443967c517186
