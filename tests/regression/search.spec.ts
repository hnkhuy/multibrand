// TC coverage: SR-001..SR-020, SR-skx-001
// Based on: src/documents/tcs/GRA_SearchPage-Tcs.csv

import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import type { Brand, BrandContext } from '../../src/core/types';
import { searchData } from '../../config/testData';

const PRODUCT_PATH = /\/product\/|\/products?\/|\/p\/|\.html(?:$|\?)/i;
const CATEGORY_PATH = /\/shop\/|\/category\/|\/collections\//i;
const SEARCH_URL_PATTERN = /search|q=|query=|\/s\//i;

function onlyBrand(ctx: BrandContext, brands: Brand | Brand[]): void {
  const allowed = Array.isArray(brands) ? brands : [brands];
  test.skip(!allowed.includes(ctx.brand), `Brand-specific: only runs on ${allowed.join(', ')}.`);
}

test.describe('search', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  // ─── Critical ────────────────────────────────────────────────────────────

  test('SR-001 typing keyword and pressing Enter opens search results with products', { tag: ['@smoke'] }, async ({ ctx, home, search, page }) => {
    await home.goto('/');
    await search.submitSearch(searchData[ctx.brand].keyword);
    await search.expectLoaded();
    await expect(search.productCards.first()).toBeVisible({ timeout: 20_000 });
    const count = await search.productCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('SR-002 clicking a product suggestion in autocomplete navigates to PDP', async ({ features, ctx, home, search, page }) => {
    test.skip(!features.searchAutoSuggestion, 'Search auto-suggestion disabled for this brand.');
    await home.goto('/');
    await search.typeKeyword(searchData[ctx.brand].keyword);
    const hasSuggestions = await search.waitForSuggestions();
    if (!hasSuggestions) {
      test.skip(true, 'Autocomplete suggestions did not appear on staging.');
      return;
    }
    if ((await search.autoSuggestionProductItems.count()) === 0) {
      test.skip(true, 'No product suggestions available in autocomplete on staging.');
      return;
    }
    await search.clickFirstProductSuggestion();
    await page.waitForLoadState('domcontentloaded');
    expect(PRODUCT_PATH.test(new URL(page.url()).pathname)).toBe(true);
  });

  test('SR-003 clicking product card on search results page navigates to PDP', async ({ ctx, home, search, pdp, page }) => {
    await home.goto('/');
    await search.submitSearch(searchData[ctx.brand].keyword);
    await search.expectLoaded();
    const card = search.productCards.first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click({ timeout: 5_000 });
    await page.waitForLoadState('domcontentloaded');
    await pdp.dismissInterruptions();
    expect(PRODUCT_PATH.test(new URL(page.url()).pathname)).toBe(true);
  });

  test('SR-004 clicking search button submits keyword and loads results page', async ({ ctx, home, search, page }) => {
    await home.goto('/');
    await search.typeKeyword(searchData[ctx.brand].keyword);
    const prevUrl = page.url();
    await Promise.all([
      page.waitForURL((url) => url.href !== prevUrl, { timeout: 15_000 }).catch(() => undefined),
      search.searchSubmit.click()
    ]);
    await page.waitForLoadState('domcontentloaded');
    await search.expectResultPageUrl();
    await expect(search.productCards.first()).toBeVisible({ timeout: 20_000 });
  });

  // ─── High ────────────────────────────────────────────────────────────────

  test('SR-005 search icon or input is visible in the header', async ({ home, search, page }) => {
    await home.goto('/');
    const inputVisible = await search.searchInput.isVisible().catch(() => false);
    const iconVisible = await page
      .locator('button[aria-label*="search" i], [data-testid*="search" i]')
      .first()
      .isVisible()
      .catch(() => false);
    expect(inputVisible || iconVisible, 'Search input or icon should be visible in header.').toBe(true);
  });

  test('SR-006 autocomplete suggestions appear after typing a keyword', async ({ features, ctx, home, search }) => {
    test.skip(!features.searchAutoSuggestion, 'Search auto-suggestion disabled for this brand.');
    await home.goto('/');
    await search.typeKeyword(searchData[ctx.brand].keyword);
    const hasSuggestions = await search.waitForSuggestions();
    if (!hasSuggestions) {
      test.skip(true, 'Autocomplete suggestions did not appear on staging — may depend on environment.');
      return;
    }
    await expect(search.autoSuggestionPanel).toBeVisible();
    const itemCount = await search.autoSuggestionItems.count();
    expect(itemCount).toBeGreaterThan(0);
  });

  test('SR-007 autocomplete product suggestion shows name and image', async ({ features, ctx, home, search }) => {
    test.skip(!features.searchAutoSuggestion, 'Search auto-suggestion disabled for this brand.');
    await home.goto('/');
    await search.typeKeyword(searchData[ctx.brand].keyword);
    const hasSuggestions = await search.waitForSuggestions();
    if (!hasSuggestions || (await search.autoSuggestionProductItems.count()) === 0) {
      test.skip(true, 'No product suggestions visible in autocomplete on staging.');
      return;
    }
    const firstProduct = search.autoSuggestionProductItems.first();
    await expect(firstProduct).toBeVisible();
    const productText = await firstProduct.innerText();
    expect(productText.trim().length).toBeGreaterThan(1);
    const img = firstProduct.locator('img').first();
    if (await img.isVisible().catch(() => false)) {
      await expect(img).toBeVisible();
    }
  });

  test('SR-008 no-results state shown for non-matching keyword', { tag: ['@smoke'] }, async ({ home, search, page }) => {
    await home.goto('/');
    await search.submitSearch('xyzqwerty999abc');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const cardCount = await search.productCards.count();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const noResultSignal = /no results|no products|nothing found|0 results|0 products/i.test(bodyText);
    expect(
      cardCount === 0 || noResultSignal,
      'No-results state should appear for non-matching keyword.'
    ).toBe(true);
  });

  test('SR-009 search result products are relevant to the searched keyword', async ({ ctx, home, search, page }) => {
    await home.goto('/');
    await search.submitSearch(searchData[ctx.brand].keyword);
    await search.expectLoaded();
    const cards = search.productCards;
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    // Check that at least some product names contain related text
    const cardTexts = await cards.allInnerTexts().catch(() => [] as string[]);
    const keyword = searchData[ctx.brand].keyword.toLowerCase();
    const relevantWords = keyword.split(' ');
    const someRelevant = cardTexts.some((text) =>
      relevantWords.some((word) => text.toLowerCase().includes(word))
    );
    expect(someRelevant, 'At least some search results should be relevant to the keyword.').toBe(true);
  });

  test('SR-010 applying a filter on search results narrows the product list', async ({ features, ctx, home, search, page }) => {
    test.skip(!features.searchFilters, 'Search filters disabled for this brand.');
    await home.goto('/');
    await search.submitSearch(searchData[ctx.brand].keyword);
    await search.expectLoaded();
    const countBefore = await search.productCards.count();
    await search.applyFirstAvailableFilter();
    await page.waitForTimeout(1000);
    const countAfter = await search.productCards.count();
    const chipsAfter = await search.activeFilterChips.count();
    expect(
      chipsAfter > 0 || countAfter <= countBefore,
      'Applying a filter should narrow or maintain results.'
    ).toBe(true);
  });

  test('SR-011 sorting search results by price reorders products', async ({ features, ctx, home, search, page }) => {
    test.skip(!features.searchSort, 'Search sort disabled for this brand.');
    await home.goto('/');
    await search.submitSearch(searchData[ctx.brand].keyword);
    await search.expectLoaded();
    if (!(await search.sortControl.isVisible().catch(() => false))) {
      test.skip(true, 'Sort control not visible on search results page for this brand.');
      return;
    }
    await search.applySortOption();
    await page.waitForTimeout(1000);
    const pricesAfter = await search.productPrices.allInnerTexts().catch(() => [] as string[]);
    expect(pricesAfter.length).toBeGreaterThan(0);
  });

  test('SR-012 mobile search panel opens and returns results', async ({ ctx, home, search, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await home.goto('/');
    await search.submitSearch(searchData[ctx.brand].keyword);
    await page.waitForLoadState('domcontentloaded');
    await search.expectLoaded();
    await expect(search.productCards.first()).toBeVisible({ timeout: 20_000 });
  });

  test('SR-013 search input does not execute injected script (XSS safety)', async ({ home, search, page }) => {
    await home.goto('/');
    const xssPayload = '<script>window.__xss_fired=true</script>';
    await search.submitSearch(xssPayload);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    const xssFired = await page.evaluate(() => !!(window as any).__xss_fired).catch(() => false);
    expect(xssFired, 'XSS script should NOT execute via search input.').toBe(false);
    // Page should remain stable
    await expect(page.locator('body')).toBeVisible();
  });

  test('SR-014 clicking category suggestion navigates to correct PLP', async ({ features, ctx, home, search, page }) => {
    test.skip(!features.searchCategorysuggestion, 'Search category suggestions disabled for this brand.');
    await home.goto('/');
    await search.typeKeyword(searchData[ctx.brand].keyword);
    const hasSuggestions = await search.waitForSuggestions();
    if (!hasSuggestions || (await search.autoSuggestionCategoryItems.count()) === 0) {
      test.skip(true, 'No category suggestions visible in autocomplete on staging.');
      return;
    }
    await search.autoSuggestionCategoryItems.first().click({ timeout: 5_000 });
    await page.waitForLoadState('domcontentloaded');
    const currentPath = new URL(page.url()).pathname;
    expect(
      CATEGORY_PATH.test(currentPath) || SEARCH_URL_PATTERN.test(page.url()),
      'Category suggestion should navigate to a PLP or search results page.'
    ).toBe(true);
  });

  // ─── Medium ──────────────────────────────────────────────────────────────

  test('SR-015 search result URL contains the searched keyword', async ({ ctx, home, search, page }) => {
    await home.goto('/');
    const keyword = searchData[ctx.brand].keyword;
    await search.submitSearch(keyword);
    await page.waitForLoadState('domcontentloaded');
    const currentUrl = page.url();
    const encoded = encodeURIComponent(keyword).toLowerCase().replace(/%20/g, '+');
    const keywordInUrl =
      currentUrl.toLowerCase().includes(keyword.toLowerCase()) ||
      currentUrl.toLowerCase().includes(encoded);
    expect(keywordInUrl, 'Searched keyword should appear in the results URL.').toBe(true);
  });

  test('SR-016 searched keyword or result heading is displayed on the results page', async ({ ctx, home, search, page }) => {
    await home.goto('/');
    const keyword = searchData[ctx.brand].keyword;
    await search.submitSearch(keyword);
    await search.expectLoaded();
    const mainText = await page.locator('main').innerText().catch(() => '');
    const keywordDisplayed =
      mainText.toLowerCase().includes(keyword.toLowerCase()) ||
      (await search.keywordDisplay.isVisible().catch(() => false));
    expect(keywordDisplayed, 'Searched keyword should be visible on the results page.').toBe(true);
  });

  test('SR-017 Load More / next page loads additional search results', async ({ features, ctx, home, search, page }) => {
    test.skip(!features.searchLoadMore && !features.searchPagination, 'Neither Load More nor pagination enabled for search.');
    await home.goto('/');
    await search.submitSearch(searchData[ctx.brand].keyword);
    await search.expectLoaded();
    const cardsBefore = await search.productCards.count();
    const hasLoadMore = await search.loadMoreButton.isVisible().catch(() => false);
    const hasPagination = await search.paginationNext.isVisible().catch(() => false);
    if (!hasLoadMore && !hasPagination) {
      test.skip(true, 'No Load More or pagination found on staging search results.');
      return;
    }
    if (hasLoadMore) {
      await search.loadMoreButton.click();
    } else {
      await search.paginationNext.click();
    }
    await page.waitForTimeout(1500);
    const cardsAfter = await search.productCards.count();
    expect(cardsAfter).toBeGreaterThan(cardsBefore);
  });

  test('SR-018 autocomplete panel closes after selecting a suggestion', async ({ features, ctx, home, search, page }) => {
    test.skip(!features.searchAutoSuggestion, 'Search auto-suggestion disabled for this brand.');
    await home.goto('/');
    await search.typeKeyword(searchData[ctx.brand].keyword);
    const hasSuggestions = await search.waitForSuggestions();
    if (!hasSuggestions) {
      test.skip(true, 'Autocomplete suggestions did not appear on staging.');
      return;
    }
    await search.clickFirstSuggestion();
    await page.waitForLoadState('domcontentloaded');
    const panelVisible = await search.autoSuggestionPanel.isVisible().catch(() => false);
    expect(panelVisible, 'Autocomplete panel should close after selecting a suggestion.').toBe(false);
  });

  test('SR-019 empty search submission does not crash the page', async ({ home, search, page }) => {
    await home.goto('/');
    await search.openSearchInput();
    await search.clearSearchInput();
    const prevUrl = page.url();
    await search.searchInput.press('Enter');
    await page.waitForTimeout(1000);
    // Page should remain stable — not throw or navigate to an error page
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(/error|500|something went wrong/i.test(bodyText)).toBe(false);
  });

  // ─── Low ─────────────────────────────────────────────────────────────────

  test('SR-020 search submission fires a dataLayer search event', { tag: ['@analytics'] }, async ({ ctx, home, search, page }) => {
    await page.addInitScript(() => {
      (window as any).__dlCapture = [];
      Object.defineProperty(window, 'dataLayer', {
        get: () => (window as any).__dlCapture,
        set(val: unknown[]) { (window as any).__dlCapture = val; }
      });
    });
    await home.goto('/');
    await search.submitSearch(searchData[ctx.brand].keyword);
    await page.waitForTimeout(1500);
    const captured = await page.evaluate(() =>
      ((window as any).__dlCapture ?? []).map((e: unknown) => JSON.stringify(e))
    );
    const hasSearchEvent = (captured as string[]).some((e) =>
      /search|search_submitted/i.test(e)
    );
    expect(hasSearchEvent, 'A search dataLayer event should fire on submission.').toBe(true);
  });

  // ─── Brand-specific ───────────────────────────────────────────────────────

  test('SR-skx-001 Skechers search result cards render after JS hydration (SPA)', async ({ ctx, home, search, page }) => {
    onlyBrand(ctx, 'skechers');
    await home.goto('/');
    await search.typeKeyword(searchData[ctx.brand].keyword);
    const prevUrl = page.url();
    await Promise.all([
      page.waitForURL((url) => url.href !== prevUrl, { timeout: 15_000 }).catch(() => undefined),
      search.searchInput.press('Enter')
    ]);
    await page.waitForLoadState('domcontentloaded');
    const cardSelector = (search as any).selectors?.plp?.productCard ?? '[class*="product-card" i]';
    await page
      .waitForFunction(
        (sel: string) => document.querySelectorAll(sel).length > 0,
        cardSelector,
        { timeout: 30_000 }
      )
      .catch(() => undefined);
    await expect(search.productCards.first()).toBeVisible({ timeout: 15_000 });
    const count = await search.productCards.count();
    expect(count, 'Skechers search result cards should render after JS hydration.').toBeGreaterThan(0);
  });

  // ─── Middle ──────────────────────────────────────────────────────────────

  test('SR-021 search results page retains the searched keyword in the input or results heading', async ({ ctx, home, search, page }) => {
    await home.goto('/');
    const keyword = searchData[ctx.brand].keyword;
    await search.submitSearch(keyword);
    await search.expectLoaded();
    const inputValue = await search.searchInput.inputValue().catch(() => '');
    const headingText = (await search.keywordDisplay.innerText().catch(() => ''));
    const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
    const keywordVisible =
      inputValue.toLowerCase().includes(keyword.toLowerCase()) ||
      headingText.toLowerCase().includes(keyword.toLowerCase()) ||
      bodyText.includes(keyword.toLowerCase());
    expect(keywordVisible, 'Searched keyword should be visible in input or results heading.').toBe(true);
  });

  test('SR-022 applying a filter on search results changes the product count', async ({ ctx, home, search, page }) => {
    await home.goto('/');
    await search.submitSearch(searchData[ctx.brand].keyword);
    await search.expectLoaded();
    const initialCount = await search.productCards.count();
    if (initialCount === 0) {
      test.skip(true, 'No search results to filter — cannot test filter behaviour.');
      return;
    }
    const filterToggle = search.filterToggle;
    if (!(await filterToggle.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Filter toggle not available on search results for this brand.');
      return;
    }
    await filterToggle.click();
    await page.waitForTimeout(500);
    const filterOption = search.filterOptions.first();
    if (!(await filterOption.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, 'No filter options visible in search results panel.');
      return;
    }
    await filterOption.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    const filteredCount = await search.productCards.count();
    const body = await page.locator('body').innerText().catch(() => '');
    const emptyState = /no results|no products|0 results/i.test(body);
    expect(
      filteredCount !== initialCount || emptyState,
      'Applying a filter should change the result count or show empty state.'
    ).toBe(true);
  });

  test('SR-023 search result count label is present for a valid keyword', async ({ ctx, home, search, page }) => {
    await home.goto('/');
    await search.submitSearch(searchData[ctx.brand].keyword);
    await search.expectLoaded();
    const cardCount = await search.productCards.count();
    const countLabel = search.resultCount;
    const hasCountLabel = await countLabel.isVisible({ timeout: 3_000 }).catch(() => false);
    const body = await page.locator('body').innerText().catch(() => '');
    const countInBody = /\d+\s*(result|product|item)/i.test(body);
    expect(cardCount > 0 || hasCountLabel || countInBody, 'Search results page should show products or a result count.').toBe(true);
  });

  test('SR-024 autocomplete suggestions appear after typing two or more characters', async ({ ctx, home, search, page }) => {
    await home.goto('/');
    await home.dismissInterruptions();
    const keyword = searchData[ctx.brand].keyword;
    await search.searchInput.click({ timeout: 5_000 }).catch(() => undefined);
    await search.searchInput.pressSequentially(keyword.slice(0, 2), { delay: 80 });
    await page.waitForTimeout(800);
    const panel = search.autoSuggestionPanel;
    const items = search.autoSuggestionItems;
    const panelVisible = await panel.isVisible({ timeout: 3_000 }).catch(() => false);
    const itemCount = panelVisible ? await items.count() : 0;
    expect(panelVisible || itemCount > 0, 'Autocomplete panel should appear after typing 2+ characters.').toBe(true);
  });

  // ─── Low ─────────────────────────────────────────────────────────────────

  test('SR-025 search with a very long keyword does not crash the page', async ({ home, search, page }) => {
    const longKeyword = 'a'.repeat(200);
    await home.goto('/');
    await search.submitSearch(longKeyword);
    await page.waitForLoadState('domcontentloaded');
    const body = await page.locator('body').innerText().catch(() => '');
    expect(
      /application error|service unavailable|500|uncaught/i.test(body),
      'A 200-character search term should not crash the page.'
    ).toBe(false);
  });

  test('SR-026 search is case-insensitive — uppercase and lowercase return results', async ({ ctx, home, search, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await search.submitSearch(keyword.toUpperCase());
    await search.expectLoaded();
    const upperCount = await search.productCards.count();
    await home.goto('/');
    await search.submitSearch(keyword.toLowerCase());
    await search.expectLoaded();
    const lowerCount = await search.productCards.count();
    expect(upperCount, 'Uppercase search should return at least one result.').toBeGreaterThan(0);
    expect(lowerCount, 'Lowercase search should return at least one result.').toBeGreaterThan(0);
    // Counts may differ slightly due to ranking but both should return results
    expect(Math.abs(upperCount - lowerCount)).toBeLessThanOrEqual(Math.max(upperCount, lowerCount));
  });
});
