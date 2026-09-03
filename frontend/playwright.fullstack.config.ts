import { defineConfig, devices } from '@playwright/test'

const webUrl = process.env.BARBERTRIX_FULLSTACK_WEB_URL ?? 'http://127.0.0.1:4174'
const apiUrl = process.env.BARBERTRIX_FULLSTACK_API_URL ?? 'http://127.0.0.1:8080'
const connectionString = process.env.BARBERTRIX_FULLSTACK_CONNECTION
const jwtKey = process.env.BARBERTRIX_FULLSTACK_JWT_KEY

if (!connectionString) {
  throw new Error('BARBERTRIX_FULLSTACK_CONNECTION is required to run full-stack E2E tests.')
}

if (!jwtKey) {
  throw new Error('BARBERTRIX_FULLSTACK_JWT_KEY is required to run full-stack E2E tests.')
}

export default defineConfig({
  testDir: './e2e/fullstack',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report-fullstack', open: 'never' }]]
    : 'list',
  outputDir: 'test-results-fullstack',
  use: {
    baseURL: webUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium-fullstack', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'dotnet run --project ../backend/src/BarberTrix.Api/BarberTrix.Api.csproj --configuration Release --no-build --no-launch-profile',
      url: `${apiUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Testing',
        ASPNETCORE_URLS: apiUrl,
        ConnectionStrings__DefaultConnection: connectionString,
        Jwt__Key: jwtKey,
        Database__ApplyMigrations: 'true',
        Database__MigrationOnly: 'false',
        Demo__Enabled: 'false',
        Auth__RequireVerifiedEmail: 'false',
        Email__Enabled: 'false',
        HumanVerification__Enabled: 'false',
        Cors__AllowedOrigins__0: webUrl,
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4174',
      url: webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_API_URL: apiUrl,
      },
    },
  ],
})
