import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('admin@sentanu.local');
  await page.locator('#login-password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
}

test.describe('Sentanu Jaya ERP Smoke Tests', () => {
  test('login page loads and accepts credentials', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Masuk ke Sentanu Jaya ERP' })).toBeVisible();
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
  });

  test('authenticated user can navigate to master data', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /Master Data/i }).first().click();
    await expect(page).toHaveURL(/\/master$/);
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
  });
});
