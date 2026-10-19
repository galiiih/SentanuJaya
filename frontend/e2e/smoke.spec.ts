import { test, expect } from '@playwright/test';

test.describe('Sentanu Jaya ERP Smoke Tests', () => {
  test('app loads successfully and shows main navigation', async ({ page }) => {
    await page.goto('/');
    const dashboardTitle = page.locator('text=/Sentanu Jaya ERP|SENTANU JAYA/i').first();
    await expect(dashboardTitle).toBeVisible({ timeout: 10000 });
  });

  test('navigation and master data views are accessible', async ({ page }) => {
    await page.goto('/master');
    const masterHeader = page.locator('text=/Master Data/i').first();
    await expect(masterHeader).toBeVisible({ timeout: 10000 });
  });
});
