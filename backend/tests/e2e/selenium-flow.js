'use strict';
/*
 * E2E flow 1 — student journey (Selenium, headless Chrome):
 * sign-in -> dashboard loans -> catalogue search + detail -> My Library ->
 * Reservations tab shows the READY hold -> reservation state visible.
 */
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

const BASE = process.env.E2E_BASE || 'http://localhost:4000';
const steps = [];
const step = (msg) => { steps.push(msg); console.log(`  ✓ ${steps.length}. ${msg}`); };

// Fetch the temporary password the seeder wrote to the gitignored
// data/.seed-credentials.json (never hardcoded, never committed).
const tempPw = async (memberId) => {
  const fs = require('fs'), path = require('path');
  const dir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
  const file = path.join(dir, '.seed-credentials.json');
  const creds = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!creds[memberId]) throw new Error(`no temp password for ${memberId} — re-run the seeder`);
  return creds[memberId];
};

(async () => {
  const opts = new chrome.Options();
  opts.addArguments('--headless=new', '--no-sandbox', '--disable-gpu', '--window-size=1400,900');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(opts).build();
  try {
    // 1. sign in as the student with the READY hold
    await driver.get(BASE + '/');
    await driver.wait(until.elementLocated(By.css('.login-card input')), 8000);
    const inputs = await driver.findElements(By.css('.login-card input'));
    await inputs[0].sendKeys('ECE2210');
    await inputs[1].sendKeys(await tempPw('ECE2210'));
    await driver.findElement(By.xpath('//button[normalize-space()="Sign in"]')).click();
    // Wait for the data-driven state, not the DOM skeleton: .stat-value only
    // exists once the history API resolved and React committed the numbers.
    await driver.wait(until.elementsLocated(By.css('.stat-value'), 4), 8000);
    step('Student ECE2210 signed in; dashboard stats rendered');

    // 2. dashboard shows the overdue loan
    await driver.wait(async () => /Computer Networks/.test(await driver.findElement(By.css('body')).getText()), 5000);
    const body = await driver.findElement(By.css('body')).getText();
    assert.match(body, /Computer Networks/, 'dashboard should list the active loan');
    assert.match(body, /₹7\.00/, 'dashboard should show the unpaid fine total');
    step('Dashboard lists the active loan and fine summary');

    // 3. catalogue search finds the held title
    await driver.findElement(By.partialLinkText('Book Catalog')).click();
    await driver.wait(until.elementLocated(By.css('table tbody')), 8000);
    const search = await driver.findElement(By.css('input[type="search"]'));
    await search.clear(); await search.sendKeys('Discrete Mathematics');
    await driver.wait(async () => {
      const t = await driver.findElement(By.css('body')).getText();
      return t.includes('Discrete Mathematics');
    }, 8000);
    await driver.findElement(By.partialLinkText('Discrete Mathematics')).click();
    await driver.wait(until.elementLocated(By.css('.badge-amber')), 8000);
    step('Catalogue search + detail page shows the title with a RESERVED copy');

    // 4. My Library -> Reservations tab shows the READY hold
    await driver.findElement(By.partialLinkText('My Borrowed Books')).click();
    await driver.wait(until.elementLocated(By.xpath('//button[normalize-space()="Book Holds"]')), 8000);
    await driver.findElement(By.xpath('//button[normalize-space()="Book Holds"]')).click();
    await driver.wait(async () => {
      const t = await (await driver.findElements(By.css('td')))[0]?.getText().catch(() => '');
      return (await driver.findElement(By.css('body')).getText()).includes('Discrete Mathematics');
    }, 8000);
    const resBody = await driver.findElement(By.css('body')).getText();
    assert.match(resBody, /READY/, 'hold should read READY');
    step('My Library → Reservations shows the READY hold (48 h collection)');

    // 5. fines tab reflects the unpaid overdue penalty
    await driver.findElement(By.xpath('//button[normalize-space()="Fines"]')).click();
    await driver.wait(async () => ((await driver.findElement(By.css('body')).getText()).includes('₹7.00')), 8000);
    step('Fines tab shows the overdue penalty (₹7.00) from the sweep');

    console.log(`\nSTUDENT FLOW PASSED — ${steps.length} steps`);
  } finally {
    await driver.quit();
  }
})().catch((e) => { console.error('STUDENT FLOW FAILED:', e.message); process.exit(1); });
