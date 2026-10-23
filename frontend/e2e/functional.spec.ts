import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 800 } });

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('admin@sentanu.local');
  await page.locator('#login-password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  // Wait for the actual authenticated redirect, not static branding on the login page.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(page.getByRole('link', { name: /Master Data/i }).first()).toBeVisible({ timeout: 10000 });
}

test.describe('Sentanu Jaya ERP browser E2E', () => {
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
    const codeInput = dialog.getByPlaceholder('CUST-001');
    const nameInput = dialog.getByPlaceholder('PT Sentanu Maju').first();
    const taxSelect = dialog.locator('select').first();

    await expect(codeInput).toBeVisible();
    await expect(nameInput).toBeVisible();
    await expect(taxSelect).toBeVisible();

    // Type through real keyboard events and assert focus/value after every character.
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

    await taxSelect.selectOption('2');
    await expect(taxSelect).toHaveValue('2');

    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    const row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(name, { timeout: 10000 });
    created = true;

    // Reload to prove persisted server/database state.
    await page.reload();
    const persistedRow = page.locator('tr').filter({ hasText: code });
    await expect(persistedRow).toContainText(name, { timeout: 10000 });

    // Delete via the UI and confirm the destructive action.
    await persistedRow.locator('button[title="Hapus"]').click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
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
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();

    let row = page.locator('tr').filter({ hasText: code });
    await expect(dialog).toBeHidden();
    await expect(row).toContainText(name, { timeout: 10000 });

    await page.reload();
    await page.getByRole('button', { name: /Satuan \(UOM\)/i }).click();
    row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(name, { timeout: 10000 });

    await row.locator('button[title="Edit"]').click();
    const editDialog = page.getByRole('dialog');
    const editName = editDialog.getByPlaceholder('Pieces / Buah');
    await editName.fill(editedName);
    await editDialog.getByRole('button', { name: /Simpan Data/i }).click();
    row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(editedName, { timeout: 10000 });

    await row.locator('button[title="Hapus"]').click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
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

    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    let row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(name, { timeout: 10000 });

    await page.reload();
    await page.getByRole('button', { name: /^Supplier$/i }).click();
    row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(name, { timeout: 10000 });

    // Some master tables render icon-only action controls. Locate the row actions
    // by their accessible labels first, then fall back to title/aria-label metadata.
    const editButton = row.locator('button[aria-label="Edit"], button[title="Edit"]').first();
    if (await editButton.count()) {
      await editButton.click();
      const editDialog = page.getByRole('dialog');
      const editNameInput = editDialog.getByPlaceholder('PT Warna Abadi Kimia');
      await editNameInput.fill(editedName);
      await editDialog.getByRole('button', { name: /Simpan Data/i }).click();
      row = page.locator('tr').filter({ hasText: code });
      await expect(row).toContainText(editedName, { timeout: 10000 });
    } else {
      // If the supplier table has no edit action, fail with a precise UI diagnostic.
      throw new Error('Supplier row is persisted, but no Edit button with accessible name or title was rendered.');
    }

    await row.locator('button[title="Hapus"]').click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
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
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
    let row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(name, { timeout: 10000 });
    await page.reload();
    await page.getByRole('button', { name: /Material \/ Cat/i }).click();
    row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(name, { timeout: 10000 });
    await row.locator('button[title="Edit"]').click();
    const editDialog = page.getByRole('dialog');
    await editDialog.getByPlaceholder('Cat Polyurethane Hitam Glossy').fill(editedName);
    await editDialog.getByRole('button', { name: /Simpan Data/i }).click();
    row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(editedName, { timeout: 10000 });
    await row.locator('button[title="Hapus"]').click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
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
    await dialog.getByRole('button', { name: /Simpan Data/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10000 });

    let row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(name, { timeout: 10000 });
    await page.reload();
    await page.getByRole('button', { name: 'Perusahaan' }).click();
    row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(name, { timeout: 10000 });

    await row.locator('button[title="Edit"]').click();
    const editDialog = page.getByRole('dialog');
    await editDialog.getByPlaceholder('PT Sentanu Jaya').fill(editedName);
    await editDialog.getByRole('button', { name: /Simpan Data/i }).click();
    row = page.locator('tr').filter({ hasText: code });
    await expect(row).toContainText(editedName, { timeout: 10000 });

    await row.locator('button[title="Hapus"]').click();
    await expect(page.getByText('Hapus Data Master?')).toBeVisible();
    await page.getByRole('button', { name: /Hapus|Konfirmasi|Ya/i }).last().click();
    await expect(page.locator('tr').filter({ hasText: code })).toHaveCount(0, { timeout: 10000 });
  });

  test('Customer Contact, Customer Item and Price List support related-record dropdowns and CRUD', async ({ page }) => {
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
    await page.getByRole('button', { name: 'Price List', exact: true }).click();
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
    await expect(page).toHaveURL(/\\/customer-po$/);
    await expect(page.getByRole('button', { name: /Buat Customer PO/i })).toBeVisible();

    await page.getByRole('button', { name: /Buat Customer PO/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Company may be preselected, but customer, PO number and item must be supplied.
    await dialog.getByRole('button', { name: /Simpan Draft/i }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Customer wajib dipilih.')).toBeVisible();
    await expect(dialog.getByText('Nomor PO wajib diisi.')).toBeVisible();
    await expect(dialog.getByText('Item wajib dipilih.')).toBeVisible();

    // Correct the PO number and verify the input remains editable after validation.
    const poNumber = dialog.locator('#po-number');
    await poNumber.fill(`E2E-PO-${Date.now()}`);
    await expect(poNumber).toHaveValue(/E2E-PO-/);
    await dialog.getByRole('button', { name: /Batal/i }).click();
    await expect(dialog).toBeHidden();
  });

  test('Delivery page opens and exposes delivery creation controls', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /Surat Jalan|Delivery/i }).click();
    await expect(page).toHaveURL(/\\/delivery$/);
    await expect(page.getByRole('button', { name: /Buat Surat Jalan|Buat Pengiriman|Tambah Surat Jalan|New Delivery/i })).toBeVisible();
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

});
