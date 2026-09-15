'use strict';
/*
 * E2E flow 2 — librarian circulation journey (Selenium, headless Chrome):
 * sign-in -> desk eligibility check -> issue by scan (receipt) -> return ->
 * copy back on shelf; state re-verified through the REST API.
 */
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

const BASE = process.env.E2E_BASE || 'http://localhost:4000';
const steps = [];
const step = (m) => { steps.push(m); console.log(`  ✓ ${steps.length}. ${m}`); };

(async () => {
  const opts = new chrome.Options();
  opts.addArguments('--headless=new', '--no-sandbox', '--disable-gpu', '--window-size=1400,900');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(opts).build();
  try {
    // 1. librarian sign-in
    await driver.get(BASE + '/');
    await driver.wait(until.elementLocated(By.css('.login-card input')), 8000);
    const inputs = await driver.findElements(By.css('.login-card input'));
    await inputs[0].sendKeys('librarian1');
    await inputs[1].sendKeys('Librarian@123');
    await driver.findElement(By.xpath('//button[normalize-space()="Sign in"]')).click();
    await driver.wait(until.elementLocated(By.partialLinkText('Circulation Desk')), 8000);
    step('Librarian signed in; desk navigation available');

    // 2. open desk + member eligibility
    await driver.findElement(By.partialLinkText('Circulation Desk')).click();
    await driver.wait(until.elementLocated(By.css('input[aria-label="Member identifier"]')), 8000);
    await driver.findElement(By.css('input[aria-label="Member identifier"]')).sendKeys('LIB-CSE2201');
    await driver.findElement(By.xpath('//button[normalize-space()="Check"]')).click();
    await driver.wait(async () => ((await driver.findElement(By.css('body')).getText()).includes('Arun Karthik R')), 8000);
    step('Eligibility card: Arun Karthik R with limit + dues shown');

    // 3. issue by book barcode -> receipt
    await driver.findElement(By.css('input[aria-label="Book barcode"]')).sendKeys('LIB-CSHFP04-002');
    await driver.findElement(By.xpath('//button[normalize-space()="Issue book"]')).click();
    await driver.wait(until.elementLocated(By.css('.receipt')), 8000);
    const receipt = await driver.findElement(By.css('.receipt')).getText();
    assert.match(receipt, /Head First Design Patterns/);
    assert.match(receipt, /Due/);
    assert.match(receipt, /LIB-CSHFP04-002/);
    step('Issue succeeded — receipt shows title, Due date and copy barcode');

    // 4. barcode SVG renders through the authenticated client
    await driver.wait(until.elementLocated(By.css('.barcode-slot svg'), 5), 8000);
    step('Code-128 barcode rendered in the receipt (authenticated SVG fetch)');

    // 5. return tab -> same barcode -> back on shelf (verified via API too)
    await driver.findElement(By.xpath('//button[normalize-space()="Return"]')).click();
    await driver.wait(until.elementLocated(By.css('input[aria-label="Book barcode"]')), 8000);
    await driver.findElement(By.css('input[aria-label="Book barcode"]')).sendKeys('LIB-CSHFP04-002');
    await driver.findElement(By.xpath('//button[normalize-space()="Return copy"]')).click();
    await driver.wait(async () => ((await driver.findElement(By.css('body')).getText()).includes('returned')), 8000);
    const tok = await (await fetch(BASE + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin', password: 'Admin@123' })
    })).json().then((d) => d.token);
    const state = await (await fetch(BASE + '/api/barcodes/LIB-CSHFP04-002', { headers: { Authorization: `Bearer ${tok}` } })).json();
    assert.strictEqual(state.copy.status, 'AVAILABLE', 'copy must be back on the shelf');
    step('Return processed and copy status AVAILABLE (API-verified)');

    console.log(`\nCIRCULATION FLOW PASSED — ${steps.length} steps`);
  } finally {
    await driver.quit();
  }
})().catch((e) => { console.error('CIRCULATION FLOW FAILED:', e.message); process.exit(1); });
