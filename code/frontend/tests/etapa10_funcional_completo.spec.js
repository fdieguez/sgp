import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8080';
const CREDENTIALS = {
  OPERADOR: { email: 'celestesolari19@gmail.com', pass: 'Celeste_SGP_2026#' },
  DISTRIBUIDOR: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  RESPONSABLE: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  RESOLUTOR_SUBSIDIO: { email: 'martinnocioni@gmail.com', pass: 'Martin_SGP_2026*' },
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' }
};

const SPREADSHEET_ID = '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g';
const SHEET_NAME = 'TEST';

const filePathFrente = path.resolve(__dirname, 'assets/admin_panel.png');
const filePathDorso = path.resolve(__dirname, 'assets/admin_panel.png');
const filePathCbu = path.resolve(__dirname, 'assets/cbu_prueba.jpg');

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

test.describe('Prueba Funcional Completa E2E SGP (Local H2)', () => {
  test.describe.configure({ mode: 'serial' });

  test('Prueba de Carga Completa, Importación y Exportación con Archivos', async ({ page }) => {
    test.setTimeout(300000);
    const idsCreados = [];
    const nombresCreados = [];

    // 1. Limpieza de base de datos H2 local y planilla TEST de Sheets
    console.log('[E2E-Funcional] Limpiando base de datos H2 local...');
    const clearDbRes = await page.request.post(`${BACKEND_URL}/api/test-helper/clear-all-solicitudes`);
    expect(clearDbRes.ok()).toBeTruthy();

    console.log('[E2E-Funcional] Limpiando pestaña TEST en planilla de Google Sheets...');
    const clearRes = await page.request.post(`${BACKEND_URL}/api/test-helper/clear-sheet`, {
      data: {
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME
      }
    });
    expect(clearRes.ok()).toBeTruthy();

    // 2. Crear 3 solicitudes de subsidio como Operador
    const variaciones = [
      { suffix: 'Aprobado', desc: 'Prueba funcional: aprobado mayor a cero' },
      { suffix: 'Rechazado', desc: 'Prueba funcional: rechazado igual a cero' },
      { suffix: 'Postergado', desc: 'Prueba funcional: postergado menor a cero' }
    ];

    console.log('[E2E-Funcional] Creando 3 solicitudes como Operador...');
    for (let i = 0; i < variaciones.length; i++) {
      await iniciarSesion(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.click('button:has-text("Nueva Solicitud")');

      const rand = Math.floor(Math.random() * 900000) + 100000;
      const benefName = `Subsidio Funcional ${variaciones[i].suffix} ${rand}`;

      await page.locator('label:has-text("Nombre Completo / Institución") + input').fill(benefName);
      await page.locator('label:has-text("Teléfono") + input').first().fill('3424001122');
      await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(`${variaciones[i].desc} - ${rand}`);
      await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
      await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');
      await page.locator('input[placeholder*="Ej: Santa Fe"]').fill('Santa Fe');
      await page.waitForTimeout(500);
      await page.locator('input[placeholder*="Ej: Santa Fe"]').press('ArrowDown');
      await page.locator('input[placeholder*="Ej: Santa Fe"]').press('Enter');
      await page.waitForTimeout(500);

      await page.locator('label:has-text("Barrio")').locator('..').locator('input').first().fill('Centro');
      await page.waitForTimeout(500);

      await page.click('button:has-text("Guardar Solicitud")');

      const toastSuccess = page.locator('text=creada con éxito');
      await expect(toastSuccess).toBeVisible({ timeout: 8000 });
      const toastText = await toastSuccess.innerText();
      const match = toastText.match(/#(\d+)/);
      const solicitudId = match ? match[1] : null;

      expect(solicitudId).not.toBeNull();
      idsCreados.push(solicitudId);
      nombresCreados.push(benefName);
      console.log(`[E2E-Funcional] Creada Solicitud #${solicitudId} - ${benefName}`);
    }

    // 3. Distribuidor asigna Responsable y Zona Territorial a las 3 solicitudes
    console.log('[E2E-Funcional] Distribuidor asignando responsable y zona...');
    for (let idx = 0; idx < idsCreados.length; idx++) {
      const id = idsCreados[idx];
      const nombre = nombresCreados[idx];

      await iniciarSesion(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass, 'DISTRIBUIDOR');
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar por N° Orden"]', nombre);
      await expect(page.locator('tbody tr').first().locator('td').nth(1)).toHaveText(`#${id}`, { timeout: 8000 });
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
      await page.waitForTimeout(500);
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });

      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.locator('text=Solicitud actualizada con éxito')).toBeVisible();
    }

    // 4. Responsable completa todos los campos del subsidio e imágenes
    console.log('[E2E-Funcional] Responsable completando campos dinámicos y subiendo imágenes...');
    for (let idx = 0; idx < idsCreados.length; idx++) {
      const id = idsCreados[idx];
      const nombre = nombresCreados[idx];

      await iniciarSesion(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass, 'Responsable');
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar por N° Orden"]', nombre);
      await expect(page.locator('tbody tr').first().locator('td').nth(1)).toHaveText(`#${id}`, { timeout: 8000 });
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      // Agregar Resolución SUBSIDIO
      await page.click('button:has-text("Agregar")');
      await page.waitForTimeout(500);
      await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
      await page.waitForTimeout(500);

      // Completar campos específicos de SUBSIDIO
      await page.locator('label:has-text("Tipo de pedido")').locator('..').locator('select').selectOption('Personal');
      await page.locator('label:has-text("Nombre y apellido")').locator('..').locator('input').fill(`Beneficiario E2E ${id}`);
      await page.locator('label:text-is("DNI")').locator('..').locator('input').fill('20-12345678-9');
      await page.locator('label:has-text("Dirección de DNI")').locator('..').locator('input').fill('Calle Falsa 123');

      // Cargar imágenes reales
      console.log(`[E2E-Funcional] Subiendo archivos para Solicitud #${id}...`);
      await page.locator('label:has-text("DNI frente")').locator('..').locator('input[type="file"]').setInputFiles(filePathFrente);
      await page.waitForTimeout(2000);
      await page.locator('label:has-text("DNI dorso")').locator('..').locator('input[type="file"]').setInputFiles(filePathDorso);
      await page.waitForTimeout(2000);
      await page.locator('label:has-text("Constancia de CBU")').locator('..').locator('input[type="file"]').setInputFiles(filePathCbu);
      await page.waitForTimeout(2000);

      // Poner en consideración
      await page.locator('label:has-text("Estado") + select').selectOption('consideracion');

      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.locator('text=Solicitud actualizada con éxito')).toBeVisible();
    }

    // 5. Resolutor de Subsidio asocia y exporta a Google Sheets (1ra Sincronización)
    console.log('[E2E-Funcional] Resolutor asocia planilla y realiza exportación inicial...');
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);

    await page.click('button:has-text("Asociar Planilla")');
    await page.waitForSelector('h3:has-text("Asociar Planilla Externa")');
    await page.locator('input[placeholder*="Ej: 1jPw9ni4BW"]').fill(SPREADSHEET_ID);
    await page.locator('label:has-text("Nombre de la Hoja") + input').fill(SHEET_NAME);
    await page.locator('form button[type="submit"]:has-text("Asociar Planilla")').click();
    await page.waitForTimeout(2000);

    // Exportación inicial (Poner en consideración)
    await page.click('button:has-text("Exportar...")');
    await page.click('button:has-text("Google Sheets")');
    await expect(page.locator('text=Sincronización de exportación finalizada')).toBeVisible({ timeout: 45000 });

    // 6. Simular resultados de la planilla: Aprobado, Rechazado y Postergado (2do paso)
    console.log('[E2E-Funcional] Modificando importes en planilla de Sheets para probar importación...');
    const modificaciones = [
      { id: idsCreados[0], valor: '180000' }, // Caso Aprobado (> 0)
      { id: idsCreados[1], valor: '0' },      // Caso Rechazado (== 0)
      { id: idsCreados[2], valor: '-1500' }   // Caso Postergado (< 0)
    ];

    for (const mod of modificaciones) {
      const res = await page.request.post(`${BACKEND_URL}/api/test-helper/modify-solicitud-row`, {
        data: {
          spreadsheetId: SPREADSHEET_ID,
          sheetName: SHEET_NAME,
          solicitudId: mod.id,
          columnName: 'Monto en dinero',
          newValue: mod.valor
        }
      });
      expect(res.ok()).toBeTruthy();
    }

    console.log('[E2E-Funcional] Esperando 5 segundos para propagación de Sheets...');
    await page.waitForTimeout(5000);

    // Importar la planilla con los resultados
    console.log('[E2E-Funcional] Resolutor importa la planilla con los resultados de aprobación/rechazo/postergación...');
    await page.locator('button:has-text("Importar Planilla")').click();
    await expect(page.locator('text=Sincronización de importación finalizada')).toBeVisible({ timeout: 45000 });

    // Verificar las aserciones de estado en la UI (Post-Importación)
    console.log('[E2E-Funcional] Verificando aserciones de estado en la UI...');
    const aserciones = [
      { id: idsCreados[0], nombre: nombresCreados[0], estadoEsperado: 'Resueltas' },
      { id: idsCreados[1], nombre: nombresCreados[1], estadoEsperado: 'Rechazado' },
      { id: idsCreados[2], nombre: nombresCreados[2], estadoEsperado: 'Consideración' }
    ];

    for (const aser of aserciones) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar por N° Orden"]', aser.nombre);
      await expect(page.locator('tbody tr').first().locator('td').nth(1)).toHaveText(`#${aser.id}`, { timeout: 8000 });
      const estadoCelda = page.locator('tbody tr').first().locator('td:nth-child(13)');
      await expect(estadoCelda).toHaveText(aser.estadoEsperado);
      console.log(`[E2E-Funcional] Solicitud #${aser.id} verificada con éxito: Estado es "${aser.estadoEsperado}".`);
    }

    // 7. Exportación definitiva (3ro se exporta con todos los datos ya aprobada la solicitud)
    console.log('[E2E-Funcional] Realizando exportación definitiva post-aprobación...');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.click('button:has-text("Exportar...")');
    await page.click('button:has-text("Google Sheets")');
    await expect(page.locator('text=Sincronización de exportación finalizada')).toBeVisible({ timeout: 45000 });

    // 8. Verificar que se puede acceder/descargar los archivos desde la planilla
    console.log('[E2E-Funcional] Verificando acceso a archivos adjuntos en la planilla externa...');
    
    // Login temporal como Administrador para obtener el token JWT
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).not.toBeNull();

    // Leer la planilla de cálculo real
    const readRes = await page.request.get(`${BACKEND_URL}/api/test-helper/read-sheet`, {
      params: {
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:AD100`
      }
    });
    expect(readRes.ok()).toBeTruthy();
    const sheetData = (await readRes.json()).data || [];

    // Buscar celdas que contengan links de archivos del SGP
    const fileLinks = [];
    for (const row of sheetData) {
      for (const cell of row) {
        if (cell && typeof cell === 'string' && cell.includes('/api/solicitudes/adjuntos/') && cell.includes('/download')) {
          if (!fileLinks.includes(cell)) {
            fileLinks.push(cell);
          }
        }
      }
    }

    console.log(`[E2E-Funcional] Enlaces de archivos encontrados en Sheets:`, fileLinks);
    expect(fileLinks.length).toBeGreaterThanOrEqual(3);

    // Intentar acceder a cada link simulando la descarga desde el navegador
    for (const url of fileLinks.slice(0, 3)) {
      // Si la URL apunta al frontend /descargar-adjunto/..., extraemos el path del backend
      let targetUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
      if (targetUrl.includes('/descargar-adjunto/')) {
        const backendPath = targetUrl.substring(targetUrl.indexOf('/descargar-adjunto/') + '/descargar-adjunto/'.length);
        targetUrl = `${BACKEND_URL}${backendPath}`;
      }
      
      console.log(`[E2E-Funcional] Probando descarga en backend de: ${targetUrl}`);
      const fileRes = await page.request.get(targetUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      expect(fileRes.ok()).toBeTruthy();
      expect(fileRes.status()).toBe(200);
      const contentType = fileRes.headers()['content-type'];
      expect(contentType).toMatch(/(image|octet-stream|pdf)/);
      console.log(`[E2E-Funcional] Descarga exitosa. Content-Type: ${contentType}`);
    }

    console.log('🎉 ¡Prueba funcional E2E local de punta a punta completada con total éxito!');
  });
});
