import type { Locator, Page } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

const HERO_CTA_SELECTOR = 'main a[href], main button';
const HERO_MEDIA_SELECTOR = 'main img, main picture, main video';

export class HomePage extends BasePage {
  constructor(page: Page, selectors: Selectors, ctx: BrandContext) {
    super(page, selectors, ctx);
  }

  async search(keyword: string): Promise<void> {
    await this.header.searchFor(keyword);
    await this.dismissInterruptions();
  }

  async heroCta(): Promise<Locator> {
    const candidates = this.page.locator(HERO_CTA_SELECTOR);
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
        .locator('main a[href], main button')
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
    const media = this.page.locator(HERO_MEDIA_SELECTOR);
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
}
