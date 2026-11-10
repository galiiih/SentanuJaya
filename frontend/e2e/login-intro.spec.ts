import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
const user = { id: 1, name: 'Admin Test', email: 'admin@sentanu.local', role: 'ADMIN' };

async function mockApi(page: Page) {
  let loggedIn = false;
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api\/v1/, '');
    const reply = (status: number, data: unknown, success = true) => route.fulfill({
      status, contentType: 'application/json',
      body: JSON.stringify({ success, message: success ? 'OK' : 'Unauthenticated', data }),
    });
    if (path === '/auth/login') { loggedIn = true; return reply(200, user); }
    if (path === '/auth/logout') { loggedIn = false; return reply(200, []); }
    if (path === '/auth/me') return loggedIn ? reply(200, user) : reply(401, null, false);
    return reply(200, []);
  });
}

async function submitLogin(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill(user.email);
  await page.locator('#login-password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
}

test.describe('isolated login intro and sidebar', () => {
  test.beforeEach(async ({ page }) => { await mockApi(page); });

  test('plays after successful login and hands over to the dashboard', async ({ page }) => {
    await submitLogin(page);
    const intro = page.getByTestId('login-intro');
    await expect(intro).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lewati animasi pembuka' })).toBeVisible();
    await expect(intro).toHaveClass(/login-intro--wave/, { timeout: 6000 });
    await expect(intro).toBeHidden({ timeout: 4000 });
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('aside.sidebar').first()).toBeVisible();
    await expect(page.locator('.app-shell')).not.toHaveClass(/app-shell--intro/);
  });

  test('mobile intro targets the existing mobile menu trigger', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await submitLogin(page);
    const intro = page.getByTestId('login-intro');
    await expect(intro).toBeVisible();
    await expect(page.locator('.menu-button')).toBeVisible();
    await expect(intro).toHaveClass(/login-intro--mobile/, { timeout: 6000 });
    // The mobile class is applied in the same render that publishes the
    // measured target. The fly phase is brief and may already have advanced
    // to wave on slower CI workers, so do not require observing that transient phase.
    const geometry = await intro.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        dx: Number.parseFloat(style.getPropertyValue('--intro-dx')),
        dy: Number.parseFloat(style.getPropertyValue('--intro-dy')),
        dxStyle: style.getPropertyValue('--intro-dx').trim(),
        dyStyle: style.getPropertyValue('--intro-dy').trim(),
        inlineDx: (element as HTMLElement).style.getPropertyValue('--intro-dx').trim(),
        inlineDy: (element as HTMLElement).style.getPropertyValue('--intro-dy').trim(),
        styleAttribute: element.getAttribute('style'),
      };
    });
    console.log('Mobile intro geometry:', JSON.stringify(geometry));
    expect(Number.isFinite(geometry.dx), JSON.stringify(geometry)).toBeTruthy();
    expect(Number.isFinite(geometry.dy), JSON.stringify(geometry)).toBeTruthy();
    expect(geometry.dxStyle).toMatch(/^-?\d+(?:\.\d+)?px$/);
    expect(geometry.dyStyle).toMatch(/^-?\d+(?:\.\d+)?px$/);
    await expect(intro).toHaveClass(/login-intro--wave/, { timeout: 1500 });
    await expect(intro).toBeHidden({ timeout: 4000 });
  });

  test('desktop sidebar collapses and expands with accessible labels', async ({ page }) => {
    await submitLogin(page);
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 6000 });
    const sidebar = page.locator('#main-sidebar-navigation');
    await expect(sidebar).toBeVisible();
    await page.getByRole('button', { name: 'Ciutkan sidebar' }).click();
    await expect(sidebar).toHaveClass(/sidebar--collapsed/);
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    await expect(dashboardLink).toHaveAttribute('aria-label', 'Dashboard');
    await expect(dashboardLink).toHaveAttribute('title', 'Dashboard');
    await page.getByRole('button', { name: 'Perlebar sidebar' }).click();
    await expect(sidebar).not.toHaveClass(/sidebar--collapsed/);
  });

  test('card entrance animation is disabled during reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await submitLogin(page);
    await expect(page.getByTestId('login-intro')).toHaveCount(0);
    const names = await page.locator('.kpi-grid > .kpi-card').evaluateAll((cards) => cards.map((card) => getComputedStyle(card).animationName));
    expect(names.every((name) => name === 'none')).toBeTruthy();
  });

  test('card entrance animations are applied after intro completes', async ({ page }) => {
    await submitLogin(page);
    await page.getByRole('button', { name: 'Lewati animasi pembuka' }).click();
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 1500 });
    const names = await page.locator('.kpi-grid > .kpi-card').evaluateAll((cards) => cards.map((card) => getComputedStyle(card).animationName));
    expect(names).toEqual(['sj-rise', 'sj-flip', 'sj-zoom', 'sj-slide-right']);
  });
});
