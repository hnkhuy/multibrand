import type { MiniCartSelectors } from '../../core/types';

export const minicartSelectors: MiniCartSelectors = {
  drawer: '[data-testid="mini-cart"], [data-testid="minicart"], .mini-cart, .cart-drawer, [class*="mini-cart" i], [class*="minicart" i], [class*="cart-drawer" i], [class*="cart-sidebar" i]',
  checkoutButton:
    '[data-testid="checkout"], a[href*="checkout"], button:has-text("Checkout"), button:has-text("Go to checkout"), a:has-text("Checkout"), a:has-text("Go to Checkout")',
  itemRow:
    '[data-testid="cart-item"], .cart-item, .mini-cart-item, [class*="cart-item" i], [class*="mini-cart-item" i], [class*="minicart-item" i]',
  closeButton:
    'button[aria-label*="close" i], button[data-testid*="close" i], [class*="close" i] button, button[class*="close" i], button:has-text("×"), button:has-text("✕")',
  viewCartButton:
    'a:has-text("View Cart"), a:has-text("View Bag"), button:has-text("View Cart"), a:has-text("View your cart"), a[href*="/cart"]:not([href*="checkout"])',
  subtotal:
    '[data-testid*="subtotal" i], [class*="subtotal" i], [data-testid*="cart-total" i], [class*="cart-total" i], [class*="order-total" i]',
  itemImage: 'img, picture img',
  itemName:
    '[data-testid*="product-name" i], [class*="product-name" i], [class*="item-name" i], a[href*="/product/"], a[href*=".html"], h2, h3',
  itemAttribute:
    '[data-testid*="attribute" i], [class*="attribute" i], [class*="variant" i], [class*="option" i], [class*="size" i], [class*="colour" i], [class*="color" i]',
  itemPrice: '[data-testid*="price" i], [class*="price" i], [id*="price" i]',
  productLink: 'a[href*="/product/"], a[href*=".html"], a[href*="/p/"]',
  removeButton:
    'button:has-text("Remove"), a:has-text("Remove"), button[aria-label*="remove" i], [data-testid*="remove" i], button[class*="remove" i]',
  qtyInput:
    'input[name*="qty" i], input[id*="qty" i], input[aria-label*="quantity" i], select[name*="qty" i], select[id*="qty" i], select[aria-label*="quantity" i]',
  qtyPlus:
    'button:has-text("+"), button[aria-label*="increase" i], button[aria-label*="plus" i], [data-testid*="increase" i], button[data-testid*="plus" i]',
  qtyMinus:
    'button:has-text("-"), button[aria-label*="decrease" i], button[aria-label*="minus" i], [data-testid*="decrease" i], button[data-testid*="minus" i]',
  emptyMessage:
    '[data-testid*="empty" i], [class*="empty-cart" i], [class*="cart-empty" i], [class*="empty" i]',
  continueShoppingCta:
    'a:has-text("Continue Shopping"), button:has-text("Continue Shopping"), a:has-text("Shop Now"), button:has-text("Shop Now"), a:has-text("Continue shopping")',
  paymentMessaging:
    '[data-testid*="payment-msg" i], [class*="payment-msg" i], [class*="afterpay" i], [class*="paypal-msg" i], [class*="bnpl" i], [class*="klarna" i], [class*="zip-msg" i], [class*="laybuy" i]',
  promoMessage:
    '[data-testid*="promo-msg" i], [class*="promo-msg" i], [class*="coupon-msg" i], [class*="discount-msg" i], [class*="promotion-msg" i]'
};
