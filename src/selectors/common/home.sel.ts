import type { HomeSelectors } from '../../core/types';

export const homeSelectors: HomeSelectors = {
  heroCta: 'main a[href], main button',
  heroMedia: 'main img, main picture, main video',
  promoTileLink: 'main a[href]',
  categoryEntryLink: 'main a[href]',
  featuredProductLink: 'main a[href]',
  mainLink: 'main a[href]',
  footerLink: 'footer a[href]',
  socialLink: 'footer a[href]',
  promoButton: 'main button, main [role="button"], main a',
  footerDialogTrigger: 'main button, main [role="button"], main a',
  dialogSurface: '[role="dialog"], [aria-modal="true"], .modal, .drawer'
};
