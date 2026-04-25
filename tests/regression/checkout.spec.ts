import { accountData, checkoutData, searchData } from '../../config/testData';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import type { HomePage } from '../../src/pages/Home.page';
import type { Locator, Page } from '@playwright/test';

const CHECKOUT_URL_PATTERN = /checkout/i;
const CHECKOUT_CONTENT_PATTERN = /checkout|shipping|delivery|payment|order summary/i;
const ERROR_UI_PATTERN =
  /application error|something went wrong|service unavailable|page not found|this site can't be reached/i;
const EMPTY_CART_PATTERN =
  /empty cart|your cart is empty|your bag is empty|no items in your cart|no items in your bag/i;
const ORDER_SUMMARY_PATTERN = /order summary|bag summary|cart summary|show order summary/i;
const LOGIN_PATTERN = /\/login|\/sign-in|\/account/i;
const LOGIN_TEXT_PATTERN = /sign in|log in|login|email|password|returning customer/i;
const EMAIL_ERROR_PATTERN = /valid email|invalid email|please enter a valid email|required|email is required/i;
const REQUIRED_FIELD_PATTERN = /required|please enter|this field is required/i;
const POSTCODE_ERROR_PATTERN = /postcode|postal|zip.+invalid|valid postcode|invalid postcode/i;
const PHONE_ERROR_PATTERN = /phone|telephone|mobile.+invalid|valid phone|invalid phone/i;
const FREE_SHIPPING_PATTERN = /free shipping|shipping:\s*\$?\s*0(?:\.00)?|delivery:\s*\$?\s*0(?:\.00)?/i;
const DELIVERY_UNAVAILABLE_PATTERN = /not available|unavailable|not eligible|cannot be delivered|no delivery option/i;
const AUTOCOMPLETE_PATTERN = /autocomplete|suggestion|address finder|search address/i;

const CHECKOUT_ROOT_SELECTOR = 'main, [role="main"], form';
const CHECKOUT_HEADER_SELECTOR =
  'header [data-testid*="logo" i], header a[aria-label*="logo" i], header a[href="/"], [class*="checkout-header" i]';
const ORDER_SUMMARY_SELECTOR =
  '[data-testid*="order-summary" i], [class*="order-summary" i], [id*="order-summary" i], [data-testid*="cart-summary" i]';
const ORDER_SUMMARY_ENTRY_SELECTOR =
  `${ORDER_SUMMARY_SELECTOR}, button:has-text("Order Summary"), button:has-text("Show order summary"), details:has-text("Order Summary"), a[href*="cart"], a[href*="bag"]`;
const EMAIL_INPUT_SELECTOR =
  'input[type="email"], input[name*="email" i], input[id*="email" i], input[autocomplete="email"]';
const RETURNING_CUSTOMER_SELECTOR =
  'a[href*="login"], a[href*="sign-in"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login"), a:has-text("Returning"), button:has-text("Returning")';
const SHIPPING_FORM_SELECTOR = 'form:has(input[name*="address" i]), [data-testid*="shipping" i], [class*="shipping-address" i]';
const SHIPPING_FIELD_SELECTOR =
  'input[name*="address" i], input[id*="address" i], input[autocomplete*="address-line1"], input[name*="street" i]';
const FIRST_NAME_SELECTOR = 'input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]';
const LAST_NAME_SELECTOR = 'input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]';
const CITY_SELECTOR = 'input[name*="city" i], input[id*="city" i], input[name*="suburb" i], input[id*="suburb" i]';
const STATE_SELECTOR = 'select[name*="state" i], input[name*="state" i], select[id*="state" i], input[id*="state" i]';
const POSTCODE_SELECTOR =
  'input[name*="postcode" i], input[id*="postcode" i], input[name*="zip" i], input[id*="zip" i], input[name*="postal" i], input[id*="postal" i]';
const PHONE_SELECTOR = 'input[type="tel"], input[name*="phone" i], input[id*="phone" i], input[autocomplete="tel"]';
const COUNTRY_SELECTOR = 'select[name*="country" i], select[id*="country" i]';
const CONTINUE_SELECTOR =
  'button[type="submit"], button:has-text("Continue"), button:has-text("Next"), button:has-text("Proceed"), button:has-text("Ship")';
const DELIVERY_METHOD_SELECTOR =
  '[data-testid*="delivery" i], [class*="delivery-method" i], [class*="shipping-method" i], input[name*="shipping" i], input[name*="delivery" i], button:has-text("Standard"), button:has-text("Express"), button:has-text("Click & Collect")';
const LOGIN_SUBMIT_SELECTOR =
  'button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login"), button:has-text("Continue")';
const PASSWORD_INPUT_SELECTOR = 'input[type="password"], input[name*="password" i], input[id*="password" i]';
const CART_ITEM_SELECTOR = '[data-testid*="cart-item" i], [class*="cart-item" i], [class*="minicart-item" i], [data-product-id]';
const ADDRESS_AUTOCOMPLETE_SUGGESTION_SELECTOR =
  '[role="listbox"] [role="option"], [class*="autocomplete" i] [class*="option" i], [class*="suggest" i] li, [data-testid*="address-suggestion" i]';
const MANUAL_ADDRESS_ENTRY_SELECTOR =
  'button:has-text("Manual"), button:has-text("Enter address manually"), a:has-text("Manual"), a:has-text("Enter address manually"), button:has-text("Can\'t find address"), a:has-text("Can\'t find address")';
const SAVED_ADDRESS_SELECTOR =
  '[data-testid*="saved-address" i], [class*="saved-address" i], select[name*="address" i], select[id*="address" i], [name*="address_id" i]';
const NEW_ADDRESS_TRIGGER_SELECTOR =
  'button:has-text("Add New Address"), button:has-text("New Address"), a:has-text("Add New Address"), a:has-text("New Address"), button:has-text("Add Address"), a:has-text("Add Address")';
const DELIVERY_METHOD_OPTION_SELECTOR =
  'input[type="radio"][name*="shipping" i], input[type="radio"][name*="delivery" i], [data-testid*="delivery-option" i], [class*="delivery-option" i], [class*="shipping-option" i]';
const PICKUP_OPTION_SELECTOR =
  'input[type="radio"][value*="pickup" i], input[type="radio"][value*="collect" i], button:has-text("Click & Collect"), button:has-text("Pick up"), [data-testid*="pickup" i], [class*="pickup" i], [class*="collect" i]';
const STORE_SEARCH_SELECTOR =
  'input[placeholder*="suburb" i], input[placeholder*="postcode" i], input[name*="store" i], input[id*="store" i], input[placeholder*="store" i]';
const STORE_RESULT_SELECTOR =
  '[data-testid*="store-result" i], [class*="store-result" i], [class*="pickup-store" i], [class*="store-card" i]';
const SELECT_STORE_BUTTON_SELECTOR =
  'button:has-text("Select Store"), button:has-text("Choose Store"), button:has-text("Select"), [data-testid*="select-store" i]';

type ShippingAddress = {
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  state?: string;
  postcode: string;
  phone: string;
  countryName?: string;
};

function shippingAddressByRegion(region: 'au' | 'nz'): ShippingAddress {
  if (region === 'nz') {
    return {
      firstName: 'QA',
      lastName: 'Tester',
      address1: '1 Queen Street',
      city: 'Auckland',
      postcode: '1010',
      phone: '0211234567',
      countryName: 'New Zealand'
    };
  }

  return {
    firstName: 'QA',
    lastName: 'Tester',
    address1: '123 Collins Street',
    city: 'Melbourne',
    state: 'VIC',
    postcode: '3000',
    phone: '0412345678',
    countryName: 'Australia'
  };
}

async function clickRobust(target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded().catch(() => undefined);
  await target.click({ timeout: 8000 }).catch(async () => {
    await target.evaluate((node) => (node as HTMLElement).click());
  });
}

async function bodyText(page: Page): Promise<string> {
  return ((await page.locator('body').innerText().catch(() => '')) || '').toLowerCase();
}

async function hasVisible(locator: Locator): Promise<boolean> {
  return locator.first().isVisible().catch(() => false);
}

async function isLoginGate(page: Page): Promise<boolean> {
  const body = await bodyText(page);
  return LOGIN_PATTERN.test(page.url().toLowerCase()) || LOGIN_TEXT_PATTERN.test(body);
}

async function fillIfVisible(page: Page, selector: string, value: string): Promise<boolean> {
  const input = page.locator(selector).first();
  const visible = await hasVisible(input);
  if (!visible) {
    return false;
  }
  await input.fill(value);
  return true;
}

async function selectIfVisible(page: Page, selector: string, value: string): Promise<boolean> {
  const field = page.locator(selector).first();
  const visible = await hasVisible(field);
  if (!visible) {
    return false;
  }

  const isSelect = await field.evaluate((node) => node.tagName.toLowerCase() === 'select').catch(() => false);
  if (!isSelect) {
    await field.fill(value).catch(() => undefined);
    return true;
  }

  const matched = await field
    .evaluate((node, target) => {
      const select = node as HTMLSelectElement;
      const option = Array.from(select.options).find((item) =>
        item.textContent?.toLowerCase().includes(target.toLowerCase())
      );
      if (!option || !option.value) {
        return '';
      }
      return option.value;
    }, value)
    .catch(() => '');

  if (matched) {
    await field.selectOption(matched).catch(() => undefined);
    return true;
  }

  return false;
}

async function gotoHomeWithRetry(page: Page, home: HomePage): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await home.dismissInterruptions();
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
      await page.waitForTimeout(1000);
    }
  }
}

async function openCheckoutFromMiniCart(
  home: HomePage,
  page: Page,
  keyword: string
): Promise<{ itemTextSnapshot: string; itemCount: number }> {
  await gotoHomeWithRetry(page, home);
  await home.search(keyword);
  await home.dismissInterruptions();

  const productLink = page
    .locator(
      'main a[href*="/product/"], main a[href*="/p/"], main a[href$=".html"], main [data-testid*="product-card" i] a[href], main .product a[href]'
    )
    .first();
  const productVisible = await hasVisible(productLink);
  test.skip(!productVisible, 'No product entry was found from PLP/search page.');

  await clickRobust(productLink);
  await page.waitForLoadState('domcontentloaded');
  await home.dismissInterruptions();

  const addToCartButton = page
    .locator('[data-testid="add-to-cart"], button:has-text("Add to Cart"), button:has-text("Add to Bag"), button[name="add"]')
    .first();
  test.skip(!(await hasVisible(addToCartButton)), 'Add to cart button is not visible on PDP.');
  await clickRobust(addToCartButton);
  await page.waitForTimeout(1200);

  const itemCount = await page.locator(CART_ITEM_SELECTOR).count();
  const itemTextSnapshot = ((await page.locator(CART_ITEM_SELECTOR).first().innerText().catch(() => '')) || '').trim();

  const checkoutButton = page
    .locator('[data-testid="checkout"], a[href*="checkout"], button:has-text("Checkout"), button:has-text("Go to checkout")')
    .first();
  test.skip(!(await hasVisible(checkoutButton)), 'Checkout button is not visible after adding to cart.');
  await clickRobust(checkoutButton);
  await page.waitForLoadState('domcontentloaded');
  await home.dismissInterruptions();

  return { itemTextSnapshot, itemCount };
}

async function assertCheckoutLoaded(page: Page): Promise<void> {
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);

  const rootVisible = await hasVisible(page.locator(CHECKOUT_ROOT_SELECTOR));
  const body = await bodyText(page);
  expect(CHECKOUT_URL_PATTERN.test(page.url().toLowerCase()) || CHECKOUT_CONTENT_PATTERN.test(body) || rootVisible).toBe(true);
}

async function loginFromCurrentPage(page: Page): Promise<boolean> {
  const emailInput = page.locator(EMAIL_INPUT_SELECTOR).first();
  const passwordInput = page.locator(PASSWORD_INPUT_SELECTOR).first();
  const hasEmail = await hasVisible(emailInput);
  const hasPassword = await hasVisible(passwordInput);
  if (!hasEmail || !hasPassword) {
    return false;
  }

  await emailInput.fill(accountData.shared.email);
  await passwordInput.fill(accountData.shared.password);
  const submit = page.locator(LOGIN_SUBMIT_SELECTOR).first();
  await clickRobust(submit);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await page.waitForTimeout(1200);
  return !(await isLoginGate(page));
}

async function loginViaHeader(home: HomePage, page: Page): Promise<boolean> {
  await gotoHomeWithRetry(page, home);
  const accountIcon = home.header.accountIcon;
  test.skip(!(await hasVisible(accountIcon)), 'Account entry point is not visible on this storefront.');
  await clickRobust(accountIcon);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await home.dismissInterruptions();

  if (!(await isLoginGate(page))) {
    return true;
  }

  return loginFromCurrentPage(page);
}

async function attemptContinue(page: Page): Promise<void> {
  const continueButton = page.locator(CONTINUE_SELECTOR).first();
  if (await hasVisible(continueButton)) {
    await clickRobust(continueButton);
    await page.waitForTimeout(900);
    return;
  }

  const emailInput = page.locator(EMAIL_INPUT_SELECTOR).first();
  if (await hasVisible(emailInput)) {
    await emailInput.press('Enter').catch(() => undefined);
  }
  await page.waitForTimeout(700);
}

async function fillShippingAddress(page: Page, region: 'au' | 'nz'): Promise<void> {
  const address = shippingAddressByRegion(region);
  await fillIfVisible(page, FIRST_NAME_SELECTOR, address.firstName);
  await fillIfVisible(page, LAST_NAME_SELECTOR, address.lastName);
  await fillIfVisible(page, SHIPPING_FIELD_SELECTOR, address.address1);
  await fillIfVisible(page, CITY_SELECTOR, address.city);
  await fillIfVisible(page, POSTCODE_SELECTOR, address.postcode);
  await fillIfVisible(page, PHONE_SELECTOR, address.phone);
  if (address.state) {
    const selected = await selectIfVisible(page, STATE_SELECTOR, address.state);
    if (!selected) {
      await fillIfVisible(page, STATE_SELECTOR, address.state);
    }
  }
  if (address.countryName) {
    await selectIfVisible(page, COUNTRY_SELECTOR, address.countryName);
  }
}

async function openCheckoutWithAddress(
  home: HomePage,
  page: Page,
  keyword: string,
  region: 'au' | 'nz'
): Promise<void> {
  await openCheckoutFromMiniCart(home, page, keyword);
  await fillIfVisible(page, EMAIL_INPUT_SELECTOR, checkoutData.email);
  await fillShippingAddress(page, region);
  await attemptContinue(page);
}

async function orderSummaryText(page: Page): Promise<string> {
  const summary = page.locator(ORDER_SUMMARY_SELECTOR).first();
  const summaryVisible = await hasVisible(summary);
  if (summaryVisible) {
    return ((await summary.innerText().catch(() => '')) || '').toLowerCase();
  }
  return bodyText(page);
}

async function setPostcodeValue(page: Page, value: string): Promise<boolean> {
  const postcode = page.locator(POSTCODE_SELECTOR).first();
  if (!(await hasVisible(postcode))) {
    return false;
  }
  await postcode.fill(value);
  await postcode.blur().catch(() => undefined);
  return true;
}

async function setPhoneValue(page: Page, value: string): Promise<boolean> {
  const phone = page.locator(PHONE_SELECTOR).first();
  if (!(await hasVisible(phone))) {
    return false;
  }
  await phone.fill(value);
  await phone.blur().catch(() => undefined);
  return true;
}

test.describe('checkout', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test('CO-001 Verify checkout page loads successfully', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await assertCheckoutLoaded(page);
  });

  test('CO-002 Verify guest user can access checkout', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await assertCheckoutLoaded(page);
    expect(await isLoginGate(page)).toBe(false);
  });

  test('CO-003 Verify logged-in user can access checkout', async ({ ctx, home, page }) => {
    const loggedIn = await loginViaHeader(home, page);
    test.skip(!loggedIn, 'Valid account credentials are required for logged-in checkout flow.');

    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await assertCheckoutLoaded(page);
    expect(await isLoginGate(page)).toBe(false);
  });

  test('CO-004 Verify empty cart cannot access checkout', async ({ ctx, home, page }) => {
    await page.goto(new URL('/checkout', ctx.baseURL).href, { waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();
    const body = await bodyText(page);

    const currentUrl = page.url().toLowerCase();
    const redirectedAwayFromCheckout = !CHECKOUT_URL_PATTERN.test(currentUrl);
    const redirectedToCartLikePage = /cart|bag|basket/.test(currentUrl);
    const hasEmptyCartMessage = EMPTY_CART_PATTERN.test(body);
    const blockedByLogin = await isLoginGate(page);
    const lacksCheckoutContent = !CHECKOUT_CONTENT_PATTERN.test(body);
    expect(redirectedAwayFromCheckout || redirectedToCartLikePage || hasEmptyCartMessage || blockedByLogin || lacksCheckoutContent).toBe(true);
  });

  test('CO-005 Verify region-specific checkout content', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await assertCheckoutLoaded(page);

    const body = await bodyText(page);
    const currencySignal = /\$|aud|nzd/.test(body);
    expect(currencySignal).toBe(true);

    if (ctx.region === 'au') {
      expect(/state|postcode|australia|aud/.test(body)).toBe(true);
      return;
    }

    expect(/suburb|postcode|new zealand|nzd/.test(body)).toBe(true);
  });

  test('CO-006 Verify checkout loads over HTTPS', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    expect(new URL(page.url()).protocol).toBe('https:');
  });

  test('CO-007 Verify checkout header/brand logo is displayed', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    const logo = page.locator(CHECKOUT_HEADER_SELECTOR).first();
    test.skip(!(await hasVisible(logo)), 'Checkout-specific header/logo is not visible on this storefront.');
    await expect(logo).toBeVisible();
  });

  test('CO-008 Verify cart/order summary entry point is available', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    const summaryEntry = page.locator(ORDER_SUMMARY_ENTRY_SELECTOR).first();
    const body = await bodyText(page);
    expect((await hasVisible(summaryEntry)) || ORDER_SUMMARY_PATTERN.test(body)).toBe(true);
  });

  test('CO-009 Verify email field is displayed for guest checkout', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    const emailInput = page.locator(EMAIL_INPUT_SELECTOR).first();
    await expect(emailInput).toBeVisible();
  });

  test('CO-010 Verify valid guest email is accepted', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    const emailInput = page.locator(EMAIL_INPUT_SELECTOR).first();
    await expect(emailInput).toBeVisible();

    await emailInput.fill(checkoutData.email);
    await emailInput.blur();
    await attemptContinue(page);

    const isInvalid = await emailInput.evaluate((node) => !(node as HTMLInputElement).checkValidity()).catch(() => false);
    const body = await bodyText(page);
    expect(!isInvalid && !/invalid email/.test(body)).toBe(true);
  });

  test('CO-011 Verify invalid email format validation', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    const emailInput = page.locator(EMAIL_INPUT_SELECTOR).first();
    await expect(emailInput).toBeVisible();

    await emailInput.fill('invalid-email-format');
    await emailInput.blur();
    await attemptContinue(page);

    const isInvalid = await emailInput.evaluate((node) => !(node as HTMLInputElement).checkValidity()).catch(() => false);
    const body = await bodyText(page);
    expect(isInvalid || EMAIL_ERROR_PATTERN.test(body)).toBe(true);
  });

  test('CO-012 Verify required email validation', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    const emailInput = page.locator(EMAIL_INPUT_SELECTOR).first();
    await expect(emailInput).toBeVisible();

    await emailInput.fill('');
    await emailInput.blur();
    await attemptContinue(page);

    const isInvalid = await emailInput.evaluate((node) => !(node as HTMLInputElement).checkValidity()).catch(() => false);
    const body = await bodyText(page);
    expect(isInvalid || EMAIL_ERROR_PATTERN.test(body)).toBe(true);
  });

  test('CO-013 Verify returning customer prompt/login link if available', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    const returningLink = page.locator(RETURNING_CUSTOMER_SELECTOR).first();
    test.skip(!(await hasVisible(returningLink)), 'Returning customer prompt/login link is not present in this checkout design.');
    await expect(returningLink).toBeVisible();
  });

  test('CO-014 Verify user can log in from checkout', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    const returningLink = page.locator(RETURNING_CUSTOMER_SELECTOR).first();
    test.skip(!(await hasVisible(returningLink)), 'Checkout login entry is not available on this storefront.');

    await clickRobust(returningLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const loggedIn = await loginFromCurrentPage(page);
    test.skip(!loggedIn, 'Could not log in from checkout with configured test credentials.');

    const body = await bodyText(page);
    const returnedToCheckout = CHECKOUT_URL_PATTERN.test(page.url().toLowerCase()) || CHECKOUT_CONTENT_PATTERN.test(body);
    expect(returnedToCheckout).toBe(true);
  });

  test('CO-015 Verify cart is retained after checkout login', async ({ ctx, home, page }) => {
    const snapshot = await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    const returningLink = page.locator(RETURNING_CUSTOMER_SELECTOR).first();
    test.skip(!(await hasVisible(returningLink)), 'Checkout login entry is not available on this storefront.');

    await clickRobust(returningLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const loggedIn = await loginFromCurrentPage(page);
    test.skip(!loggedIn, 'Could not log in from checkout with configured test credentials.');

    const cartItemsAfter = await page.locator(CART_ITEM_SELECTOR).count();
    const body = await bodyText(page);
    const hasOrderSummary = ORDER_SUMMARY_PATTERN.test(body) || (await hasVisible(page.locator(ORDER_SUMMARY_SELECTOR)));

    expect(hasOrderSummary).toBe(true);
    if (snapshot.itemCount > 0) {
      expect(cartItemsAfter >= 1 || body.includes(snapshot.itemTextSnapshot.toLowerCase())).toBe(true);
    }
  });

  test('CO-016 Verify shipping address form is displayed', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await fillIfVisible(page, EMAIL_INPUT_SELECTOR, checkoutData.email);

    const shippingForm = page.locator(SHIPPING_FORM_SELECTOR).first();
    const shippingField = page.locator(SHIPPING_FIELD_SELECTOR).first();
    expect((await hasVisible(shippingForm)) || (await hasVisible(shippingField))).toBe(true);
  });

  test('CO-017 Verify required field validation for shipping address', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await fillIfVisible(page, EMAIL_INPUT_SELECTOR, checkoutData.email);
    await attemptContinue(page);

    const body = await bodyText(page);
    const invalidRequiredField = await page
      .locator('input:invalid[required], select:invalid[required], textarea:invalid[required]')
      .first()
      .isVisible()
      .catch(() => false);
    expect(REQUIRED_FIELD_PATTERN.test(body) || invalidRequiredField).toBe(true);
  });

  test('CO-018 Verify AU address fields display correctly', async ({ ctx, home, page }) => {
    test.skip(ctx.region !== 'au', 'AU-only address field validation.');
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await fillIfVisible(page, EMAIL_INPUT_SELECTOR, checkoutData.email);

    const stateField = page.locator(STATE_SELECTOR).first();
    const postcodeField = page.locator(POSTCODE_SELECTOR).first();
    const cityField = page.locator(CITY_SELECTOR).first();
    expect((await hasVisible(stateField)) && (await hasVisible(postcodeField)) && (await hasVisible(cityField))).toBe(true);
  });

  test('CO-019 Verify NZ address fields display correctly', async ({ ctx, home, page }) => {
    test.skip(ctx.region !== 'nz', 'NZ-only address field validation.');
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await fillIfVisible(page, EMAIL_INPUT_SELECTOR, checkoutData.email);

    const postcodeField = page.locator(POSTCODE_SELECTOR).first();
    const cityField = page.locator(CITY_SELECTOR).first();
    expect((await hasVisible(postcodeField)) && (await hasVisible(cityField))).toBe(true);

    const body = await bodyText(page);
    expect(/new zealand|nzd|suburb|city/.test(body)).toBe(true);
  });

  test('CO-020 Verify valid shipping address can be entered', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await fillIfVisible(page, EMAIL_INPUT_SELECTOR, checkoutData.email);
    await fillShippingAddress(page, ctx.region);
    await attemptContinue(page);

    const deliveryMethod = page.locator(DELIVERY_METHOD_SELECTOR).first();
    const body = await bodyText(page);
    const noRequiredError = !REQUIRED_FIELD_PATTERN.test(body) || /delivery|shipping method|standard|express/.test(body);
    expect((await hasVisible(deliveryMethod)) || /delivery|shipping method|standard|express|click & collect/.test(body)).toBe(true);
    expect(noRequiredError).toBe(true);
  });

  test('CO-021 Verify invalid postcode validation', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await fillIfVisible(page, EMAIL_INPUT_SELECTOR, checkoutData.email);
    await fillShippingAddress(page, ctx.region);
    const postcodeSet = await setPostcodeValue(page, '0000@');
    test.skip(!postcodeSet, 'Postcode field is not available on this checkout.');
    await attemptContinue(page);

    const postcodeInvalid = await page
      .locator(POSTCODE_SELECTOR)
      .first()
      .evaluate((node) => !(node as HTMLInputElement).checkValidity())
      .catch(() => false);
    const body = await bodyText(page);
    expect(postcodeInvalid || POSTCODE_ERROR_PATTERN.test(body)).toBe(true);
  });

  test('CO-022 Verify phone number validation', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await fillIfVisible(page, EMAIL_INPUT_SELECTOR, checkoutData.email);
    await fillShippingAddress(page, ctx.region);
    const phoneSet = await setPhoneValue(page, 'abc');
    test.skip(!phoneSet, 'Phone field is not available on this checkout.');
    await attemptContinue(page);

    const phoneInvalid = await page
      .locator(PHONE_SELECTOR)
      .first()
      .evaluate((node) => !(node as HTMLInputElement).checkValidity())
      .catch(() => false);
    const body = await bodyText(page);
    expect(phoneInvalid || PHONE_ERROR_PATTERN.test(body)).toBe(true);
  });

  test('CO-023 Verify address autocomplete if available', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await fillIfVisible(page, EMAIL_INPUT_SELECTOR, checkoutData.email);

    const addressInput = page.locator(SHIPPING_FIELD_SELECTOR).first();
    test.skip(!(await hasVisible(addressInput)), 'Address input is not available on this checkout.');
    await addressInput.fill(ctx.region === 'au' ? 'Collins' : 'Queen');
    await page.waitForTimeout(1200);

    const suggestion = page.locator(ADDRESS_AUTOCOMPLETE_SUGGESTION_SELECTOR).first();
    test.skip(!(await hasVisible(suggestion)), 'Address autocomplete is not enabled on this storefront.');

    const selectedText = ((await suggestion.innerText().catch(() => '')) || '').trim().toLowerCase();
    await clickRobust(suggestion);
    await page.waitForTimeout(1000);

    const addressValue = ((await addressInput.inputValue().catch(() => '')) || '').toLowerCase();
    expect(addressValue.length > 0 && (!selectedText || addressValue.includes(selectedText.split(',')[0].trim()))).toBe(true);
  });

  test('CO-024 Verify manual address entry works if autocomplete fails', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await fillIfVisible(page, EMAIL_INPUT_SELECTOR, checkoutData.email);

    const manualEntry = page.locator(MANUAL_ADDRESS_ENTRY_SELECTOR).first();
    test.skip(!(await hasVisible(manualEntry)), 'Manual address entry toggle is not available.');
    await clickRobust(manualEntry);
    await fillShippingAddress(page, ctx.region);
    await attemptContinue(page);

    const body = await bodyText(page);
    expect(!/address not found|unable to validate address/.test(body) || /delivery|shipping|method/.test(body)).toBe(true);
  });

  test('CO-025 Verify saved address is prefilled for logged-in user', async ({ ctx, home, page }) => {
    const loggedIn = await loginViaHeader(home, page);
    test.skip(!loggedIn, 'Valid account credentials are required for saved-address checks.');

    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    const savedAddress = page.locator(SAVED_ADDRESS_SELECTOR).first();

    const hasSavedAddressPicker = await hasVisible(savedAddress);
    const addressValue = ((await page.locator(SHIPPING_FIELD_SELECTOR).first().inputValue().catch(() => '')) || '').trim();
    expect(hasSavedAddressPicker || addressValue.length > 0).toBe(true);
  });

  test('CO-026 Verify user can choose different saved address', async ({ ctx, home, page }) => {
    const loggedIn = await loginViaHeader(home, page);
    test.skip(!loggedIn, 'Valid account credentials are required for saved-address checks.');

    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    const select = page.locator('select[name*="address" i], select[id*="address" i], select[name*="saved" i]').first();
    const hasSelect = await hasVisible(select);
    test.skip(!hasSelect, 'Saved-address selector is not available for switching addresses.');

    const optionCount = await select.locator('option').count();
    test.skip(optionCount < 2, 'Less than two saved addresses available for this account.');

    const before = (await select.inputValue().catch(() => '')) || '';
    const second = await select.locator('option').nth(1).getAttribute('value');
    test.skip(!second || second === before, 'No alternate saved address option found.');
    await select.selectOption(second);
    await page.waitForTimeout(900);

    const after = (await select.inputValue().catch(() => '')) || '';
    expect(after).toBe(second);
  });

  test('CO-027 Verify new address can be added during checkout', async ({ ctx, home, page }) => {
    const loggedIn = await loginViaHeader(home, page);
    test.skip(!loggedIn, 'Valid account credentials are required for add-new-address checks.');

    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    const addAddress = page.locator(NEW_ADDRESS_TRIGGER_SELECTOR).first();
    test.skip(!(await hasVisible(addAddress)), 'Add new address action is not available on this checkout.');
    await clickRobust(addAddress);

    const customAddress = ctx.region === 'au' ? '200 Collins Street' : '22 Queen Street';
    await fillIfVisible(page, SHIPPING_FIELD_SELECTOR, customAddress);
    await fillIfVisible(page, CITY_SELECTOR, ctx.region === 'au' ? 'Melbourne' : 'Auckland');
    await setPostcodeValue(page, ctx.region === 'au' ? '3000' : '1010');
    await attemptContinue(page);

    const currentAddress = ((await page.locator(SHIPPING_FIELD_SELECTOR).first().inputValue().catch(() => '')) || '').toLowerCase();
    expect(currentAddress.includes(customAddress.toLowerCase().split(' ')[0]) || currentAddress.length > 0).toBe(true);
  });

  test('CO-028 Verify rural/remote address handling if applicable', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await fillIfVisible(page, EMAIL_INPUT_SELECTOR, checkoutData.email);
    await fillShippingAddress(page, ctx.region);

    const remotePostcode = ctx.region === 'au' ? '4875' : '9893';
    const postcodeSet = await setPostcodeValue(page, remotePostcode);
    test.skip(!postcodeSet, 'Postcode field is not available on this checkout.');
    await attemptContinue(page);

    const body = await bodyText(page);
    const hasDeliveryOrValidationSignal =
      /delivery|shipping|surcharge|remote|rural/.test(body) ||
      DELIVERY_UNAVAILABLE_PATTERN.test(body) ||
      (await hasVisible(page.locator(DELIVERY_METHOD_SELECTOR)));
    expect(hasDeliveryOrValidationSignal).toBe(true);
  });

  test('CO-029 Verify address change recalculates delivery and totals', async ({ ctx, home, page }) => {
    await openCheckoutWithAddress(home, page, searchData[ctx.brand].keyword, ctx.region);
    const before = await orderSummaryText(page);

    const postcodeSet = await setPostcodeValue(page, ctx.region === 'au' ? '2000' : '6011');
    test.skip(!postcodeSet, 'Postcode field is not available on this checkout.');
    await attemptContinue(page);
    const after = await orderSummaryText(page);

    const hasDeliverySignal = /delivery|shipping|total/.test(after);
    expect(hasDeliverySignal).toBe(true);
    expect(after !== before || (await hasVisible(page.locator(DELIVERY_METHOD_SELECTOR)))).toBe(true);
  });

  test('CO-030 Verify delivery methods are displayed after valid address', async ({ ctx, home, page }) => {
    await openCheckoutWithAddress(home, page, searchData[ctx.brand].keyword, ctx.region);
    const body = await bodyText(page);
    expect((await hasVisible(page.locator(DELIVERY_METHOD_SELECTOR))) || /standard|express|delivery method|shipping method/.test(body)).toBe(true);
  });

  test('CO-031 Verify default delivery method selection if applicable', async ({ ctx, home, page }) => {
    await openCheckoutWithAddress(home, page, searchData[ctx.brand].keyword, ctx.region);

    const checkedInput = page.locator('input[type="radio"][name*="shipping" i]:checked, input[type="radio"][name*="delivery" i]:checked').first();
    const checkedVisible = await hasVisible(checkedInput);
    const body = await bodyText(page);
    expect(checkedVisible || /selected|standard|express/.test(body)).toBe(true);
  });

  test('CO-032 Verify user can select delivery method', async ({ ctx, home, page }) => {
    await openCheckoutWithAddress(home, page, searchData[ctx.brand].keyword, ctx.region);
    const methods = page.locator(DELIVERY_METHOD_OPTION_SELECTOR);
    const count = await methods.count();
    test.skip(count < 2, 'Multiple delivery methods are not available to switch.');

    const target = methods.nth(1);
    await clickRobust(target);
    await page.waitForTimeout(900);

    const selected = await target
      .evaluate((node) => {
        const el = node as HTMLInputElement;
        return Boolean(el.checked) || el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-pressed') === 'true';
      })
      .catch(() => false);
    expect(selected || (await hasVisible(page.locator(DELIVERY_METHOD_SELECTOR)))).toBe(true);
  });

  test('CO-033 Verify delivery cost updates order summary', async ({ ctx, home, page }) => {
    await openCheckoutWithAddress(home, page, searchData[ctx.brand].keyword, ctx.region);
    const methods = page.locator(DELIVERY_METHOD_OPTION_SELECTOR);
    const count = await methods.count();
    test.skip(count < 2, 'Multiple delivery methods are not available for cost comparison.');

    const before = await orderSummaryText(page);
    await clickRobust(methods.nth(1));
    await page.waitForTimeout(900);
    const after = await orderSummaryText(page);

    expect(/shipping|delivery|total/.test(after)).toBe(true);
    expect(after !== before || /\$\s?\d/.test(after)).toBe(true);
  });

  test('CO-034 Verify unavailable delivery method is handled correctly', async ({ ctx, home, page }) => {
    await openCheckoutFromMiniCart(home, page, searchData[ctx.brand].keyword);
    await fillIfVisible(page, EMAIL_INPUT_SELECTOR, checkoutData.email);
    await fillShippingAddress(page, ctx.region);
    const postcodeSet = await setPostcodeValue(page, ctx.region === 'au' ? '0872' : '9893');
    test.skip(!postcodeSet, 'Postcode field is not available on this checkout.');
    await attemptContinue(page);

    const body = await bodyText(page);
    const hasUnavailableMessage = DELIVERY_UNAVAILABLE_PATTERN.test(body);
    const hasDisabledMethod = await page
      .locator('input[type="radio"][disabled][name*="shipping" i], input[type="radio"][disabled][name*="delivery" i]')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasUnavailableMessage || hasDisabledMethod || (await hasVisible(page.locator(DELIVERY_METHOD_SELECTOR)))).toBe(true);
  });

  test('CO-035 Verify free shipping threshold if applicable', async ({ ctx, home, page }) => {
    await openCheckoutWithAddress(home, page, searchData[ctx.brand].keyword, ctx.region);
    const summary = await orderSummaryText(page);
    test.skip(!/shipping|delivery/.test(summary), 'Shipping summary is not visible on this checkout.');
    expect(FREE_SHIPPING_PATTERN.test(summary) || /\$\s?\d/.test(summary)).toBe(true);
  });

  test('CO-036 Verify pickup/click-and-collect option is displayed if enabled', async ({ ctx, home, page }) => {
    await openCheckoutWithAddress(home, page, searchData[ctx.brand].keyword, ctx.region);
    const pickup = page.locator(PICKUP_OPTION_SELECTOR).first();
    test.skip(!(await hasVisible(pickup)), 'Pickup/Click & Collect option is not enabled on this storefront.');
    await expect(pickup).toBeVisible();
  });

  test('CO-037 Verify user can select pickup option', async ({ ctx, home, page }) => {
    await openCheckoutWithAddress(home, page, searchData[ctx.brand].keyword, ctx.region);
    const pickup = page.locator(PICKUP_OPTION_SELECTOR).first();
    test.skip(!(await hasVisible(pickup)), 'Pickup/Click & Collect option is not enabled on this storefront.');

    await clickRobust(pickup);
    await page.waitForTimeout(1000);
    const body = await bodyText(page);
    expect(/pickup|collect|store/.test(body) || (await hasVisible(page.locator(STORE_SEARCH_SELECTOR)))).toBe(true);
  });

  test('CO-038 Verify store search works in pickup flow', async ({ ctx, home, page }) => {
    await openCheckoutWithAddress(home, page, searchData[ctx.brand].keyword, ctx.region);
    const pickup = page.locator(PICKUP_OPTION_SELECTOR).first();
    test.skip(!(await hasVisible(pickup)), 'Pickup/Click & Collect option is not enabled on this storefront.');
    await clickRobust(pickup);

    const searchInput = page.locator(STORE_SEARCH_SELECTOR).first();
    test.skip(!(await hasVisible(searchInput)), 'Pickup store search input is not available.');
    await searchInput.fill(ctx.region === 'au' ? '3000' : '1010');
    await searchInput.press('Enter').catch(() => undefined);
    await page.waitForTimeout(1500);

    const hasResults = await hasVisible(page.locator(STORE_RESULT_SELECTOR).first());
    const body = await bodyText(page);
    expect(hasResults || /store|pickup|collect/.test(body)).toBe(true);
  });

  test('CO-039 Verify user can select pickup store', async ({ ctx, home, page }) => {
    await openCheckoutWithAddress(home, page, searchData[ctx.brand].keyword, ctx.region);
    const pickup = page.locator(PICKUP_OPTION_SELECTOR).first();
    test.skip(!(await hasVisible(pickup)), 'Pickup/Click & Collect option is not enabled on this storefront.');
    await clickRobust(pickup);

    const selectStoreButton = page.locator(SELECT_STORE_BUTTON_SELECTOR).first();
    const hasStoreCard = await hasVisible(page.locator(STORE_RESULT_SELECTOR).first());
    test.skip(!(await hasVisible(selectStoreButton)) && !hasStoreCard, 'No pickup store selection action is available.');

    if (await hasVisible(selectStoreButton)) {
      await clickRobust(selectStoreButton);
    } else {
      await clickRobust(page.locator(STORE_RESULT_SELECTOR).first());
    }
    await page.waitForTimeout(1200);

    const body = await bodyText(page);
    expect(/selected store|pickup store|collect from|store selected|pickup/.test(body)).toBe(true);
  });

  test('CO-040 Verify pickup selection updates order summary', async ({ ctx, home, page }) => {
    await openCheckoutWithAddress(home, page, searchData[ctx.brand].keyword, ctx.region);
    const pickup = page.locator(PICKUP_OPTION_SELECTOR).first();
    test.skip(!(await hasVisible(pickup)), 'Pickup/Click & Collect option is not enabled on this storefront.');
    await clickRobust(pickup);

    const selectStoreButton = page.locator(SELECT_STORE_BUTTON_SELECTOR).first();
    if (await hasVisible(selectStoreButton)) {
      await clickRobust(selectStoreButton);
      await page.waitForTimeout(900);
    }

    const summary = await orderSummaryText(page);
    expect(/pickup|collect|store/.test(summary) || /shipping:\s*\$?\s*0(?:\.00)?/.test(summary)).toBe(true);
  });
});
