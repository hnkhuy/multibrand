import type { WishlistSelectors } from '../../core/types';

export const wishlistSelectors: WishlistSelectors = {
  productCard: 'main [data-testid="product-card"], main [data-product-id], main .product-tile, main article[class*="product" i], main li[class*="product" i], main .product',
  productName: '[data-testid*="product-name" i], [class*="product-name" i], [class*="product-title" i], h1',
  plpProductLink: 'a[href]',
  pageLink: 'a[href*="wishlist"], button[aria-label*="wishlist" i], button:has-text("Wishlist"), a:has-text("Wishlist")',
  pageItem: 'main [data-testid*="wishlist-item" i], main [class*="wishlist-item" i], main li[class*="wishlist" i], main article[class*="wishlist" i], main [data-product-id]',
  trigger:
    '[data-testid*="wishlist" i], button[aria-label*="wishlist" i], button[aria-label*="favourite" i], button[aria-label*="favorite" i], [class*="wishlist" i], [class*="favourite" i], [class*="favorite" i], a[href*="wishlist"]',
  variantOption:
    '[data-testid*="size" i] button, [class*="size" i] button, select[name*="size" i], [data-testid*="color" i] button, [class*="swatch" i] button',
  toast:
    '[data-testid*="toast" i], [class*="toast" i], [data-testid*="notification" i], [class*="notification" i], [data-testid*="success" i], [class*="success" i]',
  removeButton:
    '[data-testid*="remove" i], button[aria-label*="remove" i], button:has-text("Remove"), button:has-text("Delete"), [class*="remove" i]',
  price: '[data-testid*="price" i], [class*="price" i], [id*="price" i]'
};
