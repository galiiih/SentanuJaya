import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60 * 1000,
  // Bound the complete serial browser suite so a stuck browser/server cannot hold CI indefinitely.
  globalTimeout: 25 * 60 * 1000,
  // Stop after the first fully retried failure; later cases cannot provide useful signal
  // while a shared UI/auth issue is blocking the suite.
  maxFailures: process.env.CI ? 1 : 0,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'php artisan serve --port=8000',
      url: 'http://127.0.0.1:8000/',
      cwd: '../backend',
      reuseExistingServer: true,
      timeout: 60 * 1000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60 * 1000,
    }
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
