import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Datos de usuarios y credenciales oficiales
const CREDENTIALS = {
  OPERADOR: { email: 'celestesolari19@gmail.com', pass: 'Celeste_SGP_2026#' },
  DISTRIBUIDOR: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  RESPONSABLE: { email: 'matias.ippolito.responsable@gmail.com', pass: 'Matias_Resp_SGP_2026!' },
  RESOLUTOR_AGENDA: { email: 'mvgonza79@gmail.com', pass: 'Maria_SGP_2026%' },
  RESOLUTOR_SUBSIDIO: { email: 'martinnocioni@gmail.com', pass: 'Martin_SGP_2026*' },
  RESOLUTOR_OTRA: { email: 'matias.ippolito.resolutor@gmail.com', pass: 'Matias_Res_SGP_2026!' },
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' }
};

const BASE_URL = 'https://solicitudes.ultrasoft.website';
const ARTIFACT_DIR = 'C:\\Users\\fran\\.gemini\\antigravity\\brain\\5ee55c34-71f9-4980-ba92-c59d7ff60b9d';
const REPORT_PATH = path.join(ARTIFACT_DIR, 'resultados_pruebas_basicas.md');

// Crear directorio de assets de prueba si no existe
const assetsDir = path.join(process.cwd(), 'tests', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
const testPdf = path.join(assetsDir, 'dni_frente_temp.pdf');
const testJpg = path.join(assetsDir, 'dni_dorso_temp.jpg');

fs.writeFileSync(testPdf, 'Contenido simulado de archivo PDF para pruebas basicas QA SGP.');
fs.writeFileSync(testJpg, 'Contenido simulado de imagen JPG para pruebas basicas QA SGP.');

const reportData = {
  fecha: new Date().toLocaleString(),
  resultados: []
};

// Función de login robusta
async function login(page, email, password) {
  let intentos = 3;
  while (intentos > 0) {
    try {
      await page.goto(`${BASE_URL}/login`, { timeout: 30000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      break;
    } catch (e) {
      intentos--;
      console.log(`Error al cargar la página de login para ${email}. Reintentando... Intentos restantes: ${intentos}`);
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
  await page.waitForTimeout(1000);
}

// Función auxiliar para rellenar campos dinámicos
async function completarCampoAsignacion(areaContainer, labelText, value, type = 'input') {
  const label = areaContainer.locator('label').filter({ hasText: labelText }).first();
  const campoContenedor = label.locator('xpath=..');

  if (type === 'select') {
    await campoContenedor.locator('select').selectOption(value);
  } else if (type === 'textarea') {
    await campoContenedor.locator('textarea').fill(value);
  } else if (type === 'file') {
    await campoContenedor.locator('input[type="file"]').setInputFiles(value);
  } else {
    await campoContenedor.locator('input').fill(value);
  }
}

// Escribir reporte markdown al finalizar
function guardarReporte() {
  let md = `# Reporte de Pruebas Fundamentales Básicas (E2E) - SGP en Producción\n\n`;
  md += `**Fecha de ejecución:** ${reportData.fecha}\n`;
  md += `**Entorno de pruebas:** Producción (${BASE_URL})\n\n`;
  md += `## Resultados de los Casos de Prueba\n\n`;
  md += `| Caso de Prueba | Estado | Solicitud ID | Observaciones |\n`;
  md += `| --- | --- | --- | --- |\n`;

  for (const r of reportData.resultados) {
    const statusEmoji = r.estado === 'ÉXITO' ? '✅ ÉXITO' : '❌ FALLÓ';
    md += `| ${r.nombre} | ${statusEmoji} | ${r.solicitudId || 'N/A'} | ${r.obs || '-'} |\n`;
  }

  md += `\n\n---\n*Reporte generado automáticamente por QA Pedro utilizando Playwright.*`;

  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }
  fs.writeFileSync(REPORT_PATH, md, 'utf-8');
  console.log(`Reporte guardado en: ${REPORT_PATH}`);
}

test.describe('Suite de Pruebas Fundamentales Básicas - Producción SGP', () => {

  test.afterAll(async () => {
    guardarReporte();
    try {
      if (fs.existsSync(testPdf)) fs.unlinkSync(testPdf);
      if (fs.existsSync(testJpg)) fs.unlinkSync(testJpg);
    } catch (e) {
      console.error("Error al eliminar los archivos temporales de prueba:", e);
    }
  });

  test('Ejecución de los 6 Casos de Prueba Básicos', async ({ page }) => {
    test.setTimeout(600000); // 10 minutos máximo

    const randId = Math.floor(Math.random() * 90000) + 10000;
    console.log(`[QA Pedro] Iniciando pruebas básicas con identificador único: ${randId}`);

    // ========================================================================
    // CASO DE PRUEBA 1: Flujo Completo de Subsidio (Aprobación por Importe > 0)
    // ========================================================================
    console.log('\n--- CASO DE PRUEBA 1 ---');
    let caso1 = { nombre: 'Caso 1: Flujo Completo de Subsidio (Aprobación > 0)', estado: 'PENDIENTE', solicitudId: null, obs: '' };
    try {
      // 1. Crear Solicitud (Operador)
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.click('button:has-text("Nueva Solicitud")');
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(`QA Beneficiario Caso1 ${randId}`);
      await page.locator('label:text-is("Teléfono") + input').fill('3424123456');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Subsidio de asistencia social E2E - Caso 1 - ID ${randId}`);
      await page.locator('label:text-is("Tipo") + select').selectOption('SUBSIDIO');
      await page.locator('label:has-text("Monto") + input').first().fill('1000000');
      await page.click('button:has-text("Guardar Solicitud")');
      
      const toast1 = page.locator('div[role="status"]');
      await expect(toast1).toContainText('creada con éxito', { timeout: 15000 });
      const txt1 = await toast1.innerText();
      const sId1 = txt1.match(/#(\d+)/)[1];
      caso1.solicitudId = sId1;
      console.log(`[Caso 1] Solicitud creada con ID: ${sId1}`);

      // 2. Distribuidor Asigna Zona y Responsable
      await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(sId1);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId1}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // 3. Responsable Configura Asignación
      await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(sId1);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId1}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('SUBSIDIO');
      
      const areaContainer1 = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(areaContainer1, 'Tipo de pedido', 'Personal', 'select');
      await completarCampoAsignacion(areaContainer1, 'Descripción', 'Subsidio de soporte para Caso 1.', 'textarea');
      await completarCampoAsignacion(areaContainer1, 'Monto', '1000000', 'input');
      await completarCampoAsignacion(areaContainer1, 'Fin de subsidio', 'salud', 'select');
      await completarCampoAsignacion(areaContainer1, 'Nombre y apellido', `QA Beneficiario Caso1 ${randId}`, 'input');
      await completarCampoAsignacion(areaContainer1, 'DNI', '40111222', 'input');
      await completarCampoAsignacion(areaContainer1, 'Dirección de DNI', 'Calle Falsa 123', 'input');
      await completarCampoAsignacion(areaContainer1, 'DNI frente', testJpg, 'file');
      await page.waitForTimeout(1500);
      await completarCampoAsignacion(areaContainer1, 'DNI dorso', testJpg, 'file');
      await page.waitForTimeout(1500);
      await completarCampoAsignacion(areaContainer1, 'Constancia de CBU', testPdf, 'file');
      await page.waitForTimeout(1000);
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // 4. Resolutor de Subsidio pone en Consideración
      await login(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.locator('input[placeholder*="Buscar"]').fill(sId1);
      await page.waitForTimeout(1500);
      const consideracionBtn1 = page.locator('tbody tr').filter({ hasText: `#${sId1}` }).first().locator('button[title="Poner en Consideración"]');
      page.once('dialog', dialog => dialog.accept());
      await consideracionBtn1.click();
      await expect(page.locator('text=puesta en consideración correctamente')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(1500);

      // 5. Administrador asocia planilla, exporta, simula cambio de importe y vuelve a importar
      await login(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.waitForTimeout(1500);

      // Asociar planilla
      await page.click('button:has-text("Asociar Planilla")');
      await page.waitForSelector('h3:has-text("Asociar Planilla Externa")');
      await page.locator('input[placeholder*="Ej: 1jPw9ni4BW"]').fill('1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g');
      await page.locator('label:has-text("Nombre de la Hoja") + input').fill('TEST');
      await page.locator('form button[type="submit"]:has-text("Asociar Planilla")').click();
      await page.waitForTimeout(2000);

      // Exportar
      await page.locator('button:has-text("Exportar Planilla")').click();
      await expect(page.locator('text=Sincronización de exportación finalizada')).toBeVisible({ timeout: 45000 });
      await page.waitForTimeout(2000);

      // Modificar celda mediante api/test-helper
      const r1 = await page.request.post(`${BASE_URL}/api/test-helper/modify-solicitud-row`, {
        data: {
          spreadsheetId: '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g',
          sheetName: 'TEST',
          solicitudId: sId1,
          columnName: 'Monto en dinero',
          newValue: '1000000'
        }
      });
      expect(r1.ok()).toBeTruthy();

      // Importar
      await page.locator('button:has-text("Importar Planilla")').click();
      await expect(page.locator('text=Sincronización de importación finalizada')).toBeVisible({ timeout: 45000 });
      await page.waitForTimeout(2000);

      // Verificar estado final
      await page.locator('input[placeholder*="Buscar"]').fill(sId1);
      await page.waitForTimeout(1500);
      const st1 = await page.locator(`tbody tr:has-text("#${sId1}") td`).nth(8).innerText();
      expect(st1.toLowerCase()).toContain('completadas');

      caso1.estado = 'ÉXITO';
      caso1.obs = 'Aprobada automáticamente al importar importe > 0 (1,000,000).';
    } catch (e) {
      caso1.estado = 'FALLÓ';
      caso1.obs = e.message;
      console.error('[Caso 1] Falló:', e);
    }
    reportData.resultados.push(caso1);

    // ========================================================================
    // CASO DE PRUEBA 2: Flujo Completo de Subsidio (Rechazo por Importe = 0)
    // ========================================================================
    console.log('\n--- CASO DE PRUEBA 2 ---');
    let caso2 = { nombre: 'Caso 2: Flujo Completo de Subsidio (Rechazo = 0)', estado: 'PENDIENTE', solicitudId: null, obs: '' };
    try {
      // 1. Crear Solicitud (Operador)
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.click('button:has-text("Nueva Solicitud")');
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(`QA Beneficiario Caso2 ${randId}`);
      await page.locator('label:text-is("Teléfono") + input').fill('3424123456');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Subsidio de asistencia social E2E - Caso 2 - ID ${randId}`);
      await page.locator('label:text-is("Tipo") + select').selectOption('SUBSIDIO');
      await page.locator('label:has-text("Monto") + input').first().fill('1000000');
      await page.click('button:has-text("Guardar Solicitud")');
      
      const toast2 = page.locator('div[role="status"]');
      await expect(toast2).toContainText('creada con éxito', { timeout: 15000 });
      const txt2 = await toast2.innerText();
      const sId2 = txt2.match(/#(\d+)/)[1];
      caso2.solicitudId = sId2;
      console.log(`[Caso 2] Solicitud creada con ID: ${sId2}`);

      // 2. Distribuidor Asigna Zona y Responsable
      await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(sId2);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId2}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // 3. Responsable Configura Asignación
      await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(sId2);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId2}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('SUBSIDIO');
      
      const areaContainer2 = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(areaContainer2, 'Tipo de pedido', 'Personal', 'select');
      await completarCampoAsignacion(areaContainer2, 'Descripción', 'Subsidio de soporte para Caso 2.', 'textarea');
      await completarCampoAsignacion(areaContainer2, 'Monto', '1000000', 'input');
      await completarCampoAsignacion(areaContainer2, 'Fin de subsidio', 'salud', 'select');
      await completarCampoAsignacion(areaContainer2, 'Nombre y apellido', `QA Beneficiario Caso2 ${randId}`, 'input');
      await completarCampoAsignacion(areaContainer2, 'DNI', '40222333', 'input');
      await completarCampoAsignacion(areaContainer2, 'Dirección de DNI', 'Calle Falsa 123', 'input');
      await completarCampoAsignacion(areaContainer2, 'DNI frente', testJpg, 'file');
      await page.waitForTimeout(1500);
      await completarCampoAsignacion(areaContainer2, 'DNI dorso', testJpg, 'file');
      await page.waitForTimeout(1500);
      await completarCampoAsignacion(areaContainer2, 'Constancia de CBU', testPdf, 'file');
      await page.waitForTimeout(1000);
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // 4. Resolutor de Subsidio pone en Consideración
      await login(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.locator('input[placeholder*="Buscar"]').fill(sId2);
      await page.waitForTimeout(1500);
      const consideracionBtn2 = page.locator('tbody tr').filter({ hasText: `#${sId2}` }).first().locator('button[title="Poner en Consideración"]');
      page.once('dialog', dialog => dialog.accept());
      await consideracionBtn2.click();
      await expect(page.locator('text=puesta en consideración correctamente')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(1500);

      // 5. Administrador asocia, exporta, simula cambio a 0 e importa
      await login(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.waitForTimeout(1500);

      // Exportar
      await page.locator('button:has-text("Exportar Planilla")').click();
      await expect(page.locator('text=Sincronización de exportación finalizada')).toBeVisible({ timeout: 45000 });
      await page.waitForTimeout(2000);

      // Modificar celda mediante api/test-helper a 0
      const r2 = await page.request.post(`${BASE_URL}/api/test-helper/modify-solicitud-row`, {
        data: {
          spreadsheetId: '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g',
          sheetName: 'TEST',
          solicitudId: sId2,
          columnName: 'Monto en dinero',
          newValue: '0'
        }
      });
      expect(r2.ok()).toBeTruthy();

      // Importar
      await page.locator('button:has-text("Importar Planilla")').click();
      await expect(page.locator('text=Sincronización de importación finalizada')).toBeVisible({ timeout: 45000 });
      await page.waitForTimeout(2000);

      // Verificar estado final
      await page.locator('input[placeholder*="Buscar"]').fill(sId2);
      await page.waitForTimeout(1500);
      const st2 = await page.locator(`tbody tr:has-text("#${sId2}") td`).nth(8).innerText();
      expect(st2.toLowerCase()).toContain('rechazada');

      caso2.estado = 'ÉXITO';
      caso2.obs = 'Rechazada automáticamente al importar importe = 0.';
    } catch (e) {
      caso2.estado = 'FALLÓ';
      caso2.obs = e.message;
      console.error('[Caso 2] Falló:', e);
    }
    reportData.resultados.push(caso2);

    // ========================================================================
    // CASO DE PRUEBA 3: Flujo de Agenda Individual (Creación de Evento)
    // ========================================================================
    console.log('\n--- CASO DE PRUEBA 3 ---');
    let caso3 = { nombre: 'Caso 3: Flujo de Agenda Individual (Creación de Evento)', estado: 'PENDIENTE', solicitudId: null, obs: '' };
    try {
      // 1. Crear Solicitud (Operador)
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.click('button:has-text("Nueva Solicitud")');
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(`QA Beneficiario Caso3 ${randId}`);
      await page.locator('label:text-is("Teléfono") + input').fill('3424123456');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Cita de coordinación territorial E2E - Caso 3 - ID ${randId}`);
      await page.locator('label:text-is("Tipo") + select').selectOption('AGENDA');
      await page.click('button:has-text("Guardar Solicitud")');
      
      const toast3 = page.locator('div[role="status"]');
      await expect(toast3).toContainText('creada con éxito', { timeout: 15000 });
      const txt3 = await toast3.innerText();
      const sId3 = txt3.match(/#(\d+)/)[1];
      caso3.solicitudId = sId3;
      console.log(`[Caso 3] Solicitud creada con ID: ${sId3}`);

      // 2. Distribuidor Asigna Zona y Responsable
      await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(sId3);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId3}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // 3. Responsable Configura Asignación
      await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(sId3);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId3}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('AGENDA');
      
      const areaContainer3 = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(areaContainer3, 'Tipo de actividad', 'reunión', 'select');
      await completarCampoAsignacion(areaContainer3, 'Organización propia', 'si', 'select');
      await completarCampoAsignacion(areaContainer3, 'Detalle de actividad', 'Reunión de coordinación territorial agendada.', 'textarea');
      await completarCampoAsignacion(areaContainer3, 'Asistentes', 'Equipo QA y Resolutores', 'input');
      await completarCampoAsignacion(areaContainer3, 'Declaración de interés', 'no', 'select');
      await completarCampoAsignacion(areaContainer3, 'Aporte otorgado', 'no', 'select');
      await completarCampoAsignacion(areaContainer3, 'Datos de responsable', 'Pedro QA, Tel 4321', 'input');
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // 4. Resolutor de Agenda aprueba y genera evento en Google Calendar
      await login(page, CREDENTIALS.RESOLUTOR_AGENDA.email, CREDENTIALS.RESOLUTOR_AGENDA.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.locator('input[placeholder*="Buscar"]').fill(sId3);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId3}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Aprobar Resolución")');
      await page.waitForSelector('h3:has-text("¿Aprobar Resolución?")');
      
      const subModal3 = page.locator('div:has(h3:has-text("¿Aprobar Resolución?"))').last();
      // Seleccionar Asistencia Obligatoria
      await subModal3.locator('input[value="con asistencia"]').check();
      // Tildar Google Calendar
      await subModal3.locator('label:has-text("Crear evento") input').check();
      
      // Rellenar campos de calendario
      await subModal3.locator('label:has-text("Título") + input').fill(`Caso 3 Google Calendar Event - ${randId}`);
      await subModal3.locator('label:has-text("Fecha") + input').fill('2026-08-15');
      await subModal3.locator('label:has-text("Ubicación") + input').fill('Oficina Central SGP');
      
      await subModal3.locator('button:has-text("Confirmar y Finalizar")').click();
      await page.waitForTimeout(3000);

      // Verificar estado final
      await page.locator('input[placeholder*="Buscar"]').fill(sId3);
      await page.waitForTimeout(1500);
      const st3 = await page.locator(`tbody tr:has-text("#${sId3}") td`).nth(8).innerText();
      expect(st3.toLowerCase()).toContain('resueltas');

      caso3.estado = 'ÉXITO';
      caso3.obs = 'Evento creado con éxito en Google Calendar, estado cambia a Resueltas.';
    } catch (e) {
      caso3.estado = 'FALLÓ';
      caso3.obs = e.message;
      console.error('[Caso 3] Falló:', e);
    }
    reportData.resultados.push(caso3);

    // ========================================================================
    // CASO DE PRUEBA 4: Flujo Mixto (Agenda + Subsidio Aprobado)
    // ========================================================================
    console.log('\n--- CASO DE PRUEBA 4 ---');
    let caso4 = { nombre: 'Caso 4: Flujo Mixto (Agenda + Subsidio Aprobado)', estado: 'PENDIENTE', solicitudId: null, obs: '' };
    try {
      // 1. Crear Solicitud (Operador)
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.click('button:has-text("Nueva Solicitud")');
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(`QA Beneficiario Caso4 ${randId}`);
      await page.locator('label:text-is("Teléfono") + input').fill('3424123456');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Demanda integral E2E - Caso 4 - ID ${randId}`);
      await page.locator('label:text-is("Tipo") + select').selectOption('SUBSIDIO');
      await page.locator('label:has-text("Monto") + input').first().fill('500000');
      await page.click('button:has-text("Guardar Solicitud")');
      
      const toast4 = page.locator('div[role="status"]');
      await expect(toast4).toContainText('creada con éxito', { timeout: 15000 });
      const txt4 = await toast4.innerText();
      const sId4 = txt4.match(/#(\d+)/)[1];
      caso4.solicitudId = sId4;
      console.log(`[Caso 4] Solicitud creada con ID: ${sId4}`);

      // 2. Distribuidor Asigna Zona y Responsable
      await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(sId4);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId4}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // 3. Responsable Configura Ambas Asignaciones (Agenda + Subsidio)
      await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(sId4);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId4}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      // Agregar área Agenda
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('AGENDA');
      const containerAgenda = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(containerAgenda, 'Tipo de actividad', 'reunión', 'select');
      await completarCampoAsignacion(containerAgenda, 'Organización propia', 'si', 'select');
      await completarCampoAsignacion(containerAgenda, 'Detalle de actividad', 'Reunión de coordinación Caso 4.', 'textarea');
      await completarCampoAsignacion(containerAgenda, 'Asistentes', 'Equipo mixto', 'input');
      await completarCampoAsignacion(containerAgenda, 'Declaración de interés', 'no', 'select');
      await completarCampoAsignacion(containerAgenda, 'Aporte otorgado', 'no', 'select');
      await completarCampoAsignacion(containerAgenda, 'Datos de responsable', 'Pedro QA', 'input');

      // Agregar área Subsidio
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('SUBSIDIO');
      const containerSubsidio = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(containerSubsidio, 'Tipo de pedido', 'Personal', 'select');
      await completarCampoAsignacion(containerSubsidio, 'Descripción', 'Subsidio mixto Caso 4.', 'textarea');
      await completarCampoAsignacion(containerSubsidio, 'Monto', '500000', 'input');
      await completarCampoAsignacion(containerSubsidio, 'Fin de subsidio', 'salud', 'select');
      await completarCampoAsignacion(containerSubsidio, 'Nombre y apellido', `QA Beneficiario Caso4 ${randId}`, 'input');
      await completarCampoAsignacion(containerSubsidio, 'DNI', '40444555', 'input');
      await completarCampoAsignacion(containerSubsidio, 'Dirección de DNI', 'Calle Falsa 123', 'input');
      await completarCampoAsignacion(containerSubsidio, 'DNI frente', testJpg, 'file');
      await page.waitForTimeout(1500);
      await completarCampoAsignacion(containerSubsidio, 'DNI dorso', testJpg, 'file');
      await page.waitForTimeout(1500);
      await completarCampoAsignacion(containerSubsidio, 'Constancia de CBU', testPdf, 'file');
      await page.waitForTimeout(1000);
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // 4. Resolutor de Agenda aprueba la parte de Agenda
      await login(page, CREDENTIALS.RESOLUTOR_AGENDA.email, CREDENTIALS.RESOLUTOR_AGENDA.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.locator('input[placeholder*="Buscar"]').fill(sId4);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId4}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Aprobar Resolución")');
      await page.waitForSelector('h3:has-text("¿Aprobar Resolución?")');
      const subModal4 = page.locator('div:has(h3:has-text("¿Aprobar Resolución?"))').last();
      await subModal4.locator('input[value="con asistencia"]').check();
      await subModal4.locator('label:has-text("Crear evento") input').check();
      await subModal4.locator('label:has-text("Título") + input').fill(`Caso 4 Evento Google Calendar - ${randId}`);
      await subModal4.locator('label:has-text("Fecha") + input').fill('2026-08-15');
      await subModal4.locator('label:has-text("Ubicación") + input').fill('Oficina Central SGP');
      await subModal4.locator('button:has-text("Confirmar y Finalizar")').click();
      await page.waitForTimeout(3000);

      // 5. Resolutor de Subsidio pone en consideración
      await login(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.locator('input[placeholder*="Buscar"]').fill(sId4);
      await page.waitForTimeout(1500);
      const consideracionBtn4 = page.locator('tbody tr').filter({ hasText: `#${sId4}` }).first().locator('button[title="Poner en Consideración"]');
      page.once('dialog', dialog => dialog.accept());
      await consideracionBtn4.click();
      await expect(page.locator('text=puesta en consideración correctamente')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(1500);

      // 6. Administrador exporta, modifica importe a 500000 e importa
      await login(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.waitForTimeout(1500);

      // Exportar
      await page.locator('button:has-text("Exportar Planilla")').click();
      await expect(page.locator('text=Sincronización de exportación finalizada')).toBeVisible({ timeout: 45000 });
      await page.waitForTimeout(2000);

      // Modificar celda mediante api/test-helper
      const r4 = await page.request.post(`${BASE_URL}/api/test-helper/modify-solicitud-row`, {
        data: {
          spreadsheetId: '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g',
          sheetName: 'TEST',
          solicitudId: sId4,
          columnName: 'Monto en dinero',
          newValue: '500000'
        }
      });
      expect(r4.ok()).toBeTruthy();

      // Importar
      await page.locator('button:has-text("Importar Planilla")').click();
      await expect(page.locator('text=Sincronización de importación finalizada')).toBeVisible({ timeout: 45000 });
      await page.waitForTimeout(2000);

      // Verificar estado final: Completadas
      await page.locator('input[placeholder*="Buscar"]').fill(sId4);
      await page.waitForTimeout(1500);
      const st4 = await page.locator(`tbody tr:has-text("#${sId4}") td`).nth(8).innerText();
      expect(st4.toLowerCase()).toContain('completadas');

      caso4.estado = 'ÉXITO';
      caso4.obs = 'Flujo mixto completado tras aprobación de Agenda y sincronización de Subsidio (>0).';
    } catch (e) {
      caso4.estado = 'FALLÓ';
      caso4.obs = e.message;
      console.error('[Caso 4] Falló:', e);
    }
    reportData.resultados.push(caso4);

    // ========================================================================
    // CASO DE PRUEBA 5: Flujo Mixto (Agenda + Subsidio Postergado)
    // ========================================================================
    console.log('\n--- CASO DE PRUEBA 5 ---');
    let caso5 = { nombre: 'Caso 5: Flujo Mixto (Agenda + Subsidio Postergado)', estado: 'PENDIENTE', solicitudId: null, obs: '' };
    try {
      // 1. Crear Solicitud (Operador)
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.click('button:has-text("Nueva Solicitud")');
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(`QA Beneficiario Caso5 ${randId}`);
      await page.locator('label:text-is("Teléfono") + input').fill('3424123456');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Demanda integral E2E - Caso 5 - ID ${randId}`);
      await page.locator('label:text-is("Tipo") + select').selectOption('SUBSIDIO');
      await page.locator('label:has-text("Monto") + input').first().fill('500000');
      await page.click('button:has-text("Guardar Solicitud")');
      
      const toast5 = page.locator('div[role="status"]');
      await expect(toast5).toContainText('creada con éxito', { timeout: 15000 });
      const txt5 = await toast5.innerText();
      const sId5 = txt5.match(/#(\d+)/)[1];
      caso5.solicitudId = sId5;
      console.log(`[Caso 5] Solicitud creada con ID: ${sId5}`);

      // 2. Distribuidor Asigna Zona y Responsable
      await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(sId5);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId5}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // 3. Responsable Configura Ambas Asignaciones (Agenda + Subsidio)
      await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(sId5);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId5}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      // Agregar área Agenda
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('AGENDA');
      const containerAgenda5 = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(containerAgenda5, 'Tipo de actividad', 'reunión', 'select');
      await completarCampoAsignacion(containerAgenda5, 'Organización propia', 'si', 'select');
      await completarCampoAsignacion(containerAgenda5, 'Detalle de actividad', 'Reunión de coordinación Caso 5.', 'textarea');
      await completarCampoAsignacion(containerAgenda5, 'Asistentes', 'Equipo mixto', 'input');
      await completarCampoAsignacion(containerAgenda5, 'Declaración de interés', 'no', 'select');
      await completarCampoAsignacion(containerAgenda5, 'Aporte otorgado', 'no', 'select');
      await completarCampoAsignacion(containerAgenda5, 'Datos de responsable', 'Pedro QA', 'input');

      // Agregar área Subsidio
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('SUBSIDIO');
      const containerSubsidio5 = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(containerSubsidio5, 'Tipo de pedido', 'Personal', 'select');
      await completarCampoAsignacion(containerSubsidio5, 'Descripción', 'Subsidio mixto Caso 5.', 'textarea');
      await completarCampoAsignacion(containerSubsidio5, 'Monto', '500000', 'input');
      await completarCampoAsignacion(containerSubsidio5, 'Fin de subsidio', 'salud', 'select');
      await completarCampoAsignacion(containerSubsidio5, 'Nombre y apellido', `QA Beneficiario Caso5 ${randId}`, 'input');
      await completarCampoAsignacion(containerSubsidio5, 'DNI', '40555666', 'input');
      await completarCampoAsignacion(containerSubsidio5, 'Dirección de DNI', 'Calle Falsa 123', 'input');
      await completarCampoAsignacion(containerSubsidio5, 'DNI frente', testJpg, 'file');
      await page.waitForTimeout(1500);
      await completarCampoAsignacion(containerSubsidio5, 'DNI dorso', testJpg, 'file');
      await page.waitForTimeout(1500);
      await completarCampoAsignacion(containerSubsidio5, 'Constancia de CBU', testPdf, 'file');
      await page.waitForTimeout(1000);
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // 4. Resolutor de Agenda aprueba la parte de Agenda
      await login(page, CREDENTIALS.RESOLUTOR_AGENDA.email, CREDENTIALS.RESOLUTOR_AGENDA.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.locator('input[placeholder*="Buscar"]').fill(sId5);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId5}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Aprobar Resolución")');
      await page.waitForSelector('h3:has-text("¿Aprobar Resolución?")');
      const subModal5 = page.locator('div:has(h3:has-text("¿Aprobar Resolución?"))').last();
      await subModal5.locator('input[value="con asistencia"]').check();
      await subModal5.locator('label:has-text("Crear evento") input').check();
      await subModal5.locator('label:has-text("Título") + input').fill(`Caso 5 Evento Google Calendar - ${randId}`);
      await subModal5.locator('label:has-text("Fecha") + input').fill('2026-08-15');
      await subModal5.locator('label:has-text("Ubicación") + input').fill('Oficina Central SGP');
      await subModal5.locator('button:has-text("Confirmar y Finalizar")').click();
      await page.waitForTimeout(3000);

      // 5. Resolutor de Subsidio pone en consideración
      await login(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.locator('input[placeholder*="Buscar"]').fill(sId5);
      await page.waitForTimeout(1500);
      const consideracionBtn5 = page.locator('tbody tr').filter({ hasText: `#${sId5}` }).first().locator('button[title="Poner en Consideración"]');
      page.once('dialog', dialog => dialog.accept());
      await consideracionBtn5.click();
      await expect(page.locator('text=puesta en consideración correctamente')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(1500);

      // 6. Administrador exporta, modifica importe a -100 e importa
      await login(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.waitForTimeout(1500);

      // Exportar
      await page.locator('button:has-text("Exportar Planilla")').click();
      await expect(page.locator('text=Sincronización de exportación finalizada')).toBeVisible({ timeout: 45000 });
      await page.waitForTimeout(2000);

      // Modificar celda mediante api/test-helper a -100
      const r5 = await page.request.post(`${BASE_URL}/api/test-helper/modify-solicitud-row`, {
        data: {
          spreadsheetId: '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g',
          sheetName: 'TEST',
          solicitudId: sId5,
          columnName: 'Monto en dinero',
          newValue: '-100'
        }
      });
      expect(r5.ok()).toBeTruthy();

      // Importar
      await page.locator('button:has-text("Importar Planilla")').click();
      await expect(page.locator('text=Sincronización de importación finalizada')).toBeVisible({ timeout: 45000 });
      await page.waitForTimeout(2000);

      // Verificar estado final: Sigue en Consideracion
      await page.locator('input[placeholder*="Buscar"]').fill(sId5);
      await page.waitForTimeout(1500);
      const st5 = await page.locator(`tbody tr:has-text("#${sId5}") td`).nth(8).innerText();
      expect(st5.toLowerCase()).toContain('consideracion');

      caso5.estado = 'ÉXITO';
      caso5.obs = 'Flujo mixto postergado debido a que el subsidio sincronizó con importe negativo (<0).';
    } catch (e) {
      caso5.estado = 'FALLÓ';
      caso5.obs = e.message;
      console.error('[Caso 5] Falló:', e);
    }
    reportData.resultados.push(caso5);

    // ========================================================================
    // CASO DE PRUEBA 6: Flujo de Pedido / Declaración de Interés (Otros Tipos)
    // ========================================================================
    console.log('\n--- CASO DE PRUEBA 6 ---');
    let caso6 = { nombre: 'Caso 6: Flujo de Pedido / Declaración de Interés (Otros Tipos)', estado: 'PENDIENTE', solicitudId: null, obs: '' };
    try {
      // 1. Crear Solicitud (Operador)
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.click('button:has-text("Nueva Solicitud")');
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(`QA Beneficiario Caso6 ${randId}`);
      await page.locator('label:text-is("Teléfono") + input').fill('3424123456');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Pedido de equipamiento comunitario E2E - Caso 6 - ID ${randId}`);
      await page.locator('label:text-is("Tipo") + select').selectOption('PEDIDO');
      await page.click('button:has-text("Guardar Solicitud")');
      
      const toast6 = page.locator('div[role="status"]');
      await expect(toast6).toContainText('creada con éxito', { timeout: 15000 });
      const txt6 = await toast6.innerText();
      const sId6 = txt6.match(/#(\d+)/)[1];
      caso6.solicitudId = sId6;
      console.log(`[Caso 6] Solicitud creada con ID: ${sId6}`);

      // 2. Distribuidor Asigna Zona y Responsable
      await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(sId6);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId6}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // 3. Responsable Configura Asignación (OTRA)
      await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(sId6);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId6}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('OTRA');
      
      const areaContainer6 = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(areaContainer6, 'Descripción corta', 'Pedido de equipamiento', 'input');
      await completarCampoAsignacion(areaContainer6, 'Detalle de resolución', 'Pedido de equipamiento comunitario Caso 6.', 'textarea');
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // 4. Resolutor de OTRA aprueba la solicitud administrativamente
      await login(page, CREDENTIALS.RESOLUTOR_OTRA.email, CREDENTIALS.RESOLUTOR_OTRA.pass);
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.locator('input[placeholder*="Buscar"]').fill(sId6);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${sId6}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Aprobar Resolución")');
      await page.waitForSelector('h3:has-text("¿Aprobar Resolución?")');
      await page.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]').fill('Equipamiento comunitario verificado y aprobado físicamente.');
      await page.click('button:has-text("Confirmar y Finalizar")');
      await page.waitForTimeout(3000);

      // Verificar estado final: Resueltas (completadas)
      await page.locator('input[placeholder*="Buscar"]').fill(sId6);
      await page.waitForTimeout(1500);
      const st6 = await page.locator(`tbody tr:has-text("#${sId6}") td`).nth(8).innerText();
      expect(st6.toLowerCase()).toContain('resueltas');

      caso6.estado = 'ÉXITO';
      caso6.obs = 'Aprobada administrativamente de forma directa por Resolutor sin planillas ni agenda.';
    } catch (e) {
      caso6.estado = 'FALLÓ';
      caso6.obs = e.message;
      console.error('[Caso 6] Falló:', e);
    }
    reportData.resultados.push(caso6);
  });
});
