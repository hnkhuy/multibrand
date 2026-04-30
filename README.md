# Multi-Brand Automation Framework

Playwright + TypeScript automation framework for testing 4 e-commerce brands across 2 regions.

## Tech Stack

- [Playwright](https://playwright.dev/) — browser automation & test runner
- TypeScript — strict typing throughout
- [deepmerge](https://github.com/TehShrike/deepmerge) — brand selector layering
- dotenv — environment variable management

## Brands & Regions

| Brand | AU | NZ |
|---|---|---|
| Dr. Martens | `drmartens-au` | `drmartens-nz` |
| Platypus | `platypus-au` | `platypus-nz` |
| Skechers | `skechers-au` | `skechers-nz` |
| Vans | `vans-au` | `vans-nz` |

Default base URLs point to staging (`stag-{brand}-{region}.accentgra.com`). Override per project via env vars (e.g. `DRMARTENS_AU_URL`).

## Setup

```bash
npm install
npx playwright install chromium
```

Copy `.env.example` to `.env` and fill in credentials if needed.

## Running Tests

```bash
npm test                    # all tests, headless
npm run test:headed         # all tests, browser visible
npm run test:ui             # interactive Playwright UI
npm report                  # open last HTML report
npm run build               # TypeScript type-check only

# target a specific brand/region
npx playwright test --project=drmartens-au

# target a specific file + project
npx playwright test tests/smoke/homepage.spec.ts --project=platypus-nz
```

> **Note:** All tests are skipped by default. Set `RUN_LIVE_TESTS=true` to run them.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `RUN_LIVE_TESTS` | `false` | Enable test execution |
| `CI` | unset | Enables retries (2) and 2 workers |
| `TEST_ACCOUNT_EMAIL` | internal default | Login test account |
| `TEST_ACCOUNT_PASSWORD` | internal default | Login test account password |
| `{BRAND}_{REGION}_URL` | staging URL | Override base URL for a project (e.g. `VANS_NZ_URL`) |

## Project Structure

```
config/               # environments, project definitions, test data
src/
  core/               # types, env helpers, logger, wait utilities
  selectors/
    common/           # base selectors (one file per component)
    brands/{brand}/   # brand-specific overrides
  components/         # Header, MiniCart, CookieBanner, Modal, Search
  pages/              # Page Object Models (BasePage + per-page classes)
  factories/          # PageFactory, buildSelectors()
  fixtures/           # Custom Playwright fixtures (test.fixture.ts)
tests/
  smoke/              # fast, high-level tests (homepage, search, plp, pdp, cart, wishlist)
  regression/         # deeper flow tests (checkout, account)
```

## Architecture Overview

Tests consume pre-built page objects through custom Playwright fixtures. The framework resolves the correct brand context (brand, region, baseURL) from `testInfo.project.metadata` at runtime, builds a merged selector set, and injects everything via `PageFactory`. See [CLAUDE.md](CLAUDE.md) for implementation details.
