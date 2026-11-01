const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');
const LOGS_DIR = path.join(__dirname, '../logs');

async function testAdditionalForms() {
  console.log('=== Testing Newsletter and Career Application Forms ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const results = {
    newsletter: {},
    careerApplication: {}
  };

  // 1. Newsletter Form on /blog
  console.log('1. Testing Newsletter Form on /blog...');
  await page.goto('https://www.cynbit.in/blog', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const newsletterInput = await page.$('input[placeholder*="business email" i]');
  const newsletterBtn = await page.$('form button:has-text("Subscribe"), form button:has-text("Join"), form:has(input[placeholder*="business email" i]) button');

  if (newsletterInput && newsletterBtn) {
    // Negative Case 1: Empty submit
    await newsletterBtn.click();
    await page.waitForTimeout(500);
    const emptyValidity = await newsletterInput.evaluate(el => ({
      valid: el.checkValidity(),
      msg: el.validationMessage
    }));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'newsletter_empty_validation.png') });

    // Negative Case 2: Invalid Email
    await newsletterInput.fill('not-an-email');
    await newsletterBtn.click();
    await page.waitForTimeout(500);
    const invalidEmailValidity = await newsletterInput.evaluate(el => ({
      valid: el.checkValidity(),
      msg: el.validationMessage
    }));
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'newsletter_invalid_email.png') });

    results.newsletter = {
      emptyValidity,
      invalidEmailValidity
    };
  }

  // 2. Career Application Form on /careers/qa-testing-intern
  console.log('2. Testing Career Application Form on /careers/qa-testing-intern...');
  await page.goto('https://www.cynbit.in/careers/qa-testing-intern', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const submitAppBtn = await page.$('form button[type="submit"], form button:has-text("Submit"), form button:has-text("Apply")');
  
  if (submitAppBtn) {
    // Negative Case 1: Empty Application Submit
    await submitAppBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'career_form_empty_validation.png') });

    const invalidInputs = await page.$$eval('form input:invalid', inputs =>
      inputs.map(i => ({ name: i.name, type: i.type, msg: i.validationMessage }))
    );

    // Negative Case 2: Invalid URLs in portfolio/linkedin
    const nameInput = await page.$('input[name="fullName"]');
    const emailInput = await page.$('input[name="email"]');
    const portfolioInput = await page.$('input[name="portfolioUrl"]');
    const linkedinInput = await page.$('input[name="linkedinUrl"]');

    if (nameInput) await nameInput.fill('QA Tester');
    if (emailInput) await emailInput.fill('qa@example.com');
    if (portfolioInput) await portfolioInput.fill('invalid-url-schema');
    if (linkedinInput) await linkedinInput.fill('also-invalid');

    await submitAppBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'career_form_invalid_url.png') });

    const urlValidity = portfolioInput ? await portfolioInput.evaluate(el => ({
      valid: el.checkValidity(),
      msg: el.validationMessage
    })) : null;

    results.careerApplication = {
      emptyRequiredFieldsCount: invalidInputs.length,
      invalidFieldsSample: invalidInputs.slice(0, 5),
      urlValidity
    };
  }

  fs.writeFileSync(path.join(LOGS_DIR, 'additional_forms_test_results.json'), JSON.stringify(results, null, 2), 'utf-8');
  await browser.close();
  console.log('Additional forms testing complete!');
}

testAdditionalForms().catch(err => {
  console.error('Error testing additional forms:', err);
  process.exit(1);
});
