import type { Selectors } from '../../core/types';
import { checkoutSelectors } from './checkout.sel';
import { cookieSelectors } from './cookie.sel';
import { headerSelectors } from './header.sel';
import { minicartSelectors } from './minicart.sel';
import { modalSelectors } from './modal.sel';
import { pdpSelectors } from './pdp.sel';
import { plpSelectors } from './plp.sel';

export const COMMON_SELECTORS: Selectors = {
  header: headerSelectors,
  plp: plpSelectors,
  pdp: pdpSelectors,
  minicart: minicartSelectors,
  checkout: checkoutSelectors,
  cookie: cookieSelectors,
  modal: modalSelectors
};
