import type { SearchSelectors } from '../../core/types';

export const searchSelectors: SearchSelectors = {
  searchResultPage:
    '[data-testid="search-results"], [data-testid="search-page"], main[class*="search" i], [class*="search-results" i], [class*="search-page" i]',
  searchKeywordDisplay:
    '[data-testid*="search-term" i], [data-testid*="search-query" i], [class*="search-term" i], [class*="search-query" i], h1:has-text("results"), h1:has-text("search"), h2:has-text("results")',
  noResultMessage:
    '[data-testid*="no-result" i], [data-testid*="no-results" i], [class*="no-result" i], [class*="no-results" i], [class*="empty-result" i], p:has-text("no results"), p:has-text("0 results"), p:has-text("couldn\'t find"), p:has-text("no products found")',
  autoSuggestionPanel:
    '[data-testid*="suggestion" i], [data-testid*="autocomplete" i], [data-testid*="typeahead" i], [role="listbox"], [class*="suggestion" i], [class*="autocomplete" i], [class*="typeahead" i], [class*="search-dropdown" i]',
  autoSuggestionItem:
    '[data-testid*="suggestion-item" i], [role="option"], [class*="suggestion-item" i], [class*="autocomplete-item" i]',
  autoSuggestionProductItem:
    '[data-testid*="suggestion-product" i], [class*="suggestion-product" i], [class*="product-suggestion" i], [role="option"][class*="product" i]',
  autoSuggestionCategoryItem:
    '[data-testid*="suggestion-category" i], [class*="suggestion-category" i], [class*="category-suggestion" i], [role="option"][class*="category" i]',
  autoSuggestionProductImage:
    '[data-testid*="suggestion" i] img, [class*="suggestion" i] img, [role="option"] img',
  autoSuggestionProductName:
    '[data-testid*="suggestion" i] [class*="name" i], [class*="suggestion" i] [class*="name" i], [role="option"] [class*="name" i], [role="option"] a',
  autoSuggestionProductPrice:
    '[data-testid*="suggestion" i] [class*="price" i], [class*="suggestion" i] [class*="price" i], [role="option"] [class*="price" i]',
  searchClearButton:
    '[data-testid*="search-clear" i], button[aria-label*="clear" i], [class*="search-clear" i], input[type="search"] + button, [class*="clear-search" i]',
  searchCloseButton:
    '[data-testid*="search-close" i], button[aria-label*="close search" i], [class*="search-close" i], [class*="close-search" i]',
  searchResultCount:
    '[data-testid*="result-count" i], [data-testid*="search-count" i], [class*="result-count" i], [class*="search-count" i], text=/\\b\\d+\\s*(products|items|results)\\b/i'
};
