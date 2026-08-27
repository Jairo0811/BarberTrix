import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/api.ts',
        'src/apiErrorMessages.ts',
        'src/passwordPolicy.ts',
        'src/shared/components/LockedFeature.tsx',
      ],
      thresholds: { statements: 60, branches: 50, functions: 60, lines: 60 },
    },
  },
})
