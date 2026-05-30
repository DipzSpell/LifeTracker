import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'android', 'scratch']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Allow underscore-prefixed vars as intentional discards (e.g. _deleted, _habits)
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      // setState in effects is a valid pattern for form reset, data fetch, timer init
      'react-hooks/set-state-in-effect': 'off',
      // Mixing hooks + components in the same file is intentional in our context/ui files
      'react-refresh/only-export-components': 'off',
    },
  },
])
