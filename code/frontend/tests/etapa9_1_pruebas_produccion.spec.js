import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URL de producción y credenciales oficiales
const BASE_URL = 'https://solicitudes.ultrasoft.website';
const CREDENTIALS = {
  OPERADOR: { email: 'celestesolari19@gmail.com', pass: 'Celeste_SGP_2026#' },
  DISTRIBUIDOR: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  RESPONSABLE: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  RESOLUTOR_SUBSIDIO: { email: 'martinnocioni@gmail.com', pass: 'Martin_SGP_2026*' },
  RESOLUTOR_AGENDA: { email: 'mvgonza79@gmail.com', pass: 'Maria_SGP_2026%' },
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' }
};

const SPREADSHEET_ID = '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g';
const SHEET_NAME = 'TEST';

// Función auxiliar para login con redirección de multirol
const iniciarSesion = async (page, email, password, rolASeleccionar = null) => {
  let intentos = 3;
  while (intentos > 0) {
    try {
      await page.goto(`${BASE_URL}/login`, { timeout: 30000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      break;
    } catch (e) {
      intentos--;
      console.log(`[QA] Reintentando carga de login... Intentos restantes: ${intentos}`);
      if (intentos === 0) throw e;
      await page.waitForTimeout(3000);
    }
  }

  // Si ya está logueado, cerrar sesión
  const logoutBtn = page.locator('button:has-text("Salir")');
  if (await logoutBtn.count() > 0) {
    await logoutBtn.click();
    await page.waitForURL(/.*login.*/, { timeout: 15000 });
  }

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|select-rol).*/, { timeout: 25000 });
  await page.waitForTimeout(1000);

  if (page.url().includes('/select-rol')) {
    if (rolASeleccionar) {
      await page.click(`button:has-text("${rolASeleccionar}")`);
    } else {
      await page.locator('.grid button').first().click();
    }
    await page.waitForURL(/.*(dashboard|mis-solicitudes|settings).*/, { timeout: 20000 });
    await page.waitForTimeout(1000);
  }
};

test.describe('Pruebas de Calidad y Regresión en Producción SGP (v1.0)', () => {
  test.describe.configure({ mode: 'serial' });

  // 1. Probar 3 solicitudes de tipo Subsidio
  test('Caso 1: Flujo Completo de 3 Solicitudes de Subsidio con Importación', async ({ page }) => {
    test.setTimeout(240000);
    const idsCreados = [];

    // Crear 3 solicitudes como Operador
    console.log('[QA] Creando 3 solicitudes como Operador...');
    for (let i = 1; i <= 3; i++) {
      await iniciarSesion(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.click('button:has-text("Nueva Solicitud")');

      const rand = Math.floor(Math.random() * 900000) + 100000;
      const benefName = `Subsidio E2E Prod ${rand}`;

      await page.locator('label:has-text("Nombre Completo / Institución") + input').fill(benefName);
      await page.locator('label:has-text("Teléfono") + input').first().fill('3424001122');
      await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Solicitud de subsidio de prueba número ${i} - ${rand}`);
      await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
      await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');
      await page.locator('input[placeholder*="Ej: Santa Fe"]').fill('Santa Fe');
      await page.waitForTimeout(1000);
      await page.locator('input[placeholder*="Ej: Santa Fe"]').press('ArrowDown');
      await page.locator('input[placeholder*="Ej: Santa Fe"]').press('Enter');
      await page.waitForTimeout(500);
 
      await page.locator('label:has-text("Barrio")').locator('..').locator('input').first().fill('Centro');
      await page.waitForTimeout(500);
 
      await page.click('button:has-text("Guardar Solicitud")');
      
      // Obtener el ID de la solicitud creada con captura de errores de validación
      let solicitudId = null;
      try {
        const toastSuccess = page.locator('text=creada con éxito');
        await expect(toastSuccess).toBeVisible({ timeout: 8000 });
        const toastText = await toastSuccess.innerText();
        const match = toastText.match(/#(\d+)/);
        solicitudId = match ? match[1] : null;
      } catch (err) {
        console.error(`[QA] Error al guardar la solicitud ${i}. Inspeccionando mensajes de error en pantalla...`);
        const validationErrors = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('*'))
            .map(el => el.innerText)
            .filter(text => text && (text.toLowerCase().includes('obligatorio') || text.toLowerCase().includes('error')));
        });
        console.error('[QA] Errores/Toasts detectados:', validationErrors.slice(0, 10));
        throw err;
      }
      
      expect(solicitudId).not.toBeNull();
      idsCreados.push(solicitudId);
      console.log(`[QA] Solicitud creada exitosamente con ID: ${solicitudId}`);
    }

    // Distribuidor asigna responsable
    console.log('[QA] Distribuidor asigna Responsable y Zona a las 3 solicitudes...');
    for (const id of idsCreados) {
      await iniciarSesion(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass, 'DISTRIBUIDOR');
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar por N° Orden"]', id);
      await expect(page.locator('tbody tr').first().locator('td').nth(1)).toHaveText(`#${id}`, { timeout: 15000 });
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
      await page.waitForTimeout(500);
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });

      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.locator('text=Solicitud actualizada con éxito')).toBeVisible();
    }

    // Responsable deriva a Resolutor de Subsidio y pone en Consideración
    console.log('[QA] Responsable asigna Resolutor de Subsidio y cambia estado a Consideración...');
    for (const id of idsCreados) {
      await iniciarSesion(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass, 'Responsable');
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar por N° Orden"]', id);
      await expect(page.locator('tbody tr').first().locator('td').nth(1)).toHaveText(`#${id}`, { timeout: 15000 });
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      // Agregar Resolución
      await page.click('button:has-text("Agregar")');
      await page.waitForTimeout(500);
      await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
      await page.waitForTimeout(500);

      // Campos de subsidio
      await page.locator('label:has-text("Tipo de pedido")').locator('..').locator('select').selectOption('Personal');
      await page.locator('label:has-text("Nombre y apellido")').locator('..').locator('input').fill(`Beneficiario Subsidio ${id}`);
      await page.locator('label:text-is("DNI")').locator('..').locator('input').fill('20222222221');
      await page.locator('label:has-text("Dirección de DNI")').locator('..').locator('input').fill('Calle Falsa 123');

      // Cambiar estado general a Consideración
      await page.locator('label:has-text("Estado") + select').selectOption('consideracion');

      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.locator('text=Solicitud actualizada con éxito')).toBeVisible();
    }

    console.log('[QA] Resolutor de Subsidio exporta solicitudes en consideración a la planilla...');
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    
    // Asociar o verificar asociación de planilla
    await page.click('button:has-text("Asociar Planilla")');
    await page.waitForSelector('h3:has-text("Asociar Planilla Externa")');
    await page.locator('input[placeholder*="Ej: 1jPw9ni4BW"]').fill(SPREADSHEET_ID);
    await page.locator('label:has-text("Nombre de la Hoja") + input').fill(SHEET_NAME);
    await page.locator('form button[type="submit"]:has-text("Asociar Planilla")').click();
    await page.waitForTimeout(2000);

    // Exportar a Google Sheets abriendo el dropdown correspondiente
    await page.click('button:has-text("Exportar...")');
    await page.click('button:has-text("Google Sheets")');
    await expect(page.locator('text=Sincronización de exportación finalizada')).toBeVisible({ timeout: 45000 });

    // Modificar los montos en la planilla a un monto positivo (menor al original de forma simulada)
    console.log('[QA] Modificando importes en la planilla externa mediante test-helper...');
    for (const id of idsCreados) {
      const res = await page.request.post(`${BASE_URL}/api/test-helper/modify-solicitud-row`, {
        data: {
          spreadsheetId: SPREADSHEET_ID,
          sheetName: SHEET_NAME,
          solicitudId: id,
          columnName: 'Monto en dinero',
          newValue: '95000'
        }
      });
      expect(res.ok()).toBeTruthy();
    }

    // Importar la planilla y verificar que pasen a estado Resuelto / Completadas
    console.log('[QA] Importando la planilla de salida...');
    await page.locator('button:has-text("Importar Planilla")').click();
    await expect(page.locator('text=Sincronización de importación finalizada')).toBeVisible({ timeout: 45000 });

    // Validar estados en la UI
    console.log('[QA] Verificando que las solicitudes pasaron a estado Resuelto...');
    for (const id of idsCreados) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar por N° Orden"]', id);
      await expect(page.locator('tbody tr').first().locator('td').nth(1)).toHaveText(`#${id}`, { timeout: 15000 });
      const estadoCelda = page.locator('tbody tr').first().locator('td:nth-child(7)'); // Columna estado
      await expect(estadoCelda).toHaveText('Resueltas');
    }
  });

  // 2. Probar acceso a los links de archivos de la planilla externa de subsidios
  test('Caso 2: Verificación de acceso y permisos de archivos adjuntos desde la planilla externa', async ({ page }) => {
    test.setTimeout(120000);
    console.log('[QA] Leyendo registros de la planilla de salida mediante test-helper...');

    // Hacer login como Administrador para obtener el token de autenticación
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);
    
    // Obtener el token del almacenamiento local para realizar las peticiones autenticadas
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).not.toBeNull();

    // Leer la planilla usando el endpoint del test-helper
    const sheetResponse = await page.request.get(`${BASE_URL}/api/test-helper/read-sheet`, {
      params: {
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:AD300`
      }
    });
    expect(sheetResponse.ok()).toBeTruthy();
    const result = await sheetResponse.json();
    const data = result.data || [];

    // Buscar links de descarga de archivos
    console.log('[QA] Buscando enlaces de descarga de archivos en la planilla...');
    const fileUrls = [];
    for (const row of data) {
      for (const cell of row) {
        if (cell && typeof cell === 'string' && cell.includes('/api/solicitudes/adjuntos/') && cell.includes('/download')) {
          if (!fileUrls.includes(cell)) {
            fileUrls.push(cell);
          }
        }
      }
    }

    console.log(`[QA] Enlaces de archivos encontrados: ${fileUrls.length}`);
    expect(fileUrls.length).toBeGreaterThanOrEqual(3);

    // Probar acceso a 3 archivos seleccionados
    const urlsAProbar = fileUrls.slice(0, 3);
    for (let i = 0; i < urlsAProbar.length; i++) {
      const url = urlsAProbar[i];
      const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
      console.log(`[QA] Probando archivo ${i + 1}: ${fullUrl}`);

      // Hacer la descarga del archivo enviando el token en la cabecera
      const fileRes = await page.request.get(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      expect(fileRes.ok()).toBeTruthy();
      expect(fileRes.status()).toBe(200);
      
      const contentType = fileRes.headers()['content-type'];
      console.log(`[QA] Archivo ${i + 1} descargado con éxito. Content-Type: ${contentType}`);
      expect(contentType).not.toBeNull();
    }
  });

  // 3. Probar 3 solicitudes de tipo Agenda
  test('Caso 3: Flujo Completo de 3 Solicitudes de Resolución de Tipo Agenda', async ({ page }) => {
    test.setTimeout(240000);
    const idsCreados = [];

    // Crear 3 solicitudes como Operador
    console.log('[QA] Creando 3 solicitudes para flujo Agenda...');
    for (let i = 1; i <= 3; i++) {
      await iniciarSesion(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.click('button:has-text("Nueva Solicitud")');

      const rand = Math.floor(Math.random() * 900000) + 100000;
      const benefName = `Agenda E2E Prod ${rand}`;

      await page.locator('label:has-text("Nombre Completo / Institución") + input').fill(benefName);
      await page.locator('label:has-text("Teléfono") + input').first().fill('3424009988');
      await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Solicitud de agenda de prueba número ${i} - ${rand}`);
      await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
      await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');
      await page.locator('input[placeholder*="Ej: Santa Fe"]').fill('Santa Fe');
      await page.waitForTimeout(1000);
      await page.locator('input[placeholder*="Ej: Santa Fe"]').press('ArrowDown');
      await page.locator('input[placeholder*="Ej: Santa Fe"]').press('Enter');
      await page.waitForTimeout(500);
 
      await page.locator('label:has-text("Barrio")').locator('..').locator('input').first().fill('Centro');
      await page.waitForTimeout(500);
 
      await page.click('button:has-text("Guardar Solicitud")');
      
      // Obtener el ID de la solicitud creada con captura de errores de validación
      let solicitudId = null;
      try {
        const toastSuccess = page.locator('text=creada con éxito');
        await expect(toastSuccess).toBeVisible({ timeout: 8000 });
        const toastText = await toastSuccess.innerText();
        const match = toastText.match(/#(\d+)/);
        solicitudId = match ? match[1] : null;
      } catch (err) {
        console.error(`[QA] Error al guardar la solicitud ${i}. Inspeccionando mensajes de error en pantalla...`);
        const validationErrors = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('*'))
            .map(el => el.innerText)
            .filter(text => text && (text.toLowerCase().includes('obligatorio') || text.toLowerCase().includes('error')));
        });
        console.error('[QA] Errores/Toasts detectados:', validationErrors.slice(0, 10));
        throw err;
      }
      
      expect(solicitudId).not.toBeNull();
      idsCreados.push(solicitudId);
      console.log(`[QA] Solicitud creada exitosamente con ID: ${solicitudId}`);
    }

    // Distribuidor asigna responsable
    console.log('[QA] Distribuidor asigna Responsable y Zona...');
    for (const id of idsCreados) {
      await iniciarSesion(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass, 'DISTRIBUIDOR');
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar por N° Orden"]', id);
      await expect(page.locator('tbody tr').first().locator('td').nth(1)).toHaveText(`#${id}`, { timeout: 15000 });
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
      await page.waitForTimeout(500);
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });

      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.locator('text=Solicitud actualizada con éxito')).toBeVisible();
    }

    // Responsable deriva a Resolutor de Agenda (Maria Veronica Gonzalez)
    console.log('[QA] Responsable asigna Resolutor de Agenda...');
    for (const id of idsCreados) {
      await iniciarSesion(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass, 'Responsable');
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar por N° Orden"]', id);
      await expect(page.locator('tbody tr').first().locator('td').nth(1)).toHaveText(`#${id}`, { timeout: 15000 });
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      // Agregar Resolución
      await page.click('button:has-text("Agregar")');
      await page.waitForTimeout(500);
      await page.locator('select:has-text("Seleccione Área...")').first().selectOption('AGENDA');
      await page.waitForTimeout(500);

      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.locator('text=Solicitud actualizada con éxito')).toBeVisible();
    }

    // Resolutor de Agenda aprueba la resolución
    console.log('[QA] Resolutor de Agenda completa y aprueba la resolución...');
    for (const id of idsCreados) {
      await iniciarSesion(page, CREDENTIALS.RESOLUTOR_AGENDA.email, CREDENTIALS.RESOLUTOR_AGENDA.pass, 'Resolutor');
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar por N° Orden"]', id);
      await expect(page.locator('tbody tr').first().locator('td').nth(1)).toHaveText(`#${id}`, { timeout: 15000 });
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      // Hacer click en el botón de aprobar la asignación
      await page.click('button:has-text("Aprobar")');
      await page.waitForTimeout(1000);

      // Completar campos del modal de confirmación de aprobación de Agenda
      await page.locator('label:has-text("Tipo de evento") + select').selectOption('Reunión');
      await page.locator('label:has-text("Fecha del evento") + input').fill('2026-08-20');
      await page.locator('label:has-text("Hora del evento") + input').fill('14:30');
      await page.locator('label:has-text("Lugar / Dirección del evento") + input').fill('Sala de Reuniones 2');
      await page.locator('label:has-text("Observaciones de la resolución") + textarea').fill('Resolución aprobada por QA en el test.');

      await page.click('button:has-text("Confirmar Aprobación")');
      await expect(page.locator('text=Resolución aprobada')).toBeVisible();
    }

    // Verificar en la UI que pasaron a estado Resuelto / Completadas
    console.log('[QA] Verificando que las solicitudes pasaron a estado Resuelto...');
    for (const id of idsCreados) {
      await iniciarSesion(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar por N° Orden"]', id);
      await expect(page.locator('tbody tr').first().locator('td').nth(1)).toHaveText(`#${id}`, { timeout: 15000 });
      const estadoCelda = page.locator('tbody tr').first().locator('td:nth-child(7)');
      await expect(estadoCelda).toHaveText('Resueltas');
    }
    console.log('🎉 ¡Prueba de 3 flujos de Agenda finalizada con éxito!');
  });

  // Limpiar la base de datos de producción después de correr todas las pruebas de la suite
  test.afterAll(async ({ request }) => {
    console.log('[QA] Limpiando todos los registros de prueba generados en producción...');
    const response = await request.post(`${BASE_URL}/api/test-helper/clear-all-solicitudes`);
    expect(response.ok()).toBeTruthy();
    console.log('[QA] Base de datos de producción limpiada con éxito.');
  });
});
