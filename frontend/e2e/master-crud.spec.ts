import { test, expect } from '@playwright/test';

test.describe('Sentanu Jaya ERP Definitive Customer CRUD & Auth E2E', () => {
  const uniqueName = `Customer Test ${Date.now()}`;
  const uniqueCode = `CUST-${Date.now()}`;
  const updatedName = `${uniqueName} Updated`;

  test('1. Authentication, Full Customer CRUD, Persistence and Cleanup', async ({ page }) => {
    // 1. Login
    await page.goto('/');
    
    const emailInput = page.locator('input[type="email"], input#email').first();
    const passwordInput = page.locator('input[type="password"], input#password').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    await emailInput.fill('admin@sentanu.local');
    await passwordInput.fill('secret123');
    
    const loginBtn = page.locator('button[type="submit"], button:has-text("Login")').first();
    await expect(loginBtn).toBeVisible();
    await loginBtn.click();

    // Verify successful login & dashboard redirect
    await page.waitForURL('**/', { timeout: 15000 });
    const welcomeHeader = page.locator('text=/Dashboard|Selamat Datang|Sentanu Jaya/i').first();
    await expect(welcomeHeader).toBeVisible({ timeout: 10000 });

    // 2. Navigate to Master Data / Customer Management view
    const masterNav = page.locator('a[href="/master"], button:has-text("Master"), text=/Master Data/i').first();
    await expect(masterNav).toBeVisible();
    await masterNav.click();

    // Ensure customer section/tab is active
    const customerTab = page.locator('text=/Customer|Pelanggan/i').first();
    if (await customerTab.count() > 0) {
      await customerTab.click();
    }

    // 3. Create unique customer record
    const addBtn = page.locator('button:has-text("Tambah"), button:has-text("New"), button:has-text("Create")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const nameField = page.locator('input[name="name"], input#name').first();
    const codeField = page.locator('input[name="code"], input#code').first();
    
    await expect(nameField).toBeVisible();
    await expect(codeField).toBeVisible();

    await nameField.fill(uniqueName);
    await codeField.fill(uniqueCode);

    const saveBtn = page.locator('button[type="submit"], button:has-text("Simpan"), button:has-text("Save")').first();
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // 4. Verify record appears in list
    await page.waitForTimeout(2000);
    const createdRow = page.locator(`text=${uniqueCode}`).first();
    await expect(createdRow).toBeVisible({ timeout: 10000 });

    // 5. Reload and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    const persistedRow = page.locator(`text=${uniqueCode}`).first();
    await expect(persistedRow).toBeVisible({ timeout: 10000 });

    // 6. Edit record (strict assertion, no conditional skipping)
    const editBtn = page.locator(`tr:has-text("${uniqueCode}") button:has-text("Edit"), tr:has-text("${uniqueCode}") [aria-label*="Edit"]`).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await nameField.fill(updatedName);
    await saveBtn.click();
    await page.waitForTimeout(2000);
    const updatedRow = page.locator(`text=${updatedName}`).first();
    await expect(updatedRow).toBeVisible({ timeout: 10000 });

    // 7. Delete record and verify removal (strict assertion, no conditional skipping)
    const deleteBtn = page.locator(`tr:has-text("${updatedName}") button:has-text("Hapus"), tr:has-text("${updatedName}") button:has-text("Delete"), tr:has-text("${updatedName}") [aria-label*="Delete"]`).first();
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    page.on('dialog', dialog => dialog.accept());
    await deleteBtn.click();
    await page.waitForTimeout(2000);
    const deletedRow = page.locator(`text=${updatedName}`);
    await expect(deletedRow).toHaveCount(0);
  });

  test('2. Negative assertion / False-positive check for missing elements', async ({ page }) => {
    await page.goto('/');
    const missingElement = page.locator('id=non-existent-element-xyz');
    await expect(missingElement).toHaveCount(0);
  });
});
