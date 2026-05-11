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

// Source of truth for all report pages.
// Add new pages here — nav updates everywhere automatically.
export const NAV_PAGES = [
  { label: 'Dashboard',       href: 'dashboard.html' },
  { label: 'Run History',     href: 'archive.html' },
  { label: 'Monocart Report', href: 'index.html' },
  { label: 'Brand Chart',     href: 'brand-chart.html' },
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

export function generateDashboard(reportData: any, runs: RunEntry[], dashboardPath: string, hrefPrefix = ''): void {
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
  const BRANDS_GRID = ['drmartens-au', 'platypus-au', 'skechers-au', 'vans-au',
                       'drmartens-nz', 'platypus-nz', 'skechers-nz', 'vans-nz'];
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

  const INCON_BRANDS = ['drmartens-au', 'platypus-au', 'skechers-au', 'vans-au',
                        'drmartens-nz', 'platypus-nz', 'skechers-nz', 'vans-nz'];
  const BRAND_SHORT: Record<string, string> = {
    'drmartens-au': 'DRM<br>AU', 'platypus-au': 'PLT<br>AU',
    'skechers-au':  'SKX<br>AU', 'vans-au':     'VAN<br>AU',
    'drmartens-nz': 'DRM<br>NZ', 'platypus-nz': 'PLT<br>NZ',
    'skechers-nz':  'SKX<br>NZ', 'vans-nz':     'VAN<br>NZ',
  };

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

  const series = activeBrands.map((brand) => ({
    name: brand,
    type: 'bar',
    barMaxWidth: 28,
    itemStyle: { color: BRAND_COLORS[brand] || '#888' },
    label: { show: false },
    data: runs.map((r) => {
      const s = r.brands[brand];
      if (!s || s.total === 0) return null;
      return passRate(s);
    }),
  }));

  const option = {
    title: { text: 'Pass Rate per Brand — Run History', left: 'center', top: 16, textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 8, type: 'scroll' },
    grid: { top: 64, bottom: 80, left: 64, right: 24 },
    xAxis: { type: 'category', data: xLabels, axisLabel: { rotate: 30, fontSize: 11 } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' }, splitLine: { lineStyle: { type: 'dashed' } } },
    series,
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
    body{font-family:Arial,sans-serif;background:#f5f5f5;padding-top:38px;}
    .page-content{padding:16px;}
    .card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.12);padding:16px;}
    #chart{width:100%;height:520px;}
    .meta{text-align:right;color:#999;font-size:11px;margin-top:8px;}
  </style>
</head>
<body>
  ${buildStaticNavHtml('brand-chart.html')}
  <div class="page-content">
    <div class="card">
      <div id="chart"></div>
      <p class="meta">Generated: ${fmtDate(Date.now())} &nbsp;|&nbsp; ${runs.length} run(s) tracked</p>
    </div>
  </div>
  <script>
    const chart = echarts.init(document.getElementById('chart'));
    chart.setOption(${JSON.stringify(option)});
    window.addEventListener('resize', () => chart.resize());
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
