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
      'src/store/__tests__/authStore.test.ts',
      'src/app/guards/CandidateRoute.tsx',
      'src/app/router/{AppRouter.tsx,router.ts}',
      'src/layouts/CandidateLayout.tsx',
      'src/pages/auth/LoginPage/LoginPage.tsx',
      'src/pages/candidate/CandidateDashboardPage.tsx',
      'src/features/auth/hooks/useLoginForm.ts',
      'src/features/auth/components/AuthSubmitButton/**/*.tsx',
      'src/features/candidate/services/onboardingDraft.ts',
      'src/features/candidate/services/__tests__/*.test.ts',
      'src/features/candidate/hooks/useCandidateOnboarding.ts',
      'src/features/candidate/components/CandidateOnboarding/CandidateOnboarding.tsx',
      'src/features/candidate/components/CandidateOnboarding/components/OnboardingActions.tsx',
    ],
    extends: [tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
  },
])
