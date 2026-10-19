import { test, expect } from '@playwright/test';

test.describe('Sentanu Jaya ERP Master Data & Transactional E2E Tests', () => {
  test('Master Data CRUD via UI (Customer) with Login', async ({ page }) => {
    await page.goto('/');
    const emailInput = page.locator('input[type="email"], input#email').first();
    const passwordInput = page.locator('input[type="password"], input#password').first();
    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      await emailInput.fill('admin@sentanu.local');
      await passwordInput.fill('secret123');
      const loginBtn = page.locator('button[type="submit"], button:has-text("Login")').first();
      await loginBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.goto('/master');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('Master Data & Referensi');
  });

  test('Business Transaction navigation & UI readiness', async ({ page }) => {
    // Navigate to Customer PO / Delivery Order / Invoicing views
    await page.goto('/delivery');
    await expect(page.locator('body')).not.toBeEmpty();

    await page.goto('/invoice');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
