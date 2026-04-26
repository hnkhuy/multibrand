import type { Page } from '@playwright/test';
import type { BrandContext, PageFactory as PageFactoryContract, Selectors } from '../core/types';
import { AccountPage } from '../pages/Account.page';
import { CartPage } from '../pages/Cart.page';
import { CheckoutPage } from '../pages/Checkout.page';
import { HomePage } from '../pages/Home.page';
import { PDPPage } from '../pages/PDP.page';
import { PLPPage } from '../pages/PLP.page';
import { WishlistPage } from '../pages/Wishlist.page';

export class PageFactory implements PageFactoryContract {
  constructor(
    private readonly page: Page,
    private readonly selectors: Selectors,
    private readonly ctx: BrandContext
  ) {}

  createHomePage(): HomePage {
    return new HomePage(this.page, this.selectors, this.ctx);
  }

  createPLPPage(): PLPPage {
    return new PLPPage(this.page, this.selectors, this.ctx);
  }

  createPDPPage(): PDPPage {
    return new PDPPage(this.page, this.selectors, this.ctx);
  }

  createCartPage(): CartPage {
    return new CartPage(this.page, this.selectors, this.ctx);
  }

  createCheckoutPage(): CheckoutPage {
    return new CheckoutPage(this.page, this.selectors, this.ctx);
  }

  createAccountPage(): AccountPage {
    return new AccountPage(this.page, this.selectors, this.ctx);
  }

  createWishlistPage(): WishlistPage {
    return new WishlistPage(this.page, this.selectors, this.ctx);
  }
}
