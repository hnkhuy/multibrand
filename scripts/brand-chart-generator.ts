import * as fs from 'fs';
import * as path from 'path';

const BRANDS = [
  'drmartens-au', 'drmartens-nz',
  'platypus-au',  'platypus-nz',
  'skechers-au',  'skechers-nz',
  'vans-au',      'vans-nz',
];

const BRAND_COLORS: Record<string, string> = {
  'drmartens-au': '#C49A00',  // DRM gold AU (dark)
  'drmartens-nz': '#DDB83A',  // DRM gold NZ (light)
  'platypus-au':  '#3AAFA9',  // PLT teal AU (dark)
  'platypus-nz':  '#6FCFCA',  // PLT teal NZ (light)
  'skechers-au':  '#003087',  // SKX navy AU (dark)
  'skechers-nz':  '#4A7CC0',  // SKX blue NZ (light)
  'vans-au':      '#CC0000',  // VAN red AU (dark)
  'vans-nz':      '#E06060',  // VAN red NZ (light)
};

const BRANDS_GRID = [
  'drmartens-au', 'platypus-au', 'skechers-au', 'vans-au',
  'drmartens-nz', 'platypus-nz', 'skechers-nz', 'vans-nz',
];

type ErrorCategory = 'timeout' | 'locator' | 'assertion' | 'network' | 'other';
const ERROR_CATEGORIES: ErrorCategory[] = ['timeout', 'locator', 'assertion', 'network', 'other'];
const ERROR_COLORS: Record<ErrorCategory, string> = {
  timeout:   '#ef6c00',
  locator:   '#6a1b9a',
  assertion: '#1565c0',
  network:   '#b71c1c',
  other:     '#546e7a',
};
const ERROR_LABELS: Record<ErrorCategory, string> = {
  timeout:   'Timeout',
  locator:   'Locator / Element',
  assertion: 'Assertion',
  network:   'Network',
  other:     'Other',
};

const BRAND_SHORT: Record<string, string> = {
  'drmartens-au': 'DRM<br>AU', 'platypus-au': 'PLT<br>AU',
  'skechers-au':  'SKX<br>AU', 'vans-au':     'VAN<br>AU',
  'drmartens-nz': 'DRM<br>NZ', 'platypus-nz': 'PLT<br>NZ',
  'skechers-nz':  'SKX<br>NZ', 'vans-nz':     'VAN<br>NZ',
};

// Source of truth for all report pages.
// Add new pages here — nav updates everywhere automatically.
export const NAV_PAGES = [
  { label: 'Dashboard',       href: 'dashboard.html' },
  { label: 'Run History',     href: 'archive.html' },
  { label: 'Monocart Report', href: 'index.html' },
  { label: 'Brand Chart',     href: 'brand-chart.html' },
  { label: 'Spec Breakdown',  href: 'spec-breakdown.html' },
  { label: 'Flaky Tests',     href: 'flaky-tests.html' },
  { label: 'Test Duration',   href: 'test-duration.html' },
  { label: 'Error Breakdown', href: 'error-breakdown.html' },
];

// ─── Nav bar ─────────────────────────────────────────────────────────────────

const NAV_CSS = `
  #mcr-nav{position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;align-items:center;gap:4px;padding:7px 16px;background:#1a1a2e;font-family:Arial,sans-serif;font-size:13px;flex-wrap:wrap;box-shadow:0 2px 6px rgba(0,0,0,.4);}
  .mcr-nav-link{color:#90caf9;text-decoration:none;padding:4px 10px;border-radius:4px;transition:background .15s;}
  .mcr-nav-link:hover{background:rgba(144,202,249,.15);}
  .mcr-nav-active{color:#fff;font-weight:bold;padding:4px 10px;background:rgba(255,255,255,.1);border-radius:4px;}
  .mcr-nav-sep{color:#444;margin:0 2px;}
  .mcr-nav-title{color:#666;font-size:11px;margin-left:auto;}
`;

function buildNavInnerHtml(currentHref: string, hrefPrefix = ''): string {
  const links = NAV_PAGES.map(({ label, href }) => {
    const isActive = href === currentHref;
    return isActive
      ? `<span class="mcr-nav-active">${label}</span>`
      : `<a class="mcr-nav-link" href="${hrefPrefix}${href}">${label}</a>`;
  }).join('<span class="mcr-nav-sep">|</span>');
  return `${links}<span class="mcr-nav-title">Multi-Brand Automation Reports</span>`;
}

// For standalone pages — static nav rendered directly in HTML.
function buildStaticNavHtml(currentHref: string, hrefPrefix = ''): string {
  return `<div id="mcr-nav"><style>${NAV_CSS}</style>${buildNavInnerHtml(currentHref, hrefPrefix)}</div>`;
}

// For monocart index.html — Vue replaces body content after load,
// so we inject via JS that re-appends the nav after Vue mounts.
export function buildDynamicNavScript(currentHref: string, hrefPrefix = ''): string {
  const inner = buildNavInnerHtml(currentHref, hrefPrefix).replace(/`/g, '\\`').replace(/\\/g, '\\\\');
  const css = NAV_CSS.replace(/`/g, '\\`').replace(/\\/g, '\\\\');
  return `<script>
(function(){
  var NAV_ID='mcr-nav';
  function inject(){
    if(document.getElementById(NAV_ID))return;
    var s=document.createElement('style');s.textContent=\`${css}\`;document.head.appendChild(s);
    var nav=document.createElement('div');nav.id=NAV_ID;
    nav.innerHTML=\`${inner}\`;
    document.body.appendChild(nav);
    var app=document.getElementById('app')||document.querySelector('.mcr-root');
    if(app)app.style.paddingTop='38px';
    else document.body.style.paddingTop='38px';
  }
  var obs=new MutationObserver(function(){inject();});
  obs.observe(document.body,{childList:true,subtree:true});
  inject();
  window.addEventListener('load',function(){inject();setTimeout(inject,500);});
  setTimeout(function(){obs.disconnect();},15000);
})();
</script>`;
}

// ─── Data types ───────────────────────────────────────────────────────────────

interface BrandStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

interface RunEntry {
  date: number;
  brands: Record<string, BrandStats>;
}

interface RunMeta {
  runId: number;
  folder: string;
  date: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  brands: Record<string, BrandStats>;
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function walkSubs(subs: any[], stats = { total: 0, passed: 0, failed: 0, skipped: 0 }): BrandStats {
  for (const sub of subs || []) {
    if (sub.caseType) {
      stats.total++;
      if (sub.caseType === 'passed') stats.passed++;
      else if (sub.caseType === 'failed') stats.failed++;
      else if (sub.caseType === 'skipped') stats.skipped++;
    }
    walkSubs(sub.subs, stats);
  }
  return stats;
}

type CaseStatus = 'pass' | 'fail' | 'skip';

function collectCases(subs: any[]): Array<{ name: string; status: CaseStatus }> {
  const cases: Array<{ name: string; status: CaseStatus }> = [];
  for (const sub of subs || []) {
    if (sub.caseType) {
      const status: CaseStatus = sub.caseType === 'passed' ? 'pass'
        : sub.caseType === 'failed' ? 'fail' : 'skip';
      cases.push({ name: sub.title, status });
    }
    if (sub.subs) cases.push(...collectCases(sub.subs));
  }
  return cases;
}

function passRate(s: BrandStats): number {
  return s.total === 0 ? 0 : +((s.passed / s.total) * 100).toFixed(1);
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function updateBrandTrend(reportData: any, trendPath: string): RunEntry[] {
  const brandStats: Record<string, BrandStats> = {};
  for (const row of reportData.rows || []) {
    if (row.suiteType === 'project') {
      brandStats[row.title] = walkSubs(row.subs);
    }
  }

  let runs: RunEntry[] = [];
  try { runs = JSON.parse(fs.readFileSync(trendPath, 'utf-8')); } catch {}

  runs.push({ date: reportData.date, brands: brandStats });
  if (runs.length > 30) runs = runs.slice(-30);

  fs.mkdirSync(path.dirname(trendPath), { recursive: true });
  fs.writeFileSync(trendPath, JSON.stringify(runs, null, 2));
  return runs;
}

export function generateDashboard(reportData: any, runs: RunEntry[], dashboardPath: string, hrefPrefix = '', flakyRuns: FlakyRunEntry[] = []): void {
  const s = reportData.summary ?? {};
  const total   = s.tests?.value  ?? 0;
  const passed  = s.passed?.value ?? 0;
  const failed  = s.failed?.value ?? 0;
  const skipped = s.skipped?.value ?? 0;
  const overall = total > 0 ? +((passed / total) * 100).toFixed(1) : 0;

  const latest  = runs[runs.length - 1];
  const prev    = runs.length >= 2 ? runs[runs.length - 2] : null;
  const runDate = fmtDate(reportData.date);

  // Overall stat cards
  const statCards = [
    { label: 'Total',    value: total,   color: '#37474f' },
    { label: 'Passed',   value: passed,  color: '#2e7d32' },
    { label: 'Failed',   value: failed,  color: failed > 0 ? '#c62828' : '#bdbdbd' },
    { label: 'Skipped',  value: skipped, color: '#757575' },
    { label: 'Pass Rate', value: `${overall}%`, color: overall >= 80 ? '#2e7d32' : overall >= 60 ? '#e65100' : '#c62828' },
  ].map(({ label, value, color }) => `
    <div class="stat-card">
      <div class="stat-value" style="color:${color}">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`).join('');

  // Per-brand cards — 4×2: row1=AU, row2=NZ
  const brandCards = BRANDS_GRID.map((brand) => {
    const cur  = latest?.brands[brand];
    const prv  = prev?.brands[brand];
    if (!cur) return '';

    const rate    = passRate(cur);
    const prvRate = prv ? passRate(prv) : null;
    const delta   = prvRate !== null ? +(rate - prvRate).toFixed(1) : null;
    const color   = BRAND_COLORS[brand] ?? '#888';
    const rateColor = rate >= 80 ? '#2e7d32' : rate >= 60 ? '#e65100' : '#c62828';

    let trendHtml = '';
    if (delta !== null) {
      if (delta > 0)      trendHtml = `<span class="trend up">&#9650; +${delta}%</span>`;
      else if (delta < 0) trendHtml = `<span class="trend down">&#9660; ${delta}%</span>`;
      else                trendHtml = `<span class="trend flat">&#9644; 0%</span>`;
    }

    return `
    <div class="brand-card">
      <div class="brand-header" style="background:${color}">${brand}</div>
      <div class="brand-body">
        <div class="brand-rate" style="color:${rateColor}">${rate}%</div>
        <div class="brand-detail">${cur.passed} / ${cur.total} passed</div>
        <div class="brand-skip">${cur.skipped} skipped</div>
        ${trendHtml}
      </div>
    </div>`;
  }).join('');

  // Inconsistent tests — different status across sites
  const caseMatrix: Record<string, Record<string, CaseStatus>> = {};
  for (const row of reportData.rows || []) {
    if (row.suiteType !== 'project') continue;
    const project = row.title as string;
    for (const { name, status } of collectCases(row.subs || [])) {
      if (!caseMatrix[name]) caseMatrix[name] = {};
      caseMatrix[name][project] = status;
    }
  }
  const inconsistentTests = Object.entries(caseMatrix)
    .filter(([, map]) => { const ss = Object.values(map); return ss.length > 0 && !ss.every(s => s === ss[0]); })
    .sort(([a], [b]) => a.localeCompare(b));

  const INCON_BRANDS = BRANDS_GRID;

  const incon_esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const incon_cell = (status: CaseStatus | undefined) => {
    if (!status) return '<td class="s-na">·</td>';
    if (status === 'pass') return '<td class="s-pass">✓</td>';
    if (status === 'fail') return '<td class="s-fail">✗</td>';
    return '<td class="s-skip">—</td>';
  };

  const incon_headers = INCON_BRANDS.map(b => `<th>${BRAND_SHORT[b]}</th>`).join('');
  const incon_rows = inconsistentTests.map(([name, map]) =>
    `<tr><td class="tc-name">${incon_esc(name)}</td>${INCON_BRANDS.map(b => incon_cell(map[b])).join('')}</tr>`
  ).join('');

  const inconsistentHtml = `
    <div class="section-title">Inconsistent Tests (${inconsistentTests.length})</div>
    <div class="card incon-card">
      ${inconsistentTests.length === 0
        ? '<p style="padding:16px;color:#2e7d32;font-size:13px;">&#10003; All tests are consistent across sites.</p>'
        : `<table class="incon-table">
            <thead><tr><th class="tc-name-h">Test Case</th>${incon_headers}</tr></thead>
            <tbody>${incon_rows}</tbody>
          </table>`
      }
    </div>`;

  // Stability scores leaderboard
  const scores = computeCompositeScores(runs, flakyRuns);
  const sortedBrands = BRANDS_GRID.filter(b => scores[b]).sort((a, b) => scores[b].score - scores[a].score);
  const stabilityHtml = sortedBrands.length === 0 ? '' : (() => {
    const rows = sortedBrands.map((brand, idx) => {
      const sc = scores[brand];
      const scoreColor = sc.score >= 80 ? '#2e7d32' : sc.score >= 60 ? '#e65100' : '#c62828';
      const barBg      = sc.score >= 80 ? '#e8f5e9' : sc.score >= 60 ? '#fff8e1' : '#ffebee';
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      const flakCell = sc.hasFlakData
        ? `<span style="color:${sc.flakinessRate > 10 ? '#c62828' : sc.flakinessRate > 0 ? '#e65100' : '#2e7d32'}">${sc.flakinessRate}%</span>`
        : '<span style="color:#bbb" title="Need ≥2 runs">—</span>';
      return `<tr>
        <td style="padding:7px 8px 7px 12px;font-size:12px">${medal}</td>
        <td style="padding:7px 4px">
          <span style="background:${BRAND_COLORS[brand]??'#888'};color:#fff;padding:2px 8px;border-radius:3px;font-size:11px">${BRAND_SHORT[brand]?.replace('<br>',' ')??brand}</span>
        </td>
        <td style="padding:7px 8px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:10px;background:#f0f0f0;border-radius:5px;min-width:80px">
              <div style="width:${sc.score}%;height:100%;background:${scoreColor};border-radius:5px;opacity:.7"></div>
            </div>
            <span style="font-weight:bold;font-size:14px;color:${scoreColor};min-width:42px">${sc.score}%</span>
          </div>
        </td>
        <td style="text-align:center;font-size:12px;color:${sc.passRate >= 80 ? '#2e7d32' : sc.passRate >= 60 ? '#e65100' : '#c62828'}">${sc.passRate}%</td>
        <td style="text-align:center;font-size:12px">${flakCell}</td>
        <td style="text-align:center;font-size:12px;color:${sc.skipRate > 20 ? '#e65100' : '#555'}">${sc.skipRate}%</td>
      </tr>`;
    }).join('');
    return `<div class="section-title">Stability Scores &nbsp;<span style="font-size:11px;font-weight:normal;color:#aaa">(pass×50% + stability×30% + execution×20%)</span></div>
    <div class="card incon-card" style="margin-bottom:20px">
      <table style="font-size:13px">
        <thead><tr style="background:#1a1a2e">
          <th style="width:36px;padding:8px 8px 8px 12px;color:#fff">#</th>
          <th style="text-align:left;padding:8px 4px;color:#fff">Brand</th>
          <th style="text-align:left;padding:8px;color:#fff;min-width:200px">Score</th>
          <th style="text-align:center;color:#2e7d32;padding:8px">Pass Rate</th>
          <th style="text-align:center;color:#ef6c00;padding:8px">Flakiness</th>
          <th style="text-align:center;color:#757575;padding:8px">Skip Rate</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  })();

  // Broken tests alert
  const brokenTests = computeBrokenTests(flakyRuns);
  const brokenHtml = brokenTests.length === 0 ? '' : `
    <div class="section-title" style="color:#c62828">&#9888; Broken Tests — Failed 3+ Consecutive Runs (${brokenTests.length})</div>
    <div class="card incon-card" style="border-left:4px solid #c62828;margin-bottom:20px">
      <table class="incon-table">
        <thead><tr>
          <th class="tc-name-h">Test Case</th>
          <th style="min-width:65px;text-align:center">Streak</th>
          <th style="text-align:left;padding-left:10px">Failing Brands</th>
        </tr></thead>
        <tbody>${brokenTests.slice(0, 20).map(({ name, brands, streakLength }) => {
          const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
          const badges = brands.map(b =>
            `<span style="display:inline-block;background:${BRAND_COLORS[b]??'#888'};color:#fff;padding:1px 6px;border-radius:3px;font-size:10px;margin:1px">${BRAND_SHORT[b]?.replace('<br>',' ')??b}</span>`
          ).join(' ');
          return `<tr style="background:#fff8f8">
            <td class="tc-name" title="${esc(name)}">${esc(name)}</td>
            <td style="text-align:center;font-weight:bold;color:#c62828">${streakLength}×</td>
            <td style="padding:4px 8px">${badges}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      ${brokenTests.length > 20 ? `<p style="padding:8px 12px;font-size:11px;color:#888">…and ${brokenTests.length - 20} more — <a href="${hrefPrefix}flaky-tests.html" style="color:#1565c0">View all in Flaky Tests</a></p>` : ''}
    </div>`;

  // Report link cards
  const reportLinks = NAV_PAGES.filter(p => p.href !== 'dashboard.html').map(({ label, href }) => `
    <a class="report-link" href="${hrefPrefix}${href}">
      <div class="report-link-label">${label}</div>
      <div class="report-link-arrow">&#8594;</div>
    </a>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard — Multi-Brand Automation</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,sans-serif;background:#f0f2f5;padding-top:52px;}
    .page{max-width:1100px;margin:0 auto;padding:20px 16px;}

    /* Header */
    .page-header{margin-bottom:20px;}
    .page-title{font-size:22px;font-weight:bold;color:#1a1a2e;}
    .page-sub{font-size:12px;color:#888;margin-top:4px;}

    /* Overall stat cards */
    .stat-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;}
    .stat-card{flex:1;min-width:120px;background:#fff;border-radius:8px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.1);text-align:center;}
    .stat-value{font-size:28px;font-weight:bold;}
    .stat-label{font-size:11px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;}

    /* Brand cards */
    .section-title{font-size:14px;font-weight:bold;color:#444;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px;}
    .brand-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
    .brand-card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.1);overflow:hidden;}
    .brand-header{padding:8px 12px;font-size:12px;font-weight:bold;color:#fff;}
    .brand-body{padding:12px;}
    .brand-rate{font-size:28px;font-weight:bold;}
    .brand-detail{font-size:11px;color:#555;margin-top:2px;}
    .brand-skip{font-size:11px;color:#999;}
    .trend{display:inline-block;margin-top:6px;font-size:12px;font-weight:bold;padding:2px 6px;border-radius:4px;}
    .trend.up{color:#2e7d32;background:#e8f5e9;}
    .trend.down{color:#c62828;background:#ffebee;}
    .trend.flat{color:#757575;background:#f5f5f5;}

    /* Inconsistent tests table */
    .incon-card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.1);overflow:hidden;margin-bottom:20px;}
    .incon-table{width:100%;border-collapse:collapse;font-size:12px;}
    .incon-table thead th{background:#1a1a2e;color:#fff;padding:7px 6px;text-align:center;font-weight:600;line-height:1.3;}
    .tc-name-h{text-align:left!important;padding-left:12px!important;min-width:200px;}
    .incon-table tbody tr:hover{background:#f5f9ff;}
    .incon-table td{padding:6px 4px;text-align:center;border-bottom:1px solid #f0f0f0;vertical-align:middle;}
    .tc-name{text-align:left!important;padding-left:12px!important;font-size:12px;white-space:nowrap;max-width:360px;overflow:hidden;text-overflow:ellipsis;}
    .s-pass{background:#e8f5e9;color:#2e7d32;font-weight:bold;}
    .s-fail{background:#ffebee;color:#c62828;font-weight:bold;}
    .s-skip{background:#fafafa;color:#9e9e9e;}
    .s-na{color:#e0e0e0;}

    /* Report links */
    .report-links{display:flex;gap:12px;flex-wrap:wrap;}
    .report-link{display:flex;justify-content:space-between;align-items:center;flex:1;min-width:200px;background:#fff;border-radius:8px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,.1);text-decoration:none;color:#1a1a2e;transition:box-shadow .15s;}
    .report-link:hover{box-shadow:0 3px 10px rgba(0,0,0,.15);}
    .report-link-label{font-size:14px;font-weight:bold;}
    .report-link-arrow{font-size:20px;color:#90caf9;}
  </style>
</head>
<body>
  ${buildStaticNavHtml('dashboard.html', hrefPrefix)}
  <div class="page">

    <div class="page-header">
      <div class="page-title">Multi-Brand Automation Dashboard</div>
      <div class="page-sub">Last run: ${runDate} &nbsp;|&nbsp; ${runs.length} run(s) tracked</div>
    </div>

    <div class="section-title">Overall — Latest Run</div>
    <div class="stat-row">${statCards}</div>

    <div class="section-title">Per Brand — Latest Run ${prev ? '(trend vs previous)' : ''}</div>
    <div class="brand-grid">${brandCards}</div>

    ${stabilityHtml}

    ${brokenHtml}

    ${inconsistentHtml}

    <div class="section-title">Reports</div>
    <div class="report-links">${reportLinks}</div>

  </div>
</body>
</html>`;

  fs.mkdirSync(path.dirname(dashboardPath), { recursive: true });
  fs.writeFileSync(dashboardPath, html);
}

export function generateBrandChart(runs: RunEntry[], chartPath: string): void {
  const activeBrands = BRANDS.filter((b) => runs.some((r) => r.brands[b]));

  const xLabels = runs.map((r) => {
    const d = new Date(r.date);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  // ── Chart 1: grouped bar — pass rate per brand per run ──────────────────────
  const barOption = {
    title: { text: 'Pass Rate per Brand — per Run (bar)', left: 'center', top: 12, textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 8, type: 'scroll' },
    grid: { top: 52, bottom: 80, left: 56, right: 16 },
    xAxis: { type: 'category', data: xLabels, axisLabel: { rotate: 30, fontSize: 11 } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { lineStyle: { type: 'dashed' } } },
    series: activeBrands.map((brand) => ({
      name: brand, type: 'bar', barMaxWidth: 24,
      itemStyle: { color: BRAND_COLORS[brand] || '#888' },
      data: runs.map((r) => { const s = r.brands[brand]; return (!s || s.total === 0) ? null : passRate(s); }),
    })),
  };

  // ── Chart 2: line — pass rate trend per brand over time ─────────────────────
  const lineOption = {
    title: { text: 'Pass Rate Trend — over Time (line)', left: 'center', top: 12, textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 8, type: 'scroll' },
    grid: { top: 52, bottom: 80, left: 56, right: 16 },
    xAxis: { type: 'category', data: xLabels, axisLabel: { rotate: 30, fontSize: 11 } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { lineStyle: { type: 'dashed' } } },
    series: activeBrands.map((brand) => ({
      name: brand, type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
      lineStyle: { color: BRAND_COLORS[brand] || '#888', width: 2 },
      itemStyle: { color: BRAND_COLORS[brand] || '#888' },
      data: runs.map((r) => { const s = r.brands[brand]; return (!s || s.total === 0) ? null : passRate(s); }),
    })),
  };

  // ── Chart 3: line — skip rate trend per brand over time ─────────────────────
  const skipRate = (s: BrandStats) => s.total === 0 ? 0 : +((s.skipped / s.total) * 100).toFixed(1);
  const skipOption = {
    title: { text: 'Skip Rate Trend — over Time (line)', left: 'center', top: 12, textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 8, type: 'scroll' },
    grid: { top: 52, bottom: 80, left: 56, right: 16 },
    xAxis: { type: 'category', data: xLabels, axisLabel: { rotate: 30, fontSize: 11 } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { lineStyle: { type: 'dashed' } }, name: 'skip %', nameTextStyle: { fontSize: 11 } },
    series: activeBrands.map((brand) => ({
      name: brand, type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
      lineStyle: { color: BRAND_COLORS[brand] || '#888', width: 2, type: 'dashed' },
      itemStyle: { color: BRAND_COLORS[brand] || '#888' },
      data: runs.map((r) => { const s = r.brands[brand]; return (!s || s.total === 0) ? null : skipRate(s); }),
    })),
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Brand Chart — Multi-Brand Automation</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,sans-serif;background:#f0f2f5;padding-top:52px;}
    .page{max-width:1100px;margin:0 auto;padding:20px 16px;}
    .page-header{margin-bottom:20px;}
    .page-title{font-size:22px;font-weight:bold;color:#1a1a2e;}
    .page-sub{font-size:12px;color:#888;margin-top:4px;}
    .section-title{font-size:13px;font-weight:bold;color:#444;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}
    .card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.12);padding:16px;margin-bottom:20px;}
    .chart{width:100%;height:420px;}
    .meta{text-align:right;color:#999;font-size:11px;margin-top:16px;}
  </style>
</head>
<body>
  ${buildStaticNavHtml('brand-chart.html')}
  <div class="page">
    <div class="page-header">
      <div class="page-title">Brand Charts</div>
      <div class="page-sub">${runs.length} run(s) tracked</div>
    </div>

    <div class="section-title">Pass Rate per Brand per Run</div>
    <div class="card"><div id="bar-chart" class="chart"></div></div>

    <div class="section-title">Pass Rate Trend over Time</div>
    <div class="card"><div id="line-chart" class="chart"></div></div>

    <div class="section-title">Skip Rate Trend over Time</div>
    <div class="card"><div id="skip-chart" class="chart"></div></div>

    <p class="meta">Generated: ${fmtDate(Date.now())}</p>
  </div>
  <script>
    const bar  = echarts.init(document.getElementById('bar-chart'));
    const line = echarts.init(document.getElementById('line-chart'));
    const skip = echarts.init(document.getElementById('skip-chart'));
    bar.setOption(${JSON.stringify(barOption)});
    line.setOption(${JSON.stringify(lineOption)});
    skip.setOption(${JSON.stringify(skipOption)});
    window.addEventListener('resize', () => { bar.resize(); line.resize(); skip.resize(); });
  </script>
</body>
</html>`;

  fs.mkdirSync(path.dirname(chartPath), { recursive: true });
  fs.writeFileSync(chartPath, html);
}

export function injectNavIntoMonocartReport(reportPath: string): void {
  if (!fs.existsSync(reportPath)) return;
  let html = fs.readFileSync(reportPath, 'utf-8');
  html = html.replace(/<script>\s*\(function\(\)\{[\s\S]*?mcr-nav[\s\S]*?}\)\(\);\s*<\/script>\s*/m, '');
  html = html.replace('</body>', `${buildDynamicNavScript('index.html')}\n</body>`);
  fs.writeFileSync(reportPath, html);
}

// ─── Run archive ──────────────────────────────────────────────────────────────

export function generateArchiveBrowser(runsIndex: RunMeta[], browserPath: string): void {
  const sorted = [...runsIndex].reverse();

  const rows = sorted.map((r) => {
    const statusBadge = r.failed > 0
      ? `<span class="badge fail">FAIL</span>`
      : `<span class="badge pass">PASS</span>`;

    const rateColor = r.passRate >= 80 ? '#2e7d32' : r.passRate >= 60 ? '#e65100' : '#c62828';
    const rowClass  = r.failed > 0 ? 'row-fail' : 'row-pass';

    // Mini brand dots: colored circle, opacity reflects pass rate
    const dots = BRANDS.map((b) => {
      const s = r.brands[b];
      if (!s) return '';
      const rate = s.total > 0 ? s.passed / s.total : 0;
      const opacity = (0.25 + rate * 0.75).toFixed(2);
      return `<span title="${b}: ${(rate*100).toFixed(0)}%" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${BRAND_COLORS[b] ?? '#888'};opacity:${opacity};margin:1px;"></span>`;
    }).join('');

    // Paths from reports/monocart/archive.html → reports/archive/run-NNN/
    const reportLink    = `../archive/${r.folder}/index.html`;
    const dashboardLink = `../archive/${r.folder}/dashboard.html`;

    return `<tr class="${rowClass}">
      <td class="run-id"><a href="${reportLink}" target="_blank">#${r.runId}</a></td>
      <td>${fmtDate(r.date)}</td>
      <td>${statusBadge}</td>
      <td>${r.total}</td>
      <td class="num-pass">${r.passed}</td>
      <td class="num-fail">${r.failed > 0 ? r.failed : '—'}</td>
      <td class="num-skip">${r.skipped}</td>
      <td style="font-weight:bold;color:${rateColor}">${r.passRate}%</td>
      <td>${dots}</td>
      <td><a class="btn-view" href="${dashboardLink}" target="_blank">Dashboard</a></td>
      <td><a class="btn-view btn-report" href="${reportLink}" target="_blank">Report</a></td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Run Archive — Multi-Brand Automation</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,sans-serif;background:#f0f2f5;padding-top:52px;}
    .page{max-width:1200px;margin:0 auto;padding:20px 16px;}
    .page-header{margin-bottom:20px;}
    .page-title{font-size:22px;font-weight:bold;color:#1a1a2e;}
    .page-sub{font-size:12px;color:#888;margin-top:4px;}
    .card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.1);overflow:hidden;}
    table{width:100%;border-collapse:collapse;font-size:13px;}
    thead th{background:#1a1a2e;color:#fff;padding:10px 12px;text-align:left;font-weight:600;white-space:nowrap;}
    tbody tr{border-bottom:1px solid #f0f0f0;transition:background .1s;}
    tbody tr:hover{background:#f5f9ff;}
    td{padding:9px 12px;vertical-align:middle;}
    .row-fail{background:#fff8f8;}
    .row-pass{background:#fff;}
    .run-id a{font-weight:bold;color:#1565c0;text-decoration:none;}
    .run-id a:hover{text-decoration:underline;}
    .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;}
    .badge.pass{background:#e8f5e9;color:#2e7d32;}
    .badge.fail{background:#ffebee;color:#c62828;}
    .num-pass{color:#2e7d32;font-weight:bold;}
    .num-fail{color:#c62828;font-weight:bold;}
    .num-skip{color:#757575;}
    .btn-view{display:inline-block;padding:3px 10px;background:#1565c0;color:#fff;border-radius:4px;text-decoration:none;font-size:12px;}
    .btn-view:hover{background:#0d47a1;}
    .btn-report{background:#37474f;}
    .btn-report:hover{background:#263238;}
    .footer{margin-top:12px;font-size:11px;color:#999;text-align:right;}
    thead th:nth-child(2){min-width:160px;}
  </style>
</head>
<body>
  ${buildStaticNavHtml('archive.html')}
  <div class="page">
    <div class="page-header">
      <div class="page-title">Run Archive</div>
      <div class="page-sub">${runsIndex.length} run(s) stored &nbsp;|&nbsp; newest first &nbsp;|&nbsp; keeping last 30</div>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Status</th>
            <th>Total</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
            <th>Pass Rate</th>
            <th>Brands</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="11" style="text-align:center;color:#999;padding:24px">No runs archived yet</td></tr>'}</tbody>
      </table>
    </div>
    <p class="footer">Generated: ${fmtDate(Date.now())}</p>
  </div>
</body>
</html>`;

  fs.mkdirSync(path.dirname(browserPath), { recursive: true });
  fs.writeFileSync(browserPath, html);
}

export function archiveRun(
  reportData: any,
  runs: RunEntry[],
  archiveDir: string,
  monocartDir: string,
  maxRuns = 30,
): void {
  const monocartHtml = path.join(monocartDir, 'index.html');
  const monocartJson = path.join(monocartDir, 'index.json');
  if (!fs.existsSync(monocartHtml) || !fs.existsSync(monocartJson)) return;

  // Load or init runs index
  const indexPath = path.join(archiveDir, 'runs-index.json');
  let runsIndex: RunMeta[] = [];
  try { runsIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8')); } catch {}

  // Build folder name
  const runId = (runsIndex[runsIndex.length - 1]?.runId ?? 0) + 1;
  const d     = new Date(reportData.date);
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
  const folder = `run-${String(runId).padStart(3,'0')}-${stamp}`;
  const runDir  = path.join(archiveDir, folder);
  fs.mkdirSync(runDir, { recursive: true });

  // Copy monocart files (before nav injection — clean copy)
  fs.copyFileSync(monocartHtml, path.join(runDir, 'index.html'));
  fs.copyFileSync(monocartJson, path.join(runDir, 'index.json'));

  // Inject nav with corrected paths (archived report is 2 levels deeper than monocart/)
  const ARCHIVE_PREFIX = '../../monocart/';

  // Generate dashboard snapshot for this run
  generateDashboard(reportData, runs, path.join(runDir, 'dashboard.html'), ARCHIVE_PREFIX);
  let archivedHtml = fs.readFileSync(path.join(runDir, 'index.html'), 'utf-8');
  // Strip any previously injected nav to avoid duplicates
  archivedHtml = archivedHtml.replace(/<script>\s*\(function\(\)\{[\s\S]*?mcr-nav[\s\S]*?}\)\(\);\s*<\/script>\s*/m, '');
  archivedHtml = archivedHtml.replace('</body>', `${buildDynamicNavScript('', ARCHIVE_PREFIX)}\n</body>`);
  fs.writeFileSync(path.join(runDir, 'index.html'), archivedHtml);

  // Build meta for this run
  const s      = reportData.summary ?? {};
  const total  = s.tests?.value  ?? 0;
  const passed = s.passed?.value ?? 0;
  const failed = s.failed?.value ?? 0;
  const skipped = s.skipped?.value ?? 0;
  const meta: RunMeta = {
    runId,
    folder,
    date: reportData.date,
    total,
    passed,
    failed,
    skipped,
    passRate: total > 0 ? +((passed / total) * 100).toFixed(1) : 0,
    brands: runs[runs.length - 1]?.brands ?? {},
  };

  runsIndex.push(meta);

  // Prune old runs beyond maxRuns
  if (runsIndex.length > maxRuns) {
    const toDelete = runsIndex.splice(0, runsIndex.length - maxRuns);
    for (const old of toDelete) {
      fs.rmSync(path.join(archiveDir, old.folder), { recursive: true, force: true });
    }
  }

  fs.writeFileSync(indexPath, JSON.stringify(runsIndex, null, 2));

  // Regenerate archive browser in monocart dir
  generateArchiveBrowser(runsIndex, path.join(monocartDir, 'archive.html'));
}

// ─── Broken Tests helper ─────────────────────────────────────────────────────

export function computeBrokenTests(
  flakyRuns: FlakyRunEntry[],
  streak = 3,
): Array<{ name: string; brands: string[]; streakLength: number }> {
  if (flakyRuns.length < streak) return [];

  const allTests = new Set<string>();
  for (const run of flakyRuns) {
    for (const name of Object.keys(run.tests)) allTests.add(name);
  }

  const broken: Array<{ name: string; brands: string[]; streakLength: number }> = [];

  for (const testName of allTests) {
    const brokenBrands: string[] = [];
    for (const brand of BRANDS_GRID) {
      let s = 0;
      for (let i = flakyRuns.length - 1; i >= 0; i--) {
        if (flakyRuns[i].tests[testName]?.[brand] === 'fail') s++;
        else break;
      }
      if (s >= streak) brokenBrands.push(brand);
    }
    if (brokenBrands.length > 0) {
      let maxStreak = 0;
      for (const brand of brokenBrands) {
        let s = 0;
        for (let i = flakyRuns.length - 1; i >= 0; i--) {
          if (flakyRuns[i].tests[testName]?.[brand] === 'fail') s++;
          else break;
        }
        if (s > maxStreak) maxStreak = s;
      }
      broken.push({ name: testName, brands: brokenBrands, streakLength: maxStreak });
    }
  }

  return broken.sort((a, b) => b.brands.length - a.brands.length || b.streakLength - a.streakLength);
}

// ─── Spec Breakdown ───────────────────────────────────────────────────────────

function collectSpecStatsPerProject(projectSubs: any[]): Record<string, BrandStats> {
  const specMap: Record<string, BrandStats> = {};

  function walk(nodes: any[], specName: string | null): void {
    for (const node of nodes ?? []) {
      let name = specName;
      if (name === null && node.suiteType === 'file') {
        const t: string = node.title ?? '';
        name = (t.split('/').pop() ?? t).replace(/\.spec\.[jt]sx?$/, '');
      }
      if (node.caseType) {
        const key = name ?? 'unknown';
        if (!specMap[key]) specMap[key] = { total: 0, passed: 0, failed: 0, skipped: 0 };
        specMap[key].total++;
        if      (node.caseType === 'passed') specMap[key].passed++;
        else if (node.caseType === 'failed') specMap[key].failed++;
        else                                  specMap[key].skipped++;
      }
      walk(node.subs, name);
    }
  }

  walk(projectSubs, null);
  return specMap;
}

export function generateSpecBreakdown(reportData: any, outputPath: string): void {
  const matrix: Record<string, Record<string, BrandStats>> = {};
  const allSpecs = new Set<string>();

  for (const row of reportData.rows ?? []) {
    if (row.suiteType !== 'project') continue;
    const brand = row.title as string;
    const specStats = collectSpecStatsPerProject(row.subs ?? []);
    for (const [spec, stats] of Object.entries(specStats)) {
      allSpecs.add(spec);
      if (!matrix[spec]) matrix[spec] = {};
      matrix[spec][brand] = stats;
    }
  }

  const specs = [...allSpecs].sort();

  const headerCells = BRANDS_GRID.map(b =>
    `<th style="background:${BRAND_COLORS[b] ?? '#888'};color:#fff;text-align:center">${BRAND_SHORT[b]}</th>`
  ).join('');

  const specRows = specs.map(spec => {
    const cells = BRANDS_GRID.map(brand => {
      const s = matrix[spec]?.[brand];
      if (!s || s.total === 0) return `<td class="cell-na">·</td>`;
      const rate = passRate(s);
      const rateColor = rate >= 80 ? '#2e7d32' : rate >= 60 ? '#e65100' : '#c62828';
      const bg       = rate >= 80 ? '#e8f5e9' : rate >= 60 ? '#fff8e1' : '#ffebee';
      return `<td class="cell-data" style="background:${bg}">
        <div style="font-weight:bold;font-size:13px;color:${rateColor}">${rate}%</div>
        <div style="font-size:10px;color:#666">${s.passed}/${s.total}</div>
        ${s.failed > 0 ? `<div style="font-size:10px;color:#c62828">✗ ${s.failed}</div>` : ''}
      </td>`;
    }).join('');

    const all = BRANDS_GRID.map(b => matrix[spec]?.[b]).filter((s): s is BrandStats => !!s);
    const tot = all.reduce(
      (a, s) => ({ total: a.total+s.total, passed: a.passed+s.passed, failed: a.failed+s.failed, skipped: a.skipped+s.skipped }),
      { total: 0, passed: 0, failed: 0, skipped: 0 }
    );
    const overallRate  = passRate(tot);
    const overallColor = overallRate >= 80 ? '#2e7d32' : overallRate >= 60 ? '#e65100' : '#c62828';

    return `<tr>
      <td class="spec-cell">${spec}</td>
      ${cells}
      <td class="overall-cell" style="color:${overallColor}">${overallRate}%<br><span style="font-size:10px;color:#888;font-weight:normal">${tot.passed}/${tot.total}</span></td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Spec Breakdown — Multi-Brand Automation</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,sans-serif;background:#f0f2f5;padding-top:52px;}
    .page{max-width:1300px;margin:0 auto;padding:20px 16px;}
    .page-header{margin-bottom:20px;}
    .page-title{font-size:22px;font-weight:bold;color:#1a1a2e;}
    .page-sub{font-size:12px;color:#888;margin-top:4px;}
    .card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.1);overflow:auto;margin-bottom:16px;}
    table{width:100%;border-collapse:collapse;font-size:13px;}
    thead th{padding:9px 6px;font-weight:600;white-space:nowrap;}
    .spec-h{background:#1a1a2e;color:#fff;text-align:left;padding-left:12px;min-width:160px;}
    .overall-h{background:#37474f;color:#fff;text-align:center;}
    tbody tr:hover{background:rgba(0,0,0,.02);}
    td{padding:5px 4px;border-bottom:1px solid #f5f5f5;vertical-align:middle;}
    .spec-cell{padding-left:12px;font-size:13px;font-weight:500;color:#1a1a2e;white-space:nowrap;}
    .cell-data{text-align:center;}
    .cell-na{text-align:center;color:#d0d0d0;font-size:16px;}
    .overall-cell{text-align:center;font-weight:bold;font-size:14px;}
    .footer{margin-top:12px;font-size:11px;color:#999;text-align:right;}
  </style>
</head>
<body>
  ${buildStaticNavHtml('spec-breakdown.html')}
  <div class="page">
    <div class="page-header">
      <div class="page-title">Spec Breakdown</div>
      <div class="page-sub">Pass rate per spec file × brand &nbsp;|&nbsp; Last run: ${fmtDate(reportData.date)} &nbsp;|&nbsp; ${specs.length} spec(s)</div>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th class="spec-h">Spec File</th>
            ${headerCells}
            <th class="overall-h">Overall</th>
          </tr>
        </thead>
        <tbody>
          ${specRows || '<tr><td colspan="10" style="text-align:center;padding:24px;color:#999">No data available</td></tr>'}
        </tbody>
      </table>
    </div>
    <p class="footer">Generated: ${fmtDate(Date.now())}</p>
  </div>
</body>
</html>`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
}

// ─── Flaky Test Tracker ───────────────────────────────────────────────────────

interface FlakyRunEntry {
  date: number;
  tests: Record<string, Record<string, CaseStatus>>;
}

export function updateFlakyTracker(reportData: any, flakyPath: string, maxRuns = 15): FlakyRunEntry[] {
  const tests: Record<string, Record<string, CaseStatus>> = {};

  for (const row of reportData.rows ?? []) {
    if (row.suiteType !== 'project') continue;
    const brand = row.title as string;
    for (const { name, status } of collectCases(row.subs ?? [])) {
      if (!tests[name]) tests[name] = {};
      tests[name][brand] = status;
    }
  }

  let runs: FlakyRunEntry[] = [];
  try { runs = JSON.parse(fs.readFileSync(flakyPath, 'utf-8')); } catch {}

  runs.push({ date: reportData.date, tests });
  if (runs.length > maxRuns) runs = runs.slice(-maxRuns);

  fs.mkdirSync(path.dirname(flakyPath), { recursive: true });
  fs.writeFileSync(flakyPath, JSON.stringify(runs));
  return runs;
}

export function generateFlakyPage(runs: FlakyRunEntry[], outputPath: string): void {
  const navHtml  = buildStaticNavHtml('flaky-tests.html');
  const broken   = computeBrokenTests(runs);
  const STREAK   = 3;

  if (runs.length < 2) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Flaky Tests — Multi-Brand Automation</title>
  <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;background:#f0f2f5;padding-top:52px;}</style>
</head>
<body>
  ${navHtml}
  <div style="max-width:800px;margin:40px auto;padding:0 16px">
    <h2 style="color:#1a1a2e;margin-bottom:12px">Flaky Tests</h2>
    <p style="color:#888;font-size:14px">Need at least 2 completed runs to detect flaky tests. Run the test suite again to start tracking.</p>
  </div>
</body>
</html>`;
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html);
    return;
  }

  const allTests = new Set<string>();
  for (const run of runs) {
    for (const name of Object.keys(run.tests)) allTests.add(name);
  }

  interface FlakyResult { name: string; score: number; history: Array<Record<string, CaseStatus>>; }
  const results: FlakyResult[] = [];

  for (const testName of allTests) {
    let changes = 0, possible = 0;
    for (const brand of BRANDS_GRID) {
      const history = runs.map(r => r.tests[testName]?.[brand]).filter((s): s is CaseStatus => !!s);
      if (history.length < 2) continue;
      possible += history.length - 1;
      for (let i = 1; i < history.length; i++) {
        if ((history[i-1] === 'pass' && history[i] === 'fail') ||
            (history[i-1] === 'fail' && history[i] === 'pass')) {
          changes++;
        }
      }
    }
    if (possible > 0 && changes > 0) {
      results.push({ name: testName, score: changes / possible, history: runs.map(r => r.tests[testName] ?? {}) });
    }
  }

  results.sort((a, b) => b.score - a.score);
  const topN = results.slice(0, 100);

  const runLabels = runs.map(r => {
    const d = new Date(r.date);
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  });

  const dot = (s: CaseStatus | undefined): string => {
    if (!s)           return '<span class="dot dot-na" title="N/A">·</span>';
    if (s === 'pass') return '<span class="dot dot-pass" title="pass">●</span>';
    if (s === 'fail') return '<span class="dot dot-fail" title="fail">●</span>';
    return                   '<span class="dot dot-skip" title="skip">–</span>';
  };

  const brandHeaderCells = BRANDS_GRID.map(b =>
    `<th class="brand-h" style="background:${BRAND_COLORS[b] ?? '#888'};color:#fff">${BRAND_SHORT[b]}</th>`
  ).join('');

  const tableRows = topN.map(({ name, score, history }) => {
    const pct        = (score * 100).toFixed(0);
    const scoreColor = score >= 0.5 ? '#c62828' : score >= 0.25 ? '#e65100' : '#f57c00';
    const brandCells = BRANDS_GRID.map(brand => {
      const dots = history.map(h => dot(h[brand])).join('');
      return `<td class="history-cell">${dots}</td>`;
    }).join('');
    const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<tr>
      <td class="test-name-cell" title="${esc(name)}">${esc(name)}</td>
      <td class="score-cell" style="color:${scoreColor}">${pct}%</td>
      ${brandCells}
    </tr>`;
  }).join('');

  // Run date labels shown as a sub-row under the brand headers
  const runLabelSubRows = BRANDS_GRID.map(() =>
    `<td class="run-labels-cell">${runLabels.map(l => `<span>${l}</span>`).join('')}</td>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Flaky Tests — Multi-Brand Automation</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,sans-serif;background:#f0f2f5;padding-top:52px;}
    .page{max-width:1400px;margin:0 auto;padding:20px 16px;}
    .page-header{margin-bottom:16px;}
    .page-title{font-size:22px;font-weight:bold;color:#1a1a2e;}
    .page-sub{font-size:12px;color:#888;margin-top:4px;}
    .summary{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
    .sum-card{background:#fff;border-radius:8px;padding:12px 20px;box-shadow:0 1px 4px rgba(0,0,0,.1);text-align:center;}
    .sum-val{font-size:24px;font-weight:bold;color:#c62828;}
    .sum-val.stable{color:#2e7d32;}
    .sum-lbl{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;}
    .card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.1);overflow:auto;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    thead th{padding:8px 6px;font-weight:600;background:#1a1a2e;color:#fff;white-space:nowrap;text-align:center;}
    .brand-h{font-size:11px;}
    .run-labels-row td{background:#2a2a40;padding:2px 4px;text-align:center;}
    .run-labels-cell{display:flex;gap:2px;justify-content:center;flex-wrap:nowrap;}
    .run-labels-cell span{font-size:9px;color:#aaa;writing-mode:vertical-lr;transform:rotate(180deg);line-height:1;}
    tbody tr:hover{background:#f9f9f9;}
    td{padding:5px 4px;border-bottom:1px solid #f0f0f0;vertical-align:middle;}
    .test-name-cell{padding-left:10px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;}
    .score-cell{text-align:center;font-weight:bold;font-size:13px;}
    .history-cell{text-align:center;white-space:nowrap;}
    .dot{font-size:10px;margin:0 1px;}
    .dot-pass{color:#2e7d32;}
    .dot-fail{color:#c62828;}
    .dot-skip{color:#9e9e9e;}
    .dot-na{color:#e0e0e0;}
    .legend{display:flex;gap:16px;padding:10px 12px;font-size:11px;color:#666;border-top:1px solid #f0f0f0;flex-wrap:wrap;}
    .section-title{font-size:13px;font-weight:bold;color:#444;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}
    .no-flaky{padding:24px;text-align:center;color:#2e7d32;font-size:13px;}
    .footer{margin-top:12px;font-size:11px;color:#999;text-align:right;}
  </style>
</head>
<body>
  ${navHtml}
  <div class="page">
    <div class="page-header">
      <div class="page-title">Flaky Tests</div>
      <div class="page-sub">Pass↔fail flips across last ${runs.length} run(s) &nbsp;|&nbsp; Score = % of consecutive pairs that flipped between pass and fail</div>
    </div>
    <div class="summary">
      <div class="sum-card"><div class="sum-val" style="color:${broken.length > 0 ? '#c62828' : '#bdbdbd'}">${broken.length}</div><div class="sum-lbl">Broken ≥${STREAK} runs</div></div>
      <div class="sum-card"><div class="sum-val">${results.length}</div><div class="sum-lbl">Flaky Tests</div></div>
      <div class="sum-card"><div class="sum-val stable">${allTests.size - results.length}</div><div class="sum-lbl">Stable Tests</div></div>
      <div class="sum-card"><div class="sum-val" style="color:#37474f">${allTests.size}</div><div class="sum-lbl">Total Tracked</div></div>
      <div class="sum-card"><div class="sum-val" style="color:#1565c0">${runs.length}</div><div class="sum-lbl">Runs Analysed</div></div>
    </div>

    <div class="section-title" style="color:${broken.length > 0 ? '#c62828' : '#444'}">
      Consistently Broken — Failed ≥${STREAK} Consecutive Runs (${broken.length})
    </div>
    <div class="card" style="margin-bottom:20px">
      ${broken.length === 0
        ? `<div class="no-flaky">&#10003; No consistently broken tests detected.</div>`
        : `<table>
            <thead><tr>
              <th style="text-align:left;padding-left:10px;min-width:240px">Test Case</th>
              <th style="min-width:80px">Streak</th>
              <th style="text-align:left;padding-left:8px">Failing Brands</th>
            </tr></thead>
            <tbody>${broken.map(({ name, brands, streakLength }) => {
              const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
              const badges = brands.map(b =>
                `<span style="display:inline-block;background:${BRAND_COLORS[b]??'#888'};color:#fff;padding:1px 7px;border-radius:3px;font-size:10px;margin:1px">${BRAND_SHORT[b]?.replace('<br>',' ')??b}</span>`
              ).join(' ');
              return `<tr style="background:#fff8f8">
                <td style="padding:6px 10px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:300px" title="${esc(name)}">${esc(name)}</td>
                <td style="text-align:center;font-weight:bold;color:#c62828">${streakLength}×</td>
                <td style="padding:4px 8px">${badges}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>`
      }
    </div>

    <div class="section-title">Flaky Tests — Pass↔Fail Flips (${results.length})</div>
    <div class="card">
      ${results.length === 0
        ? `<div class="no-flaky">&#10003; No flaky tests detected across the last ${runs.length} run(s). All tests are stable.</div>`
        : `<table>
            <thead>
              <tr>
                <th style="text-align:left;padding-left:10px;min-width:240px">Test Case</th>
                <th style="min-width:60px">Flakiness</th>
                ${brandHeaderCells}
              </tr>
              <tr class="run-labels-row">
                <td colspan="2" style="font-size:9px;color:#aaa;text-align:right;padding-right:6px">runs (oldest→newest) ➜</td>
                ${runLabelSubRows}
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="legend">
            <span><span class="dot dot-pass">●</span> Pass &nbsp;</span>
            <span><span class="dot dot-fail">●</span> Fail &nbsp;</span>
            <span><span class="dot dot-skip">–</span> Skip &nbsp;</span>
            <span><span class="dot dot-na">·</span> Not run</span>
          </div>`
      }
    </div>
    <p class="footer">Generated: ${fmtDate(Date.now())}</p>
  </div>
</body>
</html>`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
}

// ─── Test Duration ────────────────────────────────────────────────────────────

interface TestDurationEntry {
  name: string;
  brand: string;
  spec: string;
  ms: number;
}

function collectTestDurations(reportData: any): TestDurationEntry[] {
  const results: TestDurationEntry[] = [];

  for (const row of reportData.rows ?? []) {
    if (row.suiteType !== 'project') continue;
    const brand = row.title as string;

    function walk(nodes: any[], specName: string | null): void {
      for (const node of nodes ?? []) {
        let name = specName;
        if (name === null && node.suiteType === 'file') {
          const t: string = node.title ?? '';
          name = (t.split('/').pop() ?? t).replace(/\.spec\.[jt]sx?$/, '');
        }
        if (node.caseType && node.duration != null) {
          results.push({ name: node.title ?? '?', brand, spec: name ?? 'unknown', ms: node.duration });
        }
        walk(node.subs, name);
      }
    }
    walk(row.subs, null);
  }

  return results;
}

export function generateDurationPage(reportData: any, outputPath: string): void {
  const durations = collectTestDurations(reportData);
  const navHtml   = buildStaticNavHtml('test-duration.html');

  if (durations.length === 0) {
    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Test Duration — Multi-Brand Automation</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;background:#f0f2f5;padding-top:52px;}</style>
</head><body>
  ${navHtml}
  <div style="max-width:800px;margin:40px auto;padding:0 16px">
    <h2 style="color:#1a1a2e;margin-bottom:12px">Test Duration</h2>
    <p style="color:#888;font-size:14px">No duration data available. Ensure tests have been run recently.</p>
  </div>
</body></html>`;
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html);
    return;
  }

  const top20 = [...durations].sort((a, b) => b.ms - a.ms).slice(0, 20);

  const specBrandTimes: Record<string, Record<string, number[]>> = {};
  for (const { spec, brand, ms } of durations) {
    if (!specBrandTimes[spec]) specBrandTimes[spec] = {};
    if (!specBrandTimes[spec][brand]) specBrandTimes[spec][brand] = [];
    specBrandTimes[spec][brand].push(ms);
  }
  const specs = Object.keys(specBrandTimes).sort();

  const chartSeries = BRANDS_GRID.map(brand => ({
    name: brand,
    type: 'bar',
    barMaxWidth: 16,
    itemStyle: { color: BRAND_COLORS[brand] ?? '#888' },
    data: specs.map(spec => {
      const arr = specBrandTimes[spec]?.[brand];
      if (!arr?.length) return null;
      return +(arr.reduce((a, b) => a + b, 0) / arr.length / 1000).toFixed(2);
    }),
  }));

  const chartOption = {
    title: { text: 'Average Test Duration per Spec (seconds)', left: 'center', top: 12, textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any[]) =>
        (params[0]?.name ?? '') + '<br>' +
        params.filter((p: any) => p.value != null).map((p: any) =>
          `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:4px"></span>${p.seriesName}: ${p.value}s`
        ).join('<br>'),
    },
    legend: { bottom: 8, type: 'scroll' },
    grid: { top: 56, bottom: 100, left: 72, right: 24 },
    xAxis: { type: 'category', data: specs, axisLabel: { rotate: 30, fontSize: 11 } },
    yAxis: { type: 'value', name: 'avg (s)', axisLabel: { formatter: '{value}s' }, splitLine: { lineStyle: { type: 'dashed' } } },
    series: chartSeries,
  };

  const slowRows = top20.map(({ name, brand, spec, ms }) => {
    const secs     = (ms / 1000).toFixed(1);
    const barWidth = Math.min(100, Math.round((ms / top20[0].ms) * 100));
    const color    = BRAND_COLORS[brand] ?? '#888';
    const esc      = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
    const shortBrand = BRAND_SHORT[brand]?.replace('<br>', ' ') ?? brand;
    return `<tr>
      <td class="dur-name" title="${esc(name)}">${esc(name)}</td>
      <td><span class="brand-badge" style="background:${color}">${shortBrand}</span></td>
      <td style="color:#555;font-size:12px">${spec}</td>
      <td class="dur-val">
        <div class="dur-bar-wrap"><div class="dur-bar" style="width:${barWidth}%;background:${color}"></div></div>
        <span>${secs}s</span>
      </td>
    </tr>`;
  }).join('');

  const totalMs  = durations.reduce((a, b) => a + b.ms, 0);
  const avgSecs  = (totalMs / durations.length / 1000).toFixed(1);
  const maxSecs  = (Math.max(...durations.map(d => d.ms)) / 1000).toFixed(1);
  const totalMin = (totalMs / 1000 / 60).toFixed(1);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Test Duration — Multi-Brand Automation</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,sans-serif;background:#f0f2f5;padding-top:52px;}
    .page{max-width:1200px;margin:0 auto;padding:20px 16px;}
    .page-header{margin-bottom:16px;}
    .page-title{font-size:22px;font-weight:bold;color:#1a1a2e;}
    .page-sub{font-size:12px;color:#888;margin-top:4px;}
    .summary{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
    .sum-card{background:#fff;border-radius:8px;padding:12px 20px;box-shadow:0 1px 4px rgba(0,0,0,.1);text-align:center;}
    .sum-val{font-size:22px;font-weight:bold;color:#1565c0;}
    .sum-lbl{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;}
    .section-title{font-size:14px;font-weight:bold;color:#444;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px;}
    .card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.1);padding:16px;margin-bottom:16px;}
    .card-table{padding:0;overflow:hidden;}
    #dur-chart{width:100%;height:400px;}
    table{width:100%;border-collapse:collapse;font-size:13px;}
    thead th{background:#1a1a2e;color:#fff;padding:9px 10px;text-align:left;font-weight:600;}
    tbody tr:hover{background:#f5f9ff;}
    td{padding:8px 10px;border-bottom:1px solid #f0f0f0;vertical-align:middle;}
    .dur-name{max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;}
    .brand-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;color:#fff;}
    .dur-val{display:flex;align-items:center;gap:10px;white-space:nowrap;font-weight:bold;color:#c62828;}
    .dur-bar-wrap{flex:1;height:8px;background:#f0f0f0;border-radius:4px;min-width:60px;max-width:160px;}
    .dur-bar{height:100%;border-radius:4px;opacity:.7;}
    .footer{margin-top:12px;font-size:11px;color:#999;text-align:right;}
  </style>
</head>
<body>
  ${navHtml}
  <div class="page">
    <div class="page-header">
      <div class="page-title">Test Duration</div>
      <div class="page-sub">Slowest tests + average duration per spec &nbsp;|&nbsp; Last run: ${fmtDate(reportData.date)}</div>
    </div>
    <div class="summary">
      <div class="sum-card"><div class="sum-val">${durations.length}</div><div class="sum-lbl">Tests with Duration</div></div>
      <div class="sum-card"><div class="sum-val">${avgSecs}s</div><div class="sum-lbl">Avg Duration</div></div>
      <div class="sum-card"><div class="sum-val" style="color:#c62828">${maxSecs}s</div><div class="sum-lbl">Slowest Test</div></div>
      <div class="sum-card"><div class="sum-val" style="color:#555">${totalMin}m</div><div class="sum-lbl">Total Run Time</div></div>
    </div>

    <div class="section-title">Avg Duration per Spec</div>
    <div class="card"><div id="dur-chart"></div></div>

    <div class="section-title">Top 20 Slowest Tests</div>
    <div class="card card-table">
      <table>
        <thead>
          <tr>
            <th>Test Case</th>
            <th>Brand</th>
            <th>Spec</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>${slowRows}</tbody>
      </table>
    </div>

    <p class="footer">Generated: ${fmtDate(Date.now())}</p>
  </div>
  <script>
    const chart = echarts.init(document.getElementById('dur-chart'));
    chart.setOption(${JSON.stringify(chartOption)});
    window.addEventListener('resize', () => chart.resize());
  </script>
</body>
</html>`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
}

// ─── Error Category Breakdown ─────────────────────────────────────────────────

function classifyError(text: string): ErrorCategory {
  const m = text.toLowerCase();
  if (m.includes('timeout') || m.includes('timed out') || m.includes('timeouterror')) return 'timeout';
  if (m.includes('net::') || m.includes('navigation failed') || m.includes('failed to load')) return 'network';
  if (m.includes('strict mode violation') || m.includes('no elements matching') ||
      m.includes('waiting for selector') || m.includes('resolve to a single element') ||
      m.includes('locator.') || m.includes('getbyrole') || m.includes('getbytext')) return 'locator';
  if (m.includes('expect(') || (m.includes('expected') && m.includes('received')) ||
      m.includes('assertionerror') || m.includes('tobevisible') || m.includes('tohavetext')) return 'assertion';
  return 'other';
}

function collectErrorBreakdown(reportData: any): Record<string, Record<ErrorCategory, number>> {
  const result: Record<string, Record<ErrorCategory, number>> = {};

  for (const row of reportData.rows ?? []) {
    if (row.suiteType !== 'project') continue;
    const brand = row.title as string;
    if (!result[brand]) result[brand] = { timeout: 0, locator: 0, assertion: 0, network: 0, other: 0 };

    function walk(nodes: any[]): void {
      for (const node of nodes ?? []) {
        if (node.caseType === 'failed') {
          const msgs: string[] = (node.errors ?? [])
            .map((e: any) => e?.message ?? (typeof e === 'string' ? e : ''))
            .filter(Boolean);
          if (node.error?.message) msgs.push(node.error.message);
          else if (typeof node.error === 'string') msgs.push(node.error);
          result[brand][classifyError(msgs.join(' ').trim())]++;
        }
        walk(node.subs);
      }
    }
    walk(row.subs);
  }

  return result;
}

export function generateErrorBreakdown(reportData: any, outputPath: string): void {
  const breakdown = collectErrorBreakdown(reportData);
  const brands    = BRANDS_GRID.filter(b => breakdown[b]);

  if (brands.length === 0) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error Breakdown</title>
    <style>body{font-family:Arial,sans-serif;background:#f0f2f5;padding-top:52px;}</style></head>
    <body>${buildStaticNavHtml('error-breakdown.html')}
    <div style="max-width:800px;margin:40px auto;padding:0 16px">
      <h2 style="color:#1a1a2e;margin-bottom:12px">Error Breakdown</h2>
      <p style="color:#888">No failure data available.</p>
    </div></body></html>`;
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html);
    return;
  }

  const totals: Record<ErrorCategory, number> = { timeout: 0, locator: 0, assertion: 0, network: 0, other: 0 };
  let grandTotal = 0;
  for (const b of brands) {
    for (const cat of ERROR_CATEGORIES) { totals[cat] += breakdown[b][cat]; grandTotal += breakdown[b][cat]; }
  }

  const chartSeries = ERROR_CATEGORIES.map(cat => ({
    name: ERROR_LABELS[cat], type: 'bar', stack: 'total',
    itemStyle: { color: ERROR_COLORS[cat] },
    label: { show: true, formatter: (p: any) => p.value > 0 ? String(p.value) : '', fontSize: 11, color: '#fff' },
    data: brands.map(b => breakdown[b][cat] ?? 0),
  }));

  const chartOption = {
    title: { text: 'Failure Categories per Brand', left: 'center', top: 12, textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 8, type: 'scroll', data: ERROR_CATEGORIES.map(c => ERROR_LABELS[c]) },
    grid: { top: 52, bottom: 80, left: 72, right: 24 },
    xAxis: { type: 'category', data: brands.map(b => BRAND_SHORT[b]?.replace('<br>', ' ') ?? b) },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { type: 'dashed' } } },
    series: chartSeries,
  };

  const sumCards = ERROR_CATEGORIES.map(cat => {
    const n = totals[cat];
    const pct = grandTotal > 0 ? ((n / grandTotal) * 100).toFixed(0) : '0';
    return `<div class="sum-card">
      <div class="sum-dot" style="background:${ERROR_COLORS[cat]}"></div>
      <div class="sum-val" style="color:${ERROR_COLORS[cat]}">${n}</div>
      <div class="sum-pct">${pct}%</div>
      <div class="sum-lbl">${ERROR_LABELS[cat]}</div>
    </div>`;
  }).join('');

  const tableRows = brands.map(b => {
    const total = ERROR_CATEGORIES.reduce((s, c) => s + (breakdown[b][c] ?? 0), 0);
    const cells = ERROR_CATEGORIES.map(cat => {
      const n = breakdown[b][cat] ?? 0;
      const pct = total > 0 ? ((n / total) * 100).toFixed(0) : '0';
      return `<td style="text-align:center">${n > 0
        ? `<span style="font-weight:bold;color:${ERROR_COLORS[cat]}">${n}</span><span style="font-size:10px;color:#888"> (${pct}%)</span>`
        : '<span style="color:#ddd">—</span>'}</td>`;
    }).join('');
    return `<tr>
      <td style="padding:8px 12px;font-weight:bold">
        <span style="background:${BRAND_COLORS[b]??'#888'};color:#fff;padding:2px 8px;border-radius:3px;font-size:11px">${BRAND_SHORT[b]?.replace('<br>',' ')??b}</span>
      </td>${cells}
      <td style="text-align:center;font-weight:bold;color:#c62828">${total}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Error Breakdown — Multi-Brand Automation</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,sans-serif;background:#f0f2f5;padding-top:52px;}
    .page{max-width:1100px;margin:0 auto;padding:20px 16px;}
    .page-header{margin-bottom:16px;}
    .page-title{font-size:22px;font-weight:bold;color:#1a1a2e;}
    .page-sub{font-size:12px;color:#888;margin-top:4px;}
    .section-title{font-size:13px;font-weight:bold;color:#444;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}
    .summary{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;}
    .sum-card{background:#fff;border-radius:8px;padding:12px 16px;box-shadow:0 1px 4px rgba(0,0,0,.1);text-align:center;min-width:100px;}
    .sum-dot{width:12px;height:12px;border-radius:50%;margin:0 auto 4px;}
    .sum-val{font-size:26px;font-weight:bold;}
    .sum-pct{font-size:12px;color:#888;}
    .sum-lbl{font-size:10px;color:#aaa;text-transform:uppercase;margin-top:2px;}
    .card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.1);padding:16px;margin-bottom:16px;}
    .card-table{padding:0;overflow:hidden;margin-bottom:16px;}
    #err-chart{width:100%;height:360px;}
    table{width:100%;border-collapse:collapse;font-size:13px;}
    thead th{background:#1a1a2e;color:#fff;padding:9px 12px;text-align:center;font-weight:600;}
    th.left{text-align:left;}
    tbody tr:hover{background:#f5f9ff;}
    td{padding:6px 8px;border-bottom:1px solid #f0f0f0;vertical-align:middle;}
    .footer{margin-top:12px;font-size:11px;color:#999;text-align:right;}
  </style>
</head>
<body>
  ${buildStaticNavHtml('error-breakdown.html')}
  <div class="page">
    <div class="page-header">
      <div class="page-title">Error Breakdown</div>
      <div class="page-sub">Why tests fail — ${grandTotal} failure(s) classified &nbsp;|&nbsp; Last run: ${fmtDate(reportData.date)}</div>
    </div>
    <div class="section-title">Failures by Category (total)</div>
    <div class="summary">${sumCards}</div>
    <div class="section-title">Per Brand — Stacked Chart</div>
    <div class="card"><div id="err-chart"></div></div>
    <div class="section-title">Per Brand — Detail Table</div>
    <div class="card card-table">
      <table>
        <thead><tr>
          <th class="left" style="min-width:120px">Brand</th>
          ${ERROR_CATEGORIES.map(c => `<th style="color:${ERROR_COLORS[c]}">${ERROR_LABELS[c]}</th>`).join('')}
          <th>Total</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    <p class="footer">Generated: ${fmtDate(Date.now())}</p>
  </div>
  <script>
    const chart = echarts.init(document.getElementById('err-chart'));
    chart.setOption(${JSON.stringify(chartOption)});
    window.addEventListener('resize', () => chart.resize());
  </script>
</body>
</html>`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html);
}

// ─── Composite Stability Score ────────────────────────────────────────────────

interface CompositeScore {
  score: number;
  passRate: number;
  flakinessRate: number;
  skipRate: number;
  hasFlakData: boolean;
}

function computeFlakyRateByBrand(flakyRuns: FlakyRunEntry[]): Record<string, number> {
  if (flakyRuns.length < 2) return {};
  const allTests = new Set<string>();
  for (const run of flakyRuns) {
    for (const name of Object.keys(run.tests)) allTests.add(name);
  }
  const flakyCount: Record<string, number> = {};
  const totalCount: Record<string, number> = {};
  for (const testName of allTests) {
    for (const brand of BRANDS_GRID) {
      const hist = flakyRuns.map(r => r.tests[testName]?.[brand]).filter((s): s is CaseStatus => !!s);
      if (hist.length < 2) continue;
      totalCount[brand] = (totalCount[brand] ?? 0) + 1;
      const isFlaky = hist.some((s, i) => i > 0 &&
        ((hist[i-1] === 'pass' && s === 'fail') || (hist[i-1] === 'fail' && s === 'pass')));
      if (isFlaky) flakyCount[brand] = (flakyCount[brand] ?? 0) + 1;
    }
  }
  const result: Record<string, number> = {};
  for (const brand of BRANDS_GRID) {
    result[brand] = totalCount[brand] ? (flakyCount[brand] ?? 0) / totalCount[brand] : 0;
  }
  return result;
}

export function computeCompositeScores(runs: RunEntry[], flakyRuns: FlakyRunEntry[]): Record<string, CompositeScore> {
  if (runs.length === 0) return {};
  const latest     = runs[runs.length - 1];
  const flakyRates = computeFlakyRateByBrand(flakyRuns);
  const hasFlakData = flakyRuns.length >= 2;
  const result: Record<string, CompositeScore> = {};
  for (const brand of BRANDS_GRID) {
    const s = latest.brands[brand];
    if (!s || s.total === 0) continue;
    const passR = s.passed / s.total;
    const skipR = s.skipped / s.total;
    const flakR = flakyRates[brand] ?? 0;
    const score = (passR * 0.5) + ((1 - flakR) * 0.3) + ((1 - skipR) * 0.2);
    result[brand] = {
      score:         +(score * 100).toFixed(1),
      passRate:      +(passR * 100).toFixed(1),
      flakinessRate: +(flakR * 100).toFixed(1),
      skipRate:      +(skipR * 100).toFixed(1),
      hasFlakData,
    };
  }
  return result;
}
