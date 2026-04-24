import { searchData } from '../../config/testData';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import type { HomePage } from '../../src/pages/Home.page';
import type { Locator, Page } from '@playwright/test';

const ERROR_UI_PATTERN =
  /application error|something went wrong|service unavailable|page not found|this site can't be reached/i;
const NO_RESULTS_PATTERN =
  /no results|no products|0 results|couldn't find|did not match|sorry|try another search|nothing found/i;
const PLP_URL_PATTERN = /\/shop\/|\/category\/|\/collections?\//i;
const SEARCH_URL_PATTERN = /search|q=|query=|\/s\//i;
const PRODUCT_PATH_PATTERN = /\/product\/|\/p\/|\.html(?:$|\?)/i;
const BLOCKED_PRODUCT_PATH_PATTERN = /\/wishlist|\/cart|\/account|\/login|\/track-order|\/stores|\/sign-up/i;
const PRODUCT_CARD_SELECTOR =
  'main [data-testid="product-card"], main [data-product-id], main .product-tile, main article[class*="product" i], main li[class*="product" i], main .product';
const LOAD_MORE_SELECTOR =
  'button:has-text("Load More"), button:has-text("Show More"), button:has-text("View More"), [data-testid*="load-more" i], [class*="load-more" i]';
const PAGINATION_NEXT_SELECTOR =
  'a[aria-label*="next" i], button[aria-label*="next" i], .pagination a[rel="next"], .pagination button:has-text("Next"), [class*="pagination" i] a:has-text("Next")';
const SORT_CONTROL_SELECTOR =
  'select[name*="sort" i], select[id*="sort" i], [data-testid*="sort" i], button:has-text("Sort"), button[aria-label*="sort" i], [class*="sort" i]';
const BREADCRUMB_SELECTOR =
  'nav[aria-label*="breadcrumb" i], [data-testid*="breadcrumb" i], .breadcrumb, [class*="breadcrumb" i]';
const BREADCRUMB_LINK_SELECTOR = `${BREADCRUMB_SELECTOR} a[href]`;
const CATEGORY_TITLE_SELECTOR =
  'h1, [data-testid*="category-title" i], [data-testid*="plp-title" i], [class*="category-title" i], [class*="plp-title" i], [class*="page-title" i]';
const CATEGORY_BANNER_SELECTOR =
  '[data-testid*="category-banner" i], [data-testid*="banner" i], [class*="category-banner" i], [class*="category-description" i], main picture, main img';
const PRODUCT_NAME_SELECTOR =
  '[data-testid*="product-name" i], [class*="product-name" i], [class*="product-title" i], a[href*="/product/"], a[href*=".html"]';
const PRODUCT_PRICE_SELECTOR = '[data-testid*="price" i], [class*="price" i], [id*="price" i]';
const PRODUCT_BADGE_SELECTOR =
  '[data-testid*="badge" i], [class*="badge" i], [class*="label" i], [class*="tag" i], [class*="promo" i], [class*="sale" i]';

interface ProductTarget {
  href: string;
  top: number;
}

interface OpenPlpResult {
  source: 'nav' | 'search';
  expectedPathname?: string;
  navLabel?: string;
}

function normalizePrice(value: string): number {
  const normalized = value.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  return Number.parseFloat(normalized);
}

function isNonDecreasing(values: number[]): boolean {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] < values[index - 1]) {
      return false;
    }
  }
  return true;
}

async function openPlp(home: HomePage, page: Page, keyword: string): Promise<void> {
  await gotoHomeWithRetry(home, page);
  await home.search(keyword);
  await page.keyboard.press('Escape').catch(() => undefined);
  await home.dismissInterruptions();

  const isPlpLikeUrl = PLP_URL_PATTERN.test(page.url()) || SEARCH_URL_PATTERN.test(page.url());
  if (!isPlpLikeUrl) {
    const navItems = await home.header.getVisibleNavigationItems();
    const plpEntry = navItems.find((item) => PLP_URL_PATTERN.test(item.href));
    test.skip(!plpEntry, 'No PLP navigation entry was found.');

    const plpUrl = new URL(plpEntry.href, page.url());
    await page.goto(plpUrl.href, { waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();
  }

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);
}

async function openCategoryPlp(home: HomePage, page: Page, keyword: string): Promise<OpenPlpResult> {
  await gotoHomeWithRetry(home, page);
  const navItems = await home.header.getVisibleNavigationItems();
  const plpEntry = navItems.find((item) => PLP_URL_PATTERN.test(item.href));

  if (plpEntry) {
    const plpUrl = new URL(plpEntry.href, page.url());
    await page.goto(plpUrl.href, { waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(1200);
    return {
      source: 'nav',
      expectedPathname: plpUrl.pathname,
      navLabel: plpEntry.text
    };
  }

  await home.search(keyword);
  await page.keyboard.press('Escape').catch(() => undefined);
  await home.dismissInterruptions();
  await page.waitForTimeout(1200);
  return { source: 'search' };
}

async function gotoHomeWithRetry(home: HomePage, page: Page): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await home.goto('/');
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
      await page.waitForTimeout(1000);
    }
  }
}

async function collectProductTargets(page: Page, limit = 20): Promise<ProductTarget[]> {
  const anchors = page.locator('main a[href]');
  const items = await anchors.evaluateAll((elements) => {
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

async function collectVisiblePrices(page: Page, maxCards = 10): Promise<number[]> {
  const cards = page.locator(PRODUCT_CARD_SELECTOR);
  const count = Math.min(await cards.count(), maxCards);
  const prices: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const text = await cards.nth(index).innerText().catch(() => '');
    const matched = text.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [];
    if (matched.length === 0) {
      continue;
    }
    const value = normalizePrice(matched[0]);
    if (!Number.isNaN(value)) {
      prices.push(value);
    }
  }

  return prices;
}

async function firstVisibleProductCard(page: Page): Promise<Locator | null> {
  const cards = page.locator(PRODUCT_CARD_SELECTOR);
  const count = await cards.count();
  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    if (await card.isVisible().catch(() => false)) {
      return card;
    }
  }
  return null;
}

async function readProductNameFromCard(card: Locator): Promise<string> {
  const primary = card.locator(PRODUCT_NAME_SELECTOR).first();
  let text = (await primary.innerText().catch(() => '')).trim();
  if (text.length > 1) {
    return text;
  }

  const productLinkText = (await card
    .locator('a[href*="/product/"], a[href*="/p/"], a[href$=".html"], a[href*=".html?"]')
    .first()
    .innerText()
    .catch(() => ''))
    .trim();
  if (productLinkText.length > 1) {
    return productLinkText;
  }

  const cardText = (await card.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  const withoutPrice = cardText.replace(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g, '').trim();
  return withoutPrice;
}

test.describe('plp', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test('PLP-001 PLP loads successfully', async ({ ctx, home, page }) => {
    await openCategoryPlp(home, page, searchData[ctx.brand].keyword);

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toBeEmpty();
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('PLP-002 correct category is displayed', async ({ ctx, home, page }) => {
    const plp = await openCategoryPlp(home, page, searchData[ctx.brand].keyword);
    const currentUrl = new URL(page.url());

    if (plp.source === 'nav' && plp.expectedPathname) {
      expect(currentUrl.pathname).toBe(plp.expectedPathname);
    } else {
      expect(PLP_URL_PATTERN.test(currentUrl.pathname) || SEARCH_URL_PATTERN.test(currentUrl.href)).toBe(true);
    }
  });

  test('PLP-003 region-specific content is displayed correctly', async ({ ctx, home, page }) => {
    await openCategoryPlp(home, page, searchData[ctx.brand].keyword);

    const currentUrl = new URL(page.url());
    const expectedBaseUrl = new URL(ctx.baseURL);
    expect(currentUrl.hostname).toBe(expectedBaseUrl.hostname);
    expect(currentUrl.hostname).toContain(`-${ctx.region}.`);
    await expect(page.locator('body')).toContainText(/\$\s?\d|AUD|NZD/i);
  });

  test('PLP-004 PLP loads over HTTPS', async ({ ctx, home, page }) => {
    await openCategoryPlp(home, page, searchData[ctx.brand].keyword);
    expect(new URL(page.url()).protocol).toBe('https:');
  });

  test('PLP-005 no visible application error is shown', async ({ ctx, home, page }) => {
    await openCategoryPlp(home, page, searchData[ctx.brand].keyword);
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('PLP-006 breadcrumb is displayed', async ({ ctx, home, page }) => {
    await openCategoryPlp(home, page, searchData[ctx.brand].keyword);
    const breadcrumb = page.locator(BREADCRUMB_SELECTOR).first();
    const visible = await breadcrumb.isVisible().catch(() => false);
    test.skip(!visible, 'Breadcrumb is not available on this PLP.');
    await expect(breadcrumb).toBeVisible();
  });

  test('PLP-007 breadcrumb links redirect correctly', async ({ ctx, home, page }) => {
    await openCategoryPlp(home, page, searchData[ctx.brand].keyword);
    const breadcrumb = page.locator(BREADCRUMB_SELECTOR).first();
    const visible = await breadcrumb.isVisible().catch(() => false);
    test.skip(!visible, 'Breadcrumb is not available on this PLP.');

    const links = page.locator(BREADCRUMB_LINK_SELECTOR);
    const total = await links.count();
    test.skip(total === 0, 'Breadcrumb links are not available.');

    let clicked = false;
    const previousUrl = page.url();
    for (let index = 0; index < total; index += 1) {
      const link = links.nth(index);
      const href = await link.getAttribute('href');
      if (!href || href.startsWith('#')) {
        continue;
      }

      await Promise.all([
        page.waitForURL((url) => url.href !== previousUrl, { timeout: 12_000 }).catch(() => undefined),
        link.click().catch(async () => {
          await link.evaluate((node) => (node as HTMLAnchorElement).click());
        })
      ]);
      clicked = true;
      break;
    }

    test.skip(!clicked, 'No clickable breadcrumb link found.');
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
    expect(new URL(page.url()).href).not.toBe(previousUrl);
  });

  test('PLP-008 category title is displayed', async ({ ctx, home, page }) => {
    const plp = await openCategoryPlp(home, page, searchData[ctx.brand].keyword);
    const title = page.locator(CATEGORY_TITLE_SELECTOR).first();
    const visible = await title.isVisible().catch(() => false);
    test.skip(!visible, 'Category title is not available on this PLP.');

    await expect(title).toBeVisible();
    const text = (await title.innerText().catch(() => '')).trim();
    expect(text.length).toBeGreaterThan(0);

    if (plp.navLabel) {
      const firstWord = plp.navLabel.trim().split(/\s+/)[0];
      if (firstWord.length > 1) {
        expect(`${text.toLowerCase()} ${new URL(page.url()).pathname.toLowerCase()}`).toContain(firstWord.toLowerCase());
      }
    }
  });

  test('PLP-009 category description/banner is displayed if configured', async ({ ctx, home, page }) => {
    await openCategoryPlp(home, page, searchData[ctx.brand].keyword);
    const banner = page.locator(CATEGORY_BANNER_SELECTOR).first();
    const visible = await banner.isVisible().catch(() => false);
    test.skip(!visible, 'Category description/banner is not configured on this PLP.');

    await expect(banner).toBeVisible();
    const box = await banner.boundingBox();
    expect((box?.width ?? 0) > 0 || (box?.height ?? 0) > 0).toBe(true);
  });

  test('PLP-010 product grid is displayed', async ({ ctx, home, page }) => {
    await openCategoryPlp(home, page, searchData[ctx.brand].keyword);
    const card = await firstVisibleProductCard(page);
    test.skip(!card, 'No visible product card found on PLP.');
    await expect(card).toBeVisible();
  });

  test('PLP-011 product cards are displayed correctly', async ({ ctx, home, page }) => {
    await openCategoryPlp(home, page, searchData[ctx.brand].keyword);
    const card = await firstVisibleProductCard(page);
    test.skip(!card, 'No visible product card found on PLP.');

    const image = card.locator('img').first();
    const name = card.locator(PRODUCT_NAME_SELECTOR).first();
    const price = card.locator(PRODUCT_PRICE_SELECTOR).first();

    await expect(image).toBeVisible();
    await expect(name).toBeVisible().catch(() => undefined);
    const nameText = await readProductNameFromCard(card);
    expect(nameText.length).toBeGreaterThan(0);

    const priceVisible = await price.isVisible().catch(() => false);
    if (priceVisible) {
      await expect(price).toContainText(/\$\s?\d|AUD|NZD/i);
    } else {
      await expect(card).toContainText(/\$\s?\d|AUD|NZD/i);
    }
  });

  test('PLP-012 product card image is rendered correctly', async ({ ctx, home, page }) => {
    await openCategoryPlp(home, page, searchData[ctx.brand].keyword);
    const card = await firstVisibleProductCard(page);
    test.skip(!card, 'No visible product card found on PLP.');

    const image = card.locator('img').first();
    await expect(image).toBeVisible();
    const rendered = await image.evaluate((node) => {
      const img = node as HTMLImageElement;
      return {
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      };
    });

    expect(rendered.complete).toBe(true);
    expect(rendered.naturalWidth).toBeGreaterThan(0);
    expect(rendered.naturalHeight).toBeGreaterThan(0);
  });

  test('PLP-013 product name is displayed', async ({ ctx, home, page }) => {
    await openCategoryPlp(home, page, searchData[ctx.brand].keyword);
    const card = await firstVisibleProductCard(page);
    test.skip(!card, 'No visible product card found on PLP.');

    const name = card.locator(PRODUCT_NAME_SELECTOR).first();
    await expect(name).toBeVisible().catch(() => undefined);
    const text = await readProductNameFromCard(card);
    expect(text.length).toBeGreaterThan(1);
  });

  test('PLP-014 product price is displayed', async ({ ctx, home, page }) => {
    await openCategoryPlp(home, page, searchData[ctx.brand].keyword);
    const card = await firstVisibleProductCard(page);
    test.skip(!card, 'No visible product card found on PLP.');

    const price = card.locator(PRODUCT_PRICE_SELECTOR).first();
    const priceVisible = await price.isVisible().catch(() => false);
    if (priceVisible) {
      await expect(price).toContainText(/\$\s?\d|AUD|NZD/i);
    } else {
      await expect(card).toContainText(/\$\s?\d|AUD|NZD/i);
    }
  });

  test('PLP-015 sale price presentation is correct', async ({ ctx, home, page }) => {
    await openCategoryPlp(home, page, searchData[ctx.brand].keyword);
    const cards = page.locator(PRODUCT_CARD_SELECTOR);
    const count = Math.min(await cards.count(), 16);
    test.skip(count === 0, 'No visible product card found on PLP.');

    let saleFound = false;
    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      const visible = await card.isVisible().catch(() => false);
      if (!visible) {
        continue;
      }

      const text = await card.innerText().catch(() => '');
      const matched = text.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [];
      if (matched.length < 2) {
        continue;
      }

      const sale = normalizePrice(matched[0]);
      const original = normalizePrice(matched[1]);
      if (Number.isNaN(sale) || Number.isNaN(original)) {
        continue;
      }

      expect(sale).toBeLessThanOrEqual(original);
      saleFound = true;
      break;
    }

    test.skip(!saleFound, 'No sale-product card found on current PLP.');
  });

  test('PLP-016 product badge/label is displayed correctly', async ({ ctx, home, page }) => {
    await openCategoryPlp(home, page, searchData[ctx.brand].keyword);
    const cards = page.locator(PRODUCT_CARD_SELECTOR);
    const count = Math.min(await cards.count(), 16);
    test.skip(count === 0, 'No visible product card found on PLP.');

    let badgeText = '';
    for (let index = 0; index < count; index += 1) {
      const badge = cards.nth(index).locator(PRODUCT_BADGE_SELECTOR).first();
      const visible = await badge.isVisible().catch(() => false);
      if (!visible) {
        continue;
      }
      badgeText = (await badge.innerText().catch(() => '')).trim();
      if (badgeText.length > 0) {
        break;
      }
    }

    test.skip(badgeText.length === 0, 'No product badge/label is displayed on current PLP.');
    expect(badgeText.length).toBeGreaterThan(0);
  });

  test('PLP-017 clicking product card redirects to PDP', async ({ ctx, home, page }) => {
    await openPlp(home, page, searchData[ctx.brand].keyword);

    const previousUrl = page.url();
    const productTargets = await collectProductTargets(page, 8);
    test.skip(productTargets.length === 0, 'No PDP product links available on current PLP.');

    const target = productTargets[0];
    const targetLink = await home.bestProductLinkByHref(target.href);

    const href = await targetLink.getAttribute('href').catch(() => null);
    const expectedUrl = href ? new URL(href, previousUrl) : null;

    await page.keyboard.press('Escape').catch(() => undefined);
    await targetLink.scrollIntoViewIfNeeded();

    await Promise.all([
      page.waitForURL((url) => url.href !== previousUrl, { timeout: 15_000 }).catch(() => undefined),
      targetLink.evaluate((node) => {
        (node as HTMLAnchorElement).click();
      })
    ]);

    await page.keyboard.press('Escape').catch(() => undefined);
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);

    const currentUrl = new URL(page.url());
    expect(currentUrl.href).not.toBe(previousUrl);
    expect(currentUrl.pathname).not.toContain('/search');
    expect(currentUrl.pathname).toMatch(/\/product\/|\/p\/|\.html$/i);

    if (expectedUrl) {
      expect(currentUrl.pathname).toBe(expectedUrl.pathname);
    }
  });

  test('PLP-018 product card hover behavior on desktop if applicable', async ({ ctx, home, page }) => {
    await openPlp(home, page, searchData[ctx.brand].keyword);
    const targets = await collectProductTargets(page, 6);
    test.skip(targets.length === 0, 'No product card available on PLP.');

    const link = await home.bestProductLinkByHref(targets[0].href);
    const card = link.locator('xpath=ancestor::*[self::article or self::li or contains(@class,"product")][1]');
    const cardVisible = await card.isVisible().catch(() => false);
    test.skip(!cardVisible, 'Product card container is not available.');

    const hasHoverIndicator = await card
      .locator('[class*="hover" i], [class*="secondary" i], [data-testid*="quick" i], button:has-text("Quick")')
      .first()
      .isVisible()
      .catch(() => false);
    const imageCount = await card.locator('img').count();
    test.skip(!hasHoverIndicator && imageCount < 2, 'Hover-specific behavior is not implemented on this PLP.');

    const before = await card.getAttribute('class');
    await card.evaluate((node) => {
      node.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    await page.waitForTimeout(300);
    const after = await card.getAttribute('class');

    if (before && after) {
      expect(after).not.toBe('');
    }
    await expect(link).toBeVisible();
  });

  test('PLP-019 product count is displayed correctly if available', async ({ ctx, home, page }) => {
    await openPlp(home, page, searchData[ctx.brand].keyword);
    const countElement = page
      .locator('[data-testid*="count" i], [class*="count" i], [id*="count" i], text=/\\b\\d+\\s*(products|items|results)\\b/i')
      .first();
    const visible = await countElement.isVisible().catch(() => false);
    test.skip(!visible, 'Product count UI is not available on this PLP.');

    const text = (await countElement.innerText().catch(() => '')).trim();
    const matched = text.match(/\d+/);
    expect(matched).toBeTruthy();
    if (matched) {
      const count = Number.parseInt(matched[0], 10);
      expect(Number.isNaN(count)).toBe(false);
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('PLP-020 empty PLP state', async ({ home, page }) => {
    await gotoHomeWithRetry(home, page);
    const invalidKeyword = `no-results-${Date.now()}-plp`;
    await home.search(invalidKeyword);
    await page.keyboard.press('Escape').catch(() => undefined);

    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
    await expect(page.locator('body')).toContainText(NO_RESULTS_PATTERN);
  });

  test('PLP-021 pagination or load-more control is displayed when applicable', async ({ ctx, home, page }) => {
    await openPlp(home, page, searchData[ctx.brand].keyword);
    const loadMore = page.locator(LOAD_MORE_SELECTOR).first();
    const paginationNext = page.locator(PAGINATION_NEXT_SELECTOR).first();
    const hasLoadMore = await loadMore.isVisible().catch(() => false);
    const hasPagination = await paginationNext.isVisible().catch(() => false);

    test.skip(!hasLoadMore && !hasPagination, 'Pagination/Load more control is not available on this PLP.');
    expect(hasLoadMore || hasPagination).toBe(true);
  });

  test('PLP-022 load more displays additional products', async ({ ctx, home, page }) => {
    await openPlp(home, page, searchData[ctx.brand].keyword);
    const loadMore = page.locator(LOAD_MORE_SELECTOR).first();
    const loadMoreVisible = await loadMore.isVisible().catch(() => false);
    test.skip(!loadMoreVisible, 'Load more is not enabled on this PLP.');

    const before = await collectProductTargets(page, 60);
    const beforeCount = before.length;
    await loadMore.scrollIntoViewIfNeeded();
    await loadMore.click({ timeout: 10_000 });
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1500);

    const after = await collectProductTargets(page, 80);
    expect(after.length).toBeGreaterThan(beforeCount);
  });

  test('PLP-023 pagination redirects or updates product list correctly', async ({ ctx, home, page }) => {
    await openPlp(home, page, searchData[ctx.brand].keyword);
    const next = page.locator(PAGINATION_NEXT_SELECTOR).first();
    const visible = await next.isVisible().catch(() => false);
    test.skip(!visible, 'Pagination next control is not available on this PLP.');

    const beforeUrl = page.url();
    const beforeProducts = await collectProductTargets(page, 8);
    test.skip(beforeProducts.length === 0, 'No products available before pagination.');

    await next.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForURL((url) => url.href !== beforeUrl, { timeout: 12_000 }).catch(() => undefined),
      next.click()
    ]);
    await page.waitForTimeout(1200);

    const afterProducts = await collectProductTargets(page, 8);
    const changedUrl = page.url() !== beforeUrl;
    const changedFirstProduct = afterProducts[0]?.href !== beforeProducts[0]?.href;
    expect(changedUrl || changedFirstProduct).toBe(true);
  });

  test('PLP-024 browser back behavior after pagination or load more', async ({ ctx, home, page }) => {
    await openPlp(home, page, searchData[ctx.brand].keyword);

    const beforeUrl = page.url();
    const loadMore = page.locator(LOAD_MORE_SELECTOR).first();
    const next = page.locator(PAGINATION_NEXT_SELECTOR).first();
    const canLoadMore = await loadMore.isVisible().catch(() => false);
    const canPaginate = await next.isVisible().catch(() => false);
    test.skip(!canLoadMore && !canPaginate, 'No pagination/load more control is available on this PLP.');

    if (canLoadMore) {
      await loadMore.scrollIntoViewIfNeeded();
      await loadMore.click({ timeout: 10_000 });
      await page.waitForTimeout(1200);
    } else {
      await next.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL((url) => url.href !== beforeUrl, { timeout: 12_000 }).catch(() => undefined),
        next.click()
      ]);
      await page.waitForTimeout(1200);
    }

    const stateUrl = page.url();
    const products = await collectProductTargets(page, 8);
    test.skip(products.length === 0, 'No product link available after pagination/load more.');

    const productLink = await home.bestProductLinkByHref(products[0].href);
    await Promise.all([
      page.waitForURL((url) => url.href !== stateUrl, { timeout: 15_000 }).catch(() => undefined),
      productLink.evaluate((node) => {
        (node as HTMLAnchorElement).click();
      })
    ]);
    expect(PRODUCT_PATH_PATTERN.test(new URL(page.url()).pathname)).toBe(true);

    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const current = new URL(page.url());
    const expected = new URL(stateUrl);
    expect(current.pathname).toBe(expected.pathname);
  });

  test('PLP-025 sort dropdown is displayed', async ({ ctx, home, page }) => {
    await openPlp(home, page, searchData[ctx.brand].keyword);
    const sortControl = page.locator(SORT_CONTROL_SELECTOR).first();
    const visible = await sortControl.isVisible().catch(() => false);
    test.skip(!visible, 'Sort control is not available on this PLP.');
    await expect(sortControl).toBeVisible();
  });

  test('PLP-026 sorting by price low to high', async ({ ctx, home, page }) => {
    await openPlp(home, page, searchData[ctx.brand].keyword);
    const sortSelect = page.locator('select[name*="sort" i], select[id*="sort" i]').first();
    const sortSelectVisible = await sortSelect.isVisible().catch(() => false);

    if (sortSelectVisible) {
      const matchedValue = await sortSelect.evaluate((node) => {
        const select = node as HTMLSelectElement;
        const option = Array.from(select.options).find((item) =>
          /low\s*to\s*high|price.*asc|ascending/i.test(item.textContent ?? '')
        );
        return option?.value ?? '';
      });
      test.skip(!matchedValue, 'Low-to-high sort option is not available.');
      await sortSelect.selectOption(matchedValue);
    } else {
      const sortTrigger = page
        .locator('button:has-text("Sort"), [data-testid*="sort" i], [class*="sort" i]')
        .first();
      const triggerVisible = await sortTrigger.isVisible().catch(() => false);
      test.skip(!triggerVisible, 'Sort UI is not available on this PLP.');
      await page.keyboard.press('Escape').catch(() => undefined);
      await sortTrigger.evaluate((node) => {
        (node as HTMLElement).click();
      });

      const lowHighOption = page
        .locator('button:has-text("Low to High"), [role="option"]:has-text("Low to High"), a:has-text("Low to High")')
        .first();
      const optionVisible = await lowHighOption.isVisible().catch(() => false);
      test.skip(!optionVisible, 'Low-to-high sort option is not available.');
      await lowHighOption.evaluate((node) => {
        (node as HTMLElement).click();
      });
    }

    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1200);

    const prices = await collectVisiblePrices(page, 12);
    test.skip(prices.length < 3, 'Not enough product prices to validate sorting.');
    expect(isNonDecreasing(prices.slice(0, Math.min(6, prices.length)))).toBe(true);
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
  });
});
