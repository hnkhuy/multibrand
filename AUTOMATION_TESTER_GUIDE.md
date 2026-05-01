# Automation Tester Guide - Multi-Brand Framework

> **For Copilot: This is the authoritative knowledge base. Keep this accurate & updated.**

## Quick Facts

- **Framework**: Playwright + TypeScript
- **Brands**: drmartens, platypus, skechers, vans (4 total)
- **Regions**: AU (Australia), NZ (New Zealand)
- **Projects**: 8 total (4 brands × 2 regions)
- **Test Files**: 7 smoke tests + 3 regression tests
- **Architecture**: Page Object Model + Custom Fixtures + Layered Selectors
- **Node Version**: ^22.10.2, TypeScript ^5.7.2, Playwright ^1.49.1

---

## Commands Cheat Sheet

```bash
# Run tests
npm test                                      # all tests, headless
npm run test:headed                           # with browser visible
npm run test:ui                               # interactive Playwright UI

# Target specific tests
npx playwright test --project=drmartens-au    # single brand/region
npx playwright test tests/smoke/pdp.spec.ts   # single file, all projects
npx playwright test tests/smoke/pdp.spec.ts --project=vans-nz  # file + project

# Reporting & Build
npm report                                    # open HTML test report
npm run build                                 # TypeScript type-check only (no emit)
```

### Key Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `RUN_LIVE_TESTS` | `false` | **MUST be `true` to run tests** |
| `CI` | unset | Sets retries=2, workers=2 |
| `TEST_ACCOUNT_EMAIL` | internal | Test account for login tests |
| `TEST_ACCOUNT_PASSWORD` | internal | Test account password |
| `DRMARTENS_AU_URL`, `DRMARTENS_NZ_URL`, etc. | staging | Override base URL |

---

## Architecture Deep Dive

### Data Flow

```
testInfo.project.metadata (ProjectMeta)
  ↓
ctx: BrandContext { brand, region, baseURL }
  ↓
selectors: Selectors (merged common + brand overrides via deepmerge)
  ↓
pageFactory → Page Objects (HomePage, PDPPage, etc.)
  ↓
Test assertions
```

### Project Metadata

Each of 8 projects has metadata defined in `config/projects.ts`:

```typescript
{
  name: 'drmartens-au',
  brand: 'drmartens',
  region: 'au',
  baseURL: 'https://stag-drmartens-au.accentgra.com/'
}
```

**Available via `testInfo.project.metadata`** in any test.

---

## File Structure & Key Files

### Configuration (`config/`)

| File | Purpose |
|---|---|
| `environments.ts` | Brands, regions, base URLs (8 projects total) |
| `projects.ts` | Converts environments to Playwright project objects |
| `testData.ts` | PLP paths, product links for each brand/region |

### Core Types (`src/core/types.ts`)

**Brand-Context Types:**
- `Brand` = 'drmartens' \| 'platypus' \| 'skechers' \| 'vans'
- `Region` = 'au' \| 'nz'
- `BrandContext` = { brand, region, baseURL }
- `ProjectMeta` = metadata from testInfo.project

**Selector Types:**
- `Selectors` (root interface) contains: layout, home, header, plp, pdp, cart, wishlist, account, minicart, checkout, cookie, modal
- Each component has its own interface (e.g., `PDPSelectors`, `HeaderSelectors`)
- **All selectors are strings** (CSS selectors or Playwright locators)

---

## Fixtures (Custom Playwright)

**Location**: `src/fixtures/test.fixture.ts`

**Always import from here, NOT from `@playwright/test`:**

```typescript
import { test, expect } from '../../src/fixtures/test.fixture';
```

### Available Fixtures

| Fixture | Type | Description |
|---|---|---|
| `ctx` | `BrandContext` | Brand, region, baseURL for current project |
| `selectors` | `Selectors` | Merged selectors (common + brand overrides) |
| `pageFactory` | `PageFactory` | Factory to create page objects |
| `home` | `HomePage` | Home page object |
| `plp` | `PLPPage` | Product List Page object |
| `pdp` | `PDPPage` | Product Detail Page object |
| `cart` | `CartPage` | Cart page object |
| `checkout` | `CheckoutPage` | Checkout page object |
| `account` | `AccountPage` | Account/Auth page object |
| `wishlist` | `WishlistPage` | Wishlist page object |

### How Fixtures Work

1. `ctx` reads `testInfo.project.metadata` → extracts brand, region, baseURL
2. `selectors` calls `buildSelectors(brand)` → merges common + brand overrides
3. `pageFactory` gets page, selectors, ctx → creates page objects
4. Pre-built page objects (home, plp, pdp, etc.) use pageFactory

---

## Selector System

### Layer 1: Common Selectors (`src/selectors/common/`)

Base selectors for all brands. Files per component:
- `layout.sel.ts`
- `home.sel.ts`
- `header.sel.ts`
- `plp.sel.ts`
- `pdp.sel.ts`
- `cart.sel.ts`
- `wishlist.sel.ts`
- `account.sel.ts`
- `minicart.sel.ts`
- `checkout.sel.ts`
- `cookie.sel.ts`
- `modal.sel.ts`

### Layer 2: Brand Overrides (`src/selectors/brands/{brand}/`)

Only brands with UI differences have overrides:

| Brand | Overrides |
|---|---|
| **drmartens** | header.sel.ts, pdp.sel.ts |
| **platypus** | header.sel.ts |
| **skechers** | plp.sel.ts |
| **vans** | (none) |

### Merge Process (`buildSelectors`)

```typescript
// src/selectors/index.ts
function buildSelectors(brand: Brand): Selectors {
  return deepmerge(COMMON_SELECTORS, BRAND_OVERRIDES[brand] ?? {})
}
```

**Result**: Common selectors are base, brand overrides replace matching keys.

### Adding Brand Overrides

If a new brand needs selector overrides:

1. Create file: `src/selectors/brands/{brand}/{component}.sel.ts`
2. Export partial selector object (only keys that differ)
3. Register in `BRAND_OVERRIDES` in `src/selectors/index.ts`

```typescript
// Example: new brand override
const BRAND_OVERRIDES: Record<Brand, DeepPartial<Selectors>> = {
  // ... existing
  newbrand: {
    header: newbrandHeaderSelectors,  // override
    pdp: newbrandPdpSelectors         // override
  }
};
```

---

## Page Object Model

### Base Class (`src/pages/BasePage.ts`)

All pages extend `BasePage`:

```typescript
export abstract class BasePage {
  readonly header: HeaderComponent;
  readonly miniCart: MiniCartComponent;
  readonly cookieBanner: CookieBannerComponent;
  readonly modal: ModalComponent;
  
  constructor(page, selectors, ctx) { ... }
  
  async goto(path = '/'): Promise<void>
  async dismissInterruptions(): Promise<void>
  async readBodyText(): Promise<string>
  async readMainText(): Promise<string>
  
  get body(): Locator
  get main(): Locator
  get footer(): Locator
  get headerRoot(): Locator
}
```

**Key Methods:**
- `goto()` — navigate + wait for page ready + dismiss interceptions
- `dismissInterruptions()` — accept cookies, close modals
- Component accessors: `header`, `miniCart`, `cookieBanner`, `modal`

### Page Classes

Located in `src/pages/`:

| Class | File | Extends |
|---|---|---|
| `HomePage` | Home.page.ts | BasePage |
| `PLPPage` | PLP.page.ts | BasePage |
| `PDPPage` | PDP.page.ts | BasePage |
| `CartPage` | Cart.page.ts | BasePage |
| `CheckoutPage` | Checkout.page.ts | BasePage |
| `AccountPage` | Account.page.ts | BasePage |
| `WishlistPage` | Wishlist.page.ts | BasePage |

### Creating Page Objects (Never Directly)

**WRONG:**
```typescript
const pdp = new PDPPage(page, selectors, ctx);
```

**RIGHT:**
```typescript
const pdp = pageFactory.createPDPPage();
// or use fixture:
test('...', async ({ pdp }) => { ... })
```

---

## Components

Reusable UI components embedded in BasePage. Located in `src/components/`:

| Component | File | Purpose |
|---|---|---|
| HeaderComponent | Header.component.ts | Navigation, search, cart icon |
| MiniCartComponent | MiniCart.component.ts | Cart drawer/modal |
| CookieBannerComponent | CookieBanner.component.ts | Cookie consent |
| ModalComponent | Modal.component.ts | Generic modal dialogs |
| SearchComponent | Search.component.ts | Search bar interactions |

Each component receives `(page, selectors)` and exposes methods:

```typescript
// Example
header.clickCartIcon()
miniCart.openDrawer()
cookieBanner.acceptIfVisible()
modal.closeIfVisible()
```

---

## Test Structure

### Smoke Tests (`tests/smoke/`)

Fast, high-level tests across all 8 projects. One file per page:

| File | Purpose | Count |
|---|---|---|
| `homepage.spec.ts` | Home page & navigation | HP-001 to HP-00X |
| `search.spec.ts` | Search functionality | SE-001 to SE-00X |
| `plp.spec.ts` | Product listing | PL-001 to PL-00X |
| `pdp.spec.ts` | Product details | **PDP-035** ← target test |
| `add-to-cart.spec.ts` | Add to cart flow | - |
| `cart.spec.ts` | Cart operations | CA-001 to CA-00X |
| `wishlist.spec.ts` | Wishlist functionality | WL-001 to WL-00X |

### Regression Tests (`tests/regression/`)

Deeper, multi-step flows. Fewer assertions, more business logic:

| File | Purpose |
|---|---|
| `checkout.spec.ts` | Full checkout flow |
| `account.spec.ts` | Account creation & login |
| `my-account.spec.ts` | Account management |

### Test Naming Convention

**Format**: `{COMPONENT}-{NUMBER} {description}`

Examples:
- `HP-001 homepage loads successfully`
- `PDP-035 product can be added to cart successfully from PDP`
- `CA-042 cart total updates when quantity changes`

**Keep test IDs in test names** — they're used for tracking & reporting.

### Test Skip Logic

Tests are **skipped by default**. Two gating mechanisms:

**1. Environment Gate** (describe level):
```typescript
describe.skip(!env.RUN_LIVE_TESTS, 'Smoke Tests', () => {
  // all tests here skip if RUN_LIVE_TESTS != true
})
```

**2. Conditional Skip** (test level):
```typescript
test.skip(!someCondition, 'Reason for skipping');
```

Use conditional skip when:
- Product is out of stock
- Feature isn't available on this brand
- Required selector not found

---

## Test Case Example: PDP-035

**Location**: `tests/smoke/pdp.spec.ts` (lines 887-902)

**What it tests**: Product can be added to cart from PDP

**Steps**:
1. Open valid PDP
2. Check Add to Cart button visible & enabled
3. Skip if not actionable
4. Select first available size (if applicable)
5. Click Add to Cart
6. Wait 700ms for UI update
7. **Assert**: Mini cart drawer OR success feedback visible

```typescript
test('PDP-035 product can be added to cart successfully from PDP', async ({ home, page, selectors }) => {
  await openValidPdp(home, page, selectors);
  const addToCart = page.locator(selectors.pdp.addToCartButton).first();
  const atcVisible = await addToCart.isVisible().catch(() => false);
  const atcEnabled = atcVisible ? await addToCart.isEnabled().catch(() => false) : false;

  test.skip(!atcVisible || !atcEnabled, 'Add to Cart is not actionable on this PDP.');

  await selectFirstAvailableSizeIfPossible(page, selectors);
  await addToCart.click({ timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(700);

  const miniCartVisible = await page.locator(selectors.minicart.drawer).first().isVisible().catch(() => false);
  const successVisible = await page.locator(selectors.pdp.successFeedback).first().isVisible().catch(() => false);
  expect(miniCartVisible || successVisible).toBe(true);
});
```

### Key Patterns in PDP-035

1. **Safe locator access**: `.catch(() => false)` for all element checks
2. **Visibility check first**: Before enabled, before clicking
3. **Conditional skip**: Test gracefully skips if prerequisites unmet
4. **Wait after action**: `page.waitForTimeout(700)` for async updates
5. **Flexible assertion**: Multiple success indicators (`miniCartVisible || successVisible`)

---

## Common Patterns & Best Practices

### Pattern 1: Safe Element Checks

```typescript
// DON'T: Will throw if element not found
const enabled = await addToCart.isEnabled();

// DO: Graceful fallback
const enabled = await addToCart.isEnabled().catch(() => false);
```

### Pattern 2: Selector-First Approach

```typescript
// Use selectors fixture for all element queries
const button = page.locator(selectors.pdp.addToCartButton).first();

// Optionally narrow further with .first(), .nth(0), etc.
```

### Pattern 3: Conditional Assertions

```typescript
// Multiple valid outcomes
const miniCartVisible = await miniCart.isVisible().catch(() => false);
const toastVisible = await toast.isVisible().catch(() => false);
expect(miniCartVisible || toastVisible).toBe(true);
```

### Pattern 4: Text Pattern Matching

```typescript
const bodyText = await page.locator('body').textContent() ?? '';
const inStock = /in stock|available now|ready to ship/i.test(bodyText);
```

### Pattern 5: Retry & Timeout

```typescript
// Explicit timeout
await button.click({ timeout: 5000 }).catch(() => undefined);

// Ignore failure
await action().catch(() => undefined);
```

---

## Test Data & Paths

### Test Data (`config/testData.ts`)

Contains PLP paths & product links for each brand/region:

```typescript
export const plpPaths: Record<Brand, Record<Region, string>> = {
  drmartens: {
    au: '/en-au/shoes/work',
    nz: '/en-nz/shoes/work'
  },
  // ... more brands
};
```

Usage in tests:
```typescript
import { plpPaths } from '../../config/testData';

await page.goto(plpPaths[ctx.brand][ctx.region]);
```

---

## Debugging & Troubleshooting

### Run Single Test
```bash
npx playwright test tests/smoke/pdp.spec.ts --project=drmartens-au
```

### Headed Mode (See Browser)
```bash
npm run test:headed
```

### Playwright UI (Step Through)
```bash
npm run test:ui
```

### Check Test Report
```bash
npm report
```

### Enable Debug Logging
```bash
PWDEBUG=1 npm test
```

---

## Common Failures & Fixes

| Error | Likely Cause | Fix |
|---|---|---|
| `Test skipped` | `RUN_LIVE_TESTS != true` | Set `RUN_LIVE_TESTS=true` |
| `Timeout waiting for` | Network slow, element delayed | Increase timeout or wait time |
| `Element not found` | Selector incorrect for brand | Check brand override in selectors |
| `Expected true, got false` | Skip logic worked, test expectation failed | Review assertion logic |

---

## Adding New Test Cases

### Template

```typescript
test('TEST-XXX description of what is tested', async ({ home, page, selectors, ctx }) => {
  // 1. Setup / Navigate
  await home.goto();
  
  // 2. Gather state
  const element = page.locator(selectors.pdp.addToCartButton).first();
  const visible = await element.isVisible().catch(() => false);
  
  // 3. Skip if prerequisites unmet
  test.skip(!visible, 'Element not visible on this brand');
  
  // 4. Perform action
  await element.click();
  await page.waitForTimeout(500);
  
  // 5. Assert result
  const result = await page.locator(selectors.pdp.successFeedback).isVisible().catch(() => false);
  expect(result).toBe(true);
});
```

### Checklist

- [ ] Use custom fixtures (test, expect from test.fixture)
- [ ] Add test ID to name (TEST-XXX)
- [ ] Use ctx, selectors fixtures
- [ ] Safe element access (.catch(() => false))
- [ ] Conditional skip before assertions
- [ ] Add waits after async actions
- [ ] Flexible assertions (accept multiple indicators)
- [ ] Document why test might be skipped

---

## Brand & Region Matrix

```
drmartens:   drmartens-au,   drmartens-nz
platypus:    platypus-au,    platypus-nz
skechers:    skechers-au,    skechers-nz
vans:        vans-au,        vans-nz
```

Each project has:
- Unique `name` (e.g., 'drmartens-au')
- Same `brand` (e.g., 'drmartens')
- Same `region` (e.g., 'au')
- Unique `baseURL` (staging URL for that brand/region)

---

## Key Types Quick Reference

```typescript
// From src/core/types.ts
type Brand = 'drmartens' | 'platypus' | 'skechers' | 'vans';
type Region = 'au' | 'nz';

interface BrandContext {
  brand: Brand;
  region: Region;
  baseURL: string;
}

interface ProjectMeta extends BrandContext {
  name: string; // e.g., 'drmartens-au'
}

interface Selectors {
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
```

---

## Next Steps for Copilot

When implementing or debugging tests:

1. **Check environment**: Is `RUN_LIVE_TESTS=true`?
2. **Verify fixtures**: Are imports from `src/fixtures/test.fixture`?
3. **Check selectors**: Does brand have overrides? Use `buildSelectors(brand)` logic
4. **Review patterns**: Use safe element access, conditional skip, flexible assertions
5. **Test isolation**: Each test should be runnable independently
6. **Readable names**: Keep test IDs (e.g., PDP-035) in test descriptions

---

**Last Updated**: 2026-05-02  
**Maintained By**: Automation Tester + Copilot
