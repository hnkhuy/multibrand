import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

const CART_URL_PATTERN = /\/(cart|bag|basket)(?:\/|$|\?)/i;

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
    await expect(this.body).toBeVisible();
    await expect(this.body).not.toBeEmpty();

    const hasVisibleMainContent = await this.page
      .locator(this.selectors.cart.pageRoot)
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

  get rows(): Locator {
    return this.page.locator(this.selectors.cart.itemRow);
  }

  get emptyMessage(): Locator {
    return this.page.locator(this.selectors.cart.emptyMessage ?? '').first();
  }

  get continueShopping(): Locator {
    return this.page.locator(this.selectors.cart.continueShopping ?? '').first();
  }

  headerCartCount(): Locator {
    return this.header.cartCount;
  }

  itemImage(row: Locator): Locator {
    return row.locator(this.selectors.cart.itemImage ?? 'img').first();
  }

  itemName(row: Locator): Locator {
    return row.locator(this.selectors.cart.itemName ?? 'h2').first();
  }

  itemAttributes(row: Locator): Locator {
    return row.locator(this.selectors.cart.itemAttribute ?? '');
  }

  itemPrice(row: Locator): Locator {
    return row.locator(this.selectors.cart.itemPrice ?? '').first();
  }

  productLink(row: Locator): Locator {
    return row.locator(this.selectors.cart.productLink ?? 'a[href]').first();
  }

  removeButton(row: Locator): Locator {
    return row.locator(this.selectors.cart.removeButton ?? '').first();
  }

  quantityControl(row: Locator): Locator {
    return row.locator(this.selectors.cart.qtyInput ?? '').first();
  }

  quantityPlusButton(row: Locator): Locator {
    return row.locator(this.selectors.cart.qtyPlus ?? '').first();
  }

  quantityMinusButton(row: Locator): Locator {
    return row.locator(this.selectors.cart.qtyMinus ?? '').first();
  }

  async getVisibleRows(): Promise<Locator[]> {
    const count = await this.rows.count();
    const visible: Locator[] = [];
    for (let index = 0; index < count; index += 1) {
      const row = this.rows.nth(index);
      if (await row.isVisible().catch(() => false)) {
        visible.push(row);
      }
    }
    return visible;
  }

  async readQuantityFromRow(row: Locator): Promise<number | null> {
    const selector = this.selectors.cart.qtyInput;
    if (!selector) {
      return null;
    }

    const control = row.locator(selector).first();
    if (await control.isVisible().catch(() => false)) {
      const tagName = await control.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
      if (tagName === 'input' || tagName === 'select') {
        const raw = await control.inputValue().catch(() => '');
        const parsed = Number.parseInt(raw, 10);
        return Number.isFinite(parsed) ? parsed : null;
      }
    }

    const text = (await row.innerText().catch(() => '')).replace(/\s+/g, ' ');
    const matched = text.match(/qty(?:uantity)?[:\s]+(\d{1,2})/i);
    if (!matched) {
      return null;
    }

    const parsed = Number.parseInt(matched[1], 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async setRowQuantity(row: Locator, value: number): Promise<boolean> {
    const selector = this.selectors.cart.qtyInput;
    if (!selector) {
      return false;
    }

    const control = row.locator(selector).first();
    if (!(await control.isVisible().catch(() => false))) {
      return false;
    }

    const tagName = await control.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      const option = control.locator(`option[value="${value}"]`).first();
      if (!(await option.isVisible().catch(() => false))) {
        return false;
      }
      await control.selectOption(String(value));
      return true;
    }

    if (tagName === 'input') {
      await control.fill(String(value));
      await control.press('Enter').catch(() => undefined);
      await control.blur();
      return true;
    }

    return false;
  }

  async clickQuantityButton(row: Locator, type: 'plus' | 'minus'): Promise<boolean> {
    const selector = type === 'plus' ? this.selectors.cart.qtyPlus : this.selectors.cart.qtyMinus;
    if (!selector) {
      return false;
    }
    const button = type === 'plus' ? this.quantityPlusButton(row) : this.quantityMinusButton(row);
    if (!(await button.isVisible().catch(() => false))) {
      return false;
    }
    await button.click();
    return true;
  }

  async clearIfPossible(): Promise<void> {
    for (let iteration = 0; iteration < 6; iteration += 1) {
      const rows = await this.getVisibleRows();
      if (rows.length === 0) {
        return;
      }

      const selector = this.selectors.cart.removeButton;
      if (!selector) {
        return;
      }

      const remove = this.removeButton(rows[0]);
      if (!(await remove.isVisible().catch(() => false))) {
        return;
      }

      await remove.click();
      await this.page.waitForTimeout(1200);
    }
  }

  async readHeaderCartCount(): Promise<number | null> {
    const targets = this.page.locator(this.selectors.header.cartCount ?? '');
    const count = await targets.count();
    for (let index = 0; index < count; index += 1) {
      const node = targets.nth(index);
      if (!(await node.isVisible().catch(() => false))) {
        continue;
      }
      const text = await node.evaluate((element) => {
        const aria = element.getAttribute('aria-label') ?? '';
        const own = element.textContent ?? '';
        return `${aria} ${own}`.replace(/\s+/g, ' ').trim();
      });
      const matched = text.match(/\b(\d{1,2})\b/);
      if (matched) {
        const parsed = Number.parseInt(matched[1], 10);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }
}
