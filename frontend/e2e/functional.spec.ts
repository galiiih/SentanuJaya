import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('admin@sentanu.local');
  await page.locator('#login-password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  // Wait for the actual authenticated redirect, not static branding on the login page.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(page.getByRole('link', { name: /Master Data/i }).first()).toBeVisible({ timeout: 10000 });
}

test.describe('Sentanu Jaya ERP browser E2E', () => {
  test('login and master data navigation work', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /Master Data/i }).first().click();
    await expect(page).toHaveURL(/\/master$/);
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
  });

  test('customer form supports continuous typing, dropdown selection, save, persistence and delete', async ({ page }) => {
    const suffix = Date.now().toString();
    const code = `E2E-${suffix}`;
    const name = `Browser Test Customer ${suffix}`;
    let created = false;

    await login(page);
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
    await page.getByRole('button', { name: /Tambah Customer/i }).click();

    const dialog = page.getByRole('dialog');
    const codeInput = dialog.getByPlaceholder('CUST-001');
    const nameInput = dialog.getByPlaceholder('PT Sentanu Maju');
    const taxSelect = dialog.locator('select').first();

    await expect(codeInput).toBeVisible();
    await expect(nameInput).toBeVisible();
    await expect(taxSelect).toBeVisible();

    // Type through real keyboard events and assert focus/value after every character.
    await codeInput.click();
    for (const char of code) {
      await page.keyboard.type(char);
      await expect(codeInput).toBeFocused();
    }
    await expect(codeInput).toHaveValue(code);

    await nameInput.click();
    for (const char of name) {
      await page.keyboard.type(char);
      await expect(nameInput).toBeFocused();
    }
    await expect(nameInput).toHaveValue(name);

    await taxSelect.selectOption('2');
    await expect(taxSelect).toHaveValue('2');

    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    const row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(name, { timeout: 10000 });
    created = true;

    // Reload to prove persisted server/database state.
    await page.reload();
    const persistedRow = page.locator('tr').filter({ hasText: code });
    await expect(persistedRow).toContainText(name, { timeout: 10000 });

    // Delete via the UI and confirm the destructive action.
    await persistedRow.getByRole('button', { name: 'Hapus' }).click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
    await expect(page.locator('tr').filter({ hasText: code })).toHaveCount(0, { timeout: 10000 });
    created = false;

    // If a future assertion fails after creation, the isolated CI database is discarded with the job.
    if (created) console.error(`E2E test record may remain until CI database teardown: ${code}`);
  });
});
