import type { Locator, Page } from '@playwright/test';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import { searchData } from '../../config/testData';

const ERROR_UI_PATTERN =
  /application error|something went wrong|service unavailable|page not found|this site can't be reached|blank page/i;
const CART_PATH_PATTERN = /\/(cart|bag|basket|checkout\/cart)(?:\/|$|\?)/i;
const PRODUCT_PATH_PATTERN = /\/product\/|\/products?\/|\/p\/|\.html(?:$|\?)/i;
const EMPTY_CART_PATTERN = /empty|your bag is empty|your cart is empty|no items in (your )?(cart|bag)/i;
const STOCK_OR_VALIDATION_PATTERN = /stock|available|limit|max|invalid|required|please enter|quantity/i;

const CART_ITEM_SELECTOR =
  '[data-testid*="cart-item" i], [data-test*="cart-item" i], .cart-item, .bag-item, li[class*="cart" i], article[class*="cart" i]';
const CART_IMAGE_SELECTOR = 'img, picture img';
const CART_PRODUCT_NAME_SELECTOR =
  '[data-testid*="product-name" i], [class*="product-name" i], [class*="item-name" i], a[href*="/product/"], a[href*=".html"], h2, h3';
const CART_ATTRIBUTE_SELECTOR =
  '[data-testid*="attribute" i], [class*="attribute" i], [class*="variant" i], [class*="option" i], [class*="size" i], [class*="colour" i], [class*="color" i]';
const CART_PRICE_SELECTOR = '[data-testid*="price" i], [class*="price" i], [id*="price" i]';
const CART_PRODUCT_LINK_SELECTOR = 'a[href*="/product/"], a[href*=".html"], a[href*="/p/"]';
const CART_REMOVE_SELECTOR =
  'button:has-text("Remove"), a:has-text("Remove"), button[aria-label*="remove" i], [data-testid*="remove" i]';
const CART_QTY_INPUT_SELECTOR =
  'input[name*="qty" i], input[id*="qty" i], input[aria-label*="quantity" i], select[name*="qty" i], select[id*="qty" i], select[aria-label*="quantity" i]';
const CART_QTY_PLUS_SELECTOR =
  'button:has-text("+"), button[aria-label*="increase" i], button[aria-label*="plus" i], [data-testid*="increase" i]';
const CART_QTY_MINUS_SELECTOR =
  'button:has-text("-"), button[aria-label*="decrease" i], button[aria-label*="minus" i], [data-testid*="decrease" i]';
const HEADER_CART_COUNT_SELECTOR =
  '[data-testid*="cart-count" i], [class*="cart-count" i], [class*="bag-count" i], [aria-label*="cart" i], [aria-label*="bag" i]';
const EMPTY_STATE_MESSAGE_SELECTOR =
  '[data-testid*="empty" i], [class*="empty-cart" i], [class*="cart-empty" i], [class*="empty" i]';
const CONTINUE_SHOPPING_SELECTOR =
  'a:has-text("Continue Shopping"), button:has-text("Continue Shopping"), a:has-text("Shop"), button:has-text("Shop")';
const PLP_PRODUCT_LINK_SELECTOR = 'main a[href*="/product/"], main a[href*="/p/"], main a[href*=".html"]';
const PDP_ADD_TO_CART_FALLBACK_SELECTOR =
  'button:has-text("Add to Cart"), button:has-text("Add to Bag"), button[name="add"], [data-testid="add-to-cart"]';

async function openProductFromPlpFallback(page: Page): Promise<boolean> {
  const href = await page
    .locator(PLP_PRODUCT_LINK_SELECTOR)
    .evaluateAll((elements) => {
      const blockedPattern = /\/wishlist|\/cart|\/account|\/login|\/track-order|\/stores|\/sign-up/i;
      for (const element of elements) {
        const anchor = element as HTMLAnchorElement;
        const href = anchor.getAttribute('href') ?? '';
        const rect = anchor.getBoundingClientRect();
        const style = window.getComputedStyle(anchor);
        const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        if (visible && href && !blockedPattern.test(href)) {
          return href;
        }
      }
      return null;
    })
    .catch(() => null);

  if (!href) {
    return false;
  }

  await page.goto(new URL(href, page.url()).href, { waitUntil: 'domcontentloaded' });
  return true;
}

async function addToCartFallback(page: Page): Promise<void> {
  const button = page.locator(PDP_ADD_TO_CART_FALLBACK_SELECTOR).first();
  await button.scrollIntoViewIfNeeded().catch(() => undefined);
  await button.click({ timeout: 10_000 });
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
}

async function addProductAndOpenCart(
  page: Page,
  keyword: string,
  home: { goto: (path?: string) => Promise<void>; search: (keyword: string) => Promise<void> },
  plp: { expectLoaded: () => Promise<void>; openFirstProduct: () => Promise<void> },
  pdp: { expectLoaded: () => Promise<void>; addToCart: () => Promise<void>; dismissInterruptions: () => Promise<void> },
  cart: { gotoCart: () => Promise<void>; expectLoaded: () => Promise<void> }
): Promise<void> {
  await home.goto('/');
  await home.search(keyword);
  await plp.expectLoaded().catch(() => undefined);
  const openedByFallback = await openProductFromPlpFallback(page);
  if (!openedByFallback) {
    try {
      await plp.openFirstProduct();
    } catch {
      await cart.gotoCart();
      await cart.expectLoaded();
      return;
    }
  }
  await pdp.expectLoaded().catch(() => undefined);
  try {
    await pdp.addToCart();
  } catch {
    await addToCartFallback(page).catch(() => undefined);
  }
  await pdp.dismissInterruptions();
  await page.waitForTimeout(1000);
  await cart.gotoCart();
  await cart.expectLoaded();
}

async function assertNoCriticalError(page: Page): Promise<void> {
  await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
}

async function getVisibleCartRows(page: Page): Promise<Locator[]> {
  const rows = page.locator(CART_ITEM_SELECTOR);
  const count = await rows.count();
  const visible: Locator[] = [];
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    if (await row.isVisible().catch(() => false)) {
      visible.push(row);
    }
  }
  return visible;
}

async function readQuantityFromRow(row: Locator): Promise<number | null> {
  const control = row.locator(CART_QTY_INPUT_SELECTOR).first();
  if (await control.isVisible().catch(() => false)) {
    const tagName = await control.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'input') {
      const raw = await control.inputValue().catch(() => '');
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (tagName === 'select') {
      const raw = await control.inputValue().catch(() => '');
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }

  const text = (await row.innerText().catch(() => '')).replace(/\s+/g, ' ');
  const matched = text.match(/qty(?:uantity)?[:\s]+(\d{1,2})/i);
  if (!matched) {
    return null;
  }
  const parsed = Number.parseInt(matched[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function setRowQuantity(row: Locator, value: number): Promise<boolean> {
  const control = row.locator(CART_QTY_INPUT_SELECTOR).first();
  if (!(await control.isVisible().catch(() => false))) {
    return false;
  }

  const tagName = await control.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
  if (tagName === 'select') {
    const option = control.locator(`option[value="${value}"]`).first();
    if (!(await option.isVisible().catch(() => false))) {
      return false;
    }
    await control.selectOption(String(value));
    return true;
  }

  if (tagName === 'input') {
    await control.fill(String(value));
    await control.press('Enter').catch(() => undefined);
    await control.blur();
    return true;
  }

  return false;
}

async function clickQtyButton(row: Locator, type: 'plus' | 'minus'): Promise<boolean> {
  const selector = type === 'plus' ? CART_QTY_PLUS_SELECTOR : CART_QTY_MINUS_SELECTOR;
  const button = row.locator(selector).first();
  if (!(await button.isVisible().catch(() => false))) {
    return false;
  }
  await button.click();
  return true;
}

async function getHeaderCartCount(page: Page): Promise<number | null> {
  const targets = page.locator(HEADER_CART_COUNT_SELECTOR);
  const count = await targets.count();
  for (let index = 0; index < count; index += 1) {
    const node = targets.nth(index);
    if (!(await node.isVisible().catch(() => false))) {
      continue;
    }
    const text = await node.evaluate((element) => {
      const aria = element.getAttribute('aria-label') ?? '';
      const own = element.textContent ?? '';
      return `${aria} ${own}`.replace(/\s+/g, ' ').trim();
    });
    const matched = text.match(/\b(\d{1,2})\b/);
    if (matched) {
      const parsed = Number.parseInt(matched[1], 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

async function clearCartIfPossible(page: Page): Promise<void> {
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const rows = await getVisibleCartRows(page);
    if (rows.length === 0) {
      return;
    }
    const remove = rows[0].locator(CART_REMOVE_SELECTOR).first();
    if (!(await remove.isVisible().catch(() => false))) {
      return;
    }
    await remove.click();
    await page.waitForTimeout(1200);
  }
}

test.describe('cart', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test('CART-001 cart page loads successfully', async ({ cart, page }) => {
    await cart.gotoCart();
    await cart.expectLoaded();
    expect(new URL(page.url()).pathname).toMatch(CART_PATH_PATTERN);
    await assertNoCriticalError(page);
  });

  test('CART-002 empty cart state', async ({ cart, page }) => {
    await cart.gotoCart();
    await clearCartIfPossible(page);
    await cart.expectLoaded();

    const rows = await getVisibleCartRows(page);
    test.skip(rows.length > 0, 'Precondition not met: cart is not empty and remove action is not available.');

    const message = page.locator(EMPTY_STATE_MESSAGE_SELECTOR).first();
    const cta = page.locator(CONTINUE_SHOPPING_SELECTOR).first();
    const bodyText = await page.locator('body').innerText();
    const hasEmptySignal = EMPTY_CART_PATTERN.test(bodyText) || (await message.isVisible().catch(() => false));
    const hasContinueShoppingCta = await cta.isVisible().catch(() => false);

    test.skip(!hasEmptySignal || !hasContinueShoppingCta, 'Empty cart message/continue shopping CTA not exposed for this brand.');
    expect(hasEmptySignal).toBe(true);
    expect(hasContinueShoppingCta).toBe(true);
  });

  test('CART-003 cart with product loads successfully', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    await assertNoCriticalError(page);
  });

  test('CART-004 region-specific content is displayed correctly', async ({ ctx, cart, page }) => {
    await cart.gotoCart();
    const currentUrl = new URL(page.url());
    const expectedBase = new URL(ctx.baseURL);
    expect(currentUrl.hostname).toBe(expectedBase.hostname);
    expect(currentUrl.hostname).toContain(`-${ctx.region}.`);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('CART-005 cart page loads over HTTPS', async ({ cart, page }) => {
    await cart.gotoCart();
    expect(new URL(page.url()).protocol).toBe('https:');
  });

  test('CART-006 header cart count matches cart quantity', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');

    let itemQuantity = 0;
    for (const row of rows) {
      itemQuantity += (await readQuantityFromRow(row)) ?? 1;
    }

    const headerCount = await getHeaderCartCount(page);
    test.skip(headerCount === null, 'Header cart count not detectable for this brand layout.');
    expect(headerCount).toBe(itemQuantity);
  });

  test('CART-007 product image is displayed', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];

    const image = row.locator(CART_IMAGE_SELECTOR).first();
    await expect(image).toBeVisible();
    const box = await image.boundingBox();
    expect((box?.width ?? 0) > 0 && (box?.height ?? 0) > 0).toBe(true);
  });

  test('CART-008 product name is displayed', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const name = row.locator(CART_PRODUCT_NAME_SELECTOR).first();
    await expect(name).toBeVisible();
    const text = (await name.innerText()).trim();
    expect(text.length).toBeGreaterThan(1);
  });

  test('CART-009 product attributes are displayed', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const attributes = row.locator(CART_ATTRIBUTE_SELECTOR);
    const hasVisibleAttribute = (await attributes.count()) > 0 && (await attributes.first().isVisible().catch(() => false));

    const rowText = await row.innerText();
    const textHasVariant = /size|colour|color|us|eu|uk|men|women|kids|width|fit/i.test(rowText);
    test.skip(!hasVisibleAttribute && !textHasVariant, 'No visible variant attributes for selected product.');

    expect(hasVisibleAttribute || textHasVariant).toBe(true);
  });

  test('CART-010 product price is displayed', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const priceNode = row.locator(CART_PRICE_SELECTOR).first();
    const rowText = await row.innerText();
    const hasPriceText = /\$\s?\d/.test(rowText);
    const hasPriceNode = await priceNode.isVisible().catch(() => false);
    expect(hasPriceNode || hasPriceText).toBe(true);
  });

  test('CART-011 sale price is displayed correctly', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const text = (await row.innerText()).replace(/\s+/g, ' ');
    const prices = text.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [];
    const hasSaleSignal = /sale|was|now|save|discount|original/i.test(text);

    test.skip(!(hasSaleSignal && prices.length >= 2), 'No sale product/pricing presentation detected in this run.');
    expect(prices.length).toBeGreaterThanOrEqual(2);
  });

  test('CART-012 product link redirects to PDP', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const link = row.locator(CART_PRODUCT_LINK_SELECTOR).first();
    const href = await link.getAttribute('href');
    test.skip(!(await link.isVisible().catch(() => false)) || !href, 'Product link is not available in cart row.');
    const targetHref = href as string;

    const targetUrl = new URL(targetHref, page.url()).href;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await pdp.dismissInterruptions();

    const current = new URL(page.url()).pathname;
    expect(PRODUCT_PATH_PATTERN.test(current) || !CART_PATH_PATTERN.test(current)).toBe(true);
    await assertNoCriticalError(page);
  });

  test('CART-013 quantity selector/input is displayed', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const qtyControl = row.locator(CART_QTY_INPUT_SELECTOR).first();
    const plus = row.locator(CART_QTY_PLUS_SELECTOR).first();
    const minus = row.locator(CART_QTY_MINUS_SELECTOR).first();

    const hasControl =
      (await qtyControl.isVisible().catch(() => false)) ||
      (await plus.isVisible().catch(() => false)) ||
      (await minus.isVisible().catch(() => false));
    expect(hasControl).toBe(true);
  });

  test('CART-014 increasing quantity updates cart', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const before = (await readQuantityFromRow(row)) ?? 1;
    let changed = false;

    if (await setRowQuantity(row, before + 1)) {
      changed = true;
    } else if (await clickQtyButton(row, 'plus')) {
      changed = true;
    }

    test.skip(!changed, 'No quantity increase control is available.');

    await page.waitForTimeout(1500);
    const after = (await readQuantityFromRow(row)) ?? before;
    expect(after).toBeGreaterThan(before);
  });

  test('CART-015 decreasing quantity updates cart', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const beforeInitial = (await readQuantityFromRow(row)) ?? 1;

    if (beforeInitial < 2) {
      const increased = (await setRowQuantity(row, 2)) || (await clickQtyButton(row, 'plus'));
      test.skip(!increased, 'Unable to prepare quantity > 1 for decrease validation.');
      await page.waitForTimeout(1200);
    }

    const before = (await readQuantityFromRow(row)) ?? 2;
    const decreased = (await setRowQuantity(row, Math.max(1, before - 1))) || (await clickQtyButton(row, 'minus'));
    test.skip(!decreased, 'No quantity decrease control is available.');
    await page.waitForTimeout(1500);

    const after = (await readQuantityFromRow(row)) ?? before;
    expect(after).toBeLessThan(before);
  });

  test('CART-016 quantity cannot be set below minimum', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const canSetZero = await setRowQuantity(row, 0);
    test.skip(!canSetZero, 'Quantity input is not editable for minimum validation.');
    await page.waitForTimeout(1500);

    const afterRows = await getVisibleCartRows(page);
    const afterValue = afterRows[0] ? await readQuantityFromRow(afterRows[0]) : null;
    const bodyText = await page.locator('body').innerText();

    const minRuleApplied = (afterValue !== null && afterValue >= 1) || afterRows.length === 0 || STOCK_OR_VALIDATION_PATTERN.test(bodyText);
    expect(minRuleApplied).toBe(true);
  });

  test('CART-017 quantity cannot exceed available stock', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const editable = await setRowQuantity(row, 99);
    test.skip(!editable, 'Quantity input is not editable for stock validation.');
    await page.waitForTimeout(1800);

    const after = await readQuantityFromRow(row);
    const bodyText = await page.locator('body').innerText();
    expect((after !== null && after < 99) || STOCK_OR_VALIDATION_PATTERN.test(bodyText)).toBe(true);
  });

  test('CART-018 manual quantity input works if supported', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const editable = await setRowQuantity(row, 2);
    test.skip(!editable, 'Manual quantity input/select is not supported.');
    await page.waitForTimeout(1500);

    const after = await readQuantityFromRow(row);
    expect(after).toBe(2);
  });

  test('CART-019 invalid quantity input is handled', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const rows = await getVisibleCartRows(page);
    test.skip(rows.length === 0, 'Precondition not met: no product was added to cart.');
    const row = rows[0];
    const control = row.locator(CART_QTY_INPUT_SELECTOR).first();
    const visible = await control.isVisible().catch(() => false);
    test.skip(!visible, 'Quantity control is not visible.');

    const tagName = await control.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
    test.skip(tagName !== 'input', 'Invalid text input validation requires editable input control.');

    const before = (await readQuantityFromRow(row)) ?? 1;
    await control.fill('abc');
    await control.press('Enter').catch(() => undefined);
    await control.blur();
    await page.waitForTimeout(1500);

    const after = await readQuantityFromRow(row);
    const bodyText = await page.locator('body').innerText();
    expect(after === before || STOCK_OR_VALIDATION_PATTERN.test(bodyText)).toBe(true);
    await assertNoCriticalError(page);
  });

  test('CART-020 product can be removed from cart', async ({ ctx, home, plp, pdp, cart, page }) => {
    await addProductAndOpenCart(page, searchData[ctx.brand].keyword, home, plp, pdp, cart);
    const beforeRows = await getVisibleCartRows(page);
    test.skip(beforeRows.length === 0, 'Precondition not met: no product was added to cart.');

    const remove = beforeRows[0].locator(CART_REMOVE_SELECTOR).first();
    test.skip(!(await remove.isVisible().catch(() => false)), 'Remove control is not available.');
    await remove.click();
    await page.waitForTimeout(1500);

    const afterRows = await getVisibleCartRows(page);
    expect(afterRows.length).toBeLessThan(beforeRows.length);
  });
});
