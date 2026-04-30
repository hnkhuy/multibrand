# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                   # run all tests headless
npm run test:headed        # run with visible browser
npm run test:ui            # interactive Playwright UI mode
npm report                 # open HTML report
npm run build              # TypeScript type-check (no emit)

# target a specific project or file
npx playwright test --project=drmartens-au
npx playwright test tests/smoke/homepage.spec.ts --project=platypus-nz
```

Key environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `RUN_LIVE_TESTS` | `false` | Tests skip unless this is `true` |
| `CI` | unset | Enables retries (2) and workers (2) |
| `TEST_ACCOUNT_EMAIL` / `TEST_ACCOUNT_PASSWORD` | hardcoded defaults | Login credentials |
| `DRMARTENS_AU_URL`, `PLATYPUS_NZ_URL`, … | staging URLs | Override base URL per brand/region |

## Architecture

### Multi-Brand Project Matrix

8 Playwright projects: **4 brands** (drmartens, platypus, skechers, vans) × **2 regions** (au, nz). Each project is defined in `config/environments.ts` with a staging URL, overridable via `{BRAND}_{REGION}_URL` env vars. Project metadata (brand, region, baseURL) flows into tests through the `ctx` fixture.

### Custom Fixtures (always use these instead of `@playwright/test`)

```typescript
import { test, expect } from '../../src/fixtures/test.fixture';
```

`src/fixtures/test.fixture.ts` extends Playwright's base with:
- `ctx` — BrandContext (brand, region, baseURL) derived from `testInfo.project.metadata`
- `selectors` — merged selector set for the current brand
- `pageFactory` — creates page objects with injected dependencies
- `home`, `plp`, `pdp`, `cart`, `checkout`, `account`, `wishlist` — pre-built page objects

### Selector Merging

`src/selectors/index.ts` — `buildSelectors(brand)` deep-merges `COMMON_SELECTORS` with brand-specific overrides from `src/selectors/brands/{brand}/`. Currently: drmartens overrides header + pdp, platypus overrides header, skechers overrides plp, vans has no overrides.

To add a brand override: create selector files under `src/selectors/brands/{brand}/`, add to `BRAND_OVERRIDES` in `src/selectors/index.ts`.

### Page Object Model

`src/pages/BasePage.ts` is the abstract base with `goto()`, `dismissInterruptions()`, and shared component accessors (`header`, `miniCart`, `cookieBanner`, `modal`). Page classes receive `(page, selectors, ctx)` via the factory — never instantiate them directly.

### Test Conventions

- Tests are gated by `test.skip(!env.RUN_LIVE_TESTS, '...')` at the `describe` level
- Test IDs follow the pattern `HP-001`, `CO-042`, etc. — preserve these in test names
- Smoke tests live in `tests/smoke/`, regression tests in `tests/regression/`
- Tests use regex patterns for flexible assertions on dynamic content (e.g., `ERROR_UI_PATTERN`, `EMPTY_CART_PATTERN`)
