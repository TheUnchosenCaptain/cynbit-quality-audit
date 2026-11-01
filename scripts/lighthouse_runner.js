const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Users\\Keshav Sharma\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe";
process.env.CHROME_PATH = CHROME_PATH;

const LIGHTHOUSE_DIR = path.join(__dirname, '../lighthouse');
const LOGS_DIR = path.join(__dirname, '../logs');

const PAGES = [
  { name: 'home', url: 'https://www.cynbit.in/' },
  { name: 'contact', url: 'https://www.cynbit.in/contact' },
  { name: 'services', url: 'https://www.cynbit.in/services' },
  { name: 'careers', url: 'https://www.cynbit.in/careers' },
  { name: 'bitelevate', url: 'https://www.cynbit.in/bitelevate' },
  { name: 'blog', url: 'https://www.cynbit.in/blog' }
];

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function runLighthouseCommand(url, mode, outputPathBase) {
  const isDesktop = mode === 'desktop';
  const desktopFlags = isDesktop ? '--preset=desktop' : '--form-factor=mobile --screenEmulation.mobile';
  const cmd = `npx lighthouse "${url}" ${desktopFlags} --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" --output=json,html --output-path="${outputPathBase}" --quiet`;
  
  try {
    execSync(cmd, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, CHROME_PATH },
      timeout: 120000,
      stdio: 'pipe'
    });
    return true;
  } catch (err) {
    console.error(`Lighthouse run failed for ${url} (${mode}):`, err.message);
    return false;
  }
}

async function runAllLighthouse() {
  console.log('=== Starting Phase 4: Lighthouse Performance Testing (3 runs per page) ===');
  const summaryReport = [];

  for (const page of PAGES) {
    console.log(`\nAuditing ${page.name} (${page.url})...`);
    for (const mode of ['mobile', 'desktop']) {
      console.log(`  Mode: ${mode} (3 runs)...`);
      const runsData = [];

      for (let run = 1; run <= 3; run++) {
        console.log(`    Run ${run}/3 for ${page.name} [${mode}]...`);
        const outBase = path.join(LIGHTHOUSE_DIR, `${page.name}_${mode}_run${run}`);
        const success = runLighthouseCommand(page.url, mode, outBase);
        
        const jsonPath = `${outBase}.report.json`;
        if (success && fs.existsSync(jsonPath)) {
          try {
            const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            const perf = raw.categories.performance ? Math.round(raw.categories.performance.score * 100) : 0;
            const a11y = raw.categories.accessibility ? Math.round(raw.categories.accessibility.score * 100) : 0;
            const bp = raw.categories['best-practices'] ? Math.round(raw.categories['best-practices'].score * 100) : 0;
            const seo = raw.categories.seo ? Math.round(raw.categories.seo.score * 100) : 0;

            const fcp = raw.audits['first-contentful-paint'] ? raw.audits['first-contentful-paint'].numericValue : 0;
            const lcp = raw.audits['largest-contentful-paint'] ? raw.audits['largest-contentful-paint'].numericValue : 0;
            const cls = raw.audits['cumulative-layout-shift'] ? raw.audits['cumulative-layout-shift'].numericValue : 0;
            const tbt = raw.audits['total-blocking-time'] ? raw.audits['total-blocking-time'].numericValue : 0;
            const ttfb = raw.audits['server-response-time'] ? raw.audits['server-response-time'].numericValue : 0;

            // Extract top diagnostic issues
            const getAuditDetails = (id) => {
              const a = raw.audits[id];
              if (!a) return null;
              return {
                title: a.title,
                score: a.score,
                displayValue: a.displayValue || '',
                numericValue: a.numericValue || 0,
                details: a.details ? (a.details.items ? a.details.items.slice(0, 5) : null) : null
              };
            };

            const diagnostics = {
              renderBlocking: getAuditDetails('render-blocking-resources'),
              responsiveImages: getAuditDetails('uses-responsive-images'),
              offscreenImages: getAuditDetails('offscreen-images'),
              unusedCss: getAuditDetails('unused-css-rules'),
              unusedJs: getAuditDetails('unused-javascript'),
              fontDisplay: getAuditDetails('font-display'),
              thirdParty: getAuditDetails('third-party-summary'),
              layoutShifts: getAuditDetails('layout-shift-elements')
            };

            runsData.push({
              run,
              perf,
              a11y,
              bp,
              seo,
              fcp,
              lcp,
              cls,
              tbt,
              ttfb,
              diagnostics,
              htmlPath: `${outBase}.report.html`,
              jsonPath: `${outBase}.report.json`
            });
          } catch (e) {
            console.error(`Error parsing run ${run} JSON:`, e.message);
          }
        }
      }

      if (runsData.length > 0) {
        // Calculate medians
        const medianPerf = median(runsData.map(r => r.perf));
        const medianA11y = median(runsData.map(r => r.a11y));
        const medianBp = median(runsData.map(r => r.bp));
        const medianSeo = median(runsData.map(r => r.seo));
        const medianFcp = median(runsData.map(r => r.fcp));
        const medianLcp = median(runsData.map(r => r.lcp));
        const medianCls = median(runsData.map(r => r.cls));
        const medianTbt = median(runsData.map(r => r.tbt));
        const medianTtfb = median(runsData.map(r => r.ttfb));

        // Find closest run to medianPerf
        const medianRun = runsData.reduce((prev, curr) =>
          Math.abs(curr.perf - medianPerf) < Math.abs(prev.perf - medianPerf) ? curr : prev
        );

        // Copy median report to canonical filename
        const canonicalHtml = path.join(LIGHTHOUSE_DIR, `${page.name}_${mode}_median.report.html`);
        const canonicalJson = path.join(LIGHTHOUSE_DIR, `${page.name}_${mode}_median.report.json`);
        if (fs.existsSync(medianRun.htmlPath)) fs.copyFileSync(medianRun.htmlPath, canonicalHtml);
        if (fs.existsSync(medianRun.jsonPath)) fs.copyFileSync(medianRun.jsonPath, canonicalJson);

        summaryReport.push({
          page: page.name,
          url: page.url,
          mode,
          runsCount: runsData.length,
          medianScores: {
            performance: medianPerf,
            accessibility: medianA11y,
            bestPractices: medianBp,
            seo: medianSeo
          },
          medianMetrics: {
            fcpMs: Math.round(medianFcp),
            lcpMs: Math.round(medianLcp),
            cls: parseFloat(medianCls.toFixed(3)),
            tbtMs: Math.round(medianTbt),
            ttfbMs: Math.round(medianTtfb)
          },
          topDiagnostics: medianRun.diagnostics,
          allRuns: runsData.map(r => ({
            run: r.run,
            perf: r.perf,
            a11y: r.a11y,
            bp: r.bp,
            seo: r.seo,
            lcpMs: Math.round(r.lcp),
            cls: parseFloat(r.cls.toFixed(3)),
            tbtMs: Math.round(r.tbt)
          }))
        });
      }
    }
  }

  fs.writeFileSync(path.join(LOGS_DIR, 'lighthouse_summary.json'), JSON.stringify(summaryReport, null, 2), 'utf-8');
  console.log('\nLighthouse testing completed! Summary saved to cynbit-audit/logs/lighthouse_summary.json.');
}

runAllLighthouse().catch(err => {
  console.error('Fatal lighthouse runner error:', err);
  process.exit(1);
});
