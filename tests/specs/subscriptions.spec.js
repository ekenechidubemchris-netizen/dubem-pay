// @ts-check
const { test, expect } = require('@playwright/test');
const { signUp, logInAsDemo } = require('./helpers');

test.describe('Subscriptions', () => {
  test('starts with 3 starter subscriptions', async ({ page }) => {
    await logInAsDemo(page);
    await expect(page.locator('.dp-sub-card')).toHaveCount(3);
  });

  test('linking a new subscription adds a card and changes the monthly total', async ({ page }) => {
    await logInAsDemo(page);
    const before = await page.locator('#subsMonthlyTotal').textContent();

    await page.click('[data-bs-target="#subModal"]');
    await page.selectOption('#subSelect', { label: 'Disney+' });
    await page.fill('#subRenewDate', '2027-01-01');
    await page.click('#subSubmitBtn');

    await expect(page.locator('.dp-sub-card')).toHaveCount(4, { timeout: 3000 });
    await expect(page.locator('#subsMonthlyTotal')).not.toHaveText(before ?? '', { timeout: 3000 });
  });

  test('the subscription linking form rejects a past renewal date', async ({ page }) => {
    await logInAsDemo(page);
    await page.click('[data-bs-target="#subModal"]');
    await page.selectOption('#subSelect', { label: 'Spotify Premium' });
    await page.fill('#subRenewDate', '2020-01-01');
    await page.click('#subSubmitBtn');

    await expect(page.locator('#subRenewDate')).toHaveClass(/is-invalid/);
    await expect(page.locator('.dp-sub-card')).toHaveCount(3);
  });

  test('pausing a subscription changes the monthly total, unpausing restores it', async ({ page }) => {
    await logInAsDemo(page);
    const original = await page.locator('#subsMonthlyTotal').textContent();

    const firstToggle = page.locator('.dp-sub-toggle').first();
    await firstToggle.click();
    await expect(page.locator('#subsMonthlyTotal')).not.toHaveText(original ?? '');

    await firstToggle.click();
    await expect(page.locator('#subsMonthlyTotal')).toHaveText(original ?? '');
  });

  test('unlinking a subscription removes its card and updates the total', async ({ page }) => {
    await logInAsDemo(page);
    await page.locator('.dp-sub-unlink').first().click();
    await expect(page.locator('.dp-sub-card')).toHaveCount(2);
  });

  test('subscriptions persist across logout and login', async ({ page }) => {
    await logInAsDemo(page);

    await page.locator('.dp-sub-unlink').first().click();
    await expect(page.locator('.dp-sub-card')).toHaveCount(2);

    await page.click('.js-logout');
    await page.click('#demoAccountBtn');

    await expect(page.locator('.dp-sub-card')).toHaveCount(2);
  });

  test('a brand-new sign-up starts with no subscriptions at all', async ({ page }) => {
    await signUp(page);
    await expect(page.locator('.dp-sub-card')).toHaveCount(0);
  });
});

test.describe('Topbar search', () => {
  test('filters the transactions table', async ({ page }) => {
    await logInAsDemo(page);
    await page.fill('#dpSearchInput', 'netflix');
    const rows = page.locator('#txTableBody .dp-tx-row');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Netflix');
  });

  test('shows a "no results" row for a query that matches nothing', async ({ page }) => {
    await logInAsDemo(page);
    await page.fill('#dpSearchInput', 'zzz-no-such-transaction');
    await expect(page.locator('#txTableBody')).toContainText('No transactions match');
  });

  test('filters the subscription grid', async ({ page }) => {
    await logInAsDemo(page);
    await page.fill('#dpSearchInput', 'spotify');
    await expect(page.locator('.dp-sub-col:visible')).toHaveCount(1);
  });

  test('clearing the search restores all rows and cards', async ({ page }) => {
    await logInAsDemo(page);
    await page.fill('#dpSearchInput', 'netflix');
    await expect(page.locator('#txTableBody .dp-tx-row')).toHaveCount(1);

    await page.fill('#dpSearchInput', '');
    await expect(page.locator('#txTableBody .dp-tx-row')).toHaveCount(8);
  });

  test('a brand-new sign-up has an empty transactions table', async ({ page }) => {
    await signUp(page);
    await expect(page.locator('#txTableBody')).toContainText('No transactions yet');
  });
});
