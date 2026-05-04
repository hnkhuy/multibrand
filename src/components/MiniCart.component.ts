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

  get closeButton(): Locator {
    return this.page.locator(this.selectors.minicart.closeButton ?? '').first();
  }

  get viewCartButton(): Locator {
    return this.page.locator(this.selectors.minicart.viewCartButton ?? '').first();
  }

  get subtotal(): Locator {
    return this.page.locator(this.selectors.minicart.subtotal ?? '').first();
  }

  get emptyMessage(): Locator {
    return this.page.locator(this.selectors.minicart.emptyMessage ?? '').first();
  }

  get continueShoppingCta(): Locator {
    return this.page.locator(this.selectors.minicart.continueShoppingCta ?? '').first();
  }

  get paymentMessaging(): Locator {
    return this.page.locator(this.selectors.minicart.paymentMessaging ?? '').first();
  }

  get promoMessage(): Locator {
    return this.page.locator(this.selectors.minicart.promoMessage ?? '').first();
  }

  get rows(): Locator {
    return this.page.locator(this.selectors.minicart.itemRow ?? '');
  }

  itemImage(row: Locator): Locator {
    return row.locator(this.selectors.minicart.itemImage ?? 'img').first();
  }

  itemName(row: Locator): Locator {
    return row.locator(this.selectors.minicart.itemName ?? 'h2, h3').first();
  }

  itemAttributes(row: Locator): Locator {
    return row.locator(this.selectors.minicart.itemAttribute ?? '');
  }

  itemPrice(row: Locator): Locator {
    return row.locator(this.selectors.minicart.itemPrice ?? '').first();
  }

  productLink(row: Locator): Locator {
    return row.locator(this.selectors.minicart.productLink ?? 'a[href]').first();
  }

  removeButton(row: Locator): Locator {
    return row.locator(this.selectors.minicart.removeButton ?? '').first();
  }

  quantityControl(row: Locator): Locator {
    return row.locator(this.selectors.minicart.qtyInput ?? '').first();
  }

  quantityPlusButton(row: Locator): Locator {
    return row.locator(this.selectors.minicart.qtyPlus ?? '').first();
  }

  quantityMinusButton(row: Locator): Locator {
    return row.locator(this.selectors.minicart.qtyMinus ?? '').first();
  }

  async open(): Promise<void> {
    const cartIcon = this.page.locator(this.selectors.header.cartIcon).first();
    await cartIcon.click();
    await this.page.waitForTimeout(500);
  }

  // Returns true when the drawer is genuinely closed — handles three patterns:
  //   1. display:none / visibility:hidden  → isVisible() === false
  //   2. aria-hidden="true"               → React/accessible drawer pattern
  //   3. Off-screen via CSS transform     → bounding box outside viewport
  private async isDrawerClosed(): Promise<boolean> {
    if (!(await this.drawer.isVisible().catch(() => false))) return true;
    const ariaHidden = await this.drawer.getAttribute('aria-hidden').catch(() => null);
    if (ariaHidden === 'true') return true;
    const box = await this.drawer.boundingBox().catch(() => null);
    if (!box) return true;
    const vp = this.page.viewportSize() ?? { width: 1280, height: 720 };
    return (
      box.x + box.width <= 0 ||
      box.y + box.height <= 0 ||
      box.x >= vp.width ||
      box.y >= vp.height
    );
  }

  async close(): Promise<void> {
    // 1. Explicit close button (standard X / aria-label="close")
    const btn = this.closeButton;
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(400);
      return;
    }
    // 2. Escape key
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
    if (await this.isDrawerClosed()) return;
    // 3. "Continue Shopping" scoped to the drawer — on DRM/Platypus this IS the close trigger.
    //    Guard with boundingBox to skip clicking off-screen elements (CSS-transform-closed drawers).
    const ctaInDrawer = this.drawer.locator(
      'button:has-text("Continue Shopping"), a:has-text("Continue Shopping"), button:has-text("Continue shopping"), a:has-text("Continue shopping")'
    ).first();
    const ctaBox = await ctaInDrawer.boundingBox().catch(() => null);
    const vp = this.page.viewportSize() ?? { width: 1280, height: 720 };
    const ctaOnScreen = ctaBox !== null && ctaBox.x < vp.width && ctaBox.y < vp.height && ctaBox.x + ctaBox.width > 0 && ctaBox.y + ctaBox.height > 0;
    if (ctaOnScreen) {
      await ctaInDrawer.click();
      await this.page.waitForTimeout(500);
      return;
    }
    // 4. Cart icon toggle (force bypasses overlay interception)
    const cartIcon = this.page.locator(this.selectors.header.cartIcon).first();
    if (await cartIcon.isVisible().catch(() => false)) {
      await cartIcon.click({ force: true });
      await this.page.waitForTimeout(600);
    }
  }

  async expectOpen(): Promise<void> {
    await expect(this.drawer).toBeVisible();
  }

  async expectClosed(): Promise<void> {
    await expect(async () => {
      if (!(await this.isDrawerClosed())) throw new Error('Mini cart drawer is still visible');
    }).toPass({ timeout: 40000 });
  }

  async goToCheckout(): Promise<void> {
    await this.checkoutButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async goToCart(): Promise<void> {
    await this.viewCartButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getVisibleRows(): Promise<Locator[]> {
    const count = await this.rows.count();
    const visible: Locator[] = [];
    for (let i = 0; i < count; i++) {
      const row = this.rows.nth(i);
      if (await row.isVisible().catch(() => false)) {
        visible.push(row);
      }
    }
    return visible;
  }

  async readQuantityFromRow(row: Locator): Promise<number | null> {
    const selector = this.selectors.minicart.qtyInput;
    if (selector) {
      const control = row.locator(selector).first();
      if (await control.isVisible().catch(() => false)) {
        const tagName = await control.evaluate((n) => n.tagName.toLowerCase()).catch(() => '');
        if (tagName === 'input' || tagName === 'select') {
          const raw = await control.inputValue().catch(() => '');
          const parsed = Number.parseInt(raw, 10);
          if (Number.isFinite(parsed)) return parsed;
        }
      }
    }
    const text = (await row.innerText().catch(() => '')).replace(/\s+/g, ' ');
    const match = text.match(/qty(?:uantity)?[:\s]+(\d{1,2})/i) ?? text.match(/\bx\s*(\d{1,2})\b/i);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  async setRowQuantity(row: Locator, value: number): Promise<boolean> {
    const selector = this.selectors.minicart.qtyInput;
    if (!selector) return false;
    const control = row.locator(selector).first();
    if (!(await control.isVisible().catch(() => false))) return false;
    const tagName = await control.evaluate((n) => n.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      if (!(await control.locator(`option[value="${value}"]`).isVisible().catch(() => false))) return false;
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
    const button = type === 'plus' ? this.quantityPlusButton(row) : this.quantityMinusButton(row);
    if (!(await button.isVisible().catch(() => false))) return false;
    await button.click();
    return true;
  }

  async readSubtotal(): Promise<string | null> {
    const el = this.subtotal;
    if (!(await el.isVisible().catch(() => false))) return null;
    return (await el.innerText().catch(() => '')).trim() || null;
  }

  async readHeaderCartCount(): Promise<number | null> {
    const targets = this.page.locator(this.selectors.header.cartCount ?? '');
    const count = await targets.count();
    for (let i = 0; i < count; i++) {
      const node = targets.nth(i);
      if (!(await node.isVisible().catch(() => false))) continue;
      const text = await node.evaluate((el) => {
        const aria = el.getAttribute('aria-label') ?? '';
        const own = el.textContent ?? '';
        return `${aria} ${own}`.replace(/\s+/g, ' ').trim();
      });
      const match = text.match(/\b(\d{1,2})\b/);
      if (match) {
        const parsed = Number.parseInt(match[1], 10);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return null;
  }
}
