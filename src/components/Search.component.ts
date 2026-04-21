import type { Page } from '@playwright/test';
import type { Selectors } from '../core/types';

export class SearchComponent {
  constructor(
    private readonly page: Page,
    private readonly selectors: Selectors
  ) {}

  async search(keyword: string): Promise<void> {
    const input = this.page.locator(this.selectors.header.searchInput).first();
    await input.fill(keyword);

    if (this.selectors.header.searchSubmit) {
      const submit = this.page.locator(this.selectors.header.searchSubmit).first();
      if (await submit.isVisible().catch(() => false)) {
        await Promise.all([
          this.page.waitForLoadState('domcontentloaded').catch(() => undefined),
          submit.click()
        ]);
        return;
      }
    }

    await input.press('Enter');
    await this.page.waitForLoadState('domcontentloaded');
  }
}
