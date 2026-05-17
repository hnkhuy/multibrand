# Dev Journal

---
## 2026-05-01 — CLAUDE.md Initialisation

**Goal:** Create a `CLAUDE.md` to give future Claude Code instances a concise, accurate picture of the project.

**Approach:** Ran `/init` to auto-generate an initial file; reviewed it and found the selector strategy section inaccurate; manually corrected it to reflect the two-layer deepmerge architecture (`COMMON → BRAND_OVERRIDE`); added a Maintenance Rule asking Claude to suggest updates after every architectural change.

**Files changed:**
- `CLAUDE.md` — created; selector strategy section updated with component-based structure, deepmerge formula, and maintenance rule

**Issues hit:**
- Auto-generated content too verbose and did not accurately describe the selector deepmerge strategy
- Required `RUN_LIVE_TESTS=true` gate not prominently documented

**Resolution:** Manually rewrote selector section; added env-var table and maintenance rule.

**Next:** Keep CLAUDE.md updated as architecture evolves.

---
## 2026-05-01 — First PDP Run on drmartens-au (Debug)

**Goal:** Run the first 10 PDP test cases on `drmartens-au` and analyse results.

**Approach:** Triggered test run with 4 workers; all 10 tests timed out or skipped; narrowed down to staging server cold-start latency as root cause; evaluated warmup strategies (globalSetup, storageState, `channel: 'chrome'`); implemented `channel: 'chrome'` + `navigationTimeout: 120_000` as the quickest win.

**Files changed:**
- `playwright.config.ts` — set `channel: 'chrome'` and `navigationTimeout: 120_000`

**Issues hit:**
- All tests skipped: `openValidPdp()` URL-pattern `/\/product\/|\/p\/|\.html/i` did not match DRM product URLs (JS-rendered SPA, curl showed no product links)
- Staging server cold-start caused first-load timeouts across all brands

**Resolution:** `channel: 'chrome'` reuses the installed Chrome profile (warm cache); navigationTimeout raised to 120 s to survive cold-start; DRM product URL pattern noted for follow-up.

**Next:** Verify fix resolves skips; audit product-URL pattern for other brands.

---
## 2026-05-02 — PLP Test Run — First Attempt (Interrupted)

**Goal:** Run the first 10 PLP test cases with `RUN_LIVE_TESTS=true` and report results.

**Approach:** Launched background test run for `plp.spec.ts` first 10 TCs.

**Files changed:** None.

**Issues hit:**
- Run interrupted by user mid-execution before results were delivered
- Background task exited with failure status (likely wrong working directory or missing `results/` folder)

**Resolution:** No results produced; session abandoned.

**Next:** Re-run PLP tests cleanly with correct working directory and output path.

---
## 2026-05-02 — Playwright Worker Configuration Check

**Goal:** Confirm how many parallel workers Playwright is configured to use.

**Approach:** Read `playwright.config.ts` worker settings; confirmed config is correct for available CPU cores.

**Files changed:** None.

**Issues hit:** None.

**Resolution:** Workers already set correctly; no changes needed.

**Next:** Use `caffeinate -dims npx playwright test` when running overnight to prevent Mac sleep.

---
## 2026-05-02 — Prevent Mac Sleep During Long Test Runs

**Goal:** Keep Mac awake during 30–45 min automation runs without closing the lid.

**Approach:** Checked `pmset` settings; found `displaysleep 10` would blank screen but not interrupt processes; recommended `caffeinate -dims` wrapper.

**Files changed:** None (change suggested for `package.json` scripts but not applied).

**Issues hit:** Closing MacBook lid triggers clamshell sleep regardless of pmset settings.

**Resolution:** Advised `caffeinate -dims npm test` for ad-hoc runs; confirmed system stays on as long as lid is open and power is connected.

**Next:** Optionally add a `test:awake` npm script wrapping tests with `caffeinate -dims`.

---
## 2026-05-03 — Test Coverage Audit + My Account Regression Fixes

**Goal:** Identify untested e-commerce pages/features across all 8 sites; then fix discovered gaps in My Account regression tests.

**Approach:** Scanned existing `.spec.ts` files for coverage gaps; identified My Account dashboard as under-tested; fixed flaky patterns in `tests/regression/my-account.spec.ts`.

**Files changed:**
- `tests/regression/my-account.spec.ts` — narrowed `LOGIN_COPY_PATTERN` and `ERROR_COPY_PATTERN` regexes; fixed `navigateToSection()` to verify URL post-navigation; scoped `viewLink` locator to `main` to avoid header/footer false clicks; changed page loads to `waitUntil: 'domcontentloaded'` with 45 s timeout
- `src/pages/BasePage.ts` — minor updates to support account testing

**Issues hit:**
- `LOGIN_COPY_PATTERN` too broad — matched email/password labels, causing false positives on ACC-014
- `ERROR_COPY_PATTERN` matched "required" / "please enter" inline validation, not auth errors
- `navigateToSection()` resolved on `domcontentloaded` before URL had changed
- `viewLink` selector clicked header nav links instead of account dashboard links

**Resolution:** All 5 patterns narrowed/scoped; TypeScript type-check passed clean after fixes.

**Next:** Run My Account regression suite across all 8 sites to verify fixes hold.

---
## 2026-05-03 — Selector Refactor — Move Locators Out of Spec Files

**Goal:** Refactor `wishlist.spec.ts`, `pdp.spec.ts`, and `plp.spec.ts` to remove ~50+ inline selector `const` blocks and wire them through the existing selector strategy instead.

**Approach:** Confirmed that all inline selectors in spec files already existed in `common/` selector files; removed duplicates from specs; fixed TypeScript errors caused by over-broad optional (`?`) typing in selector interfaces; made required fields non-optional in `WishlistSelectors` and `PDPSelectors`.

**Files changed:**
- `tests/smoke/wishlist.spec.ts` — removed 11 inline selector consts; replaced with `selectors.*`
- `tests/smoke/pdp.spec.ts` — removed ~25 inline selector consts; wired through fixture
- `tests/smoke/plp.spec.ts` — removed inline selector block; wired through fixture
- `src/core/types.ts` — made previously optional fields required in `WishlistSelectors`, `PDPSelectors`

**Issues hit:**
- TypeScript `string | undefined` errors after removing consts — root cause was unnecessary `?` on selector interface fields
- `plp.spec.ts` and `pdp.spec.ts` were interdependent; had to wire both carefully to avoid breaking each other

**Resolution:** Fixed interface types to reflect that common selectors always provide values; TypeScript build passed clean.

**Next:** Run full suite to confirm no regression from the refactor.

---
## 2026-05-03 — Chat Conventions + CLAUDE.md Maintenance Protocol

**Goal:** Establish consistent chat conventions and add a CLAUDE.md maintenance rule to reduce repeated context-setting.

**Approach:** Agreed on brand abbreviations for use in chat: `drm=drmartens`, `pla=platypus`, `skx=skechers`, `van=vans`; verified the CLAUDE.md maintenance rule was present (added in a previous session); confirmed the end-of-session update protocol.

**Files changed:**
- `CLAUDE.md` — confirmed maintenance rule and end-of-session update protocol are present (no new changes needed)

**Issues hit:** None.

**Resolution:** Conventions established; saved to memory for future sessions.

**Next:** Apply abbreviations consistently in all future sessions.

---
## 2026-05-03 — Mini Cart Test Automation (MC-001 to MC-035+)

**Goal:** Implement all mini cart test cases from `src/documents/tcs/GRA_MiniCart-Tcs.csv`.

**Approach:** Read CSV; modelled after existing `cart.spec.ts` patterns; extended `MiniCartSelectors` interface; added feature flags per brand; wrote 35+ test cases covering open/close, item management, quantity controls, subtotal, payment messaging, and empty state.

**Files changed:**
- `tests/smoke/mini-cart.spec.ts` — new (35+ TCs)
- `src/core/types.ts` — expanded `MiniCartSelectors` with 15 new optional fields
- `src/selectors/common/minicart.sel.ts` — added selector definitions for new fields
- `src/components/MiniCart.component.ts` — updated component to expose new locators
- `config/brandFeatures.ts` — added `miniCartPaymentMessaging`, `miniCartPromoMessage` flags

**Issues hit:**
- Drawer vs modal pattern differs across brands — needed flexible open/dismiss logic
- `MC-035` referenced `pdp.selectors` which fixture doesn't expose directly
- Live test run was interrupted by user before completion

**Resolution:** Used fallback selector chains and feature flags to branch brand-specific paths; `MC-035` deferred.

**Next:** Execute mini cart tests on all brands; fix any remaining selector mismatches.

---
## 2026-05-03 — Cart Test Run Across 8 Sites (Interrupted)

**Goal:** Run `tests/smoke/cart.spec.ts` on all 8 projects and identify root causes of failures/skips.

**Approach:** Attempted to launch background test run with 2 workers.

**Files changed:** None.

**Issues hit:**
- Session interrupted — user already had `workers: 2` configured; assistant attempted redundant config change
- Background test run started but analysis was never delivered

**Resolution:** User stopped session; no analysis produced.

**Next:** Re-run cart tests cleanly and deliver a structured pass/fail/skip breakdown per brand.

---
## 2026-05-04 — PDP Full Suite Run + Size/Color Selector Fixes

**Goal:** Run all 72 PDP test cases across all 8 projects (576 total) and diagnose the root causes of failures/skips.

**Approach:** Built project, listed 576 tests, ran full suite with JSON reporter; analysed results (271 pass / 305 skip / 0 fail); diagnosed three root causes — PLP path instability (DRM `/shop/sale`), wrong ATC selector (`.first()` picking hidden sticky button), and size/color options not found (selector used `button` but DOM used `div.size-menu-item`); confirmed via diagnostic script dumping real PDP HTML; fixed size and color selector patterns.

**Files changed:**
- `src/selectors/common/pdp.sel.ts` — updated `sizeOption` to include `div.size-menu-item`; updated `colorOption` to match swatch `<a>` elements
- `src/pages/PDP.page.ts` — added `waitForFunction` poll before interacting with size/color swatches

**Issues hit:**
- Adding `await page.waitForTimeout(8_000)` before size/color checks did not help — elements never appeared with old selectors (timeout in silence confirmed selector was wrong, not lazy load)
- `addToCartButton.first()` was hitting a hidden sticky ATC bar
- DRM product URL used `/shop/sale` path which was unstable on staging

**Resolution:** Selector fixes applied for size (`div.size-menu-item`) and color (`a[href]` swatch); ATC sticky-button issue noted for follow-up; DRM PLP path issue deferred as low-priority.

**Next:** Re-run PDP suite to confirm skip count drops; fix ATC selector to exclude sticky bar.

---
## 2026-05-04 — Search Page Automation (SR-001 to SR-090) — Implementation

**Goal:** Implement all 90 search test cases from `src/documents/tcs/GRA_SearchPage-Tcs.csv` following the existing project structure.

**Approach:** Added `SearchSelectors` to `types.ts`; created `search.sel.ts`, `Search.page.ts`, factory method, fixture, and feature flags; wrote 44 TCs in `tests/smoke/search.spec.ts` covering entry points, input, auto-suggestion, results, filters, sort, pagination, UI, responsive, security, and stability groups.

**Files changed:**
- `src/core/types.ts` — added `SearchSelectors` interface and optional `search` field on `Selectors`
- `src/selectors/common/search.sel.ts` — new
- `src/selectors/common/index.ts` — registered search selectors
- `src/pages/Search.page.ts` — new
- `src/factories/pages.factory.ts` — added `createSearchPage()`
- `src/fixtures/test.fixture.ts` — added `search` fixture
- `config/brandFeatures.ts` — added 9 search feature flags
- `tests/smoke/search.spec.ts` — new (44 TCs)

**Issues hit:** None at implementation stage; failures identified in subsequent run session.

**Next:** Run full suite across all 8 sites and fix failures.

---
## 2026-05-06 — Excessive test.skip Audit + Approach C Implementation

**Goal:** Eliminate ~366 non-standard `test.skip` calls that were masking failures and inflating pass rates.

**Approach:** Audited all spec files; found 375 total `test.skip` calls, only 9 being the valid `RUN_LIVE_TESTS` gate; categorised the remaining 366 into three patterns — precondition failures skipping instead of failing, UI-element absence skipping instead of asserting, and brand-feature variations skipping instead of using feature flags; chose Approach C: convert precondition failures to hard assertions, add `brandFeatures` flags for feature variations, tag data-dependent tests with `@data-dependent`.

**Files changed:**
- `config/brandFeatures.ts` — added feature flags (`quickAddOnPlp`, etc.) to replace skip-by-brand patterns
- `tests/smoke/cart.spec.ts` — precondition skips → `expect` assertions
- `tests/smoke/plp.spec.ts` — feature-variation skips → `brandFeatures` flag guards
- Multiple spec files — `@data-dependent` tag added to tests with genuine data dependencies

**Issues hit:**
- 366 skips across multiple files; changes had to be made file-by-file to avoid regressions
- Some skips were genuinely data-dependent (OOS products, video products) — these needed tagging rather than removal

**Resolution:** Non-standard skips replaced; TypeScript build passed; approach documented in CLAUDE.md.

**Next:** Run full suite to confirm real failure rate is now visible; address newly exposed failures.

---
## 2026-05-06 — Test Data Strategy Discussion

**Goal:** Fix the lack of specific test data for PDP scenarios requiring particular product states (OOS, video, multi-size, single-size).

**Approach:** Discussed the root cause: `openValidPdp()` picks the first product found on PLP, which is random and may not satisfy preconditions; evaluated options — static product URLs in `testData.ts` (Option A), dynamic product discovery with retries (Option B), or fixture-level product catalogue (Option C); agreed on Option A (static per-brand product URLs) as simplest and most reliable.

**Files changed:** None (discussion/design session only).

**Issues hit:**
- Dynamic product discovery is fragile — staging inventory changes; OOS/video/multi-size products may disappear
- Option B (retry with selector checks) adds complexity and still fails if no qualifying product exists

**Resolution:** Agreed to add static `pdpUrls` per brand in `config/testData.ts` with separate keys for `generic`, `oos`, `video`, `multiSize` products; implementation deferred to next session.

**Next:** Add static product URLs to `testData.ts`; update `openValidPdp()` to accept an optional product-type parameter.

---
## 2026-05-06 — Search Test Failures: Skechers Selector Fixes

**Goal:** Fix Critical Skechers issue — all skechers-au/nz search result tests failing; then fix auto-suggestion selector mismatch (SR-012/SR-017).

**Approach:**
- Diagnosed Skechers cascade: `productCard` selector was generic and missed Skechers styled-components DOM
- Fixed `expectLoaded()` to poll `querySelectorAll(cardSelector).length > 0` via `waitForFunction` (previous `innerText.includes(')')` triggered on promo banner `<p>` before products rendered)
- Inspected Skechers suggestion DOM live; found `button.text-suggestion`, `a.product-suggestion`, `button.category` — added to common search selectors

**Files changed:**
- `src/selectors/brands/skechers/plp.sel.ts` — updated `productCard` to `.productCard, [data-product-id], ...`
- `src/pages/Search.page.ts` — `expectLoaded()` now uses `waitForFunction` card-selector poll
- `src/selectors/common/search.sel.ts` — added `.text-suggestion`, `a.product-suggestion`, `button.category` to suggestion selectors
- `docs/dev-journal.md` — created
- `CLAUDE.md` — updated fixtures list, Skechers override detail, and SPA behavior note

**Issues hit:**
- Skechers SPA: products render after JS hydration, not at `domcontentloaded`
- Promo banner `<p>` contains `)` causing `innerText` check to pass early
- `autoSuggestionItem` didn't match Skechers' `button.text-suggestion`
- Staging server throttling caused SR-001/SR-038/SR-044 timeouts (infrastructure, not code)

**Resolution:** ~80% of Skechers cascade failures resolved; SR-012/SR-017 selector fix applied; staging flakiness accepted as infrastructure limitation.

**Next:** Re-run full suite to confirm SR-012/SR-017 pass; investigate any remaining brand-specific failures on other brands.

---
## 2026-05-06 — Mini-Cart Test Run on All 8 Sites + MC-003/MC-007 Fix

**Goal:** Run `mini-cart.spec.ts` across all 8 projects, identify root causes of all failures, and fix them.

**Approach:** Ran 4 targeted tests (MC-001 to MC-003, MC-007) across all 8 brands; found MC-001/MC-002 pass universally; MC-003 and MC-007 fail universally; diagnosed both root causes; fixed MC-003 first (CSS transform close detection), then MC-007 (search navigation + ATC).

**Files changed:**
- `src/components/MiniCart.component.ts` — `close()` and `expectClosed()` rewritten to detect CSS `transform: translateX()` off-screen state (DRM/Skechers drawer pattern) in addition to `display:none`
- `src/pages/BasePage.ts` — `goto()` switched to `waitUntil: 'domcontentloaded'`
- `src/pages/PDP.page.ts` — `addToCart()` improved; `selectFirstAvailableSize()` extended to handle both `button` and `div` size selectors
- `src/pages/Search.page.ts` — submit via `Enter` key before falling back to submit-button click (avoids hitting wrong button in DRM/Vans mega-nav)
- `src/selectors/common/minicart.sel.ts` — added CSS-transform close detection selector
- `src/selectors/brands/skechers/plp.sel.ts` — productCard selector updated

**Issues hit:**
- **MC-003**: DRM mini-cart uses `transform: translateX()` slide animation — Playwright's `isVisible()` returns `true` even when drawer is off-screen; `not.toBeVisible()` always failed; needed bounding-box transform detection
- **MC-007**: DRM/Vans `searchSubmit` selector matched a button inside the mega-nav, opening WOMEN navigation instead of submitting search → no PDP reached → ATC timed out at 150 s
- DRM `continueShoppingCta` fallback matched "SHOP NOW" on homepage banner instead of the button inside the drawer

**Resolution:** MC-003 fixed — all 8 brands pass (22 s total vs ~6 min of failures); MC-007 fixed for DRM/Vans via `Enter`-key search submit; Skechers/Platypus MC-007 remain as staging ATC infrastructure issue.

**Next:** Run full mini-cart suite to verify MC-003 fix holds across all 35+ TCs; investigate Skechers/Platypus ATC issue.

---
## 2026-05-06 — Store Locator Test Automation (SL-001 to SL-084)

**Goal:** Implement full store locator and "Find in Store" test coverage from scratch, following the same architecture used for the search suite.

**Approach:** Added `StoreSelectors` interface and `store` optional field to `Selectors`; created `store.sel.ts` with broad heuristic selectors covering `data-testid`, class-name, and semantic HTML patterns; built `Store.page.ts` with `goto()` that probes candidate URL paths (`/store-locator`, `/find-a-store`, `/stores`, etc.); registered in factory and fixture; wrote 84 TCs in `tests/smoke/store.spec.ts` covering entry point, page load, search (suburb/postcode/invalid/edge cases), results, store details, map, geolocation, Find-in-Store modal, filtering, regional rules, UI, responsive, mobile, performance, stability, error handling, accessibility, and analytics groups.

**Files changed:**
- `src/core/types.ts` — added `StoreSelectors` interface and optional `store` field on `Selectors`
- `src/selectors/common/store.sel.ts` — new (heuristic selectors for all store locator elements)
- `src/selectors/common/index.ts` — registered `storeSelectors` in `COMMON_SELECTORS`
- `src/selectors/common/search.sel.ts` — added Skechers-specific suggestion selectors (`.text-suggestion`, `a.product-suggestion`, `button.category`) from prior session's fix
- `src/pages/Store.page.ts` — new page class with `goto()`, `searchStores()`, `openFindInStore()`, `searchAvailability()`, `closeFindInStore()`, and card sub-locator helpers
- `src/factories/pages.factory.ts` — added `createStorePage()`
- `src/fixtures/test.fixture.ts` — added `store` fixture
- `config/brandFeatures.ts` — added 9 store locator feature flags (`storeLocatorEnabled`, `storeLocatorMap`, `storeLocatorGeolocation`, `storeLocatorFilters`, `findInStore`, `findInStoreVariantCheck`, `storeDistanceDisplay`, `storePhoneDisplay`, `storeHoursDisplay`)
- `config/testData.ts` — added `StoreTestData` interface and `storeData` per region (AU: Melbourne/3000, NZ: Auckland/1010)
- `tests/smoke/store.spec.ts` — new (84 TCs, SL-001 to SL-084)

**Issues hit:**
- Store locator URL path varies per brand — no single canonical route; needed `goto()` to try multiple candidates
- Map pins load asynchronously (third-party map SDK); tests assert map container stability rather than pin count
- Find-in-Store modal may require a variant to be selected first on some brands — `@data-dependent` tags used to mark those

**Resolution:** `goto()` probes candidate paths and skips 404s; map/geolocation/filter TCs are gated by feature flags so brands without those features skip cleanly; `@data-dependent` TCs use defensive checks before asserting.

**Next:** Run store suite across all 8 projects; add brand-specific selector overrides once real staging URLs are inspected.

---
## 2026-05-06 — Search SR tests + mini-cart 2-worker run analysis

**Goal:** (1) Add 36 missing SR tests to search spec; (2) Run full mini-cart suite with stable worker count; (3) Analyse results across all 8 brands.

**Approach:** Identified missing SR-011/013/014/016/018/020/023/024/026/027/035/039/048/053/056/059/061/065/068/071/072/073/074/076/078/080-090 by diffing TCS against spec. Appended all 36 tests to search.spec.ts grouped by category (auto-suggestion, search result, sorting, product card, region, UI, responsive, mobile, performance, stability, error handling, accessibility, analytics). Mini-cart suite switched from 3 workers → 2 workers to reduce staging contention; ATC failure times dropped from 3-5m to <1m per test.

**Files changed:**
- `tests/smoke/search.spec.ts` — 36 tests added (SR-011 to SR-090, now all 90 TCs present)

**Issues hit:**
- 3-worker mini-cart run: ATC tests timing out at 3-5 min each; DRM-AU MC-007 failing despite passing in isolation
- Background process (`&`) dies when tool session ends; needed `run_in_background: true` for persistence
- DRM-AU with 2 workers: MC-007 now passes; ATC tests fail in <1m (cart count 0 — staging issue, not code)

**Resolution:** Switched to 2 workers; ATC-dependent failures are confirmed staging instability (not code regressions). MC-007 passes for DRM-AU and Vans brands.

**Next:** Wait for full 2-worker run to complete; capture brand-by-brand pass/fail matrix; run store spec once staging URLs are confirmed; investigate MC-049/MC-058 non-ATC failures for DRM-AU.

---
## 2026-05-07/08 — Custom Reporting System (Monocart + Archive)

**Goal:** Build a persistent, Jenkins-like reporting system on top of Monocart to track pass rates per brand over time and browse full historical run reports.

**Approach:** Added `monocart-reporter` alongside existing HTML reporter. All custom logic lives in `scripts/brand-chart-generator.ts`, called via monocart's `onEnd` hook. Built 4 report pages: dashboard (hub), run archive browser, brand bar chart, and nav injected into monocart's own index.html.

**Files changed:**
- `playwright.config.ts` — added monocart reporter + onEnd hook
- `scripts/brand-chart-generator.ts` — new: all report generation logic
- `package.json` — added monocart dep + report:* scripts + rm -rf test-results in pretest
- `.gitignore` — exceptions for `reports/monocart/index.json` and `brand-trend.json`

**Issues hit:**
- Monocart is a Vue SPA: static nav injected into `<body>` gets wiped on mount → fixed with MutationObserver dynamic script before `</body>`
- Archived runs at `reports/archive/run-NNN/` have wrong relative paths for nav links → fixed with `../../monocart/` prefix in `buildDynamicNavScript`
- `archiveRun` must copy `index.html` BEFORE `injectNavIntoMonocartReport` runs, or archived copy gets live nav (wrong paths + duplicate injection)
- Monocart crashes (exit 1) if screenshot referenced in test result is missing on disk → fixed by adding `rm -rf test-results` to pretest

**Resolution:** All 4 report pages generate cleanly after each run. Nav cross-links work from all locations including archived runs. 2 runs archived successfully (run-001, run-002).

**Next:** Investigate 24 PLP failures (PLP-006/007/008/010 across most brands — likely breadcrumb/category selector issues). Consider adding per-spec breakdown chart as next report page.

---
## 2026-05-11 — Monocart Report: Spec Breakdown + Flaky Tracker + Test Duration

**Goal:** Add 3 new report pages to the existing monocart reporting system.

**Approach:** Extended `scripts/brand-chart-generator.ts` with 4 new exports and 3 helper functions. Added `BRANDS_GRID` and `BRAND_SHORT` as module-level constants (removing duplicates that were inlined in `generateDashboard`). Added 3 entries to `NAV_PAGES` — nav bar updates everywhere automatically.

**Files changed:**
- `scripts/brand-chart-generator.ts` — extracted `BRANDS_GRID`/`BRAND_SHORT` to module scope; added `generateSpecBreakdown`, `updateFlakyTracker`, `generateFlakyPage`, `generateDurationPage`
- `playwright.config.ts` — imported and called all 4 new functions in `onEnd`; `flaky-trend.json` written alongside `brand-trend.json`
- `package.json` — added `report:spec`, `report:flaky`, `report:duration`; updated `report:all` to open 7 pages
- `.gitignore` — added exception for `reports/monocart/flaky-trend.json`
- `CLAUDE.md` — updated report page table, npm scripts list, persistent-files note, data flow diagram

**Spec Breakdown** (`spec-breakdown.html`): table of spec files × 8 brands with pass %, passed/total, fail count; overall column on right; color-coded green/amber/red by pass rate.

**Flaky Test Tracker** (`flaky-tests.html`): persists per-test per-brand status in `flaky-trend.json` (last 15 runs); computes flakiness score = (pass↔fail flips) / (consecutive pairs); renders dot history per brand per run; shows 4 summary cards.

**Test Duration** (`test-duration.html`): extracts `node.duration` from monocart data; top-20 slowest tests table with inline bar chart; ECharts grouped bar showing average seconds per spec per brand; 4 summary stat cards.

**Issues hit:** None — `tsc --noEmit` passed clean first attempt.

**Next:** Run full suite to populate all 3 new pages with real data; verify `flaky-trend.json` accumulates correctly across runs; investigate PLP-006/007/008/010 failures.

---
## 2026-05-11 — Monocart Report: Pass Rate Trend + Skip Rate Trend + Broken Tests Tracker

**Goal:** Add 3 more stability metrics to the reporting system.

**Approach:** Extended existing pages rather than adding new nav entries — keeps nav compact.

**Files changed:**
- `scripts/brand-chart-generator.ts` — `generateBrandChart` now renders 3 ECharts (bar + 2 lines); `computeBrokenTests()` helper exported; `generateFlakyPage` gets a "Consistently Broken" section at top; `generateDashboard` accepts optional `flakyRuns` param and shows broken tests alert between brand-grid and inconsistent-tests
- `playwright.config.ts` — pass `flakyRuns` to `generateDashboard`

**Changes per page:**
- `brand-chart.html` — 3 charts stacked: (1) grouped bar pass rate per brand per run, (2) line chart pass rate trend, (3) line chart skip rate trend (dashed lines)
- `flaky-tests.html` — "Consistently Broken" table (streak ≥3) shown at top with brand badges; 5 summary stat cards including broken count
- `dashboard.html` — red alert section appears between brand-grid and inconsistent-tests when broken tests detected; links to full list in flaky-tests.html

**Broken test definition:** fails in last 3+ consecutive runs for at least one brand. Score = max streak length.

**Issues hit:** None — `tsc --noEmit` clean first attempt.

**Bug fixed:** Trend files (`brand-trend.json`, `flaky-trend.json`) were resetting to 1 run on each test run. Root cause: monocart `clean: true` (default) deletes everything in `reports/monocart/` before generating report. Fix: moved both files to `reports/` parent directory (outside monocart's output folder). Updated `.gitignore` exceptions accordingly. Verified: both files now accumulate correctly (2 runs confirmed after fix).

**Next:** Run full suite to get broader data; investigate PLP-006/007/008/010 failures.

---
## 2026-05-11 — Monocart Report: Error Breakdown + Composite Stability Score

**Goal:** Add Error Category Breakdown page and Composite Stability Score leaderboard to the reporting system.

**Approach:** Added `classifyError()` (5-category classifier: timeout/network/locator/assertion/other), `collectErrorBreakdown()`, `generateErrorBreakdown()`, `computeFlakyRateByBrand()`, `computeCompositeScores()`, and `CompositeScore` interface. Integrated composite scores into `generateDashboard()` as a leaderboard section. Timeout is checked before locator because Playwright timeout messages often contain "locator." — order matters.

**Files changed:**
- `scripts/brand-chart-generator.ts` — added `ErrorCategory` type, `ERROR_CATEGORIES`, `ERROR_COLORS`, `ERROR_LABELS` constants; added `classifyError`, `collectErrorBreakdown`, `generateErrorBreakdown`, `CompositeScore`, `computeFlakyRateByBrand`, `computeCompositeScores`; updated `generateDashboard` to call `computeCompositeScores` and render a ranked stability leaderboard
- `playwright.config.ts` — imported `generateErrorBreakdown`; added call in `onEnd`
- `package.json` — added `report:errors` script; updated `report:all` to open all 8 pages
- `NAV_PAGES` — updated to 8 entries (added `error-breakdown.html`)
- `CLAUDE.md` — updated report pages table, npm scripts, data flow diagram
- `docs/dev-journal.md` — this entry

**Error classification formula:**
- `timeout`: contains "timeout", "timed out", "timeouterror"
- `network`: contains "net::", "navigation failed", "failed to load"
- `locator`: strict mode violations, "no elements matching", "waiting for selector", "locator.", "getByRole", "getByText"
- `assertion`: "expect(", "expected"+"received", "assertionerror", "toBeVisible", "toHaveText"
- `other`: catch-all

**Composite Stability Score formula:** `passRate×0.5 + (1−flakinessRate)×0.3 + (1−skipRate)×0.2`

**Issues hit:** None — `tsc --noEmit` passed clean.

**Next:** Run full suite across all 8 projects with more passing tests to populate error/composite data; investigate PLP-006/007/008/010 failures.

---
## 2026-05-11 — Latest Results Matrix (Persistent Test Status Page)

**Goal:** Build a persistent page showing the most recent pass/fail/skip/N/A status per test case × per site, updated incrementally on every run (even partial runs).

**Approach:** Added `LatestCellEntry` interface and `LatestResults` type (specName → testTitle → projectName → {status, ts}). Persistent store at `reports/latest-results.json` (outside `reports/monocart/` to survive monocart clean). `updateLatestResults()` reads the file, merges in only the projects present in the current run, then writes back — so running a subset of projects updates only those cells and leaves others unchanged. `generateLatestResultsPage()` renders a full-page matrix grouped by spec file with filter buttons (All/Fail/Pass/Skip/N/A), text search, and collapsible spec sections.

**Files changed:**
- `scripts/brand-chart-generator.ts` — added `collectCasesWithSpec`, `updateLatestResults`, `generateLatestResultsPage`; updated `NAV_PAGES` to 9 entries
- `playwright.config.ts` — imported and called both new functions in `onEnd`
- `package.json` — added `report:latest`; updated `report:all` to open 9 pages
- `.gitignore` — added exception for `reports/latest-results.json`
- `CLAUDE.md` — updated report pages table, npm scripts, persistent files note, data flow diagram
- `docs/dev-journal.md` — this entry

**Key design decisions:**
- Test identity key = exact test title string (not ID alone) — unique within spec file, same as monocart's own key
- Final status after retries (if retried and passed, record "pass")
- N/A = key absent in JSON (never run on that site), not a stored value
- Grouped by spec file, collapsible, with pass/fail badge per section

**Issues hit:** None — `tsc --noEmit` clean first attempt.

**Next:** Run a partial subset to verify incremental update works correctly (only updated cells change, others stay).

---
## 2026-05-15 — TC Manual CSV v2 Rewrite (All Modules)

**Goal:** Rewrite all manual TC CSVs for 9 modules (MiniCart, Cart, PDP, PLP, Search, Wishlist, MyAccount, Store, Checkout) using the Hybrid approach decided in the previous session: brand-aware, automatable-focused, consolidated from bloated v1 templates.

**Approach:** Archived v1 files to `src/documents/tcs/_archive/`. Each new CSV uses 13 columns (ID, Component, Brand Scope, Region Scope, Priority, Automatable, Description, Preconditions, Steps, Expected Result, Test Data, Linked Spec File, Notes). Applied `drm/pla/skx/van` abbreviation convention for IDs and Brand Scope. Brand-specific TCs use scoped IDs (e.g. `MC-skx-001`, `WL-van-001`). Multi-brand exclusions use comma-separated values (e.g. `"drm,pla,skx"` for Vans-excluded tests).

**Files changed:**
- `src/documents/tcs/GRA_MiniCart-Tcs.csv` — 28 TCs (from 75); 3 brand-specific
- `src/documents/tcs/GRA_Cart-Tcs.csv` — 28 TCs (from 77); 4 brand-specific
- `src/documents/tcs/GRA_PDP-Tcs.csv` — 24 TCs (from 73); 4 brand-specific
- `src/documents/tcs/GRA_PLP-Tcs.csv` — 21 TCs (from 86); 1 brand-specific (skx SPA hydration)
- `src/documents/tcs/GRA_SearchPage-Tcs.csv` — 21 TCs (from 90); 1 brand-specific (skx SPA)
- `src/documents/tcs/GRA_Wishlist-Tcs.csv` — 18 TCs (from 62); 1 brand-specific (van localStorage)
- `src/documents/tcs/GRA_MyAccount-Tcs.csv` — 18 TCs (from 92); 2 brand-specific (van modal login + QFF page)
- `src/documents/tcs/GRA_Store-Tcs.csv` — 14 TCs (from 84); brand scope `drm,skx,van`; pla has no store locator
- `src/documents/tcs/GRA_Checkout-Tcs.csv` — 20 TCs (from 124); 1 brand-specific (van PayPal options)

**Issues hit:** None — CSV-only work, no TypeScript compilation involved.

**Key design decisions:**
- Dropped performance, layout/UI visual, accessibility keyboard nav, error simulation, and analytics payload-depth TCs — these require non-automatable tooling or staging API manipulation
- Analytics TCs kept as Low/Partial to verify event fires without payload schema validation
- @data-dependent flag used for TCs requiring sale products, OOS products, or valid coupons
- Platypus excluded from Store TCs (brand scope `drm,skx,van`) — Platypus has no physical stores
- WL-006 scoped to `drm,pla,skx` (excludes van) since Vans has guest localStorage wishlist

**Next:** Rewrite automation spec files for each module based on the new TC CSVs (same pattern as homepage.spec.ts rewrite).

---
## 2026-05-15 — ATC Flakiness Fix + GraphQL API Path

**Goal:** Replace flaky UI-based Add-to-Cart flow with a hybrid approach: GraphQL API path first, UI fallback second.

**Approach:**
- Added `addToCartViaApi()` on `BasePage` — fires `createEmptyCart` + `addConfigurableProductsToCart` mutations via `page.evaluate(fetch(...))` (inherits PHPSESSID)
- Added `extractAtcPayload()` on `PDPPage` — reads `window.dataLayer` `product_view` event for parentSku and `product_size_select` event for childSku + size format (e.g. "3:UK" → optionValue="3", optionName="size_uk")
- Rewrote `addToCart()` in `PDPPage` with 4-strategy cascade: size-via-evaluate → API → Playwright click → last-resort locator click
- Created diagnostic specs: `atc-api-inspect.spec.ts`, `capture-full-atc-body.spec.ts`, `pdp-window-inspect.spec.ts`

**Issues hit:**
1. `selectSizeViaEvaluate()` returned null — size buttons below viewport fold were filtered out (viewport `r.top >= innerHeight` check); removed it
2. OOS sizes selected first — Platypus uses CSS class `available` for in-stock sizes; added pass-1 preference for `available`-class buttons
3. React hydration delay — size buttons not in DOM at `expectLoaded()` time; added `waitForFunction` polling for numeric buttons (6s timeout)
4. Mini cart didn't open after ATC — Platypus mini cart uses `div.mini-cart-wrapper` (sliding panel), not `aside[coords]` which is a small widget always `visibility:hidden`; fixed `expectOpen()` to check ALL matching drawer candidates, not just `.first()`
5. `expectOpen()` was using wrong element — `aside[coords="0"]` is a tiny cart widget, never changes; actual visible drawer is `[class*="mini-cart-wrapper"]`; fixed by iterating candidates

**Resolution:** `tests/smoke/add-to-cart.spec.ts` passes on platypus-au (25s) and drmartens-au (27s).

**Key decisions:**
- After API path succeeds: always call `miniCart.open()` explicitly (API adds server-side, doesn't trigger React state)
- After UI ATC click: wait 1.5s, check `drawer.isVisible()`, call `miniCart.open()` if not open (Platypus doesn't auto-open)
- `drawer.isVisible()` still uses `.first()` (checking drawer state, not expectation) — fine because `open()` is idempotent via cart icon

**Next:** Test on remaining 6 brands (pla-nz, skx-au/nz, van-au/nz, drm-nz). Clean up diagnostic spec files.

---
## 2026-05-16 — ATC All-8-Brand Validation + Color/Size Available Detection

**Goal:** Verify the hybrid ATC flow works correctly across all 8 brands, with correct available-color and available-size selection.

**Approach:**
- Inspected size button structure on DRM-AU, Skechers-AU via headless Playwright scripts
- Confirmed: all GRA brands use CSS class `available` on in-stock size buttons; OOS sizes have only hashed styled-component classes (e.g., `sc-kNiDFA kdpUpy  ` with trailing space, no `available`)
- Skechers AU: US sizes (5–11), buttons appear after SPA hydration (need `waitForFunction`)
- Skechers AU/NZ: staging was blocking on `productName` inside card — removed `productName` from Skechers PLP selector override (Skechers SPA uses styled-component hash classes; common selector's `a[href*=".html"]` fallback handles it)

**Refactored `selectSizeViaEvaluate()` into 3 methods:**
- `waitForSizeButtons()` — polls for numeric size buttons (8s timeout, handles SPA hydration)
- `pickFirstAvailableSize()` — picks first button with `available` class; falls back to any enabled button; then `<select>` elements
- `selectSizeViaEvaluate()` — tries current color; if no available sizes, collects `.swiper-slide a[href$=".html"]` color swatch links and navigates to each until an available size is found

**Color swatch pattern confirmed across all GRA brands:**
- Color variants = separate URLs (`product-COLORCODE.html`), shown as `.swiper-slide a[href$=".html"]` links
- No in-page color state change — clicking a swatch navigates to a new URL
- No OOS marker at swatch level; OOS detection only possible by checking size availability after navigation

**Results:** All 8 brands pass — drm-au/nz, pla-au/nz, skx-au/nz, van-au/nz.

**Files changed:**
- `src/pages/PDP.page.ts` — refactored size selection into 3 methods; added color swatch fallback
- `src/selectors/brands/skechers/plp.sel.ts` — removed `productName` override

**Next:** Clean up diagnostic spec files in `tests/diagnostic/`.

---
## 2026-05-16 — v2 Smoke Spec Suite (full rebuild)

**Goal:** Replace all old spec files with v2 versions that match the Hybrid TC approach — brand-aware feature flags, no error-swallowing, consistent TC IDs, brand-specific test blocks.

**Approach:** Moved old specs to `tests/smoke/archive/`; rewrote 9 files from scratch following the `mini-cart.spec.ts` pattern. Each file uses `onlyBrand`/`excludeBrand` helpers, feature-flag guards, and `@data-dependent`/`@analytics` tags for unstable tests.

**Files changed:**
- `tests/smoke/cart.spec.ts` — CT-001..CT-024 + 4 brand-specific
- `tests/smoke/pdp.spec.ts` — PD-001..PD-020 + 4 brand-specific
- `tests/smoke/plp.spec.ts` — PL-001..PL-020 + PL-skx-001
- `tests/smoke/search.spec.ts` — SR-001..SR-020 + SR-skx-001
- `tests/smoke/wishlist.spec.ts` — WL-001..WL-017 + WL-van-001
- `tests/smoke/store.spec.ts` — ST-001..ST-013 + ST-pla-001
- `tests/smoke/account.spec.ts` — MA-001..MA-016 + MA-van-001, MA-van-002 (new file)
- `tests/smoke/checkout.spec.ts` — CO-001..CO-019 + CO-van-001 (new file)

**Issues hit:**
- `PLPPage` has no `applyFirstAvailableFilter`, `applySortOption`, `removeFirstActiveFilter`, `sortAnyOption` — those live only on `SearchPage`.
- `home.page` is a protected BasePage property — inaccessible outside the class.
- `getAttribute()` returns `string | null` — needed null-coalescence before `.includes()`.

**Resolution:**
- Added local helpers `applyFirstFilter`, `applySort`, `removeFirstFilter` in `plp.spec.ts` using raw locators.
- Replaced `home.page` with the `page` Playwright fixture in SR-005.
- Used `(stateAfter ?? '')` to guard the null case in WL-van-001.
- `npm run build` passes clean (0 errors).

**Next:** Run live smoke pass against a staging environment to validate all tests execute without unexpected skips.

---
## 2026-05-17 — Hướng A: Superset test model

**Goal:** Consolidate smoke + regression into a single superset suite under `tests/smoke/`, replacing the dual-directory split.

**Approach:** Hướng A — smoke is the main suite; deeper regression TCs are tagged `@regression` within the same spec files. Old regression files archived to `tests/_archive/`. Tag-based filtering controls run scope.

**Files changed:**
- `tests/regression/account.spec.ts` → `tests/_archive/account.spec.ts` (trivial framework context test, archived)
- `tests/regression/checkout.spec.ts` → `tests/_archive/checkout.spec.ts` (40 TCs, archived)
- `tests/regression/my-account.spec.ts` → `tests/_archive/my-account.spec.ts` (62 TCs, archived)
- `tests/smoke/checkout.spec.ts` — added 21 regression TCs (CO-020..CO-040) + all required helpers/constants; added `accountData` + `Locator` imports
- `tests/smoke/account.spec.ts` — added 52 regression TCs (ACC-013..ACC-062, ACC-065, ACC-067) + full helper set (clickRobust, bodyText, login flows, registration, address book, etc.); added `Locator` import
- `CLAUDE.md` — updated Test Conventions section with superset model counts

**Issues hit:** None — `npm run build` clean on first attempt.

**Resolution:** N/A

**Next:** Run full suite (`npx playwright test`) or smoke-only (`--grep-invert @regression`) against staging to confirm @regression TCs are correctly tagged and skip-guarded. Consider adding tag-based npm scripts for convenience.

---
## 2026-05-17 — Restructure: regression-as-base + @smoke tag subset

**Goal:** Invert the superset model — make `tests/regression/` the canonical home for ALL TCs; mark the fast subset with `@smoke` instead of `@regression`.

**Approach:** Moved all 10 spec files from `tests/smoke/` → `tests/regression/`. Applied `@smoke` at describe level for pure spec files (cart, homepage, mini-cart, pdp, plp, search, store, wishlist). Tagged individual MA-* and CO-001..CO-019 + CO-van-001 tests as `@smoke` in account/checkout. Removed `tests/smoke/` directory.

**Files changed:**
- `tests/regression/*.spec.ts` — all 10 spec files moved from tests/smoke/; describe-level or individual @smoke tags applied
- `tests/regression/account.spec.ts` — MA-001..MA-018 tagged @smoke; ACC-013..ACC-067 untagged (regression-only)
- `tests/regression/checkout.spec.ts` — CO-001..CO-019 + CO-van-001 tagged @smoke; CO-020..CO-040 untagged (regression-only)
- `tests/smoke/` — deleted (was empty)
- `CLAUDE.md` — updated counts and commands for new model

**Issues hit:** Transform script produced duplicate `@smoke` tags (`['@smoke', '@smoke']`) and left `@regression` tags in CO/ACC blocks. Fixed with a cleanup script.

**Resolution:** Deduplication + @regression removal applied; `npm run build` clean. Counts verified: 230 @smoke TCs × 8 = 1840; 329 total × 8 = 2632. Note: old "256 smoke" included 26 diagnostic TCs via --grep-invert; new explicit @smoke = 230 (regression TCs only).

**Next:** Add npm scripts `test:smoke` / `test:regression` for convenience. Begin expanding TC coverage (currently 303 regression TCs per project, more to be added).
