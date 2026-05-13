# Baseline Analysis — 2026-05-13

Full test run across all 11 specs × 8 projects (4 brands × 2 regions).
Run in 3 sessions over ~14 hours total.

---

## Overall Summary

| Metric | Value |
|---|---|
| Total test instances | 4,832 |
| Passed | 2,157 (45%) |
| Failed | 1,265 (26%) |
| Skipped | 1,410 (29%) |
| **Pass rate (of tests that ran)** | **63%** |

---

## Per-Spec Results

| Spec | Total | Passed | Failed | Skipped | Pass/Ran | Health | Duration |
|---|---|---|---|---|---|---|---|
| `add-to-cart` | 8 | 0 | 8 | 0 | **0%** | 🔴 CRITICAL | 5m |
| `mini-cart` | 600 | 45 | 395 | 160 | **10%** | 🔴 CRITICAL | 8h48m |
| `cart` | 160 | 24 | 136 | 0 | **15%** | 🔴 CRITICAL | 52m |
| `my-account` | 512 | 74 | 139 | 299 | **35%** | 🟠 POOR | 1h1m |
| `wishlist` | 160 | 22 | 36 | 102 | **38%** | 🟠 POOR | 16m |
| `homepage` | 416 | 200 | 173 | 43 | **54%** | 🟡 MODERATE | 29m |
| `plp` | 688 | 298 | 207 | 183 | **59%** | 🟡 MODERATE | 1h44m |
| `checkout` | 320 | 8 | 3 | 309 | **73%** ⚠️ | 🔵 LOW_COVERAGE | 9m |
| `store` | 672 | 488 | 152 | 32 | **76%** | 🟢 GOOD | 33m |
| `pdp` | 576 | 327 | 1 | 248 | **100%** | 🟢 EXCELLENT | 34m |
| `search` | 720 | 671 | 15 | 34 | **98%** | 🟢 EXCELLENT | 51m |

> ⚠️ checkout: 73% pass rate but 97% of tests were skipped — low coverage, not true health indicator.

---

## Key Findings

### 1. Root cause: add-to-cart is completely broken
- `add-to-cart` spec: **0% across all 8 sites**
- Direct cascade: `cart` (15%) and `mini-cart` (10%) fail because they can't put items in cart first
- **Fix priority #1** — resolving add-to-cart will dramatically improve cart + mini-cart scores

### 2. Search and PDP are the healthy anchors
- `search`: 98% pass rate — most consistent feature across all brands
- `pdp`: 100% pass rate (of tests that ran) — product pages display correctly everywhere
- These two features are production-stable on all staging environments

### 3. Store has a systematic 19-test failure (same on all 8 sites)
- Exactly 61 pass / 19 fail / 4 skip on **every single site** — no variation
- Same 19 tests fail everywhere → systematic issue, not site-specific
- Either: (a) tests use a feature not available on staging, or (b) test implementation bug
- Investigate these 19 test IDs to decide: fix test or mark @data-dependent

### 4. NZ sites underperform AU counterparts
- Visible in `homepage`: platypus-nz 42% vs platypus-au 52%; skechers-nz 40% vs skechers-au 62%
- Consistent ~5-10% gap across brands
- Possible causes: different staging data, region-specific content mismatches, or NZ CDN latency

### 5. skechers-au outlier in wishlist
- skechers-au: 5% (1/20 passed) vs other sites: 50-60%
- skechers-au has 0 tests skipped vs 14-15 for others — different test path
- Root cause: skechers is a SPA with hash CSS classes (styled-components); wishlist selectors not adapted for this

### 6. vans-nz anomaly in mini-cart
- vans-nz: 40% while all other 7 sites are at 5%
- Unexplained — possibly different product/stock availability on vans-nz staging
- Worth investigating: if vans-nz staging has more in-stock products, add-to-cart may succeed more often

### 7. checkout spec is under-tested
- 309/320 tests (97%) skipped — most require full auth + cart state
- Only useful data point: drmartens-au has 3 unique failures not seen elsewhere
- Need test account setup to make this spec meaningful

---

## Per-Brand Summary (across all specs)

| Brand | Notes |
|---|---|
| **drmartens** | Generally strong (search 100%, pdp 100%). Checkout anomaly (3 failures). |
| **platypus** | Slightly below average on homepage and plp. platypus-au pdp has 1 failure. |
| **skechers** | SPA architecture causes specific issues in wishlist. search still solid (95%+). |
| **vans** | Strong overall. Best in plp (65-67%). vans-nz mini-cart anomaly (40%). |

---

## Priority Actions

| Priority | Action | Expected Impact |
|---|---|---|
| 🔴 1 | Fix add-to-cart flow or selector | Unblocks cart + mini-cart (currently 0-15%) |
| 🔴 2 | Investigate skechers wishlist selector | Fix 5% → 50%+ for skechers-au wishlist |
| 🟠 3 | Identify the 19 systematically failing store tests | Either fix or skip cleanly |
| 🟠 4 | Investigate drmartens-au 3 checkout failures | Isolated regression |
| 🟡 5 | Diagnose NZ homepage gap (-10% vs AU) | Improve NZ baseline |
| 🟡 6 | Investigate vans-nz mini-cart anomaly (40% vs 5%) | Understand for replication |

---

## Comparison Guide for Future Runs

When comparing a future run against this baseline:

- **Green signal**: spec pass rate within ±5% of baseline
- **Yellow warning**: pass rate drops 5-15% from baseline
- **Red regression**: pass rate drops >15% from baseline, OR a previously 🟢 spec drops to 🟡

Specs to watch most carefully (highest value):
1. `search` — should stay ≥93% total / ≥97% of ran
2. `pdp` — should stay ≥99% of ran
3. `store` — should stay at exactly 76% until systematic failures are fixed
4. `homepage` — watch for NZ degradation

Individual JSON baselines are in `docs/baselines/2026-05-13/specs/`.
