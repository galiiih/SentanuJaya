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
    const nameInput = dialog.getByPlaceholder('PT Sentanu Maju').first();
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

  test('UOM master supports keyboard input, create, edit, persistence and delete', async ({ page }) => {
    const suffix = Date.now().toString();
    const code = `E2E-UOM-${suffix}`;
    const name = `Unit Test ${suffix}`;
    const editedName = `Unit Edited ${suffix}`;

    await login(page);
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
    await page.getByRole('button', { name: /Satuan \(UOM\)/i }).click();
    await expect(page.getByText('Daftar Satuan (UOM)')).toBeVisible();
    await page.getByRole('button', { name: /Tambah Satuan \(UOM\)/i }).click();

    const dialog = page.getByRole('dialog');
    const codeInput = dialog.getByPlaceholder('PCS');
    const nameInput = dialog.getByPlaceholder('Pieces / Buah');
    const categoryInput = dialog.getByPlaceholder('GENERAL / QUANTITY / WEIGHT');

    await expect(codeInput).toBeVisible();
    await codeInput.click();
    for (const char of code) {
      await page.keyboard.type(char);
      await expect(codeInput).toBeFocused();
    }
    await nameInput.click();
    for (const char of name) {
      await page.keyboard.type(char);
      await expect(nameInput).toBeFocused();
    }
    await categoryInput.fill('GENERAL');
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();

    let row = page.locator('tr').filter({ hasText: code });
    await expect(dialog).toBeHidden();
    await expect(row).toContainText(name, { timeout: 10000 });

    await page.reload();
    await page.getByRole('button', { name: /Satuan \(UOM\)/i }).click();
    row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(name, { timeout: 10000 });

    await row.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog');
    const editName = editDialog.getByPlaceholder('Pieces / Buah');
    await editName.fill(editedName);
    await editDialog.getByRole('button', { name: /Simpan Data/i }).click();
    row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(editedName, { timeout: 10000 });

    await row.getByRole('button', { name: 'Hapus' }).click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
    await expect(page.locator('tr').filter({ hasText: code })).toHaveCount(0, { timeout: 10000 });
  });


  test('Supplier master supports continuous typing, create, edit, persistence and delete', async ({ page }) => {
    const suffix = Date.now().toString();
    const code = `E2E-SUP-${suffix}`;
    const name = `Browser Supplier ${suffix}`;
    const editedName = `Edited Supplier ${suffix}`;

    await login(page);
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
    await page.getByRole('button', { name: /^Supplier$/i }).click();
    await expect(page.getByText('Daftar Supplier')).toBeVisible();
    await page.getByRole('button', { name: /Tambah Supplier/i }).click();

    const dialog = page.getByRole('dialog');
    const codeInput = dialog.getByPlaceholder('SUP-001');
    const nameInput = dialog.getByPlaceholder('PT Warna Abadi Kimia');

    await expect(codeInput).toBeVisible();
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

    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    let row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(name, { timeout: 10000 });

    await page.reload();
    await page.getByRole('button', { name: /^Supplier$/i }).click();
    row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(name, { timeout: 10000 });

    // Some master tables render icon-only action controls. Locate the row actions
    // by their accessible labels first, then fall back to title/aria-label metadata.
    const editButton = row.locator('button[aria-label="Edit"], button[title="Edit"]').first();
    if (await editButton.count()) {
      await editButton.click();
      const editDialog = page.getByRole('dialog');
      const editNameInput = editDialog.getByPlaceholder('PT Warna Abadi Kimia');
      await editNameInput.fill(editedName);
      await editDialog.getByRole('button', { name: /Simpan Data/i }).click();
      row = page.locator('tr').filter({ hasText: code });
      await expect(row).toContainText(editedName, { timeout: 10000 });
    } else {
      // If the supplier table has no edit action, fail with a precise UI diagnostic.
      throw new Error('Supplier row is persisted, but no Edit button with accessible name or title was rendered.');
    }

    await row.getByRole('button', { name: 'Hapus' }).click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
    await expect(page.locator('tr').filter({ hasText: code })).toHaveCount(0, { timeout: 10000 });
  });

});
