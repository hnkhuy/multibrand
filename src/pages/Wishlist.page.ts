import type { Locator, Page } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

export class WishlistPage extends BasePage {
  constructor(page: Page, selectors: Selectors, ctx: BrandContext) {
    super(page, selectors, ctx);
  }

  get pageLink(): Locator {
    return this.page.locator(this.selectors.wishlist.pageLink ?? '').first();
  }

  get items(): Locator {
    return this.page.locator(this.selectors.wishlist.pageItem ?? '');
  }

  get trigger(): Locator {
    return this.page.locator(this.selectors.wishlist.trigger ?? '').first();
  }

  get triggers(): Locator {
    return this.page.locator(this.selectors.wishlist.trigger ?? '');
  }

  get toast(): Locator {
    return this.page.locator(this.selectors.wishlist.toast ?? '').first();
  }

  get removeButton(): Locator {
    return this.page.locator(this.selectors.wishlist.removeButton ?? '').first();
  }

  get price(): Locator {
    return this.page.locator(this.selectors.wishlist.price ?? '').first();
  }
}
