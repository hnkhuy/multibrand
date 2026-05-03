import type { Brand } from '../src/core/types';

export interface BrandFeatures {
  // PLP
  breadcrumb: boolean;
  categoryBanner: boolean;
  hoverReveal: boolean;
  productCount: boolean;
  loadMore: boolean;
  pagination: boolean;
  sort: boolean;
  filters: boolean;
  wishlistOnPlp: boolean;
  quickAddOnPlp: boolean;
  stickyFiltersOnPlp: boolean;

  // PDP
  wishlistOnPdp: boolean;

  // Homepage
  promoCarousel: boolean;
  promoTiles: boolean;
  categoryEntries: boolean;
  featuredProducts: boolean;
  stickyHeader: boolean;
  footerLinks: boolean;
  socialLinks: boolean;
  quickView: boolean;

  // Cart
  headerCartCount: boolean;
  emptyCartUI: boolean;
  removeFromCart: boolean;
  quantityControls: boolean;
  productLinkInCart: boolean;

  // Wishlist
  wishlist: boolean;
  wishlistRequiresLogin: boolean;
}

const defaults: BrandFeatures = {
  breadcrumb: true,
  categoryBanner: true,
  hoverReveal: true,
  productCount: true,
  loadMore: true,
  pagination: true,
  sort: true,
  filters: true,
  wishlistOnPlp: true,
  quickAddOnPlp: true,
  stickyFiltersOnPlp: true,
  wishlistOnPdp: true,
  promoCarousel: true,
  promoTiles: true,
  categoryEntries: true,
  featuredProducts: true,
  stickyHeader: true,
  footerLinks: true,
  socialLinks: true,
  quickView: true,
  headerCartCount: true,
  emptyCartUI: true,
  removeFromCart: true,
  quantityControls: true,
  productLinkInCart: true,
  wishlist: true,
  wishlistRequiresLogin: true,
};

// Override per brand when a feature is confirmed absent.
// Leaving a key out means the feature is expected to be present — tests will FAIL if it isn't.
const BRAND_FEATURES: Record<Brand, Partial<BrandFeatures>> = {
  drmartens: {},
  platypus: {},
  skechers: {},
  vans: {},
};

export function getBrandFeatures(brand: Brand): BrandFeatures {
  return { ...defaults, ...BRAND_FEATURES[brand] };
}
