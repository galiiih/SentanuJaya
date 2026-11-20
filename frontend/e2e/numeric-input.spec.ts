import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('admin@sentanu.local');
  await page.locator('#login-password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\\/dashboard$/, { timeout: 15000 });
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
    await unitPrice.fill('0');
    await unitPrice.blur();
    await expect(unitPrice).toHaveValue('0');

    // Decimal comma is normalized to a numeric decimal internally and formatted on blur.
    await unitPrice.fill('1234,56');
    await unitPrice.blur();
    await expect(unitPrice).toHaveValue('1.234,56');
    await unitPrice.focus();
    await expect(unitPrice).toHaveValue('1234.56');

    // Indonesian thousands separators are parsed as grouping, not decimal fractions.
    await unitPrice.fill('1.234.567,89');
    await unitPrice.blur();
    await expect(unitPrice).toHaveValue('1.234.567,89');

    // Quantity supports fractional values and remains independently controlled.
    await quantity.fill('2,5');
    await quantity.blur();
    await expect(quantity).toHaveValue('2,5');
    await quantity.fill('');
    await expect(quantity).toHaveValue('');
  });
});
