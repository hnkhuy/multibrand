---
name: Report page navigation rule
description: All new report pages must include nav header linking back to reports/monocart/index.html
type: feedback
---

All new report HTML pages generated in `reports/monocart/` must include a nav bar with a link back to `index.html`.

**Why:** User wants consistent cross-navigation between all report pages so they can move between Monocart report and custom charts without using the file system.

**How to apply:** When creating any new report page (e.g. `brand-chart.html`, future spec-chart pages, etc.), always include the shared nav HTML at the top of `<body>`. Also inject the nav into `index.html` via `injectNavIntoMonocartReport()` in `onEnd` so monocart's generated report also links out to custom pages.
