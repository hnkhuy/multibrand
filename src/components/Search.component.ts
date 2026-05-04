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

    // 1. Try the submit button scoped to the ancestor <form> — avoids accidentally clicking
    //    unrelated buttons in mega-nav forms (e.g. DRM/Vans where page-wide submit matched the wrong element).
    if (this.selectors.header.searchSubmit) {
      const formSubmit = input
        .locator('xpath=ancestor::form')
        .locator(this.selectors.header.searchSubmit)
        .first();
      if (await formSubmit.isVisible().catch(() => false)) {
        await Promise.all([
          this.page.waitForURL((url) => url.href !== previousUrl, { timeout: 15_000 }).catch(() => undefined),
          formSubmit.click()
        ]);
        if (this.page.url() !== previousUrl) {
          await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
          return;
        }
      }
    }

    // 2. Press Enter — universal form submission. Short timeout so we quickly fall
    //    through to the page-wide button if Enter doesn't navigate (e.g. Skechers).
    await Promise.all([
      this.page.waitForURL((url) => url.href !== previousUrl, { timeout: 5_000 }).catch(() => undefined),
      input.press('Enter')
    ]);
    if (this.page.url() !== previousUrl) {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
      return;
    }

    // 3. Page-wide submit button (last resort — may include unrelated buttons, but no better option).
    if (this.selectors.header.searchSubmit) {
      const pageSubmit = this.page.locator(this.selectors.header.searchSubmit).first();
      if (await pageSubmit.isVisible().catch(() => false)) {
        await Promise.all([
          this.page.waitForURL((url) => url.href !== previousUrl, { timeout: 20_000 }).catch(() => undefined),
          pageSubmit.click()
        ]);
        await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
      }
    }
  }
}
