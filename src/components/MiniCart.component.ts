import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { Selectors } from '../core/types';

export class MiniCartComponent {
  constructor(
    private readonly page: Page,
    private readonly selectors: Selectors
  ) {}

  get drawer(): Locator {
    return this.page.locator(this.selectors.minicart.drawer).first();
  }

  get checkoutButton(): Locator {
    return this.page.locator(this.selectors.minicart.checkoutButton).first();
  }

  async expectOpen(): Promise<void> {
    await expect(this.drawer).toBeVisible();
  }

  async goToCheckout(): Promise<void> {
    await this.checkoutButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}
