import { test, expect } from '@playwright/test';

async function login(page: any) {
  await page.goto('/');
  const emailInput = page.locator('input[type="email"], input#email').first();
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill('admin@sentanu.local');
    await page.locator('input[type="password"], input#password').first().fill('secret123');
    await page.locator('button[type="submit"], button:has-text("Login")').first().click();
    await page.waitForURL('**/', { timeout: 15000 });
  }
}

test.describe('Sentanu Jaya ERP Functional E2E Tests', () => {
  test('app loads and dashboard renders stats or navigation', async ({ page }) => {
    await login(page);
    const branding = page.locator('text=/Sentanu Jaya|SENTANU JAYA|Dashboard/i').first();
    await expect(branding).toBeVisible({ timeout: 10000 });
  });

  test('navigation items can be clicked and navigate correctly', async ({ page }) => {
    await login(page);
    const masterNav = page.locator('a[href="/master"]').first();
    await expect(masterNav).toBeVisible({ timeout: 10000 });
    await masterNav.click();
    await expect(page).toHaveURL(/\/master/);
  });

  test('form inputs accept continuous typing without losing focus', async ({ page }) => {
    await login(page);
    await page.goto('/master');
    const addBtn = page.locator('button').filter({ hasText: /Tambah/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click({ force: true });

    const input = page.locator('input[placeholder="CUST-001"]').first();
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.click();
    
    const testString = 'CUST-TYPING-99';
    for (const char of testString) {
      await page.keyboard.type(char);
      const isFocused = await input.evaluate(el => document.activeElement === el);
      expect(isFocused).toBe(true);
    }
    await expect(input).toHaveValue(testString);
  });
});
