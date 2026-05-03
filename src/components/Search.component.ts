import type { Page } from '@playwright/test';
import type { Selectors } from '../core/types';

export class SearchComponent {
  constructor(
    private readonly page: Page,
    private readonly selectors: Selectors
  ) {}

  async search(keyword: string): Promise<void> {
    const previousUrl = this.page.url();
    const input = this.page.locator(this.selectors.header.searchInput).first();
    await input.fill(keyword);

    if (this.selectors.header.searchSubmit) {
      const submit = this.page.locator(this.selectors.header.searchSubmit).first();
      if (await submit.isVisible().catch(() => false)) {
        await Promise.all([
          this.page.waitForURL((url) => url.href !== previousUrl, { timeout: 30_000 }).catch(() => undefined),
          submit.click()
        ]);
        await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
        return;
      }
    }

    const siblingSubmit = input.locator('xpath=following-sibling::*[1]');
    if (await siblingSubmit.isVisible().catch(() => false)) {
      await Promise.all([
        this.page.waitForURL((url) => url.href !== previousUrl, { timeout: 30_000 }).catch(() => undefined),
        siblingSubmit.click()
      ]);
      await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
      return;
    }

    await input.press('Enter');
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
  }
}
