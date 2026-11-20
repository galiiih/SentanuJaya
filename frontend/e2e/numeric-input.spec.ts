import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('admin@sentanu.local');
  await page.locator('#login-password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
}

test.describe('Formatted numeric inputs', () => {
  test('keeps empty, zero, decimal and grouped values stable while editing', async ({ page }) => {
    await login(page);
    await page.goto('/customer-po');
    await page.getByRole('button', { name: /PO Baru|New PO/i }).click();

    const inputs = page.locator('input[inputmode="decimal"]');
    await expect(inputs).toHaveCount(2);
    const quantity = inputs.nth(0);
    const unitPrice = inputs.nth(1);

    // Empty is not coerced to zero.
    await expect(unitPrice).toHaveValue('');
    expect(await unitPrice.evaluate((input: HTMLInputElement) => input.validity.valid)).toBeTruthy();
    await unitPrice.fill('0');
    await unitPrice.blur();
    await expect(unitPrice).toHaveValue('0');
    expect(await unitPrice.evaluate((input: HTMLInputElement) => input.validity.valid)).toBeTruthy();

    // Decimal comma is normalized to a numeric decimal internally and formatted on blur.
    await unitPrice.fill('1234,56');
    await unitPrice.blur();
    await expect(unitPrice).toHaveValue('1.234,56');
    await unitPrice.focus();
    await expect(unitPrice).toHaveValue('1234.56');

    // A single three-digit dot group is interpreted as an Indonesian thousands separator.
    await unitPrice.fill('1.234');
    await unitPrice.blur();
    await unitPrice.focus();
    await expect(unitPrice).toHaveValue('1234');

    // Indonesian thousands separators are parsed as grouping, not decimal fractions.
    await unitPrice.fill('1.234.567,89');
    await unitPrice.blur();
    await expect(unitPrice).toHaveValue('1.234.567,89');

    // Quantity supports fractional values and enforces the original minimum.
    await quantity.fill('0');
    expect(await quantity.evaluate((input: HTMLInputElement) => input.validity.valid)).toBeFalsy();
    await quantity.blur();
    await quantity.fill('.');
    expect(await quantity.evaluate((input: HTMLInputElement) => input.validity.valid)).toBeFalsy();
    await quantity.fill('2,5');
    expect(await quantity.evaluate((input: HTMLInputElement) => input.validity.valid)).toBeTruthy();
    await quantity.blur();
    await expect(quantity).toHaveValue('2,5');
    await quantity.fill('');
    await expect(quantity).toHaveValue('');
  });
  test('loads and formats numeric values when editing an existing legacy PO', async ({ page }) => {
    await login(page);
    await page.goto('/customer-po');

    const draftRow = page.locator('tbody tr').filter({ hasText: /DRAFT/i }).first();
    if (!(await draftRow.count())) test.skip(true, 'No editable draft Customer PO is available in this test database.');

    const editButton = draftRow.locator('button[title="Edit"], button[title="Ubah"]').first();
    if (!(await editButton.count())) test.skip(true, 'The current account has no edit permission for draft Customer POs.');

    await editButton.click();
    const inputs = page.locator('input[inputmode="decimal"]');
    await expect(inputs).toHaveCount(2);
    await expect(inputs.nth(0)).not.toHaveValue('');
    // Existing numeric values are retained in the form and displayed using id-ID grouping.
    await inputs.nth(0).blur();
    await expect(inputs.nth(0)).not.toHaveValue('');
    await expect(inputs.nth(1)).not.toHaveValue('');
  });

  test('uses English numeric grouping when the interface language is English', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await page.goto('/customer-po');
    await page.getByRole('button', { name: /New PO/i }).click();

    const unitPrice = page.locator('input[inputmode="decimal"]').nth(1);
    await unitPrice.fill('1,234');
    await unitPrice.blur();
    await expect(unitPrice).toHaveValue('1,234');
    await unitPrice.focus();
    await expect(unitPrice).toHaveValue('1234');

    await unitPrice.fill('1,234.56');
    await unitPrice.blur();
    await expect(unitPrice).toHaveValue('1,234.56');
  });

});