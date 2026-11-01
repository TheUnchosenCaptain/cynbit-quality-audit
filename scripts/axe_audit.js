const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs');
const path = require('path');

const AXE_DIR = path.join(__dirname, '../axe');
const LOGS_DIR = path.join(__dirname, '../logs');

const PAGES = [
  { name: 'home', url: 'https://www.cynbit.in/' },
  { name: 'contact', url: 'https://www.cynbit.in/contact' },
  { name: 'careers', url: 'https://www.cynbit.in/careers' },
  { name: 'services', url: 'https://www.cynbit.in/services' },
  { name: 'bitelevate', url: 'https://www.cynbit.in/bitelevate' },
  { name: 'blog', url: 'https://www.cynbit.in/blog' }
];

async function runAccessibilityAudit() {
  console.log('=== Starting Phase 5: Accessibility Audit (WCAG 2.2 AA) ===');
  const browser = await chromium.launch({ headless: true });
  const allResults = [];
  const violationSummary = {};

  for (const p of PAGES) {
    console.log(`Auditing accessibility for: ${p.name} (${p.url})...`);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();
    try {
      await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(1000);
    } catch (e) {
      console.warn(`Nav timeout on ${p.url}, proceeding with analysis`);
    }

    // 1. Audit default state
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    fs.writeFileSync(
      path.join(AXE_DIR, `axe_${p.name}_desktop.json`),
      JSON.stringify(results, null, 2),
      'utf-8'
    );

    // Record violations
    for (const v of results.violations) {
      if (!violationSummary[v.id]) {
        violationSummary[v.id] = {
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          tags: v.tags,
          pages: [],
          totalOccurrences: 0
        };
      }
      violationSummary[v.id].pages.push({
        page: p.name,
        nodesCount: v.nodes.length,
        sampleHtml: v.nodes.slice(0, 3).map(n => n.html),
        failureSummary: v.nodes[0] ? v.nodes[0].failureSummary : ''
      });
      violationSummary[v.id].totalOccurrences += v.nodes.length;
    }

    allResults.push({
      page: p.name,
      url: p.url,
      violationsCount: results.violations.length,
      passesCount: results.passes.length,
      incompleteCount: results.incomplete.length,
      inapplicableCount: results.inapplicable.length,
      violations: results.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        count: v.nodes.length
      }))
    });

    await context.close();
  }

  // 2. Audit Mobile Menu Open State
  console.log('Auditing Mobile Menu Open State...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  try {
    await mobilePage.goto('https://www.cynbit.in', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await mobilePage.waitForTimeout(1000);
  } catch (e) {
    console.warn('Mobile nav timeout');
  }

  // Find and open hamburger
  const menuBtn = await mobilePage.$('button[aria-label*="menu" i], button[class*="menu" i], nav button, button:has(svg)');
  if (menuBtn) {
    await menuBtn.click();
    await mobilePage.waitForTimeout(500);
    const menuResults = await new AxeBuilder({ page: mobilePage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    fs.writeFileSync(
      path.join(AXE_DIR, `axe_mobile_menu_open.json`),
      JSON.stringify(menuResults, null, 2),
      'utf-8'
    );
    allResults.push({
      page: 'home_mobile_menu_open',
      url: 'https://www.cynbit.in (mobile menu)',
      violationsCount: menuResults.violations.length,
      violations: menuResults.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        count: v.nodes.length
      }))
    });
  }
  await mobileContext.close();

  // 3. Audit Contact Form In Error State
  console.log('Auditing Contact Form with validation triggered...');
  const contactContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const contactPage = await contactContext.newPage();
  try {
    await contactPage.goto('https://www.cynbit.in/contact', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await contactPage.waitForTimeout(1000);
  } catch (e) {
    console.warn('Contact nav timeout');
  }
  const submitBtn = await contactPage.$('form button[type="submit"], button:has-text("Send"), button:has-text("Submit")');
  if (submitBtn) {
    await submitBtn.click();
    await contactPage.waitForTimeout(500);
    const contactErrResults = await new AxeBuilder({ page: contactPage })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    fs.writeFileSync(
      path.join(AXE_DIR, `axe_contact_form_errors.json`),
      JSON.stringify(contactErrResults, null, 2),
      'utf-8'
    );
    allResults.push({
      page: 'contact_form_errors',
      url: 'https://www.cynbit.in/contact (errors)',
      violationsCount: contactErrResults.violations.length,
      violations: contactErrResults.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        count: v.nodes.length
      }))
    });
  }
  await contactContext.close();

  await browser.close();

  // Save summary
  fs.writeFileSync(
    path.join(LOGS_DIR, 'axe_summary_report.json'),
    JSON.stringify({ summary: allResults, violationCatalog: Object.values(violationSummary) }, null, 2),
    'utf-8'
  );
  console.log('Accessibility audit complete. Reports saved to cynbit-audit/axe/ and cynbit-audit/logs/axe_summary_report.json.');
}

runAccessibilityAudit().catch(err => {
  console.error('Error during accessibility audit:', err);
  process.exit(1);
});
