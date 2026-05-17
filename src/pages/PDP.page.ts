import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

export class PDPPage extends BasePage {
  constructor(page: Page, selectors: Selectors, ctx: BrandContext) {
    super(page, selectors, ctx);
  }

  get addToCartButton(): Locator {
    return this.page.locator(this.selectors.pdp.addToCartButton).first();
  }

  get productTitle(): Locator {
    return this.page.locator(this.selectors.pdp.productTitle ?? '').first();
  }

  get breadcrumb(): Locator {
    return this.page.locator(this.selectors.pdp.breadcrumb ?? '').first();
  }

  get breadcrumbLinks(): Locator {
    return this.page.locator(this.selectors.pdp.breadcrumbLink ?? '');
  }

  get price(): Locator {
    return this.page.locator(this.selectors.pdp.price ?? '').first();
  }

  get promoBadges(): Locator {
    return this.page.locator(this.selectors.pdp.promoBadge ?? '');
  }

  get sku(): Locator {
    return this.page.locator(this.selectors.pdp.sku ?? '').first();
  }

  get description(): Locator {
    return this.page.locator(this.selectors.pdp.description ?? '').first();
  }

  get attributes(): Locator {
    return this.page.locator(this.selectors.pdp.attribute ?? '');
  }

  get colorOptions(): Locator {
    return this.page.locator(this.selectors.pdp.colorOption ?? '');
  }

  get sizeOptions(): Locator {
    return this.page.locator(this.selectors.pdp.sizeOption ?? '');
  }

  get galleryImages(): Locator {
    return this.page.locator(this.selectors.pdp.galleryImage ?? '');
  }

  get thumbnails(): Locator {
    return this.page.locator(this.selectors.pdp.thumbnail ?? '');
  }

  get galleryNext(): Locator {
    return this.page.locator(this.selectors.pdp.galleryNext ?? '').first();
  }

  get galleryPrevious(): Locator {
    return this.page.locator(this.selectors.pdp.galleryPrevious ?? '').first();
  }

  get zoomTrigger(): Locator {
    return this.page.locator(this.selectors.pdp.zoomTrigger ?? '').first();
  }

  get zoomDialog(): Locator {
    return this.page.locator(this.selectors.pdp.zoomDialog ?? '').first();
  }

  get productVideo(): Locator {
    return this.page.locator(this.selectors.pdp.productVideo ?? '').first();
  }

  get sizeSelect(): Locator {
    return this.page.locator(this.selectors.pdp.sizeSelect ?? this.selectors.pdp.sizeSelector ?? '').first();
  }

  get sizeButtons(): Locator {
    return this.page.locator(this.selectors.pdp.sizeButton ?? this.selectors.pdp.sizeOption ?? '');
  }

  get successFeedback(): Locator {
    return this.page.locator(this.selectors.pdp.successFeedback ?? '').first();
  }

  get quantityInput(): Locator {
    return this.page.locator(this.selectors.pdp.quantityInput ?? '').first();
  }

  get wishlistTrigger(): Locator {
    return this.page.locator(this.selectors.pdp.wishlistTrigger ?? '').first();
  }

  get findStore(): Locator {
    return this.page.locator(this.selectors.pdp.findStore ?? '').first();
  }

  get storeDialog(): Locator {
    return this.page.locator(this.selectors.pdp.storeDialog ?? '').first();
  }

  get deliveryInfo(): Locator {
    return this.page.locator(this.selectors.pdp.deliveryInfo ?? '').first();
  }

  get pickupInfo(): Locator {
    return this.page.locator(this.selectors.pdp.pickupInfo ?? '').first();
  }

  get financePromo(): Locator {
    return this.page.locator(this.selectors.pdp.financePromo ?? '').first();
  }

  get financeDialog(): Locator {
    return this.page.locator(this.selectors.pdp.financeDialog ?? '').first();
  }

  get recommendation(): Locator {
    return this.page.locator(this.selectors.pdp.recommendation ?? '').first();
  }

  get accordionOrTabs(): Locator {
    return this.page.locator(this.selectors.pdp.accordionOrTab ?? '');
  }

  get stickyAddToCart(): Locator {
    return this.page.locator(this.selectors.pdp.stickyAddToCart ?? '').first();
  }

  async expectLoaded(): Promise<void> {
    if (this.selectors.pdp.productTitle) {
      await expect(this.page.locator(this.selectors.pdp.productTitle).first()).toBeVisible();
    }
  }

  async selectFirstAvailableSize(): Promise<void> {
    const sizeSelector = this.selectors.pdp.sizeSelector;
    if (!sizeSelector) {
      return;
    }

    const size = this.page.locator(sizeSelector).first();
    if (!(await size.isVisible().catch(() => false))) {
      return;
    }

    const tagName = await size.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      const options = size.locator('option:not([disabled])');
      const count = await options.count();
      for (let index = 0; index < count; index += 1) {
        const value = await options.nth(index).getAttribute('value');
        if (value) {
          await size.selectOption(value);
          return;
        }
      }
      return;
    }

    await size.click();
  }

  /**
   * Primary add-to-cart flow.
   *
   * Strategy (in order):
   *   1. Select size via evaluate (bypasses React event delegation issues)
   *   2. API path: read variant info from window.dataLayer → call GraphQL directly
   *   3. UI fallback: evaluate-click ATC + waitForResponse (no fixed timers)
   *   4. Last resort: Playwright locator click + 4s wait (original behaviour)
   */
  async addToCart(): Promise<void> {
    // ── Step 1: Select size via evaluate ──────────────────────────────────
    await this.selectSizeViaEvaluate();
    // Allow React state update + dataLayer push to settle
    await this.page.waitForTimeout(1_500);

    // ── Step 2: Try GraphQL API path ──────────────────────────────────────
    const payload = await this.extractAtcPayload().catch(() => null);

    if (payload) {
      const ok = await this.addToCartViaApi(
        payload.parentSku,
        payload.childSku,
        payload.optionName,
        payload.optionValue
      ).catch(() => false);

      if (ok) {
        await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
        // API call adds item server-side but doesn't open the mini cart drawer — open it now.
        await this.miniCart.open();
        return;
      }
    }

    // ── Step 3: UI fallback — Playwright click (fires full pointer events → mini cart opens) ──
    // Register response listener BEFORE firing the click to avoid race.
    const gqlResponsePromise = this.page
      .waitForResponse(
        (res) =>
          res.url().endsWith('/graphql') &&
          res.request().method() === 'POST' &&
          (res.request().postData()?.includes('addConfigurableProduct') ?? false),
        { timeout: 15_000 }
      )
      .catch(() => null);

    // Scroll ATC button into view (it may be below the fold), then Playwright-click.
    // force:true bypasses Playwright's strict visibility checks while still dispatching the
    // full pointer-event sequence that React's synthetic event system needs to update state
    // and open the mini cart drawer.
    const atcLocator = this.page.locator('button').filter({
      hasText: /^add\s+to\s+(cart|bag|trolley)$/i,
    }).first();
    await atcLocator.scrollIntoViewIfNeeded({ timeout: 5_000 }).catch(() => undefined);
    let clicked = await atcLocator.click({ force: true, timeout: 8_000 }).then(() => true).catch(() => false);

    if (clicked) {
      // Check for size-not-chosen validation (Vans) and retry
      await this.page.waitForTimeout(400);
      const sizeValidation = await this.page
        .locator(':text("Size was not chosen"), :text("Please select a size")')
        .isVisible()
        .catch(() => false);

      if (sizeValidation) {
        await this.selectSizeViaEvaluate();
        await this.page.waitForTimeout(600);
        clicked = await atcLocator.click({ force: true, timeout: 8_000 }).then(() => true).catch(() => false);
      }

      await gqlResponsePromise;

      // Wait for mini cart to open (React state update after ATC response).
      // If it hasn't opened, fall back to explicit cart-icon click.
      await this.page.waitForTimeout(1_500);
      const drawerVisible = await this.miniCart.drawer.isVisible().catch(() => false);
      if (!drawerVisible) await this.miniCart.open();
    } else {
      // Last resort: force-click via locator + explicit open
      await this.addToCartButton.click({ force: true, timeout: 5_000 }).catch(() => undefined);
      await this.page.waitForTimeout(4_000);
      const drawerVisible = await this.miniCart.drawer.isVisible().catch(() => false);
      if (!drawerVisible) await this.miniCart.open();
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
  }

  /**
   * Poll for numeric size buttons to appear — handles SPA hydration delay.
   * Silently no-ops if timeout expires (accessory products have no size buttons).
   */
  private async waitForSizeButtons(): Promise<void> {
    // Skechers is a SPA with styled-components — JS hydration takes longer than other brands
    const timeout = this.ctx.brand === 'skechers' ? 20_000 : 8_000;
    await this.page
      .waitForFunction(
        () =>
          Array.from(document.querySelectorAll('button')).some((b) => {
            const t = (b.textContent ?? '').trim();
            // Match bare numbers ("7", "8.5") or US/UK/EU prefixed sizes ("US 7", "UK 8", "EU 41")
            return /^\d{1,3}(\.\d+)?$/.test(t) || /^(?:us|uk|eu|eur)\s*\d{1,3}(?:\.\d+)?$/i.test(t);
          }),
        { timeout }
      )
      .catch(() => undefined);
  }

  /**
   * Click the first in-stock numeric size button on the current page.
   * GRA platform marks in-stock sizes with the CSS class "available";
   * OOS sizes have only hashed styled-component classes (no "available").
   * Falls back to <select> elements and then to any non-disabled button.
   * Returns the selected size text, or null if no size could be selected.
   */
  private async pickFirstAvailableSize(): Promise<string | null> {
    return this.page
      .evaluate(() => {
        const SIZE_RE = /^(?:(?:us|uk|eu|eur)\s*)?\d{1,3}(?:\.\d+)?$/i;
        const SKIP_LABEL_RE =
          /menu|guide|chart|toggle|wishlist|cart|checkout|bag|store|search|phone|country|code/i;

        const isSizeAvailable = (btn: HTMLButtonElement) => {
          if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return false;
          const cls = btn.className ?? '';
          if (/out.of.stock|unavailable|sold.out/i.test(cls)) return false;
          return true;
        };

        const isNumericSizeBtn = (btn: HTMLButtonElement) => {
          const text = (btn.textContent ?? '').trim();
          if (!SIZE_RE.test(text)) return false;
          const label = (btn.getAttribute('aria-label') ?? '').toLowerCase();
          if (SKIP_LABEL_RE.test(label)) return false;
          const r = btn.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          if (btn.closest('[class*="phone" i], [class*="country" i], [class*="dial" i]')) return false;
          return true;
        };

        const allSizeBtns = Array.from(
          document.querySelectorAll<HTMLButtonElement>('button')
        ).filter(isNumericSizeBtn);

        // Prefer buttons explicitly marked available (GRA "available" CSS class)
        const hasAvailableClass = allSizeBtns.some((b) => b.className.includes('available'));
        const candidates = hasAvailableClass
          ? allSizeBtns.filter((b) => b.className.includes('available'))
          : allSizeBtns.filter(isSizeAvailable);

        const target = candidates[0] ?? null;
        if (target) {
          target.scrollIntoView({ block: 'center' });
          target.click();
          return (target.textContent ?? '').trim();
        }

        // <select> fallback (exclude phone/country pickers)
        for (const sel of Array.from(document.querySelectorAll<HTMLSelectElement>('select'))) {
          if (/phone|country|dial|code/i.test((sel.name ?? '') + (sel.id ?? ''))) continue;
          const opts = Array.from(sel.options).filter((o) => !o.disabled && o.value);
          if (opts.length > 0) {
            sel.value = opts[0].value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            return opts[0].text;
          }
        }

        return null;
      })
      .catch(() => null);
  }

  /**
   * Select the first available size, trying alternate color variants if the
   * current color has no in-stock sizes.
   *
   * GRA color swatches are anchor links inside a Swiper carousel
   * (.swiper-slide a[href$=".html"]) — each link navigates to a different
   * color variant URL. We iterate them until we find an available size.
   */
  private async selectSizeViaEvaluate(): Promise<string | null> {
    await this.waitForSizeButtons();

    // Try the current color variant first
    const result = await this.pickFirstAvailableSize();
    if (result !== null) return result;

    // No available sizes on this color — collect swatch links and try others.
    const swatchHrefs = await this.page
      .evaluate(() => {
        const SOCIAL_RE = /facebook|twitter|pinterest|instagram|mailto/i;
        return Array.from(
          document.querySelectorAll<HTMLAnchorElement>('.swiper-slide a[href$=".html"]')
        )
          .map((a) => a.getAttribute('href') ?? '')
          .filter((href) => href.length > 0 && !SOCIAL_RE.test(href));
      })
      .catch((): string[] => []);

    const currentUrl = this.page.url();
    for (const href of swatchHrefs.slice(0, 6)) {
      const targetUrl = new URL(href, currentUrl).href;
      if (targetUrl === currentUrl) continue;

      await this.page
        .goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 })
        .catch(() => undefined);
      await this.waitForSizeButtons();
      const r = await this.pickFirstAvailableSize();
      if (r !== null) return r;
    }

    return null;
  }

  /**
   * Read the GRA add-to-cart payload from window.dataLayer.
   * Must be called AFTER selectSizeViaEvaluate() and a short wait so the
   * product_size_select event has been pushed.
   *
   * Returns null when:
   *   - dataLayer is not available (headless GTM block)
   *   - product is one-size (no size-select event fired)
   *   - required fields are missing
   */
  private async extractAtcPayload(): Promise<{
    parentSku: string;
    childSku: string;
    optionName: string;
    optionValue: string;
  } | null> {
    return this.page
      .evaluate(() => {
        const dl: unknown[] = (window as any).dataLayer ?? [];
        if (dl.length === 0) return null;

        // parentSku comes from the product_view event fired on page load
        const pvEvent = dl.find((e: any) => e.event === 'product_view') as any;
        const parentSku: string | null = pvEvent?.products?.[0]?.child_sku ?? null;
        if (!parentSku) return null;

        // childSku + size: from product_size_select (fires after size button click)
        const sizeEvent = dl
          .slice()
          .reverse()
          .find((e: any) => e.event === 'product_size_select') as any;

        // Support both possible event shapes the GRA analytics layer may use
        const item: any =
          sizeEvent?.products?.[0] ?? sizeEvent?.cart_items?.[0] ?? sizeEvent?.items?.[0] ?? null;

        if (!item) return null;

        const childSku: string | null = item.sku_by_size ?? null;
        const sizeStr: string = item.size ?? ''; // e.g. "3:UK", "36:EU", "22:CM"

        if (!childSku || !sizeStr) return null;

        // Parse "3:UK" → optionValue="3", optionName="size_uk"
        const colonIdx = sizeStr.lastIndexOf(':');
        let optionValue: string;
        let optionName: string;

        if (colonIdx > 0) {
          optionValue = sizeStr.slice(0, colonIdx);
          optionName = 'size_' + sizeStr.slice(colonIdx + 1).toLowerCase();
        } else {
          // No system suffix — default to size_uk (the predominant GRA display system)
          optionValue = sizeStr;
          optionName = 'size_uk';
        }

        return { parentSku, childSku, optionName, optionValue };
      })
      .catch(() => null);
  }

  async getPrimaryImageSignature(): Promise<string> {
    return this.page.evaluate((selector) => {
      const images = Array.from(document.querySelectorAll(selector)) as HTMLImageElement[];
      const scored = images
        .map((img) => {
          const rect = img.getBoundingClientRect();
          const style = window.getComputedStyle(img);
          const visible =
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 80 &&
            rect.height > 80 &&
            rect.bottom > 0 &&
            rect.top < window.innerHeight;
          const area = rect.width * rect.height;
          const src = img.currentSrc || img.src || '';
          return { visible, area, src, alt: img.alt ?? '' };
        })
        .filter((item) => item.visible)
        .sort((a, b) => b.area - a.area);

      const target = scored[0];
      if (!target) {
        return '';
      }

      return `${target.src}|${target.alt}|${target.area}`;
    }, this.selectors.pdp.galleryImage ?? 'img');
  }

  async selectFirstAvailableSizeIfPossible(): Promise<boolean> {
    const select = this.sizeSelect;
    if (await select.isVisible().catch(() => false)) {
      const options = select.locator('option:not([disabled])');
      const count = await options.count();
      if (count > 0) {
        const value = await options.nth(0).getAttribute('value');
        if (value) {
          await select.selectOption(value).catch(() => undefined);
          return true;
        }
      }
    }

    const count = await this.sizeButtons.count();
    for (let index = 0; index < count; index += 1) {
      const option = this.sizeButtons.nth(index);
      const skipOrDisabled = await option
        .evaluate((node) => {
          const button = node as HTMLButtonElement;
          // Skip utility/navigation buttons (size guide, measurement toggle, etc.)
          const ariaLabel = (button.getAttribute('aria-label') ?? '').toLowerCase();
          if (/menu|guide|chart|toggle|expand|collapse|what.*size/i.test(ariaLabel)) return true;
          // Skip visually empty buttons (icons only)
          const text = (button.textContent ?? '').trim();
          if (text.length === 0) return true;
          return button.disabled || button.getAttribute('aria-disabled') === 'true';
        })
        .catch(() => true);
      if (!skipOrDisabled) {
        await option.click({ timeout: 5000 }).catch(() => undefined);
        return true;
      }
    }

    // Step 3: Playwright force-click on the first visible numeric size button.
    // Dispatches the full pointer event sequence (pointerdown → mousedown → click → mouseup →
    // pointerup) which is required for brands that use pointer-event delegation on a parent
    // container (Skechers, Platypus, Vans) rather than listening on the button itself.
    const numericSizeBtn = this.page
      .locator('button')
      .filter({ hasText: /^\d{1,3}(\.\d+)?$/ })
      .first();
    if (await numericSizeBtn.isVisible().catch(() => false)) {
      const ariaLabel = (await numericSizeBtn.getAttribute('aria-label').catch(() => '')) ?? '';
      if (!/menu|guide|chart|toggle|wishlist|cart|bag|store|search/i.test(ariaLabel.toLowerCase())) {
        await numericSizeBtn.click({ force: true, timeout: 5_000 }).catch(() => undefined);
        await this.page.waitForTimeout(400);
        return true;
      }
    }

    // Step 4: evaluate in-browser to find and native-click a numeric size button.
    // Uses btn.click() (non-cancelable) which bypasses any preventDefault() handlers on the
    // element while still bubbling through React's event delegation — works for DRM.
    const clicked = await this.page
      .evaluate(() => {
        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
        for (const btn of buttons) {
          const text = (btn.textContent ?? '').trim();
          if (!/^\d{1,3}(\.\d+)?$/.test(text)) continue;
          const label = (btn.getAttribute('aria-label') ?? '').toLowerCase();
          if (/menu|guide|chart|toggle|wishlist|cart|checkout|bag|store|search/i.test(label)) continue;
          if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') continue;
          const r = btn.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || r.bottom <= 0 || r.top >= window.innerHeight) continue;
          btn.click();
          return true;
        }
        return false;
      })
      .catch(() => false);

    if (clicked) {
      await this.page.waitForTimeout(600);
      return true;
    }

    return false;
  }
}
