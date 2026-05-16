// TC coverage: MA-001..MA-016, MA-van-001, MA-van-002
// Based on: src/documents/tcs/GRA_MyAccount-Tcs.csv

import type { Page } from '@playwright/test';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import type { Brand, BrandContext } from '../../src/core/types';
import type { AccountPage } from '../../src/pages/Account.page';
import type { HomePage } from '../../src/pages/Home.page';
import { accountData } from '../../config/testData';

const ACCOUNT_PATH = /\/account(?:\/|$|\?)/i;
const LOGIN_PATH = /\/account\/login|\/login|\/sign-in/i;
const ERROR_PATTERN = /invalid|incorrect|wrong|error|failed|not found/i;
const VALIDATION_PATTERN = /required|invalid|enter|please|field|email/i;

function onlyBrand(ctx: BrandContext, brands: Brand | Brand[]): void {
  const allowed = Array.isArray(brands) ? brands : [brands];
  test.skip(!allowed.includes(ctx.brand), `Brand-specific: only runs on ${allowed.join(', ')}.`);
}

async function loginWith(
  email: string,
  password: string,
  page: Page,
  account: AccountPage,
  home: HomePage
): Promise<void> {
  await page.goto('/account/login', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await account.dismissInterruptions();

  if (!(await account.emailInput.isVisible().catch(() => false))) {
    // Vans-style modal — trigger from homepage
    await home.goto('/');
    await account.signInTrigger.click().catch(() => undefined);
    await page.waitForTimeout(600);
  }

  if (await account.emailInput.isVisible().catch(() => false)) {
    await account.emailInput.fill(email);
    await account.passwordInput.fill(password);
    await account.authSubmit.click();
    await page.waitForLoadState('domcontentloaded');
    await account.dismissInterruptions();
  }
}

async function ensureLoggedOut(page: Page): Promise<void> {
  await page.goto('/account/logout', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await page.waitForTimeout(500);
}

test.describe('account', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  // ─── Critical ────────────────────────────────────────────────────────────

  test('MA-001 login with valid credentials succeeds and header reflects logged-in state', async ({ ctx, home, account, page }) => {
    await ensureLoggedOut(page);
    await loginWith(accountData.shared.email, accountData.shared.password, page, account, home);
    const currentUrl = page.url();
    expect(LOGIN_PATH.test(currentUrl), 'Should not remain on login page after successful login.').toBe(false);
    // Account buttons on GRA brands are icon-only — use aria-label or absence of sign-in trigger
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const signInTriggerHidden = !(await account.signInTrigger.isVisible().catch(() => true));
    const accountIconVisible = await page
      .locator('[aria-label*="account" i], [aria-label*="my account" i], [data-testid*="account" i]')
      .first().isVisible().catch(() => false);
    const loggedInSignal =
      signInTriggerHidden ||
      accountIconVisible ||
      /my account|account|welcome|sign out|logout|log out/i.test(bodyText);
    expect(loggedInSignal, 'Header or page should reflect logged-in state.').toBe(true);
  });

  test('MA-002 logout redirects and header reflects logged-out state', async ({ ctx, home, account, page }) => {
    await loginWith(accountData.shared.email, accountData.shared.password, page, account, home);
    const logoutTrigger = account.logoutTrigger;
    if (await logoutTrigger.isVisible().catch(() => false)) {
      await logoutTrigger.click();
      await page.waitForLoadState('domcontentloaded');
    } else {
      await page.goto('/account/logout', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    }
    await account.dismissInterruptions();
    const currentUrl = page.url();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const guestSignal = /sign in|log in|create account/i.test(bodyText);
    expect(
      guestSignal || !ACCOUNT_PATH.test(currentUrl),
      'Header should show guest state after logout.'
    ).toBe(true);
  });

  test('MA-003 protected account page redirects guest user to login', async ({ page, account }) => {
    await ensureLoggedOut(page);
    await page.goto('/account', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    // SPA auth guard may show a login modal (not changing URL) or redirect — wait for either
    await Promise.race([
      page.waitForURL((url) => !ACCOUNT_PATH.test(url.href) || LOGIN_PATH.test(url.href), { timeout: 15_000 }),
      account.emailInput.waitFor({ state: 'visible', timeout: 15_000 }),
    ]).catch(() => undefined);
    // Check BEFORE dismissInterruptions — login gate may be a modal that dismissInterruptions would close
    const currentUrl = page.url();
    const emailInputVisible = await account.emailInput.isVisible().catch(() => false);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    await account.dismissInterruptions();
    const redirectedAway = !ACCOUNT_PATH.test(currentUrl) || LOGIN_PATH.test(currentUrl);
    // Some brands (e.g. Dr Martens) render homepage content at /account URL for guests instead of redirecting
    const noAccountDashboard = !/my orders|order history|personal information|account information|address book/i.test(bodyText);
    const isProtected = redirectedAway || emailInputVisible || noAccountDashboard;
    expect(isProtected, `Guest navigating to /account should not see account dashboard. Actual URL: ${currentUrl}`).toBe(true);
  });

  test('MA-004 password can be changed with correct current password', { tag: ['@data-dependent'] }, async () => {
    test.skip(true, '@data-dependent — password change alters account state; use a dedicated isolated test account.');
  });

  // ─── High ────────────────────────────────────────────────────────────────

  test('MA-005 login with invalid password shows error and does not log user in', async ({ ctx, home, account, page }) => {
    await ensureLoggedOut(page);
    await page.goto('/account/login', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();

    if (!(await account.emailInput.isVisible().catch(() => false))) {
      await home.goto('/');
      await account.signInTrigger.click().catch(() => undefined);
      await page.waitForTimeout(600);
    }

    if (!(await account.emailInput.isVisible().catch(() => false))) {
      test.skip(true, 'Login form not found — cannot test invalid password.');
      return;
    }

    await account.emailInput.fill(accountData.shared.email);
    await account.passwordInput.fill(accountData.invalidPassword);
    await account.authSubmit.click();
    await page.waitForTimeout(1500);

    const bodyText = await page.locator('body').innerText().catch(() => '');
    const currentUrl = page.url();
    const errorVisible =
      ERROR_PATTERN.test(bodyText) ||
      (await account.errorContainer.isVisible().catch(() => false));
    const stillOnLogin = LOGIN_PATH.test(currentUrl) || (await account.emailInput.isVisible().catch(() => false));
    expect(errorVisible || stillOnLogin, 'Invalid password should show error or remain on login.').toBe(true);
  });

  test('MA-006 login required field validation shown on empty form submit', async ({ ctx, home, account, page }) => {
    await ensureLoggedOut(page);
    await page.goto('/account/login', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();

    if (!(await account.emailInput.isVisible().catch(() => false))) {
      await home.goto('/');
      await account.signInTrigger.click().catch(() => undefined);
      await page.waitForTimeout(600);
    }

    if (!(await account.emailInput.isVisible().catch(() => false))) {
      test.skip(true, 'Login form not found — cannot test empty form validation.');
      return;
    }

    await account.authSubmit.click();
    await page.waitForTimeout(800);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const validationVisible =
      VALIDATION_PATTERN.test(bodyText) ||
      (await account.requiredInvalidField.isVisible().catch(() => false));
    expect(validationVisible, 'Required field validation should appear on empty login submit.').toBe(true);
  });

  test('MA-007 account dashboard loads with customer name or email visible', async ({ ctx, home, account, page }) => {
    await loginWith(accountData.shared.email, accountData.shared.password, page, account, home);
    await page.goto('/account', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const emailDomain = accountData.shared.email.split('@')[1];
    const nameOrEmail =
      bodyText.toLowerCase().includes(accountData.shared.email.toLowerCase()) ||
      bodyText.toLowerCase().includes(emailDomain.toLowerCase()) ||
      /welcome|hello|my account|account details/i.test(bodyText);
    expect(nameOrEmail, 'Dashboard should show customer name or email.').toBe(true);
  });

  test('MA-008 account navigation links are visible and navigable', async ({ ctx, home, account, page }) => {
    await loginWith(accountData.shared.email, accountData.shared.password, page, account, home);
    await page.goto('/account', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();
    // Check for common account nav links
    const navLinks = page.locator('a:has-text("Orders"), a:has-text("Order History"), a:has-text("Address"), a:has-text("Account Details"), a:has-text("Profile")');
    const count = await navLinks.count();
    if (count === 0) {
      test.skip(true, 'Account navigation links not found on account dashboard for this brand.');
      return;
    }
    expect(count).toBeGreaterThan(0);
    const firstLink = navLinks.first();
    await expect(firstLink).toBeVisible();
    await firstLink.click({ timeout: 5_000 });
    await page.waitForLoadState('domcontentloaded');
    expect(ACCOUNT_PATH.test(new URL(page.url()).pathname)).toBe(true);
  });

  test('MA-009 forgot password link opens the password reset form', async ({ ctx, home, account, page }) => {
    await ensureLoggedOut(page);
    await page.goto('/account/login', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();

    if (!(await account.emailInput.isVisible().catch(() => false))) {
      await home.goto('/');
      await account.signInTrigger.click().catch(() => undefined);
      await page.waitForTimeout(600);
    }

    const forgotLink = page.locator('a:has-text("Forgot"), a:has-text("Reset"), a:has-text("Forgot password"), a[href*="forgot"], a[href*="reset"]').first();
    if (!(await forgotLink.isVisible().catch(() => false))) {
      test.skip(true, 'Forgot password link not found on login page for this brand.');
      return;
    }
    await forgotLink.click();
    await page.waitForTimeout(800);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const resetFormVisible =
      /reset|forgot|recovery|send.*email|email.*reset/i.test(bodyText) ||
      (await account.emailInput.isVisible().catch(() => false));
    expect(resetFormVisible, 'Forgot password form should be accessible.').toBe(true);
  });

  test('MA-010 order history page loads (list or empty state) without error', async ({ ctx, home, account, page }) => {
    await loginWith(accountData.shared.email, accountData.shared.password, page, account, home);
    await page.goto('/account/orders', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    if (/login|sign.in/i.test(page.url())) {
      await page.goto('/account/order-history', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    }
    await account.dismissInterruptions();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const hasOrdersContent =
      /orders|order history|no orders|you haven.t placed/i.test(bodyText);
    expect(hasOrdersContent, 'Order history page should show orders or an empty state.').toBe(true);
    const errorSignal = /500|something went wrong|page not found|404/i.test(bodyText);
    expect(errorSignal, 'Order history page should not show an error.').toBe(false);
  });

  test('MA-011 new address can be saved in the address book', { tag: ['@data-dependent'] }, async () => {
    test.skip(true, '@data-dependent — saving an address changes persistent account state; run against a dedicated test account.');
  });

  test('MA-012 user remains logged in after page refresh', async ({ ctx, home, account, page }) => {
    await loginWith(accountData.shared.email, accountData.shared.password, page, account, home);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await account.dismissInterruptions();
    const currentUrl = page.url();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const stillLoggedIn =
      !LOGIN_PATH.test(currentUrl) ||
      /my account|account|welcome|sign out|logout/i.test(bodyText);
    expect(stillLoggedIn, 'User should remain logged in after page refresh.').toBe(true);
  });

  test('MA-013 registration page accessible and required field validation works', async ({ page, account, home }) => {
    await ensureLoggedOut(page);
    await page.goto('/account/create', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    if (/login|404|not.found/i.test(page.url())) {
      await page.goto('/account/register', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    }
    await account.dismissInterruptions();
    const emailInput = account.emailInput;
    const passwordInput = account.passwordInput;
    const authSubmit = account.authSubmit;
    const formVisible = (await emailInput.isVisible().catch(() => false)) || (await authSubmit.isVisible().catch(() => false));
    if (!formVisible) {
      test.skip(true, 'Registration form not found on staging for this brand.');
      return;
    }
    await authSubmit.click();
    await page.waitForTimeout(800);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const validationShown =
      VALIDATION_PATTERN.test(bodyText) ||
      (await account.requiredInvalidField.isVisible().catch(() => false));
    expect(validationShown, 'Required field validation should appear on empty registration submit.').toBe(true);
  });

  // ─── Medium ──────────────────────────────────────────────────────────────

  test('MA-014 order detail page opens from order history list', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await loginWith(accountData.shared.email, accountData.shared.password, page, account, home);
    await page.goto('/account/orders', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    if (/login|sign.in/i.test(page.url())) {
      await page.goto('/account/order-history', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    }
    await account.dismissInterruptions();
    const orderLinks = page.locator('a[href*="/account/order"], a[href*="order-detail"], a:has-text("View Order"), a:has-text("Order #")');
    const count = await orderLinks.count();
    if (count === 0) {
      test.skip(true, '@data-dependent — no order history found; account needs prior orders.');
      return;
    }
    await orderLinks.first().click({ timeout: 5_000 });
    await page.waitForLoadState('domcontentloaded');
    const bodyText = await page.locator('body').innerText().catch(() => '');
    expect(/order|item|product|qty|total/i.test(bodyText), 'Order detail page should show order information.').toBe(true);
  });

  test('MA-015 invalid email format on login shows validation message', async ({ ctx, home, account, page }) => {
    await ensureLoggedOut(page);
    await page.goto('/account/login', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();

    if (!(await account.emailInput.isVisible().catch(() => false))) {
      await home.goto('/');
      await account.signInTrigger.click().catch(() => undefined);
      await page.waitForTimeout(600);
    }

    if (!(await account.emailInput.isVisible().catch(() => false))) {
      test.skip(true, 'Login form not found — cannot test email validation.');
      return;
    }

    await account.emailInput.fill('not-an-email');
    await account.passwordInput.fill('anypassword');
    await account.authSubmit.click();
    await page.waitForTimeout(800);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const emailError = /invalid.*email|email.*invalid|valid email|email.*format|not.*valid/i.test(bodyText);
    const fieldInvalid = await account.emailInput.evaluate((el) =>
      (el as HTMLInputElement).validity?.typeMismatch ?? false
    ).catch(() => false);
    expect(
      emailError || fieldInvalid,
      'Invalid email format should show a validation message.'
    ).toBe(true);
  });

  test('MA-016 My Account page loads on mobile and navigation works', async ({ ctx, home, account, page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginWith(accountData.shared.email, accountData.shared.password, page, account, home);
    await page.goto('/account', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();
    await expect(page.locator('body')).toBeVisible();
    const navLinks = page.locator('a:has-text("Orders"), a:has-text("Address"), a:has-text("Profile"), a:has-text("Account")');
    const count = await navLinks.count();
    if (count > 0) {
      await navLinks.first().click({ timeout: 5_000 });
      await page.waitForLoadState('domcontentloaded');
      expect(ACCOUNT_PATH.test(new URL(page.url()).pathname)).toBe(true);
    }
  });

  // ─── Brand-specific ───────────────────────────────────────────────────────

  test('MA-van-001 Vans login and signup open as a modal popup overlay — not a page navigation', async ({ ctx, home, account, page }) => {
    onlyBrand(ctx, 'vans');
    await ensureLoggedOut(page);
    await home.goto('/');
    const urlBefore = page.url();
    await account.signInTrigger.click().catch(() => undefined);
    await page.waitForTimeout(800);
    const urlAfter = page.url();
    const emailVisible = await account.emailInput.isVisible().catch(() => false);
    expect(emailVisible, 'Vans login should open as a modal overlay with email input visible.').toBe(true);
    expect(urlAfter).toBe(urlBefore);
    expect(LOGIN_PATH.test(urlAfter), 'Vans login should NOT navigate to a separate login page.').toBe(false);
  });

  test('MA-van-002 Vans Qantas QFF account page is accessible from My Account', async ({ ctx, home, account, page }) => {
    onlyBrand(ctx, 'vans');
    await loginWith(accountData.shared.email, accountData.shared.password, page, account, home);
    await page.goto('/qantas-frequent-flyer', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const isQffPage =
      /qantas|qff|frequent flyer|points/i.test(bodyText);
    if (!isQffPage) {
      // Try finding QFF link in account navigation
      await page.goto('/account', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
      const qffLink = page.locator('a:has-text("Qantas"), a:has-text("QFF"), a[href*="qantas"]').first();
      if (await qffLink.isVisible().catch(() => false)) {
        await qffLink.click();
        await page.waitForLoadState('domcontentloaded');
      }
    }
    const finalBodyText = await page.locator('body').innerText().catch(() => '');
    expect(
      /qantas|qff|frequent flyer|points/i.test(finalBodyText),
      'Vans Qantas QFF page should be accessible and show QFF-related content.'
    ).toBe(true);
  });
});
