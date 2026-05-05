# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> For project overview, brands/regions, setup, and environment variables — see [README.md](README.md).

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
- `home`, `plp`, `pdp`, `cart`, `checkout`, `account`, `wishlist`, `search`, `store` — pre-built page objects

### Selector Strategy

Selectors follow a **component-based structure** (header, pdp, plp, etc.) split into two layers:

- `src/selectors/common/` — base selectors shared across all brands (one file per component)
- `src/selectors/brands/{brand}/` — brand-specific overrides (only the components that differ)

`buildSelectors(brand)` in `src/selectors/index.ts` produces the final set via deep merge:

```
FINAL_SELECTORS = merge(COMMON_SELECTORS, BRAND_OVERRIDES[brand])
```

Current overrides: drmartens → header + pdp, platypus → header, skechers → plp (productCard + productName + productLink + quickAdd), vans → none.

To add a brand override: create a component selector file under `src/selectors/brands/{brand}/`, then register it in `BRAND_OVERRIDES` in `src/selectors/index.ts`.

### Page Object Model

`src/pages/BasePage.ts` is the abstract base with `goto()`, `dismissInterruptions()`, and shared component accessors (`header`, `miniCart`, `cookieBanner`, `modal`). Page classes receive `(page, selectors, ctx)` via the factory — never instantiate them directly.

### Test Conventions

- Tests are gated by `test.skip(!env.RUN_LIVE_TESTS, '...')` at the `describe` level
- Test IDs follow the pattern `HP-001`, `CO-042`, etc. — preserve these in test names
- Smoke tests live in `tests/smoke/`, regression tests in `tests/regression/`
- Tests use regex patterns for flexible assertions on dynamic content (e.g., `ERROR_UI_PATTERN`, `EMPTY_CART_PATTERN`)
- Skechers is a SPA with styled-components (hash CSS classes) — products render after JS hydration, not at `domcontentloaded`. Use `waitForFunction` polling on the card selector in `expectLoaded()` instead of `innerText` checks.

## Maintenance

After each architectural change (new brand, new selector layer, new fixture, new page object, changed project structure), suggest updating this file to keep it accurate.

At the end of each working session, update this file with: what we just did, important technical decisions made, and what needs to be done next.

## Dev Journal Protocol

After each working session, append a summary to `docs/dev-journal.md` using this format:

---
## YYYY-MM-DD — <Topic>
**Goal:** What we were trying to achieve
**Approach:** Strategy / implementation direction chosen
**Files changed:** List of key files modified
**Issues hit:** Problems encountered during the session
**Resolution:** How issues were resolved (or current status)
**Next:** What to pick up next session
---

Rules:
- Always append, never overwrite previous entries
- Keep each entry concise (under 20 lines)
- If strategy or architecture decisions changed this session, update the relevant section in CLAUDE.md as well
- At the start of each new session, read the last 2–3 entries in dev-journal.md to restore context

<!-- ## Session Startup
On every new session: read the last 3 entries in `docs/dev-journal.md` before doing anything else. -->
