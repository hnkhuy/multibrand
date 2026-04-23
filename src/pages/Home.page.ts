import type { Locator, Page } from '@playwright/test';
import type { BrandContext, Selectors } from '../core/types';
import { BasePage } from './BasePage';

const HERO_CTA_SELECTOR = 'main a[href], main button';

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
          const hasVisual = Boolean(anchor.querySelector('img, picture, video, button'));
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
}
