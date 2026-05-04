import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

export class SearchPage extends BasePage {
  constructor(page: Page, selectors: Selectors, ctx: BrandContext) {
    super(page, selectors, ctx);
  }

  get browserPage(): Page {
    return this.page;
  }

  get quickAddLocator(): Locator {
    return this.page.locator(this.selectors.plp.quickAdd ?? '').first();
  }

  // ─── Search Input ────────────────────────────────────────────────────────────

  get searchInput(): Locator {
    return this.page.locator(this.selectors.header.searchInput).first();
  }

  get searchSubmit(): Locator {
    return this.page.locator(this.selectors.header.searchSubmit ?? 'button[type="submit"]').first();
  }

  get searchClearButton(): Locator {
    return this.page.locator(this.selectors.search?.searchClearButton ?? '').first();
  }

  get searchCloseButton(): Locator {
    return this.page.locator(this.selectors.search?.searchCloseButton ?? '').first();
  }

  // ─── Auto-suggestion ─────────────────────────────────────────────────────────

  get autoSuggestionPanel(): Locator {
    return this.page.locator(this.selectors.search?.autoSuggestionPanel ?? '').first();
  }

  get autoSuggestionItems(): Locator {
    return this.page.locator(this.selectors.search?.autoSuggestionItem ?? '');
  }

  get autoSuggestionProductItems(): Locator {
    return this.page.locator(this.selectors.search?.autoSuggestionProductItem ?? '');
  }

  get autoSuggestionCategoryItems(): Locator {
    return this.page.locator(this.selectors.search?.autoSuggestionCategoryItem ?? '');
  }

  // ─── Search Result Page ───────────────────────────────────────────────────────

  get resultPage(): Locator {
    return this.page.locator(this.selectors.search?.searchResultPage ?? 'main').first();
  }

  get keywordDisplay(): Locator {
    return this.page.locator(this.selectors.search?.searchKeywordDisplay ?? '').first();
  }

  get noResultMessage(): Locator {
    return this.page.locator(this.selectors.search?.noResultMessage ?? '').first();
  }

  get resultCount(): Locator {
    return this.page.locator(this.selectors.search?.searchResultCount ?? '').first();
  }

  get productCards(): Locator {
    return this.page.locator(this.selectors.plp.productCard);
  }

  get productImages(): Locator {
    return this.page.locator(this.selectors.plp.productImage ?? 'img');
  }

  get productPrices(): Locator {
    return this.page.locator(this.selectors.plp.productPrice ?? '');
  }

  // ─── Filters & Sorting ───────────────────────────────────────────────────────

  get filterPanel(): Locator {
    return this.page.locator(this.selectors.plp.filterPanel ?? this.selectors.plp.filters ?? '').first();
  }

  get filterToggle(): Locator {
    return this.page.locator(this.selectors.plp.filterToggle ?? '').first();
  }

  get filterOptions(): Locator {
    return this.page.locator(this.selectors.plp.filterOption ?? '');
  }

  get activeFilterChips(): Locator {
    return this.page.locator(this.selectors.plp.activeFilterChip ?? '');
  }

  get clearAllFilters(): Locator {
    return this.page.locator(this.selectors.plp.clearAllFilters ?? '').first();
  }

  get sortControl(): Locator {
    return this.page.locator(this.selectors.plp.sortControl ?? '').first();
  }

  get sortAnyOption(): Locator {
    return this.page.locator(this.selectors.plp.sortAnyOption ?? '').first();
  }

  // ─── Pagination ───────────────────────────────────────────────────────────────

  get loadMoreButton(): Locator {
    return this.page.locator(this.selectors.plp.loadMore ?? '').first();
  }

  get paginationNext(): Locator {
    return this.page.locator(this.selectors.plp.paginationNext ?? '').first();
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  async openSearchInput(): Promise<void> {
    const input = this.searchInput;
    const isVisible = await input.isVisible().catch(() => false);
    if (!isVisible) {
      const searchIcon = this.page.locator(
        'button[aria-label*="search" i], [data-testid*="search-icon" i], [data-testid*="search-trigger" i], header button:has(svg)'
      ).first();
      await searchIcon.click().catch(() => undefined);
      await this.page.waitForTimeout(300);
    }
  }

  async typeKeyword(keyword: string): Promise<void> {
    await this.openSearchInput();
    await this.searchInput.fill(keyword);
  }

  async submitSearch(keyword: string): Promise<void> {
    const previousUrl = this.page.url();
    await this.typeKeyword(keyword);
    await Promise.all([
      this.page.waitForURL((url) => url.href !== previousUrl, { timeout: 15_000 }).catch(() => undefined),
      this.searchInput.press('Enter')
    ]);
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
  }

  async clearSearchInput(): Promise<void> {
    const clear = this.searchClearButton;
    const isVisible = await clear.isVisible().catch(() => false);
    if (isVisible) {
      await clear.click();
    } else {
      await this.searchInput.selectText();
      await this.searchInput.press('Delete');
    }
  }

  async closeSearchPanel(): Promise<void> {
    const close = this.searchCloseButton;
    const isVisible = await close.isVisible().catch(() => false);
    if (isVisible) {
      await close.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(300);
  }

  async waitForSuggestions(): Promise<boolean> {
    try {
      await this.autoSuggestionPanel.waitFor({ state: 'visible', timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }

  async clickFirstSuggestion(): Promise<void> {
    const first = this.autoSuggestionItems.first();
    await first.click();
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
  }

  async clickFirstProductSuggestion(): Promise<void> {
    const first = this.autoSuggestionProductItems.first();
    await first.click();
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => undefined);
  }

  async openFilterPanel(): Promise<void> {
    const panelVisible = await this.filterPanel.isVisible().catch(() => false);
    if (!panelVisible) {
      await this.filterToggle.click().catch(() => undefined);
      await this.page.waitForTimeout(500);
    }
  }

  async applyFirstAvailableFilter(): Promise<void> {
    await this.openFilterPanel();
    const option = this.filterOptions.first();
    await option.click().catch(() => undefined);
    await this.page.waitForTimeout(800);
  }

  async removeFirstActiveFilter(): Promise<void> {
    const chip = this.activeFilterChips.first();
    const isVisible = await chip.isVisible().catch(() => false);
    if (!isVisible) return;

    const removeBtn = chip.locator(this.selectors.plp.activeFilterRemove ?? 'button').first();
    const removeBtnVisible = await removeBtn.isVisible().catch(() => false);
    if (removeBtnVisible) {
      await removeBtn.click();
    } else {
      await chip.click();
    }
    await this.page.waitForTimeout(800);
  }

  async applySortOption(): Promise<void> {
    const control = this.sortControl;
    const tagName = await control.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      await control.selectOption({ index: 1 }).catch(() => undefined);
    } else {
      await control.click().catch(() => undefined);
      await this.page.waitForTimeout(300);
      await this.sortAnyOption.click().catch(() => undefined);
    }
    await this.page.waitForTimeout(800);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────────

  async expectLoaded(): Promise<void> {
    await expect(this.productCards.first()).toBeVisible({ timeout: 15_000 });
  }

  async expectResultPageUrl(): Promise<void> {
    await expect(this.page).toHaveURL(/search|q=|query=|\/s\//i);
  }

  async expectProductCardsVisible(): Promise<void> {
    await expect(this.productCards.first()).toBeVisible();
  }

  async expectNoResultMessageVisible(): Promise<void> {
    await expect(this.noResultMessage).toBeVisible({ timeout: 10_000 });
  }
}
