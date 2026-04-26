import type { CartSelectors } from '../../core/types';

export const cartSelectors: CartSelectors = {
  pageRoot: 'main, [role="main"], [data-testid*="cart" i], [class*="cart" i]',
  itemRow: '[data-testid*="cart-item" i], [data-test*="cart-item" i], .cart-item, .bag-item, li[class*="cart" i], article[class*="cart" i]',
  itemImage: 'img, picture img',
  itemName: '[data-testid*="product-name" i], [class*="product-name" i], [class*="item-name" i], a[href*="/product/"], a[href*=".html"], h2, h3',
  itemAttribute:
    '[data-testid*="attribute" i], [class*="attribute" i], [class*="variant" i], [class*="option" i], [class*="size" i], [class*="colour" i], [class*="color" i]',
  itemPrice: '[data-testid*="price" i], [class*="price" i], [id*="price" i]',
  productLink: 'a[href*="/product/"], a[href*=".html"], a[href*="/p/"]',
  removeButton: 'button:has-text("Remove"), a:has-text("Remove"), button[aria-label*="remove" i], [data-testid*="remove" i]',
  qtyInput:
    'input[name*="qty" i], input[id*="qty" i], input[aria-label*="quantity" i], select[name*="qty" i], select[id*="qty" i], select[aria-label*="quantity" i]',
  qtyPlus: 'button:has-text("+"), button[aria-label*="increase" i], button[aria-label*="plus" i], [data-testid*="increase" i]',
  qtyMinus:
    'button:has-text("-"), button[aria-label*="decrease" i], button[aria-label*="minus" i], [data-testid*="decrease" i]',
  emptyMessage: '[data-testid*="empty" i], [class*="empty-cart" i], [class*="cart-empty" i], [class*="empty" i]',
  continueShopping: 'a:has-text("Continue Shopping"), button:has-text("Continue Shopping"), a:has-text("Shop"), button:has-text("Shop")'
};
