import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/**
 * Lint is deliberately narrow: `tsc --noEmit` already owns type correctness,
 * so ESLint here exists to catch the class of defect that typechecking cannot
 * see — a missing hook dependency, an unused capture, or a view importing
 * routing or business orchestration. Accessible interactions are tested by role.
 */
export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: [
      'src/pages/**/*.tsx',
      'src/components/**/*.tsx',
      'src/features/**/*.tsx',
      'src/App.tsx',
      'src/AppGate.tsx',
      'src/AppRoutes.tsx',
    ],
    ignores: ['**/*.test.tsx'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'react', importNames: ['useEffect', 'useLayoutEffect'], message: 'Put lifecycle behavior in the companion module.' },
          { name: 'react-router-dom', importNames: ['useNavigate', 'useLocation', 'useParams', 'useSearchParams'], message: 'Parse routes and navigate in the companion module.' },
          { name: '@tanstack/react-query', message: 'Consume server state through the companion module.' },
          { name: '@/lib/api', message: 'Call transport from a domain feature, then compose it in the companion module.' },
        ],
        patterns: [{ group: ['@/features/**/*Api', '@/features/auth/supabase', '@/features/uploads/upload'], allowTypeImports: true, message: 'Views receive behavior from their companion modules.' }],
      }],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: ['**/*.test.*'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['@/pages/**', '**/pages/**'], message: 'Features must not depend on route pages.' }] }],
    },
  },
  {
    files: ['src/test/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
);
