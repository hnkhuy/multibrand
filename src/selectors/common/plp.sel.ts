import type { PLPSelectors } from '../../core/types';

export const plpSelectors: PLPSelectors = {
  productCard: '[data-testid="product-card"], [data-product-id], .product, .product-tile',
  productName: '[data-testid="product-name"], .product-name, .product-title, a[href*="/product"]',
  filters: '[data-testid="filters"], aside, .filters',
  productLink: 'main a[href*="/product/"], main a[href*="/p/"], main a[href*=".html"], main a[href]',
  productPrice: '[data-testid*="price" i], [class*="price" i], [id*="price" i]',
  productBadge: '[data-testid*="badge" i], [class*="badge" i], [class*="label" i], [class*="tag" i], [class*="promo" i], [class*="sale" i]',
  productImage: 'img',
  breadcrumb: 'nav[aria-label*="breadcrumb" i], [data-testid*="breadcrumb" i], .breadcrumb, [class*="breadcrumb" i]',
  breadcrumbLink: 'nav[aria-label*="breadcrumb" i] a[href], [data-testid*="breadcrumb" i] a[href], .breadcrumb a[href], [class*="breadcrumb" i] a[href]',
  categoryTitle: 'h1, [data-testid*="category-title" i], [data-testid*="plp-title" i], [class*="category-title" i], [class*="plp-title" i], [class*="page-title" i]',
  categoryBanner: '[data-testid*="category-banner" i], [data-testid*="banner" i], [class*="category-banner" i], [class*="category-description" i], main picture, main img',
  loadMore: 'button:has-text("Load More"), button:has-text("Show More"), button:has-text("View More"), [data-testid*="load-more" i], [class*="load-more" i]',
  paginationNext:
    'a[aria-label*="next" i], button[aria-label*="next" i], .pagination a[rel="next"], .pagination button:has-text("Next"), [class*="pagination" i] a:has-text("Next")',
  sortControl: 'select[name*="sort" i], select[id*="sort" i], [data-testid*="sort" i], button:has-text("Sort"), button[aria-label*="sort" i], [class*="sort" i]',
  sortSelect: 'select[name*="sort" i], select[id*="sort" i]',
  sortTrigger: 'button:has-text("Sort"), [data-testid*="sort" i], [class*="sort" i]',
  sortLowToHighOption: 'button:has-text("Low to High"), [role="option"]:has-text("Low to High"), a:has-text("Low to High")',
  sortHighToLowOption: 'button:has-text("High to Low"), [role="option"]:has-text("High to Low"), a:has-text("High to Low")',
  sortAnyOption: 'button:has-text("Low"), button:has-text("High"), button:has-text("Newest"), [role="option"]',
  filterPanel: '[data-testid*="filter" i], [class*="filter-panel" i], [class*="filters" i], aside:has([type="checkbox"])',
  filterToggle: 'button:has-text("Filter"), button[aria-label*="filter" i], [data-testid*="filter-toggle" i], [class*="filter-toggle" i]',
  filterClose: 'button:has-text("Close"), button[aria-label*="close" i], [data-testid*="filter-close" i], [class*="close" i]',
  filterOption: 'input[type="checkbox"], [role="checkbox"], label, button, a',
  activeFilterChip: '[data-testid*="filter-chip" i], [class*="filter-chip" i], [class*="active-filter" i], [class*="selected-filter" i]',
  activeFilterRemove:
    '[data-testid*="filter-chip" i] button, [data-testid*="filter-chip" i] [aria-label*="remove" i], [data-testid*="filter-chip" i], [class*="filter-chip" i] button, [class*="active-filter" i]',
  clearAllFilters: 'button:has-text("Clear All"), button:has-text("Clear"), a:has-text("Clear All"), [data-testid*="clear" i]',
  quickAdd: 'button:has-text("Quick Add"), button:has-text("Add"), [data-testid*="quick-add" i], [class*="quick-add" i]',
  wishlistTrigger: '[data-testid*="wishlist" i], button[aria-label*="wishlist" i], [class*="wishlist" i], a[href*="wishlist"]',
  countSummary: '[data-testid*="count" i], [class*="count" i], [id*="count" i], text=/\\b\\d+\\s*(products|items|results)\\b/i',
  hoverReveal: '[class*="hover" i], [class*="secondary" i], [data-testid*="quick" i], button:has-text("Quick")',
  variantOption: 'select[name*="size" i], [class*="size" i] button, [data-testid*="size" i], [class*="swatch" i], [data-testid*="variant" i]',
  successFeedback: '[data-testid*="success" i], [class*="success" i], [class*="toast" i], [class*="notification" i]',
  stickyControls: '[class*="sticky" i][class*="filter" i], [class*="sticky" i][class*="sort" i], [data-testid*="sticky" i]'
};
