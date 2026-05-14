# Site Structure & Feature Reference

Explored: 2026-05-15. All 8 staging sites on the GRA (Accenture Global Retail Applications) platform.

---

## Platform Overview

All 4 brands share the **GRA (Accenture) platform** — a headless e-commerce stack built on Adobe Commerce (Magento 2) with a React/PWA frontend. Key platform-wide traits:

| Trait | Detail |
|---|---|
| Frontend | React SPA — full CSR, minimal static HTML shell |
| CSS strategy | styled-components with hashed class names |
| Cart icon | `aria-label` contains item count ("You have N items in your cart") |
| Mini-cart | `<aside coords="0">` drawer, closes via `transform: translateX()` |
| Cookie consent | OneTrust `#onetrust-banner-sdk` (Dr. Martens, Platypus, Skechers); unknown method (Vans) |
| Analytics | Google Tag Manager `dataLayer` on all brands |
| BNPL | Afterpay on all brands |
| SPA hydration | Product cards NOT available at `domcontentloaded` — use `waitForFunction` polling |

---

## Brand: Dr. Martens

**Staging:** `stag-drmartens-au.accentgra.com` / `stag-drmartens-nz.accentgra.com`
**Production:** `www.drmartens.com.au` / `www.drmartens.co.nz`

### Navigation Categories

| Top-level | Sub-categories |
|---|---|
| Unisex | New Arrivals, Best Sellers, Exclusives, Gifts, Footwear, Originals, Accessories |
| Women | Same pattern as Unisex |
| Men | Same pattern as Unisex |
| Kids | School, Mini-Me, Infant/Toddler, Junior |
| Sale | — |

**Footwear types:** Boots, Shoes, Sandals, Loafers, Quads/Platforms, Jadon, Vegan, Made in England, Work
**Originals lines:** 1461 Shoes, 1460 Boots, 2976 Chelsea Boots, Adrian Loafers, 8065 Mary Jane Shoes
**Accessories:** Socks, Laces, Bags/Satchels, Shoe Care, Insoles

### Page Features

| Page | Key features |
|---|---|
| Homepage | Hero banner, promotional carousel (prev/next), promotional tiles, featured products with Quick Add |
| PLP | Breadcrumb, category banner, product cards, sort, filters (sidebar/drawer), active filter chips, Clear All, Load More, wishlist icon per card, Quick Add |
| PDP | `h1` title, breadcrumb, price + sale price, SKU, colour swatches (updates URL), size button grid, **"Add to Bag"** (not "Add to Cart"), qty selector, wishlist, image gallery + zoom, product video, Find in Store modal, Click & Collect, Afterpay messaging, accordion sections (Description/Details/Features/Shipping & Returns), sticky ATC bar, recommendations |
| Cart | Item rows (image/name/size/colour/price), qty controls, remove, subtotal, empty cart state, checkout button |
| Mini-cart | Items, qty controls, remove, subtotal, checkout CTA, View Bag link, Afterpay messaging |
| Checkout | Email/guest entry → shipping address → delivery method (Standard / Express / Click & Collect) → store search for C&C → payment (Afterpay option) |
| Account | Login, register, marketing opt-in, order history, address book, newsletter prefs, sign out |
| Wishlist | Requires login; product cards with remove + Add to Cart |
| Store Locator | Suburb/postcode search, Google Maps, store cards with hours + Get Directions, geolocation button |
| Search | Autocomplete (text + product + category suggestions), results page with count, no-results state |

### Notable UI Details
- "Add to Bag" label (brand-specific — override in selectors)
- OneTrust cookie banner: `#onetrust-banner-sdk`
- Possible geo-redirect modal on first visit
- Analytics: `view_item`, `add_to_cart`, variant select → `dataLayer`

### AU vs NZ Differences

| | AU | NZ |
|---|---|---|
| Currency | AUD | NZD |
| Store suburb example | Melbourne / 3000 | Auckland / 1010 |
| Layout/features | Identical | Identical |

### CMS / Info Pages
`/delivery-information`, `/returns`, `/about-us`, `/careers`, `/contact-us`, `/privacy-policy`, `/terms-and-conditions`, `/leather-guide`, `/sustainability`, `/history`, `/gift-cards`, `/afterpay`, `/unidays`, `/truefit`, `/collaborations`

---

## Brand: Platypus

**Staging:** `stag-platypus-au.accentgra.com` / `stag-platypus-nz.accentgra.com`
**Production:** `www.platypusshoes.com.au` / `www.platypusshoes.co.nz`

### Navigation Categories

| Top-level | Sub-categories |
|---|---|
| Mens | Footwear / Clothing / Accessories / Brands |
| Womens | New Arrivals / Footwear / Clothing / Accessories / Brands |
| Kids | New Arrivals / Girls / Boys / Brands |
| Sale | Womens / Mens / Kids / Footwear / Accessories / Clothing / Brands |
| School | Brands (AU: 4 brands; NZ: 11 brands) |
| Brands | Brand listing page |
| Best Sellers, Exclusive, Presale, Festival | — |

**Footwear sub-types:** Sneakers, Shoes, Boots, Slides & Sandals, Platforms (womens), Essentials, Athleisure, Festival, Summer, Vegan, Best Sellers, Back in Stock
**Clothing sub-types:** Tops, Bottoms, Outerwear, Underwear, Dresses (womens), Co-ords, Denim
**Accessories:** Socks bundle deal (2-for-$30 AU / 2-for-$35 NZ), Shoe Care, Laces, Hats, Bags, Sunglasses

### Brand Catalogue (50+)
Adidas, ASICS Sportstyle, Birkenstock, Buffalo, Calvin Klein, Caterpillar (AU), Converse, Crocs, DC, Diadora (AU), Dr Martens, Genuins, Herschel, Impala, New Balance, New Era, Nike, Nike SB, Palladium, Platypus (own brand), Puma, Reebok, Saucony (AU brand page), Skechers, Sperry, Stance, Superga, Teva, Timberland, Tommy Hilfiger, Under Armour, Vans, Windsor Smith, Woden, Onitsuka Tiger (NZ), Nokwol (NZ-exclusive)

### Page Features

| Page | Key features |
|---|---|
| Homepage | Same GRA pattern — hero, carousel, promotional tiles, featured products |
| PLP | Same as Dr. Martens; URL pattern: `/shop/{gender}/{subcategory}` |
| PDP | URL pattern: `/{product-name}-{sku}-{colour}.html` (flat, not under `/shop/`) |
| Cart | Standard GRA cart |
| Mini-cart | `<aside coords="0">`, Afterpay messaging |
| Account | Login, register, order history |
| Wishlist | Requires login |
| Store Locator | Suburb/postcode, Google Maps |
| Search | `?q=` param; test keyword: "sneakers" |
| Loyalty | **Platypus Kickbacks** (`/platypus-kickbacks-terms-conditions`) |

### Notable UI Details
- SPA: `waitForFunction` required for product card detection
- Product URLs are flat root-level (not nested under `/shop/`)
- OneTrust cookie banner
- Qantas partnership page (`/qantas`)
- Student discount: `/student-discount` (AU) / `/student-discount-nz` (NZ)

### AU vs NZ Differences

| | AU | NZ |
|---|---|---|
| Currency | AUD | NZD |
| Sock bundle | 2-for-$30 | 2-for-$35 |
| School brands | 4 (Adidas, DM, Nike, Vans) | 11 (adds Asics, Converse, Lacoste, NB, Puma, Reebok, Tommy H) |
| Student discount URL | `/student-discount` | `/student-discount-nz` |
| Exclusive brands | Saucony brand page, Alias Mae | Onitsuka Tiger, Nokwol |
| NZ-only categories | — | `court-styles` (womens), `/shop/new-balance/9060`, Mens New Arrivals top nav |
| Sitemap size | ~700 URLs | ~800 URLs |

### CMS / Info Pages
`/delivery`, `/click-collect`, `/afterpay`, `/gift-cards`, `/student-discount`, `/careers`, `/about-us`, `/why-shop-with-us`, `/sustainability`, `/platypus-planet`, `/qantas`, `/gift-guide`, `/competitions`, `/social-competitions`, `/platypus-kickbacks-terms-conditions`

---

## Brand: Skechers

**Staging:** `stag-skechers-au.accentgra.com` / `stag-skechers-nz.accentgra.com`
**Production:** `www.skechers.com.au` / `www.skechers.co.nz`

### Navigation Categories

| Top-level | Sub-categories |
|---|---|
| Women | Footwear, Clothing, Accessories |
| Men | Footwear, Clothing, Accessories |
| Kids | — |
| Sale | — |
| Store Locator | — |

PLP entry point used in tests: `/shop/women`

### Page Features

Same full GRA feature set as other brands. No brand-specific feature flag overrides — all defaults enabled.

| Page | Key features |
|---|---|
| PLP | Breadcrumb, filters, sort, product cards; **custom selectors required** (hashed classes) |
| PDP | Full feature set; URL pattern: `*.html` or `/product/` or `/p/` |
| Mini-cart | Items, qty, remove, subtotal, checkout CTA; **Afterpay messaging disabled** (brand feature flag) |
| Search | Autocomplete, results count |
| Store Locator | `/store-locator` |

### Skechers-Specific Selector Overrides

These are the **only brand with PLP selector overrides**:

```
productCard:  .productCard, [data-product-id], main [data-testid="product-card"], main .product-tile, main .product
productName:  [data-testid="product-name"], .product-name, .product-title
productLink:  a[href*=".html"], a[href*="/product/"], a[href*="/p/"]
quickAdd:     .quick-add-button, [class*="quick-add"], button:has-text("Quick Add")
```

### Notable UI Details (critical for test automation)
- **Pure SPA**: product cards render AFTER JS hydration — `waitForFunction` polling is mandatory on PLP/search
- All CSS classes are styled-components hashes — use `data-*` attributes and semantic patterns
- Mini-cart animation: `transform: translateX()` — not `display:none`
- No Afterpay messaging in mini-cart (disabled in brand feature flags)

### AU vs NZ Differences

| | AU | NZ |
|---|---|---|
| Currency | AUD | NZD |
| Store suburb example | Melbourne / 3000 | Auckland / 1010 |
| Layout/features | Identical | Identical |

---

## Brand: Vans

**Staging:** `stag-vans-au.accentgra.com` / `stag-vans-nz.accentgra.com`
**Production:** `www.vans.com.au` / `www.vans.co.nz`

### Navigation Categories

| Top-level | Sub-categories |
|---|---|
| Mens | New Arrivals, Best Sellers, Exclusives, Shoes, Classics, Skateboarding, Surf, BMX, Anaheim Factory, MTE, ComfyCush, Gifts for Him, Clothing, Accessories |
| Womens | Same as Mens (Gifts for Her) |
| Kids | New Arrivals, Shoes, Easy On/Easy Off, Gifts, Mini Me, School, Clothing, Accessories |
| Sale | Mens / Womens / Kids (each with Shoes, Clothing, Accessories) |

**Shoe sub-categories:** Authentic, Era, Half-Cab, Old Skool, Platforms, SK8-Hi, Slides, Slip-On, Ultrarange
**Clothing sub-categories:** Hoodies/Sweatshirts, Jackets, Pants/Shorts, T-Shirts/Tops
**Accessories:** Socks (2-for-$40 AU / 2-for-$45 NZ), Bags/Backpacks, Hats/Beanies, Shoe Care

### Page Features

| Page | Key features |
|---|---|
| Homepage | Hero, carousel, promotional tiles, featured products |
| PLP | Standard GRA; URL pattern: `/shop/{gender}/{category}` |
| PDP | URL pattern: `/{product-name}-{sku}-{colour}.html` (root-level, same as Platypus) |
| Cart | `/cart` route |
| Checkout | Multi-step; Afterpay + PayPal (Braintree) + PayPal Pay-in-4 |
| Account | Login popup / signup popup (modal-based, not page navigation) |
| Wishlist | Guest wishlist via localStorage + logged-in wishlist |
| Store Locator | `/stores`; Google Maps API, configurable search radius |
| Search | Autocomplete at `/search/autocomplete` |
| Blog | `/blog`, `/blog/{category}`, `/blog/{post}` |
| Returns portal | Full self-service: `/my-returns`, `/create-return`, `/return-details` |
| Order tracking | `/seko-portal` (SEKO iframe, guest + logged-in) |

### Vans-Specific Features (beyond standard GRA)

| Feature | Detail |
|---|---|
| Loyalty: Qantas QFF | Points earn/redeem in cart; `/qantas-frequent-flyer` account page |
| Multiple rewards | `PlatyPointsSummaryFragment` in cart |
| Reviews | Bazaarvoice (ratings, reviews, Q&A) |
| Size recommendation | TrueFit (`/true-fit` page, `truefitcorp.com` script) |
| Instagram feed | FourSixty (config flag per store, enabled on PDP) |
| Email/CRM | Klaviyo + Adobe Campaign (configurable) |
| Search engine | Fredhopper (AI-powered, A/B testing) + mini-cart recommendations |
| Fraud prevention | Forter |
| Payments | Afterpay, Braintree CC, Braintree PayPal, PayPal Pay-in-4 |
| Monitoring | New Relic APM (app ID: 1100225435, shared AU/NZ) |

### Notable UI Details
- Account: **popup-based login/signup** (not page navigation like other brands)
- Guest wishlist: stored in **localStorage** (no login required for wishlist)
- Cookie consent: not OneTrust — injected via CMS `design_head_includes` at runtime
- NR beacon + GTM + Adobe DTM + Criteo + Taboola analytics

### AU vs NZ Differences

| | AU | NZ |
|---|---|---|
| Currency | AUD | NZD |
| Sitemap PDP count | 0 (categories only, 98 URLs) | 7,340 PDPs indexed |
| `html[lang]` | `en-AU` | `en-AU` (NZ also says en-AU — same build) |
| Socks promo | 2-for-$40 | 2-for-$45 |
| T-shirt promo | — | 2-for-$89 (NZ only) |
| UniDays | Not in sitemap | `/unidays` page |
| Droplist | Not in sitemap | `/droplist` (product drop notifications) |
| Presale | — | `/shop/presale` |
| Kids Classics | — | `/shop/kids/classics` |
| Mens EQ category | — | `/shop/mens/eq` |
| Info pages | Fewer (site under construction?) | Full set: `/about-us`, `/careers`, `/sustainability`, `/why-shop-with-us` etc. |

### CMS / Info Pages (NZ sitemap)
`/about-us`, `/afterpay`, `/back-to-school`, `/black-friday`, `/blog`, `/careers`, `/click-collect`, `/contact-us`, `/delivery`, `/droplist`, `/gift-cards`, `/gift-guide`, `/instagram-wall`, `/off-the-wall`, `/privacy-policy`, `/shop-our-sale`, `/sign-up`, `/sk8-hi`, `/stores`, `/sustainability`, `/terms-and-conditions`, `/true-fit`, `/unidays`, `/vault`, `/why-shop-with-us`

---

## Cross-Brand Comparison

| Feature | Dr. Martens | Platypus | Skechers | Vans |
|---|---|---|---|---|
| ATC label | "Add to Bag" | "Add to Cart" | "Add to Cart" | "Add to Cart" |
| Account modal | No (page nav) | No (page nav) | No (page nav) | **Yes (popup)** |
| Guest wishlist | No (login required) | No (login required) | No (login required) | **Yes (localStorage)** |
| Afterpay in mini-cart | Yes | Yes | **No (disabled)** | Yes |
| Cookie consent | OneTrust | OneTrust | OneTrust | CMS-injected (not OneTrust) |
| PLP custom selectors | No | No | **Yes** | No |
| Product URL format | `/shop/{path}.html` | `/{slug}-{sku}-{colour}.html` (root) | `*.html` / `/product/` / `/p/` | `/{slug}-{sku}-{colour}.html` (root) |
| Search test keyword | — | "sneakers" | — | — |
| Store locator path | `/stores/` | — | `/store-locator` | `/stores` |
| Blog | No | No | No | Yes (`/blog`) |
| Loyalty program | — | Platypus Kickbacks | — | Qantas QFF + PlatyPoints |
| Reviews platform | — | — | — | Bazaarvoice |
| Payments (extra) | Afterpay | Afterpay | Afterpay | + PayPal, Braintree |
| SPA hydration issue | Yes (all brands) | Yes | **Critical** | Yes |

---

## Interruptions Handled by `dismissInterruptions()`

| Type | Selector | Brands |
|---|---|---|
| Cookie consent | `#onetrust-banner-sdk` | DM, Platypus, Skechers |
| Generic modal/dialog | `[role="dialog"]`, `[aria-modal="true"]` | All |
| Geo-redirect | Likely `[role="dialog"]` | DM (possible) |
| Newsletter popup | `[role="dialog"]` | All (possible) |
| Login modal | Triggered by wishlist as guest | All |

---

## Test Data Reference

| Brand | Region | Store search suburb | Store search postcode | Search keyword |
|---|---|---|---|---|
| All AU brands | AU | Melbourne | 3000 | — |
| All NZ brands | NZ | Auckland | 1010 | — |
| Platypus | Both | — | — | "sneakers" |
