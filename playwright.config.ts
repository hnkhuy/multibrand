import { defineConfig, devices } from '@playwright/test';
import { projects } from './config/projects';
import { env } from './src/core/env';
import { updateBrandTrend, generateDashboard, generateBrandChart, injectNavIntoMonocartReport, archiveRun, generateSpecBreakdown, updateFlakyTracker, generateFlakyPage, generateDurationPage } from './scripts/brand-chart-generator';

export default defineConfig({
  testDir: './tests',
  globalTeardown: './src/core/teardown.ts',
  timeout: 150_000,
  expect: {
    timeout: 40_000
  },
  fullyParallel: true,
  forbidOnly: env.CI,
  retries: env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright-html', open: 'never' }],
    ['monocart-reporter', {
      name: 'Multi-Brand Automation Report',
      outputFile: 'reports/monocart/index.html',
      trend: 'reports/monocart/index.json',
      copyAttachments: false,
      columns: (defaultColumns: any[]) => {
        const projectColumn = defaultColumns.find((c: any) => c.id === 'project');
        if (projectColumn) projectColumn.width = 120;
        return defaultColumns;
      },
      onEnd: async (reportData: any) => {
        const runs      = updateBrandTrend(reportData, 'reports/monocart/brand-trend.json');
        const flakyRuns = updateFlakyTracker(reportData, 'reports/monocart/flaky-trend.json');
        archiveRun(reportData, runs, 'reports/archive', 'reports/monocart');
        generateDashboard(reportData, runs, 'reports/monocart/dashboard.html');
        generateBrandChart(runs, 'reports/monocart/brand-chart.html');
        generateSpecBreakdown(reportData, 'reports/monocart/spec-breakdown.html');
        generateFlakyPage(flakyRuns, 'reports/monocart/flaky-tests.html');
        generateDurationPage(reportData, 'reports/monocart/test-duration.html');
        injectNavIntoMonocartReport('reports/monocart/index.html');
      }
    }]
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
