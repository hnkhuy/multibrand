import { accountData } from '../../config/testData';
import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
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

const SIGN_IN_TRIGGER_SELECTOR =
  'button:has-text("Sign In"), a:has-text("Sign In"), button:has-text("Log In"), a:has-text("Log In"), button:has-text("Login"), a:has-text("Login"), button[type="submit"], [data-testid*="signin" i], [data-testid*="login" i]';
const REGISTER_TRIGGER_SELECTOR =
  'a:has-text("Create"), a:has-text("Register"), a:has-text("Sign Up"), a:has-text("Join"), button:has-text("Create"), button:has-text("Register"), button:has-text("Sign Up"), button:has-text("Join"), [href*="register"], [href*="create"], [href*="join"]';
const LOGOUT_TRIGGER_SELECTOR =
  'a:has-text("Sign Out"), a:has-text("Logout"), a:has-text("Log Out"), button:has-text("Sign Out"), button:has-text("Logout"), [href*="logout"], [href*="signout"]';
const MARKETING_CHECKBOX_SELECTOR =
  'input[type="checkbox"][name*="newsletter" i], input[type="checkbox"][id*="newsletter" i], input[type="checkbox"][name*="marketing" i], input[type="checkbox"][id*="marketing" i], label:has-text("Newsletter") input[type="checkbox"], label:has-text("Marketing") input[type="checkbox"]';
const PROTECTED_ACCOUNT_PATHS = ['/customer/account', '/customer/account/index', '/my-account', '/account'];

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

function registrationPassword(): string {
  return `GRA!${Date.now()}a1`;
}

function emailInput(page: Page): Locator {
  return page
    .locator('input[type="email"], input[name*="email" i], input[id*="email" i], input[autocomplete="email"]')
    .first();
}

function passwordInput(page: Page): Locator {
  return page
    .locator(
      'input[type="password"][name*="pass" i], input[type="password"][id*="pass" i], input[type="password"][autocomplete="current-password"], input[type="password"]'
    )
    .first();
}

function confirmPasswordInput(page: Page): Locator {
  return page
    .locator(
      'input[type="password"][name*="confirm" i], input[type="password"][id*="confirm" i], input[name*="confirmation" i], input[id*="confirmation" i]'
    )
    .first();
}

function firstNameInput(page: Page): Locator {
  return page.locator('input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]').first();
}

function lastNameInput(page: Page): Locator {
  return page.locator('input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]').first();
}

function submitButton(page: Page): Locator {
  return page
    .locator(
      `${SIGN_IN_TRIGGER_SELECTOR}, button:has-text("Create Account"), button:has-text("Register"), button:has-text("Continue"), button[type="submit"]`
    )
    .first();
}

async function authForm(page: Page): Promise<Locator | null> {
  const forms = page.locator('form');
  const total = await forms.count();
  for (let index = 0; index < total; index += 1) {
    const form = forms.nth(index);
    const hasEmail = await form
      .locator('input[type="email"], input[name*="email" i], input[id*="email" i]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasPassword = await form
      .locator('input[type="password"], input[name*="pass" i], input[id*="pass" i]')
      .first()
      .isVisible()
      .catch(() => false);
    if (hasEmail || hasPassword) {
      return form;
    }
  }
  return null;
}

async function submitAuthForm(page: Page): Promise<void> {
  const form = await authForm(page);
  if (form) {
    const submit = form
      .locator(
        'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Create"), button:has-text("Register"), button:has-text("Join"), button:has-text("Continue")'
      )
      .first();
    if (await submit.isVisible().catch(() => false)) {
      await clickRobust(submit);
      return;
    }
  }

  const password = passwordInput(page);
  if (await password.isVisible().catch(() => false)) {
    await password.press('Enter').catch(() => undefined);
    return;
  }

  await clickRobust(submitButton(page));
}

async function clickRobust(target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded().catch(() => undefined);
  await target.click({ timeout: 8_000 }).catch(async () => {
    await target.evaluate((node) => (node as HTMLElement).click());
  });
}

async function bodyText(page: Page): Promise<string> {
  return ((await page.locator('body').innerText().catch(() => '')) || '').toLowerCase();
}

async function isLoginGate(page: Page): Promise<boolean> {
  const body = await bodyText(page);
  return LOGIN_URL_PATTERN.test(page.url()) || LOGIN_COPY_PATTERN.test(body);
}

async function isRegisterPage(page: Page): Promise<boolean> {
  const body = await bodyText(page);
  return REGISTER_URL_PATTERN.test(page.url()) || REGISTER_COPY_PATTERN.test(body);
}

async function isLoggedInState(page: Page): Promise<boolean> {
  if (await isLoginGate(page)) {
    return false;
  }

  const loginFormVisible = await emailInput(page).isVisible().catch(() => false);
  const logoutVisible = await page.locator(LOGOUT_TRIGGER_SELECTOR).first().isVisible().catch(() => false);
  const body = await bodyText(page);
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

async function openRegisterPage(home: HomePage, page: Page): Promise<void> {
  await openLoginPage(home, page);
  if (await isRegisterPage(page)) {
    return;
  }

  const registerLink = page.locator(REGISTER_TRIGGER_SELECTOR).first();
  const registerVisible = await registerLink.isVisible().catch(() => false);
  test.skip(!registerVisible, 'Registration entry point is not available on this storefront.');

  await clickRobust(registerLink);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await expect(emailInput(page)).toBeVisible();
  await expect(passwordInput(page)).toBeVisible();
  await emailInput(page).fill(email);
  await passwordInput(page).fill(password);
  await submitAuthForm(page);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  await page.waitForTimeout(1200);
}

async function logoutIfPossible(home: HomePage, page: Page): Promise<boolean> {
  await home.goto('/');
  await clickRobust(home.header.accountIcon);
  const logout = page.locator(LOGOUT_TRIGGER_SELECTOR).first();
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
  page: Page,
  data: { firstName: string; lastName: string; email: string; password: string; confirmPassword?: string }
): Promise<void> {
  await expect(emailInput(page)).toBeVisible();
  await expect(passwordInput(page)).toBeVisible();

  if (await firstNameInput(page).isVisible().catch(() => false)) {
    await firstNameInput(page).fill(data.firstName);
  }
  if (await lastNameInput(page).isVisible().catch(() => false)) {
    await lastNameInput(page).fill(data.lastName);
  }
  await emailInput(page).fill(data.email);
  await passwordInput(page).fill(data.password);

  const confirm = confirmPasswordInput(page);
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.fill(data.confirmPassword ?? data.password);
  }
}

async function assertHasValidation(page: Page, pattern: RegExp): Promise<void> {
  const text = await bodyText(page);
  const hasErrorContainer = await page
    .locator('[role="alert"], .message-error, .mage-error, .error, [id*="error" i], [class*="error" i]')
    .first()
    .isVisible()
    .catch(() => false);
  const hasPattern = pattern.test(text);

  if (hasPattern || hasErrorContainer) {
    return;
  }

  if (pattern === EMAIL_VALIDATION_PATTERN) {
    const invalidEmail = await emailInput(page)
      .evaluate((node) => !(node as HTMLInputElement).checkValidity())
      .catch(() => false);
    expect(invalidEmail).toBe(true);
    return;
  }

  if (pattern === REQUIRED_PATTERN) {
    const invalidRequired = await page
      .locator('input:invalid[required], select:invalid[required], textarea:invalid[required]')
      .first()
      .isVisible()
      .catch(() => false);
    expect(invalidRequired).toBe(true);
    return;
  }

  expect(hasPattern).toBe(true);
}

test.describe('my account first 20 test cases', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test('ACC-001 Verify My Account entry point is displayed', async ({ home }) => {
    await home.goto('/');
    await expect(home.header.accountIcon).toBeVisible();
  });

  test('ACC-002 Verify guest user can open sign-in page', async ({ home, page }) => {
    await openLoginPage(home, page);
    expect(await isLoginGate(page)).toBe(true);
  });

  test('ACC-003 Verify login with valid credentials', async ({ home, page }) => {
    await openLoginPage(home, page);
    await login(page, accountData.shared.email, accountData.shared.password);
    expect(await isLoggedInState(page)).toBe(true);
  });

  test('ACC-004 Verify login with invalid password', async ({ home, page }) => {
    await openLoginPage(home, page);
    await login(page, accountData.shared.email, accountData.invalidPassword);
    await assertHasValidation(page, ERROR_COPY_PATTERN);
    expect(await isLoggedInState(page)).toBe(false);
  });

  test('ACC-005 Verify login with unregistered email', async ({ home, page }) => {
    await openLoginPage(home, page);
    await login(page, accountData.unregisteredEmail, 'InvalidPassword!123');
    await assertHasValidation(page, ERROR_COPY_PATTERN);
    expect(await isLoggedInState(page)).toBe(false);
  });

  test('ACC-006 Verify required field validation on login form', async ({ home, page }) => {
    await openLoginPage(home, page);
    await submitAuthForm(page);
    await assertHasValidation(page, REQUIRED_PATTERN);
  });

  test('ACC-007 Verify email format validation on login form', async ({ home, page }) => {
    await openLoginPage(home, page);
    await emailInput(page).fill('invalid-email-format');
    await passwordInput(page).fill(accountData.shared.password);
    await submitAuthForm(page);
    await assertHasValidation(page, EMAIL_VALIDATION_PATTERN);
  });

  test('ACC-008 Verify password masking/unmasking if available', async ({ home, page }) => {
    await openLoginPage(home, page);
    await passwordInput(page).fill(accountData.shared.password);

    const toggle = page
      .locator(
        'button[aria-label*="show" i], button[aria-label*="hide" i], button:has-text("Show"), button:has-text("Hide"), [class*="password" i] button'
      )
      .first();
    test.skip(!(await toggle.isVisible().catch(() => false)), 'Password visibility toggle is not available.');

    const before = await passwordInput(page).getAttribute('type');
    await clickRobust(toggle);
    const after = await passwordInput(page).getAttribute('type');
    expect(after).not.toBe(before);
  });

  test('ACC-009 Verify user remains logged in after page refresh', async ({ home, page }) => {
    await openLoginPage(home, page);
    await login(page, accountData.shared.email, accountData.shared.password);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();
    expect(await isLoggedInState(page)).toBe(true);
  });

  test('ACC-010 Verify logged-in state is reflected in header', async ({ home, page }) => {
    await openLoginPage(home, page);
    await login(page, accountData.shared.email, accountData.shared.password);
    await home.goto('/');
    await clickRobust(home.header.accountIcon);

    const logoutVisible = await page.locator(LOGOUT_TRIGGER_SELECTOR).first().isVisible().catch(() => false);
    const body = await bodyText(page);
    expect(logoutVisible || /my account|account|sign out|logout/i.test(body)).toBe(true);
  });

  test('ACC-011 Verify user can log out successfully', async ({ home, page }) => {
    await openLoginPage(home, page);
    await login(page, accountData.shared.email, accountData.shared.password);
    const didLogout = await logoutIfPossible(home, page);
    test.skip(!didLogout, 'Logout action is not available for this account state.');
    await clickRobust(home.header.accountIcon);
    expect(await isLoggedInState(page)).toBe(false);
  });

  test('ACC-012 Verify protected account page is not accessible after logout', async ({ home, page, ctx }) => {
    await openLoginPage(home, page);
    await login(page, accountData.shared.email, accountData.shared.password);
    await logoutIfPossible(home, page);

    let checked = false;
    for (const path of PROTECTED_ACCOUNT_PATHS) {
      const target = new URL(path, ctx.baseURL).href;
      await page.goto(target, { waitUntil: 'domcontentloaded' });
      await home.dismissInterruptions();
      checked = true;
      if (await isLoginGate(page)) {
        break;
      }
    }

    expect(checked).toBe(true);
    expect(await isLoginGate(page)).toBe(true);
  });

  test('ACC-013 Verify registration page opens correctly', async ({ home, page }) => {
    await openRegisterPage(home, page);
    expect(await isRegisterPage(page)).toBe(true);
    await expect(emailInput(page)).toBeVisible();
    await expect(passwordInput(page)).toBeVisible();
  });

  test('ACC-014 Verify account can be created with valid details', async ({ home, page }) => {
    await openRegisterPage(home, page);
    await fillRegistrationForm(page, {
      firstName: 'Jeff',
      lastName: 'Huynh',
      email: uniqueEmail('gra-acc014'),
      password: registrationPassword()
    });
    await submitAuthForm(page);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1500);

    const hasError = ERROR_COPY_PATTERN.test(await bodyText(page));
    expect(hasError).toBe(false);
    expect(await isLoggedInState(page)).toBe(true);
  });

  test('ACC-015 Verify duplicate email registration is blocked', async ({ home, page }) => {
    const duplicateEmail = uniqueEmail('gra-acc015');
    const password = registrationPassword();

    await openRegisterPage(home, page);
    await fillRegistrationForm(page, {
      firstName: 'Jeff',
      lastName: 'Huynh',
      email: duplicateEmail,
      password
    });
    await submitAuthForm(page);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1500);

    if (!(await isRegisterPage(page))) {
      await logoutIfPossible(home, page);
      await openRegisterPage(home, page);
    }

    await fillRegistrationForm(page, {
      firstName: 'Jeff',
      lastName: 'Huynh',
      email: duplicateEmail,
      password
    });
    await submitAuthForm(page);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await assertHasValidation(page, /already|exists|registered|taken|in use/i);
  });

  test('ACC-016 Verify required field validation on registration form', async ({ home, page }) => {
    await openRegisterPage(home, page);
    await submitAuthForm(page);
    await assertHasValidation(page, REQUIRED_PATTERN);
  });

  test('ACC-017 Verify invalid email format validation on registration form', async ({ home, page }) => {
    await openRegisterPage(home, page);
    await fillRegistrationForm(page, {
      firstName: 'Jeff',
      lastName: 'Huynh',
      email: 'invalid-email',
      password: registrationPassword()
    });
    await submitAuthForm(page);
    await assertHasValidation(page, EMAIL_VALIDATION_PATTERN);
  });

  test('ACC-018 Verify password rule validation', async ({ home, page }) => {
    await openRegisterPage(home, page);
    await fillRegistrationForm(page, {
      firstName: 'Jeff',
      lastName: 'Huynh',
      email: uniqueEmail('gra-acc018'),
      password: '12345'
    });
    await submitAuthForm(page);
    await assertHasValidation(page, PASSWORD_RULE_PATTERN);
  });

  test('ACC-019 Verify confirm password validation', async ({ home, page }) => {
    await openRegisterPage(home, page);
    await fillRegistrationForm(page, {
      firstName: 'Jeff',
      lastName: 'Huynh',
      email: uniqueEmail('gra-acc019'),
      password: registrationPassword(),
      confirmPassword: 'Mismatch!123'
    });
    await submitAuthForm(page);
    await assertHasValidation(page, /confirm|match|same|does not match/i);
  });

  test('ACC-020 Verify marketing/newsletter opt-in behavior during registration', async ({ home, page }) => {
    await openRegisterPage(home, page);
    const optIn = page.locator(MARKETING_CHECKBOX_SELECTOR).first();
    test.skip(!(await optIn.isVisible().catch(() => false)), 'Marketing opt-in checkbox is not available.');

    const email = uniqueEmail('gra-acc020');
    const password = registrationPassword();
    await fillRegistrationForm(page, {
      firstName: 'Jeff',
      lastName: 'Huynh',
      email,
      password
    });
    await optIn.check().catch(async () => {
      await clickRobust(optIn);
    });

    await submitAuthForm(page);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1500);

    const newsletterLink = page
      .locator('a[href*="newsletter"], a:has-text("Newsletter"), a:has-text("Communication"), [href*="account"]')
      .first();
    if (await newsletterLink.isVisible().catch(() => false)) {
      await clickRobust(newsletterLink);
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    }

    const subscribedCheckbox = page.locator(MARKETING_CHECKBOX_SELECTOR).first();
    if (await subscribedCheckbox.isVisible().catch(() => false)) {
      await expect(subscribedCheckbox).toBeChecked();
    } else {
      const text = await bodyText(page);
      expect(/subscribed|newsletter|marketing|communication/i.test(text)).toBe(true);
    }
  });
});
