import { defineConfig, devices } from '@playwright/test';
import { projects } from './config/projects';
import { env } from './src/core/env';

export default defineConfig({
  testDir: './tests',
  timeout: 150_000,
  expect: {
    timeout: 40_000
  },
  fullyParallel: true,
  forbidOnly: env.CI,
  retries: env.CI ? 2 : 0,
  workers: 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright-html', open: 'never' }]
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 60_000,
    navigationTimeout: 60_000,
    ...devices['Desktop Chrome']
  },
  projects
});
