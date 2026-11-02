import { test, expect, type Page } from '@playwright/test';

async function loginAs(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
}

const STAFF_EMAIL = 'agus@sentanu.local';
const ADMIN_EMAIL = 'admin@sentanu.local';

test.describe('STAFF — Nanu Knowledge', () => {
  test('STAFF can see Puffy/Nanu chat panel exists', async ({ page }) => {
    await loginAs(page, STAFF_EMAIL);
    const puffyPanel = page.locator('[class*="puffy-panel"], [aria-label*="Nanu"]').first();
    await expect(puffyPanel).toBeAttached({ timeout: 10000 });
  });

  test('STAFF cannot see Review Kandidat tab on /knowledge', async ({ page }) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto('/knowledge');
    await page.waitForTimeout(2000);
    const reviewTab = page.locator('button:has-text("Review Kandidat")');
    await expect(reviewTab).not.toBeVisible();
  });

  test('STAFF direct API review returns 401 or 403', async ({ page, request }) => {
    await loginAs(page, STAFF_EMAIL);
    const cookies = await page.context().cookies();
    const xsrf = cookies.find(c => c.name === 'XSRF-TOKEN');
    const resp = await request.post('http://127.0.0.1:8000/api/v1/nanu/candidates/fake-id/review', {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf.value) } : {}),
      },
      data: { status: 'approved' },
    });
    expect([401, 403]).toContain(resp.status());
  });
});

test.describe('ADMIN — Knowledge Management', () => {
  test('ADMIN can open /knowledge page', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto('/knowledge');
    await page.waitForTimeout(2000);
    const heading = page.locator('h1, h2, [class*="title"]').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('ADMIN can see both Knowledge tabs', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto('/knowledge');
    const officialTab = page.locator('button:has-text("Official Knowledge")').first();
    await expect(officialTab).toBeVisible({ timeout: 10000 });
    const candidatesTab = page.locator('button:has-text("Review Kandidat")').first();
    await expect(candidatesTab).toBeVisible({ timeout: 10000 });
  });

  test('ADMIN sidebar has Knowledge nav link', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
    const knowledgeLink = page.locator('a[href="/knowledge"]').first();
    await expect(knowledgeLink).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Knowledge page UI', () => {
  test('no uncaught exceptions on /knowledge', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));
    await loginAs(page, ADMIN_EMAIL);
    await page.goto('/knowledge');
    await page.waitForTimeout(3000);
    expect(pageErrors).toEqual([]);
  });
});

test.describe('Regression — ERP navigation intact', () => {
  test('dashboard still loads', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
    await expect(page.locator('[class*="dashboard"], h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('sidebar master data link still visible', async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL);
    await expect(page.locator('a[href="/master"]').first()).toBeVisible({ timeout: 10000 });
  });
});
