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
    await this.selectFirstAvailableSize();
    await this.addToCartButton.click();
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
      const disabled = await option
        .evaluate((node) => {
          const button = node as HTMLButtonElement;
          return button.disabled || button.getAttribute('aria-disabled') === 'true';
        })
        .catch(() => true);
      if (!disabled) {
        await option.click({ timeout: 5000 }).catch(() => undefined);
        return true;
      }
    }

    return false;
  }
}
