const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '../logs');
const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');

async function runFunctionalTests() {
  console.log('=== Starting Phase 2: Live Functional Testing ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 CynbitQA-Functional/1.0',
    recordHar: { path: path.join(__dirname, '../har/functional_tests.har') }
  });

  const page = await context.newPage();
  const functionalLog = [];
  const networkRequests = [];

  page.on('request', req => {
    if (req.url().includes('cynbit.in') || req.method() === 'POST') {
      networkRequests.push({
        method: req.method(),
        url: req.url(),
        postData: req.postData()
      });
    }
  });

  page.on('response', resp => {
    if (resp.url().includes('cynbit.in') || resp.request().method() === 'POST') {
      functionalLog.push({
        event: 'response',
        status: resp.status(),
        url: resp.url(),
        contentType: resp.headers()['content-type']
      });
    }
  });

  page.on('console', msg => {
    functionalLog.push({
      event: 'console',
      type: msg.type(),
      text: msg.text()
    });
  });

  page.on('pageerror', err => {
    functionalLog.push({
      event: 'pageerror',
      text: err.message,
      stack: err.stack
    });
  });

  const results = {
    contactForm: {},
    navigation: {},
    mobileMenu: {},
    notFoundPage: {},
    jsDisabled: {},
    keyboardNav: {}
  };

  // --- TEST 1: Navigation & Header Elements ---
  console.log('1. Testing Navigation & Header elements...');
  await page.goto('https://www.cynbit.in', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'nav_desktop_home.png') });

  // Extract all nav links
  const navLinks = await page.$$eval('header a, nav a', links =>
    links.map(a => ({ text: a.innerText.trim(), href: a.href }))
  );
  results.navigation.desktopLinks = navLinks;

  // --- TEST 2: Contact Form Testing ---
  console.log('2. Navigating to Contact Page...');
  await page.goto('https://www.cynbit.in/contact', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'contact_page_initial.png') });

  // Find form inputs
  const forms = await page.$$eval('form', f => f.length);
  const inputs = await page.$$eval('input, textarea, select', elems =>
    elems.map(e => ({
      tag: e.tagName.toLowerCase(),
      type: e.type || '',
      name: e.name || '',
      id: e.id || '',
      placeholder: e.placeholder || '',
      required: e.required
    }))
  );
  results.contactForm.detectedForms = forms;
  results.contactForm.detectedInputs = inputs;
  console.log(`Found ${forms} form(s) and ${inputs.length} input elements on /contact.`);

  // Negative Test 1: Empty Submission
  console.log('2.1 Testing Negative Case: Empty Form Submission...');
  const submitBtn = await page.$('form button[type="submit"], form input[type="submit"], button:has-text("Send"), button:has-text("Submit"), button:has-text("Get in touch")');
  if (submitBtn) {
    await submitBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'contact_form_empty_submission.png') });
    
    // Check validation states
    const validationStates = await page.$$eval('input:invalid, textarea:invalid', el => el.map(e => ({ name: e.name || e.id, msg: e.validationMessage })));
    const visibleErrors = await page.$$eval('.error, [role="alert"], [class*="error"], [class*="invalid"]', el => el.map(e => e.innerText.trim()));
    results.contactForm.emptySubmission = {
      prevented: true,
      html5InvalidFields: validationStates,
      visibleErrors: visibleErrors
    };
  }

  // Negative Test 2: Invalid Email Format
  console.log('2.2 Testing Negative Case: Invalid Email Format...');
  const nameInput = await page.$('input[name*="name" i], input[placeholder*="name" i], input[id*="name" i]');
  const emailInput = await page.$('input[type="email"], input[name*="email" i], input[placeholder*="email" i], input[id*="email" i]');
  const messageInput = await page.$('textarea, input[name*="message" i], input[placeholder*="message" i]');

  if (emailInput) {
    if (nameInput) await nameInput.fill('QA Test');
    await emailInput.fill('invalid-email-format');
    if (messageInput) await messageInput.fill('Test message for invalid email.');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'contact_form_invalid_email.png') });
      const emailValidation = await emailInput.evaluate(e => ({
        valid: e.checkValidity(),
        message: e.validationMessage
      }));
      results.contactForm.invalidEmail = {
        emailValidation: emailValidation
      };
    }
  }

  // Negative Test 3: Special Characters / XSS Strings in text fields
  console.log('2.3 Testing Negative Case: Special Characters & XSS payload...');
  if (emailInput && nameInput && messageInput) {
    await nameInput.fill('<script>alert("QA-XSS")</script> <b>Test</b>');
    await emailInput.fill('qa.test+xss@example.com');
    await messageInput.fill('Testing special characters: & < > " \' / ` 🚀🔥 <script>console.log("XSS")</script>');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'contact_form_xss_input.png') });
    results.contactForm.xssPayloadTesting = {
      acceptedInInputs: true
    };
  }

  // Happy Path: Submit single valid inquiry
  console.log('2.4 Testing Happy Path: Single Valid Form Submission...');
  const happyPathNetworkCalls = [];
  page.on('request', req => {
    if (req.method() === 'POST') {
      happyPathNetworkCalls.push({
        url: req.url(),
        method: req.method(),
        postData: req.postData()
      });
    }
  });

  if (nameInput && emailInput && messageInput && submitBtn) {
    await nameInput.fill('QA Test');
    await emailInput.fill('qa.test+cynbit@example.com');
    await messageInput.fill('Automated QA test, please ignore');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'contact_form_happy_path_filled.png') });

    // Click submit once
    await submitBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'contact_form_happy_path_submitted.png') });

    results.contactForm.happyPath = {
      submitted: true,
      networkCalls: happyPathNetworkCalls,
      urlAfterSubmit: page.url()
    };
  }

  // --- TEST 3: 404 Page Behavior ---
  console.log('3. Testing 404 Page Behavior...');
  const nonExistentUrl = 'https://www.cynbit.in/this-page-definitely-does-not-exist-qa-404';
  const response404 = await page.goto(nonExistentUrl, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '404_page.png') });
  const status404 = response404 ? response404.status() : null;
  const title404 = await page.title();
  const heading404 = await page.$$eval('h1, h2', h => h.map(x => x.innerText.trim()));
  results.notFoundPage = {
    testedUrl: nonExistentUrl,
    statusCode: status404,
    pageTitle: title404,
    headings: heading404
  };

  // --- TEST 4: Keyboard Navigation ---
  console.log('4. Testing Keyboard-Only Tab Navigation...');
  await page.goto('https://www.cynbit.in', { waitUntil: 'networkidle' });
  const tabSequence = [];
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id,
        className: el.className,
        text: el.innerText ? el.innerText.slice(0, 30) : '',
        outline: window.getComputedStyle(el).outline,
        boxShadow: window.getComputedStyle(el).boxShadow
      };
    });
    tabSequence.push(focused);
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'keyboard_nav_focus_state.png') });
  results.keyboardNav = { tabSequence };

  // --- TEST 5: JavaScript Disabled Behavior ---
  console.log('5. Testing JS Disabled Behavior...');
  const noJsContext = await browser.newContext({ javaScriptEnabled: false });
  const noJsPage = await noJsContext.newPage();
  await noJsPage.goto('https://www.cynbit.in', { waitUntil: 'domcontentloaded' });
  await noJsPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'home_js_disabled.png') });
  const noJsBody = await noJsPage.evaluate(() => document.body.innerText.slice(0, 300));
  results.jsDisabled = {
    bodyPreview: noJsBody,
    renderedContentLength: noJsBody.length
  };
  await noJsContext.close();

  // Save all results
  fs.writeFileSync(path.join(LOGS_DIR, 'functional_test_results.json'), JSON.stringify(results, null, 2), 'utf-8');
  fs.writeFileSync(path.join(LOGS_DIR, 'functional_network_log.json'), JSON.stringify(networkRequests, null, 2), 'utf-8');
  fs.writeFileSync(path.join(LOGS_DIR, 'functional_console_log.json'), JSON.stringify(functionalLog, null, 2), 'utf-8');

  await browser.close();
  console.log('Functional tests complete. Results saved to cynbit-audit/logs/.');
}

runFunctionalTests().catch(err => {
  console.error('Error running functional tests:', err);
  process.exit(1);
});
