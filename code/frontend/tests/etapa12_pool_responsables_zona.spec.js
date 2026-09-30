import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8080';

// Credenciales para la ejecución de pruebas
const CREDENTIALS = {
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' },
  DISTRIBUIDOR: { email: 'fy.vildoza@gmail.com', pass: 'password123' },
  RESPONSABLE_NORTE: { email: 'adflucha@gmail.com', pass: 'password123' },
  RESPONSABLE_OTRA: { email: 'carinacdevard@gmail.com', pass: 'password123' }
};

/**
 * Función auxiliar para iniciar sesión en SGP
 */
const iniciarSesion = async (page, email, password, rolASeleccionar = null) => {
  await page.goto(`${BASE_URL}/login`, { timeout: 15000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const logoutBtn = page.locator('button:has-text("Salir")');
  if (await logoutBtn.count() > 0) {
    await logoutBtn.click();
    await page.waitForURL(/.*login.*/, { timeout: 10000 });
  }

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|select-rol).*/, { timeout: 15000 });
  await page.waitForTimeout(500);

  if (page.url().includes('/select-rol')) {
    if (rolASeleccionar) {
      await page.click(`button:has-text("${rolASeleccionar}")`);
    } else {
      await page.locator('.grid button').first().click();
    }
    await page.waitForURL(/.*(dashboard|mis-solicitudes|settings).*/, { timeout: 15000 });
    await page.waitForTimeout(500);
  }
};

test.describe('📋 Plan de Pruebas: Etapa 2 - Pool Territorial y Autoasignación de Solicitudes', () => {
  test.describe.configure({ mode: 'serial' });

  let solicitudIdCreada = null;
  const nombreBeneficiario = `Beneficiario Pool ${Date.now().toString().slice(-4)}`;

  test('TC-POOL-01: Administrador/Distribuidor crea solicitud con Zona y sin responsable asignado', async ({ page }) => {
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass, 'ADMINISTRADOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // Abrir modal de nueva solicitud
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")');

    // Completar datos básicos
    await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(nombreBeneficiario);
    await page.locator('label:text-is("Teléfono") + input').fill('3424000111');
    await page.locator('label:text-is("Tipo Solicitante") + select').selectOption('Club');
    await page.locator('label:text-is("Localidad") + select').selectOption({ index: 1 });
    await page.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });
    await page.locator('label:text-is("Descripción / Pedido") + textarea').fill('Solicitud de prueba para pool de zona territorial');

    // Seleccionar Zona y dejar Responsable en Pool
    const zoneSelect = page.locator('select').filter({ hasText: 'Seleccionar Zona' }).or(page.locator('label:has-text("Zona Territorial") + select'));
    if (await zoneSelect.count() > 0) {
      const options = await zoneSelect.locator('option').allTextContents();
      const firstValidZone = options.find(o => o && !o.includes('Seleccionar Zona'));
      if (firstValidZone) {
        await zoneSelect.selectOption({ label: firstValidZone });
      }
    }

    // Guardar solicitud
    await page.click('button:has-text("Guardar Solicitud")');
    await page.waitForTimeout(1500);

    // Verificar que aparece en la tabla con badge de Pool
    await page.locator('input[placeholder*="Buscar"]').fill(nombreBeneficiario);
    await page.waitForTimeout(800);

    const row = page.locator('tr', { hasText: nombreBeneficiario }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('Pool:');
  });

  test('TC-POOL-02: Endpoint atómico de autoasignación (/api/solicitudes/{id}/tomar) funciona correctamente', async ({ request }) => {
    // Login como admin para probar endpoint y buscar la solicitud
    const loginRes = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: CREDENTIALS.ADMIN.email, password: CREDENTIALS.ADMIN.pass }
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const token = loginData.token;

    // Buscar la solicitud recién creada por la API
    const res = await request.get(`${BACKEND_URL}/api/solicitudes?search=${encodeURIComponent(nombreBeneficiario)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.content.length).toBeGreaterThan(0);
    solicitudIdCreada = data.content[0].id;

    // Tomar solicitud
    const tomarRes = await request.post(`${BACKEND_URL}/api/solicitudes/${solicitudIdCreada}/tomar`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(tomarRes.ok()).toBeTruthy();
    const updated = await tomarRes.json();
    expect(updated.responsable).not.toBeNull();
    expect(updated.status).toBe('en proceso');
  });

  test('TC-POOL-03: Auditoría registra la acción AUTOASIGNADO', async ({ request }) => {
    // Login
    const loginRes = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: CREDENTIALS.ADMIN.email, password: CREDENTIALS.ADMIN.pass }
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    const resHistorial = await request.get(`${BACKEND_URL}/api/solicitudes/${solicitudIdCreada}/historial`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(resHistorial.ok()).toBeTruthy();
    const historial = await resHistorial.json();
    const autoasignadoEvent = historial.find(h => h.actionType === 'AUTOASIGNADO');
    expect(autoasignadoEvent).toBeDefined();
  });
});
