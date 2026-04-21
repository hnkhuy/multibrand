import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

export class PDPPage extends BasePage {
  constructor(page: Page, selectors: Selectors, ctx: BrandContext) {
    super(page, selectors, ctx);
  }

  get addToCartButton(): Locator {
    return this.page.locator(this.selectors.pdp.addToCartButton).first();
  }

  async expectLoaded(): Promise<void> {
    if (this.selectors.pdp.productTitle) {
      await expect(this.page.locator(this.selectors.pdp.productTitle).first()).toBeVisible();
    }
  }

  async selectFirstAvailableSize(): Promise<void> {
    const sizeSelector = this.selectors.pdp.sizeSelector;
    if (!sizeSelector) {
      return;
    }

    const size = this.page.locator(sizeSelector).first();
    if (!(await size.isVisible().catch(() => false))) {
      return;
    }

    const tagName = await size.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      const options = size.locator('option:not([disabled])');
      const count = await options.count();
      for (let index = 0; index < count; index += 1) {
        const value = await options.nth(index).getAttribute('value');
        if (value) {
          await size.selectOption(value);
          return;
        }
      }
      return;
    }

    await size.click();
  }

  async addToCart(): Promise<void> {
    await this.selectFirstAvailableSize();
    await this.addToCartButton.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
  }
}
