import type { Locator, Page } from '@playwright/test';

export type Brand = 'drmartens' | 'platypus' | 'skechers' | 'vans';
export type Region = 'au' | 'nz';

export interface ProjectMeta {
  name: string;
  brand: Brand;
  region: Region;
  baseURL: string;
}

export interface BrandContext {
  brand: Brand;
  region: Region;
  baseURL: string;
}

export interface Selectors {
  header: HeaderSelectors;
  plp: PLPSelectors;
  pdp: PDPSelectors;
  minicart: MiniCartSelectors;
  checkout?: CheckoutSelectors;
  cookie?: CookieSelectors;
  modal?: ModalSelectors;
}

export interface HeaderSelectors {
  logo: string;
  navigation: string;
  navigationLink: string;
  submenu: string;
  searchInput: string;
  searchSubmit?: string;
  accountIcon: string;
  cartIcon: string;
  menuButton?: string;
}

export interface PLPSelectors {
  productCard: string;
  productName?: string;
  filters?: string;
}

export interface PDPSelectors {
  addToCartButton: string;
  sizeSelector?: string;
  productTitle?: string;
}

export interface MiniCartSelectors {
  drawer: string;
  checkoutButton: string;
  itemRow?: string;
}

export interface CheckoutSelectors {
  emailInput?: string;
  continueButton?: string;
  placeOrderButton?: string;
}

export interface CookieSelectors {
  acceptButton?: string;
  rejectButton?: string;
  banner?: string;
}

export interface ModalSelectors {
  closeButton?: string;
  container?: string;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface SelectorFactory {
  buildSelectors(brand: Brand): Selectors;
}

export interface PageFactory {
  createHomePage(): unknown;
  createPLPPage(): unknown;
  createPDPPage(): unknown;
}

export interface TestFixtures {
  ctx: BrandContext;
  selectors: Selectors;
  home: unknown;
  plp: unknown;
  pdp: unknown;
}

export interface ComponentOptions {
  page: Page;
  selectors: Selectors;
}

export type SelectorTarget = string | Locator;
