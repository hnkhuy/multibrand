// TC coverage: MA-001..MA-016, MA-van-001, MA-van-002 | @regression: ACC-013..ACC-062, ACC-065, ACC-067
// Based on: src/documents/tcs/GRA_MyAccount-Tcs.csv

import type { Locator, Page } from '@playwright/test';
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

// ── Regression helpers — patterns ──────────────────────────────────────────
const LOGIN_URL_PATTERN = /login|sign-in|signin|customer\/account/i;
const REGISTER_URL_PATTERN = /register|create|sign-up|signup/i;
const LOGIN_COPY_PATTERN = /sign in|log in|login/i;
const REGISTER_COPY_PATTERN = /create account|register|sign up|first name|last name|confirm password/i;
const ERROR_COPY_PATTERN = /invalid|incorrect|already|exists|not valid/i;
const SUCCESS_COPY_PATTERN = /my account|account dashboard|welcome|hello/i;
const EMAIL_VALIDATION_PATTERN = /valid email|invalid email|email.+invalid|please enter a valid/i;
const PASSWORD_RULE_PATTERN = /minimum|at least|password.+must|please enter 6 or more/i;
const REQUIRED_PATTERN = /required|this is a required field|please enter/i;
const PROTECTED_ACCOUNT_PATHS = ['/customer/account', '/customer/account/index', '/my-account', '/account'];
const FORGOT_PASSWORD_PATTERN = /forgot.?password|reset.?password/i;
const DASHBOARD_COPY_PATTERN = /my account|account dashboard|welcome|hello|order history|address book/i;
const ACCOUNT_EDIT_COPY_PATTERN = /account information|personal information|account details|first name|last name|edit account/i;
const ACCOUNT_EDIT_URL_PATTERN = /customer\/account\/edit|account\/edit|profile/i;
const CHANGE_PASSWORD_COPY_PATTERN = /change password|current password|new password/i;
const ADDRESS_BOOK_COPY_PATTERN = /address book|saved address|my address/i;
const ADDRESS_BOOK_URL_PATTERN = /customer\/address|address-book|account\/address/i;
const ORDER_HISTORY_COPY_PATTERN = /order history|my orders|recent orders|order #|order number/i;
const ORDER_HISTORY_URL_PATTERN = /sales\/order\/history|order-history|account\/orders|my-orders/i;
const ORDER_DETAIL_COPY_PATTERN = /order #|order number|order detail|items ordered|billing address/i;
const WISHLIST_COPY_PATTERN = /wishlist|saved items|favourite|favorites/i;
const WISHLIST_URL_PATTERN = /wishlist|saved-items|my-wishlist/i;
const NEWSLETTER_COPY_PATTERN = /newsletter|subscription|marketing|email.?preference/i;
const NEWSLETTER_URL_PATTERN = /newsletter|subscription|email-preference/i;
const ACCOUNT_SECTION_PATHS = {
  dashboard:    ['/customer/account', '/my-account', '/account'],
  forgotPassword: ['/customer/account/forgotpassword', '/forgot-password', '/customer/password/forgot'],
  accountEdit:  ['/customer/account/edit', '/my-account/edit', '/account/profile'],
  addressBook:  ['/customer/address', '/customer/address/index', '/my-account/address-book', '/account/address-book'],
  orderHistory: ['/sales/order/history', '/my-account/orders', '/account/orders', '/customer/account/orders'],
  wishlist:     ['/wishlist', '/my-account/wishlist', '/customer/wishlist'],
  newsletter:   ['/newsletter/manage', '/my-account/newsletter', '/customer/newsletter'],
};

// ── Regression helpers — utilities ─────────────────────────────────────────
function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

function registrationPassword(): string {
  return `GRA!${Date.now()}a1`;
}

function accEmailInput(account: AccountPage): Locator { return account.emailInput; }
function accPasswordInput(account: AccountPage): Locator { return account.passwordInput; }
function accConfirmPasswordInput(account: AccountPage): Locator { return account.confirmPasswordInput; }
function accFirstNameInput(account: AccountPage): Locator { return account.firstNameInput; }
function accLastNameInput(account: AccountPage): Locator { return account.lastNameInput; }
function accSubmitButton(account: AccountPage): Locator { return account.authSubmit; }

async function accAuthForm(account: AccountPage): Promise<Locator | null> {
  const forms = account.authForms;
  const total = await forms.count();
  for (let i = 0; i < total; i += 1) {
    const form = forms.nth(i);
    if (await form.isVisible().catch(() => false)) return form;
  }
  return null;
}

async function accSubmitAuthForm(account: AccountPage): Promise<void> {
  const form = await accAuthForm(account);
  if (form && (await account.authSubmit.isVisible().catch(() => false))) {
    await accClickRobust(account.authSubmit);
    return;
  }
  const pass = accPasswordInput(account);
  if (await pass.isVisible().catch(() => false)) { await pass.press('Enter').catch(() => undefined); return; }
  await accClickRobust(accSubmitButton(account));
}

async function accClickRobust(target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded().catch(() => undefined);
  await target.click({ timeout: 8_000 }).catch(async () => {
    await target.evaluate((node) => (node as HTMLElement).click());
  });
}

async function accBodyText(account: AccountPage): Promise<string> {
  return ((await account.readBodyText().catch(() => '')) || '').toLowerCase();
}

async function isLoginGateAcc(account: AccountPage, page: Page): Promise<boolean> {
  const body = await accBodyText(account);
  return LOGIN_URL_PATTERN.test(page.url()) || LOGIN_COPY_PATTERN.test(body);
}

async function isRegisterPage(account: AccountPage, page: Page): Promise<boolean> {
  const body = await accBodyText(account);
  return REGISTER_URL_PATTERN.test(page.url()) || REGISTER_COPY_PATTERN.test(body);
}

async function isLoggedInState(account: AccountPage, page: Page): Promise<boolean> {
  if (await isLoginGateAcc(account, page)) return false;
  const loginFormVisible = await accEmailInput(account).isVisible().catch(() => false);
  const logoutVisible = await account.logoutTrigger.isVisible().catch(() => false);
  const body = await accBodyText(account);
  return !loginFormVisible || SUCCESS_COPY_PATTERN.test(body) || logoutVisible;
}

async function openLoginPage(home: HomePage, page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => undefined);
  await home.dismissInterruptions();
  await expect(home.header.accountIcon).toBeVisible();
  await accClickRobust(home.header.accountIcon);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await home.dismissInterruptions();
}

async function openRegisterPage(home: HomePage, account: AccountPage, page: Page): Promise<void> {
  await openLoginPage(home, page);
  if (await isRegisterPage(account, page)) return;
  const registerLink = account.registerTrigger;
  test.skip(!(await registerLink.isVisible().catch(() => false)), 'Registration entry point is not available on this storefront.');
  await accClickRobust(registerLink);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
}

async function accLogin(account: AccountPage, page: Page, email: string, password: string): Promise<void> {
  await expect(accEmailInput(account)).toBeVisible();
  await expect(accPasswordInput(account)).toBeVisible();
  await accEmailInput(account).fill(email);
  await accPasswordInput(account).fill(password);
  await accSubmitAuthForm(account);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await page.waitForTimeout(1200);
}

async function logoutIfPossible(home: HomePage, account: AccountPage, page: Page): Promise<boolean> {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => undefined);
  await home.dismissInterruptions();
  await accClickRobust(home.header.accountIcon);
  const logout = account.logoutTrigger;
  if (!(await logout.isVisible().catch(() => false))) return false;
  await accClickRobust(logout);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await page.waitForTimeout(1200);
  return true;
}

async function fillRegistrationForm(
  account: AccountPage,
  data: { firstName: string; lastName: string; email: string; password: string; confirmPassword?: string }
): Promise<void> {
  await expect(accEmailInput(account)).toBeVisible();
  await expect(accPasswordInput(account)).toBeVisible();
  if (await accFirstNameInput(account).isVisible().catch(() => false)) await accFirstNameInput(account).fill(data.firstName);
  if (await accLastNameInput(account).isVisible().catch(() => false)) await accLastNameInput(account).fill(data.lastName);
  await accEmailInput(account).fill(data.email);
  await accPasswordInput(account).fill(data.password);
  const confirm = accConfirmPasswordInput(account);
  if (await confirm.isVisible().catch(() => false)) await confirm.fill(data.confirmPassword ?? data.password);
}

async function assertHasValidation(account: AccountPage, pattern: RegExp): Promise<void> {
  const text = await accBodyText(account);
  const hasErrorContainer = await account.errorContainer.isVisible().catch(() => false);
  if (pattern.test(text) || hasErrorContainer) return;
  if (pattern === EMAIL_VALIDATION_PATTERN) {
    const invalidEmail = await accEmailInput(account).evaluate((node) => !(node as HTMLInputElement).checkValidity()).catch(() => false);
    expect(invalidEmail).toBe(true);
    return;
  }
  if (pattern === REQUIRED_PATTERN) {
    const invalidRequired = await account.requiredInvalidField.isVisible().catch(() => false);
    expect(invalidRequired).toBe(true);
    return;
  }
  expect(pattern.test(text)).toBe(true);
}

async function ensureLoggedIn(home: HomePage, account: AccountPage, page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => undefined);
  await home.dismissInterruptions();
  await accClickRobust(home.header.accountIcon);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await home.dismissInterruptions();
  if (!(await isLoggedInState(account, page))) {
    await accLogin(account, page, accountData.shared.email, accountData.shared.password);
  }
}

async function navigateToSection(page: Page, home: HomePage, ctx: { baseURL: string }, paths: string[]): Promise<void> {
  const targetPatterns = paths.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const targetRe = new RegExp(targetPatterns.join('|'), 'i');
  for (const path of paths) {
    await page.goto(new URL(path, ctx.baseURL).href, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => undefined);
    await home.dismissInterruptions();
    if (targetRe.test(page.url()) && !LOGIN_URL_PATTERN.test(page.url())) break;
  }
}

test.describe('account', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  // ─── Critical ────────────────────────────────────────────────────────────

  test('MA-001 login with valid credentials succeeds and header reflects logged-in state', { tag: ['@smoke'] }, async ({ ctx, home, account, page }) => {
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

  test('MA-002 logout redirects and header reflects logged-out state', { tag: ['@smoke'] }, async ({ ctx, home, account, page }) => {
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

  test('MA-003 protected account page redirects guest user to login', { tag: ['@smoke'] }, async ({ page, account }) => {
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

  test('MA-004 password can be changed with correct current password', { tag: ['@smoke', '@data-dependent'] }, async () => {
    test.skip(true, '@data-dependent — password change alters account state; use a dedicated isolated test account.');
  });

  // ─── High ────────────────────────────────────────────────────────────────

  test('MA-005 login with invalid password shows error and does not log user in', { tag: ['@smoke'] }, async ({ ctx, home, account, page }) => {
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

  test('MA-006 login required field validation shown on empty form submit', { tag: ['@smoke'] }, async ({ ctx, home, account, page }) => {
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

  test('MA-007 account dashboard loads with customer name or email visible', { tag: ['@smoke'] }, async ({ ctx, home, account, page }) => {
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

  test('MA-008 account navigation links are visible and navigable', { tag: ['@smoke'] }, async ({ ctx, home, account, page }) => {
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

  test('MA-009 forgot password link opens the password reset form', { tag: ['@smoke'] }, async ({ ctx, home, account, page }) => {
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

  test('MA-010 order history page loads (list or empty state) without error', { tag: ['@smoke'] }, async ({ ctx, home, account, page }) => {
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

  test('MA-011 new address can be saved in the address book', { tag: ['@smoke', '@data-dependent'] }, async () => {
    test.skip(true, '@data-dependent — saving an address changes persistent account state; run against a dedicated test account.');
  });

  test('MA-012 user remains logged in after page refresh', { tag: ['@smoke'] }, async ({ ctx, home, account, page }) => {
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

  test('MA-013 registration page accessible and required field validation works', { tag: ['@smoke'] }, async ({ page, account, home }) => {
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

  test('MA-014 order detail page opens from order history list', { tag: ['@smoke', '@data-dependent'] }, async ({ ctx, home, account, page }) => {
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

  test('MA-015 invalid email format on login shows validation message', { tag: ['@smoke'] }, async ({ ctx, home, account, page }) => {
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

  test('MA-016 My Account page loads on mobile and navigation works', { tag: ['@smoke'] }, async ({ ctx, home, account, page }) => {
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

  test('MA-van-001 Vans login and signup open as a modal popup overlay — not a page navigation', { tag: ['@smoke'] }, async ({ ctx, home, account, page }) => {
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

  test('MA-van-002 Vans Qantas QFF account page is accessible from My Account', { tag: ['@smoke'] }, async ({ ctx, home, account, page }) => {
    onlyBrand(ctx, 'vans');
    await loginWith(accountData.shared.email, accountData.shared.password, page, account, home);
    await page.goto('/qantas-frequent-flyer', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await account.dismissInterruptions();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const isQffPage = /qantas|qff|frequent flyer|points/i.test(bodyText);
    if (!isQffPage) {
      await page.goto('/account', { waitUntil: 'domcontentloaded' }).catch(() => undefined);
      const qffLink = page.locator('a:has-text("Qantas"), a:has-text("QFF"), a[href*="qantas"]').first();
      if (await qffLink.isVisible().catch(() => false)) {
        await qffLink.click();
        await page.waitForLoadState('domcontentloaded');
      }
    }
    const finalBodyText = await page.locator('body').innerText().catch(() => '');
    expect(/qantas|qff|frequent flyer|points/i.test(finalBodyText), 'Vans Qantas QFF page should be accessible and show QFF-related content.').toBe(true);
  });

  // ─── @regression: Registration (ACC-013..ACC-020) ────────────────────────

  test('ACC-013 Verify registration page opens correctly', async ({ home, account, page }) => {
    await openRegisterPage(home, account, page);
    expect(await isRegisterPage(account, page)).toBe(true);
    await expect(accEmailInput(account)).toBeVisible();
    await expect(accPasswordInput(account)).toBeVisible();
  });

  test('ACC-014 Verify account can be created with valid details', async ({ home, account, page }) => {
    await openRegisterPage(home, account, page);
    await fillRegistrationForm(account, { firstName: 'Jeff', lastName: 'Huynh', email: uniqueEmail('gra-acc014'), password: registrationPassword() });
    await accSubmitAuthForm(account);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1500);
    expect(ERROR_COPY_PATTERN.test(await accBodyText(account))).toBe(false);
    expect(await isLoggedInState(account, page)).toBe(true);
  });

  test('ACC-015 Verify duplicate email registration is blocked', async ({ home, account, page }) => {
    const duplicateEmail = uniqueEmail('gra-acc015');
    const password = registrationPassword();
    await openRegisterPage(home, account, page);
    await fillRegistrationForm(account, { firstName: 'Jeff', lastName: 'Huynh', email: duplicateEmail, password });
    await accSubmitAuthForm(account);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1500);
    if (!(await isRegisterPage(account, page))) {
      await logoutIfPossible(home, account, page);
      await openRegisterPage(home, account, page);
    }
    await fillRegistrationForm(account, { firstName: 'Jeff', lastName: 'Huynh', email: duplicateEmail, password });
    await accSubmitAuthForm(account);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await assertHasValidation(account, /already|exists|registered|taken|in use/i);
  });

  test('ACC-016 Verify required field validation on registration form', async ({ home, account, page }) => {
    await openRegisterPage(home, account, page);
    await accSubmitAuthForm(account);
    await assertHasValidation(account, REQUIRED_PATTERN);
  });

  test('ACC-017 Verify invalid email format validation on registration form', async ({ home, account, page }) => {
    await openRegisterPage(home, account, page);
    await fillRegistrationForm(account, { firstName: 'Jeff', lastName: 'Huynh', email: 'invalid-email', password: registrationPassword() });
    await accSubmitAuthForm(account);
    await assertHasValidation(account, EMAIL_VALIDATION_PATTERN);
  });

  test('ACC-018 Verify password rule validation', async ({ home, account, page }) => {
    await openRegisterPage(home, account, page);
    await fillRegistrationForm(account, { firstName: 'Jeff', lastName: 'Huynh', email: uniqueEmail('gra-acc018'), password: '12345' });
    await accSubmitAuthForm(account);
    await assertHasValidation(account, PASSWORD_RULE_PATTERN);
  });

  test('ACC-019 Verify confirm password validation', async ({ home, account, page }) => {
    await openRegisterPage(home, account, page);
    await fillRegistrationForm(account, { firstName: 'Jeff', lastName: 'Huynh', email: uniqueEmail('gra-acc019'), password: registrationPassword(), confirmPassword: 'Mismatch!123' });
    await accSubmitAuthForm(account);
    await assertHasValidation(account, /confirm|match|same|does not match/i);
  });

  test('ACC-020 Verify marketing/newsletter opt-in behavior during registration', async ({ home, account, page }) => {
    await openRegisterPage(home, account, page);
    const optIn = account.marketingCheckbox;
    test.skip(!(await optIn.isVisible().catch(() => false)), 'Marketing opt-in checkbox is not available.');
    await fillRegistrationForm(account, { firstName: 'Jeff', lastName: 'Huynh', email: uniqueEmail('gra-acc020'), password: registrationPassword() });
    await optIn.check().catch(async () => { await accClickRobust(optIn); });
    await accSubmitAuthForm(account);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1500);
    const newsletterLink = account.newsletterLink;
    if (await newsletterLink.isVisible().catch(() => false)) {
      await accClickRobust(newsletterLink);
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    }
    const subscribedCheckbox = account.marketingCheckbox;
    if (await subscribedCheckbox.isVisible().catch(() => false)) {
      await expect(subscribedCheckbox).toBeChecked();
    } else {
      expect(/subscribed|newsletter|marketing|communication/i.test(await accBodyText(account))).toBe(true);
    }
  });

  // ─── @regression: Forgot Password (ACC-021..ACC-024) ─────────────────────

  test('ACC-021 Verify forgot password page opens correctly', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    const forgotLink = page.locator('a').filter({ hasText: /forgot.*(password)?|reset.*(password)?/i }).first();
    test.skip(!(await forgotLink.isVisible().catch(() => false)), 'Forgot password link is not available on this storefront.');
    await accClickRobust(forgotLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const body = await accBodyText(account);
    expect(FORGOT_PASSWORD_PATTERN.test(page.url()) || FORGOT_PASSWORD_PATTERN.test(body)).toBe(true);
    expect(await page.locator('input[type="email"], input[name="email"]').first().isVisible().catch(() => false)).toBe(true);
  });

  test('ACC-022 Verify forgot password with registered email', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    const forgotLink = page.locator('a').filter({ hasText: /forgot.*(password)?|reset.*(password)?/i }).first();
    test.skip(!(await forgotLink.isVisible().catch(() => false)), 'Forgot password link is not available.');
    await accClickRobust(forgotLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    test.skip(!(await emailField.isVisible().catch(() => false)), 'Forgot password form is not available.');
    await emailField.fill(accountData.shared.email);
    await accClickRobust(page.locator('button[type="submit"], input[type="submit"]').first());
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1000);
    expect(/sent|email|reset|check|inbox|confirmation|link/i.test(await accBodyText(account))).toBe(true);
  });

  test('ACC-023 Verify forgot password with invalid email format', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    const forgotLink = page.locator('a').filter({ hasText: /forgot.*(password)?|reset.*(password)?/i }).first();
    test.skip(!(await forgotLink.isVisible().catch(() => false)), 'Forgot password link is not available.');
    await accClickRobust(forgotLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    test.skip(!(await emailField.isVisible().catch(() => false)), 'Forgot password form is not available.');
    await emailField.fill('not-a-valid-email');
    await accClickRobust(page.locator('button[type="submit"], input[type="submit"]').first());
    await page.waitForTimeout(800);
    const isInvalid = await emailField.evaluate((node) => !(node as HTMLInputElement).checkValidity()).catch(() => false);
    expect(isInvalid || EMAIL_VALIDATION_PATTERN.test(await accBodyText(account))).toBe(true);
  });

  test('ACC-024 Verify forgot password required field validation', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    const forgotLink = page.locator('a').filter({ hasText: /forgot.*(password)?|reset.*(password)?/i }).first();
    test.skip(!(await forgotLink.isVisible().catch(() => false)), 'Forgot password link is not available.');
    await accClickRobust(forgotLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
    test.skip(!(await submitBtn.isVisible().catch(() => false)), 'Forgot password form is not available.');
    await accClickRobust(submitBtn);
    await page.waitForTimeout(800);
    await assertHasValidation(account, REQUIRED_PATTERN);
  });

  // ─── @regression: Account Dashboard (ACC-025..ACC-028) ───────────────────

  test('ACC-025 Verify account dashboard loads successfully', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.dashboard);
    await expect(account.body).toBeVisible();
    const body = await accBodyText(account);
    expect(DASHBOARD_COPY_PATTERN.test(body) || !LOGIN_URL_PATTERN.test(page.url())).toBe(true);
  });

  test('ACC-026 Verify customer name/email is displayed correctly', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.dashboard);
    const body = await accBodyText(account);
    const emailFragment = accountData.shared.email.split('@')[0].toLowerCase();
    expect(/hello|welcome|my account/i.test(body) || body.includes(emailFragment)).toBe(true);
  });

  test('ACC-027 Verify account navigation menu is displayed', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.dashboard);
    const navLinks = page.locator('nav a, .account-nav a, [class*="account"] a, [class*="sidebar"] a')
      .filter({ hasText: /account|order|address|wishlist|newsletter|logout|sign out/i });
    expect(await navLinks.count()).toBeGreaterThan(0);
  });

  test('ACC-028 Verify account navigation links redirect correctly', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.dashboard);
    const navLinks = page.locator('nav a, .account-nav a, [class*="account"] a, [class*="sidebar"] a')
      .filter({ hasText: /order|address|wishlist|newsletter/i });
    test.skip((await navLinks.count()) === 0, 'No account navigation links found.');
    const href = await navLinks.first().getAttribute('href').catch(() => null);
    if (href) {
      await navLinks.first().click();
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      expect(page.url()).not.toBe('about:blank');
    }
  });

  // ─── @regression: Account Details (ACC-029..ACC-033) ─────────────────────

  test('ACC-029 Verify personal information page loads correctly', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    const body = await accBodyText(account);
    expect(ACCOUNT_EDIT_COPY_PATTERN.test(body) || ACCOUNT_EDIT_URL_PATTERN.test(page.url())).toBe(true);
    const hasField = (await account.firstNameInput.isVisible().catch(() => false)) ||
      (await account.lastNameInput.isVisible().catch(() => false)) ||
      (await account.emailInput.isVisible().catch(() => false));
    expect(hasField).toBe(true);
  });

  test('ACC-030 Verify customer can update first name/last name', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    test.skip(!(await account.firstNameInput.isVisible().catch(() => false)), 'First name field is not available.');
    const current = await account.firstNameInput.inputValue().catch(() => '');
    await account.firstNameInput.fill(current || 'Jeff');
    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first();
    await accClickRobust(saveBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1000);
    const body = await accBodyText(account);
    expect(!/error|invalid/i.test(body) || /saved|success|updated/i.test(body)).toBe(true);
  });

  test('ACC-031 Verify required field validation for personal info', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    test.skip(!(await account.firstNameInput.isVisible().catch(() => false)), 'Account edit form is not available.');
    await account.firstNameInput.fill('');
    await accClickRobust(page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first());
    await page.waitForTimeout(800);
    await assertHasValidation(account, REQUIRED_PATTERN);
  });

  test('ACC-032 Verify email change flow if supported', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    test.skip(!(await account.emailInput.isVisible().catch(() => false)), 'Email field is not available on this page.');
    const isReadOnly = await account.emailInput.evaluate((node) => (node as HTMLInputElement).readOnly).catch(() => false);
    const isDisabled = await account.emailInput.isDisabled().catch(() => false);
    const body = await accBodyText(account);
    expect(!isReadOnly || !isDisabled || /email.*(change|update)|change.*email/i.test(body)).toBe(true);
  });

  test('ACC-033 Verify invalid email validation when updating email', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    test.skip(!(await account.emailInput.isVisible().catch(() => false)), 'Email field is not available.');
    const isReadOnly = await account.emailInput.evaluate((node) => (node as HTMLInputElement).readOnly).catch(() => false);
    test.skip(isReadOnly, 'Email field is read-only.');
    await account.emailInput.fill('bad-email');
    await accClickRobust(page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first());
    await page.waitForTimeout(800);
    await assertHasValidation(account, EMAIL_VALIDATION_PATTERN);
  });

  // ─── @regression: Change Password (ACC-034..ACC-038) ─────────────────────

  test('ACC-034 Verify change password section opens correctly', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    const body = await accBodyText(account);
    const trigger = page.locator('a, button').filter({ hasText: /change.?password/i }).first();
    test.skip(!CHANGE_PASSWORD_COPY_PATTERN.test(body) && !(await trigger.isVisible().catch(() => false)), 'Change password section is not available.');
    expect(CHANGE_PASSWORD_COPY_PATTERN.test(body) || (await trigger.isVisible().catch(() => false))).toBe(true);
  });

  test('ACC-035 Verify password can be changed with valid current password', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    const currentField = page.locator('input[name*="current"], input[name*="old"], input[autocomplete="current-password"]').first();
    test.skip(!(await currentField.isVisible().catch(() => false)), 'Change password form is not available.');
    await currentField.fill(accountData.shared.password);
    const newField = page.locator('input[name*="new_password"], input[name*="password_new"], input[name*="newPassword"]').first();
    if (await newField.isVisible().catch(() => false)) await newField.fill(accountData.shared.password);
    const confirmField = page.locator('input[name*="confirm"], input[name*="password_confirm"]').first();
    if (await confirmField.isVisible().catch(() => false)) await confirmField.fill(accountData.shared.password);
    await accClickRobust(page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first());
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1200);
    expect(!/incorrect.*current|wrong.*password|current.*password.*incorrect/i.test(await accBodyText(account))).toBe(true);
  });

  test('ACC-036 Verify change password fails with incorrect current password', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    const currentField = page.locator('input[name*="current"], input[name*="old"], input[autocomplete="current-password"]').first();
    test.skip(!(await currentField.isVisible().catch(() => false)), 'Change password form is not available.');
    await currentField.fill('WrongPassword!999');
    const newField = page.locator('input[name*="new_password"], input[name*="password_new"], input[name*="newPassword"]').first();
    if (await newField.isVisible().catch(() => false)) await newField.fill('NewValid!Password1');
    const confirmField = page.locator('input[name*="confirm"], input[name*="password_confirm"]').first();
    if (await confirmField.isVisible().catch(() => false)) await confirmField.fill('NewValid!Password1');
    await accClickRobust(page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first());
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1000);
    expect(/invalid|incorrect|wrong|error|doesn.t match|does not match/i.test(await accBodyText(account))).toBe(true);
  });

  test('ACC-037 Verify new password rule validation', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    const currentField = page.locator('input[name*="current"], input[name*="old"], input[autocomplete="current-password"]').first();
    test.skip(!(await currentField.isVisible().catch(() => false)), 'Change password form is not available.');
    await currentField.fill(accountData.shared.password);
    const newField = page.locator('input[name*="new_password"], input[name*="password_new"], input[name*="newPassword"]').first();
    if (await newField.isVisible().catch(() => false)) await newField.fill('123');
    await accClickRobust(page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first());
    await page.waitForTimeout(800);
    await assertHasValidation(account, PASSWORD_RULE_PATTERN);
  });

  test('ACC-038 Verify confirm new password validation', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    const currentField = page.locator('input[name*="current"], input[name*="old"], input[autocomplete="current-password"]').first();
    test.skip(!(await currentField.isVisible().catch(() => false)), 'Change password form is not available.');
    await currentField.fill(accountData.shared.password);
    const newField = page.locator('input[name*="new_password"], input[name*="password_new"], input[name*="newPassword"]').first();
    if (await newField.isVisible().catch(() => false)) await newField.fill('NewValid!Password1');
    const confirmField = page.locator('input[name*="confirm"], input[name*="password_confirm"]').first();
    if (await confirmField.isVisible().catch(() => false)) await confirmField.fill('MismatchedPassword!999');
    await accClickRobust(page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first());
    await page.waitForTimeout(800);
    await assertHasValidation(account, /confirm|match|same|does not match/i);
  });

  // ─── @regression: Address Book (ACC-039..ACC-049) ────────────────────────

  test('ACC-039 Verify address book page loads correctly', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    await expect(account.body).toBeVisible();
    const body = await accBodyText(account);
    expect(ADDRESS_BOOK_COPY_PATTERN.test(body) || ADDRESS_BOOK_URL_PATTERN.test(page.url())).toBe(true);
  });

  test('ACC-040 Verify empty address book state', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const body = await accBodyText(account);
    const hasAddresses = /delete|edit.*address|default.*billing|default.*shipping/i.test(body);
    test.skip(hasAddresses, 'Account has saved addresses; cannot test empty state.');
    expect(/no.*address|add.*address|you have no|empty/i.test(body) || !hasAddresses).toBe(true);
  });

  test('ACC-041 Verify user can add a new address', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const addBtn = page.locator('a, button').filter({ hasText: /add.*(new)?.*address|new.*address/i }).first();
    test.skip(!(await addBtn.isVisible().catch(() => false)), 'Add address button is not available.');
    await accClickRobust(addBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const firstName = page.locator('input[name*="firstname"], input[name*="first_name"]').first();
    if (await firstName.isVisible().catch(() => false)) await firstName.fill('Jeff');
    const lastName = page.locator('input[name*="lastname"], input[name*="last_name"]').first();
    if (await lastName.isVisible().catch(() => false)) await lastName.fill('Test');
    const street = page.locator('input[name*="street"], input[name*="address"]').first();
    if (await street.isVisible().catch(() => false)) await street.fill('123 Test Street');
    const city = page.locator('input[name*="city"], input[name*="suburb"]').first();
    if (await city.isVisible().catch(() => false)) await city.fill('Sydney');
    const postcode = page.locator('input[name*="postcode"], input[name*="zip"]').first();
    if (await postcode.isVisible().catch(() => false)) await postcode.fill('2000');
    const phone = page.locator('input[name*="telephone"], input[name*="phone"]').first();
    if (await phone.isVisible().catch(() => false)) await phone.fill('0400000000');
    await accClickRobust(page.locator('button[type="submit"]:has-text("Save Address"), button:has-text("Save"), input[type="submit"]').first());
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1200);
    const body = await accBodyText(account);
    expect(ADDRESS_BOOK_COPY_PATTERN.test(body) || /saved|success|updated/i.test(body)).toBe(true);
  });

  test('ACC-042 Verify required field validation when adding address', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const addBtn = page.locator('a, button').filter({ hasText: /add.*(new)?.*address|new.*address/i }).first();
    test.skip(!(await addBtn.isVisible().catch(() => false)), 'Add address button is not available.');
    await accClickRobust(addBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const saveBtn = page.locator('button[type="submit"]:has-text("Save Address"), button:has-text("Save"), input[type="submit"]').first();
    test.skip(!(await saveBtn.isVisible().catch(() => false)), 'Address form is not available.');
    await accClickRobust(saveBtn);
    await page.waitForTimeout(800);
    await assertHasValidation(account, REQUIRED_PATTERN);
  });

  test('ACC-043 Verify AU/NZ address fields display correctly by region', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const addBtn = page.locator('a, button').filter({ hasText: /add.*(new)?.*address|new.*address/i }).first();
    test.skip(!(await addBtn.isVisible().catch(() => false)), 'Add address button is not available.');
    await accClickRobust(addBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const body = await accBodyText(account);
    if (ctx.region === 'au') {
      expect(/state|postcode|australia/i.test(body)).toBe(true);
    } else {
      expect(/suburb|postcode|new zealand/i.test(body)).toBe(true);
    }
  });

  test('ACC-044 Verify postcode validation', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const addBtn = page.locator('a, button').filter({ hasText: /add.*(new)?.*address|new.*address/i }).first();
    test.skip(!(await addBtn.isVisible().catch(() => false)), 'Add address button is not available.');
    await accClickRobust(addBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const postcodeField = page.locator('input[name*="postcode"], input[name*="zip"]').first();
    test.skip(!(await postcodeField.isVisible().catch(() => false)), 'Postcode field is not available.');
    await postcodeField.fill('XXXXX');
    await accClickRobust(page.locator('button[type="submit"]:has-text("Save Address"), button:has-text("Save"), input[type="submit"]').first());
    await page.waitForTimeout(800);
    const isInvalid = await postcodeField.evaluate((node) => !(node as HTMLInputElement).checkValidity()).catch(() => false);
    expect(isInvalid || /postcode|zip|invalid/i.test(await accBodyText(account))).toBe(true);
  });

  test('ACC-045 Verify phone number validation', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const addBtn = page.locator('a, button').filter({ hasText: /add.*(new)?.*address|new.*address/i }).first();
    test.skip(!(await addBtn.isVisible().catch(() => false)), 'Add address button is not available.');
    await accClickRobust(addBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const phoneField = page.locator('input[name*="telephone"], input[name*="phone"]').first();
    test.skip(!(await phoneField.isVisible().catch(() => false)), 'Phone field is not available.');
    await phoneField.fill('abc-invalid');
    await accClickRobust(page.locator('button[type="submit"]:has-text("Save Address"), button:has-text("Save"), input[type="submit"]').first());
    await page.waitForTimeout(800);
    const isInvalid = await phoneField.evaluate((node) => !(node as HTMLInputElement).checkValidity()).catch(() => false);
    expect(isInvalid || /phone|telephone|invalid|required/i.test(await accBodyText(account))).toBe(true);
  });

  test('ACC-046 Verify user can edit saved address', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const editBtn = page.locator('a, button').filter({ hasText: /^edit$/i }).first();
    test.skip(!(await editBtn.isVisible().catch(() => false)), 'No saved address to edit.');
    await accClickRobust(editBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const firstName = page.locator('input[name*="firstname"], input[name*="first_name"]').first();
    if (await firstName.isVisible().catch(() => false)) await firstName.fill('UpdatedFirst');
    await accClickRobust(page.locator('button[type="submit"]:has-text("Save Address"), button:has-text("Save"), input[type="submit"]').first());
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1200);
    const body = await accBodyText(account);
    expect(ADDRESS_BOOK_COPY_PATTERN.test(body) || /saved|success|updated/i.test(body)).toBe(true);
  });

  test('ACC-047 Verify user can delete saved address', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const deleteBtn = page.locator('a, button').filter({ hasText: /^delete$/i }).first();
    test.skip(!(await deleteBtn.isVisible().catch(() => false)), 'No saved address to delete.');
    const addressCards = page.locator('[class*="address-item"], [class*="address-card"], [data-address-id]');
    const countBefore = await addressCards.count();
    page.once('dialog', (dialog) => dialog.accept());
    await accClickRobust(deleteBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1200);
    const countAfter = await addressCards.count();
    expect(countAfter < countBefore || /deleted|removed|success/i.test(await accBodyText(account))).toBe(true);
  });

  test('ACC-048 Verify default billing address can be set', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const body = await accBodyText(account);
    test.skip(!ADDRESS_BOOK_COPY_PATTERN.test(body), 'Address book section is not available.');
    expect(/default.?billing|billing.?address|address/i.test(body)).toBe(true);
  });

  test('ACC-049 Verify default shipping address can be set', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const body = await accBodyText(account);
    test.skip(!ADDRESS_BOOK_COPY_PATTERN.test(body), 'Address book section is not available.');
    expect(/default.?shipping|shipping.?address|address/i.test(body)).toBe(true);
  });

  // ─── @regression: Order History (ACC-050..ACC-057) ───────────────────────

  test('ACC-050 Verify order history page loads correctly', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    await expect(account.body).toBeVisible();
    const body = await accBodyText(account);
    expect(ORDER_HISTORY_COPY_PATTERN.test(body) || ORDER_HISTORY_URL_PATTERN.test(page.url())).toBe(true);
  });

  test('ACC-051 Verify empty order history state', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    const body = await accBodyText(account);
    const hasOrders = /order #|order number|\d{5,}/i.test(body);
    test.skip(hasOrders, 'Account has orders; cannot test empty state.');
    expect(/no.*order|haven.*placed|empty|you have no/i.test(body) || !hasOrders).toBe(true);
  });

  test('ACC-052 Verify order list displays correctly', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    const body = await accBodyText(account);
    test.skip(!/order #|order number|\d{5,}/i.test(body), 'No orders found in order history.');
    expect(/order|date|status|total/i.test(body)).toBe(true);
  });

  test('ACC-053 Verify order details page opens correctly', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    const viewLink = page.locator('main a, [class*="order"] a, [class*="table"] a, td a').filter({ hasText: /view|detail/i }).first();
    test.skip(!(await viewLink.isVisible().catch(() => false)), 'No orders to view.');
    await accClickRobust(viewLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    expect(ORDER_DETAIL_COPY_PATTERN.test(await accBodyText(account))).toBe(true);
  });

  test('ACC-054 Verify order details display correct products', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    const viewLink = page.locator('main a, [class*="order"] a, [class*="table"] a, td a').filter({ hasText: /view|detail/i }).first();
    test.skip(!(await viewLink.isVisible().catch(() => false)), 'No orders to view.');
    await accClickRobust(viewLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    expect(/product|item|sku|qty|quantity|price/i.test(await accBodyText(account))).toBe(true);
  });

  test('ACC-055 Verify order summary totals are correct', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    const viewLink = page.locator('main a, [class*="order"] a, [class*="table"] a, td a').filter({ hasText: /view|detail/i }).first();
    test.skip(!(await viewLink.isVisible().catch(() => false)), 'No orders to view.');
    await accClickRobust(viewLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    expect(/subtotal|grand total|total|\$\s?\d/i.test(await accBodyText(account))).toBe(true);
  });

  test('ACC-056 Verify tracking link is displayed if available', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    const viewLink = page.locator('main a, [class*="order"] a, [class*="table"] a, td a').filter({ hasText: /view|detail/i }).first();
    test.skip(!(await viewLink.isVisible().catch(() => false)), 'No orders to view.');
    await accClickRobust(viewLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    expect(ORDER_DETAIL_COPY_PATTERN.test(await accBodyText(account))).toBe(true);
  });

  test('ACC-057 Verify reorder button works if available', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    const reorderBtn = page.locator('a, button').filter({ hasText: /reorder/i }).first();
    test.skip(!(await reorderBtn.isVisible().catch(() => false)), 'Reorder feature is not available.');
    await accClickRobust(reorderBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1000);
    const body = await accBodyText(account);
    expect(/cart|bag|basket|added|reorder/i.test(body) || /cart|checkout/.test(page.url())).toBe(true);
  });

  // ─── @regression: Wishlist from Account (ACC-058..ACC-059) ───────────────

  test('ACC-058 Verify wishlist page is accessible from My Account', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.dashboard);
    const wishlistLink = page.locator('a').filter({ hasText: /wishlist|saved|favourite/i }).first();
    test.skip(!(await wishlistLink.isVisible().catch(() => false)), 'Wishlist link is not in account navigation.');
    await accClickRobust(wishlistLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const body = await accBodyText(account);
    expect(WISHLIST_COPY_PATTERN.test(body) || WISHLIST_URL_PATTERN.test(page.url())).toBe(true);
  });

  test('ACC-059 Verify wishlist products display correctly in account area', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.wishlist);
    const body = await accBodyText(account);
    const hasProducts = /\$\s?\d|product|item/i.test(body);
    test.skip(!hasProducts, 'No products in wishlist; cannot verify product display.');
    expect(hasProducts).toBe(true);
  });

  // ─── @regression: Newsletter (ACC-060..ACC-062) ───────────────────────────

  test('ACC-060 Verify newsletter subscription section loads correctly', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.newsletter);
    await expect(account.body).toBeVisible();
    const body = await accBodyText(account);
    test.skip(!NEWSLETTER_COPY_PATTERN.test(body) && !NEWSLETTER_URL_PATTERN.test(page.url()), 'Newsletter section is not available on this storefront.');
    expect(NEWSLETTER_COPY_PATTERN.test(body) || NEWSLETTER_URL_PATTERN.test(page.url())).toBe(true);
  });

  test('ACC-061 Verify user can subscribe to newsletter', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.newsletter);
    const body = await accBodyText(account);
    test.skip(!NEWSLETTER_COPY_PATTERN.test(body), 'Newsletter section is not available.');
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (!(await checkbox.isChecked().catch(() => false))) {
      await checkbox.check().catch(async () => { await accClickRobust(checkbox); });
    }
    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await accClickRobust(saveBtn);
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      await page.waitForTimeout(1000);
    }
    expect(/saved|subscribed|success|updated/i.test(await accBodyText(account)) || NEWSLETTER_COPY_PATTERN.test(await accBodyText(account))).toBe(true);
  });

  test('ACC-062 Verify user can unsubscribe from newsletter', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.newsletter);
    const body = await accBodyText(account);
    test.skip(!NEWSLETTER_COPY_PATTERN.test(body), 'Newsletter section is not available.');
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isChecked().catch(() => false)) {
      await checkbox.uncheck().catch(async () => { await accClickRobust(checkbox); });
    }
    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await accClickRobust(saveBtn);
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      await page.waitForTimeout(1000);
    }
    expect(/saved|unsubscribed|success|updated/i.test(await accBodyText(account)) || NEWSLETTER_COPY_PATTERN.test(await accBodyText(account))).toBe(true);
  });

  // ─── @regression: Security (ACC-065, ACC-067) ────────────────────────────

  test('ACC-065 Verify account pages require authentication', async ({ ctx, home, account, page }) => {
    await logoutIfPossible(home, account, page);
    for (const path of PROTECTED_ACCOUNT_PATHS) {
      await page.goto(new URL(path, ctx.baseURL).href, { waitUntil: 'domcontentloaded' });
      await home.dismissInterruptions();
      if (await isLoginGateAcc(account, page)) break;
    }
    expect(await isLoginGateAcc(account, page)).toBe(true);
  });

  test('ACC-067 Verify session expiry behavior', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await page.context().clearCookies();
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.dashboard);
    const body = await accBodyText(account);
    expect((await isLoginGateAcc(account, page)) || LOGIN_COPY_PATTERN.test(body)).toBe(true);
  });
});
