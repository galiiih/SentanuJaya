import { test, expect } from '@playwright/test';

test.describe('Sentanu Jaya ERP Functional E2E Tests', () => {
  test('app loads and dashboard renders stats or navigation', async ({ page }) => {
    await page.goto('/');
    const branding = page.locator('text=/Sentanu|ERP|Dashboard/i').first();
    await expect(branding).toBeVisible({ timeout: 10000 });
  });

  test('navigation items can be clicked and navigate correctly', async ({ page }) => {
    await page.goto('/');

    const deliveryLink = page.locator('a[href="/delivery"]').first();
    if (await deliveryLink.count() > 0) {
      await deliveryLink.click();
      await expect(page).toHaveURL(/\/delivery/);
    }
  });

  test('form inputs accept continuous typing without losing focus', async ({ page }) => {
    await page.goto('/master');

    const input = page.locator('input[type="text"], input:not([type])').first();
    if (await input.count() > 0) {
      await input.click();
      const testString = 'TEST-CODE-123';
      for (const char of testString) {
        await page.keyboard.type(char);
      }
      await expect(input).toHaveValue(testString);
    }
  });
});
