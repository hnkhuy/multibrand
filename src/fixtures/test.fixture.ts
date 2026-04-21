import { test as base } from '@playwright/test';
import type { BrandContext, ProjectMeta, Selectors } from '../core/types';
import { buildSelectors } from '../factories/selectors.factory';
import { PageFactory } from '../factories/pages.factory';
import { HomePage } from '../pages/Home.page';
import { PLPPage } from '../pages/PLP.page';
import { PDPPage } from '../pages/PDP.page';
import { CartPage } from '../pages/Cart.page';
import { CheckoutPage } from '../pages/Checkout.page';

export interface AppFixtures {
  ctx: BrandContext;
  selectors: Selectors;
  pageFactory: PageFactory;
  home: HomePage;
  plp: PLPPage;
  pdp: PDPPage;
  cart: CartPage;
  checkout: CheckoutPage;
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
  }
});

export { expect } from '@playwright/test';
