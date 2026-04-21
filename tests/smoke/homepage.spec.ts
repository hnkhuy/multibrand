import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';
import type { Brand } from '../../src/core/types';

const ERROR_UI_PATTERN =
  /application error|something went wrong|service unavailable|page not found|this site can't be reached/i;
const BRAND_TITLE_PATTERNS: Record<Brand, RegExp> = {
  drmartens: /dr\.?\s*martens/i,
  platypus: /platypus/i,
  skechers: /skechers/i,
  vans: /vans/i
};

test.describe('homepage', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test('HP-001 homepage loads successfully', async ({ home, page }) => {
    await home.goto('/');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
    await expect(home.header.logo).toBeVisible();
  });

  test('HP-002 correct injected environment and brand are opened', async ({ ctx, home, page }) => {
    await home.goto('/');

    const currentUrl = new URL(page.url());
    const expectedBaseUrl = new URL(ctx.baseURL);

    expect(currentUrl.hostname).toBe(expectedBaseUrl.hostname);
    await expect(page).toHaveTitle(BRAND_TITLE_PATTERNS[ctx.brand]);
    await expect(home.header.logo).toBeVisible();
  });

  test('HP-003 homepage loads over HTTPS', async ({ home, page }) => {
    await home.goto('/');

    expect(new URL(page.url()).protocol).toBe('https:');
  });

  test('HP-004 brand logo is displayed', async ({ home }) => {
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
