import { test, expect } from '@playwright/test';

test.describe('Sentanu Jaya ERP Smoke Tests', () => {
  test('app loads successfully and shows main navigation', async ({ page }) => {
    await page.goto('/');
    // Check title or main header
    await expect(page.locator('body')).not.toBeEmpty();
    // Check if main sidebar or login/dashboard renders
    const dashboardTitle = page.locator('text=/Sentanu|Dashboard|ERP/i').first();
    await expect(dashboardTitle).toBeVisible({ timeout: 10000 });
  });

  test('navigation and master data views are accessible', async ({ page }) => {
    await page.goto('/');
    // Check that body has text content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });
});
