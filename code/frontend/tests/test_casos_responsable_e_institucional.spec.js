import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = 'http://localhost:8080';

const ADMIN_EMAIL = 'admin@sgp.com';
const ADMIN_PASSWORDS = ['SGP_Admin_#J57f_Prod_Secure_!', 'SGP_Admin_#gAfU_Prod_Secure_!', 'SGP_Admin_#2026_Prod_Secure_!'];

const TEST_RESP = {
  email: 'test.resp.e2e@sgp.com',
  password: 'Test_SGP_2026!',
  firstName: 'Responsable',
  lastName: 'E2E',
  role: 'RESPONSABLE',
  zone: 'NORTE',
  dni: '99111222',
  phone: '3425000999'
};

// Inicia sesión mediante la UI
const iniciarSesion = async (page, email, password, rolASeleccionar = null) => {
  await page.goto(`${BASE_URL}/login`, { timeout: 15000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);

  const botonSalir = page.locator('button:has-text("Salir")');
  if (await botonSalir.count() > 0) {
    await botonSalir.click();
    await page.waitForURL(/.*login.*/, { timeout: 10000 });
  }

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|select-rol|resolutor-settings).*/, { timeout: 10000 });

  if (page.url().includes('select-rol') && rolASeleccionar) {
    await page.locator(`button:has-text("${rolASeleccionar}")`).first().click();
    await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|resolutor-settings).*/, { timeout: 10000 });
  }
};

test.describe('Validación de casos reportados: Responsable en derivados y Subsidio Institucional en especie', () => {
  let adminPass = ADMIN_PASSWORDS[0];

  test.beforeAll(async ({ request }) => {
    let token = null;
    for (const p of ADMIN_PASSWORDS) {
      const res = await request.post(`${API_URL}/api/auth/login`, {
        data: { email: ADMIN_EMAIL, password: p }
      });
      if (res.ok()) {
        const body = await res.json();
        token = body.token;
        adminPass = p;
        break;
      }
    }
    expect(token).toBeTruthy();

    // Crear el usuario Responsable de prueba local si no existe
    const usersRes = await request.get(`${API_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const users = await usersRes.json();
    const existente = users.find(u => u.email === TEST_RESP.email);
    if (!existente) {
      const createRes = await request.post(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
        data: TEST_RESP
      });
      expect(createRes.ok()).toBeTruthy();
    }
  });

  test('Caso 1: Responsable puede cargar asignación de Subsidio en un caso derivado por otro usuario', async ({ page }) => {
    const sufijo = Date.now();
    const nombreSolicitante = `Derivado Subsidio ${sufijo}`;

    // 1. Admin crea la solicitud y la deriva al Responsable de prueba
    await iniciarSesion(page, ADMIN_EMAIL, adminPass, 'ADMINISTRADOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    await page.locator('button:has-text("Nueva Solicitud")').click();
    let modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Nueva Solicitud' }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    await modal.locator('input[placeholder*="Buscar por nombre o DNI"]').fill(nombreSolicitante);
    await modal.locator('label:text-is("Teléfono") + input').fill('3425001122');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption('Institucional');
    await modal.locator('label:text-is("Subtipo Institucional") + select').selectOption('Club');
    await modal.locator('label:text-is("Localidad") + select').selectOption('Santa Fe');
    await page.waitForTimeout(200);
    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });
    await modal.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Caso derivado prueba ${sufijo}`);

    // Seleccionar Zona Territorial para habilitar el combo de Responsable
    const selectZonaAsig = modal.locator('label:text-is("Zona Territorial") + select');
    await selectZonaAsig.selectOption('NORTE');
    await page.waitForTimeout(300);

    const selectResp = modal.locator('label:text-is("Responsable") + select');
    const opciones = await selectResp.locator('option').all();
    let valorResp = null;
    for (const opt of opciones) {
      const txt = await opt.innerText();
      if (txt.toLowerCase().includes('e2e') || txt.toLowerCase().includes('responsable e2e')) {
        valorResp = await opt.getAttribute('value');
        break;
      }
    }
    expect(valorResp).toBeTruthy();
    await selectResp.selectOption(valorResp);

    await modal.locator('button:has-text("Guardar Solicitud")').click();
    await expect(modal).toHaveCount(0, { timeout: 15000 });

    // 2. Ingresar como Responsable y abrir el caso derivado
    await iniciarSesion(page, TEST_RESP.email, TEST_RESP.password);
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    const buscador = page.locator('input[placeholder*="Buscar por N° Orden"]');
    await buscador.fill(nombreSolicitante);
    await page.waitForTimeout(800);

    const fila = page.locator('tbody tr').filter({ hasText: nombreSolicitante }).first();
    await expect(fila).toBeVisible({ timeout: 10000 });
    await fila.locator('button[title="Ver / Editar Detalles"]').click();

    modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Editar Solicitud' }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Agregar asignación de Subsidio
    const btnAgregar = modal.locator('button:has-text("Agregar")').last();
    await expect(btnAgregar).toBeEnabled();
    await btnAgregar.click();
    await page.waitForTimeout(300);

    const selectArea = modal.locator('select').filter({ hasText: 'Seleccione Área' }).last();
    await expect(selectArea).toBeEnabled();
    const opcionesArea = await selectArea.locator('option').allInnerTexts();
    const opcionSubsidio = opcionesArea.find(o => o.toUpperCase().includes('SUBSIDIO'));
    expect(opcionSubsidio).toBeTruthy();
    await selectArea.selectOption({ label: opcionSubsidio });
    await page.waitForTimeout(400);

    // Verificar que los campos de la resolución de subsidio NO estén bloqueados
    const inputsAsignacion = modal.locator('div.bg-gray-800\\/80 input:not([type="file"]), div.bg-gray-800\\/80 textarea, div.bg-gray-800\\/80 select');
    const cantidadInputs = await inputsAsignacion.count();
    expect(cantidadInputs).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(cantidadInputs, 5); i++) {
      await expect(inputsAsignacion.nth(i)).toBeEnabled();
    }

    // Verificar que el botón de eliminar asignación esté visible
    await expect(modal.locator('button[title="Eliminar asignación"]').last()).toBeVisible();

    // Guardar como Responsable y confirmar persistencia
    await modal.locator('button:has-text("Guardar Solicitud")').click();
    await expect(modal).toHaveCount(0, { timeout: 15000 });

    // Reabrir y verificar que la asignación se guardó en BD
    await buscador.fill(nombreSolicitante);
    await page.waitForTimeout(800);
    await page.locator('tbody tr').filter({ hasText: nombreSolicitante }).first().locator('button[title="Ver / Editar Detalles"]').click();
    modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Editar Solicitud' }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('select').filter({ hasText: 'Seleccione Área' }).first()).not.toHaveValue('');
    await expect(modal.locator('div.bg-gray-800\\/80')).toBeVisible();
  });

  test('Caso 2: Nueva solicitud Institucional con Subsidio en Especie permite guardar SIN DNI', async ({ page }) => {
    const sufijo = Date.now();
    const nombreClub = `Club Vecinal Prueba ${sufijo}`;

    await iniciarSesion(page, TEST_RESP.email, TEST_RESP.password);
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    await page.locator('button:has-text("Nueva Solicitud")').click();
    const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Nueva Solicitud' }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    await modal.locator('input[placeholder*="Buscar por nombre o DNI"]').fill(nombreClub);
    await modal.locator('label:text-is("Teléfono") + input').fill('3424112233');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption('Institucional');
    await modal.locator('label:text-is("Subtipo Institucional") + select').selectOption('Club');
    await modal.locator('label:text-is("Localidad") + select').selectOption('Santa Fe');
    await page.waitForTimeout(200);
    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });
    await modal.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Ayuda institucional en especie ${sufijo}`);

    // Seleccionar Subsidio en Especie en Asignaciones Múltiples
    await modal.locator('button:has-text("Agregar")').last().click();
    await page.waitForTimeout(300);
    const selectArea = modal.locator('select').filter({ hasText: 'Seleccione Área' }).last();
    const opcionesArea = await selectArea.locator('option').allInnerTexts();
    const opcionEspecie = opcionesArea.find(o => o.toUpperCase().includes('ESPECIE'));
    expect(opcionEspecie).toBeTruthy();
    await selectArea.selectOption({ label: opcionEspecie });
    await page.waitForTimeout(300);

    // Guardar SIN cargar DNI -> No debe mostrar el error de DNI obligatorio
    await modal.locator('button:has-text("Guardar Solicitud")').click();
    await expect(page.locator('text=El DNI del solicitante/beneficiario es obligatorio para tramitar un subsidio.')).toHaveCount(0);
    await expect(modal).toHaveCount(0, { timeout: 15000 });
  });

  test('Caso 3 (Regresión): Nueva solicitud Personal con Subsidio en Dinero SÍ exige DNI', async ({ page }) => {
    const sufijo = Date.now();

    await iniciarSesion(page, TEST_RESP.email, TEST_RESP.password);
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    await page.locator('button:has-text("Nueva Solicitud")').click();
    const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Nueva Solicitud' }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    await modal.locator('input[placeholder*="Buscar por nombre o DNI"]').fill(`Persona Subsidio ${sufijo}`);
    await modal.locator('label:text-is("Teléfono") + input').fill('3424998877');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption('Personal');
    await modal.locator('label:text-is("Subtipo Personal") + select').selectOption('joven');
    await modal.locator('label:text-is("Localidad") + select').selectOption('Santa Fe');
    await page.waitForTimeout(200);
    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });
    await modal.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Subsidio personal sin DNI ${sufijo}`);

    // Seleccionar Subsidio en Dinero
    await modal.locator('button:has-text("Agregar")').last().click();
    await page.waitForTimeout(300);
    const selectArea = modal.locator('select').filter({ hasText: 'Seleccione Área' }).last();
    const opcionesArea = await selectArea.locator('option').allInnerTexts();
    const opcionDinero = opcionesArea.find(o => o.toUpperCase().includes('DINERO') || o.toUpperCase() === 'SUBSIDIO');
    expect(opcionDinero).toBeTruthy();
    await selectArea.selectOption({ label: opcionDinero });
    await page.waitForTimeout(300);

    // Intentar guardar sin DNI -> Debe exigir DNI
    await modal.locator('button:has-text("Guardar Solicitud")').click();
    await expect(page.locator('text=El DNI del solicitante/beneficiario es obligatorio para tramitar un subsidio.')).toBeVisible({ timeout: 6000 });
  });

});
