// @ts-check
const { expect } = require('@playwright/test');

/**
 * signUp
 * Every spec needs a logged-in dashboard to test against, and every test
 * gets its own isolated browser context (so a fresh localStorage) — so
 * rather than repeat the signup form-fill in every single test, every
 * spec file calls this once at the top of each test.
 *
 * Email is randomized per call so parallel test runs never collide on
 * "this account already exists".
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} [name]
 * @returns {Promise<string>} the email used, in case a test needs to log
 *   back in with it later (see auth.spec.js)
 */
async function signUp(page, name = 'Test User') {
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await page.goto('/');
  await page.click('[data-auth-tab="signup"]');
  await page.fill('#signupName', name);
  await page.fill('#signupEmail', email);
  await page.fill('#signupPassword', 'TestPass123');
  await page.fill('#signupConfirm', 'TestPass123');
  await page.click('#signupForm button[type=submit]');
  await expect(page.locator('#appShell')).toBeVisible();
  return email;
}

/**
 * logInAsDemo
 * Logs straight into the shared demo account (demo@dubempay.com) via the
 * "View Demo Account" button on the auth screen — the one account that
 * still carries seeded transactions/subscriptions/balance (see
 * getDefaultAppState in core.js). Every real signUp() account now starts
 * genuinely empty, so any test that depends on pre-seeded data (starter
 * subscriptions, the transactions table having rows to filter, etc.)
 * should use this instead of signUp(). Each Playwright test gets its own
 * isolated browser context/localStorage, so this always starts from the
 * same fresh seed — no state leaks between tests.
 *
 * @param {import('@playwright/test').Page} page
 */
async function logInAsDemo(page) {
  await page.goto('/');
  await page.click('#demoAccountBtn');
  await expect(page.locator('#appShell')).toBeVisible();
}

module.exports = { signUp, logInAsDemo };
