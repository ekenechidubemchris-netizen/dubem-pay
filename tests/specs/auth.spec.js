// @ts-check
const { test, expect } = require('@playwright/test');
const { signUp } = require('./helpers');

test.describe('Authentication', () => {
  test('sign up creates an account and reveals the dashboard', async ({ page }) => {
    await signUp(page, 'Chidubem Eke');
    await expect(page.locator('#greetingText')).toContainText('Welcome back, Chidubem');
    await expect(page.locator('#navAvatar')).toHaveText('CE');
  });

  test('rejects a signup password under 8 characters', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-auth-tab="signup"]');
    await page.fill('#signupName', 'Weak Pass');
    await page.fill('#signupEmail', `weak-${Date.now()}@example.com`);
    await page.fill('#signupPassword', '123');
    await page.fill('#signupConfirm', '123');
    await page.click('#signupForm button[type=submit]');

    await expect(page.locator('#signupError')).toContainText('at least 8 characters');
    await expect(page.locator('#appShell')).toBeHidden();
  });

  test('rejects mismatched passwords on signup', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-auth-tab="signup"]');
    await page.fill('#signupName', 'Mismatch Test');
    await page.fill('#signupEmail', `mismatch-${Date.now()}@example.com`);
    await page.fill('#signupPassword', 'FirstPass123');
    await page.fill('#signupConfirm', 'SecondPass123');
    await page.click('#signupForm button[type=submit]');

    await expect(page.locator('#signupError')).toContainText("don't match");
  });

  test('rejects a duplicate email on signup', async ({ page }) => {
    const email = `dup-${Date.now()}@example.com`;
    await page.goto('/');
    await page.click('[data-auth-tab="signup"]');
    await page.fill('#signupName', 'First Signup');
    await page.fill('#signupEmail', email);
    await page.fill('#signupPassword', 'FirstPass123');
    await page.fill('#signupConfirm', 'FirstPass123');
    await page.click('#signupForm button[type=submit]');
    await expect(page.locator('#appShell')).toBeVisible();

    await page.click('.js-logout');
    await expect(page.locator('#authScreen')).toBeVisible();

    await page.click('[data-auth-tab="signup"]');
    await page.fill('#signupName', 'Second Signup');
    await page.fill('#signupEmail', email);
    await page.fill('#signupPassword', 'SecondPass123');
    await page.fill('#signupConfirm', 'SecondPass123');
    await page.click('#signupForm button[type=submit]');

    await expect(page.locator('#signupError')).toContainText('already exists');
  });

  test('logging in with the wrong password shows an error', async ({ page }) => {
    const email = `wrongpass-${Date.now()}@example.com`;
    await page.goto('/');
    await page.click('[data-auth-tab="signup"]');
    await page.fill('#signupName', 'Wrong Pass');
    await page.fill('#signupEmail', email);
    await page.fill('#signupPassword', 'CorrectPass123');
    await page.fill('#signupConfirm', 'CorrectPass123');
    await page.click('#signupForm button[type=submit]');
    await page.click('.js-logout');

    await page.fill('#loginEmail', email);
    await page.fill('#loginPassword', 'WrongPassword');
    await page.click('#loginForm button[type=submit]');

    await expect(page.locator('#loginError')).toContainText('Incorrect password');
    await expect(page.locator('#appShell')).toBeHidden();
  });

  test('logging in with an unknown email shows an error', async ({ page }) => {
    await page.goto('/');
    await page.fill('#loginEmail', `nobody-${Date.now()}@example.com`);
    await page.fill('#loginPassword', 'WhateverPass123');
    await page.click('#loginForm button[type=submit]');

    await expect(page.locator('#loginError')).toContainText('No account found');
  });

  test('logout returns to the Auth screen and clears the session', async ({ page }) => {
    await signUp(page);
    await page.click('.js-logout');

    await expect(page.locator('#authScreen')).toBeVisible();
    await expect(page.locator('#appShell')).toBeHidden();

    // Reloading should NOT silently log back in
    await page.reload();
    await expect(page.locator('#authScreen')).toBeVisible();
  });

  test('session persists across a page reload without logging out', async ({ page }) => {
    await signUp(page, 'Persist Test');
    await page.reload();

    await expect(page.locator('#appShell')).toBeVisible();
    await expect(page.locator('#greetingText')).toContainText('Persist');
  });
});
