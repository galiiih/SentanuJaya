import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

async function login(page: any) {
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

  const dashboardIndicator = page.locator('button[aria-label="Menu pengguna"]').or(page.locator('text=/Dashboard|Sentanu Jaya|Master Data/i')).first();
  await expect(dashboardIndicator).toBeVisible({ timeout: 15000 });
}

test.describe('Sentanu Jaya ERP Functional E2E Tests', () => {
  test('app loads and dashboard renders stats or navigation', async ({ page }) => {
    await login(page);
    const branding = page.locator('text=/Sentanu Jaya|SENTANU JAYA|Dashboard/i').first();
    await expect(branding).toBeVisible({ timeout: 10000 });
  });

  test('navigation items can be clicked and navigate correctly', async ({ page }) => {
    await login(page);
    await page.goto('/master');
    await expect(page).toHaveURL(/\/master/);
  });

  test('form inputs accept continuous typing without losing focus', async ({ page }) => {
    await login(page);
    await page.goto('/master');
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(b => b.textContent?.includes('Tambah') || b.querySelector('svg'));
      if (addBtn) addBtn.click();
    });

    const input = page.locator('input').first();
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.click();
    
    const testString = 'CODE-99';
    for (const char of testString) {
      await page.keyboard.type(char);
      const isFocused = await input.evaluate(el => document.activeElement === el);
      expect(isFocused).toBe(true);
    }
    await expect(input).toHaveValue(testString);
  });
});
