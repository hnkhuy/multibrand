import * as fs from 'fs';
import * as path from 'path';

const BRANDS = [
  'drmartens-au', 'drmartens-nz',
  'platypus-au',  'platypus-nz',
  'skechers-au',  'skechers-nz',
  'vans-au',      'vans-nz',
];

const BRAND_COLORS: Record<string, string> = {
  'drmartens-au': '#c62828',
  'drmartens-nz': '#ef9a9a',
  'platypus-au':  '#1565c0',
  'platypus-nz':  '#90caf9',
  'skechers-au':  '#2e7d32',
  'skechers-nz':  '#a5d6a7',
  'vans-au':      '#e65100',
  'vans-nz':      '#ffcc80',
};

// NAV_PAGES is the source of truth for all report pages.
// When adding a new report page, add it here — nav is rebuilt everywhere automatically.
export const NAV_PAGES = [
  { label: 'Monocart Report', href: 'index.html' },
  { label: 'Brand Chart', href: 'brand-chart.html' },
];

const NAV_CSS = `
  #mcr-nav{position:fixed;top:0;left:0;right:0;z-index:99999;display:flex;align-items:center;gap:4px;padding:7px 16px;background:#1a1a2e;font-family:Arial,sans-serif;font-size:13px;flex-wrap:wrap;box-shadow:0 2px 6px rgba(0,0,0,.4);}
  .mcr-nav-link{color:#90caf9;text-decoration:none;padding:4px 10px;border-radius:4px;transition:background .15s;}
  .mcr-nav-link:hover{background:rgba(144,202,249,.15);}
  .mcr-nav-active{color:#fff;font-weight:bold;padding:4px 10px;background:rgba(255,255,255,.1);border-radius:4px;}
  .mcr-nav-sep{color:#444;margin:0 2px;}
  .mcr-nav-title{color:#666;font-size:11px;margin-left:auto;}
`;

function buildNavInnerHtml(currentHref: string): string {
  const links = NAV_PAGES.map(({ label, href }) => {
    const isActive = href === currentHref;
    return isActive
      ? `<span class="mcr-nav-active">${label}</span>`
      : `<a class="mcr-nav-link" href="${href}">${label}</a>`;
  }).join('<span class="mcr-nav-sep">|</span>');
  return `${links}<span class="mcr-nav-title">Multi-Brand Automation Reports</span>`;
}

// For standalone pages (brand-chart.html etc.) — static nav rendered directly in HTML.
function buildStaticNavHtml(currentHref: string): string {
  return `<div id="mcr-nav"><style>${NAV_CSS}</style>${buildNavInnerHtml(currentHref)}</div>`;
}

// For monocart index.html — Vue replaces body content after load, so we inject via JS
// that re-appends the nav after the Vue app finishes mounting (detected via MutationObserver).
function buildDynamicNavScript(currentHref: string): string {
  const inner = buildNavInnerHtml(currentHref).replace(/`/g, '\\`').replace(/\\/g, '\\\\');
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
    // push monocart content down so nav doesn't overlap
    var app=document.getElementById('app')||document.querySelector('.mcr-root');
    if(app)app.style.paddingTop='38px';
    else document.body.style.paddingTop='38px';
  }
  // Observe body for monocart Vue app mount (fs-loading disappears when app is ready)
  var obs=new MutationObserver(function(){inject();});
  obs.observe(document.body,{childList:true,subtree:true});
  // Also try immediately and after load
  inject();
  window.addEventListener('load',function(){inject();setTimeout(inject,500);});
  setTimeout(function(){obs.disconnect();},15000);
})();
</script>`;
}

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

export function updateBrandTrend(reportData: any, trendPath: string): RunEntry[] {
  const brandStats: Record<string, BrandStats> = {};
  for (const row of reportData.rows || []) {
    if (row.suiteType === 'project') {
      brandStats[row.title] = walkSubs(row.subs);
    }
  }

  let runs: RunEntry[] = [];
  try {
    runs = JSON.parse(fs.readFileSync(trendPath, 'utf-8'));
  } catch {}

  runs.push({ date: reportData.date, brands: brandStats });
  if (runs.length > 30) runs = runs.slice(-30);

  fs.mkdirSync(path.dirname(trendPath), { recursive: true });
  fs.writeFileSync(trendPath, JSON.stringify(runs, null, 2));
  return runs;
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
      return +((s.passed / s.total) * 100).toFixed(1);
    }),
  }));

  const option = {
    title: {
      text: 'Pass Rate per Brand — Run History',
      left: 'center',
      top: 16,
      textStyle: { fontSize: 16, fontFamily: 'Arial, sans-serif' },
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { bottom: 8, type: 'scroll' },
    grid: { top: 64, bottom: 80, left: 64, right: 24 },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: { rotate: 30, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}%' },
      splitLine: { lineStyle: { type: 'dashed' } },
    },
    series,
  };

  const generatedAt = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Brand Chart — Multi-Brand Automation</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding-top: 38px; }
    .page-content { padding: 16px; }
    .card { background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.12); padding: 16px; }
    #chart { width: 100%; height: 520px; }
    .meta { text-align: right; color: #999; font-size: 11px; margin-top: 8px; }
  </style>
</head>
<body>
  ${buildStaticNavHtml('brand-chart.html')}
  <div class="page-content">
    <div class="card">
      <div id="chart"></div>
      <p class="meta">Generated: ${generatedAt} &nbsp;|&nbsp; ${runs.length} run(s) tracked</p>
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

  // Remove previous injection to avoid duplicates on re-runs
  html = html.replace(/<script>\s*\(function\(\)\{[\s\S]*?mcr-nav[\s\S]*?}\)\(\);\s*<\/script>\s*/m, '');

  // Inject dynamic nav script just before </body>
  html = html.replace('</body>', `${buildDynamicNavScript('index.html')}\n</body>`);
  fs.writeFileSync(reportPath, html);
}
