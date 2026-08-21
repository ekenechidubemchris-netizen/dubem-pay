// @ts-check
const { test, expect } = require('@playwright/test');
const { signUp } = require('./helpers');

test.describe('Dashboard', () => {
  test('shows all 6 currency chips with a real value (not the placeholder)', async ({ page }) => {
    await signUp(page);
    for (const id of ['usdAmt', 'eurAmt', 'jpyAmt', 'gbpAmt', 'cnyAmt', 'ngnAmt']) {
      await expect(page.locator(`#${id}`)).not.toHaveText('—', { timeout: 5000 });
    }
  });

  test('the rates caption resolves to either live or offline (never stays "Fetching…")', async ({ page }) => {
    await signUp(page);
    const caption = page.locator('#ratesCaption');
    await expect(caption).not.toHaveText('Fetching…', { timeout: 5000 });
  });

  test('balance sparkline renders a line', async ({ page }) => {
    await signUp(page);
    await expect(page.locator('#balanceSparkline .dp-sparkline-line')).toHaveCount(1);
  });

  test('theme toggle switches immediately and persists across reload', async ({ page }) => {
    await signUp(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.click('#themeToggleBtn');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('hiding the balance blurs the figure, and toggling again reveals it', async ({ page }) => {
    await signUp(page);
    const balance = page.locator('#mainBalance');
    await expect(balance).not.toHaveClass(/dp-hidden-balance/);

    await page.click('#toggleBalanceVisibility');
    await expect(balance).toHaveClass(/dp-hidden-balance/);

    await page.click('#toggleBalanceVisibility');
    await expect(balance).not.toHaveClass(/dp-hidden-balance/);
  });

  test('Add Money opens the funding page, and Top-up with Card/Account shows a loading state then resolves', async ({ page }) => {
    await signUp(page);
    await page.click('#addMoneyBtn');
    await expect(page.locator('#addMoneyModal')).toBeVisible();

    const btn = page.locator('#addMoneyCardTopupBtn');
    await btn.click();
    await expect(btn).toBeDisabled();
    // Success shows the full-page confirmation (#successModal); a
    // simulated failure falls back to the small #dpToast — assert on
    // whichever one actually fired rather than assuming success.
    await expect(async () => {
      const [toastVisible, successVisible] = await Promise.all([
        page.locator('#dpToast').isVisible(),
        page.locator('#successModal').isVisible(),
      ]);
      expect(toastVisible || successVisible).toBeTruthy();
    }).toPass({ timeout: 3000 });
    await expect(btn).toBeEnabled({ timeout: 3000 });
  });

  test('Create Invoice validates required fields before generating a link', async ({ page }) => {
    await signUp(page);
    await page.click('[data-bs-target="#invoiceModal"]');
    await page.click('#invoiceSubmitBtn');

    await expect(page.locator('#invoiceAmount')).toHaveClass(/is-invalid/);
    await expect(page.locator('#invoiceResult')).toBeHidden();

    await page.fill('#invoiceAmount', '250');
    await page.fill('#invoiceClient', 'Playwright Test Client');
    await page.click('#invoiceSubmitBtn');

    await expect(page.locator('#invoiceResult')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#invoiceLinkOutput')).toHaveValue(/pay\.dubempay\.com\/invoice/);
  });

  test('Create Invoice rejects HTML-tag-shaped input in the client field', async ({ page }) => {
    await signUp(page);
    await page.click('[data-bs-target="#invoiceModal"]');
    await page.fill('#invoiceAmount', '100');
    await page.fill('#invoiceClient', '<script>alert(1)</script>');
    await page.click('#invoiceSubmitBtn');

    await expect(page.locator('#invoiceClient')).toHaveClass(/is-invalid/);
    await expect(page.locator('#invoiceResult')).toBeHidden();
  });
});
