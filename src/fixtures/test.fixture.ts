import { test as base } from '@playwright/test';
import type { BrandContext, ProjectMeta, Selectors } from '../core/types';
import { buildSelectors } from '../factories/selectors.factory';
import { PageFactory } from '../factories/pages.factory';
import type { BrandFeatures } from '../../config/brandFeatures';
import { getBrandFeatures } from '../../config/brandFeatures';
import { HomePage } from '../pages/Home.page';
import { PLPPage } from '../pages/PLP.page';
import { PDPPage } from '../pages/PDP.page';
import { CartPage } from '../pages/Cart.page';
import { CheckoutPage } from '../pages/Checkout.page';
import { AccountPage } from '../pages/Account.page';
import { WishlistPage } from '../pages/Wishlist.page';
import { SearchPage } from '../pages/Search.page';

export interface AppFixtures {
  ctx: BrandContext;
  features: BrandFeatures;
  selectors: Selectors;
  pageFactory: PageFactory;
  home: HomePage;
  plp: PLPPage;
  pdp: PDPPage;
  cart: CartPage;
  checkout: CheckoutPage;
  account: AccountPage;
  wishlist: WishlistPage;
  search: SearchPage;
}

export const test = base.extend<AppFixtures>({
  ctx: async ({}, use, testInfo) => {
    const meta = testInfo.project.metadata as ProjectMeta;
    await use({
      brand: meta.brand,
      region: meta.region,
      baseURL: meta.baseURL
    });
  },

  features: async ({ ctx }, use) => {
    await use(getBrandFeatures(ctx.brand));
  },

  selectors: async ({ ctx }, use) => {
    await use(buildSelectors(ctx.brand));
  },

  pageFactory: async ({ page, selectors, ctx }, use) => {
    await use(new PageFactory(page, selectors, ctx));
  },

  home: async ({ pageFactory }, use) => {
    await use(pageFactory.createHomePage());
  },

  plp: async ({ pageFactory }, use) => {
    await use(pageFactory.createPLPPage());
  },

  pdp: async ({ pageFactory }, use) => {
    await use(pageFactory.createPDPPage());
  },

  cart: async ({ pageFactory }, use) => {
    await use(pageFactory.createCartPage());
  },

  checkout: async ({ pageFactory }, use) => {
    await use(pageFactory.createCheckoutPage());
  },

  account: async ({ pageFactory }, use) => {
    await use(pageFactory.createAccountPage());
  },

  wishlist: async ({ pageFactory }, use) => {
    await use(pageFactory.createWishlistPage());
  },

  search: async ({ pageFactory }, use) => {
    await use(pageFactory.createSearchPage());
  }
});

export { expect } from '@playwright/test';
