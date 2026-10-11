import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'server/**']),
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
  },
  // Keep the migration scoped to this checkpoint until legacy TS modules are audited.
  {
    files: [
      'src/pages/company/CompanyInvitationAcceptPage/**/*.{ts,tsx}',
      'src/services/company/**/*.ts',
      'src/services/http/{apiClient,endpoints}.ts',
      'src/store/authStore.ts',
      'src/app/router/{AppRouter.tsx,router.ts}',
      'src/features/auth/components/AuthSubmitButton/**/*.tsx',
    ],
    extends: [tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
  },
])
