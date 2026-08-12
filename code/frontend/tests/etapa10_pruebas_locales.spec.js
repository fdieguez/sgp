import { test, expect } from '@playwright/test';

// URL local de desarrollo y credenciales por defecto
const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8080';
const CREDENTIALS = {
  OPERADOR: { email: 'celestesolari19@gmail.com', pass: 'Celeste_SGP_2026#' },
  DISTRIBUIDOR: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  RESPONSABLE: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  RESOLUTOR_SUBSIDIO: { email: 'martinnocioni@gmail.com', pass: 'Martin_SGP_2026*' }
};

const SPREADSHEET_ID = '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g';
const SHEET_NAME = 'TEST';

// Función auxiliar para login en local
const iniciarSesion = async (page, email, password, rolASeleccionar = null) => {
  await page.goto(`${BASE_URL}/login`, { timeout: 15000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Si ya está logueado, cerrar sesión
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

test.describe('Pruebas Locales E2E SGP - Reglas de Negocio de Importación de Subsidios (Etapa 10)', () => {
  test.describe.configure({ mode: 'serial' });

  test('Flujo Completo de 4 Casos de Importación de Subsidios en Local', async ({ page }) => {
    test.setTimeout(240000);
    const idsCreados = [];
    const nombresCreados = [];

    // 1. Limpiar base de datos local y pestaña TEST de Google Sheets al inicio de la prueba
    console.log('[QA-Local] Limpiando base de datos H2 local...');
    const clearDbRes = await page.request.post(`${BACKEND_URL}/api/test-helper/clear-all-solicitudes`);
    expect(clearDbRes.ok()).toBeTruthy();

    console.log('[QA-Local] Limpiando pestaña TEST en la planilla de Google Sheets...');
    const clearRes = await page.request.post(`${BACKEND_URL}/api/test-helper/clear-sheet`, {
      data: {
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME
      }
    });
    expect(clearRes.ok()).toBeTruthy();
    console.log('[QA-Local] Limpieza de base de datos y planilla finalizada con éxito.');

    // 2. Crear 4 solicitudes de subsidios como Operador
    console.log('[QA-Local] Creando 4 solicitudes de subsidios como Operador...');
    const variaciones = [
      { nameSuffix: 'Aprobado Mayor Cero', desc: 'Prueba local: importe positivo (> 0) -> Aprobada' },
      { nameSuffix: 'Rechazado Igual Cero', desc: 'Prueba local: importe cero (== 0) -> Rechazada' },
      { nameSuffix: 'Postergado Menor Cero', desc: 'Prueba local: importe negativo (< 0) -> En consideración' },
      { nameSuffix: 'Postergado Vacio Nulo', desc: 'Prueba local: importe vacío o nulo -> En consideración' }
    ];

    for (let i = 0; i < variaciones.length; i++) {
      await iniciarSesion(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.click('button:has-text("Nueva Solicitud")');

      const rand = Math.floor(Math.random() * 900000) + 100000;
      const benefName = `Subsidio Local ${variaciones[i].nameSuffix} ${rand}`;

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
      console.log(`[QA-Local] Solicitud creada exitosamente con ID: ${solicitudId} - ${benefName}`);
    }

    // 3. Distribuidor asigna responsable Matías Ippolito y zona Norte a las 4 solicitudes
    console.log('[QA-Local] Distribuidor asigna Responsable y Zona a las 4 solicitudes...');
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

    // 4. Responsable (Matías) asigna Resolutor (Martín) y pone en estado "Consideración" las 4
    console.log('[QA-Local] Responsable asigna Resolutor de Subsidio y cambia estado a Consideración...');
    for (let idx = 0; idx < idsCreados.length; idx++) {
      const id = idsCreados[idx];
      const nombre = nombresCreados[idx];

      await iniciarSesion(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass, 'Responsable');
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar por N° Orden"]', nombre);
      await expect(page.locator('tbody tr').first().locator('td').nth(1)).toHaveText(`#${id}`, { timeout: 8000 });
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

    // 5. Resolutor de Subsidio asocia y exporta las 4 a Google Sheets
    console.log('[QA-Local] Resolutor de Subsidio exporta solicitudes en consideración a la planilla...');
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    
    // Asociar planilla externa
    await page.click('button:has-text("Asociar Planilla")');
    await page.waitForSelector('h3:has-text("Asociar Planilla Externa")');
    await page.locator('input[placeholder*="Ej: 1jPw9ni4BW"]').fill(SPREADSHEET_ID);
    await page.locator('label:has-text("Nombre de la Hoja") + input').fill(SHEET_NAME);
    await page.locator('form button[type="submit"]:has-text("Asociar Planilla")').click();
    await page.waitForTimeout(2000);

    // Exportar a Google Sheets
    await page.click('button:has-text("Exportar...")');
    await page.click('button:has-text("Google Sheets")');
    await expect(page.locator('text=Sincronización de exportación finalizada')).toBeVisible({ timeout: 45000 });

    // 6. Modificar los importes en la planilla externa según la regla a testear
    console.log('[QA-Local] Modificando importes en la planilla externa mediante test-helper...');
    const modificaciones = [
      { id: idsCreados[0], valor: '95000' }, // Caso A (> 0)
      { id: idsCreados[1], valor: '0' },     // Caso B (== 0)
      { id: idsCreados[2], valor: '-5000' }, // Caso C (< 0)
      { id: idsCreados[3], valor: '' }       // Caso D (Vacío)
    ];

    for (const mod of modificaciones) {
      if (mod.valor !== '') {
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
    }

    // Esperar propagación de caché
    console.log('[QA-Local] Esperando 5 segundos para propagación de la caché de Google Sheets...');
    await page.waitForTimeout(5000);

    // Diagnóstico de Base de Datos antes de la importación
    const diagSols = await page.request.get(`${BACKEND_URL}/api/test-helper/get-solicitudes`);
    const diagConfigs = await page.request.get(`${BACKEND_URL}/api/test-helper/get-configs`);
    console.log('[QA-Local-Diag] Solicitudes en H2:', await diagSols.json());
    console.log('[QA-Local-Diag] Configs en H2:', await diagConfigs.json());

    // 7. Importar la planilla en el frontend local
    console.log('[QA-Local] Importando la planilla de salida...');
    await page.locator('button:has-text("Importar Planilla")').click();
    await expect(page.locator('text=Sincronización de importación finalizada')).toBeVisible({ timeout: 45000 });

    // 8. Verificar que cada solicitud tomó el estado correspondiente según las reglas
    console.log('[QA-Local] Verificando aserciones de estado en la UI local...');
    const aserciones = [
      { id: idsCreados[0], nombre: nombresCreados[0], estadoEsperado: 'Resueltas' }, // > 0 -> Resueltas (completadas)
      { id: idsCreados[1], nombre: nombresCreados[1], estadoEsperado: 'Rechazado' }, // == 0 -> Rechazado (rechazada)
      { id: idsCreados[2], nombre: nombresCreados[2], estadoEsperado: 'Consideración' }, // < 0 -> Consideración (consideracion)
      { id: idsCreados[3], nombre: nombresCreados[3], estadoEsperado: 'Consideración' }  // Vacío -> Consideración (consideracion)
    ];

    for (const aser of aserciones) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar por N° Orden"]', aser.nombre);
      await expect(page.locator('tbody tr').first().locator('td').nth(1)).toHaveText(`#${aser.id}`, { timeout: 15000 });
      const estadoCelda = page.locator('tbody tr').first().locator('td:nth-child(10)');
      await expect(estadoCelda).toHaveText(aser.estadoEsperado);
      console.log(`[QA-Local] Solicitud #${aser.id} validada con éxito: Estado es "${aser.estadoEsperado}".`);
    }

    console.log('🎉 ¡Todas las 4 pruebas de importación local finalizaron con éxito!');
  });
});
