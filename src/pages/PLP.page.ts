import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

export interface ProductTarget {
  href: string;
  top: number;
}

export class PLPPage extends BasePage {
  constructor(page: Page, selectors: Selectors, ctx: BrandContext) {
    super(page, selectors, ctx);
  }

  get productCards(): Locator {
    return this.page.locator(this.selectors.plp.productCard);
  }

  get productLinks(): Locator {
    return this.page.locator(this.selectors.plp.productLink ?? this.selectors.home.mainLink);
  }

  get breadcrumb(): Locator {
    return this.page.locator(this.selectors.plp.breadcrumb ?? '').first();
  }

  get breadcrumbLinks(): Locator {
    return this.page.locator(this.selectors.plp.breadcrumbLink ?? '');
  }

  get productPrices(): Locator {
    return this.page.locator(this.selectors.plp.productPrice ?? '');
  }

  get productBadges(): Locator {
    return this.page.locator(this.selectors.plp.productBadge ?? '');
  }

  get productImages(): Locator {
    return this.page.locator(this.selectors.plp.productImage ?? 'img');
  }

  get categoryTitle(): Locator {
    return this.page.locator(this.selectors.plp.categoryTitle ?? '').first();
  }

  get categoryBanner(): Locator {
    return this.page.locator(this.selectors.plp.categoryBanner ?? '').first();
  }

  get loadMoreButton(): Locator {
    return this.page.locator(this.selectors.plp.loadMore ?? '').first();
  }

  get paginationNext(): Locator {
    return this.page.locator(this.selectors.plp.paginationNext ?? '').first();
  }

  get sortControl(): Locator {
    return this.page.locator(this.selectors.plp.sortControl ?? '').first();
  }

  get sortSelect(): Locator {
    return this.page.locator(this.selectors.plp.sortSelect ?? '').first();
  }

  get sortTrigger(): Locator {
    return this.page.locator(this.selectors.plp.sortTrigger ?? '').first();
  }

  get filterPanel(): Locator {
    return this.page.locator(this.selectors.plp.filterPanel ?? this.selectors.plp.filters ?? '').first();
  }

  get filterToggle(): Locator {
    return this.page.locator(this.selectors.plp.filterToggle ?? '').first();
  }

  get filterClose(): Locator {
    return this.page.locator(this.selectors.plp.filterClose ?? '').first();
  }

  get activeFilterChips(): Locator {
    return this.page.locator(this.selectors.plp.activeFilterChip ?? '');
  }

  get clearAllFilters(): Locator {
    return this.page.locator(this.selectors.plp.clearAllFilters ?? '').first();
  }

  get stickyControls(): Locator {
    return this.page.locator(this.selectors.plp.stickyControls ?? '').first();
  }

  get quickAddButtons(): Locator {
    return this.page.locator(this.selectors.plp.quickAdd ?? '');
  }

  get wishlistTriggers(): Locator {
    return this.page.locator(this.selectors.plp.wishlistTrigger ?? '');
  }

  get countSummary(): Locator {
    return this.page.locator(this.selectors.plp.countSummary ?? '').first();
  }

  get hoverReveal(): Locator {
    return this.page.locator(this.selectors.plp.hoverReveal ?? '').first();
  }

  get variantOptions(): Locator {
    return this.page.locator(this.selectors.plp.variantOption ?? '');
  }

  get successFeedback(): Locator {
    return this.page.locator(this.selectors.plp.successFeedback ?? '').first();
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

  async collectProductTargets(limit = 20): Promise<ProductTarget[]> {
    const items = await this.productLinks.evaluateAll((elements) => {
      const productPathPattern = /\/product\/|\/p\/|\.html(?:$|\?)/i;
      const blockedPattern = /\/wishlist|\/cart|\/account|\/login|\/track-order|\/stores|\/sign-up/i;

      return elements
        .map((element) => {
          const anchor = element as HTMLAnchorElement;
          const href = anchor.getAttribute('href') ?? '';
          const rect = anchor.getBoundingClientRect();
          const style = window.getComputedStyle(anchor);
          const visible =
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none';

          return { href, top: rect.top, visible };
        })
        .filter((item) => item.visible && productPathPattern.test(item.href) && !blockedPattern.test(item.href))
        .filter((item) => item.top > 140)
        .slice(0, 30);
    });

    const deduped = new Map<string, ProductTarget>();
    for (const item of items) {
      if (!deduped.has(item.href)) {
        deduped.set(item.href, item);
      }
    }

    return Array.from(deduped.values()).slice(0, limit);
  }

  async firstVisibleProductCard(): Promise<Locator | null> {
    const count = await this.productCards.count();
    for (let index = 0; index < count; index += 1) {
      const card = this.productCards.nth(index);
      if (await card.isVisible().catch(() => false)) {
        return card;
      }
    }
    return null;
  }

  async readProductNameFromCard(card: Locator): Promise<string> {
    const primary = card.locator(this.selectors.plp.productName ?? this.selectors.wishlist.productName ?? 'h1').first();
    let text = (await primary.innerText().catch(() => '')).trim();
    if (text.length > 1) {
      return text;
    }

    const fallbackLink = card.locator(this.selectors.plp.productLink ?? 'a[href]').first();
    text = (await fallbackLink.innerText().catch(() => '')).trim();
    if (text.length > 1) {
      return text;
    }

    return (await card.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  }

  async openFirstProductByHref(): Promise<boolean> {
    const [target] = await this.collectProductTargets(1);
    if (!target) {
      return false;
    }

    await this.page.goto(new URL(target.href, this.page.url()).href, { waitUntil: 'domcontentloaded' });
    await this.dismissInterruptions();
    return true;
  }
}
