import type { Locator, Page } from '@playwright/test';

export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
}

export async function waitForVisible(locator: Locator): Promise<void> {
  await locator.waitFor({ state: 'visible' });
}

export async function waitForAttached(locator: Locator): Promise<void> {
  await locator.waitFor({ state: 'attached' });
}
