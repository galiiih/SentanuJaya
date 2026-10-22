import { test, expect, type Page } from '@playwright/test';

// Focused auth + customer-list smoke coverage. The full keyboard/create/persist/delete
// interaction is exercised in functional.spec.ts to avoid duplicate records and brittle legacy selectors.
async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('admin@sentanu.local');
  await page.locator('#login-password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
}

test.describe('Sentanu Jaya ERP customer master E2E', () => {
  test('customer master view loads for authenticated admin', async ({ page }) => {
    await login(page);
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
    await expect(page.getByRole('button', { name: /Tambah Customer/i })).toBeVisible();
    await expect(page.getByText('Daftar Customer')).toBeVisible();
  });
});
