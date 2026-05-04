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

  get productTitle(): Locator {
    return this.page.locator(this.selectors.pdp.productTitle ?? '').first();
  }

  get breadcrumb(): Locator {
    return this.page.locator(this.selectors.pdp.breadcrumb ?? '').first();
  }

  get breadcrumbLinks(): Locator {
    return this.page.locator(this.selectors.pdp.breadcrumbLink ?? '');
  }

  get price(): Locator {
    return this.page.locator(this.selectors.pdp.price ?? '').first();
  }

  get promoBadges(): Locator {
    return this.page.locator(this.selectors.pdp.promoBadge ?? '');
  }

  get sku(): Locator {
    return this.page.locator(this.selectors.pdp.sku ?? '').first();
  }

  get description(): Locator {
    return this.page.locator(this.selectors.pdp.description ?? '').first();
  }

  get attributes(): Locator {
    return this.page.locator(this.selectors.pdp.attribute ?? '');
  }

  get colorOptions(): Locator {
    return this.page.locator(this.selectors.pdp.colorOption ?? '');
  }

  get sizeOptions(): Locator {
    return this.page.locator(this.selectors.pdp.sizeOption ?? '');
  }

  get galleryImages(): Locator {
    return this.page.locator(this.selectors.pdp.galleryImage ?? '');
  }

  get thumbnails(): Locator {
    return this.page.locator(this.selectors.pdp.thumbnail ?? '');
  }

  get galleryNext(): Locator {
    return this.page.locator(this.selectors.pdp.galleryNext ?? '').first();
  }

  get galleryPrevious(): Locator {
    return this.page.locator(this.selectors.pdp.galleryPrevious ?? '').first();
  }

  get zoomTrigger(): Locator {
    return this.page.locator(this.selectors.pdp.zoomTrigger ?? '').first();
  }

  get zoomDialog(): Locator {
    return this.page.locator(this.selectors.pdp.zoomDialog ?? '').first();
  }

  get productVideo(): Locator {
    return this.page.locator(this.selectors.pdp.productVideo ?? '').first();
  }

  get sizeSelect(): Locator {
    return this.page.locator(this.selectors.pdp.sizeSelect ?? this.selectors.pdp.sizeSelector ?? '').first();
  }

  get sizeButtons(): Locator {
    return this.page.locator(this.selectors.pdp.sizeButton ?? this.selectors.pdp.sizeOption ?? '');
  }

  get successFeedback(): Locator {
    return this.page.locator(this.selectors.pdp.successFeedback ?? '').first();
  }

  get quantityInput(): Locator {
    return this.page.locator(this.selectors.pdp.quantityInput ?? '').first();
  }

  get wishlistTrigger(): Locator {
    return this.page.locator(this.selectors.pdp.wishlistTrigger ?? '').first();
  }

  get findStore(): Locator {
    return this.page.locator(this.selectors.pdp.findStore ?? '').first();
  }

  get storeDialog(): Locator {
    return this.page.locator(this.selectors.pdp.storeDialog ?? '').first();
  }

  get deliveryInfo(): Locator {
    return this.page.locator(this.selectors.pdp.deliveryInfo ?? '').first();
  }

  get pickupInfo(): Locator {
    return this.page.locator(this.selectors.pdp.pickupInfo ?? '').first();
  }

  get financePromo(): Locator {
    return this.page.locator(this.selectors.pdp.financePromo ?? '').first();
  }

  get financeDialog(): Locator {
    return this.page.locator(this.selectors.pdp.financeDialog ?? '').first();
  }

  get recommendation(): Locator {
    return this.page.locator(this.selectors.pdp.recommendation ?? '').first();
  }

  get accordionOrTabs(): Locator {
    return this.page.locator(this.selectors.pdp.accordionOrTab ?? '');
  }

  get stickyAddToCart(): Locator {
    return this.page.locator(this.selectors.pdp.stickyAddToCart ?? '').first();
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
    await this.selectFirstAvailableSizeIfPossible();
    try {
      await this.addToCartButton.click({ timeout: 10_000 });
    } catch {
      // Normal click can time out if the button is briefly covered (e.g. React re-render
      // overlay after size selection). Force-click fires the event immediately.
      await this.addToCartButton.click({ force: true, timeout: 5_000 }).catch(() => undefined);
    }
    await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
  }

  async getPrimaryImageSignature(): Promise<string> {
    return this.page.evaluate((selector) => {
      const images = Array.from(document.querySelectorAll(selector)) as HTMLImageElement[];
      const scored = images
        .map((img) => {
          const rect = img.getBoundingClientRect();
          const style = window.getComputedStyle(img);
          const visible =
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 80 &&
            rect.height > 80 &&
            rect.bottom > 0 &&
            rect.top < window.innerHeight;
          const area = rect.width * rect.height;
          const src = img.currentSrc || img.src || '';
          return { visible, area, src, alt: img.alt ?? '' };
        })
        .filter((item) => item.visible)
        .sort((a, b) => b.area - a.area);

      const target = scored[0];
      if (!target) {
        return '';
      }

      return `${target.src}|${target.alt}|${target.area}`;
    }, this.selectors.pdp.galleryImage ?? 'img');
  }

  async selectFirstAvailableSizeIfPossible(): Promise<boolean> {
    const select = this.sizeSelect;
    if (await select.isVisible().catch(() => false)) {
      const options = select.locator('option:not([disabled])');
      const count = await options.count();
      if (count > 0) {
        const value = await options.nth(0).getAttribute('value');
        if (value) {
          await select.selectOption(value).catch(() => undefined);
          return true;
        }
      }
    }

    const count = await this.sizeButtons.count();
    for (let index = 0; index < count; index += 1) {
      const option = this.sizeButtons.nth(index);
      const skipOrDisabled = await option
        .evaluate((node) => {
          const button = node as HTMLButtonElement;
          // Skip utility/navigation buttons (size guide, measurement toggle, etc.)
          const ariaLabel = (button.getAttribute('aria-label') ?? '').toLowerCase();
          if (/menu|guide|chart|toggle|expand|collapse|what.*size/i.test(ariaLabel)) return true;
          // Skip visually empty buttons (icons only)
          const text = (button.textContent ?? '').trim();
          if (text.length === 0) return true;
          return button.disabled || button.getAttribute('aria-disabled') === 'true';
        })
        .catch(() => true);
      if (!skipOrDisabled) {
        await option.click({ timeout: 5000 }).catch(() => undefined);
        return true;
      }
    }

    // Last resort: evaluate in-browser to find and native-click a numeric size button.
    // Handles brands (e.g. DRM) that use styled-component class names without "size" keywords.
    // Native btn.click() bypasses all Playwright actionability checks and fires the event directly.
    const clicked = await this.page
      .evaluate(() => {
        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
        for (const btn of buttons) {
          const text = (btn.textContent ?? '').trim();
          if (!/^\d{1,3}(\.\d+)?$/.test(text)) continue;
          const ariaLabel = (btn.getAttribute('aria-label') ?? '').toLowerCase();
          if (/menu|guide|chart|toggle|wishlist|cart|checkout|bag|store|search/i.test(ariaLabel)) continue;
          if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') continue;
          const rect = btn.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue;
          btn.click();
          return true;
        }
        return false;
      })
      .catch(() => false);

    if (clicked) {
      await this.page.waitForTimeout(300);
      return true;
    }

    return false;
  }
}
