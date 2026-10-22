import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

async function login(page: Page) {
  await page.goto('/');
  await page.locator('input[type="email"], input#email').first().fill('admin@sentanu.local');
  await page.locator('input[type="password"], input#password').first().fill('password123');
  await page.locator('button[type="submit"], button:has-text("Login")').first().click();
  await expect(page.locator('button[aria-label="Menu pengguna"]').or(page.getByText(/Dashboard|Sentanu Jaya|Master Data/i).first()).first()).toBeVisible({ timeout: 15000 });
}

test.describe('Sentanu Jaya ERP browser E2E', () => {
  test('login and main navigation work', async ({ page }) => {
    await login(page);
    await page.goto('/master');
    await expect(page).toHaveURL(/\/master/);
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
  });

  test('customer form supports continuous typing, tax dropdown, save and persisted read-back', async ({ page }) => {
    const suffix = Date.now().toString();
    const code = `E2E-${suffix}`;
    const name = `Browser Test Customer ${suffix}`;
    let created = false;

    try {
      await login(page);
      await page.goto('/master');
      await page.getByRole('button', { name: /Tambah Customer/i }).click();

      const codeInput = page.getByPlaceholder('CUST-001');
      const nameInput = page.getByPlaceholder('PT Sentanu Maju');
      const taxSelect = page.locator('select').first();

      await expect(codeInput).toBeVisible();
      await expect(nameInput).toBeVisible();
      await expect(taxSelect).toBeVisible();

      // Real keyboard interaction: each character must remain in the same focused field.
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

      // Exercise a real dropdown selection and verify controlled state remains selected.
      await taxSelect.selectOption('2');
      await expect(taxSelect).toHaveValue('2');

      await page.getByRole('button', { name: /Simpan|Save/i }).click();
      await expect(page.getByText(code, { exact: true })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
      created = true;

      // Reload proves the record was persisted by the API/database, not just React state.
      await page.reload();
      await expect(page.getByText(code, { exact: true })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });

      // Cleanup test data using the UI so the test remains repeatable.
      const row = page.locator('tr').filter({ hasText: code });
      await row.getByRole('button', { name: /Hapus|Delete/i }).click();
      const confirmButton = page.getByRole('button', { name: /Ya, Hapus|Konfirmasi|Hapus|Delete/i }).last();
      await expect(confirmButton).toBeVisible({ timeout: 5000 });
      await confirmButton.click();
      await expect(page.getByText(code, { exact: true })).toHaveCount(0, { timeout: 10000 });
      created = false;
    } finally {
      // Do not hide test failures; report possible residue for manual cleanup.
      if (created) console.error(`E2E cleanup may be required for customer ${code}`);
    }
  });
});
