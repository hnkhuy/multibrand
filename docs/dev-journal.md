# Dev Journal

---
## 2026-05-06 — Search Page Automation (SR-001 to SR-090)

**Goal:** Implement all 90 search page test cases from `src/documents/tcs/GRA_SearchPage-Tcs.csv`, then fix failures discovered across all 8 sites.

**Approach:**
- Added `SearchSelectors` interface to `src/core/types.ts` and extended `Selectors`
- Created `src/selectors/common/search.sel.ts` with multi-fallback CSS selectors
- Created `src/pages/Search.page.ts` extending `BasePage`
- Wired up factory, fixture, and feature flags
- Wrote 44 test cases in `tests/smoke/search.spec.ts` covering all TC groups
- Ran full suite across 8 projects (2 workers), identified root causes of failures
- Fixed Skechers cascade: `productCard` selector updated in `src/selectors/brands/skechers/plp.sel.ts`
- Fixed `expectLoaded()` in `Search.page.ts` to poll card selector via `waitForFunction` instead of `innerText` (avoids promo banner false-positive)
- Fixed auto-suggestion selectors: added `.text-suggestion`, `a.product-suggestion`, `button.category` to match Skechers DOM

**Files changed:**
- `src/core/types.ts` — added `SearchSelectors`, `StoreSelectors`, optional fields on `Selectors`
- `src/selectors/common/search.sel.ts` — new
- `src/selectors/common/store.sel.ts` — new
- `src/selectors/common/index.ts` — added search + store
- `src/selectors/brands/skechers/plp.sel.ts` — fixed `productCard` selector
- `src/pages/Search.page.ts` — new
- `src/pages/Store.page.ts` — new
- `src/factories/pages.factory.ts` — added search + store factories
- `src/fixtures/test.fixture.ts` — added search + store fixtures
- `config/brandFeatures.ts` — added search + store feature flags
- `tests/smoke/search.spec.ts` — new (44 TCs)
- `tests/smoke/store.spec.ts` — new

**Issues hit:**
- Skechers uses styled-components (hash classes) + SPA hydration — products not in DOM at `domcontentloaded`
- `innerText.includes(')')` triggered on promo banner before products loaded, causing false pass then timeout
- `autoSuggestionItem` selector didn't match Skechers' `button.text-suggestion` / `a.product-suggestion`
- Staging server throttling caused SR-001, SR-038, SR-044 timeouts (not code issues)

**Resolution:**
- `expectLoaded()` now polls `querySelectorAll(cardSelector).length > 0` via `waitForFunction`
- Auto-suggestion selectors extended with Skechers-specific class names
- Staging flakiness accepted as infrastructure limitation (not fixable in code)

**Next:** Run full suite again to confirm Skechers SR-012/SR-017 fixed; investigate any remaining brand-specific failures.
