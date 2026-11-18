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
  test('branch master supports creating a branch under a company', async ({ page }) => {
    await login(page);
    await page.goto('/master');

    await page.getByRole('button', { name: 'Cabang', exact: true }).click();
    await expect(page.getByText('Daftar Cabang')).toBeVisible();
    await page.getByRole('button', { name: 'Tambah Cabang', exact: true }).click();

    const form = page.getByRole('dialog').locator('form');
    await expect(form).toBeVisible();
    const companySelect = form.locator('select').first();
    await expect.poll(() => companySelect.locator('option').count()).toBeGreaterThan(1);
    const companyId = await companySelect.locator('option:not([value=""])').first().getAttribute('value');
    test.skip(!companyId, 'Seed at least one company to exercise branch creation.');

    const suffix = Date.now().toString().slice(-8);
    const code = `E2E-BR-${suffix}`;
    const name = `E2E Branch ${suffix}`;
    await companySelect.selectOption(companyId!);
    await form.locator('input[placeholder="SJ-HO"]').fill(code);
    await form.locator('input[placeholder="Head Office"]').fill(name);
    await form.getByRole('button', { name: 'Simpan Data' }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText(code, { exact: true })).toBeVisible();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  });

});
