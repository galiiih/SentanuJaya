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

  test('flies the intro logo toward the centered mobile Dashboard button on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await submitLogin(page);
    const intro = page.getByTestId('login-intro');
    await expect(intro).toBeVisible();
    await expect(page.locator('.mobile-bottom-bar')).toBeVisible();
    await expect(page.locator('.mobile-bottom-bar__dashboard')).toBeVisible();
    await expect(intro).toHaveClass(/login-intro--mobile/, { timeout: 6000 });
    await expect(intro).toHaveClass(/login-intro--fly|login-intro--wave/, { timeout: 6000 });
    const dy = await intro.evaluate((element) => Number.parseFloat(getComputedStyle(element).getPropertyValue('--intro-dy')));
    expect(Number.isFinite(dy)).toBeTruthy();
    expect(Math.abs(dy)).toBeGreaterThan(20);
    await expect(intro).toHaveClass(/login-intro--wave/, { timeout: 6000 });
    await expect(intro).toBeHidden({ timeout: 4000 });
    await expect(page.locator('.mobile-bottom-bar')).toBeVisible();
    await expect(page.locator('.mobile-bottom-bar__dashboard')).toBeVisible();
  });

  test('mobile bottom navigation exposes five slots and an overflow menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await submitLogin(page);
    await page.getByRole('button', { name: 'Lewati animasi pembuka' }).click();
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 1500 });

    const bar = page.locator('.mobile-bottom-bar');
    await expect(bar).toBeVisible();
    await expect(bar.locator('.mobile-bottom-bar__slot')).toHaveCount(5);
    await expect(bar.locator('.mobile-bottom-bar__slot').nth(2).getByRole('link')).toHaveAttribute('href', '/dashboard');

    const more = page.getByRole('button', { name: 'Menu lainnya' });
    await expect(more).toBeVisible();
    await more.click();
    const panel = page.locator('.mobile-more-panel');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await more.click();
    await page.locator('.mobile-more-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(panel).toBeHidden();
  });

  test('desktop sidebar collapses and expands without losing accessible navigation labels', async ({ page }) => {
    await submitLogin(page);
    // The intro veil intentionally covers the viewport during the flight animation,
    // so a pointer click can be intercepted even though the skip button is visible.
    // Escape is the supported keyboard dismissal and avoids a timing-dependent click.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 5000 });

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

  test('switches cleanly between mobile bottom bar and desktop sidebar at the breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 900 });
    await submitLogin(page);
    await page.getByRole('button', { name: 'Lewati animasi pembuka' }).click();
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 1500 });

    const bar = page.locator('.mobile-bottom-bar');
    const more = page.locator('.mobile-more-trigger');
    const sidebar = page.locator('#main-sidebar-navigation');
    await expect(bar).toBeVisible();
    await expect(more).toBeVisible();
    await expect(sidebar).toBeHidden();

    await page.setViewportSize({ width: 761, height: 900 });
    await expect(bar).toBeHidden();
    await expect(more).toBeHidden();
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
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 5000 });
  });

  test('does not replay on reload of an existing session', async ({ page }) => {
    await submitLogin(page);
    // Escape remains available even if the timed intro has already entered its wave phase.
    // The skip button intentionally stops accepting pointer input during that phase.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('login-intro')).toBeHidden({ timeout: 5000 });
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
