import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

const CREDENTIALS = {
  DISTRIBUIDOR: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_mi6J!' }
};

const robustLogin = async (page, email, password) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  const logoutBtn = page.locator('button:has-text("Salir")');
  if (await logoutBtn.count() > 0) {
    await logoutBtn.click();
    await page.waitForURL(/.*login.*/, { timeout: 10000 });
  }

  const emailInput = page.locator('input[type="email"]');
  const passInput = page.locator('input[type="password"]');

  await emailInput.fill(email);
  await passInput.fill(password);
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL(/.*(dashboard|mis-solicitudes|select-rol).*/, { timeout: 20000 });

  const roleSelectorBtn = page.locator('[data-testid="select-role-distribuidor"]');
  if (await roleSelectorBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('[Login] Pantalla de selección de rol detectada: seleccionando DISTRIBUIDOR...');
    await roleSelectorBtn.click();
    await page.waitForURL(/.*(dashboard|mis-solicitudes).*/, { timeout: 15000 });
  }

  await page.waitForTimeout(500);
};

test.describe('Validación de ubicación en edición para Distribuidor (Casos 47 y 55)', () => {

  test('Caso 55 y 47: La ubicación y barrio no se pierden al abrir y permite guardar sin bloquear', async ({ page }) => {
    test.setTimeout(90000);

    console.log('[Paso 1] Iniciando sesión como Matías Ippólito (Distribuidor)...');
    await robustLogin(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);

    // Navegar a /mis-solicitudes que es la vista del Distribuidor
    console.log('[Paso 2] Navegando a /mis-solicitudes...');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    // ==========================================
    // PROBAR CASO 55
    // ==========================================
    console.log('[Paso 3] Buscando la solicitud #55...');
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('Alejandra Luque');
    await page.waitForTimeout(1000);

    const fila55 = page.locator('tr').filter({ hasText: '#55' }).first();
    await expect(fila55).toBeVisible({ timeout: 10000 });

    console.log('[Paso 4] Abriendo modal de edición para solicitud #55 con el lápiz...');
    const editBtn55 = fila55.locator('button[title*="Ver / Editar Detalles"]');
    await editBtn55.click();

    const modalTitle55 = page.locator('h2, [class*="font-bold"]').filter({ hasText: 'Editar Solicitud #55' }).first();
    await expect(modalTitle55).toBeVisible({ timeout: 10000 });

    // Verificar que Localidad y Barrio están inicializados correctamente
    const selectLocalidad = page.locator('select').filter({ hasText: 'Santa Fe' }).first();
    await expect(selectLocalidad).toBeVisible();
    const valLocalidad = await selectLocalidad.inputValue();
    console.log(`[Paso 5] Valor localidad Solicitud #55: "${valLocalidad}"`);
    expect(valLocalidad).toBe('Santa Fe');

    // En caso 55 la ubicación en BD es "otro"
    const selectBarrio = page.locator('label:has-text("Barrio") + select');
    const valBarrio = await selectBarrio.inputValue();
    console.log(`[Paso 6] Valor barrio Solicitud #55: "${valBarrio}"`);
    expect(valBarrio.toLowerCase()).toBe('otro');

    // Probar guardar cambios
    console.log('[Paso 7] Guardando cambios en solicitud #55...');
    const saveBtn = page.locator('button:has-text("Guardar"), button:has-text("Guardar Solicitud")').first();
    await saveBtn.click();

    // Debe mostrar toast de éxito o cerrar el modal
    await expect(page.locator('.Toastify__toast--success, div:has-text("éxito"), div:has-text("actualizada")').first()).toBeVisible({ timeout: 10000 });
    console.log('[Paso 8] Solicitud #55 guardada exitosamente sin bloquear ni pedir ubicación.');

    await page.waitForTimeout(1500);

    // ==========================================
    // PROBAR CASO 47
    // ==========================================
    console.log('[Paso 9] Buscando la solicitud #47...');
    await searchInput.fill('EEMPA');
    await page.waitForTimeout(1000);

    const fila47 = page.locator('tr').filter({ hasText: '#47' }).first();
    await expect(fila47).toBeVisible({ timeout: 10000 });

    console.log('[Paso 10] Abriendo modal de edición para solicitud #47 con el lápiz...');
    const editBtn47 = fila47.locator('button[title*="Ver / Editar Detalles"]');
    await editBtn47.click();

    const modalTitle47 = page.locator('h2, [class*="font-bold"]').filter({ hasText: 'Editar Solicitud #47' }).first();
    await expect(modalTitle47).toBeVisible({ timeout: 10000 });

    // Verificar localidad Santa Fe y barrio Candioti Sur
    const valLocalidad47 = await selectLocalidad.inputValue();
    console.log(`[Paso 11] Valor localidad Solicitud #47: "${valLocalidad47}"`);
    expect(valLocalidad47).toBe('Santa Fe');

    const valBarrio47 = await selectBarrio.inputValue();
    console.log(`[Paso 12] Valor barrio Solicitud #47: "${valBarrio47}"`);
    expect(valBarrio47).toBe('Candioti Sur');

    console.log('[Paso 13] Guardando solicitud #47...');
    await saveBtn.click();
    await expect(page.locator('.Toastify__toast--success, div:has-text("éxito"), div:has-text("actualizada")').first()).toBeVisible({ timeout: 10000 });
    console.log('[Paso 14] Solicitud #47 guardada exitosamente sin inconvenientes.');
  });

});
