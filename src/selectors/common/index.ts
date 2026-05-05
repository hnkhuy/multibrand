import type { Selectors } from '../../core/types';
import { accountSelectors } from './account.sel';
import { cartSelectors } from './cart.sel';
import { checkoutSelectors } from './checkout.sel';
import { cookieSelectors } from './cookie.sel';
import { headerSelectors } from './header.sel';
import { homeSelectors } from './home.sel';
import { layoutSelectors } from './layout.sel';
import { minicartSelectors } from './minicart.sel';
import { modalSelectors } from './modal.sel';
import { pdpSelectors } from './pdp.sel';
import { plpSelectors } from './plp.sel';
import { searchSelectors } from './search.sel';
import { storeSelectors } from './store.sel';
import { wishlistSelectors } from './wishlist.sel';

export const COMMON_SELECTORS: Selectors = {
  layout: layoutSelectors,
  home: homeSelectors,
  header: headerSelectors,
  plp: plpSelectors,
  pdp: pdpSelectors,
  cart: cartSelectors,
  wishlist: wishlistSelectors,
  account: accountSelectors,
  minicart: minicartSelectors,
  search: searchSelectors,
  store: storeSelectors,
  checkout: checkoutSelectors,
  cookie: cookieSelectors,
  modal: modalSelectors
};
