import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export default defineConfig({
  testDir: './frontend/e2e',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { outputFolder: 'frontend/playwright-report', open: 'never' }], ['json', { outputFile: 'frontend/test-results/results.json' }]],
  outputDir: 'frontend/test-results/artifacts',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3002',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: existsSync(chrome) ? { executablePath: chrome } : {}
  },
  webServer: {
    command: 'node backend/scripts/e2e-stack.mjs',
    url: 'http://127.0.0.1:3002',
    timeout: 180_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
