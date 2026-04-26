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
