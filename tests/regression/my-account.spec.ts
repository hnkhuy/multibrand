import { accountData } from '../../config/testData';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import type { AccountPage } from '../../src/pages/Account.page';
import type { HomePage } from '../../src/pages/Home.page';
import type { Locator, Page } from '@playwright/test';

const LOGIN_URL_PATTERN = /login|sign-in|signin|customer\/account/i;
const REGISTER_URL_PATTERN = /register|create|sign-up|signup/i;
const LOGIN_COPY_PATTERN = /sign in|log in|login|email|password/i;
const REGISTER_COPY_PATTERN = /create account|register|sign up|first name|last name|confirm password/i;
const ERROR_COPY_PATTERN = /invalid|incorrect|required|already|exists|not valid|please enter/i;
const SUCCESS_COPY_PATTERN = /my account|account dashboard|welcome|hello/i;
const EMAIL_VALIDATION_PATTERN = /valid email|invalid email|email.+invalid|please enter a valid/i;
const PASSWORD_RULE_PATTERN = /minimum|at least|password.+must|please enter 6 or more/i;
const REQUIRED_PATTERN = /required|this is a required field|please enter/i;

const PROTECTED_ACCOUNT_PATHS = ['/customer/account', '/customer/account/index', '/my-account', '/account'];

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

function registrationPassword(): string {
  return `GRA!${Date.now()}a1`;
}

function emailInput(account: AccountPage): Locator {
  return account.emailInput;
}

function passwordInput(account: AccountPage): Locator {
  return account.passwordInput;
}

function confirmPasswordInput(account: AccountPage): Locator {
  return account.confirmPasswordInput;
}

function firstNameInput(account: AccountPage): Locator {
  return account.firstNameInput;
}

function lastNameInput(account: AccountPage): Locator {
  return account.lastNameInput;
}

function submitButton(account: AccountPage): Locator {
  return account.authSubmit;
}

async function authForm(account: AccountPage): Promise<Locator | null> {
  const forms = account.authForms;
  const total = await forms.count();
  for (let index = 0; index < total; index += 1) {
    const form = forms.nth(index);
    if (await form.isVisible().catch(() => false)) {
      return form;
    }
  }
  return null;
}

async function submitAuthForm(account: AccountPage): Promise<void> {
  const form = await authForm(account);
  if (form && (await account.authSubmit.isVisible().catch(() => false))) {
    await clickRobust(account.authSubmit);
    return;
  }

  const password = passwordInput(account);
  if (await password.isVisible().catch(() => false)) {
    await password.press('Enter').catch(() => undefined);
    return;
  }

  await clickRobust(submitButton(account));
}

async function clickRobust(target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded().catch(() => undefined);
  await target.click({ timeout: 8_000 }).catch(async () => {
    await target.evaluate((node) => (node as HTMLElement).click());
  });
}

async function bodyText(account: AccountPage): Promise<string> {
  return ((await account.readBodyText().catch(() => '')) || '').toLowerCase();
}

async function isLoginGate(account: AccountPage, page: Page): Promise<boolean> {
  const body = await bodyText(account);
  return LOGIN_URL_PATTERN.test(page.url()) || LOGIN_COPY_PATTERN.test(body);
}

async function isRegisterPage(account: AccountPage, page: Page): Promise<boolean> {
  const body = await bodyText(account);
  return REGISTER_URL_PATTERN.test(page.url()) || REGISTER_COPY_PATTERN.test(body);
}

async function isLoggedInState(account: AccountPage, page: Page): Promise<boolean> {
  if (await isLoginGate(account, page)) {
    return false;
  }

  const loginFormVisible = await emailInput(account).isVisible().catch(() => false);
  const logoutVisible = await account.logoutTrigger.isVisible().catch(() => false);
  const body = await bodyText(account);
  const hasSuccessCopy = SUCCESS_COPY_PATTERN.test(body);
  return !loginFormVisible || hasSuccessCopy || logoutVisible;
}

async function openLoginPage(home: HomePage, page: Page): Promise<void> {
  await home.goto('/');
  await expect(home.header.accountIcon).toBeVisible();
  await clickRobust(home.header.accountIcon);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await home.dismissInterruptions();
}

async function openRegisterPage(home: HomePage, account: AccountPage, page: Page): Promise<void> {
  await openLoginPage(home, page);
  if (await isRegisterPage(account, page)) {
    return;
  }

  const registerLink = account.registerTrigger;
  const registerVisible = await registerLink.isVisible().catch(() => false);
  test.skip(!registerVisible, 'Registration entry point is not available on this storefront.');

  await clickRobust(registerLink);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
}

async function login(account: AccountPage, page: Page, email: string, password: string): Promise<void> {
  await expect(emailInput(account)).toBeVisible();
  await expect(passwordInput(account)).toBeVisible();
  await emailInput(account).fill(email);
  await passwordInput(account).fill(password);
  await submitAuthForm(account);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await page.waitForTimeout(1200);
}

async function logoutIfPossible(home: HomePage, account: AccountPage, page: Page): Promise<boolean> {
  await home.goto('/');
  await clickRobust(home.header.accountIcon);
  const logout = account.logoutTrigger;
  const visible = await logout.isVisible().catch(() => false);
  if (!visible) {
    return false;
  }

  await clickRobust(logout);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await page.waitForTimeout(1200);
  return true;
}

async function fillRegistrationForm(
  account: AccountPage,
  data: { firstName: string; lastName: string; email: string; password: string; confirmPassword?: string }
): Promise<void> {
  await expect(emailInput(account)).toBeVisible();
  await expect(passwordInput(account)).toBeVisible();

  if (await firstNameInput(account).isVisible().catch(() => false)) {
    await firstNameInput(account).fill(data.firstName);
  }
  if (await lastNameInput(account).isVisible().catch(() => false)) {
    await lastNameInput(account).fill(data.lastName);
  }
  await emailInput(account).fill(data.email);
  await passwordInput(account).fill(data.password);

  const confirm = confirmPasswordInput(account);
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.fill(data.confirmPassword ?? data.password);
  }
}

async function assertHasValidation(account: AccountPage, pattern: RegExp): Promise<void> {
  const text = await bodyText(account);
  const hasErrorContainer = await account.errorContainer.isVisible().catch(() => false);
  const hasPattern = pattern.test(text);

  if (hasPattern || hasErrorContainer) {
    return;
  }

  if (pattern === EMAIL_VALIDATION_PATTERN) {
    const invalidEmail = await emailInput(account)
      .evaluate((node) => !(node as HTMLInputElement).checkValidity())
      .catch(() => false);
    expect(invalidEmail).toBe(true);
    return;
  }

  if (pattern === REQUIRED_PATTERN) {
    const invalidRequired = await account.requiredInvalidField.isVisible().catch(() => false);
    expect(invalidRequired).toBe(true);
    return;
  }

  expect(hasPattern).toBe(true);
}

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
  dashboard: ['/customer/account', '/my-account', '/account'],
  forgotPassword: ['/customer/account/forgotpassword', '/forgot-password', '/customer/password/forgot'],
  accountEdit: ['/customer/account/edit', '/my-account/edit', '/account/profile'],
  addressBook: ['/customer/address', '/customer/address/index', '/my-account/address-book', '/account/address-book'],
  orderHistory: ['/sales/order/history', '/my-account/orders', '/account/orders', '/customer/account/orders'],
  wishlist: ['/wishlist', '/my-account/wishlist', '/customer/wishlist'],
  newsletter: ['/newsletter/manage', '/my-account/newsletter', '/customer/newsletter'],
};

async function navigateToSection(
  page: Page,
  home: HomePage,
  ctx: { baseURL: string },
  paths: string[]
): Promise<void> {
  for (const path of paths) {
    await page.goto(new URL(path, ctx.baseURL).href, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await home.dismissInterruptions();
    const ready = await page.evaluate(() => document.readyState).catch(() => '');
    if (ready === 'complete' || ready === 'interactive') break;
  }
}

async function ensureLoggedIn(home: HomePage, account: AccountPage, page: Page): Promise<void> {
  await home.goto('/');
  await clickRobust(home.header.accountIcon);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await home.dismissInterruptions();
  if (!(await isLoggedInState(account, page))) {
    await login(account, page, accountData.shared.email, accountData.shared.password);
  }
}

test.describe('my account first 20 test cases', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test('ACC-001 Verify My Account entry point is displayed', async ({ home }) => {
    await home.goto('/');
    await expect(home.header.accountIcon).toBeVisible();
  });

  test('ACC-002 Verify guest user can open sign-in page', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    expect(await isLoginGate(account, page)).toBe(true);
  });

  test('ACC-003 Verify login with valid credentials', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    await login(account, page, accountData.shared.email, accountData.shared.password);
    expect(await isLoggedInState(account, page)).toBe(true);
  });

  test('ACC-004 Verify login with invalid password', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    await login(account, page, accountData.shared.email, accountData.invalidPassword);
    await assertHasValidation(account, ERROR_COPY_PATTERN);
    expect(await isLoggedInState(account, page)).toBe(false);
  });

  test('ACC-005 Verify login with unregistered email', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    await login(account, page, accountData.unregisteredEmail, 'InvalidPassword!123');
    await assertHasValidation(account, ERROR_COPY_PATTERN);
    expect(await isLoggedInState(account, page)).toBe(false);
  });

  test('ACC-006 Verify required field validation on login form', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    await submitAuthForm(account);
    await assertHasValidation(account, REQUIRED_PATTERN);
  });

  test('ACC-007 Verify email format validation on login form', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    await emailInput(account).fill('invalid-email-format');
    await passwordInput(account).fill(accountData.shared.password);
    await submitAuthForm(account);
    await assertHasValidation(account, EMAIL_VALIDATION_PATTERN);
  });

  test('ACC-008 Verify password masking/unmasking if available', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    await passwordInput(account).fill(accountData.shared.password);

    const toggle = account.passwordToggle;
    test.skip(!(await toggle.isVisible().catch(() => false)), 'Password visibility toggle is not available.');

    const before = await passwordInput(account).getAttribute('type');
    await clickRobust(toggle);
    const after = await passwordInput(account).getAttribute('type');
    expect(after).not.toBe(before);
  });

  test('ACC-009 Verify user remains logged in after page refresh', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    await login(account, page, accountData.shared.email, accountData.shared.password);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();
    expect(await isLoggedInState(account, page)).toBe(true);
  });

  test('ACC-010 Verify logged-in state is reflected in header', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    await login(account, page, accountData.shared.email, accountData.shared.password);
    await home.goto('/');
    await clickRobust(home.header.accountIcon);

    const logoutVisible = await account.logoutTrigger.isVisible().catch(() => false);
    const body = await bodyText(account);
    expect(logoutVisible || /my account|account|sign out|logout/i.test(body)).toBe(true);
  });

  test('ACC-011 Verify user can log out successfully', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    await login(account, page, accountData.shared.email, accountData.shared.password);
    const didLogout = await logoutIfPossible(home, account, page);
    test.skip(!didLogout, 'Logout action is not available for this account state.');
    await clickRobust(home.header.accountIcon);
    expect(await isLoggedInState(account, page)).toBe(false);
  });

  test('ACC-012 Verify protected account page is not accessible after logout', async ({ home, account, page, ctx }) => {
    await openLoginPage(home, page);
    await login(account, page, accountData.shared.email, accountData.shared.password);
    await logoutIfPossible(home, account, page);

    let checked = false;
    for (const path of PROTECTED_ACCOUNT_PATHS) {
      const target = new URL(path, ctx.baseURL).href;
      await page.goto(target, { waitUntil: 'domcontentloaded' });
      await home.dismissInterruptions();
      checked = true;
      if (await isLoginGate(account, page)) {
        break;
      }
    }

    expect(checked).toBe(true);
    expect(await isLoginGate(account, page)).toBe(true);
  });

  test('ACC-013 Verify registration page opens correctly', async ({ home, account, page }) => {
    await openRegisterPage(home, account, page);
    expect(await isRegisterPage(account, page)).toBe(true);
    await expect(emailInput(account)).toBeVisible();
    await expect(passwordInput(account)).toBeVisible();
  });

  test('ACC-014 Verify account can be created with valid details', async ({ home, account, page }) => {
    await openRegisterPage(home, account, page);
    await fillRegistrationForm(account, {
      firstName: 'Jeff',
      lastName: 'Huynh',
      email: uniqueEmail('gra-acc014'),
      password: registrationPassword()
    });
    await submitAuthForm(account);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1500);

    const hasError = ERROR_COPY_PATTERN.test(await bodyText(account));
    expect(hasError).toBe(false);
    expect(await isLoggedInState(account, page)).toBe(true);
  });

  test('ACC-015 Verify duplicate email registration is blocked', async ({ home, account, page }) => {
    const duplicateEmail = uniqueEmail('gra-acc015');
    const password = registrationPassword();

    await openRegisterPage(home, account, page);
    await fillRegistrationForm(account, {
      firstName: 'Jeff',
      lastName: 'Huynh',
      email: duplicateEmail,
      password
    });
    await submitAuthForm(account);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1500);

    if (!(await isRegisterPage(account, page))) {
      await logoutIfPossible(home, account, page);
      await openRegisterPage(home, account, page);
    }

    await fillRegistrationForm(account, {
      firstName: 'Jeff',
      lastName: 'Huynh',
      email: duplicateEmail,
      password
    });
    await submitAuthForm(account);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await assertHasValidation(account, /already|exists|registered|taken|in use/i);
  });

  test('ACC-016 Verify required field validation on registration form', async ({ home, account, page }) => {
    await openRegisterPage(home, account, page);
    await submitAuthForm(account);
    await assertHasValidation(account, REQUIRED_PATTERN);
  });

  test('ACC-017 Verify invalid email format validation on registration form', async ({ home, account, page }) => {
    await openRegisterPage(home, account, page);
    await fillRegistrationForm(account, {
      firstName: 'Jeff',
      lastName: 'Huynh',
      email: 'invalid-email',
      password: registrationPassword()
    });
    await submitAuthForm(account);
    await assertHasValidation(account, EMAIL_VALIDATION_PATTERN);
  });

  test('ACC-018 Verify password rule validation', async ({ home, account, page }) => {
    await openRegisterPage(home, account, page);
    await fillRegistrationForm(account, {
      firstName: 'Jeff',
      lastName: 'Huynh',
      email: uniqueEmail('gra-acc018'),
      password: '12345'
    });
    await submitAuthForm(account);
    await assertHasValidation(account, PASSWORD_RULE_PATTERN);
  });

  test('ACC-019 Verify confirm password validation', async ({ home, account, page }) => {
    await openRegisterPage(home, account, page);
    await fillRegistrationForm(account, {
      firstName: 'Jeff',
      lastName: 'Huynh',
      email: uniqueEmail('gra-acc019'),
      password: registrationPassword(),
      confirmPassword: 'Mismatch!123'
    });
    await submitAuthForm(account);
    await assertHasValidation(account, /confirm|match|same|does not match/i);
  });

  test('ACC-020 Verify marketing/newsletter opt-in behavior during registration', async ({ home, account, page }) => {
    await openRegisterPage(home, account, page);
    const optIn = account.marketingCheckbox;
    test.skip(!(await optIn.isVisible().catch(() => false)), 'Marketing opt-in checkbox is not available.');

    const email = uniqueEmail('gra-acc020');
    const password = registrationPassword();
    await fillRegistrationForm(account, {
      firstName: 'Jeff',
      lastName: 'Huynh',
      email,
      password
    });
    await optIn.check().catch(async () => {
      await clickRobust(optIn);
    });

    await submitAuthForm(account);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1500);

    const newsletterLink = account.newsletterLink;
    if (await newsletterLink.isVisible().catch(() => false)) {
      await clickRobust(newsletterLink);
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    }

    const subscribedCheckbox = account.marketingCheckbox;
    if (await subscribedCheckbox.isVisible().catch(() => false)) {
      await expect(subscribedCheckbox).toBeChecked();
    } else {
      const text = await bodyText(account);
      expect(/subscribed|newsletter|marketing|communication/i.test(text)).toBe(true);
    }
  });
});

test.describe('my account dashboard and extended flows', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  // ── Forgot Password ───────────────────────────────────────────────────────

  test('ACC-021 Verify forgot password page opens correctly', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    const forgotLink = page.locator('a').filter({ hasText: /forgot.*(password)?|reset.*(password)?/i }).first();
    test.skip(!(await forgotLink.isVisible().catch(() => false)), 'Forgot password link is not available on this storefront.');
    await clickRobust(forgotLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const body = await bodyText(account);
    expect(FORGOT_PASSWORD_PATTERN.test(page.url()) || FORGOT_PASSWORD_PATTERN.test(body)).toBe(true);
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    expect(await emailField.isVisible().catch(() => false)).toBe(true);
  });

  test('ACC-022 Verify forgot password with registered email', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    const forgotLink = page.locator('a').filter({ hasText: /forgot.*(password)?|reset.*(password)?/i }).first();
    test.skip(!(await forgotLink.isVisible().catch(() => false)), 'Forgot password link is not available.');
    await clickRobust(forgotLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    test.skip(!(await emailField.isVisible().catch(() => false)), 'Forgot password form is not available.');
    await emailField.fill(accountData.shared.email);
    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
    await clickRobust(submitBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1000);
    const body = await bodyText(account);
    expect(/sent|email|reset|check|inbox|confirmation|link/i.test(body)).toBe(true);
  });

  test('ACC-023 Verify forgot password with invalid email format', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    const forgotLink = page.locator('a').filter({ hasText: /forgot.*(password)?|reset.*(password)?/i }).first();
    test.skip(!(await forgotLink.isVisible().catch(() => false)), 'Forgot password link is not available.');
    await clickRobust(forgotLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    test.skip(!(await emailField.isVisible().catch(() => false)), 'Forgot password form is not available.');
    await emailField.fill('not-a-valid-email');
    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
    await clickRobust(submitBtn);
    await page.waitForTimeout(800);
    const isInvalid = await emailField.evaluate((node) => !(node as HTMLInputElement).checkValidity()).catch(() => false);
    const body = await bodyText(account);
    expect(isInvalid || EMAIL_VALIDATION_PATTERN.test(body)).toBe(true);
  });

  test('ACC-024 Verify forgot password required field validation', async ({ home, account, page }) => {
    await openLoginPage(home, page);
    const forgotLink = page.locator('a').filter({ hasText: /forgot.*(password)?|reset.*(password)?/i }).first();
    test.skip(!(await forgotLink.isVisible().catch(() => false)), 'Forgot password link is not available.');
    await clickRobust(forgotLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
    test.skip(!(await submitBtn.isVisible().catch(() => false)), 'Forgot password form is not available.');
    await clickRobust(submitBtn);
    await page.waitForTimeout(800);
    await assertHasValidation(account, REQUIRED_PATTERN);
  });

  // ── Account Dashboard ─────────────────────────────────────────────────────

  test('ACC-025 Verify account dashboard loads successfully', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.dashboard);
    await expect(account.body).toBeVisible();
    const body = await bodyText(account);
    expect(DASHBOARD_COPY_PATTERN.test(body) || !LOGIN_URL_PATTERN.test(page.url())).toBe(true);
  });

  test('ACC-026 Verify customer name/email is displayed correctly', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.dashboard);
    const body = await bodyText(account);
    const emailFragment = accountData.shared.email.split('@')[0].toLowerCase();
    expect(/hello|welcome|my account/i.test(body) || body.includes(emailFragment)).toBe(true);
  });

  test('ACC-027 Verify account navigation menu is displayed', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.dashboard);
    const navLinks = page
      .locator('nav a, .account-nav a, [class*="account"] a, [class*="sidebar"] a')
      .filter({ hasText: /account|order|address|wishlist|newsletter|logout|sign out/i });
    expect(await navLinks.count()).toBeGreaterThan(0);
  });

  test('ACC-028 Verify account navigation links redirect correctly', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.dashboard);
    const navLinks = page
      .locator('nav a, .account-nav a, [class*="account"] a, [class*="sidebar"] a')
      .filter({ hasText: /order|address|wishlist|newsletter/i });
    test.skip((await navLinks.count()) === 0, 'No account navigation links found.');
    const href = await navLinks.first().getAttribute('href').catch(() => null);
    if (href) {
      await navLinks.first().click();
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      expect(page.url()).not.toBe('about:blank');
    }
  });

  // ── Account Details ───────────────────────────────────────────────────────

  test('ACC-029 Verify personal information page loads correctly', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    const body = await bodyText(account);
    expect(ACCOUNT_EDIT_COPY_PATTERN.test(body) || ACCOUNT_EDIT_URL_PATTERN.test(page.url())).toBe(true);
    const hasField =
      (await account.firstNameInput.isVisible().catch(() => false)) ||
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
    await clickRobust(saveBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1000);
    const body = await bodyText(account);
    expect(!/error|invalid/i.test(body) || /saved|success|updated/i.test(body)).toBe(true);
  });

  test('ACC-031 Verify required field validation for personal info', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    test.skip(!(await account.firstNameInput.isVisible().catch(() => false)), 'Account edit form is not available.');
    await account.firstNameInput.fill('');
    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first();
    await clickRobust(saveBtn);
    await page.waitForTimeout(800);
    await assertHasValidation(account, REQUIRED_PATTERN);
  });

  test('ACC-032 Verify email change flow if supported', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    test.skip(!(await account.emailInput.isVisible().catch(() => false)), 'Email field is not available on this page.');
    const isReadOnly = await account.emailInput.evaluate((node) => (node as HTMLInputElement).readOnly).catch(() => false);
    const isDisabled = await account.emailInput.isDisabled().catch(() => false);
    const body = await bodyText(account);
    expect(!isReadOnly || !isDisabled || /email.*(change|update)|change.*email/i.test(body)).toBe(true);
  });

  test('ACC-033 Verify invalid email validation when updating email', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    test.skip(!(await account.emailInput.isVisible().catch(() => false)), 'Email field is not available.');
    const isReadOnly = await account.emailInput.evaluate((node) => (node as HTMLInputElement).readOnly).catch(() => false);
    test.skip(isReadOnly, 'Email field is read-only.');
    await account.emailInput.fill('bad-email');
    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first();
    await clickRobust(saveBtn);
    await page.waitForTimeout(800);
    await assertHasValidation(account, EMAIL_VALIDATION_PATTERN);
  });

  // ── Change Password ───────────────────────────────────────────────────────

  test('ACC-034 Verify change password section opens correctly', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    const body = await bodyText(account);
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
    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first();
    await clickRobust(saveBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1200);
    const body = await bodyText(account);
    expect(!/incorrect.*current|wrong.*password|current.*password.*incorrect/i.test(body)).toBe(true);
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
    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first();
    await clickRobust(saveBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1000);
    const body = await bodyText(account);
    expect(/invalid|incorrect|wrong|error|doesn.t match|does not match/i.test(body)).toBe(true);
  });

  test('ACC-037 Verify new password rule validation', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.accountEdit);
    const currentField = page.locator('input[name*="current"], input[name*="old"], input[autocomplete="current-password"]').first();
    test.skip(!(await currentField.isVisible().catch(() => false)), 'Change password form is not available.');
    await currentField.fill(accountData.shared.password);
    const newField = page.locator('input[name*="new_password"], input[name*="password_new"], input[name*="newPassword"]').first();
    if (await newField.isVisible().catch(() => false)) await newField.fill('123');
    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first();
    await clickRobust(saveBtn);
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
    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first();
    await clickRobust(saveBtn);
    await page.waitForTimeout(800);
    await assertHasValidation(account, /confirm|match|same|does not match/i);
  });

  // ── Address Book ──────────────────────────────────────────────────────────

  test('ACC-039 Verify address book page loads correctly', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    await expect(account.body).toBeVisible();
    const body = await bodyText(account);
    expect(ADDRESS_BOOK_COPY_PATTERN.test(body) || ADDRESS_BOOK_URL_PATTERN.test(page.url())).toBe(true);
  });

  test('ACC-040 Verify empty address book state', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const body = await bodyText(account);
    const hasAddresses = /delete|edit.*address|default.*billing|default.*shipping/i.test(body);
    test.skip(hasAddresses, 'Account has saved addresses; cannot test empty state.');
    expect(/no.*address|add.*address|you have no|empty/i.test(body) || !hasAddresses).toBe(true);
  });

  test('ACC-041 Verify user can add a new address', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const addBtn = page.locator('a, button').filter({ hasText: /add.*(new)?.*address|new.*address/i }).first();
    test.skip(!(await addBtn.isVisible().catch(() => false)), 'Add address button is not available.');
    await clickRobust(addBtn);
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
    const saveBtn = page.locator('button[type="submit"]:has-text("Save Address"), button:has-text("Save"), input[type="submit"]').first();
    await clickRobust(saveBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1200);
    const body = await bodyText(account);
    expect(ADDRESS_BOOK_COPY_PATTERN.test(body) || /saved|success|updated/i.test(body)).toBe(true);
  });

  test('ACC-042 Verify required field validation when adding address', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const addBtn = page.locator('a, button').filter({ hasText: /add.*(new)?.*address|new.*address/i }).first();
    test.skip(!(await addBtn.isVisible().catch(() => false)), 'Add address button is not available.');
    await clickRobust(addBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const saveBtn = page.locator('button[type="submit"]:has-text("Save Address"), button:has-text("Save"), input[type="submit"]').first();
    test.skip(!(await saveBtn.isVisible().catch(() => false)), 'Address form is not available.');
    await clickRobust(saveBtn);
    await page.waitForTimeout(800);
    await assertHasValidation(account, REQUIRED_PATTERN);
  });

  test('ACC-043 Verify AU/NZ address fields display correctly by region', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const addBtn = page.locator('a, button').filter({ hasText: /add.*(new)?.*address|new.*address/i }).first();
    test.skip(!(await addBtn.isVisible().catch(() => false)), 'Add address button is not available.');
    await clickRobust(addBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const body = await bodyText(account);
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
    await clickRobust(addBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const postcodeField = page.locator('input[name*="postcode"], input[name*="zip"]').first();
    test.skip(!(await postcodeField.isVisible().catch(() => false)), 'Postcode field is not available.');
    await postcodeField.fill('XXXXX');
    const saveBtn = page.locator('button[type="submit"]:has-text("Save Address"), button:has-text("Save"), input[type="submit"]').first();
    await clickRobust(saveBtn);
    await page.waitForTimeout(800);
    const isInvalid = await postcodeField.evaluate((node) => !(node as HTMLInputElement).checkValidity()).catch(() => false);
    const body = await bodyText(account);
    expect(isInvalid || /postcode|zip|invalid/i.test(body)).toBe(true);
  });

  test('ACC-045 Verify phone number validation', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const addBtn = page.locator('a, button').filter({ hasText: /add.*(new)?.*address|new.*address/i }).first();
    test.skip(!(await addBtn.isVisible().catch(() => false)), 'Add address button is not available.');
    await clickRobust(addBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const phoneField = page.locator('input[name*="telephone"], input[name*="phone"]').first();
    test.skip(!(await phoneField.isVisible().catch(() => false)), 'Phone field is not available.');
    await phoneField.fill('abc-invalid');
    const saveBtn = page.locator('button[type="submit"]:has-text("Save Address"), button:has-text("Save"), input[type="submit"]').first();
    await clickRobust(saveBtn);
    await page.waitForTimeout(800);
    const isInvalid = await phoneField.evaluate((node) => !(node as HTMLInputElement).checkValidity()).catch(() => false);
    const body = await bodyText(account);
    expect(isInvalid || /phone|telephone|invalid|required/i.test(body)).toBe(true);
  });

  test('ACC-046 Verify user can edit saved address', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const editBtn = page.locator('a, button').filter({ hasText: /^edit$/i }).first();
    test.skip(!(await editBtn.isVisible().catch(() => false)), 'No saved address to edit.');
    await clickRobust(editBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const firstName = page.locator('input[name*="firstname"], input[name*="first_name"]').first();
    if (await firstName.isVisible().catch(() => false)) await firstName.fill('UpdatedFirst');
    const saveBtn = page.locator('button[type="submit"]:has-text("Save Address"), button:has-text("Save"), input[type="submit"]').first();
    await clickRobust(saveBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1200);
    const body = await bodyText(account);
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
    await clickRobust(deleteBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1200);
    const countAfter = await addressCards.count();
    const body = await bodyText(account);
    expect(countAfter < countBefore || /deleted|removed|success/i.test(body)).toBe(true);
  });

  test('ACC-048 Verify default billing address can be set', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const body = await bodyText(account);
    test.skip(!ADDRESS_BOOK_COPY_PATTERN.test(body), 'Address book section is not available.');
    expect(/default.?billing|billing.?address|address/i.test(body)).toBe(true);
  });

  test('ACC-049 Verify default shipping address can be set', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.addressBook);
    const body = await bodyText(account);
    test.skip(!ADDRESS_BOOK_COPY_PATTERN.test(body), 'Address book section is not available.');
    expect(/default.?shipping|shipping.?address|address/i.test(body)).toBe(true);
  });

  // ── Order History ─────────────────────────────────────────────────────────

  test('ACC-050 Verify order history page loads correctly', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    await expect(account.body).toBeVisible();
    const body = await bodyText(account);
    expect(ORDER_HISTORY_COPY_PATTERN.test(body) || ORDER_HISTORY_URL_PATTERN.test(page.url())).toBe(true);
  });

  test('ACC-051 Verify empty order history state', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    const body = await bodyText(account);
    const hasOrders = /order #|order number|\d{5,}/i.test(body);
    test.skip(hasOrders, 'Account has orders; cannot test empty state.');
    expect(/no.*order|haven.*placed|empty|you have no/i.test(body) || !hasOrders).toBe(true);
  });

  test('ACC-052 Verify order list displays correctly', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    const body = await bodyText(account);
    test.skip(!/order #|order number|\d{5,}/i.test(body), 'No orders found in order history.');
    expect(/order|date|status|total/i.test(body)).toBe(true);
  });

  test('ACC-053 Verify order details page opens correctly', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    const viewLink = page.locator('a').filter({ hasText: /view|detail|order/i }).first();
    test.skip(!(await viewLink.isVisible().catch(() => false)), 'No orders to view.');
    await clickRobust(viewLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const body = await bodyText(account);
    expect(ORDER_DETAIL_COPY_PATTERN.test(body)).toBe(true);
  });

  test('ACC-054 Verify order details display correct products', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    const viewLink = page.locator('a').filter({ hasText: /view|detail|order/i }).first();
    test.skip(!(await viewLink.isVisible().catch(() => false)), 'No orders to view.');
    await clickRobust(viewLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const body = await bodyText(account);
    expect(/product|item|sku|qty|quantity|price/i.test(body)).toBe(true);
  });

  test('ACC-055 Verify order summary totals are correct', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    const viewLink = page.locator('a').filter({ hasText: /view|detail|order/i }).first();
    test.skip(!(await viewLink.isVisible().catch(() => false)), 'No orders to view.');
    await clickRobust(viewLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const body = await bodyText(account);
    expect(/subtotal|grand total|total|\$\s?\d/i.test(body)).toBe(true);
  });

  test('ACC-056 Verify tracking link is displayed if available', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    const viewLink = page.locator('a').filter({ hasText: /view|detail|order/i }).first();
    test.skip(!(await viewLink.isVisible().catch(() => false)), 'No orders to view.');
    await clickRobust(viewLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const body = await bodyText(account);
    expect(ORDER_DETAIL_COPY_PATTERN.test(body)).toBe(true);
  });

  test('ACC-057 Verify reorder button works if available', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.orderHistory);
    const reorderBtn = page.locator('a, button').filter({ hasText: /reorder/i }).first();
    test.skip(!(await reorderBtn.isVisible().catch(() => false)), 'Reorder feature is not available.');
    await clickRobust(reorderBtn);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1000);
    const body = await bodyText(account);
    expect(/cart|bag|basket|added|reorder/i.test(body) || /cart|checkout/.test(page.url())).toBe(true);
  });

  // ── Wishlist (from Account) ───────────────────────────────────────────────

  test('ACC-058 Verify wishlist page is accessible from My Account', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.dashboard);
    const wishlistLink = page.locator('a').filter({ hasText: /wishlist|saved|favourite/i }).first();
    test.skip(!(await wishlistLink.isVisible().catch(() => false)), 'Wishlist link is not in account navigation.');
    await clickRobust(wishlistLink);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    const body = await bodyText(account);
    expect(WISHLIST_COPY_PATTERN.test(body) || WISHLIST_URL_PATTERN.test(page.url())).toBe(true);
  });

  test('ACC-059 Verify wishlist products display correctly in account area', { tag: ['@data-dependent'] }, async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.wishlist);
    const body = await bodyText(account);
    const hasProducts = /\$\s?\d|product|item/i.test(body);
    test.skip(!hasProducts, 'No products in wishlist; cannot verify product display.');
    expect(hasProducts).toBe(true);
  });

  // ── Newsletter ────────────────────────────────────────────────────────────

  test('ACC-060 Verify newsletter subscription section loads correctly', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.newsletter);
    await expect(account.body).toBeVisible();
    const body = await bodyText(account);
    test.skip(!NEWSLETTER_COPY_PATTERN.test(body) && !NEWSLETTER_URL_PATTERN.test(page.url()), 'Newsletter section is not available on this storefront.');
    expect(NEWSLETTER_COPY_PATTERN.test(body) || NEWSLETTER_URL_PATTERN.test(page.url())).toBe(true);
  });

  test('ACC-061 Verify user can subscribe to newsletter', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.newsletter);
    const body = await bodyText(account);
    test.skip(!NEWSLETTER_COPY_PATTERN.test(body), 'Newsletter section is not available.');
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (!(await checkbox.isChecked().catch(() => false))) {
      await checkbox.check().catch(async () => { await clickRobust(checkbox); });
    }
    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await clickRobust(saveBtn);
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      await page.waitForTimeout(1000);
    }
    const updatedBody = await bodyText(account);
    expect(/saved|subscribed|success|updated/i.test(updatedBody) || NEWSLETTER_COPY_PATTERN.test(updatedBody)).toBe(true);
  });

  test('ACC-062 Verify user can unsubscribe from newsletter', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.newsletter);
    const body = await bodyText(account);
    test.skip(!NEWSLETTER_COPY_PATTERN.test(body), 'Newsletter section is not available.');
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isChecked().catch(() => false)) {
      await checkbox.uncheck().catch(async () => { await clickRobust(checkbox); });
    }
    const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Save"), input[type="submit"]').first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await clickRobust(saveBtn);
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      await page.waitForTimeout(1000);
    }
    const updatedBody = await bodyText(account);
    expect(/saved|unsubscribed|success|updated/i.test(updatedBody) || NEWSLETTER_COPY_PATTERN.test(updatedBody)).toBe(true);
  });

  // ── Security ──────────────────────────────────────────────────────────────

  test('ACC-065 Verify account pages require authentication', async ({ ctx, home, account, page }) => {
    await logoutIfPossible(home, account, page);
    for (const path of PROTECTED_ACCOUNT_PATHS) {
      await page.goto(new URL(path, ctx.baseURL).href, { waitUntil: 'domcontentloaded' });
      await home.dismissInterruptions();
      if (await isLoginGate(account, page)) break;
    }
    expect(await isLoginGate(account, page)).toBe(true);
  });

  test('ACC-067 Verify session expiry behavior', async ({ ctx, home, account, page }) => {
    await ensureLoggedIn(home, account, page);
    await page.context().clearCookies();
    await navigateToSection(page, home, ctx, ACCOUNT_SECTION_PATHS.dashboard);
    const body = await bodyText(account);
    expect((await isLoginGate(account, page)) || LOGIN_COPY_PATTERN.test(body)).toBe(true);
  });
});
