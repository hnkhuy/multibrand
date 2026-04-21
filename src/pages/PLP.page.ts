import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

export class PLPPage extends BasePage {
  constructor(page: Page, selectors: Selectors, ctx: BrandContext) {
    super(page, selectors, ctx);
  }

  get productCards(): Locator {
    return this.page.locator(this.selectors.plp.productCard);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.productCards.first()).toBeVisible();
  }

  async openFirstProduct(): Promise<void> {
    const card = this.productCards.first();
    const productNameSelector = this.selectors.plp.productName;
    const target = productNameSelector ? card.locator(productNameSelector).first() : card;

    await target.click();
    await this.page.waitForLoadState('domcontentloaded');
    await this.dismissInterruptions();
  }
}
