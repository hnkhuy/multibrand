import type { CookieSelectors } from '../../core/types';

export const cookieSelectors: CookieSelectors = {
  banner: '[data-testid="cookie-banner"], #onetrust-banner-sdk, .cookie-banner',
  acceptButton: '[data-testid="accept-cookies"], #onetrust-accept-btn-handler, button:has-text("Accept")',
  rejectButton: '[data-testid="reject-cookies"], button:has-text("Reject")'
};
