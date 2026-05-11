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

## Test Execution Rules

**CRITICAL — machine is a MacBook M1 Air (passive cooling, no fan). Overheating causes CPU throttling.**

- NEVER run multiple `playwright test` commands in parallel
- Always run one test command at a time; wait for it to finish before starting the next
- Do NOT override `--workers` flag — max workers is already set to 2 in config
- Prefer `npm run test:safe` over `npx playwright test` directly — it uses `flock` to enforce a system-level lock preventing concurrent runs
- If you need to run tests for multiple projects/files, chain them sequentially with `&&`, never with `&` or in separate parallel tool calls

## Reporting System

All reporting logic lives in `scripts/brand-chart-generator.ts`. Reports are generated automatically via the monocart `onEnd` hook in `playwright.config.ts` after every test run.

### Report pages

| File | Location | Description |
|---|---|---|
| `dashboard.html` | `reports/monocart/` | Hub — overall stats + per-brand cards + links |
| `archive.html` | `reports/monocart/` | Run History — table of all archived runs |
| `index.html` | `reports/monocart/` | Latest Monocart report (Vue SPA) |
| `brand-chart.html` | `reports/monocart/` | Bar chart — pass rate per brand across runs |
| `spec-breakdown.html` | `reports/monocart/` | Pass rate per spec file × brand (table) |
| `flaky-tests.html` | `reports/monocart/` | Flaky test tracker — pass↔fail flips + broken tests (≥3 consecutive fails) |
| `test-duration.html` | `reports/monocart/` | Slowest tests + avg duration per spec (chart) |
| `error-breakdown.html` | `reports/monocart/` | Failure classification: timeout / locator / assertion / network / other |
| `run-NNN-*/index.html` | `reports/archive/` | Archived copy of each run's Monocart report |

### npm scripts

```bash
npm run report:dashboard   # open hub dashboard
npm run report:archive     # open Run History
npm run report:monocart    # open latest Monocart report
npm run report:chart       # open brand chart
npm run report:spec        # open spec breakdown
npm run report:flaky       # open flaky test tracker
npm run report:duration    # open test duration page
npm run report:errors      # open error breakdown
npm run report:all         # open all 8 at once
```

### Adding a new report page

1. Add entry to `NAV_PAGES` array in `scripts/brand-chart-generator.ts` — nav updates everywhere automatically
2. Use `buildStaticNavHtml(currentHref)` for regular HTML pages
3. Call `generateYourPage(...)` inside `onEnd` in `playwright.config.ts`
4. Add `open reports/monocart/your-page.html` to `package.json` scripts

### Non-obvious design decisions

**Monocart `index.html` requires dynamic nav injection (not static).**
Monocart is a Vue SPA that fetches its app JS and mounts onto `document.body` after page load, wiping static HTML. Nav must be injected via a `<script>` block using `MutationObserver` placed just before `</body>`. Use `buildDynamicNavScript()` for this — never `buildStaticNavHtml()`.

**Archived runs need a path prefix `../../monocart/`.**
Archived reports live at `reports/archive/run-NNN/index.html`, two levels below the other pages in `reports/monocart/`. Nav links must use `buildDynamicNavScript('', '../../monocart/')` or they 404.

**`archiveRun` must be called BEFORE `injectNavIntoMonocartReport`.**
`archiveRun` copies `index.html` before our nav is injected. If order is reversed, the archived copy inherits the live nav (with wrong relative paths) plus gets double-injected.

**Persistent files — gitignore exceptions required.**
`/reports` is gitignored. These files must be committed to preserve history:
- `reports/monocart/index.json` — monocart's own trend data (managed by monocart)
- `reports/brand-trend.json` — per-brand run history (in `reports/` root, NOT `reports/monocart/`)
- `reports/flaky-trend.json` — per-test flaky history, last 15 runs

**Why `reports/` root, not `reports/monocart/`?** Monocart has `clean: true` by default — it deletes everything in its output directory (`reports/monocart/`) at the start of each run. Trend files must live in the parent directory to survive across runs. Monocart reads its own `index.json` into memory before cleaning, which is why that file persists despite being in `reports/monocart/`.

`reports/archive/` is local-only (not committed).

### Data flow per run

```
playwright test
  └── monocart onEnd
        ├── updateBrandTrend()              → reports/brand-trend.json  (NOT monocart/)
        ├── updateFlakyTracker()            → reports/flaky-trend.json (NOT monocart/)
        ├── archiveRun()                    → reports/archive/run-NNN/ + archive.html
        ├── generateDashboard()             → dashboard.html
        ├── generateBrandChart()            → brand-chart.html
        ├── generateSpecBreakdown()         → spec-breakdown.html
        ├── generateFlakyPage()             → flaky-tests.html
        ├── generateDurationPage()          → test-duration.html
        ├── generateErrorBreakdown()        → error-breakdown.html
        └── injectNavIntoMonocartReport()   → patches index.html

Dashboard also renders:
  ├── Stability Scores leaderboard (computeCompositeScores from runs + flakyRuns)
  └── Broken Tests alert (computeBrokenTests from flakyRuns)
```

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
