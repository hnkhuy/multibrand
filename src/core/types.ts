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
  layout: LayoutSelectors;
  home: HomeSelectors;
  header: HeaderSelectors;
  plp: PLPSelectors;
  pdp: PDPSelectors;
  cart: CartSelectors;
  wishlist: WishlistSelectors;
  account: AccountSelectors;
  minicart: MiniCartSelectors;
  checkout?: CheckoutSelectors;
  cookie?: CookieSelectors;
  modal?: ModalSelectors;
}

export interface LayoutSelectors {
  body: string;
  main: string;
  footer: string;
  form: string;
  header: string;
}

export interface HomeSelectors {
  heroCta: string;
  heroMedia: string;
  promoTileLink: string;
  categoryEntryLink: string;
  featuredProductLink: string;
  mainLink: string;
  footerLink: string;
  socialLink: string;
  promoButton?: string;
  footerDialogTrigger?: string;
  dialogSurface?: string;
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
  mobileMenuSurface?: string;
  mobileMenuLink?: string;
  cartCount: string;
  actionTarget?: string;
}

export interface PLPSelectors {
  productCard: string;
  productName: string;
  filters: string;
  productLink: string;
  productPrice: string;
  productBadge: string;
  productImage: string;
  breadcrumb: string;
  breadcrumbLink: string;
  categoryTitle: string;
  categoryBanner: string;
  loadMore: string;
  paginationNext: string;
  sortControl: string;
  sortSelect: string;
  sortTrigger: string;
  sortLowToHighOption: string;
  sortHighToLowOption: string;
  sortAnyOption: string;
  filterPanel: string;
  filterToggle: string;
  filterClose: string;
  filterOption: string;
  activeFilterChip: string;
  activeFilterRemove: string;
  clearAllFilters: string;
  quickAdd: string;
  wishlistTrigger: string;
  countSummary: string;
  hoverReveal: string;
  variantOption: string;
  successFeedback: string;
  stickyControls: string;
}

export interface PDPSelectors {
  addToCartButton: string;
  sizeSelector: string;
  productTitle: string;
  breadcrumb: string;
  breadcrumbLink: string;
  price: string;
  promoBadge: string;
  sku: string;
  description: string;
  attribute: string;
  colorOption: string;
  sizeOption: string;
  galleryImage: string;
  thumbnail: string;
  galleryNext: string;
  galleryPrevious: string;
  zoomTrigger: string;
  zoomDialog: string;
  productVideo: string;
  sizeSelect: string;
  sizeButton: string;
  successFeedback: string;
  quantityInput: string;
  wishlistTrigger: string;
  findStore: string;
  storeDialog: string;
  deliveryInfo: string;
  pickupInfo: string;
  financePromo: string;
  financeDialog: string;
  recommendation: string;
  accordionOrTab: string;
  stickyAddToCart: string;
}

export interface CartSelectors {
  pageRoot: string;
  itemRow: string;
  itemImage?: string;
  itemName?: string;
  itemAttribute?: string;
  itemPrice?: string;
  productLink?: string;
  removeButton?: string;
  qtyInput?: string;
  qtyPlus?: string;
  qtyMinus?: string;
  emptyMessage?: string;
  continueShopping?: string;
}

export interface WishlistSelectors {
  productCard: string;
  productName: string;
  plpProductLink: string;
  pageLink: string;
  pageItem: string;
  trigger: string;
  variantOption: string;
  toast: string;
  removeButton: string;
  price: string;
}

export interface AccountSelectors {
  emailInput: string;
  passwordInput: string;
  confirmPasswordInput?: string;
  firstNameInput?: string;
  lastNameInput?: string;
  signInTrigger?: string;
  registerTrigger?: string;
  logoutTrigger?: string;
  marketingCheckbox?: string;
  authForm?: string;
  authSubmit?: string;
  errorContainer?: string;
  requiredInvalidField?: string;
  newsletterLink?: string;
  passwordToggle?: string;
}

export interface MiniCartSelectors {
  drawer: string;
  checkoutButton: string;
  itemRow?: string;
}

export interface CheckoutSelectors {
  root?: string;
  headerLogo?: string;
  orderSummary?: string;
  orderSummaryEntry?: string;
  emailInput?: string;
  returningCustomer?: string;
  shippingForm?: string;
  shippingField?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  postcode?: string;
  phone?: string;
  country?: string;
  continueButton?: string;
  deliveryMethod?: string;
  loginSubmit?: string;
  passwordInput?: string;
  cartItem?: string;
  addressAutocompleteSuggestion?: string;
  manualAddressEntry?: string;
  savedAddress?: string;
  newAddressTrigger?: string;
  deliveryMethodOption?: string;
  pickupOption?: string;
  storeSearch?: string;
  storeResult?: string;
  selectStoreButton?: string;
  disabledDeliveryMethod?: string;
  checkedDeliveryMethod?: string;
  requiredInvalidField?: string;
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
  createCartPage?(): unknown;
  createCheckoutPage?(): unknown;
  createAccountPage?(): unknown;
  createWishlistPage?(): unknown;
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
