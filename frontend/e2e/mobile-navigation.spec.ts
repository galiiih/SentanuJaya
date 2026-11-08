import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('admin@sentanu.local');
  await page.locator('#login-password').fill('password123');
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/v1/auth/login') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Login' }).click();
  const response = await responsePromise;
  expect(response.ok(), `Login failed with HTTP ${response.status()}`).toBeTruthy();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
}

test.describe('Mobile navigation drawer', () => {
  test('opens from the header and closes with Escape', async ({ page }) => {
    await loginAsAdmin(page);

    const sidebar = page.locator('aside.sidebar');
    const trigger = page.getByRole('button', { name: 'Buka navigasi' });
    await expect(trigger).toBeVisible();
    await expect(sidebar).toBeHidden();

    await trigger.click();
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Master Data' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(sidebar).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('closes after selecting a navigation link', async ({ page }) => {
    await loginAsAdmin(page);

    const sidebar = page.locator('aside.sidebar');
    await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await expect(sidebar).toBeVisible();

    await sidebar.getByRole('link', { name: 'Master Data' }).click();
    await expect(page).toHaveURL(/\/master$/);
    await expect(sidebar).toBeHidden();
  });

  test('keeps full labels when viewport changes from desktop-collapsed to mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsAdmin(page);

    const sidebar = page.locator('aside.sidebar');
    await sidebar.getByRole('button', { name: 'Ciutkan sidebar' }).click();
    await expect(sidebar).toHaveClass(/sidebar--collapsed/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Master Data' })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: 'Ciutkan sidebar' })).toBeHidden();
  });
});
