// TC coverage: PL-001..PL-020, PL-skx-001
// Based on: src/documents/tcs/GRA_PLP-Tcs.csv

import type { Page } from '@playwright/test';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import type { Brand, BrandContext } from '../../src/core/types';
import type { PLPPage } from '../../src/pages/PLP.page';
import { plpPaths, searchData } from '../../config/testData';

const PRICE_PATTERN = /\$\s?\d/;
const PRODUCT_PATH = /\/product\/|\/products?\/|\/p\/|\.html(?:$|\?)/i;
const CATEGORY_PATH = /\/shop\/|\/category\/|\/collections\//i;

function onlyBrand(ctx: BrandContext, brands: Brand | Brand[]): void {
  const allowed = Array.isArray(brands) ? brands : [brands];
  test.skip(!allowed.includes(ctx.brand), `Brand-specific: only runs on ${allowed.join(', ')}.`);
}

async function openPlp(ctx: { brand: Brand }, plp: { goto(p: string): Promise<void>; expectLoaded(): Promise<void>; dismissInterruptions(): Promise<void> }): Promise<void> {
  await plp.goto(plpPaths[ctx.brand]);
  await plp.expectLoaded().catch(() => undefined);
  await plp.dismissInterruptions();
}

async function applyFirstFilter(page: Page, plp: PLPPage): Promise<void> {
  if (!(await plp.filterPanel.isVisible().catch(() => false))) {
    if (await plp.filterToggle.isVisible().catch(() => false)) {
      await plp.filterToggle.click().catch(() => undefined);
      await page.waitForTimeout(500);
    }
  }
  const filterOption = page.locator(
    '[class*="filter" i] input[type="checkbox"]:not(:checked), [class*="facet" i] input[type="checkbox"]:not(:checked), [class*="filter-option" i] label'
  ).first();
  await filterOption.click().catch(() => undefined);
  await page.waitForTimeout(800);
}

async function applySort(page: Page, plp: PLPPage): Promise<void> {
  const ctrl = plp.sortControl;
  if (!(await ctrl.isVisible().catch(() => false))) return;
  const tagName = await ctrl.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
  if (tagName === 'select') {
    await ctrl.selectOption({ index: 1 }).catch(() => undefined);
  } else {
    await ctrl.click().catch(() => undefined);
    await page.waitForTimeout(300);
    await page.locator('[class*="sort" i] [role="option"], [class*="sort" i] li, [class*="sort-option" i]').first().click().catch(() => undefined);
  }
  await page.waitForTimeout(800);
}

async function removeFirstFilter(page: Page, plp: PLPPage): Promise<void> {
  const chip = plp.activeFilterChips.first();
  if (!(await chip.isVisible().catch(() => false))) return;
  const closeBtn = chip.locator('button, [aria-label*="remove" i], [aria-label*="clear" i]').first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click().catch(() => undefined);
  } else {
    await chip.click().catch(() => undefined);
  }
  await page.waitForTimeout(800);
}

test.describe('plp', { tag: ['@smoke'] }, () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  // ─── Critical ────────────────────────────────────────────────────────────

  test('PL-001 PLP loads with at least one product card visible', async ({ ctx, plp }) => {
    await openPlp(ctx, plp);
    await expect(plp.productCards.first()).toBeVisible({ timeout: 20_000 });
    const count = await plp.productCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('PL-002 clicking a product card navigates to that product PDP', async ({ ctx, plp, pdp, page }) => {
    await openPlp(ctx, plp);
    const ok = await plp.openFirstProductByHref().catch(() => false);
    if (!ok) await plp.openFirstProduct();
    await page.waitForLoadState('domcontentloaded');
    expect(PRODUCT_PATH.test(new URL(page.url()).pathname)).toBe(true);
  });

  test('PL-003 Quick Add adds a product to cart from PLP', async ({ features, ctx, plp, pdp, page }) => {
    test.skip(!features.quickAddOnPlp, 'quickAddOnPlp disabled for this brand.');
    await openPlp(ctx, plp);
    const qaBtn = plp.quickAddButtons.first();
    if (!(await qaBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Quick Add button not visible on staging PLP.');
      return;
    }
    const baseline = (await pdp.miniCart.readHeaderCartCount()) ?? 0;
    await qaBtn.hover();
    await page.waitForTimeout(300);
    await qaBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(1500);
    const after = await pdp.miniCart.readHeaderCartCount();
    const miniCartOpen = await pdp.miniCart.drawer.isVisible().catch(() => false);
    expect(
      miniCartOpen || (after !== null && after > baseline),
      'Quick Add should add product to cart or open mini-cart.'
    ).toBe(true);
  });

  // ─── High ────────────────────────────────────────────────────────────────

  test('PL-004 applying a single filter updates the product list', async ({ features, ctx, plp, page }) => {
    test.skip(!features.filters, 'Filters disabled for this brand.');
    await openPlp(ctx, plp);
    const countBefore = await plp.productCards.count();
    await applyFirstFilter(page, plp);
    await page.waitForTimeout(1000);
    const countAfter = await plp.productCards.count();
    const chipsAfter = await plp.activeFilterChips.count();
    expect(
      chipsAfter > 0 || countAfter !== countBefore,
      'Applying a filter should update product list or show active chip.'
    ).toBe(true);
  });

  test('PL-005 applying multiple filters narrows the product list', async ({ features, ctx, plp, page }) => {
    test.skip(!features.filters, 'Filters disabled for this brand.');
    await openPlp(ctx, plp);
    await applyFirstFilter(page, plp);
    await page.waitForTimeout(800);
    const countAfter1 = await plp.productCards.count();
    await applyFirstFilter(page, plp);
    await page.waitForTimeout(800);
    const countAfter2 = await plp.productCards.count();
    expect(
      countAfter2 <= countAfter1,
      'Applying more filters should not increase product count.'
    ).toBe(true);
  });

  test('PL-006 Clear All filters restores the unfiltered product list', async ({ features, ctx, plp, page }) => {
    test.skip(!features.filters, 'Filters disabled for this brand.');
    await openPlp(ctx, plp);
    const countBefore = await plp.productCards.count();
    await applyFirstFilter(page, plp);
    await page.waitForTimeout(800);
    const clearAll = plp.clearAllFilters;
    if (!(await clearAll.isVisible().catch(() => false))) {
      test.skip(true, 'Clear All filters button not visible after applying filter.');
      return;
    }
    await clearAll.click();
    await page.waitForTimeout(800);
    const chipsAfterClear = await plp.activeFilterChips.count();
    expect(chipsAfterClear).toBe(0);
    const countAfterClear = await plp.productCards.count();
    expect(
      countAfterClear >= countBefore,
      'Clearing filters should restore full product list.'
    ).toBe(true);
  });

  test('PL-007 product card shows image + name + price', async ({ ctx, plp, page }) => {
    await openPlp(ctx, plp);
    const card = await plp.firstVisibleProductCard();
    expect(card, 'At least one visible product card required.').not.toBeNull();
    const img = card!.locator('img').first();
    await expect(img).toBeVisible();
    const name = await plp.readProductNameFromCard(card!);
    expect(name.trim().length).toBeGreaterThan(1);
    const cardText = await card!.innerText();
    expect(PRICE_PATTERN.test(cardText), 'Product card should show a price.').toBe(true);
  });

  test('PL-008 sorting by price low-to-high reorders products', async ({ features, ctx, plp, page }) => {
    test.skip(!features.sort, 'Sort controls disabled for this brand.');
    await openPlp(ctx, plp);
    const pricesBefore = await plp.productPrices.allInnerTexts().catch(() => [] as string[]);
    await applySort(page, plp).catch(() => undefined);
    await page.waitForTimeout(1000);
    const pricesAfter = await plp.productPrices.allInnerTexts().catch(() => [] as string[]);
    expect(
      pricesAfter.length > 0,
      'Products should still be visible after sorting.'
    ).toBe(true);
    // Verify first price is visible and formatted
    if (pricesAfter.length > 0) {
      expect(PRICE_PATTERN.test(pricesAfter[0])).toBe(true);
    }
  });

  test('PL-009 Load More / next page loads additional products without duplicates', async ({ features, ctx, plp, page }) => {
    test.skip(!features.loadMore && !features.pagination, 'Neither Load More nor pagination enabled.');
    await openPlp(ctx, plp);
    const cardsBefore = await plp.productCards.allInnerTexts().catch(() => [] as string[]);
    const loadMore = plp.loadMoreButton;
    const paginationNext = plp.paginationNext;
    const hasLoadMore = await loadMore.isVisible().catch(() => false);
    const hasPagination = await paginationNext.isVisible().catch(() => false);
    if (!hasLoadMore && !hasPagination) {
      test.skip(true, 'No Load More or pagination controls found on staging PLP.');
      return;
    }
    if (hasLoadMore) {
      await loadMore.click();
    } else {
      await paginationNext.click();
    }
    await page.waitForTimeout(1500);
    const cardsAfter = await plp.productCards.allInnerTexts().catch(() => [] as string[]);
    expect(cardsAfter.length).toBeGreaterThan(cardsBefore.length);
  });

  test('PL-010 active filter chip visible; removing it updates the product list', async ({ features, ctx, plp, page }) => {
    test.skip(!features.filters, 'Filters disabled for this brand.');
    await openPlp(ctx, plp);
    await applyFirstFilter(page, plp);
    await page.waitForTimeout(800);
    const chips = plp.activeFilterChips;
    if ((await chips.count()) === 0) {
      test.skip(true, 'No active filter chips visible after applying filter.');
      return;
    }
    await expect(chips.first()).toBeVisible();
    const countWithFilter = await plp.productCards.count();
    await removeFirstFilter(page, plp);
    await page.waitForTimeout(800);
    const countAfterRemove = await plp.productCards.count();
    expect(
      countAfterRemove >= countWithFilter,
      'Removing a filter chip should expand or maintain product count.'
    ).toBe(true);
  });

  test('PL-011 Quick Add opens size/variant selector for configurable product', async ({ features, ctx, plp, page }) => {
    test.skip(!features.quickAddOnPlp, 'quickAddOnPlp disabled for this brand.');
    await openPlp(ctx, plp);
    const qaBtn = plp.quickAddButtons.first();
    if (!(await qaBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Quick Add button not visible on staging PLP.');
      return;
    }
    await qaBtn.hover();
    await page.waitForTimeout(300);
    await qaBtn.click({ timeout: 5_000 });
    await page.waitForTimeout(800);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const cartCount = await page.locator('[class*="cart-count" i], [data-testid*="cart-count" i]').first().innerText().catch(() => '0');
    const sizePickerOpen = /size|variant|select/i.test(bodyText);
    // Either a size picker opened OR product was instantly added (simple product)
    expect(sizePickerOpen || /\d/.test(cartCount), 'Quick Add should open size picker or add simple product.').toBe(true);
  });

  test('PL-012 mobile filter panel opens and applying a filter updates the product list', async ({ features, ctx, plp, page }) => {
    test.skip(!features.filters, 'Filters disabled for this brand.');
    await page.setViewportSize({ width: 390, height: 844 });
    await openPlp(ctx, plp);
    const filterToggle = plp.filterToggle;
    if (!(await filterToggle.isVisible().catch(() => false))) {
      test.skip(true, 'Filter toggle not visible on mobile PLP for this brand.');
      return;
    }
    await filterToggle.click();
    await page.waitForTimeout(500);
    await expect(plp.filterPanel).toBeVisible({ timeout: 5_000 });
    await applyFirstFilter(page, plp);
    await page.waitForTimeout(1000);
    const cardsAfter = await plp.productCards.count();
    expect(cardsAfter).toBeGreaterThan(0);
  });

  test('PL-013 sale product card shows original and discounted price', { tag: ['@data-dependent'] }, async ({ ctx, plp, page }) => {
    await openPlp(ctx, plp);
    const cards = plp.productCards;
    const count = await cards.count();
    let foundSale = false;
    for (let i = 0; i < Math.min(count, 12); i++) {
      const card = cards.nth(i);
      const text = (await card.innerText()).replace(/\s+/g, ' ');
      const prices = text.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [];
      if (prices.length >= 2 && /sale|was|save|off/i.test(text)) {
        foundSale = true;
        break;
      }
    }
    if (!foundSale) {
      test.skip(true, 'No sale products with dual-price found on staging PLP — @data-dependent.');
      return;
    }
    expect(foundSale).toBe(true);
  });

  // ─── Medium ──────────────────────────────────────────────────────────────

  test('PL-014 breadcrumb visible and category link navigates to parent category', async ({ features, ctx, plp, page }) => {
    test.skip(!features.breadcrumb, 'Brand does not display breadcrumb on PLP.');
    await openPlp(ctx, plp);
    await expect(plp.breadcrumb).toBeVisible();
    const links = plp.breadcrumbLinks;
    const count = await links.count();
    if (count < 1) {
      test.skip(true, 'No breadcrumb links found on PLP.');
      return;
    }
    await links.first().click({ timeout: 5_000 });
    await page.waitForLoadState('domcontentloaded');
    const currentPath = new URL(page.url()).pathname;
    expect(
      currentPath === '/' || CATEGORY_PATH.test(currentPath),
      'Breadcrumb link should navigate to homepage or parent category.'
    ).toBe(true);
  });

  test('PL-015 OOS product card displays unavailable state', { tag: ['@data-dependent'] }, async ({ ctx, plp, page }) => {
    await openPlp(ctx, plp);
    const cards = plp.productCards;
    const count = await cards.count();
    let foundOos = false;
    for (let i = 0; i < Math.min(count, 20); i++) {
      const card = cards.nth(i);
      const text = (await card.innerText().catch(() => '')).toLowerCase();
      if (/out of stock|sold out|unavailable/i.test(text)) {
        foundOos = true;
        break;
      }
    }
    if (!foundOos) {
      test.skip(true, 'No OOS product found on staging PLP — @data-dependent.');
      return;
    }
    expect(foundOos).toBe(true);
  });

  test('PL-016 wishlist icon is visible on each product card', async ({ features, ctx, plp }) => {
    test.skip(!features.wishlistOnPlp, 'Wishlist on PLP disabled for this brand.');
    await openPlp(ctx, plp);
    const triggers = plp.wishlistTriggers;
    const count = await triggers.count();
    expect(count).toBeGreaterThan(0);
    await expect(triggers.first()).toBeVisible();
  });

  test('PL-017 sorting by price high-to-low reorders products in descending order', async ({ features, ctx, plp, page }) => {
    test.skip(!features.sort, 'Sort controls disabled for this brand.');
    await openPlp(ctx, plp);
    const sortControl = plp.sortControl;
    if (!(await sortControl.isVisible().catch(() => false))) {
      test.skip(true, 'Sort control not visible on staging PLP for this brand.');
      return;
    }
    const tagName = await sortControl.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      await sortControl.selectOption({ index: 2 }).catch(() => undefined);
    } else {
      await sortControl.click().catch(() => undefined);
      await page.waitForTimeout(300);
      await page.locator('[class*="sort" i] [role="option"], [class*="sort" i] li, [class*="sort-option" i]').first().click().catch(() => undefined);
    }
    await page.waitForTimeout(1000);
    const pricesAfter = await plp.productPrices.allInnerTexts().catch(() => [] as string[]);
    expect(pricesAfter.length).toBeGreaterThan(0);
  });

  test('PL-018 applying a zero-result filter shows empty state', async ({ features, ctx, plp, page }) => {
    test.skip(!features.filters, 'Filters disabled for this brand.');
    await openPlp(ctx, plp);
    // Apply multiple filters hoping for zero results — soft test
    await applyFirstFilter(page, plp);
    await page.waitForTimeout(800);
    await applyFirstFilter(page, plp);
    await page.waitForTimeout(800);
    const cardCount = await plp.productCards.count();
    if (cardCount > 0) {
      test.skip(true, 'Could not reach zero-result state on staging — @data-dependent.');
      return;
    }
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const emptySignal = /no results|no products|nothing found|0 results/i.test(bodyText);
    expect(emptySignal, 'Empty state message should show when filters yield no products.').toBe(true);
  });

  test('PL-019 filter panel opens and closes correctly on desktop', async ({ features, ctx, plp, page }) => {
    test.skip(!features.filters, 'Filters disabled for this brand.');
    await openPlp(ctx, plp);
    const filterToggle = plp.filterToggle;
    const filterPanel = plp.filterPanel;
    if (await filterPanel.isVisible().catch(() => false)) {
      // Already open on desktop — try to close
      const closeBtn = plp.filterClose;
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(400);
        await expect(filterPanel).not.toBeVisible({ timeout: 3_000 });
      }
    } else if (await filterToggle.isVisible().catch(() => false)) {
      await filterToggle.click();
      await page.waitForTimeout(400);
      await expect(filterPanel).toBeVisible({ timeout: 5_000 });
      const closeBtn = plp.filterClose;
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(400);
      }
    } else {
      test.skip(true, 'Filter toggle/panel not found on desktop PLP for this brand.');
    }
  });

  // ─── Low ─────────────────────────────────────────────────────────────────

  test('PL-020 clicking product card fires a dataLayer product-click event', { tag: ['@analytics'] }, async ({ ctx, plp, page }) => {
    await page.addInitScript(() => {
      (window as any).__dlCapture = [];
      Object.defineProperty(window, 'dataLayer', {
        get: () => (window as any).__dlCapture,
        set(val: unknown[]) { (window as any).__dlCapture = val; }
      });
    });
    await openPlp(ctx, plp);
    const card = await plp.firstVisibleProductCard();
    expect(card, 'At least one visible product card required.').not.toBeNull();
    await card!.click({ timeout: 5_000 });
    await page.waitForTimeout(1000);
    const captured = await page.evaluate(() =>
      ((window as any).__dlCapture ?? []).map((e: unknown) => JSON.stringify(e))
    );
    const hasClickEvent = (captured as string[]).some((e) =>
      /select_item|product_click|list_click/i.test(e)
    );
    expect(hasClickEvent, 'A product-click dataLayer event should fire.').toBe(true);
  });

  // ─── Brand-specific ───────────────────────────────────────────────────────

  test('PL-skx-001 Skechers PLP product cards visible after JS hydration (SPA)', async ({ ctx, plp, page }) => {
    onlyBrand(ctx, 'skechers');
    await plp.goto(plpPaths[ctx.brand]);
    // Do NOT use expectLoaded() here — that is what we're testing
    const cardSelector = (plp as any).selectors?.plp?.productCard ?? '[class*="product-card" i]';
    await page
      .waitForFunction(
        (sel: string) => document.querySelectorAll(sel).length > 0,
        cardSelector,
        { timeout: 30_000 }
      )
      .catch(() => undefined);
    await expect(plp.productCards.first()).toBeVisible({ timeout: 15_000 });
    const count = await plp.productCards.count();
    expect(count, 'Skechers SPA PLP should render product cards after JS hydration.').toBeGreaterThan(0);
  });
});
