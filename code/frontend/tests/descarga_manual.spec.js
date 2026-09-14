import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5173';

const CREDENTIALS = {
  email: 'admin@sgp.com',
  password: 'SGP_Admin_#2026_Prod_Secure_!'
};

test.describe('Plan de Pruebas: Verificación de Descarga del Manual de Usuario SGP (/help)', () => {

  const login = async (page) => {
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('activeRole');
    });
    await page.goto(`${BASE_URL}/login`);

    const emailInput = page.locator('input[type="email"]');
    const passInput = page.locator('input[type="password"]');

    await emailInput.fill(CREDENTIALS.email);
    await passInput.fill(CREDENTIALS.password);
    await page.click('button:has-text("Ingresar")');
    await page.waitForURL(/.*(dashboard|mis-solicitudes|help).*/, { timeout: 15000 });
  };

  test('TC-HELP-01: Renderizado del Centro de Ayuda y Componentes del Manual', async ({ page }) => {
    console.log('[TC-HELP-01] Iniciando sesión y navegando a /help...');
    await login(page);

    await page.goto(`${BASE_URL}/help`);
    await page.waitForLoadState('networkidle');

    // 1. Cabecera principal
    console.log('[TC-HELP-01] Validando cabecera "Centro de Ayuda SGP"...');
    const headerTitle = page.locator('h1:has-text("Centro de Ayuda SGP")');
    await expect(headerTitle).toBeVisible();

    // 2. Botón de cabecera
    console.log('[TC-HELP-01] Validando botón de cabecera "Descargar Manual Oficial (PDF)"...');
    const btnCabecera = page.locator('a:has-text("Descargar Manual Oficial (PDF)")');
    await expect(btnCabecera).toBeVisible();
    await expect(btnCabecera).toHaveAttribute('href', '/Manual_de_Usuario_SGP.pdf');
    await expect(btnCabecera).toHaveAttribute('download', 'Manual_de_Usuario_SGP.pdf');

    // 3. Banner destacado y badge
    console.log('[TC-HELP-01] Validando banner destacado y badge...');
    const badgeOficial = page.locator('span:has-text("Documentación Oficial Actualizada")');
    await expect(badgeOficial).toBeVisible();

    const btnPrincipal = page.locator('a:has-text("Descargar Manual Completo (PDF)")');
    await expect(btnPrincipal).toBeVisible();
    await expect(btnPrincipal).toHaveAttribute('href', '/Manual_de_Usuario_SGP.pdf');
    await expect(btnPrincipal).toHaveAttribute('download', 'Manual_de_Usuario_SGP.pdf');

    console.log('✅ [TC-HELP-01] Todos los componentes del Centro de Ayuda y del Manual fueron verificados exitosamente.');
  });

  test('TC-HELP-02: Descarga e Integridad del Archivo PDF', async ({ page, request }) => {
    console.log('[TC-HELP-02] Verificando descarga directa e integridad del PDF...');

    // 1. Petición HTTP al archivo en el frontend
    const response = await request.get(`${BASE_URL}/Manual_de_Usuario_SGP.pdf`);
    expect(response.status()).toBe(200);
    console.log(`[TC-HELP-02] Respuesta HTTP recibida: ${response.status()} OK`);

    const headers = response.headers();
    const contentType = headers['content-type'] || '';
    console.log(`[TC-HELP-02] Content-Type: ${contentType}`);

    const buffer = await response.body();
    const sizeBytes = buffer.length;
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    console.log(`[TC-HELP-02] Tamaño del archivo recibido: ${sizeBytes} bytes (~${sizeMB} MB)`);

    // El archivo debe superar los 2 MB (~2.3 MB)
    expect(sizeBytes).toBeGreaterThan(2 * 1024 * 1024);

    // 2. Validar firma mágica %PDF-
    const headerMagic = buffer.slice(0, 5).toString('ascii');
    console.log(`[TC-HELP-02] Encabezado del archivo (firma mágica): "${headerMagic}"`);
    expect(headerMagic).toBe('%PDF-');

    // 3. Prueba de descarga mediante interacción en el navegador
    await login(page);
    await page.goto(`${BASE_URL}/help`);
    await page.waitForLoadState('networkidle');

    console.log('[TC-HELP-02] Disparando evento de descarga en el navegador con botón principal...');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('a:has-text("Descargar Manual Completo (PDF)")')
    ]);

    const suggestedFilename = download.suggestedFilename();
    console.log(`[TC-HELP-02] Nombre de archivo sugerido para descarga: "${suggestedFilename}"`);
    expect(suggestedFilename).toBe('Manual_de_Usuario_SGP.pdf');

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const downloadedStats = fs.statSync(downloadPath);
    console.log(`[TC-HELP-02] Archivo guardado localmente: ${downloadedStats.size} bytes`);
    expect(downloadedStats.size).toBeGreaterThan(2 * 1024 * 1024);

    console.log('✅ [TC-HELP-02] Descarga e integridad del PDF validadas exitosamente.');
  });

  test('TC-HELP-03: Consola Limpia sin Errores', async ({ page }) => {
    console.log('[TC-HELP-03] Monitoreando consola del navegador en /help...');
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err.message);
    });

    await login(page);
    await page.goto(`${BASE_URL}/help`);
    await page.waitForLoadState('networkidle');

    // Navegar y explorar elementos interactivos
    await page.waitForTimeout(1000);

    console.log(`[TC-HELP-03] Errores de consola registrados: ${consoleErrors.length}`);
    console.log(`[TC-HELP-03] Excepciones de página registradas: ${pageErrors.length}`);

    if (consoleErrors.length > 0) {
      console.warn('[TC-HELP-03] Detalle de errores en consola:', consoleErrors);
    }
    if (pageErrors.length > 0) {
      console.warn('[TC-HELP-03] Detalle de excepciones:', pageErrors);
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);

    console.log('✅ [TC-HELP-03] Navegación y renderizado en /help con consola 100% limpia.');
  });

});
