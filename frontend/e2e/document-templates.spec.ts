import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

async function login(page: Page, email = 'admin@sentanu.local', password = 'password123') {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
}

test.describe('Sentanu Jaya Document Templates & GrapesJS E2E', () => {
  test('template management workflow: create without auto-open, HTML source edit, save, reload', async ({ page }) => {
    await login(page);

    // Navigate to templates
    const templateNav = page.getByRole('link', { name: /Template Dokumen/i }).first();
    await expect(templateNav).toBeVisible();
    await templateNav.click();
    await expect(page).toHaveURL(/\/templates$/);
    await expect(page.getByText('Manajemen Template & HTML Editor')).toBeVisible();

    // 1. Open upload modal and create template
    const suffix = Date.now();
    const templateName = `Test Invoice E2E ${suffix}`;

    await page.getByRole('button', { name: /\+ Unggah \/ Buat Template/i }).click();
    const modal = page.locator('.fixed.inset-0').first();
    await expect(modal).toBeVisible();

    await modal.locator('input[type="text"]').fill(templateName);
    await modal.locator('select').first().selectOption('invoice');
    await modal.locator('select').nth(1).selectOption('html');
    await modal.locator('textarea').fill('<html><body><h1>Invoice ' + suffix + '</h1><p>{{customer_name}}</p></body></html>');

    await modal.getByRole('button', { name: /Simpan Template/i }).click();

    // Verify user returns to list page and modal is closed (does not auto-open editor)
    await expect(modal).toBeHidden({ timeout: 10000 });
    await expect(page.getByText(templateName)).toBeVisible();
    await expect(page.locator('.fixed.inset-0')).toHaveCount(0); // No editor modal opened automatically

    // 2. Open HTML Source Editor
    const row = page.locator('tr').filter({ hasText: templateName });
    await row.getByRole('button', { name: /HTML Editor/i }).click();

    // Verify HTML editor modal is open
    const editorModal = page.locator('.fixed.inset-0').first();
    await expect(editorModal).toBeVisible();
    await expect(editorModal.getByText('HTML Source Editor')).toBeVisible();

    // Verify sandboxed iframe exists with correct sandbox attribute
    const iframe = editorModal.locator('iframe');
    await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts');

    // Edit content in textarea
    const codeTextarea = editorModal.locator('textarea');
    await codeTextarea.fill('<html><body><h1>Updated Invoice ' + suffix + '</h1><p>{{customer_name}} - Revised</p></body></html>');

    // Save changes
    await editorModal.getByRole('button', { name: /Simpan Perubahan/i }).click();
    await expect(editorModal).toBeHidden({ timeout: 10000 });
    await expect(page.getByText('Template berhasil diperbarui')).toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByText(templateName)).toBeVisible();
  });

  test('GrapesJS visual editor and version history restore', async ({ page }) => {
    await login(page);
    await page.goto('/templates');

    // Create a template for visual editing
    const suffix = Date.now();
    const templateName = `Visual Template ${suffix}`;

    await page.getByRole('button', { name: /\+ Unggah \/ Buat Template/i }).click();
    const modal = page.locator('.fixed.inset-0').first();
    await modal.locator('input[type="text"]').fill(templateName);
    await modal.locator('select').first().selectOption('surat_jalan');
    await modal.locator('select').nth(1).selectOption('html');
    await modal.locator('textarea').fill('<html><body><h2>Surat Jalan ' + suffix + '</h2></body></html>');
    await modal.getByRole('button', { name: /Simpan Template/i }).click();
    await expect(modal).toBeHidden({ timeout: 10000 });

    // Open Visual Editor
    const row = page.locator('tr').filter({ hasText: templateName });
    await row.getByRole('button', { name: /Visual Editor/i }).click();

    // Visual editor header should be visible
    await expect(page.getByText('Visual Drag-and-Drop Editor')).toBeVisible();

    // Save visual template
    await page.getByRole('button', { name: /Simpan Visual Template/i }).click();
    await expect(page.getByText('Template visual dan GrapesJS project berhasil disimpan')).toBeVisible();

    // Close/wait modal to close
    await page.waitForTimeout(1000);
    await page.goto('/templates');

    // Check version history
    const updatedRow = page.locator('tr').filter({ hasText: templateName });
    await updatedRow.getByRole('button', { name: /Riwayat Versi/i }).click();

    const versionModal = page.locator('.fixed.inset-0').first();
    await expect(versionModal).toBeVisible();
    await expect(versionModal.getByText('Riwayat Versi')).toBeVisible();
    await expect(versionModal.getByText('Versi v1')).toBeVisible();

    // Close version modal
    await versionModal.getByRole('button', { name: /Tutup/i }).click();
    await expect(versionModal).toBeHidden();
  });

  test('exclusive activation per document type', async ({ page }) => {
    await login(page);
    await page.goto('/templates');

    // Create two invoice templates
    const suffix = Date.now();
    const t1Name = `Inv Alpha ${suffix}`;
    const t2Name = `Inv Beta ${suffix}`;

    // Create T1
    await page.getByRole('button', { name: /\+ Unggah \/ Buat Template/i }).click();
    let modal = page.locator('.fixed.inset-0').first();
    await modal.locator('input[type="text"]').fill(t1Name);
    await modal.locator('select').first().selectOption('invoice');
    await modal.locator('textarea').fill('<html><body>Inv Alpha</body></html>');
    await modal.getByRole('button', { name: /Simpan Template/i }).click();
    await expect(modal).toBeHidden({ timeout: 10000 });

    // Create T2
    await page.getByRole('button', { name: /\+ Unggah \/ Buat Template/i }).click();
    modal = page.locator('.fixed.inset-0').first();
    await modal.locator('input[type="text"]').fill(t2Name);
    await modal.locator('select').first().selectOption('invoice');
    await modal.locator('textarea').fill('<html><body>Inv Beta</body></html>');
    await modal.getByRole('button', { name: /Simpan Template/i }).click();
    await expect(modal).toBeHidden({ timeout: 10000 });

    // Activate T1
    let row1 = page.locator('tr').filter({ hasText: t1Name });
    await row1.getByRole('button', { name: /Aktifkan/i }).click();
    await page.on('dialog', dialog => dialog.accept());
    await expect(row1.getByText('Aktif')).toBeVisible();

    // Activate T2 - should become active, T1 should become inactive (exclusive)
    let row2 = page.locator('tr').filter({ hasText: t2Name });
    await row2.getByRole('button', { name: /Aktifkan/i }).click();
    await expect(row2.getByText('Aktif')).toBeVisible();
    await expect(row1.getByText('Aktif')).toHaveCount(0);
  });
});
