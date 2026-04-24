import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

const CART_URL_PATTERN = /\/(cart|bag|basket)(?:\/|$|\?)/i;
const MAIN_CONTENT_SELECTOR = 'main, [role="main"], [data-testid*="cart" i], [class*="cart" i]';

export class CartPage extends BasePage {
  constructor(page: Page, selectors: Selectors, ctx: BrandContext) {
    super(page, selectors, ctx);
  }

  async gotoCart(): Promise<void> {
    const candidates = ['/cart', '/checkout/cart'];

    for (const path of candidates) {
      await this.goto(path);
      if (CART_URL_PATTERN.test(new URL(this.page.url()).pathname)) {
        return;
      }
    }

    throw new Error(`Unable to open cart page. Current URL: ${this.page.url()}`);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.locator('body')).toBeVisible();
    await expect(this.page.locator('body')).not.toBeEmpty();

    const hasVisibleMainContent = await this.page
      .locator(MAIN_CONTENT_SELECTOR)
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasVisibleMainContent) {
      const visibleElementCount = await this.page.evaluate(() => {
        return Array.from(document.querySelectorAll('body *')).filter((element) => {
          const node = element as HTMLElement;
          const rect = node.getBoundingClientRect();
          const style = window.getComputedStyle(node);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none' &&
            style.opacity !== '0'
          );
        }).length;
      });

      expect(visibleElementCount).toBeGreaterThan(2);
    }
  }
}
