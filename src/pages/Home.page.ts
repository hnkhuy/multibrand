import type { Locator, Page } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

export interface HomeLinkItem {
  index: number;
  text: string;
  href: string;
}

export interface ProductCardSnapshot {
  hasImage: boolean;
  name: string;
  prices: string[];
}

export class HomePage extends BasePage {
  constructor(page: Page, selectors: Selectors, ctx: BrandContext) {
    super(page, selectors, ctx);
  }

  async search(keyword: string): Promise<void> {
    await this.header.searchFor(keyword);
    await this.dismissInterruptions();
  }

  async heroCta(): Promise<Locator> {
    const candidates = this.page.locator(this.selectors.home.heroCta);
    const index = await candidates.evaluateAll((elements) => {
      const blockedPathPatterns = [
        /^\/$/,
        /\/wishlist/i,
        /\/cart/i,
        /\/account/i,
        /\/login/i,
        /\/track-order/i,
        /\/stores/i,
        /\/qantas/i,
        /\/sign-up/i,
        /\.html(?:$|\?)/i
      ];

      const scored = elements
        .map((element, index) => {
          const clickable = element as HTMLElement;
          const anchor = clickable instanceof HTMLAnchorElement ? clickable : clickable.closest('a');
          const rect = clickable.getBoundingClientRect();
          const childRect = clickable.querySelector('img, picture, video, button')?.getBoundingClientRect();
          const candidateRect =
            rect.width > 0 && rect.height > 0
              ? rect
              : childRect ?? rect;
          const style = window.getComputedStyle(clickable);
          const href = anchor?.getAttribute('href') ?? '';
          const text = (clickable.innerText || clickable.getAttribute('aria-label') || '').trim();
          const visible =
            candidateRect.width > 0 &&
            candidateRect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none';
          const isUtility = blockedPathPatterns.some((pattern) => pattern.test(href));
          const hasVisual = Boolean(clickable.querySelector('img, picture, video, button'));
          const hasCtaCopy = /shop|view|discover|explore|sale|new|learn/i.test(text);
          const plausibleCta = hasVisual || (hasCtaCopy && candidateRect.width >= 80 && candidateRect.top > 180);

          if (!href || !visible || isUtility || candidateRect.top < 80 || !plausibleCta) {
            return { index, score: -1 };
          }

          const areaScore = Math.min(candidateRect.width * candidateRect.height, 500_000) / 10_000;
          const viewportScore = candidateRect.top < window.innerHeight ? 50 : 0;
          const visualScore = hasVisual ? 25 : 0;
          const ctaScore = hasCtaCopy ? 20 : 0;

          return {
            index,
            score: viewportScore + visualScore + ctaScore + areaScore
          };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      return scored[0]?.index ?? -1;
    });

    if (index < 0) {
      const ctaByName = this.page
        .locator(this.selectors.home.heroCta)
        .filter({
          hasText: /shop now|shop sale|shop men|shop men's|shop women|shop women's|shop all|view all|discover|explore/i
        })
        .first();

      if (await ctaByName.isVisible().catch(() => false)) {
        return ctaByName;
      }

      throw new Error('No visible homepage hero CTA candidate was found.');
    }

    return candidates.nth(index);
  }

  async heroMedia(): Promise<Locator> {
    const media = this.page.locator(this.selectors.home.heroMedia);
    const index = await media.evaluateAll((elements) => {
      const scored = elements
        .map((element, index) => {
          const node = element as HTMLElement;
          const rect = node.getBoundingClientRect();
          const style = window.getComputedStyle(node);
          const visible =
            rect.width > 120 &&
            rect.height > 120 &&
            rect.top >= 0 &&
            rect.top < window.innerHeight * 1.5 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none';

          if (!visible) {
            return { index, score: -1 };
          }

          const areaScore = Math.min(rect.width * rect.height, 800_000) / 10_000;
          const viewportScore = rect.top < window.innerHeight ? 50 : 0;

          return { index, score: viewportScore + areaScore };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      return scored[0]?.index ?? -1;
    });

    if (index < 0) {
      throw new Error('No visible homepage hero media candidate was found.');
    }

    return media.nth(index);
  }

  promoCarouselButton(direction: 'previous' | 'next'): Locator {
    return this.page
      .getByRole('button', { name: new RegExp(direction, 'i') })
      .filter({ visible: true })
      .first();
  }

  async hasPromoCarousel(): Promise<boolean> {
    const previousVisible = await this.promoCarouselButton('previous').isVisible().catch(() => false);
    const nextVisible = await this.promoCarouselButton('next').isVisible().catch(() => false);
    return previousVisible && nextVisible;
  }

  async promoCarouselSignature(direction: 'previous' | 'next' = 'next'): Promise<string> {
    const button = this.promoCarouselButton(direction);

    return button.evaluate((element) => {
      const root =
        element.closest('section, [role="region"], [aria-roledescription*="carousel" i], div') ??
        element.parentElement;

      if (!root) {
        return '';
      }

      const texts = Array.from(root.querySelectorAll('a, button, p, h1, h2, h3, h4, span'))
        .map((node) => (node.textContent ?? '').trim())
        .filter(Boolean)
        .slice(0, 12);
      const media = Array.from(root.querySelectorAll('img, picture img'))
        .map((node) => (node as HTMLImageElement).currentSrc || (node as HTMLImageElement).src || '')
        .filter(Boolean)
        .slice(0, 6);

      return JSON.stringify({ texts, media });
    });
  }

  async getPromoTileLinks(limit = 8): Promise<HomeLinkItem[]> {
    const links = this.page.locator(this.selectors.home.promoTileLink);

    const candidates = await links.evaluateAll((elements) => {
      const blockedPathPatterns = [
        /^\/$/,
        /\/wishlist/i,
        /\/cart/i,
        /\/account/i,
        /\/login/i,
        /\/track-order/i,
        /\/stores/i,
        /\/qantas/i,
        /\/sign-up/i,
        /\.html(?:$|\?)/i
      ];

      return elements
        .map((element, index) => {
          const anchor = element as HTMLAnchorElement;
          const rect = anchor.getBoundingClientRect();
          const style = window.getComputedStyle(anchor);
          const href = anchor.getAttribute('href') ?? '';
          const text = (anchor.innerText || anchor.getAttribute('aria-label') || '').trim();
          const hasImage = Boolean(anchor.querySelector('img, picture, video'));
          const visible =
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none';
          const isUtility = blockedPathPatterns.some((pattern) => pattern.test(href));
          const ctaCopy = /shop|view|discover|explore|sale|new|collection|trend|buy/i.test(text);

          return { index, text, href, visible, isUtility, hasImage, ctaCopy, top: rect.top };
        })
        .filter((item) => item.visible && !item.isUtility && item.top > 120 && (item.hasImage || item.ctaCopy))
        .map(({ index, text, href }) => ({ index, text, href }));
    });

    return candidates.slice(0, limit);
  }

  async getCategoryEntryLinks(limit = 8): Promise<HomeLinkItem[]> {
    const links = this.page.locator(this.selectors.home.categoryEntryLink);

    const candidates = await links.evaluateAll((elements) => {
      const blockedPathPatterns = [/\.html(?:$|\?)/i, /\/wishlist/i, /\/cart/i, /\/account/i, /\/login/i];
      const ignoredLabels = ['all', 'sale', 'outlet', 'brands', 'presale'];

      return elements
        .map((element, index) => {
          const anchor = element as HTMLAnchorElement;
          const rect = anchor.getBoundingClientRect();
          const style = window.getComputedStyle(anchor);
          const href = anchor.getAttribute('href') ?? '';
          const text = (anchor.innerText || anchor.getAttribute('aria-label') || '').trim().toLowerCase();
          const visible =
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none';
          const pathLikeCategory = /\/shop\/|\/category\/|\/collections?\//i.test(href);
          const blocked = blockedPathPatterns.some((pattern) => pattern.test(href));
          const ignored = ignoredLabels.includes(text);

          return { index, text, href, visible, pathLikeCategory, blocked, ignored, top: rect.top };
        })
        .filter((item) => item.visible && item.pathLikeCategory && !item.blocked && !item.ignored && item.top > 80)
        .map(({ index, text, href }) => ({ index, text, href }));
    });

    return candidates.slice(0, limit);
  }

  async getFeaturedProductLinks(limit = 8): Promise<HomeLinkItem[]> {
    const collected = new Map<string, HomeLinkItem>();

    for (let attempt = 0; attempt < 8 && collected.size < limit; attempt += 1) {
      const links = this.page.locator(this.selectors.home.featuredProductLink);
      const batch = await links.evaluateAll((elements) => {
        const productPathPattern = /\.html(?:$|\?)|\/products?\/|\/p\/|\/product\//i;
        const blockedPathPatterns = [
          /^\/$/,
          /^#/,
          /^mailto:/i,
          /^tel:/i,
          /\/wishlist/i,
          /\/cart/i,
          /\/account/i,
          /\/login/i,
          /\/track-order/i,
          /\/stores/i,
          /\/sign-up/i,
          /\/shop\/(men|women|kids|all|new|sale)/i
        ];

        return elements
          .map((element, index) => {
            const anchor = element as HTMLAnchorElement;
            const rect = anchor.getBoundingClientRect();
            const style = window.getComputedStyle(anchor);
            const href = anchor.getAttribute('href') ?? '';
            const root =
              anchor.closest(
                'article, li, [data-testid*="product" i], [class*="product" i], [class*="tile" i], [class*="card" i]'
              ) ?? anchor.parentElement;
            const cardText = (root?.textContent ?? '').replace(/\s+/g, ' ').trim();
            const priceCount = cardText.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g)?.length ?? 0;
            const text = (anchor.innerText || anchor.getAttribute('aria-label') || '').trim();
            const hasImage = Boolean(anchor.querySelector('img, picture') || root?.querySelector('img, picture'));
            const visible =
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== 'hidden' &&
              style.display !== 'none';
            const blocked = blockedPathPatterns.some((pattern) => pattern.test(href));
            const looksLikeProductPath = productPathPattern.test(href);
            const likelyProduct = visible && !blocked && (priceCount > 0 || (looksLikeProductPath && hasImage));
            const score =
              (priceCount > 0 ? 40 : 0) +
              (hasImage ? 20 : 0) +
              (looksLikeProductPath ? 30 : 0) +
              (text.length >= 3 ? 10 : 0);

            return { index, href, text, likelyProduct, score };
          })
          .filter((item) => item.likelyProduct)
          .sort((a, b) => b.score - a.score)
          .map(({ index, href, text }) => ({ index, href, text }));
      });

      for (const item of batch) {
        if (!collected.has(item.href)) {
          collected.set(item.href, item);
        }
      }

      if (collected.size >= limit) {
        break;
      }

      await this.page.mouse.wheel(0, 1600);
      await this.page.waitForTimeout(250);
    }

    await this.page.evaluate(() => window.scrollTo(0, 0));
    return Array.from(collected.values()).slice(0, limit);
  }

  async productCardSnapshot(linkIndex: number): Promise<ProductCardSnapshot> {
    const productLink = this.page.locator(this.selectors.home.featuredProductLink).nth(linkIndex);

    return productLink.evaluate((element) => {
      const anchor = element as HTMLAnchorElement;
      const cardRoot =
        anchor.closest('article, li, [data-testid*="product" i], [class*="product" i], [class*="tile" i], [class*="card" i]') ??
        anchor.parentElement ??
        anchor;

      const text = (cardRoot.textContent ?? '').replace(/\s+/g, ' ').trim();
      const prices = text.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [];
      const images = cardRoot.querySelectorAll('img');
      const name = (anchor.innerText || anchor.getAttribute('aria-label') || '').trim();

      return {
        hasImage: images.length > 0,
        name,
        prices
      };
    });
  }

  productLinkByHref(href: string): Locator {
    return this.page.locator(`main a[href="${href.replace(/"/g, '\\"')}"]`);
  }

  footerLinkByHref(href: string): Locator {
    return this.page.locator(`footer a[href="${href.replace(/"/g, '\\"')}"]`).first();
  }

  get mainLinks(): Locator {
    return this.page.locator(this.selectors.home.mainLink);
  }

  get footerLinks(): Locator {
    return this.page.locator(this.selectors.home.footerLink);
  }

  get socialLinks(): Locator {
    return this.page.locator(this.selectors.home.socialLink);
  }

  get promoButtons(): Locator {
    return this.page.locator(this.selectors.home.promoButton ?? this.selectors.home.mainLink);
  }

  get dialogSurface(): Locator {
    return this.page.locator(this.selectors.home.dialogSurface ?? this.selectors.modal?.container ?? '[role="dialog"]').first();
  }

  async bestProductLinkByHref(href: string): Promise<Locator> {
    const candidates = this.productLinkByHref(href);
    const bestIndex = await candidates.evaluateAll((elements) => {
      const scored = elements
        .map((element, index) => {
          const anchor = element as HTMLElement;
          const rect = anchor.getBoundingClientRect();
          const style = window.getComputedStyle(anchor);
          const visible =
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none';
          const inViewport = rect.bottom > 0 && rect.top < window.innerHeight;
          const score = (inViewport ? 100 : 0) + Math.max(0, 1000 - Math.abs(rect.top - window.innerHeight / 2));

          return { index, visible, score };
        })
        .filter((item) => item.visible)
        .sort((a, b) => b.score - a.score);

      return scored[0]?.index ?? 0;
    });

    return candidates.nth(bestIndex);
  }

  async productCardSnapshotByHref(href: string): Promise<ProductCardSnapshot> {
    const productLink = await this.bestProductLinkByHref(href);
    return productLink.evaluate((element) => {
      const anchor = element as HTMLAnchorElement;
      const cardRoot =
        anchor.closest('article, li, [data-testid*="product" i], [class*="product" i], [class*="tile" i], [class*="card" i]') ??
        anchor.parentElement ??
        anchor;

      const text = (cardRoot.textContent ?? '').replace(/\s+/g, ' ').trim();
      const prices = text.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?/g) ?? [];
      const images = cardRoot.querySelectorAll('img');
      const name = (anchor.innerText || anchor.getAttribute('aria-label') || '').trim();

      return {
        hasImage: images.length > 0,
        name,
        prices
      };
    });
  }
}
