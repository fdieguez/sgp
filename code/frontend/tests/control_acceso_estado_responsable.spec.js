import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

const CREDENTIALS = {
  RESPONSABLE: { email: 'barbarabrancatto@gmail.com', pass: 'Barbara_Resp_SGP_sxL4!' },
  DISTRIBUIDOR: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_mi6J!' }
};

const robustLogin = async (page, email, password, targetRole = 'DISTRIBUIDOR') => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  // Limpiar almacenamiento para no arrastrar sesiones viejas
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  const emailInput = page.locator('input[type="email"]');
  const passInput = page.locator('input[type="password"]');

  await emailInput.fill(email);
  await passInput.fill(password);
  await page.click('button:has-text("Ingresar")');

  // Esperar a que la navegación cambie
  await page.waitForURL(/.*(dashboard|mis-solicitudes|select-rol).*/, { timeout: 20000 });

  // Si está en /select-rol o aparece el selector, hacer clic en el rol
  const selectRolBtn = page.locator(`button:has-text("${targetRole}")`).first();
  if (await selectRolBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await selectRolBtn.click();
    await page.waitForURL(/.*(dashboard|mis-solicitudes).*/, { timeout: 15000 });
  }

  // Si aún está en /select-rol, esperar o reintentar click
  if (page.url().includes('select-rol')) {
    await page.locator(`button:has-text("${targetRole}")`).first().click();
    await page.waitForURL(/.*(dashboard|mis-solicitudes).*/, { timeout: 15000 });
  }

  await page.waitForTimeout(500);
};

test.describe('Control de acceso al Estado para rol Responsable', () => {

  test('CP-RESP-01: Responsable en caso PENDIENTE ve Estado en solo lectura (disabled) y NO puede cambiarlo a mano', async ({ page }) => {
    test.setTimeout(90000);

    console.log('[Paso 1] Iniciando sesión como Barbara Brancatto (Rol RESPONSABLE)...');
    await robustLogin(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass, 'Responsable');

    console.log('[Paso 2] Navegando a /mis-solicitudes...');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    console.log('[Paso 3] Buscando la solicitud pendiente #999...');
    const fila999 = page.locator('tr').filter({ hasText: '#999' }).first();
    await expect(fila999).toBeVisible({ timeout: 10000 });

    console.log('[Paso 4] Abriendo modal de detalles de solicitud #999...');
    const editBtn = fila999.locator('button[title*="Ver / Editar Detalles"]');
    await editBtn.click();

    const modalTitle = page.locator('h2, [class*="font-bold"]').filter({ hasText: 'Editar Solicitud #999' }).first();
    await expect(modalTitle).toBeVisible({ timeout: 10000 });

    console.log('[Paso 5] Verificando que el select de Estado esté deshabilitado (disabled)...');
    const selectEstado = page.locator('label:has-text("Estado") + select, label:has-text("Estado") ~ select').first();
    await expect(selectEstado).toBeVisible({ timeout: 5000 });
    const isDisabled = await selectEstado.isDisabled();
    console.log(`[Paso 6] ¿Select de Estado está deshabilitado para Responsable en caso pendiente? -> ${isDisabled}`);
    expect(isDisabled).toBe(true);

    const labelEstado = page.locator('label:has-text("Estado")').first();
    const labelText = await labelEstado.innerText();
    console.log(`[Paso 7] Texto del label de Estado: "${labelText}"`);
    expect(labelText).toContain('Solo lectura');

    const cancelBtn = page.locator('button:has-text("Cancelar")').first();
    await cancelBtn.click();
  });

  test('CP-RESP-02: Responsable en caso ASIGNADO A ÉL (#50) sí puede gestionar el Estado', async ({ page }) => {
    test.setTimeout(90000);

    console.log('[Paso 1] Iniciando sesión como Barbara Brancatto (Rol RESPONSABLE)...');
    await robustLogin(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass, 'Responsable');

    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    console.log('[Paso 2] Buscando su solicitud asignada #50...');
    const fila50 = page.locator('tr').filter({ hasText: '#50' }).first();
    await expect(fila50).toBeVisible({ timeout: 10000 });

    await fila50.locator('button[title*="Ver / Editar Detalles"]').click();

    const selectEstado = page.locator('label:has-text("Estado") + select, label:has-text("Estado") ~ select').first();
    await expect(selectEstado).toBeVisible({ timeout: 5000 });

    const isDisabled = await selectEstado.isDisabled();
    console.log(`[Paso 3] ¿Select de Estado está habilitado para el Responsable titular asignado? -> ${!isDisabled}`);
    expect(isDisabled).toBe(false);

    const cancelBtn = page.locator('button:has-text("Cancelar")').first();
    await cancelBtn.click();
  });

  test('CP-DIST-03: Distribuidor (#55) sí puede gestionar el Estado', async ({ page }) => {
    test.setTimeout(90000);

    console.log('[Paso 1] Iniciando sesión como Matías Ippólito (Rol DISTRIBUIDOR)...');
    await robustLogin(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass, 'DISTRIBUIDOR');

    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    console.log('[Paso 2] Buscando solicitud #55...');
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('Alejandra Luque');
    await page.waitForTimeout(1000);

    const fila55 = page.locator('tr').filter({ hasText: '#55' }).first();
    await expect(fila55).toBeVisible({ timeout: 10000 });
    await fila55.locator('button[title*="Ver / Editar Detalles"]').click();

    const selectEstado = page.locator('label:has-text("Estado") + select, label:has-text("Estado") ~ select').first();
    await expect(selectEstado).toBeVisible({ timeout: 5000 });

    const isDisabled = await selectEstado.isDisabled();
    console.log(`[Paso 3] ¿Select de Estado está habilitado para Distribuidor? -> ${!isDisabled}`);
    expect(isDisabled).toBe(false);
  });

});
