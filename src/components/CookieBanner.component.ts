import type { Locator, Page } from '@playwright/test';
import type { Selectors } from '../core/types';

export class CookieBannerComponent {
  constructor(
    private readonly page: Page,
    private readonly selectors: Selectors
  ) {}

  get banner(): Locator | undefined {
    return this.selectors.cookie?.banner ? this.page.locator(this.selectors.cookie.banner).first() : undefined;
  }

  async acceptIfVisible(): Promise<void> {
    const acceptButton = this.selectors.cookie?.acceptButton;
    if (!acceptButton) {
      return;
    }

    const button = this.page.locator(acceptButton).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
    }
  }
}
