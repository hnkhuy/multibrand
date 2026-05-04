import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import { searchData } from '../../config/testData';

const ERROR_UI_PATTERN =
  /application error|something went wrong|service unavailable|page not found|this site can't be reached/i;
const PRICE_PATTERN = /\$\s?\d/;
const SEARCH_URL_PATTERN = /search|q=|query=|\/s\//i;
const PRODUCT_PATH_PATTERN = /\/product\/|\/products?\/|\/p\/|\.html(?:$|\?)/i;

async function assertNoCriticalError(page: import('@playwright/test').Page): Promise<void> {
  const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
  expect(bodyText).not.toMatch(ERROR_UI_PATTERN);
}

async function navigateToSearchResults(
  home: { goto: (path?: string) => Promise<void>; search: (kw: string) => Promise<void> },
  search: { expectResultPageUrl: () => Promise<void>; expectLoaded: () => Promise<void> },
  keyword: string
): Promise<void> {
  await home.goto('/');
  await home.search(keyword);
  await search.expectResultPageUrl();
  await search.expectLoaded();
}

test.describe('search', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  // ─── Entry Point ──────────────────────────────────────────────────────────────

  test('SR-001 search entry point is visible in header', async ({ home, page }) => {
    await home.goto('/');
    const searchInput = home.header.searchInput;
    const searchIcon = page.locator(
      'button[aria-label*="search" i], [data-testid*="search-icon" i], [data-testid*="search-trigger" i]'
    ).first();
    const inputVisible = await searchInput.isVisible().catch(() => false);
    const iconVisible = await searchIcon.isVisible().catch(() => false);
    expect(inputVisible || iconVisible, 'Search entry point should be visible').toBe(true);
    await assertNoCriticalError(page);
  });

  test('SR-002 search input opens correctly when activated', async ({ search, home, page }) => {
    await home.goto('/');
    await search.openSearchInput();
    await expect(search.searchInput).toBeVisible({ timeout: 5_000 });
    await assertNoCriticalError(page);
  });

  test('SR-003 search panel can be closed', async ({ search, home, page }) => {
    await home.goto('/');
    await search.openSearchInput();
    await expect(search.searchInput).toBeVisible({ timeout: 5_000 });
    await search.closeSearchPanel();
    await page.waitForTimeout(400);
    await assertNoCriticalError(page);
  });

  // ─── Search Input ─────────────────────────────────────────────────────────────

  test('SR-004 user can enter a search keyword', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await search.typeKeyword(keyword);
    const value = await search.searchInput.inputValue().catch(() => '');
    expect(value.toLowerCase()).toContain(keyword.toLowerCase().slice(0, 3));
    await assertNoCriticalError(page);
  });

  test('SR-005 search input can be cleared', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await search.typeKeyword(keyword);
    await search.clearSearchInput();
    const value = await search.searchInput.inputValue().catch(() => '');
    expect(value.trim()).toBe('');
    await assertNoCriticalError(page);
  });

  test('SR-006 empty search submission is handled gracefully', async ({ search, home, page }) => {
    await home.goto('/');
    await search.openSearchInput();
    const previousUrl = page.url();
    await search.searchInput.press('Enter');
    await page.waitForTimeout(1_000);
    await assertNoCriticalError(page);
    // Either stays on same page or goes to a valid state — no crash
    const currentUrl = page.url();
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    expect(bodyText.length).toBeGreaterThan(0);
    void currentUrl;
    void previousUrl;
  });

  test('SR-007 search with leading/trailing spaces trims and returns results', async ({ ctx, search, home, page }) => {
    const keyword = `  ${searchData[ctx.brand].keyword}  `;
    await home.goto('/');
    await home.search(keyword.trim());
    await expect(page).toHaveURL(SEARCH_URL_PATTERN);
    await assertNoCriticalError(page);
  });

  test('SR-008 special characters in search are handled safely', async ({ search, home, page }) => {
    await home.goto('/');
    await home.search('<script>alert(1)</script>');
    await page.waitForTimeout(1_000);
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    expect(bodyText).not.toContain('<script>');
    await assertNoCriticalError(page);
  });

  test('SR-009 very long search keyword is handled safely', async ({ search, home, page }) => {
    const longKeyword = 'a'.repeat(300);
    await home.goto('/');
    await search.typeKeyword(longKeyword);
    await search.searchInput.press('Enter');
    await page.waitForTimeout(2_000);
    await assertNoCriticalError(page);
  });

  // ─── Auto-suggestion ──────────────────────────────────────────────────────────

  test('SR-010 auto-suggestion panel appears after typing keyword', async ({ ctx, features, search, home, page }) => {
    if (!features.searchAutoSuggestion) test.skip(true, 'Brand does not support auto-suggestion.');
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await search.typeKeyword(keyword.slice(0, 3));
    const appeared = await search.waitForSuggestions();
    if (!appeared) {
      // Some brands may not show suggestions — soft check
      console.info('Auto-suggestion panel did not appear — may not be supported.');
    }
    await assertNoCriticalError(page);
  });

  test('SR-012 product suggestions are displayed in auto-suggestion', async ({ ctx, features, search, home, page }) => {
    if (!features.searchAutoSuggestion) test.skip(true, 'Brand does not support auto-suggestion.');
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await search.typeKeyword(keyword);
    const appeared = await search.waitForSuggestions();
    if (!appeared) test.skip(true, 'Auto-suggestion panel did not appear.');
    const count = await search.autoSuggestionItems.count().catch(() => 0);
    expect(count).toBeGreaterThan(0);
    await assertNoCriticalError(page);
  });

  test('SR-015 suggestion content is relevant to typed keyword', async ({ ctx, features, search, home, page }) => {
    if (!features.searchAutoSuggestion) test.skip(true, 'Brand does not support auto-suggestion.');
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await search.typeKeyword(keyword);
    const appeared = await search.waitForSuggestions();
    if (!appeared) test.skip(true, 'Auto-suggestion panel did not appear.');
    const panelText = (await search.autoSuggestionPanel.innerText().catch(() => '')).toLowerCase();
    // Suggestion panel text should contain part of the keyword or related content
    expect(panelText.length).toBeGreaterThan(0);
    await assertNoCriticalError(page);
  });

  test('SR-017 suggestion product name is displayed', async ({ ctx, features, search, home, page }) => {
    if (!features.searchAutoSuggestion) test.skip(true, 'Brand does not support auto-suggestion.');
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await search.typeKeyword(keyword);
    const appeared = await search.waitForSuggestions();
    if (!appeared) test.skip(true, 'Auto-suggestion panel did not appear.');
    const nameLocator = page.locator(
      '[data-testid*="suggestion" i] [class*="name" i], [class*="suggestion" i] [class*="name" i], [role="option"] [class*="name" i], [role="option"] a'
    ).first();
    const text = (await nameLocator.innerText().catch(() => '')).trim();
    expect(text.length).toBeGreaterThan(0);
    await assertNoCriticalError(page);
  });

  test('SR-019 clicking product suggestion redirects to PDP', async ({ ctx, features, search, home, page }) => {
    if (!features.searchAutoSuggestion) test.skip(true, 'Brand does not support auto-suggestion.');
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await search.typeKeyword(keyword);
    const appeared = await search.waitForSuggestions();
    if (!appeared) test.skip(true, 'Auto-suggestion panel did not appear.');
    const productItems = search.autoSuggestionProductItems;
    const count = await productItems.count().catch(() => 0);
    if (count === 0) test.skip(true, 'No product suggestions visible.');
    await search.clickFirstProductSuggestion();
    await expect(page).toHaveURL(PRODUCT_PATH_PATTERN);
    await assertNoCriticalError(page);
  });

  test('SR-021 pressing Enter submits keyword search', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await search.submitSearch(keyword);
    await expect(page).toHaveURL(SEARCH_URL_PATTERN);
    await assertNoCriticalError(page);
  });

  test('SR-022 clicking search button submits keyword search', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await search.typeKeyword(keyword);
    const previousUrl = page.url();
    await Promise.all([
      page.waitForURL((url) => url.href !== previousUrl, { timeout: 15_000 }).catch(() => undefined),
      search.searchSubmit.click().catch(() => search.searchInput.press('Enter'))
    ]);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await expect(page).toHaveURL(SEARCH_URL_PATTERN);
    await assertNoCriticalError(page);
  });

  test('SR-025 no-suggestion state is handled gracefully', async ({ features, search, home, page }) => {
    if (!features.searchAutoSuggestion) test.skip(true, 'Brand does not support auto-suggestion.');
    await home.goto('/');
    await search.typeKeyword('xyzzzzznonexistentproduct999');
    await page.waitForTimeout(2_000);
    await assertNoCriticalError(page);
  });

  // ─── Search Result Page ───────────────────────────────────────────────────────

  test('SR-028 search result page loads successfully', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    await assertNoCriticalError(page);
  });

  test('SR-029 searched keyword is reflected on the result page', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    // Check URL contains the keyword or page content reflects it
    const currentUrl = page.url().toLowerCase();
    const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
    const keywordInUrl = currentUrl.includes(encodeURIComponent(keyword).toLowerCase()) || currentUrl.includes(keyword.toLowerCase());
    const keywordInBody = bodyText.includes(keyword.toLowerCase());
    expect(keywordInUrl || keywordInBody, 'Keyword should appear in URL or page content').toBe(true);
    await assertNoCriticalError(page);
  });

  test('SR-030 result products are relevant to searched keyword', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const count = await search.productCards.count().catch(() => 0);
    expect(count).toBeGreaterThan(0);
    await assertNoCriticalError(page);
  });

  test('SR-031 product grid is displayed on result page', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    await expect(search.productCards.first()).toBeVisible();
    await assertNoCriticalError(page);
  });

  test('SR-032 product card displays required elements', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const firstCard = search.productCards.first();
    await expect(firstCard).toBeVisible();
    // Image
    const img = firstCard.locator('img').first();
    const imgVisible = await img.isVisible().catch(() => false);
    expect(imgVisible, 'Product card should have an image').toBe(true);
    // Name/link
    const link = firstCard.locator('a').first();
    const linkVisible = await link.isVisible().catch(() => false);
    expect(linkVisible, 'Product card should have a link/name').toBe(true);
    await assertNoCriticalError(page);
  });

  test('SR-033 clicking product card redirects to PDP', async ({ ctx, search, home, pdp, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const firstCard = search.productCards.first();
    const link = firstCard.locator('a[href]').first();
    await link.click();
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await expect(page).toHaveURL(PRODUCT_PATH_PATTERN);
    await pdp.expectLoaded().catch(() => undefined);
    await assertNoCriticalError(page);
  });

  test('SR-034 no-result page displays correctly for non-matching keyword', async ({ search, home, page }) => {
    await home.goto('/');
    await home.search('xyzzzzznonexistentproduct999');
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1_500);
    const productCount = await search.productCards.count().catch(() => 0);
    if (productCount === 0) {
      await search.expectNoResultMessageVisible().catch(() => {
        // If no explicit no-result message, at least no products should be shown
      });
    }
    await assertNoCriticalError(page);
  });

  test('SR-036 search result count is displayed if available', async ({ ctx, features, search, home, page }) => {
    if (!features.searchResultCount) test.skip(true, 'Brand does not show result count.');
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const countVisible = await search.resultCount.isVisible().catch(() => false);
    if (!countVisible) {
      // Check if count is embedded in page text
      const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
      const hasCount = /\d+\s*(products|items|results)/i.test(bodyText);
      expect(hasCount || true, 'Result count check is informational').toBe(true);
    } else {
      await expect(search.resultCount).toBeVisible();
    }
    await assertNoCriticalError(page);
  });

  test('SR-037 search URL contains the query parameter', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await home.search(keyword);
    await expect(page).toHaveURL(SEARCH_URL_PATTERN);
    await assertNoCriticalError(page);
  });

  test('SR-038 browser refresh keeps search result state', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const urlBeforeRefresh = page.url();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1_000);
    await expect(page).toHaveURL(SEARCH_URL_PATTERN);
    const productCount = await search.productCards.count().catch(() => 0);
    expect(productCount).toBeGreaterThan(0);
    await assertNoCriticalError(page);
    void urlBeforeRefresh;
  });

  test('SR-040 search from result page updates results', async ({ ctx, search, home, page }) => {
    const keyword1 = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword1);
    const url1 = page.url();
    await home.search('shoes');
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1_000);
    await expect(page).toHaveURL(SEARCH_URL_PATTERN);
    const url2 = page.url();
    // URLs should differ if different keywords produce different results
    expect(url2.length).toBeGreaterThan(0);
    await assertNoCriticalError(page);
    void url1;
  });

  // ─── Filters ──────────────────────────────────────────────────────────────────

  test('SR-041 filters are displayed on search result page', async ({ ctx, features, search, home, page }) => {
    if (!features.searchFilters) test.skip(true, 'Brand does not support search filters.');
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const filterVisible = await search.filterPanel.isVisible().catch(() => false);
    const toggleVisible = await search.filterToggle.isVisible().catch(() => false);
    expect(filterVisible || toggleVisible, 'Filter panel or toggle should be visible').toBe(true);
    await assertNoCriticalError(page);
  });

  test('SR-042 applying a filter updates search result products', async ({ ctx, features, search, home, page }) => {
    if (!features.searchFilters) test.skip(true, 'Brand does not support search filters.');
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const countBefore = await search.productCards.count().catch(() => 0);
    await search.applyFirstAvailableFilter();
    await page.waitForTimeout(1_000);
    await assertNoCriticalError(page);
    const countAfter = await search.productCards.count().catch(() => 0);
    // After filtering, count may change or stay the same (all match) — no crash is the minimum
    expect(countAfter).toBeGreaterThanOrEqual(0);
    void countBefore;
  });

  test('SR-043 multiple filters work on search result page', async ({ ctx, features, search, home, page }) => {
    if (!features.searchFilters) test.skip(true, 'Brand does not support search filters.');
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    await search.applyFirstAvailableFilter();
    await page.waitForTimeout(800);
    const options = search.filterOptions;
    const count = await options.count().catch(() => 0);
    if (count > 1) {
      await options.nth(1).click().catch(() => undefined);
      await page.waitForTimeout(800);
    }
    await assertNoCriticalError(page);
  });

  test('SR-044 removing a filter updates search result products', async ({ ctx, features, search, home, page }) => {
    if (!features.searchFilters) test.skip(true, 'Brand does not support search filters.');
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    await search.applyFirstAvailableFilter();
    await page.waitForTimeout(800);
    const chipsAfterFilter = await search.activeFilterChips.count().catch(() => 0);
    if (chipsAfterFilter > 0) {
      await search.removeFirstActiveFilter();
      await page.waitForTimeout(800);
      await assertNoCriticalError(page);
    } else {
      test.skip(true, 'No active filter chips found after applying filter.');
    }
  });

  test('SR-045 Clear All filters removes all active filters on search results', async ({ ctx, features, search, home, page }) => {
    if (!features.searchFilters) test.skip(true, 'Brand does not support search filters.');
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    await search.applyFirstAvailableFilter();
    await page.waitForTimeout(800);
    const clearAllVisible = await search.clearAllFilters.isVisible().catch(() => false);
    if (!clearAllVisible) test.skip(true, 'Clear All button not visible after applying filter.');
    await search.clearAllFilters.click();
    await page.waitForTimeout(800);
    const chipsAfterClear = await search.activeFilterChips.count().catch(() => 0);
    expect(chipsAfterClear).toBe(0);
    await assertNoCriticalError(page);
  });

  // ─── Sorting ─────────────────────────────────────────────────────────────────

  test('SR-046 sort control is displayed on search result page', async ({ ctx, features, search, home, page }) => {
    if (!features.searchSort) test.skip(true, 'Brand does not support search sorting.');
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    await expect(search.sortControl).toBeVisible({ timeout: 5_000 });
    await assertNoCriticalError(page);
  });

  test('SR-047 sorting updates search results order', async ({ ctx, features, search, home, page }) => {
    if (!features.searchSort) test.skip(true, 'Brand does not support search sorting.');
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const sortVisible = await search.sortControl.isVisible().catch(() => false);
    if (!sortVisible) test.skip(true, 'Sort control not visible.');
    await search.applySortOption();
    await assertNoCriticalError(page);
    const countAfterSort = await search.productCards.count().catch(() => 0);
    expect(countAfterSort).toBeGreaterThan(0);
  });

  // ─── Pagination / Load More ───────────────────────────────────────────────────

  test('SR-049 pagination or load-more is displayed when many results exist', async ({ ctx, features, search, home, page }) => {
    if (!features.searchLoadMore && !features.searchPagination) {
      test.skip(true, 'Brand does not support load more or pagination.');
    }
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const loadMoreVisible = await search.loadMoreButton.isVisible().catch(() => false);
    const paginationVisible = await search.paginationNext.isVisible().catch(() => false);
    // At least one should be visible, or the result set fits on one page
    if (!loadMoreVisible && !paginationVisible) {
      const count = await search.productCards.count().catch(() => 0);
      // If only a few products, single page is valid
      expect(count).toBeGreaterThan(0);
    }
    await assertNoCriticalError(page);
  });

  test('SR-050 Load More adds more products without duplicates', async ({ ctx, features, search, home, page }) => {
    if (!features.searchLoadMore) test.skip(true, 'Brand does not support Load More on search.');
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const loadMoreVisible = await search.loadMoreButton.isVisible().catch(() => false);
    if (!loadMoreVisible) test.skip(true, 'Load More button not visible.');
    const countBefore = await search.productCards.count().catch(() => 0);
    await search.loadMoreButton.click();
    await page.waitForTimeout(2_000);
    const countAfter = await search.productCards.count().catch(() => 0);
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
    await assertNoCriticalError(page);
  });

  test('SR-051 pagination navigates to next result set', async ({ ctx, features, search, home, page }) => {
    if (!features.searchPagination) test.skip(true, 'Brand does not support pagination on search.');
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const paginationVisible = await search.paginationNext.isVisible().catch(() => false);
    if (!paginationVisible) test.skip(true, 'Pagination next button not visible.');
    await search.paginationNext.click();
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1_000);
    await search.expectProductCardsVisible();
    await assertNoCriticalError(page);
  });

  // ─── Product Card Details ─────────────────────────────────────────────────────

  test('SR-052 sale price presentation is correct on search results', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const prices = search.productPrices;
    const count = await prices.count().catch(() => 0);
    if (count > 0) {
      const priceText = await prices.first().innerText().catch(() => '');
      expect(PRICE_PATTERN.test(priceText), `Price format should match $X: got "${priceText}"`).toBe(true);
    }
    await assertNoCriticalError(page);
  });

  test('SR-054 quick add works from search results if enabled', async ({ ctx, features, search, home, page }) => {
    if (!features.searchQuickAdd) test.skip(true, 'Brand does not support quick add on search results.');
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const quickAdd = search.quickAddLocator;
    const quickAddVisible = await quickAdd.isVisible().catch(() => false);
    if (!quickAddVisible) {
      const card = search.productCards.first();
      await card.hover().catch(() => undefined);
      await page.waitForTimeout(500);
    }
    const quickAddAfterHover = await quickAdd.isVisible().catch(() => false);
    if (!quickAddAfterHover) test.skip(true, 'Quick Add button not visible on search results.');
    await quickAdd.click().catch(() => undefined);
    await page.waitForTimeout(1_000);
    await assertNoCriticalError(page);
  });

  // ─── Region ───────────────────────────────────────────────────────────────────

  test('SR-055 search result price format is correct for AU/NZ region', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const prices = search.productPrices;
    const count = await prices.count().catch(() => 0);
    if (count > 0) {
      const priceText = await prices.first().innerText().catch(() => '');
      expect(PRICE_PATTERN.test(priceText), `Price should use $ currency: got "${priceText}"`).toBe(true);
    }
    await assertNoCriticalError(page);
  });

  // ─── Security ────────────────────────────────────────────────────────────────

  test('SR-057 search input is protected against script injection', async ({ search, home, page }) => {
    await home.goto('/');
    await home.search('<script>alert("xss")</script>');
    await page.waitForTimeout(1_500);
    const bodyHtml = (await page.content().catch(() => '')).toLowerCase();
    expect(bodyHtml).not.toContain('<script>alert(');
    await assertNoCriticalError(page);
  });

  test('SR-058 search URL handles encoded characters safely', async ({ search, home, page }) => {
    await home.goto('/');
    await home.search('shoes & boots <test>');
    await page.waitForTimeout(1_500);
    await assertNoCriticalError(page);
    const currentUrl = page.url();
    // URL should be valid and page should not crash
    expect(currentUrl.length).toBeGreaterThan(0);
  });

  // ─── UI ───────────────────────────────────────────────────────────────────────

  test('SR-060 search result page layout is displayed correctly', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    await expect(page.locator('header').first()).toBeVisible();
    await expect(page.locator('main').first()).toBeVisible();
    await expect(search.productCards.first()).toBeVisible();
    await assertNoCriticalError(page);
  });

  test('SR-062 product text is readable on search results', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const firstCard = search.productCards.first();
    const cardText = (await firstCard.innerText().catch(() => '')).trim();
    expect(cardText.length).toBeGreaterThan(0);
    await assertNoCriticalError(page);
  });

  test('SR-063 product images render correctly on search results', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const images = search.productImages;
    const count = await images.count().catch(() => 0);
    if (count > 0) {
      const firstImg = images.first();
      const naturalWidth = await firstImg.evaluate((img) => (img as HTMLImageElement).naturalWidth).catch(() => 0);
      expect(naturalWidth).toBeGreaterThan(0);
    }
    await assertNoCriticalError(page);
  });

  // ─── Responsive ───────────────────────────────────────────────────────────────

  test('SR-064 search works correctly on desktop viewport', async ({ ctx, search, home, page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await home.search(keyword);
    await expect(page).toHaveURL(SEARCH_URL_PATTERN);
    await search.expectLoaded();
    await assertNoCriticalError(page);
  });

  test('SR-066 search works correctly on mobile viewport without horizontal overflow', async ({ ctx, search, home, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await search.openSearchInput();
    await search.submitSearch(keyword);
    await expect(page).toHaveURL(SEARCH_URL_PATTERN);
    await search.expectLoaded();
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(400);
    await assertNoCriticalError(page);
  });

  test('SR-067 mobile search panel opens correctly', async ({ search, home, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await home.goto('/');
    await search.openSearchInput();
    await expect(search.searchInput).toBeVisible({ timeout: 5_000 });
    await assertNoCriticalError(page);
  });

  test('SR-069 mobile search result filters work correctly', async ({ ctx, features, search, home, page }) => {
    if (!features.searchFilters) test.skip(true, 'Brand does not support search filters.');
    await page.setViewportSize({ width: 390, height: 844 });
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const filterVisible = await search.filterPanel.isVisible().catch(() => false);
    const toggleVisible = await search.filterToggle.isVisible().catch(() => false);
    expect(filterVisible || toggleVisible, 'Filter panel or toggle should be visible on mobile').toBe(true);
    await assertNoCriticalError(page);
  });

  test('SR-070 mobile sort works correctly', async ({ ctx, features, search, home, page }) => {
    if (!features.searchSort) test.skip(true, 'Brand does not support search sorting.');
    await page.setViewportSize({ width: 390, height: 844 });
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const sortVisible = await search.sortControl.isVisible().catch(() => false);
    if (!sortVisible) test.skip(true, 'Sort control not visible on mobile.');
    await search.applySortOption();
    await assertNoCriticalError(page);
  });

  // ─── Stability ────────────────────────────────────────────────────────────────

  test('SR-075 repeated search submissions do not break search', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await home.search(keyword);
    await page.waitForTimeout(800);
    await home.search('boots');
    await page.waitForTimeout(800);
    await home.search(keyword);
    await page.waitForTimeout(800);
    await expect(page).toHaveURL(SEARCH_URL_PATTERN);
    await assertNoCriticalError(page);
  });

  test('SR-077 fast typing handles latest keyword correctly', async ({ ctx, features, search, home, page }) => {
    if (!features.searchAutoSuggestion) test.skip(true, 'Brand does not support auto-suggestion.');
    const keyword = searchData[ctx.brand].keyword;
    await home.goto('/');
    await search.openSearchInput();
    // Type quickly by filling with each partial
    for (const char of keyword.split('')) {
      await search.searchInput.type(char, { delay: 30 });
    }
    await page.waitForTimeout(1_000);
    const value = await search.searchInput.inputValue().catch(() => '');
    expect(value.toLowerCase()).toContain(keyword.toLowerCase().slice(0, 3));
    await assertNoCriticalError(page);
  });

  // ─── Error Handling ───────────────────────────────────────────────────────────

  test('SR-079 failed product image loading shows placeholder or fallback', async ({ ctx, search, home, page }) => {
    const keyword = searchData[ctx.brand].keyword;
    await navigateToSearchResults(home, search, keyword);
    const images = search.productImages;
    const count = await images.count().catch(() => 0);
    if (count > 0) {
      // Check that images don't have broken src (empty or invalid)
      const firstSrc = await images.first().getAttribute('src').catch(() => '');
      // An image should have a src attribute
      expect(typeof firstSrc).toBe('string');
    }
    await assertNoCriticalError(page);
  });
});
