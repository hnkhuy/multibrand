import type { PDPSelectors } from '../../core/types';

export const pdpSelectors: PDPSelectors = {
  addToCartButton: '[data-testid="add-to-cart"], button[name="add"], button:has-text("Add to Cart"), button:has-text("Add to Bag")',
  sizeSelector: '[data-testid="size-selector"], select[name*="size" i], button[aria-label*="size" i]',
  productTitle: '[data-testid="product-title"], h1',
  breadcrumb: 'nav[aria-label*="breadcrumb" i], [data-testid*="breadcrumb" i], .breadcrumb, [class*="breadcrumb" i]',
  breadcrumbLink:
    'nav[aria-label*="breadcrumb" i] a[href], [data-testid*="breadcrumb" i] a[href], .breadcrumb a[href], [class*="breadcrumb" i] a[href]',
  price: '[data-testid*="price" i], .price, [class*="price" i], [id*="price" i]',
  promoBadge: '[data-testid*="badge" i], [class*="badge" i], [class*="label" i], [class*="tag" i], [class*="sale" i]',
  sku: '[data-testid*="sku" i], [data-testid*="product-code" i], [class*="sku" i], [class*="style-code" i], [class*="product-code" i]',
  description: '[data-testid*="description" i], [class*="description" i], [id*="description" i], [class*="product-details" i]',
  attribute: '[data-testid*="attribute" i], [class*="attribute" i], [class*="swatch" i], [class*="size" i], [class*="color" i]',
  colorOption:
    '[data-testid*="color" i] button, [data-testid*="swatch" i] button, [class*="color" i] button, [class*="swatch" i] button',
  sizeOption: 'select[name*="size" i], [data-testid*="size" i] button, [class*="size" i] button',
  galleryImage:
    'main img, [data-testid*="gallery" i] img, [class*="gallery" i] img, [class*="carousel" i] img, [class*="product-image" i] img, picture img',
  thumbnail: '[data-testid*="thumbnail" i], [class*="thumbnail" i], [class*="thumb" i], button:has(img), [role="tab"]:has(img)',
  galleryNext:
    'button[aria-label*="next" i], button[aria-label*="right" i], [class*="next" i] button, button[class*="next" i]',
  galleryPrevious:
    'button[aria-label*="prev" i], button[aria-label*="previous" i], button[aria-label*="left" i], [class*="prev" i] button, button[class*="prev" i]',
  zoomTrigger: '[data-testid*="zoom" i], button[aria-label*="zoom" i], button:has-text("Zoom"), [class*="zoom" i] button',
  zoomDialog: '[role="dialog"], [data-testid*="zoom" i], [class*="zoom" i], [class*="lightbox" i]',
  productVideo: '[data-testid*="video" i] video, [class*="video" i] video, video[src], video source',
  sizeSelect: 'select[name*="size" i], [data-testid*="size" i] select',
  sizeButton: '[data-testid*="size" i] button, [class*="size" i] button',
  successFeedback:
    '[data-testid*="success" i], [data-testid*="added" i], [class*="success" i], [class*="toast" i], [class*="notification" i]',
  quantityInput: 'input[name*="qty" i], input[name*="quantity" i], [data-testid*="quantity" i] input, select[name*="qty" i], select[name*="quantity" i]',
  wishlistTrigger: '[data-testid*="wishlist" i], button[aria-label*="wishlist" i], a[href*="wishlist"], [class*="wishlist" i]',
  findStore: '[data-testid*="store" i], button:has-text("Find in Store"), a:has-text("Find in Store"), [class*="store" i]',
  storeDialog: '[role="dialog"], [data-testid*="store" i], [class*="store-locator" i], [class*="find-store" i]',
  deliveryInfo: '[data-testid*="delivery" i], [class*="delivery" i], [class*="shipping" i], [id*="delivery" i]',
  pickupInfo: '[data-testid*="pickup" i], [class*="pickup" i], [class*="click-and-collect" i], [class*="collect" i]',
  financePromo:
    '[data-testid*="finance" i], [data-testid*="payment" i], [class*="afterpay" i], [class*="klarna" i], [class*="zip" i], [class*="finance" i], [class*="payment" i]',
  financeDialog: '[role="dialog"], [data-testid*="finance" i], [class*="finance" i], [class*="payment" i]',
  recommendation: '[data-testid*="recommend" i], [class*="recommend" i], [class*="you-may-also-like" i], [class*="related" i]',
  accordionOrTab: '[data-testid*="accordion" i], [class*="accordion" i], [role="tablist"], [role="tab"], details, summary',
  stickyAddToCart: '[data-testid*="sticky" i][data-testid*="cart" i], [class*="sticky" i][class*="cart" i], [class*="sticky" i][class*="atc" i]'
};
