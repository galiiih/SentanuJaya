import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('admin@sentanu.local');
  await page.locator('#login-password').fill('password123');
  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/v1/auth/login') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Login' }).click();
  const loginResponse = await loginResponsePromise;
  if (!loginResponse.ok()) {
    const responseBody = await loginResponse.text();
    const visibleError = await page.locator('.auth-card').innerText().catch(() => '');
    throw new Error(`Login API failed with HTTP ${loginResponse.status()}: ${responseBody}. UI: ${visibleError}`);
  }
    // Wait for the authenticated page itself. On mobile the sidebar is intentionally
  // hidden until the hamburger button is opened, so do not require a nav link here.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: /Dashboard/i }).first()).toBeVisible({ timeout: 10000 });
}


async function traceActionClick(page: Page, locator: ReturnType<Page['locator']>, label: string) {
  await locator.evaluate((element) => {
    const target = element as HTMLElement;
    const samples: Array<Record<string, unknown>> = [];
    const sample = () => {
      const rect = target.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(x, y) as HTMLElement | null;
      const ancestors: Array<Record<string, unknown>> = [];
      let node: HTMLElement | null = target;
      while (node && ancestors.length < 7) {
        const style = getComputedStyle(node);
        const animations = node.getAnimations().map(animation => ({
          playState: animation.playState,
          currentTime: animation.currentTime,
          effect: animation.effect?.getTiming().duration,
        }));
        ancestors.push({
          tag: node.tagName.toLowerCase(),
          className: typeof node.className === 'string' ? node.className : '',
          rect: (() => { const r = node!.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })(),
          transition: style.transition,
          animation: style.animation,
          animations,
        });
        node = node.parentElement;
      }
      samples.push({
        time: Math.round(performance.now()),
        connected: target.isConnected,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        hit: hit ? { tag: hit.tagName.toLowerCase(), className: typeof hit.className === 'string' ? hit.className : '' } : null,
        hitTarget: !!hit && (hit === target || target.contains(hit)),
        ancestors,
      });
      if (samples.length > 150) samples.shift();
    };
    sample();
    const timer = window.setInterval(sample, 80);
    (window as any).__e2eActionStability = { samples, timer };
  });

  let actionError: unknown;
  try {
    await locator.scrollIntoViewIfNeeded({ timeout: 12000 });
    await locator.click({ timeout: 12000 });
  } catch (error) {
    actionError = error;
  } finally {
    const trace = await page.evaluate(() => {
      const state = (window as any).__e2eActionStability;
      if (!state) return null;
      window.clearInterval(state.timer);
      return state.samples;
    }).catch(() => null);
    console.log(`[E2E ACTION STABILITY] ${label} ${JSON.stringify(trace)}`);
  }
  if (actionError) throw actionError;
}


async function traceConfirmClick(page: Page, button: ReturnType<Page['locator']>, label: string) {
  await button.evaluate((element) => {
    const trace: Array<Record<string, unknown>> = [];
    const record = (event: Event) => {
      const target = event.target as HTMLElement | null;
      trace.push({
        type: event.type,
        phase: event.eventPhase,
        trusted: event.isTrusted,
        target: target?.tagName,
        targetClass: target?.className,
        defaultPrevented: event.defaultPrevented,
        activeElement: (document.activeElement as HTMLElement | null)?.className,
        time: Math.round(performance.now()),
      });
    };
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      window.addEventListener(type, record, true);
      window.addEventListener(type, record, false);
    }
    (window as any).__confirmEventTrace = trace;
  });
  const responsePromise = page.waitForResponse(
    response => response.request().method() === 'DELETE' && /\/api\/v1\//.test(response.url()),
    { timeout: 8000 },
  ).catch(() => null);
  let clickError = '';
  try {
    await button.click({ timeout: 10000 });
  } catch (error) {
    clickError = error instanceof Error ? error.message : String(error);
  }
  const response = await responsePromise;
  const trace = await page.evaluate(() => (window as any).__confirmEventTrace ?? []);
  console.log(`[E2E CONFIRM TRACE] ${label} ${JSON.stringify({ clickError, events: trace, deleteResponse: response ? { status: response.status(), url: response.url() } : null })}`);
  if (clickError) throw new Error(`Confirmation click failed (${label}): ${clickError}`);
  if (!response) throw new Error(`Confirmation click produced no DELETE request (${label}); inspect E2E CONFIRM TRACE above.`);
  expect(response.status(), await response.text()).toBe(200);
}

async function searchMasterRow(page: Page, code: string) {
  // CRUD assertions should wait for the uniquely keyed row, not drive the
  // controlled DataTable search input while the post-save refresh is rendering.
  // The search input has its own UI behavior and is not needed to identify E2E rows.
  const row = page.locator('tbody tr').filter({ hasText: code });
  await expect(row).toHaveCount(1, { timeout: 15000 });
  return row;
}

test.describe('Sentanu Jaya ERP browser E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Capture client-side failures that can prevent React from rendering controls
    // even when the API and HTTP requests appear healthy.
    page.on('pageerror', (error) => {
      console.error(`[E2E PAGE ERROR] ${error.stack ?? error.message}`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        console.error(`[E2E CONSOLE ERROR] ${message.text()}`);
      }
    });
    // Preserve API diagnostics in CI when a browser form remains open after submit.
    page.on('response', async (response) => {
      if (!response.url().includes('/api/v1/') || response.status() < 400) return;
      const body = await response.text().catch(() => '');
      console.error(`[E2E API] ${response.status()} ${response.request().method()} ${response.url()} ${body.slice(0, 1500)}`);
    });
    page.on('requestfailed', (request) => {
      if (request.url().includes('/api/v1/')) {
        console.error(`[E2E API REQUEST FAILED] ${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'unknown'}`);
      }
    });
  });
  test('login and master data navigation work', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /Master Data/i }).first().click();
    await expect(page).toHaveURL(/\/master$/);
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
  });

  test('customer form supports continuous typing, dropdown selection, save, persistence and delete', async ({ page }) => {
    const suffix = Date.now().toString();
    const code = `E2E-${suffix}`;
    const name = `Browser Test Customer ${suffix}`;
    let created = false;

    await login(page);
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
    await page.getByRole('button', { name: /Tambah Customer/i }).click();

    const dialog = page.getByRole('dialog');
    // Use stable form-order selectors. The placeholder-based locator was
    // intermittently unresolved in Chromium despite the same input being visible
    // and populated in the failure snapshot.
    const codeInput = dialog.locator('input').nth(0);
    const nameInput = dialog.locator('input').nth(1);
    const taxSelect = dialog.getByRole('combobox').first();

    await expect(codeInput).toBeVisible();
    await expect(nameInput).toBeVisible();
    await expect(taxSelect).toBeVisible();

    // Type through real keyboard events without repeatedly re-resolving the
    // controlled input after each character (which made this test flaky in CI).
    await codeInput.click();
    await expect(codeInput).toBeFocused();
    await codeInput.pressSequentially(code, { delay: 5 });
    await expect(codeInput).toHaveValue(code);

    await nameInput.click();
    await expect(nameInput).toBeFocused();
    await nameInput.pressSequentially(name, { delay: 5 });
    await expect(nameInput).toHaveValue(name);

    await taxSelect.selectOption('2');
    await expect(taxSelect).toHaveValue('2');

    const saveButton = dialog.getByRole('button', { name: /Simpan Data/i });
    await saveButton.scrollIntoViewIfNeeded();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    const row = await searchMasterRow(page, code);
    await expect(row).toContainText(name, { timeout: 10000 });
    created = true;

    // Reload to prove persisted server/database state.
    await page.reload();
    const persistedRow = await searchMasterRow(page, code);
    await expect(persistedRow).toContainText(name, { timeout: 10000 });

    // Delete via the UI and confirm the destructive action.
    await persistedRow.locator('button[title="Hapus"]').click();
    const confirmation = page.getByRole('alertdialog');
    await expect(confirmation).toBeVisible();
    const confirmButton = confirmation.getByRole('button', { name: 'Konfirmasi', exact: true });
    await confirmButton.click();
    await expect(confirmation).toBeHidden({ timeout: 10000 });
    await expect(page.locator('tr').filter({ hasText: code })).toHaveCount(0, { timeout: 10000 });
    created = false;

    // If a future assertion fails after creation, the isolated CI database is discarded with the job.
    if (created) console.error(`E2E test record may remain until CI database teardown: ${code}`);
  });

  test('UOM master supports keyboard input, create, edit, persistence and delete', async ({ page }) => {
    const suffix = Date.now().toString();
    const code = `E2E-UOM-${suffix}`;
    const name = `Unit Test ${suffix}`;
    const editedName = `Unit Edited ${suffix}`;

    await login(page);
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
    await page.getByRole('button', { name: /Satuan \(UOM\)/i }).click();
    await expect(page.getByText('Daftar Satuan (UOM)')).toBeVisible();
    await page.getByRole('button', { name: /Tambah Satuan \(UOM\)/i }).click();

    const dialog = page.getByRole('dialog');
    const codeInput = dialog.getByPlaceholder('PCS');
    const nameInput = dialog.getByPlaceholder('Pieces / Buah');
    const categoryInput = dialog.getByPlaceholder('GENERAL / QUANTITY / WEIGHT');

    await expect(codeInput).toBeVisible();
    await codeInput.click();
    for (const char of code) {
      await page.keyboard.type(char);
      await expect(codeInput).toBeFocused();
    }
    await nameInput.click();
    for (const char of name) {
      await page.keyboard.type(char);
      await expect(nameInput).toBeFocused();
    }
    await categoryInput.fill('GENERAL');
    const saveButton = dialog.getByRole('button', { name: /Simpan Data/i });
    await saveButton.scrollIntoViewIfNeeded();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(dialog).toBeHidden({ timeout: 10000 });
    let row = await searchMasterRow(page, code);
    await expect(row).toContainText(name, { timeout: 10000 });

    await page.reload();
    await page.getByRole('button', { name: /Satuan \(UOM\)/i }).click();
    row = await searchMasterRow(page, code);
    await expect(row).toContainText(name, { timeout: 10000 });

    const editButton = row.locator('button[title="Edit"]');
    await traceActionClick(page, editButton, 'supplier edit');
    const editDialog = page.getByRole('dialog');
    const editName = editDialog.getByPlaceholder('Pieces / Buah');
    await editName.fill(editedName);
    const saveEditButton = editDialog.getByRole('button', { name: /Simpan Data/i });
    await expect(saveEditButton).toBeEnabled();
    await traceActionClick(page, saveEditButton, 'master save edit');
    await expect(editDialog).toBeHidden({ timeout: 10000 });
    row = await searchMasterRow(page, code);
    await expect(row).toContainText(editedName, { timeout: 10000 });

    const deleteButton = row.locator('button[title="Hapus"]');
    await deleteButton.click();
    const confirmation = page.getByRole('alertdialog');
    await expect(confirmation).toBeVisible();
    await traceConfirmClick(page, confirmation.getByRole('button', { name: 'Konfirmasi', exact: true }), 'supplier');
    await expect(confirmation).toBeHidden({ timeout: 10000 });
    await expect(page.locator('tr').filter({ hasText: code })).toHaveCount(0, { timeout: 10000 });
  });


  test('Supplier master supports continuous typing, create, edit, persistence and delete', async ({ page }) => {
    const suffix = Date.now().toString();
    const code = `E2E-SUP-${suffix}`;
    const name = `Browser Supplier ${suffix}`;
    const editedName = `Edited Supplier ${suffix}`;

    await login(page);
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
    await page.getByRole('button', { name: /^Supplier$/i }).click();
    await expect(page.getByText('Daftar Supplier')).toBeVisible();
    await page.getByRole('button', { name: /Tambah Supplier/i }).click();

    const dialog = page.getByRole('dialog');
    const codeInput = dialog.getByPlaceholder('SUP-001');
    const nameInput = dialog.getByPlaceholder('PT Warna Abadi Kimia');

    await expect(codeInput).toBeVisible();
    await codeInput.click();
    for (const char of code) {
      await page.keyboard.type(char);
      await expect(codeInput).toBeFocused();
    }
    await expect(codeInput).toHaveValue(code);

    await nameInput.click();
    for (const char of name) {
      await page.keyboard.type(char);
      await expect(nameInput).toBeFocused();
    }
    await expect(nameInput).toHaveValue(name);

    const saveButton = dialog.getByRole('button', { name: /Simpan Data/i });
    await saveButton.scrollIntoViewIfNeeded();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    let row = await searchMasterRow(page, code);
    await expect(row).toContainText(name, { timeout: 10000 });

    await page.reload();
    await page.getByRole('button', { name: /^Supplier$/i }).click();
    row = await searchMasterRow(page, code);
    await expect(row).toContainText(name, { timeout: 10000 });

    // Some master tables render icon-only action controls. Locate the row actions
    // by their accessible labels first, then fall back to title/aria-label metadata.
    const editButton = row.locator('button[aria-label="Edit"], button[title="Edit"]').first();
    if (await editButton.count()) {
      await editButton.click();
      const editDialog = page.getByRole('dialog');
      const editNameInput = editDialog.getByPlaceholder('PT Warna Abadi Kimia');
      await editNameInput.fill(editedName);
      const saveEditButton = editDialog.getByRole('button', { name: /Simpan Data/i });
      await expect(saveEditButton).toBeEnabled();
      await traceActionClick(page, saveEditButton, 'supplier save edit');
      await expect(editDialog).toBeHidden({ timeout: 10000 });
      row = await searchMasterRow(page, code);
      await expect(row).toContainText(editedName, { timeout: 10000 });
    } else {
      // If the supplier table has no edit action, fail with a precise UI diagnostic.
      throw new Error('Supplier row is persisted, but no Edit button with accessible name or title was rendered.');
    }

    await row.locator('button[title="Hapus"]').click();
    const confirmation = page.getByRole('alertdialog');
    await expect(confirmation).toBeVisible();
    await traceConfirmClick(page, confirmation.getByRole('button', { name: 'Konfirmasi', exact: true }), 'company');
    await expect(confirmation).toBeHidden({ timeout: 10000 });
    await expect(page.locator('tr').filter({ hasText: code })).toHaveCount(0, { timeout: 10000 });
  });

  test('Material / Cat master supports create, edit, persistence and delete', async ({ page }) => {
    const suffix = Date.now().toString();
    const code = `E2E-MAT-${suffix}`;
    const name = `Browser Material ${suffix}`;
    const editedName = `Edited Material ${suffix}`;
    await login(page);
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
    await page.getByRole('button', { name: /Material \/ Cat/i }).click();
    await page.getByRole('button', { name: /Tambah Material \/ Cat/i }).click();
    const dialog = page.getByRole('dialog');
    const codeInput = dialog.getByPlaceholder('CAT-PU-BLK');
    const nameInput = dialog.getByPlaceholder('Cat Polyurethane Hitam Glossy');
    await codeInput.click();
    for (const char of code) { await page.keyboard.type(char); await expect(codeInput).toBeFocused(); }
    await expect(codeInput).toHaveValue(code);
    await nameInput.click();
    for (const char of name) { await page.keyboard.type(char); await expect(nameInput).toBeFocused(); }
    await expect(nameInput).toHaveValue(name);
    await dialog.getByPlaceholder('GENERAL / RAW_MATERIAL / PAINT').fill('PAINT');
    await dialog.getByPlaceholder('LITER / CAN / PCS').fill('LITER');
    const stock = dialog.getByPlaceholder('5');
    if (await stock.count()) await stock.fill('5');
    const saveButton = dialog.getByRole('button', { name: /Simpan Data/i });
    await saveButton.scrollIntoViewIfNeeded();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    let row = await searchMasterRow(page, code);
    await expect(row).toContainText(name, { timeout: 10000 });
    await page.reload();
    await page.getByRole('button', { name: /Material \/ Cat/i }).click();
    row = await searchMasterRow(page, code);
    await expect(row).toContainText(name, { timeout: 10000 });
    await traceActionClick(page, row.locator('button[title="Edit"]'), 'material edit');
    const editDialog = page.getByRole('dialog');
    await editDialog.getByPlaceholder('Cat Polyurethane Hitam Glossy').fill(editedName);
    const saveEditButton = editDialog.getByRole('button', { name: /Simpan Data/i });
    await saveEditButton.scrollIntoViewIfNeeded();
    await expect(saveEditButton).toBeEnabled();
    await saveEditButton.click();
    await expect(editDialog).toBeHidden({ timeout: 10000 });
    row = await searchMasterRow(page, code);
    await expect(row).toContainText(editedName, { timeout: 10000 });
    await row.locator('button[title="Hapus"]').click();
    const confirmation = page.getByRole('alertdialog');
    await expect(confirmation).toBeVisible();
    const confirmButton = confirmation.getByRole('button', { name: 'Konfirmasi', exact: true });
    console.log('[E2E MATERIAL CONFIRM STATE]', JSON.stringify(await confirmButton.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        focused: document.activeElement === element,
        disabled: (element as HTMLButtonElement).disabled,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        pointerEvents: style.pointerEvents,
        visibility: style.visibility,
        opacity: style.opacity,
        transition: style.transition,
        animation: style.animation,
        parent: element.parentElement?.className,
      };
    })));
    const deleteResponsePromise = page.waitForResponse(
      response => response.request().method() === 'DELETE' && response.url().includes('/api/v1/materials/'),
      { timeout: 15000 },
    );
    await traceConfirmClick(page, confirmButton, 'material');
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.status(), await deleteResponse.text()).toBe(200);
    await expect(confirmation).toBeHidden({ timeout: 10000 });
    await expect(page.locator('tr').filter({ hasText: code })).toHaveCount(0, { timeout: 10000 });
  });


  test('Company master supports real typing, create, edit, reload persistence and delete', async ({ page }) => {
    const suffix = Date.now().toString();
    const code = `E2E-COMP-${suffix}`;
    const name = `Browser Company ${suffix}`;
    const editedName = `Edited Company ${suffix}`;

    await login(page);
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
    await page.getByRole('button', { name: 'Perusahaan' }).click();
    await expect(page.getByText('Daftar Perusahaan')).toBeVisible();
    await page.getByRole('button', { name: 'Tambah Perusahaan' }).click();

    const dialog = page.getByRole('dialog');
    const codeInput = dialog.getByPlaceholder('SJ');
    const nameInput = dialog.getByPlaceholder('PT Sentanu Jaya');
    await codeInput.click();
    for (const char of code) {
      await page.keyboard.type(char);
      await expect(codeInput).toBeFocused();
    }
    await expect(codeInput).toHaveValue(code);
    await nameInput.click();
    for (const char of name) {
      await page.keyboard.type(char);
      await expect(nameInput).toBeFocused();
    }
    await expect(nameInput).toHaveValue(name);
    const saveButton = dialog.getByRole('button', { name: /Simpan Data/i });
    await saveButton.scrollIntoViewIfNeeded();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(dialog).toBeHidden({ timeout: 10000 });

    let row = await searchMasterRow(page, code);
    await expect(row).toContainText(name, { timeout: 10000 });
    await page.reload();
    await page.getByRole('button', { name: 'Perusahaan' }).click();
    row = await searchMasterRow(page, code);
    await expect(row).toContainText(name, { timeout: 10000 });

    await traceActionClick(page, row.locator('button[title="Edit"]'), 'company edit');
    const editDialog = page.getByRole('dialog');
    await editDialog.getByPlaceholder('PT Sentanu Jaya').fill(editedName);
    const saveEditButton = editDialog.getByRole('button', { name: /Simpan Data/i });
    await saveEditButton.scrollIntoViewIfNeeded();
    await expect(saveEditButton).toBeEnabled();
    await saveEditButton.click();
    await expect(editDialog).toBeHidden({ timeout: 10000 });
    row = await searchMasterRow(page, code);
    await expect(row).toContainText(editedName, { timeout: 10000 });

    await row.locator('button[title="Hapus"]').click();
    const confirmation = page.getByRole('alertdialog');
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: 'Konfirmasi', exact: true }).click();
    await expect(confirmation).toBeHidden({ timeout: 10000 });
    await expect(page.locator('tr').filter({ hasText: code })).toHaveCount(0, { timeout: 10000 });
  });

  test('Customer Contact, Customer Item and Price List support related-record dropdowns and CRUD', async ({ page }) => {
    // This end-to-end scenario intentionally covers three related CRUD modules,
    // including multiple reloads to verify server persistence. Give the complete
    // workflow enough time instead of letting the 60s suite default interrupt it.
    test.setTimeout(120_000);
    const suffix = Date.now().toString();
    const customerCode = `E2E-REL-CUST-${suffix}`;
    const customerName = `Related Test Customer ${suffix}`;
    const contactName = `Related Contact ${suffix}`;
    const itemCode = `E2E-ITEM-${suffix}`;
    const itemName = `Related Item ${suffix}`;
    const priceListCode = `E2E-PL-${suffix}`;
    const priceListName = `Related Price List ${suffix}`;

    await login(page);
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();

    // Create an isolated parent customer through the UI so this test does not depend on seed data.
    await page.getByRole('button', { name: 'Customer', exact: true }).click();
    await page.getByRole('button', { name: 'Tambah Customer' }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('CUST-001').fill(customerCode);
    await dialog.getByPlaceholder('PT Sentanu Maju').first().fill(customerName);
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    let customerRow = page.locator('tr').filter({ hasText: customerCode });
    await expect(customerRow).toContainText(customerName, { timeout: 10000 });

    // Relation dropdowns are loaded when the master page mounts. Reload after creating
    // the parent so the new customer is included in the dropdown's fetched options.
    await page.reload();
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
    // Customer Contact: select the parent customer, create, reload, edit, and delete.
    await page.getByRole('button', { name: 'Customer Contact' }).click();
    await page.getByRole('button', { name: 'Tambah Customer Contact' }).click();
    dialog = page.getByRole('dialog');
    const contactCustomer = dialog.locator('select').first();
    await expect(contactCustomer).toBeVisible();
    await contactCustomer.selectOption(await contactCustomer.locator('option').filter({ hasText: customerCode }).first().getAttribute('value') ?? '');
    await dialog.getByPlaceholder('Bapak Budi').fill(contactName);
    await dialog.getByPlaceholder('Purchasing Manager').fill('Purchasing');
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    let contactRow = page.locator('tr').filter({ hasText: contactName });
    await expect(contactRow).toBeVisible({ timeout: 10000 });
    await page.reload();
    await page.getByRole('button', { name: 'Customer Contact' }).click();
    contactRow = page.locator('tr').filter({ hasText: contactName });
    await expect(contactRow).toBeVisible({ timeout: 10000 });
    await contactRow.locator('button[title="Edit"]').click();
    dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Bapak Budi').fill(`Edited ${contactName}`);
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    contactRow = page.locator('tr').filter({ hasText: `Edited ${contactName}` });
    await expect(contactRow).toBeVisible({ timeout: 10000 });
    await contactRow.locator('button[title="Hapus"]').click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
    await expect(page.locator('tr').filter({ hasText: contactName })).toHaveCount(0, { timeout: 10000 });

    // Customer Item: verify relation dropdown and CRUD against the same parent.
    await page.getByRole('button', { name: 'Customer Item' }).click();
    await page.getByRole('button', { name: 'Tambah Customer Item' }).click();
    dialog = page.getByRole('dialog');
    const itemCustomerSelect = dialog.locator('select').first();
    await itemCustomerSelect.selectOption(await itemCustomerSelect.locator('option').filter({ hasText: customerCode }).first().getAttribute('value') ?? '');
    const itemCodeInput = dialog.getByPlaceholder('ITEM-BODYKIT-01');
    await itemCodeInput.click();
    for (const char of itemCode) {
      await page.keyboard.type(char);
      await expect(itemCodeInput).toBeFocused();
    }
    await dialog.getByPlaceholder('Front Bumper Pajero Sport').fill(itemName);
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    let itemRow = page.locator('tr').filter({ hasText: itemCode });
    await expect(itemRow).toContainText(itemName, { timeout: 10000 });
    await page.reload();
    await page.getByRole('button', { name: 'Customer Item' }).click();
    itemRow = page.locator('tr').filter({ hasText: itemCode });
    await expect(itemRow).toContainText(itemName, { timeout: 10000 });
    await itemRow.locator('button[title="Edit"]').click();
    dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Front Bumper Pajero Sport').fill(`Edited ${itemName}`);
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    itemRow = page.locator('tr').filter({ hasText: `Edited ${itemName}` });
    await expect(itemRow).toBeVisible({ timeout: 10000 });
    await itemRow.locator('button[title="Hapus"]').click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
    await expect(page.locator('tr').filter({ hasText: itemCode })).toHaveCount(0, { timeout: 10000 });

    // Price List: select the parent customer and exercise persisted CRUD.
    await page.getByRole('button', { name: 'Price List', exact: true }).first().click();
    await page.getByRole('button', { name: 'Tambah Price List' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('PL-2024-01').fill(priceListCode);
    await dialog.getByPlaceholder('Kontrak Harga 2024').fill(priceListName);
    const priceCustomerSelect = dialog.locator('select').first();
    await priceCustomerSelect.selectOption(await priceCustomerSelect.locator('option').filter({ hasText: customerCode }).first().getAttribute('value') ?? '');
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    let priceRow = page.locator('tr').filter({ hasText: priceListCode });
    await expect(priceRow).toContainText(priceListName, { timeout: 10000 });
    await page.reload();
    await page.getByRole('button', { name: 'Price List', exact: true }).click();
    priceRow = page.locator('tr').filter({ hasText: priceListCode });
    await expect(priceRow).toContainText(priceListName, { timeout: 10000 });
    await priceRow.locator('button[title="Edit"]').click();
    dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Kontrak Harga 2024').fill(`Edited ${priceListName}`);
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    priceRow = page.locator('tr').filter({ hasText: `Edited ${priceListName}` });
    await expect(priceRow).toBeVisible({ timeout: 10000 });
    await priceRow.locator('button[title="Hapus"]').click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
    await expect(page.locator('tr').filter({ hasText: priceListCode })).toHaveCount(0, { timeout: 10000 });

    // Remove the parent last after all dependent records have been deleted.
    await page.getByRole('button', { name: 'Customer', exact: true }).click();
    customerRow = page.locator('tr').filter({ hasText: customerCode });
    await expect(customerRow).toBeVisible({ timeout: 10000 });
    await customerRow.locator('button[title="Hapus"]').click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
    await expect(page.locator('tr').filter({ hasText: customerCode })).toHaveCount(0, { timeout: 10000 });
  });

  test('Price List Line supports related dropdowns, price editing, persistence and child-first deletion', async ({ page }) => {
    // This scenario creates and removes three related records, including several page reloads.
    test.setTimeout(180_000);
    const suffix = Date.now().toString();
    const customerCode = `E2E-PLL-CUST-${suffix}`;
    const customerName = `Price Line Customer ${suffix}`;
    const itemCode = `E2E-PLL-ITEM-${suffix}`;
    const itemName = `Price Line Item ${suffix}`;
    const listCode = `E2E-PLL-LIST-${suffix}`;
    const listName = `Price Line List ${suffix}`;
    const price = '1750000';
    const editedPrice = '1850000';

    await login(page);
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();

    // Create all parent records through the browser, without relying on seed data.
    await page.getByRole('button', { name: 'Customer', exact: true }).click();
    await page.getByRole('button', { name: 'Tambah Customer' }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('CUST-001').fill(customerCode);
    await dialog.getByPlaceholder('PT Sentanu Maju').first().fill(customerName);
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });

    await page.reload();
    await page.getByRole('button', { name: 'Customer Item' }).click();
    await page.getByRole('button', { name: 'Tambah Customer Item' }).click();
    dialog = page.getByRole('dialog');
    const customerSelect = dialog.locator('select').first();
    await customerSelect.selectOption(await customerSelect.locator('option').filter({ hasText: customerCode }).first().getAttribute('value') ?? '');
    await dialog.getByPlaceholder('ITEM-BODYKIT-01').fill(itemCode);
    await dialog.getByPlaceholder('Front Bumper Pajero Sport').fill(itemName);
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });

    await page.reload();
    await page.getByRole('button', { name: 'Price List', exact: true }).click();
    await page.getByRole('button', { name: 'Tambah Price List' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('PL-2024-01').fill(listCode);
    await dialog.getByPlaceholder('Kontrak Harga 2024').fill(listName);
    const listCustomerSelect = dialog.locator('select').first();
    await listCustomerSelect.selectOption(await listCustomerSelect.locator('option').filter({ hasText: customerCode }).first().getAttribute('value') ?? '');
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });

    // Refresh relation options, then exercise the Price List Line form itself.
    await page.reload();
    await page.getByRole('button', { name: 'Price List Line' }).click();
    await expect(page.getByText('Daftar Price List Line')).toBeVisible();
    await page.getByRole('button', { name: /Tambah Price List Line/i }).click();
    dialog = page.getByRole('dialog');
    const priceListSelect = dialog.locator('select').nth(0);
    const itemSelect = dialog.locator('select').nth(1);
    await priceListSelect.selectOption(await priceListSelect.locator('option').filter({ hasText: listCode }).first().getAttribute('value') ?? '');
    await itemSelect.selectOption(await itemSelect.locator('option').filter({ hasText: itemCode }).first().getAttribute('value') ?? '');
    await dialog.getByPlaceholder('1500000').fill(price);
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });

    let lineRow = page.locator('tr').filter({ hasText: listName }).filter({ hasText: itemName });
    await expect(lineRow).toContainText('1.750.000', { timeout: 10000 });
    await page.reload();
    await page.getByRole('button', { name: 'Price List Line' }).click();
    lineRow = page.locator('tr').filter({ hasText: listName }).filter({ hasText: itemName });
    await expect(lineRow).toContainText('1.750.000', { timeout: 10000 });

    await lineRow.locator('button[title="Edit"]').click();
    dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('1500000').fill(editedPrice);
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    lineRow = page.locator('tr').filter({ hasText: listName }).filter({ hasText: itemName });
    await expect(lineRow).toContainText('1.850.000', { timeout: 10000 });

    // Delete dependent line before its parent records to respect foreign keys.
    await lineRow.locator('button[title="Hapus"]').click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
    await expect(page.locator('tr').filter({ hasText: listName }).filter({ hasText: itemName })).toHaveCount(0, { timeout: 10000 });

    await page.getByRole('button', { name: 'Price List', exact: true }).click();
    let parentRow = page.locator('tr').filter({ hasText: listCode });
    await parentRow.locator('button[title="Hapus"]').click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
    await expect(page.locator('tr').filter({ hasText: listCode })).toHaveCount(0, { timeout: 10000 });

    await page.getByRole('button', { name: 'Customer Item' }).click();
    parentRow = page.locator('tr').filter({ hasText: itemCode });
    await parentRow.locator('button[title="Hapus"]').click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
    await expect(page.locator('tr').filter({ hasText: itemCode })).toHaveCount(0, { timeout: 10000 });

    await page.getByRole('button', { name: 'Customer', exact: true }).click();
    parentRow = page.locator('tr').filter({ hasText: customerCode });
    await parentRow.locator('button[title="Hapus"]').click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
    await expect(page.locator('tr').filter({ hasText: customerCode })).toHaveCount(0, { timeout: 10000 });
  });

  test('Customer PO form validates required customer, PO number and item before saving', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /Customer PO/i }).click();
    await expect(page).toHaveURL(/\/customer-po$/);
    await expect(page.getByRole('button', { name: /Buat Customer PO/i })).toBeVisible();

    await page.getByRole('button', { name: /Buat Customer PO/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Company may be preselected, but customer, PO number and item must be supplied.
    await dialog.getByRole('button', { name: /Simpan Draft/i }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Customer wajib dipilih.').first()).toBeVisible();
    await expect(dialog.getByText('Nomor PO wajib diisi.')).toBeVisible();
    await expect(dialog.getByText('Barang customer wajib dipilih.')).toBeVisible();

    // Correct the PO number and verify the input remains editable after validation.
    const poNumber = dialog.locator('#po-number');
    await poNumber.fill(`E2E-PO-${Date.now()}`);
    await expect(poNumber).toHaveValue(/E2E-PO-/);
    await dialog.getByRole('button', { name: /Batal/i }).click();
    await expect(dialog).toBeHidden();
  });

  test('Customer PO draft can be created through the UI and persists after reload', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /Customer PO/i }).click();
    await expect(page).toHaveURL(/\/customer-po$/);
    await page.getByRole('button', { name: /Buat Customer PO/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const companySelect = dialog.locator('#po-company');
    const companyValue = await companySelect.locator('option').evaluateAll((options) => {
      const option = options.find((item) => item.textContent?.includes('Sentanu Jaya Local'));
      return option?.getAttribute('value') ?? '';
    });
    expect(companyValue, 'E2E company fixture must be seeded').not.toBe('');
    await companySelect.selectOption(companyValue);

    const customerSelect = dialog.locator('#po-customer');
    const customerValue = await customerSelect.locator('option').evaluateAll((options) => {
      const option = options.find((item) => item.textContent?.includes('Customer Local'));
      return option?.getAttribute('value') ?? '';
    });
    expect(customerValue, 'E2E customer fixture must be seeded').not.toBe('');
    await customerSelect.selectOption(customerValue);

    const itemSelect = dialog.locator('select').nth(2);
    await expect(itemSelect).toBeEnabled();
    const itemValue = await itemSelect.locator('option').evaluateAll((options) => {
      const option = options.find((item) => item.textContent?.includes('Bumper Local'));
      return option?.getAttribute('value') ?? '';
    });
    expect(itemValue, 'E2E customer item fixture must be seeded').not.toBe('');
    await itemSelect.selectOption(itemValue);

    const poNumber = `E2E-PO-${Date.now()}`;
    await dialog.locator('#po-number').fill(poNumber);
    await dialog.locator('#po-date').fill(new Date().toISOString().slice(0, 10));
    const createResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/v1/customer-pos') && response.request().method() === 'POST'
    );
    await dialog.getByRole('button', { name: /Simpan Draft/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    await expect(dialog).toBeHidden();
    await expect(page.getByText(poNumber, { exact: true })).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page).toHaveURL(/\/customer-po$/);
    await expect(page.getByText(poNumber, { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('Delivery page opens and exposes delivery creation controls', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /Surat Jalan|Delivery/i }).click();
    await expect(page).toHaveURL(/\/delivery$/);
    await expect(page.getByRole('button', { name: /Buat Surat Jalan|Surat Jalan Baru|New Delivery/i })).toBeVisible();
  });

  test('Delivery creation keeps Customer PO disabled until a customer is selected and can be cancelled', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /Surat Jalan|Delivery/i }).click();
    await expect(page).toHaveURL(new RegExp('/delivery$'));
    await page.getByRole('button', { name: /Buat Surat Jalan|Surat Jalan Baru|New Delivery/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const selects = dialog.locator('select');
    await expect(selects).toHaveCount(4);
    const customerSelect = selects.nth(2);
    const customerPoSelect = selects.nth(3);

    // The PO list depends on the selected customer; prevent selecting an unrelated PO.
    await expect(customerPoSelect).toBeDisabled();
    const optionValues = await customerSelect.locator('option').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value).filter(Boolean)
    );

    if (optionValues.length > 0) {
      await customerSelect.selectOption(optionValues[0]);
      await expect(customerPoSelect).toBeEnabled();
    } else {
      // Empty master data should still leave the PO field safely disabled.
      await expect(customerPoSelect).toBeDisabled();
    }

    await dialog.getByRole('button', { name: /Batal|Cancel/i }).click();
    await expect(dialog).toBeHidden();
  });

  test('customer acceptance can be created, submitted and posted with OK and rejected quantities', async ({ page }) => {
    const customer = { id: 'e2e-accept-customer', code: 'E2E-ACC', name: 'Customer Acceptance E2E' };
    const deliveryOrder: any = {
      id: 'e2e-accept-do', sj_number: 'SJ-E2E-ACC-001', company_id: 'e2e-company',
      branch_id: 'e2e-branch', customer_id: customer.id, customer_po_id: 'e2e-po',
      customer_po_number: 'PO-E2E-ACC', delivery_date: '2026-11-08', status: 'DELIVERED',
      customer, customer_po: { id: 'e2e-po', po_number: 'PO-E2E-ACC' },
      lines: [{ id: 'e2e-accept-line', delivery_order_id: 'e2e-accept-do',
        customer_item_id: 'e2e-item', quantity: 10, unit_price: 100,
        customer_item: { id: 'e2e-item', name: 'Spoiler E2E' } }],
    };
    let acceptance: any = null;
    let createdPayload: any = null;

    await login(page);
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.replace(/\/$/, '');
      const method = request.method();
      const response = (data: unknown, status = 200) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: true, data, message: 'OK' }) });
      const paginated = (items: unknown[]) => ({ data: items, current_page: 1, last_page: 1, total: items.length });

      if (path === '/api/v1/delivery-orders' && method === 'GET') {
        return response(paginated([deliveryOrder]));
      }
      if (path === '/api/v1/customer-pos' && method === 'GET') return response(paginated([]));
      if (path === '/api/v1/companies' && method === 'GET') return response(paginated([]));
      if (path === '/api/v1/branches' && method === 'GET') return response(paginated([]));
      if (path === '/api/v1/customers' && method === 'GET') return response(paginated([customer]));
      if (path === '/api/v1/acceptances' && method === 'GET') {
        return response(paginated(acceptance ? [acceptance] : []));
      }
      if (path === '/api/v1/acceptances' && method === 'POST') {
        createdPayload = request.postDataJSON();
        acceptance = {
          id: 'e2e-acceptance-id', acceptance_number: 'AC-E2E-0001',
          delivery_order_id: deliveryOrder.id, customer_id: customer.id,
          acceptance_date: createdPayload.acceptance_date, status: 'DRAFT',
          lines: createdPayload.lines.map((line: any) => ({
            id: 'e2e-acceptance-line', acceptance_id: 'e2e-acceptance-id', ...line,
          })),
        };
        return response(acceptance, 201);
      }
      if (path === '/api/v1/acceptances/e2e-acceptance-id/submit' && method === 'POST') {
        acceptance = { ...acceptance, status: 'SUBMITTED' };
        return response(acceptance);
      }
      if (path === '/api/v1/acceptances/e2e-acceptance-id/post' && method === 'POST') {
        acceptance = { ...acceptance, status: 'POSTED' };
        deliveryOrder.status = 'CLOSED';
        return response(acceptance);
      }
      return route.continue();
    });

    await page.goto('/delivery');
    await expect(page.getByText('SJ-E2E-ACC-001')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'SJ-E2E-ACC-001' }).click();
    const detail = page.getByRole('dialog').first();
    await expect(detail.getByText('Spoiler E2E')).toBeVisible();
    await detail.getByRole('button', { name: /Penerimaan Baru|Catat Penerimaan/i }).click();

    // Identify the creation dialog by its unique reject-reason field.
    // A positional ".last()" locator is re-evaluated after unmount and then
    // points at the still-open delivery detail dialog, creating a false failure.
    const form = page.getByRole('dialog').filter({ has: page.getByPlaceholder('Alasan reject...') });
    const quantities = form.locator('input[type="number"]');
    await expect(quantities).toHaveCount(2);
    await quantities.nth(0).fill('8');
    await quantities.nth(1).fill('2');
    await form.getByPlaceholder('Alasan reject...').fill('Cat mengelupas');
    const createRequestPromise = page.waitForRequest(
      request => request.method() === 'POST' && new URL(request.url()).pathname.replace(/\/$/, '') === '/api/v1/acceptances',
      { timeout: 10000 },
    );
    // Register the response waiter before clicking; the mock responds immediately,
    // so registering it only after waitForRequest can miss the response event.
    const createResponsePromise = page.waitForResponse(
      response => response.request().method() === 'POST'
        && new URL(response.url()).pathname.replace(/\/$/, '') === '/api/v1/acceptances',
      { timeout: 15000 },
    );
    await form.getByRole('button', { name: /Simpan|Save/i }).click();
    const [createRequest, createResponse] = await Promise.all([createRequestPromise, createResponsePromise]);
    expect(createRequest.postDataJSON()).toMatchObject({
      delivery_order_id: deliveryOrder.id,
      lines: [{ delivery_order_line_id: 'e2e-accept-line', quantity_ok: 8, quantity_rejected: 2 }],
    });
    expect(createResponse.status(), await createResponse.text()).toBe(201);
    await expect(form).toBeHidden({ timeout: 10000 });
    await expect.poll(() => createdPayload).not.toBeNull();
    expect(createdPayload.lines).toEqual([{
      delivery_order_line_id: 'e2e-accept-line',
      quantity_ok: 8,
      quantity_rejected: 2,
      reject_reason: 'Cat mengelupas',
    }]);

    await expect(detail.getByText('AC-E2E-0001')).toBeVisible({ timeout: 10000 });
    await detail.getByRole('button', { name: /Ajukan Penerimaan|Submit Acceptance/i }).click();
    await expect(detail.getByText('SUBMITTED')).toBeVisible({ timeout: 10000 });
    await detail.getByRole('button', { name: /Posting Penerimaan|Post Penerimaan/i }).click();
    await expect(detail.getByText('POSTED')).toBeVisible({ timeout: 10000 });
    await expect(detail.getByText(/OK:\s*8 pcs/)).toBeVisible();
    await expect(detail.getByText(/Reject:\s*2 pcs/)).toBeVisible();
  });

  test('invoice creation requires an eligible delivered order and cannot submit an empty selection', async ({ page }) => {
    await login(page);
    await page.goto('/invoicing');
    await expect(page).toHaveURL(/\/invoicing$/);
    await page.getByRole('button', { name: /Buat Draft Invoice|Buat Invoice|Create Invoice/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const customerSelect = dialog.locator('select').first();
    await expect(customerSelect).toBeVisible();

    const customerValues = await customerSelect.locator('option').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value).filter(Boolean)
    );
    if (customerValues.length > 0) {
      await customerSelect.selectOption(customerValues[0]);
      await expect(dialog.getByText(/tidak ada Surat Jalan|belum ada Surat Jalan|No eligible|tidak dapat ditagih/i)).toBeVisible({ timeout: 10000 });
    }

    const createButton = dialog.getByRole('button', { name: /Buat Draft Invoice|Buat Invoice|Create Invoice/i });
    await expect(createButton).toBeDisabled();
    await dialog.getByRole('button', { name: /Batal|Cancel/i }).click();
    await expect(dialog).toBeHidden();
  });

  test('payment form does not allow submission without an outstanding invoice allocation', async ({ page }) => {
    await login(page);
    await page.goto('/payments');
    await expect(page).toHaveURL(/\/payments$/);
    await page.getByRole('button', { name: /Pembayaran Baru|Buat Pembayaran|New Payment/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const customerSelect = dialog.locator('select').first();
    await expect(customerSelect).toBeVisible();
    const customerValues = await customerSelect.locator('option').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value).filter(Boolean)
    );

    if (customerValues.length > 0) {
      await customerSelect.selectOption(customerValues[0]);
      await expect(dialog.getByText(/tidak ada invoice|belum ada invoice|No invoices/i)).toBeVisible({ timeout: 10000 });
    }

    await expect(dialog.getByRole('button', { name: /Pembayaran Baru|Buat Pembayaran|New Payment/i })).toBeDisabled();
    await dialog.getByRole('button', { name: /Batal|Cancel/i }).click();
    await expect(dialog).toBeHidden();
  });

  test('customer form blocks missing required fields and preserves dialog for correction', async ({ page }) => {
    await login(page);
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
    await page.getByRole('button', { name: /Tambah Customer/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const codeInput = dialog.getByPlaceholder('CUST-001');
    const nameInput = dialog.getByPlaceholder('PT Sentanu Maju').first();
    await expect(codeInput).toHaveAttribute('required', '');
    await expect(nameInput).toHaveAttribute('required', '');
    await expect(codeInput).toHaveJSProperty('validity.valid', false);
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeVisible();
    await expect(codeInput).toHaveJSProperty('validity.valid', false);

    // Correct the required fields and verify browser validity changes without losing focus.
    await codeInput.fill(`E2E-VALID-${Date.now()}`);
    await nameInput.fill(`Validation Customer ${Date.now()}`);
    await expect(codeInput).toHaveJSProperty('validity.valid', true);
    await expect(nameInput).toHaveJSProperty('validity.valid', true);
    await dialog.getByRole('button', { name: /Batal/i }).click();
    await expect(dialog).toBeHidden();
  });

  test('master data page remains within a mobile viewport without horizontal overflow', async ({ page }) => {
    await login(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });


  test('invoice creation and payment allocation work through real browser interactions', async ({ page }) => {
    const customer = { id: 'e2e-customer-id', code: 'E2E-FIN', name: 'E2E Financial Customer' };
    const deliveryOrder = {
      id: 'e2e-delivery-id', sj_number: 'SJ-E2E-FIN-001', customer_id: customer.id,
      delivery_date: '2026-10-22', status: 'DELIVERED', lines: [{
        id: 'e2e-delivery-line-id', quantity: 1, unit_price_snapshot: 1250, qty_invoiced: 0,
        acceptance_lines: [{ quantity_ok: 1, quantity_rejected: 0, acceptance: { status: 'POSTED' } }],
      }], customer,
    };
    let invoice: any = null;
    let payment: any = null;
    let invoiceCreatePayload: any = null;
    let paymentCreatePayload: any = null;

    await login(page);
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.replace(/\/$/, '');
      const method = request.method();
      const paginated = (items: unknown[]) => ({ success: true, data: { data: items, current_page: 1, last_page: 1, total: items.length }, message: 'OK' });
      const response = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: true, data, message: 'OK' }) });

      if (path === '/api/v1/customers' && method === 'GET') {
        return route.fulfill({ json: paginated([customer]) });
      }
      if (path === '/api/v1/invoices/eligible-delivery-orders' && method === 'GET') {
        return response([deliveryOrder]);
      }
      if (path === '/api/v1/invoices' && method === 'GET') {
        return route.fulfill({ json: paginated(invoice ? [invoice] : []) });
      }
      if (path === '/api/v1/invoices' && method === 'POST') {
        invoiceCreatePayload = request.postDataJSON();
        invoice = {
          id: 'e2e-invoice-id', invoice_number: 'INV-E2E-0001', customer_id: customer.id,
          customer, invoice_date: invoiceCreatePayload.invoice_date, due_date: '2026-11-21',
          status: 'POSTED', dpp: 1250, ppn_amount: 0, pph_amount: 0,
          total_amount: 1250, amount_paid: 0, amount_due: 1250,
        };
        return response(invoice, 201);
      }
      if (path === `/api/v1/customers/${customer.id}/outstanding` && method === 'GET') {
        return response({
          customer: { id: customer.id, code: customer.code, name: customer.name },
          total_billed: 1250, total_paid: payment?.amount ?? 0,
          total_outstanding: Math.max(0, 1250 - (payment?.amount ?? 0)),
          invoices: [{
            id: invoice?.id ?? 'e2e-invoice-id', invoice_number: invoice?.invoice_number ?? 'INV-E2E-0001',
            invoice_date: invoice?.invoice_date ?? '2026-10-22', total_amount: 1250,
            amount_paid: payment?.amount ?? 0, amount_due: Math.max(0, 1250 - (payment?.amount ?? 0)),
            status: payment?.amount >= 1250 ? 'PAID' : payment?.amount ? 'PARTIALLY_PAID' : 'POSTED',
          }],
        });
      }
      if (path === '/api/v1/payments' && method === 'GET') {
        return route.fulfill({ json: paginated(payment ? [payment] : []) });
      }
      if (path === '/api/v1/payments' && method === 'POST') {
        paymentCreatePayload = request.postDataJSON();
        payment = {
          id: 'e2e-payment-id', payment_number: 'PAY-E2E-0001', customer_id: customer.id,
          customer, payment_date: paymentCreatePayload.payment_date, method: paymentCreatePayload.method,
          amount: paymentCreatePayload.amount, reference_no: paymentCreatePayload.reference_no,
          status: 'POSTED', allocations: [{
            id: 'e2e-allocation-id', payment_id: 'e2e-payment-id',
            invoice_id: paymentCreatePayload.allocations[0].invoice_id,
            allocated_amount: paymentCreatePayload.allocations[0].amount,
            invoice: { ...invoice },
          }],
        };
        return response(payment, 201);
      }
      return route.continue();
    });

    // Invoice creation: use the UI to choose a customer and an eligible, accepted Surat Jalan.
    await page.goto('/invoicing');
    await page.getByRole('button', { name: /Buat Draft Invoice|Buat Invoice|Create Invoice/i }).click();
    let dialog = page.getByRole('dialog').first();
    await dialog.locator('select').first().selectOption(customer.id);
    await expect(dialog.getByText('SJ-E2E-FIN-001')).toBeVisible({ timeout: 10000 });
    await dialog.locator('input[type="checkbox"]').check();
    await dialog.getByRole('button', { name: /Buat Draft Invoice|Buat Invoice|Create Invoice/i }).click();
    const confirmation = page.getByRole('alertdialog');
    await confirmation.getByRole('button').last().click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    await expect.poll(() => invoiceCreatePayload).not.toBeNull();
    expect(invoiceCreatePayload.customer_id).toBe(customer.id);
    expect(invoiceCreatePayload.delivery_order_ids).toEqual([deliveryOrder.id]);
    await expect(page.getByText('INV-E2E-0001')).toBeVisible({ timeout: 10000 });

    // Payment creation: allocate the invoice amount using the browser form, then verify the UI reload.
    await page.goto('/payments');
    await page.getByRole('button', { name: /Pembayaran Baru|Buat Pembayaran|New Payment/i }).click();
    dialog = page.getByRole('dialog');
    await dialog.locator('select').first().selectOption(customer.id);
    const allocation = dialog.locator('input[type="number"]').first();
    await expect(allocation).toBeVisible({ timeout: 10000 });
    await allocation.fill('1250');
    await dialog.getByPlaceholder('TRF-001').fill('E2E-TRANSFER-0001');
    await dialog.getByRole('button', { name: /Pembayaran Baru|Buat Pembayaran|New Payment/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    await expect.poll(() => paymentCreatePayload).not.toBeNull();
    expect(paymentCreatePayload.customer_id).toBe(customer.id);
    expect(paymentCreatePayload.amount).toBe(1250);
    expect(paymentCreatePayload.allocations).toEqual([{ invoice_id: invoice.id, amount: 1250 }]);
    await expect(page.getByText('PAY-E2E-0001')).toBeVisible({ timeout: 10000 });
  });

  test('desktop sidebar collapses to an icon rail and can be expanded again', async ({ page }) => {
    await login(page);
    const sidebar = page.locator('aside.sidebar');
    const toggle = page.getByRole('button', { name: 'Ciutkan sidebar' });

    await expect(sidebar).toBeVisible();
    const expandedWidth = await sidebar.evaluate((element) => element.getBoundingClientRect().width);
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Perlebar sidebar' })).toBeVisible();
    await expect(sidebar).toHaveClass(/sidebar--collapsed/);

    const collapsedWidth = await sidebar.evaluate((element) => element.getBoundingClientRect().width);
    expect(collapsedWidth).toBeLessThan(expandedWidth);
    await expect(page.getByRole('link', { name: 'Master Data' })).toHaveAttribute('title', 'Master Data');

    await page.getByRole('button', { name: 'Perlebar sidebar' }).click();
    await expect(sidebar).not.toHaveClass(/sidebar--collapsed/);
    const restoredWidth = await sidebar.evaluate((element) => element.getBoundingClientRect().width);
    expect(restoredWidth).toBeGreaterThan(collapsedWidth);
  });

  test('mobile drawer restores labels after collapsing the desktop sidebar', async ({ page }) => {
    await login(page);

    const sidebar = page.locator('aside.sidebar');
    const collapseButton = sidebar.locator('button.sidebar__collapse');
    await expect(collapseButton).toBeVisible();
    await collapseButton.click();
    await expect(sidebar).toHaveClass(/sidebar--collapsed/);

    await page.setViewportSize({ width: 390, height: 844 });
    const trigger = page.getByRole('button', { name: 'Buka navigasi' });
    await expect(trigger).toBeVisible();
    await trigger.click();

    await expect(sidebar).toHaveClass(/sidebar--mobile-open/);
    await expect(sidebar.getByRole('link', { name: 'Master Data' })).toBeVisible();
    await expect(collapseButton).toBeHidden();
  });

  test('mobile navigation opens as a drawer and closes after route selection', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);

    const sidebar = page.locator('aside.sidebar');
    const trigger = page.getByRole('button', { name: 'Buka navigasi' });
    const overlay = page.locator('.sidebar-mobile-overlay');

    await expect(trigger).toBeVisible();
    await expect(sidebar).not.toHaveClass(/sidebar--mobile-open/);
    await trigger.click();
    await expect(sidebar).toHaveClass(/sidebar--mobile-open/);
    await expect(overlay).toHaveClass(/sidebar-mobile-overlay--visible/);
    await expect(page.getByRole('link', { name: 'Master Data' })).toBeVisible();

    await page.getByRole('link', { name: 'Master Data' }).click();
    await expect(page).toHaveURL(/\/master$/);
    await expect(sidebar).not.toHaveClass(/sidebar--mobile-open/);
    await expect(overlay).toBeHidden();
  });

  test('mobile navigation closes with Escape and restores page interaction', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);

    const sidebar = page.locator('aside.sidebar');
    await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await expect(sidebar).toHaveClass(/sidebar--mobile-open/);
    await page.keyboard.press('Escape');
    await expect(sidebar).not.toHaveClass(/sidebar--mobile-open/);
    await expect(page.getByRole('button', { name: 'Buka navigasi' })).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('heading', { name: /Dashboard/i }).first()).toBeVisible();
  });

  test('mobile navigation overlay closes the drawer without changing route', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);

    const sidebar = page.locator('aside.sidebar');
    await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await expect(sidebar).toHaveClass(/sidebar--mobile-open/);
    await page.getByRole('button', { name: 'Tutup navigasi' }).click({ position: { x: 360, y: 24 } });
    await expect(sidebar).not.toHaveClass(/sidebar--mobile-open/);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('relation-dependent master forms stay disabled when reference API fails and recover after retry', async ({ page }) => {
    await login(page);

    let failFirstCompanyRequest = true;
    await page.route('**/api/v1/companies**', async (route) => {
      if (failFirstCompanyRequest) {
        failFirstCompanyRequest = false;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Temporary reference service failure' }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/master');
    await expect(page.getByText('Master Data & Referensi')).toBeVisible();
    await page.getByRole('button', { name: /Customer Contact/i }).click();

    const createButton = page.getByRole('button', { name: /Tambah Customer Contact/i });
    await expect(page.getByText(/Gagal memuat data referensi/i)).toBeVisible({ timeout: 10000 });
    await expect(createButton).toBeDisabled();

    // Retry must reload all relation options and unlock the form only after success.
    await page.getByRole('button', { name: /Coba lagi/i }).click();
    await expect(page.getByText(/Gagal memuat data referensi/i)).toHaveCount(0, { timeout: 10000 });
    await expect(createButton).toBeEnabled({ timeout: 10000 });
    await createButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /Batal/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });


  test('Nanu confirms and cancels Customer PO actions through the real browser and API', async ({ page }) => {
    await login(page);

    // Use the deterministic master records created by BrowserE2ESeeder.
    const fixtures = await page.evaluate(async () => {
      const get = async (path: string) => {
        const response = await fetch(path, { credentials: 'include', headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`GET ${path}: HTTP ${response.status} ${await response.text()}`);
        return response.json();
      };
      const unwrap = (body: any) => body?.data?.data ?? body?.data ?? body;
      const [companiesBody, customersBody, itemsBody] = await Promise.all([
        get('/api/v1/companies?per_page=100'),
        get('/api/v1/customers?per_page=100'),
        get('/api/v1/customer-items?per_page=100'),
      ]);
      const companies = unwrap(companiesBody);
      const customers = unwrap(customersBody);
      const items = unwrap(itemsBody);
      const company = (Array.isArray(companies) ? companies : companies?.data ?? []).find((row: any) => row.code === 'SJ-LOCAL');
      const customer = (Array.isArray(customers) ? customers : customers?.data ?? []).find((row: any) => row.code === 'CUST-LOCAL');
      const item = (Array.isArray(items) ? items : items?.data ?? []).find((row: any) => row.code === 'BUMPER-LOCAL');
      if (!company?.id || !customer?.id || !item?.id) {
        throw new Error('BrowserE2ESeeder fixture missing: SJ-LOCAL / CUST-LOCAL / BUMPER-LOCAL');
      }
      return { companyId: company.id, customerId: customer.id, itemId: item.id };
    });

    const createPoAndDraft = async (suffix: string) => page.evaluate(async ({ fixtures, suffix }) => {
      const request = async (path: string, method: string, body?: unknown) => {
        const response = await fetch(path, {
          method,
          credentials: 'include',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`${method} ${path}: HTTP ${response.status} ${JSON.stringify(payload)}`);
        return payload?.data ?? payload;
      };
      const po = await request('/api/v1/customer-pos', 'POST', {
        company_id: fixtures.companyId,
        customer_id: fixtures.customerId,
        po_number: `E2E-NANU-${suffix}`,
        po_date: new Date().toISOString().slice(0, 10),
        lines: [{ customer_item_id: fixtures.itemId, color_code: 'BLACK', quantity: 2, unit_price: 100000 }],
      });
      const draft = await request('/api/v1/puffy/actions', 'POST', {
        action_type: 'customer_po.activate',
        payload: { po_id: po.id },
      });
      return { poId: po.id, actionId: draft.id, poNumber: po.po_number };
    }, { fixtures, suffix });

    const readPoStatus = async (poId: string) => page.evaluate(async (id) => {
      const response = await fetch(`/api/v1/customer-pos/${id}`, {
        credentials: 'include', headers: { Accept: 'application/json' },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(`Read PO failed: HTTP ${response.status} ${JSON.stringify(payload)}`);
      return payload?.data?.status ?? payload?.status;
    }, poId);

    const renderActionInNanu = async (poNumber: string, actionId: string) => {
      await page.route('**/api/v1/puffy/chat', async (route) => {
        const now = new Date().toISOString();
        const events = [
          ['tool_result', {
            tool: 'customer_po.activate',
            title: 'Konfirmasi aktivasi Customer PO',
            summary: `Draft aktivasi untuk ${poNumber} siap ditinjau.`,
            hasData: true,
            source: 'Nanu Action Executor',
            asOf: now,
            action: {
              id: actionId,
              label: `Aktifkan ${poNumber}`,
              description: `mengaktifkan Customer PO ${poNumber}`,
            },
          }],
          ['done', { message_id: `e2e-${actionId}`, conversation_id: `e2e-${actionId}` }],
        ];
        const body = events.map(([event, data]) => `event: ${event}\\ndata: ${JSON.stringify(data)}\\n\\n`).join('');
        await route.fulfill({ status: 200, contentType: 'text/event-stream', body });
      });

      const panel = page.getByRole('region', { name: 'Nanu · asisten admin' });
      if (!(await panel.isVisible().catch(() => false))) {
        await page.getByRole('button', { name: 'Buka chat Nanu' }).click();
      }
      const input = panel.getByRole('textbox', { name: 'Tanya Nanu…' });
      await input.fill(`Tinjau aktivasi ${poNumber}`);
      await input.press('Enter');
      await expect(panel.getByText(`Draft aktivasi untuk ${poNumber} siap ditinjau.`)).toBeVisible({ timeout: 10000 });
      await expect(panel.getByRole('button', { name: 'Lanjutkan' })).toBeVisible();
    };

    const activation = await createPoAndDraft('CONFIRM');
    expect(await readPoStatus(activation.poId)).toBe('DRAFT');
    await renderActionInNanu(activation.poNumber, activation.actionId);

    const panel = page.getByRole('region', { name: 'Nanu · asisten admin' });
    const confirmResponse = page.waitForResponse(response =>
      response.url().includes(`/puffy/actions/${activation.actionId}/confirm`) &&
      response.request().method() === 'POST',
    );
    await panel.getByRole('button', { name: 'Lanjutkan' }).click();
    const confirmed = await confirmResponse;
    expect(confirmed.status(), await confirmed.text()).toBe(200);
    await expect(panel.getByRole('status').filter({ hasText: 'tercatat di audit log' })).toBeVisible();
    expect(await readPoStatus(activation.poId)).toBe('OPEN');

    await page.unroute('**/api/v1/puffy/chat');
    const cancellation = await createPoAndDraft('CANCEL');
    expect(await readPoStatus(cancellation.poId)).toBe('DRAFT');
    await renderActionInNanu(cancellation.poNumber, cancellation.actionId);

    const cancelResponse = page.waitForResponse(response =>
      response.url().includes(`/puffy/actions/${cancellation.actionId}/cancel`) &&
      response.request().method() === 'POST',
    );
    await panel.getByRole('button', { name: 'Batal' }).click();
    const cancelled = await cancelResponse;
    expect(cancelled.status(), await cancelled.text()).toBe(200);
    await expect(panel.getByText('Dibatalkan.')).toBeVisible();
    expect(await readPoStatus(cancellation.poId)).toBe('DRAFT');
  });


});
