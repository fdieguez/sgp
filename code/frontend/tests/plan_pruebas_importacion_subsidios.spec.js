import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8080';
const SPREADSHEET_ID = '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g';
const SHEET_NAME = 'DESA';

// Directorio para almacenar capturas de pantalla y evidencias
const EVIDENCIAS_DIR = path.resolve(__dirname, '../../../pruebas/pruebaImportacionSubsidios');

// Credenciales para la ejecución de pruebas
const CREDENTIALS = {
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' },
  RESOLUTOR_SUBSIDIO: { email: 'martinnocioni@gmail.com', pass: 'Martin_SGP_2026*' },
  OPERADOR: { email: 'celestesolari19@gmail.com', pass: 'Celeste_SGP_2026#' }
};

/**
 * Función auxiliar para iniciar sesión en SGP con soporte para selección de rol.
 */
const iniciarSesion = async (page, email, password, rolASeleccionar = null) => {
  await page.goto(`${BASE_URL}/login`, { timeout: 15000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const logoutBtn = page.locator('button:has-text("Salir")');
  if (await logoutBtn.count() > 0) {
    await logoutBtn.click();
    await page.waitForURL(/.*login.*/, { timeout: 10000 });
  }

  const emailInput = page.locator('input[type="email"]');
  const passInput = page.locator('input[type="password"]');

  await emailInput.click({ clickCount: 3 });
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await emailInput.fill(email);

  await passInput.click({ clickCount: 3 });
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await passInput.fill(password);

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

test.describe('📋 Plan de Pruebas: Sincronización e Importación de Subsidios (Planilla de Salida)', () => {
  test.describe.configure({ mode: 'serial' });

  const idUnico = Date.now().toString().slice(-5);
  let idSolicitudCaso1 = null;
  let idSolicitudCaso3 = null;

  const nombreBeneficiarioCaso1 = `Beneficiario Caso 1 Subsidio ${idUnico}`;
  const nombreBeneficiarioCaso3 = `Beneficiario Caso 3 Rechazo ${idUnico}`;

  const textoExtensoCaso2 = 'Esta es una descripción sumamente extensa redactada específicamente para validar el plan de pruebas de sincronización e importación de subsidios del SGP. El objetivo técnico fundamental consiste en corroborar que la base de datos MySQL, los controladores Spring Boot y las capas JPA persistan textos con longitud superior a 300 caracteres sin provocar fallos de truncamiento en columnas históricas ni excepciones 500.';

  test.beforeAll(async ({ request }) => {
    console.log('[SETUP] Limpiando la base de datos y la planilla externa para iniciar pruebas en estado limpio...');
    try {
      await request.post(`${BACKEND_URL}/api/test-helper/clear-all-solicitudes`);
      console.log('✅ Base de datos purgada exitosamente.');
    } catch (e) {
      console.warn('⚠️ Error al limpiar base de datos:', e.message);
    }

    try {
      await request.post(`${BACKEND_URL}/api/test-helper/clear-sheet`, {
        data: { spreadsheetId: SPREADSHEET_ID, sheetName: SHEET_NAME }
      });
      console.log('✅ Pestaña de Google Sheets limpiada exitosamente.');
    } catch (e) {
      console.warn('⚠️ Error al limpiar pestaña de Google Sheets:', e.message);
    }
  });

  // =========================================================================
  // CASO DE PRUEBA 1: Puesta en Consideración y Exportación
  // =========================================================================
  test('Caso de Prueba 1: Puesta en Consideración y Exportación', async ({ page, request }) => {
    test.setTimeout(90000);

    console.log('[Caso 1] Iniciando sesión como Administrador...');
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);

    // 1. Crear solicitud de Subsidio
    console.log('[Caso 1] Creando solicitud de Subsidio inicial...');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    // Asociar planilla DESA si es necesario
    const btnAsociar = page.locator('button:has-text("Asociar Planilla")');
    if (await btnAsociar.isVisible()) {
      await btnAsociar.click();
      await page.waitForSelector('h3:has-text("Asociar Planilla Externa")');
      await page.locator('input[placeholder*="Ej: 1jPw9ni4BW"]').fill(SPREADSHEET_ID);
      await page.locator('label:has-text("Nombre de la Hoja") + input').fill(SHEET_NAME);
      await page.locator('form button[type="submit"]:has-text("Asociar Planilla")').click();
      await expect(page.locator('text=Planilla asociada correctamente')).toBeVisible();
      await page.waitForTimeout(1000);
    }

    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('form');

    await page.locator('label:has-text("Nombre Completo") + input').fill(nombreBeneficiarioCaso1);
    await page.locator('label:has-text("Teléfono") + input').first().fill('3424001122');
    await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
    await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');

    const selectLocalidad = page.locator('label:has-text("Localidad") + select');
    await selectLocalidad.locator('option', { hasText: 'Santa Fe' }).waitFor({ state: 'attached', timeout: 15000 });
    await selectLocalidad.selectOption('Santa Fe');

    const selectBarrio = page.locator('label:has-text("Barrio") + select');
    await selectBarrio.locator('option', { hasText: 'Centro' }).waitFor({ state: 'attached', timeout: 15000 });
    await selectBarrio.selectOption('Centro');

    // Completar Zona / Eje
    const inputZona = page.locator('input[placeholder*="Auto-asignada"], label:has-text("Zona / Eje") + input').first();
    if (await inputZona.isVisible()) {
      await inputZona.fill('Norte');
    }

    await page.locator('label:has-text("Descripción / Pedido") + textarea').fill('Solicitud inicial de prueba para puesta en consideración');

    // Asignación de área SUBSIDIO
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(500);
    await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
    await page.waitForTimeout(500);

    await page.locator('label:has-text("Tipo de pedido") + select').selectOption('Personal');
    await page.locator('label:has-text("Nombre y apellido") + input').fill(nombreBeneficiarioCaso1);
    await page.locator('label:has-text("DNI") + input').first().fill('20-11223344-9');
    await page.locator('label:has-text("Monto") + input').first().fill('100000');

    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.locator('text=creada con éxito')).toBeVisible();
    await page.waitForTimeout(1500);

    // Obtener ID de la solicitud
    await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiarioCaso1);
    await page.waitForTimeout(1000);
    const filaTexto = await page.locator('tbody tr').first().innerText();
    const idMatch = filaTexto.match(/#(\d+)/);
    expect(idMatch).not.toBeNull();
    idSolicitudCaso1 = idMatch[1];
    console.log(`[Caso 1] Solicitud creada con ID: #${idSolicitudCaso1}`);

    // 2. Poner en consideración desde la interfaz
    console.log(`[Caso 1] Poniendo solicitud #${idSolicitudCaso1} en consideración...`);
    const fila = page.locator('tbody tr').filter({ hasText: nombreBeneficiarioCaso1 }).first();
    await fila.locator('input[type="checkbox"]').check();
    await page.waitForTimeout(500);

    // Click en botón Consideración en la barra de acciones flotante
    const btnConsideracionLote = page.locator('div.absolute button:has-text("Consideración")');
    page.once('dialog', dialog => dialog.accept());
    await btnConsideracionLote.click();

    await expect(page.getByText(/Se han puesto en consideración|puesta en consideración/i).first()).toBeVisible();
    await page.waitForTimeout(1500);

    // Validar badge de estado 'Consideración'
    await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiarioCaso1);
    await page.waitForTimeout(1000);
    const badgeConsideracion = page.locator('tbody tr').first().locator('span:has-text("Consideración")');
    await expect(badgeConsideracion).toBeVisible();
    console.log('✅ Estado de la solicitud cambiado a CONSIDERACIÓN en el SGP.');

    // 3. Exportar a Google Sheets
    console.log('[Caso 1] Exportando solicitud a Google Sheets...');
    const filaExport = page.locator('tbody tr').filter({ hasText: nombreBeneficiarioCaso1 }).first();
    await filaExport.locator('input[type="checkbox"]').check();
    await page.waitForTimeout(500);

    // Enviar exportación vía API directa o interacción UI
    const exportRes = await request.post(`${BACKEND_URL}/api/planilla-salida/export`, {
      headers: {
        Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}`
      },
      data: {
        spreadsheetId: SPREADSHEET_ID,
        ids: [Number(idSolicitudCaso1)]
      }
    });
    expect(exportRes.ok()).toBeTruthy();
    const exportData = await exportRes.json();
    console.log('✅ Respuesta de exportación:', exportData);
    await page.waitForTimeout(2000);

    // 4. Validar en Google Sheets que la fila fue insertada correctamente
    console.log('[Caso 1] Verificando inserción de datos en Google Sheets...');
    const readSheetRes = await request.get(`${BACKEND_URL}/api/test-helper/read-sheet`, {
      params: {
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A1:AD10`
      }
    });
    expect(readSheetRes.ok()).toBeTruthy();
    const sheetData = await readSheetRes.json();
    const rows = sheetData.data || [];
    
    // Buscar fila que contenga el ID de la solicitud
    const rowEncontrada = rows.find(r => r && r.some(cell => String(cell).trim() === String(idSolicitudCaso1)));
    expect(rowEncontrada).toBeDefined();
    console.log(`✅ Fila encontrada en Google Sheets para ID #${idSolicitudCaso1}:`, rowEncontrada);

    // Tomar captura de evidencia
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso1_consideracion_exportacion.png'), fullPage: true });
    console.log('📸 Captura guardada: caso1_consideracion_exportacion.png');
  });

  // =========================================================================
  // CASO DE PRUEBA 2: Modificación con Textos Extensos e Importación Aprobada (Monto > 0)
  // =========================================================================
  test('Caso de Prueba 2: Modificación con Textos Extensos e Importación Aprobada (Monto > 0)', async ({ page, request }) => {
    test.setTimeout(90000);

    console.log('[Caso 2] Modificando celdas en Google Sheets mediante Test Helper...');

    // 1. Modificar Descripción con texto extenso (>300 caracteres)
    const modDesc = await request.post(`${BACKEND_URL}/api/test-helper/modify-solicitud-row`, {
      data: {
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
        solicitudId: idSolicitudCaso1,
        columnName: 'DESCRIPCIÓN DEL PEDIDO',
        newValue: textoExtensoCaso2
      }
    });
    expect(modDesc.ok()).toBeTruthy();
    console.log('✅ Celda de Descripción modificada con texto extenso (>300 caracteres).');

    // 2. Modificar Monto con formato monetario '$ 150.000,00'
    const modMonto = await request.post(`${BACKEND_URL}/api/test-helper/modify-solicitud-row`, {
      data: {
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
        solicitudId: idSolicitudCaso1,
        columnName: 'MONTO EN DINERO',
        newValue: '$ 150.000,00'
      }
    });
    expect(modMonto.ok()).toBeTruthy();
    console.log('✅ Celda de Monto modificada con formato monetario "$ 150.000,00".');

    // 3. Modificar POR DONDE? con 'Senado'
    const modPorDonde = await request.post(`${BACKEND_URL}/api/test-helper/modify-solicitud-row`, {
      data: {
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
        solicitudId: idSolicitudCaso1,
        columnName: 'POR DONDE',
        newValue: 'Senado'
      }
    });
    expect(modPorDonde.ok()).toBeTruthy();
    console.log('✅ Celda de POR DONDE modificada con "Senado".');

    // Iniciar sesión como Administrador
    console.log('[Caso 2] Iniciando sesión como Administrador...');
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);

    // 4. Importar cambios desde la interfaz de SGP usando la barra de acciones
    console.log('[Caso 2] Ejecutando Importar Planilla desde SGP...');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiarioCaso1);
    await page.waitForTimeout(1000);

    const filaImport = page.locator('tbody tr').filter({ hasText: nombreBeneficiarioCaso1 }).first();
    await filaImport.locator('input[type="checkbox"]').check();
    await page.waitForTimeout(500);

    const btnImportarLote = page.locator('div.absolute button:has-text("Importar")');
    await btnImportarLote.click();

    // 5. Validar mensaje Toast de éxito
    const toastImportacion = page.getByText(/Importación selectiva|Sincronización de importación finalizada/i);
    await expect(toastImportacion.first()).toBeVisible({ timeout: 15000 });
    console.log('✅ Toast de importación exitosa visualizado.');
    await page.waitForTimeout(2000);

    // 6. Validar que no hubo error 500 y que la solicitud pasó a estado 'Resueltas' / 'Completadas'
    await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiarioCaso1);
    await page.waitForTimeout(1000);

    const badgeResuelta = page.locator('tbody tr').first().locator('span:has-text("Resuelt")');
    await expect(badgeResuelta).toBeVisible();
    console.log('✅ Solicitud pasó exitosamente a estado RESUELTAS (Aprobada).');

    // 7. Abrir el modal de detalles y verificar que el texto extenso está intacto
    const fila = page.locator('tbody tr').first();
    await fila.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('form');

    const textareaDesc = page.locator('label:has-text("Descripción / Pedido") + textarea');
    await expect(textareaDesc).toHaveValue(textoExtensoCaso2);
    console.log('✅ Descripción extensa (>300 caracteres) preservada íntegramente en la base de datos.');

    // Tomar captura de evidencia
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso2_importacion_aprobada_texto_extenso.png'), fullPage: true });
    console.log('📸 Captura guardada: caso2_importacion_aprobada_texto_extenso.png');

    await page.click('button:has-text("Cancelar")');
  });

  // =========================================================================
  // CASO DE PRUEBA 3: Importación con Desaprobación (Monto = 0)
  // =========================================================================
  test('Caso de Prueba 3: Importación con Desaprobación (Monto = 0)', async ({ page, request }) => {
    test.setTimeout(90000);

    console.log('[Caso 3] Iniciando sesión como Administrador...');
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);

    console.log('[Caso 3] Creando segunda solicitud de Subsidio para probar desaprobación...');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('form');

    await page.locator('label:has-text("Nombre Completo") + input').fill(nombreBeneficiarioCaso3);
    await page.locator('label:has-text("Teléfono") + input').first().fill('3424998877');
    await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
    await page.locator('label:text-is("Subtipo") + select').selectOption('referente');

    const selectLocalidad = page.locator('label:has-text("Localidad") + select');
    await selectLocalidad.locator('option', { hasText: 'Santa Fe' }).waitFor({ state: 'attached', timeout: 15000 });
    await selectLocalidad.selectOption('Santa Fe');

    const selectBarrio = page.locator('label:has-text("Barrio") + select');
    await selectBarrio.locator('option', { hasText: 'Centro' }).waitFor({ state: 'attached', timeout: 15000 });
    await selectBarrio.selectOption('Centro');

    const inputZona = page.locator('input[placeholder*="Auto-asignada"], label:has-text("Zona / Eje") + input').first();
    if (await inputZona.isVisible()) {
      await inputZona.fill('Norte');
    }

    await page.locator('label:has-text("Descripción / Pedido") + textarea').fill('Solicitud de prueba para rechazo automático por monto 0');

    // Asignación SUBSIDIO
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(500);
    await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
    await page.waitForTimeout(500);

    await page.locator('label:has-text("Tipo de pedido") + select').selectOption('Personal');
    await page.locator('label:has-text("Nombre y apellido") + input').fill(nombreBeneficiarioCaso3);
    await page.locator('label:has-text("DNI") + input').first().fill('20-33445566-9');
    await page.locator('label:has-text("Monto") + input').first().fill('80000');

    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.locator('text=creada con éxito')).toBeVisible();
    await page.waitForTimeout(1500);

    // Obtener ID Caso 3
    await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiarioCaso3);
    await page.waitForTimeout(1000);
    const filaTexto = await page.locator('tbody tr').first().innerText();
    const idMatch = filaTexto.match(/#(\d+)/);
    expect(idMatch).not.toBeNull();
    idSolicitudCaso3 = idMatch[1];
    console.log(`[Caso 3] Solicitud creada con ID: #${idSolicitudCaso3}`);

    // Poner en consideración
    const filaCaso3 = page.locator('tbody tr').filter({ hasText: nombreBeneficiarioCaso3 }).first();
    await filaCaso3.locator('input[type="checkbox"]').check();
    await page.waitForTimeout(500);

    const btnConsideracionLote = page.locator('div.absolute button:has-text("Consideración")');
    page.once('dialog', dialog => dialog.accept());
    await btnConsideracionLote.click();
    await expect(page.getByText(/Se han puesto en consideración|puesta en consideración/i).first()).toBeVisible();
    await page.waitForTimeout(1500);

    // Exportar a Google Sheets
    const exportRes = await request.post(`${BACKEND_URL}/api/planilla-salida/export`, {
      headers: {
        Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}`
      },
      data: {
        spreadsheetId: SPREADSHEET_ID,
        ids: [Number(idSolicitudCaso3)]
      }
    });
    expect(exportRes.ok()).toBeTruthy();
    await page.waitForTimeout(2000);

    // Modificar celda Monto a '$ 0,00'
    console.log('[Caso 3] Modificando celda de Monto a "$ 0,00" en Google Sheets...');
    const modMontoCero = await request.post(`${BACKEND_URL}/api/test-helper/modify-solicitud-row`, {
      data: {
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
        solicitudId: idSolicitudCaso3,
        columnName: 'MONTO EN DINERO',
        newValue: '$ 0,00'
      }
    });
    expect(modMontoCero.ok()).toBeTruthy();
    console.log('✅ Monto fijado en "$ 0,00" para simular desaprobación.');

    // Ejecutar importación selectiva
    console.log('[Caso 3] Ejecutando Importar Planilla...');
    await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiarioCaso3);
    await page.waitForTimeout(1000);

    const filaImport3 = page.locator('tbody tr').filter({ hasText: nombreBeneficiarioCaso3 }).first();
    await filaImport3.locator('input[type="checkbox"]').check();
    await page.waitForTimeout(500);

    const btnImportarLote = page.locator('div.absolute button:has-text("Importar")');
    await btnImportarLote.click();

    await expect(page.getByText(/Importación selectiva|Sincronización de importación finalizada/i).first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);

    // Validar cambio automático a estado 'Rechazado'
    await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiarioCaso3);
    await page.waitForTimeout(1000);

    const badgeRechazado = page.locator('tbody tr').first().locator('span:has-text("Rechazad")');
    await expect(badgeRechazado).toBeVisible();
    console.log('✅ Solicitud cambió automáticamente su estado a RECHAZADO (Desaprobada por monto 0).');

    // Tomar captura de evidencia
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso3_importacion_desaprobacion_monto_cero.png'), fullPage: true });
    console.log('📸 Captura guardada: caso3_importacion_desaprobacion_monto_cero.png');
  });

  // =========================================================================
  // CASO DE PRUEBA 4: Tolerancia de Encabezados de Columna
  // =========================================================================
  test('Caso de Prueba 4: Tolerancia de Encabezados de Columna', async ({ page, request }) => {
    test.setTimeout(45000);

    console.log('[Caso 4] Iniciando sesión como Administrador...');
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);

    console.log('[Caso 4] Validando tolerancia de encabezados y ejecución de importación...');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    // Ejecutar importación directa vía API y validar código 200 sin error de encabezados
    const importRes = await request.post(`${BACKEND_URL}/api/planilla-salida/import`, {
      headers: {
        Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}`
      },
      data: {
        spreadsheetId: SPREADSHEET_ID
      }
    });
    expect(importRes.ok()).toBeTruthy();
    const importData = await importRes.json();
    expect(importData.success).toBeTruthy();
    console.log('✅ Importación exitosa sin errores de encabezados:', importData.message);

    // Tomar captura de evidencia
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso4_tolerancia_encabezados.png'), fullPage: true });
    console.log('📸 Captura guardada: caso4_tolerancia_encabezados.png');
  });
});
