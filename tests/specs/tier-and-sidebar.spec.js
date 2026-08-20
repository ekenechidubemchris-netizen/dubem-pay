// @ts-check
const { test, expect } = require('@playwright/test');
const { signUp } = require('./helpers');

test.describe('Tier verification', () => {
  test('starts at Tier 1, with Tier 2 current and Tier 3 locked', async ({ page }) => {
    await signUp(page);
    await expect(page.locator('#tierPillText')).toHaveText('Tier 1 Verified');

    await page.click('#tierPillBtn');
    await expect(page.locator('[data-tier-status="1"]')).toHaveText('Complete');
    await expect(page.locator('[data-tier-status="2"]')).toHaveText('Current');
    await expect(page.locator('[data-tier-status="3"]')).toHaveText('Locked');
    await expect(page.locator('[data-tier-upgrade="2"]')).toBeDisabled();
  });

  test('the Tier 2 upgrade button only enables once every checkbox is ticked', async ({ page }) => {
    await signUp(page);
    await page.click('#tierPillBtn');

    const checks = page.locator('.dp-tier-check[data-tier="2"]');
    const upgradeBtn = page.locator('[data-tier-upgrade="2"]');

    await checks.nth(0).check();
    await expect(upgradeBtn).toBeDisabled();
    await checks.nth(1).check();
    await expect(upgradeBtn).toBeDisabled();
    await checks.nth(2).check();
    await expect(upgradeBtn).toBeEnabled();
  });

  test('upgrading to Tier 2 updates the pill and unlocks Tier 3', async ({ page }) => {
    await signUp(page);
    await page.click('#tierPillBtn');

    const checks = page.locator('.dp-tier-check[data-tier="2"]');
    await checks.nth(0).check();
    await checks.nth(1).check();
    await checks.nth(2).check();
    await page.click('[data-tier-upgrade="2"]');

    await expect(page.locator('#tierPillText')).toHaveText('Tier 2 Verified');
    await expect(page.locator('[data-tier-status="2"]')).toHaveText('Complete');
    await expect(page.locator('[data-tier-status="3"]')).toHaveText('Current');
    await expect(page.locator('.dp-tier-check[data-tier="3"]').first()).toBeEnabled();
  });

  test('tier progress persists across logout and login', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-auth-tab="signup"]');
    const email = `tierpersist-${Date.now()}@example.com`;
    await page.fill('#signupName', 'Tier Persist');
    await page.fill('#signupEmail', email);
    await page.fill('#signupPassword', 'TierPersist123');
    await page.fill('#signupConfirm', 'TierPersist123');
    await page.click('#signupForm button[type=submit]');
    await expect(page.locator('#appShell')).toBeVisible();

    await page.click('#tierPillBtn');
    const checks = page.locator('.dp-tier-check[data-tier="2"]');
    await checks.nth(0).check();
    await checks.nth(1).check();
    await checks.nth(2).check();
    await page.click('[data-tier-upgrade="2"]');
    await expect(page.locator('#tierPillText')).toHaveText('Tier 2 Verified');

    // Close the modal before interacting with the page behind it — its
    // backdrop correctly blocks clicks on the sidebar while open, same as
    // it should for a real user.
    await page.click('#verificationModal .dp-page-back');
    await expect(page.locator('#verificationModal')).toBeHidden();

    await page.click('.js-logout');
    await page.fill('#loginEmail', email);
    await page.fill('#loginPassword', 'TierPersist123');
    await page.click('#loginForm button[type=submit]');

    await expect(page.locator('#tierPillText')).toHaveText('Tier 2 Verified');
  });
});

test.describe('Sidebar navigation', () => {
  test('clicking a section link scrolls to it and marks it active', async ({ page }) => {
    await signUp(page);
    // Scoped to the sidebar specifically: the new bottom mobile nav also
    // has a "Rewards" tab (and the Me section has a "Security Center" row),
    // so an unscoped text= selector would now match more than one element.
    await page.click('a.dp-sidebar-link[href="#rewardsHeading"]');
    await expect(page.locator('a.dp-sidebar-link[href="#rewardsHeading"]')).toHaveClass(/active/);
    await expect(page.locator('#rewardsHeading')).toBeInViewport();
  });

  test('Verification/Security/Support links open modals instead of navigating', async ({ page }) => {
    await signUp(page);
    await page.click('a.dp-sidebar-link[data-bs-target="#securityModal"]');
    await expect(page.locator('#securityModal')).toBeVisible();
  });

  test('mobile: no hamburger/off-canvas sidebar — the bottom nav covers navigation instead', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signUp(page);

    // The hamburger toggle was removed: Home/Rewards/Finance/Cards/Me
    // (the bottom nav) plus the Me page's own Security/Support rows now
    // cover everything the off-canvas sidebar used to be needed for.
    await expect(page.locator('#sidebarToggleBtn')).toHaveCount(0);
    await expect(page.locator('.dp-bottom-nav')).toBeVisible();
    await expect(page.locator('#sidebar')).not.toHaveClass(/is-open/);
  });
});
