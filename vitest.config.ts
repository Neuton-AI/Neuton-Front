import { defineConfig, mergeConfig, type ViteUserConfig } from 'vitest/config';
import viteConfig from './vite.config';

/**
 * Extends the app's Vite config rather than restating it, so the `@` alias and
 * the React plugin can never drift between the dev server, the build and the
 * tests. Without this, `vitest.config.ts` silently gains its own copy.
 */
export default mergeConfig(
  viteConfig as ViteUserConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      restoreMocks: true,
      clearMocks: true,
      include: ['src/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/test/**',
          'src/main.tsx',
          'src/**/*.d.ts',
        ],
      },
    },
  }),
);
