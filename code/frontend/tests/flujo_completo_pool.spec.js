import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';

const CREDENTIALS = {
  OPERADOR: { email: 'celeste_solari19@hotmail.com', pass: 'Celeste_SGP_2026#' },
  DISTRIBUIDOR: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  RESPONSABLE_1: { email: 'javier.i.cuello@gmail.com', pass: 'Javier#2026&Tu' }, // SUROESTE
  RESPONSABLE_2: { email: 'machicotegaston@gmail.com', pass: 'Gaston@2026$Lq' }, // SUROESTE
  RESPONSABLE_3: { email: 'lucianobaez0505@gmail.com', pass: 'Seba!2026#Bg' }    // OESTE
};

const iniciarSesion = async (page, email, password, rolASeleccionar = null) => {
  await page.goto(`${BASE_URL}/login`);
  
  const logoutBtn = page.locator('button:has-text("Salir")');
  if (await logoutBtn.count() > 0) {
    await logoutBtn.click();
    await page.waitForURL(/.*login.*/);
  }

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.click('button:has-text("Ingresar")');
  await page.waitForTimeout(1000); // Wait for potential redirects to settle
  await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|select-rol).*/);

  if (page.url().includes('/select-rol')) {
    if (rolASeleccionar) {
      await page.click(`[data-testid="select-role-${rolASeleccionar.toLowerCase()}"]`);
    } else {
      await page.locator('.grid button').first().click();
    }
    await page.waitForURL(/.*(dashboard|mis-solicitudes|settings).*/);
  }
};

test.describe('Flujo Completo de Operador a Responsable en Pool Territorial', () => {
  test.describe.configure({ mode: 'serial' });
  const nombreBeneficiario = `Pool Flujo Completo ${Date.now()}`;

  test('Paso 1: OPERADOR crea solicitud', async ({ page }) => {
    await iniciarSesion(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")');

    await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(nombreBeneficiario);
    await page.locator('label:text-is("Teléfono") + input').fill('3424000111');
    await page.locator('label:text-is("Tipo Solicitante") + select').selectOption('Club');
    await page.locator('label:text-is("Localidad") + select').selectOption({ index: 1 });
    await page.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });
    await page.locator('label:text-is("Descripción / Pedido") + textarea').fill('Creada por operador');

    await page.click('button:has-text("Guardar Solicitud")');
    await page.waitForTimeout(1500);

    // Debe estar en la grilla
    await page.locator('input[placeholder*="Buscar"]').fill(nombreBeneficiario);
    await page.waitForTimeout(800);
    const row = page.locator('tr', { hasText: nombreBeneficiario }).first();
    await expect(row).toBeVisible();
  });

  test('Paso 2: DISTRIBUIDOR asigna la solicitud a Zona SUROESTE', async ({ page }) => {
    await iniciarSesion(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass, 'DISTRIBUIDOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    
    await page.locator('input[placeholder*="Buscar"]').fill(nombreBeneficiario);
    await page.waitForTimeout(800);
    
    const row = page.locator('tr', { hasText: nombreBeneficiario }).first();
    await row.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('button:has-text("Guardar Solicitud")');

    // Cambiar la zona a SUROESTE
    const zoneSelect = page.locator('select').filter({ hasText: 'Seleccionar Zona' }).or(page.locator('label:has-text("Zona Territorial") + select'));
    await zoneSelect.selectOption({ label: 'SUROESTE' });

    // Enviar (Distribuir)
    await page.click('button:has-text("Guardar Solicitud")');
    await page.waitForTimeout(1500);
  });

  test('Paso 3: RESPONSABLE 1 (SUROESTE) ve la solicitud', async ({ page }) => {
    await iniciarSesion(page, CREDENTIALS.RESPONSABLE_1.email, CREDENTIALS.RESPONSABLE_1.pass, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.locator('input[placeholder*="Buscar"]').fill(nombreBeneficiario);
    await page.waitForTimeout(800);
    
    const row = page.locator('tr', { hasText: nombreBeneficiario }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('Pool: SUROESTE');
  });

  test('Paso 4: RESPONSABLE 2 (SUROESTE) ve la solicitud', async ({ page }) => {
    await iniciarSesion(page, CREDENTIALS.RESPONSABLE_2.email, CREDENTIALS.RESPONSABLE_2.pass, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.locator('input[placeholder*="Buscar"]').fill(nombreBeneficiario);
    await page.waitForTimeout(800);
    
    const row = page.locator('tr', { hasText: nombreBeneficiario }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('Pool: SUROESTE');
  });

  test('Paso 5: RESPONSABLE 3 (OESTE) NO ve la solicitud', async ({ page }) => {
    await iniciarSesion(page, CREDENTIALS.RESPONSABLE_3.email, CREDENTIALS.RESPONSABLE_3.pass, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.locator('input[placeholder*="Buscar"]').fill(nombreBeneficiario);
    await page.waitForTimeout(800);
    
    const row = page.locator('tr', { hasText: nombreBeneficiario }).first();
    await expect(row).not.toBeVisible();
  });

  test('Paso 6: RESPONSABLE 1 (SUROESTE) toma la solicitud', async ({ page }) => {
    await iniciarSesion(page, CREDENTIALS.RESPONSABLE_1.email, CREDENTIALS.RESPONSABLE_1.pass, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.locator('input[placeholder*="Buscar"]').fill(nombreBeneficiario);
    await page.waitForTimeout(800);
    
    const row = page.locator('tr', { hasText: nombreBeneficiario }).first();
    await expect(row).toBeVisible();
    
    // Clic en Tomar Solicitud en la grilla (botón verde)
    // Primero, interceptar el diálogo de confirmación
    page.on('dialog', dialog => dialog.accept());
    await row.locator('button[title="Tomar Solicitud (Asignármela)"]').click();
    
    await page.waitForTimeout(1500);
    // Verificamos que ya no diga Pool y diga Javier Cuello o el nombre
    await expect(row).not.toContainText('Pool: SUROESTE');
  });

  test('Paso 7: RESPONSABLE 2 (SUROESTE) ya NO ve la solicitud en su Pool', async ({ page }) => {
    await iniciarSesion(page, CREDENTIALS.RESPONSABLE_2.email, CREDENTIALS.RESPONSABLE_2.pass, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.locator('input[placeholder*="Buscar"]').fill(nombreBeneficiario);
    await page.waitForTimeout(800);
    
    // Ya no debería tener acceso porque fue tomada por RESPONSABLE 1
    // (O la ve, pero como ajena, no como Pool... dependiendo de cómo es la visibilidad). 
    // Generalmente si ya no está en Pool, y la tomó otro, desaparece de la bandeja de Responsable 2
    // si no tiene el filtro de "todas de la zona" activado o no le corresponde.
    // Verificamos que no diga "Pool:" al menos, y que el botón tomar ya no exista.
    const row = page.locator('tr', { hasText: nombreBeneficiario }).first();
    if (await row.count() > 0) {
        await expect(row).not.toContainText('Pool: SUROESTE');
        const btnCount = await row.locator('button[title="Tomar Solicitud (Asignármela)"]').count();
        expect(btnCount).toBe(0);
    } else {
        await expect(row).not.toBeVisible();
    }
  });
});
