const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
const LOGS_DIR = path.join(__dirname, '../logs');

const PAGES = [
  { name: 'home', url: 'https://www.cynbit.in/' },
  { name: 'contact', url: 'https://www.cynbit.in/contact' },
  { name: 'careers', url: 'https://www.cynbit.in/careers' },
  { name: 'services', url: 'https://www.cynbit.in/services' },
  { name: 'bitelevate', url: 'https://www.cynbit.in/bitelevate' },
  { name: 'blog', url: 'https://www.cynbit.in/blog' },
  { name: 'case-studies', url: 'https://www.cynbit.in/case-studies' },
  { name: '404', url: 'https://www.cynbit.in/non-existent-qa-page-test' }
];

const VIEWPORTS = [
  // Mobile
  { label: '360x640', width: 360, height: 640, isMobile: true, category: 'Mobile' },
  { label: '375x667', width: 375, height: 667, isMobile: true, category: 'Mobile (iPhone SE)' },
  { label: '390x844', width: 390, height: 844, isMobile: true, category: 'Mobile (iPhone 14)' },
  { label: '412x915', width: 412, height: 915, isMobile: true, category: 'Mobile (Pixel/Android)' },
  { label: '430x932', width: 430, height: 932, isMobile: true, category: 'Mobile (iPhone Max)' },
  // Tablet
  { label: '768x1024', width: 768, height: 1024, isMobile: true, category: 'Tablet Portrait' },
  { label: '1024x768', width: 1024, height: 768, isMobile: false, category: 'Tablet Landscape' },
  { label: '820x1180', width: 820, height: 1180, isMobile: true, category: 'Tablet (iPad Air)' },
  // Desktop
  { label: '1280x720', width: 1280, height: 720, isMobile: false, category: 'Desktop HD' },
  { label: '1366x768', width: 1366, height: 768, isMobile: false, category: 'Desktop Standard' },
  { label: '1440x900', width: 1440, height: 900, isMobile: false, category: 'Desktop Widescreen' },
  { label: '1920x1080', width: 1920, height: 1080, isMobile: false, category: 'Desktop Full HD' },
  { label: '2560x1440', width: 2560, height: 1440, isMobile: false, category: 'Desktop 2K QHD' }
];

async function runMatrix() {
  console.log('=== Starting Phase 3: Responsive & Cross-Browser Matrix Testing ===');
  const matrixResults = [];
  const browsers = [
    { name: 'chromium', engine: chromium },
    { name: 'firefox', engine: firefox },
    { name: 'webkit', engine: webkit }
  ];

  for (const bInfo of browsers) {
    console.log(`\nLaunching browser: ${bInfo.name}`);
    let browser;
    try {
      browser = await bInfo.engine.launch({ headless: true });
    } catch (e) {
      console.error(`Failed to launch ${bInfo.name}:`, e.message);
      continue;
    }

    // Test matrix of viewports for key representative pages (home, contact, services, blog)
    const matrixPages = [
      { name: 'home', url: 'https://www.cynbit.in/' },
      { name: 'contact', url: 'https://www.cynbit.in/contact' },
      { name: 'services', url: 'https://www.cynbit.in/services' },
      { name: 'bitelevate', url: 'https://www.cynbit.in/bitelevate' }
    ];

    for (const p of matrixPages) {
      for (const vp of VIEWPORTS) {
        const testId = `${p.name}_${bInfo.name}_${vp.label}`;
        console.log(`[${bInfo.name}] Testing ${p.name} @ ${vp.label}...`);
        try {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            hasTouch: vp.isMobile,
            isMobile: vp.isMobile
          });
          const page = await context.newPage();
          const pageConsole = [];
          page.on('console', msg => {
            if (msg.type() === 'error') pageConsole.push(msg.text());
          });

          await page.goto(p.url, { waitUntil: 'load', timeout: 30000 });
          await page.waitForTimeout(1000); // allow animations/fonts to settle

          // Check Layout anomalies
          const layoutCheck = await page.evaluate(() => {
            const docWidth = document.documentElement.offsetWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            const windowWidth = window.innerWidth;
            const hasHorizontalScroll = scrollWidth > windowWidth;

            // Check tap targets
            const interactiveElements = Array.from(document.querySelectorAll('a, button, input, select'));
            let smallTargets = 0;
            interactiveElements.forEach(el => {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
                smallTargets++;
              }
            });

            // Check hamburger menu presence on small screen
            const hamburger = document.querySelector('button[aria-label*="menu" i], button[class*="menu" i], button[class*="hamburger" i], nav button');

            return {
              hasHorizontalScroll,
              scrollDelta: scrollWidth - windowWidth,
              interactiveCount: interactiveElements.length,
              smallTargetsCount: smallTargets,
              hasHamburger: !!hamburger
            };
          });

          // Screenshot
          const filename = `${p.name}_${bInfo.name}_${vp.label}.png`;
          const screenshotPath = path.join(SCREENSHOTS_DIR, filename);
          await page.screenshot({ path: screenshotPath, fullPage: true });

          const passed = !layoutCheck.hasHorizontalScroll && pageConsole.length === 0;

          matrixResults.push({
            id: testId,
            page: p.name,
            browser: bInfo.name,
            viewport: vp.label,
            category: vp.category,
            status: passed ? 'PASS' : 'WARN/FAIL',
            screenshot: filename,
            hasHorizontalScroll: layoutCheck.hasHorizontalScroll,
            scrollDelta: layoutCheck.scrollDelta,
            smallTargetsCount: layoutCheck.smallTargetsCount,
            totalInteractive: layoutCheck.interactiveCount,
            consoleErrors: pageConsole
          });

          await context.close();
        } catch (err) {
          console.error(`Error on ${testId}:`, err.message);
          matrixResults.push({
            id: testId,
            page: p.name,
            browser: bInfo.name,
            viewport: vp.label,
            category: vp.category,
            status: 'FAIL',
            error: err.message
          });
        }
      }
    }

    // Special Modes on Desktop (1440x900) & Mobile (390x844)
    console.log(`[${bInfo.name}] Testing Dark Mode, Reduced Motion & 200% Zoom...`);
    try {
      // Dark Mode
      const darkContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark'
      });
      const darkPage = await darkContext.newPage();
      await darkPage.goto('https://www.cynbit.in', { waitUntil: 'load' });
      await darkPage.waitForTimeout(1000);
      const darkFilename = `home_${bInfo.name}_dark_mode_1440x900.png`;
      await darkPage.screenshot({ path: path.join(SCREENSHOTS_DIR, darkFilename), fullPage: true });
      await darkContext.close();
      matrixResults.push({
        id: `home_${bInfo.name}_dark_mode`,
        page: 'home',
        browser: bInfo.name,
        viewport: '1440x900',
        category: 'Dark Mode (prefers-color-scheme)',
        status: 'CAPTURED',
        screenshot: darkFilename
      });

      // Reduced Motion
      const motionContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce'
      });
      const motionPage = await motionContext.newPage();
      await motionPage.goto('https://www.cynbit.in', { waitUntil: 'load' });
      await motionPage.waitForTimeout(1000);
      const motionFilename = `home_${bInfo.name}_reduced_motion_1440x900.png`;
      await motionPage.screenshot({ path: path.join(SCREENSHOTS_DIR, motionFilename), fullPage: true });
      await motionContext.close();
      matrixResults.push({
        id: `home_${bInfo.name}_reduced_motion`,
        page: 'home',
        browser: bInfo.name,
        viewport: '1440x900',
        category: 'Reduced Motion',
        status: 'CAPTURED',
        screenshot: motionFilename
      });

      // 200% Zoom Emulation
      const zoomContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2
      });
      const zoomPage = await zoomContext.newPage();
      await zoomPage.goto('https://www.cynbit.in', { waitUntil: 'load' });
      await zoomPage.waitForTimeout(1000);
      const zoomFilename = `home_${bInfo.name}_zoom_200pct.png`;
      await zoomPage.screenshot({ path: path.join(SCREENSHOTS_DIR, zoomFilename), fullPage: true });
      await zoomContext.close();
      matrixResults.push({
        id: `home_${bInfo.name}_zoom_200pct`,
        page: 'home',
        browser: bInfo.name,
        viewport: '1440x900 (2x scale)',
        category: '200% Zoom / High DPI',
        status: 'CAPTURED',
        screenshot: zoomFilename
      });
    } catch (e) {
      console.error('Error on special modes:', e.message);
    }

    await browser.close();
  }

  fs.writeFileSync(path.join(LOGS_DIR, 'responsive_matrix_results.json'), JSON.stringify(matrixResults, null, 2), 'utf-8');
  console.log(`Matrix tests complete. Total combinations recorded: ${matrixResults.length}. Results saved to responsive_matrix_results.json.`);
}

runMatrix().catch(err => {
  console.error('Fatal matrix error:', err);
  process.exit(1);
});
