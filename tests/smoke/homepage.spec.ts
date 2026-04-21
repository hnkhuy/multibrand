import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';

const SKECHERS_AU_HOST = 'stag-skechers-au.accentgra.com';
const ERROR_UI_PATTERN =
  /application error|something went wrong|service unavailable|page not found|this site can't be reached/i;

test.describe('homepage - Skechers AU', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test.beforeEach(async ({ ctx }) => {
    test.skip(
      ctx.brand !== 'skechers' || ctx.region !== 'au',
      'Homepage manual cases HP-001 to HP-005 target Skechers AU staging.'
    );
  });

  test('HP-001 homepage loads successfully', async ({ home, page }) => {
    await home.goto('/');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
    await expect(home.header.logo).toBeVisible();
  });

  test('HP-002 correct Skechers AU staging environment is opened', async ({ ctx, home, page }) => {
    await home.goto('/');

    const currentUrl = new URL(page.url());
    const expectedBaseUrl = new URL(ctx.baseURL);

    expect(currentUrl.hostname).toBe(SKECHERS_AU_HOST);
    expect(expectedBaseUrl.hostname).toBe(SKECHERS_AU_HOST);
    await expect(page).toHaveTitle(/skechers/i);
    await expect(home.header.logo).toBeVisible();
  });

  test('HP-003 homepage loads over HTTPS', async ({ home, page }) => {
    await home.goto('/');

    expect(new URL(page.url()).protocol).toBe('https:');
  });

  test('HP-004 Skechers logo is displayed', async ({ home }) => {
    await home.goto('/');

    await expect(home.header.logo).toBeVisible();
  });

  test('HP-005 clicking logo redirects to homepage', async ({ home, page }) => {
    await home.goto('/');
    await home.header.clickLogo();

    const currentUrl = new URL(page.url());
    expect(currentUrl.pathname).toBe('/');
    await expect(home.header.logo).toBeVisible();
  });
});
