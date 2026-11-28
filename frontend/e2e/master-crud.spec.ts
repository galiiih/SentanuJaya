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

  test('master data CSV import blocks invalid rows during preflight', async ({ page }) => {
    await login(page);
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();

    const headers = [
      'company_id','code','name','company_name','billing_address','shipping_address',
      'npwp','tax_condition','default_tax_rule_id','payment_terms_days','credit_limit',
      'phone','email','is_active',
    ];
    const csv = [
      headers.join(','),
      ',,Test Customer,,,,,9,,,0,0,invalid-email,TRUE',
    ].join('\r\n');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'invalid-customers.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf-8'),
    });

    await expect(page.getByText(/code wajib diisi|code is required/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Konfirmasi Import|Confirm Import/i })).toBeDisabled();
  });

  test('master data exports a valid XLSX template and reads XLSX imports', async ({ page }) => {
    await login(page);
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();

    const templateDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: /Template Excel Customer/i }).click();
    const download = await templateDownload;
    expect(download.suggestedFilename()).toBe('sentanu-jaya-customers-template.xlsx');
    const path = await download.path();
    expect(path).toBeTruthy();
    const exported = await (await import('node:fs/promises')).readFile(path!);
    expect(exported.readUInt32LE(0)).toBe(0x04034b50);
    expect(exported.toString('utf8')).toContain('xl/workbook.xml');
    expect(exported.toString('utf8')).toContain('company_name');

    await page.locator('input[type="file"]').setInputFiles(path!);
    await expect(page.getByText(/File harus memiliki header dan minimal satu baris data|File must contain a header and at least one data row/i)).toBeVisible();
  });

    await expect(page.getByText(/code wajib diisi|code is required/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Konfirmasi Import|Confirm Import/i })).toBeDisabled();
  });

});
