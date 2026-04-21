import { env } from '../../src/core/env';
import { test, expect } from '../../src/fixtures/test.fixture';

const ERROR_UI_PATTERN =
  /application error|something went wrong|service unavailable|page not found|this site can't be reached/i;

test.describe('homepage', () => {
  test.skip(!env.RUN_LIVE_TESTS, 'Set RUN_LIVE_TESTS=true to execute live storefront flows.');

  test('HP-001 homepage loads successfully', async ({ home, page }) => {
    await home.goto('/');

    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
    await expect(home.header.logo).toBeVisible();
  });

  test('HP-002 correct region-specific content is displayed', async ({ ctx, home, page }) => {
    await home.goto('/');

    const currentUrl = new URL(page.url());
    const expectedBaseUrl = new URL(ctx.baseURL);

    expect(currentUrl.hostname).toBe(expectedBaseUrl.hostname);
    expect(currentUrl.hostname).toContain(`-${ctx.region}.`);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('HP-003 homepage loads over HTTPS', async ({ home, page }) => {
    await home.goto('/');

    expect(new URL(page.url()).protocol).toBe('https:');
  });

  test('HP-004 no visible application error is shown on homepage', async ({ home, page }) => {
    await home.goto('/');

    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
  });

  test('HP-005 homepage remains stable after refresh', async ({ home, page }) => {
    await home.goto('/');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await home.dismissInterruptions();

    const currentUrl = new URL(page.url());
    expect(currentUrl.pathname).toBe('/');
    await expect(page.locator('body')).not.toHaveText(ERROR_UI_PATTERN);
    await expect(home.header.logo).toBeVisible();
  });
});
