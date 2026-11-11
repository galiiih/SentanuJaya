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

test.describe('login intro animation', () => {
  test.beforeEach(async ({ page }) => { await mockApi(page); });

  test('plays after login, then hands over to the app with the sidebar visible', async ({ page }) => {
    await submitLogin(page);
    const intro = page.getByTestId('login-intro');
    await expect(intro).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lewati animasi pembuka' })).toBeVisible();
    // Assert the transition itself so a regression reports whether the intro
    // stalled before the wave instead of only timing out on final dismissal.
    // The full browser suite can contend for CPU while the logo animation is running.
    await expect(intro).toHaveClass(/login-intro--wave/, { timeout: 12000 });
    await expect(intro).toBeHidden({ timeout: 4000 });
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('aside.sidebar')).toBeVisible();
    await expect(page.locator('.app-shell')).not.toHaveClass(/app-shell--intro/);
  });

  test('flies the intro logo toward the mobile navigation trigger on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await submitLogin(page);
    const intro = page.getByTestId('login-intro');
    await expect(intro).toBeVisible();
    await expect(page.locator('.sidebar-mobile-trigger')).toBeVisible();
    await expect(intro).toHaveClass(/login-intro--mobile/, { timeout: 6000 });
    await expect(intro).toHaveClass(/login-intro--fly|login-intro--wave/, { timeout: 6000 });
    const dx = await intro.evaluate((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue('--intro-dx')));
    expect(Number.isFinite(dx)).toBeTruthy();
    expect(Math.abs(dx)).toBeGreaterThan(20);
    await expect(intro).toHaveClass(/login-intro--wave/, { timeout: 6000 });
    await expect(intro).toBeHidden({ timeout: 4000 });
    await expect(page.locator('.sidebar-mobile-trigger')).toBeVisible();
  });

  test('mobile navigation drawer opens and closes with Escape and backdrop', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await submitLogin(page);
    await page.getByRole('button', { name: 'Lewati animasi pembuka' }).click();
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 1500 });

    const trigger = page.getByRole('button', { name: 'Buka navigasi' });
    const sidebar = page.locator('#main-sidebar-navigation');
    const backdrop = page.getByRole('button', { name: 'Tutup navigasi' });

    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(sidebar).toHaveClass(/sidebar--mobile-open/);
    await expect(backdrop).toHaveClass(/sidebar-mobile-overlay--visible/);

    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(sidebar).not.toHaveClass(/sidebar--mobile-open/);

    await trigger.click();
    await expect(sidebar).toHaveClass(/sidebar--mobile-open/);
    await backdrop.click({ position: { x: 350, y: 420 } });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(sidebar).not.toHaveClass(/sidebar--mobile-open/);
  });

  test('desktop sidebar collapses and expands without losing accessible navigation labels', async ({ page }) => {
    await submitLogin(page);
    await page.getByRole('button', { name: 'Lewati animasi pembuka' }).click();
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 1500 });

    const sidebar = page.locator('#main-sidebar-navigation');
    const collapse = page.getByRole('button', { name: 'Ciutkan sidebar' });
    await expect(sidebar).toBeVisible();
    await collapse.click();

    await expect(sidebar).toHaveClass(/sidebar--collapsed/);
    await expect(page.getByRole('button', { name: 'Perlebar sidebar' })).toHaveAttribute('aria-expanded', 'false');
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute('aria-label', 'Dashboard');
    await expect(dashboardLink).toHaveAttribute('title', 'Dashboard');

    await page.getByRole('button', { name: 'Perlebar sidebar' }).click();
    await expect(sidebar).not.toHaveClass(/sidebar--collapsed/);
    await expect(page.getByRole('button', { name: 'Ciutkan sidebar' })).toHaveAttribute('aria-expanded', 'true');
  });

  test('switches cleanly at the mobile drawer breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 900 });
    await submitLogin(page);
    await page.getByRole('button', { name: 'Lewati animasi pembuka' }).click();
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 1500 });

    const trigger = page.getByRole('button', { name: 'Buka navigasi' });
    const sidebar = page.locator('#main-sidebar-navigation');
    await expect(trigger).toBeVisible();
    await expect(sidebar).toBeHidden();

    await page.setViewportSize({ width: 761, height: 900 });
    await expect(trigger).toBeHidden();
    await expect(sidebar).toBeVisible();
    await expect(sidebar).not.toHaveClass(/sidebar--mobile-open/);
  });

  test('can be skipped with the skip button', async ({ page }) => {
    await submitLogin(page);
    await page.getByRole('button', { name: 'Lewati animasi pembuka' }).click();
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 1500 });
    await expect(page.locator('aside.sidebar')).toBeVisible();
  });

  test('can be skipped with Escape', async ({ page }) => {
    await submitLogin(page);
    await expect(page.getByTestId('login-intro')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 1500 });
  });

  test('does not replay on reload of an existing session', async ({ page }) => {
    await submitLogin(page);
    await page.getByRole('button', { name: 'Lewati animasi pembuka' }).click();
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 1500 });
    await page.reload();
    await expect(page.locator('aside.sidebar')).toBeVisible();
    await expect(page.getByTestId('login-intro')).toHaveCount(0);
  });

  test('plays again on every login', async ({ page }) => {
    await submitLogin(page);
    await page.getByRole('button', { name: 'Lewati animasi pembuka' }).click();
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 1500 });
    await page.getByRole('button', { name: 'Menu pengguna' }).click();
    await page.getByRole('menuitem', { name: 'Keluar' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await submitLogin(page);
    await expect(page.getByTestId('login-intro')).toBeVisible();
  });

  test('card entrance animations are applied to dashboard cards after the intro', async ({ page }) => {
    await submitLogin(page);
    await page.getByRole('button', { name: 'Lewati animasi pembuka' }).click();
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 1500 });
    const names = await page.locator('.kpi-grid > .kpi-card').evaluateAll((cards) => cards.map((card) => getComputedStyle(card).animationName));
    expect(names).toEqual(['sj-rise', 'sj-flip', 'sj-zoom', 'sj-slide-right']);
  });
});

test.describe('login intro with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('is skipped entirely and the app shows immediately', async ({ page }) => {
    await mockApi(page);
    await submitLogin(page);
    await expect(page.locator('aside.sidebar')).toBeVisible();
    await expect(page.getByTestId('login-intro')).toHaveCount(0);
  });
});
