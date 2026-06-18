import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Datos de usuarios y credenciales
const CREDENTIALS = {
  OPERADOR: { email: 'celestesolari19@gmail.com', pass: 'Celeste_SGP_2026#' },
  DISTRIBUIDOR: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  RESPONSABLE: { email: 'matias.ippolito.responsable@gmail.com', pass: 'Matias_Resp_SGP_2026!' },
  RESOLUTOR_AGENDA: { email: 'mvgonza79@gmail.com', pass: 'Maria_SGP_2026%' },
  RESOLUTOR_DECLARACION: { email: 'ealfaro.51@gmail.com', pass: 'Eduardo_SGP_2026^' },
  RESOLUTOR_SUBSIDIO: { email: 'martinnocioni@gmail.com', pass: 'Martin_SGP_2026*' },
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' }
};

const BASE_URL = 'https://solicitudes.ultrasoft.website';
const ARTIFACT_DIR = 'C:\\Users\\fran\\.gemini\\antigravity\\brain\\1cfe87da-126c-4c0b-b829-a3af7fad37e7';
const REPORT_PATH = path.join(ARTIFACT_DIR, 'resultados_regresion.md');

// Crear archivos de prueba temporales
const assetsDir = path.join(process.cwd(), 'tests', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
const testPdf = path.join(assetsDir, 'documento_prueba.pdf');
const testJpg = path.join(assetsDir, 'cbu_prueba.jpg');

fs.writeFileSync(testPdf, 'Contenido simulado de archivo PDF para pruebas de QA.');
fs.writeFileSync(testJpg, 'Contenido simulado de imagen JPG para pruebas de QA.');

// Estructura para almacenar los resultados del reporte
const reportData = {
  fecha: new Date().toLocaleString(),
  flujos: []
};

// Función de login robusta con cierre de sesión previo y reintentos
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
  await page.waitForURL(/.*(dashboard|mis-solicitudes).*/, { timeout: 30000 });
}

// Función para subir archivos en el input oculto de Adjuntos
async function subirAdjuntoRapido(page, filePath) {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(filePath);
  await page.waitForTimeout(3000); // Esperar que suba
}

// Función auxiliar para rellenar campos dinámicos dentro del contenedor de asignación
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
  let md = `# Reporte de Ejecución de Regresión Completa - SGP\n\n`;
  md += `**Fecha de ejecución:** ${reportData.fecha}\n`;
  md += `**Entorno de pruebas:** Producción (${BASE_URL})\n\n`;
  md += `## Resultados de los Flujos de Prueba\n\n`;
  md += `| ID Flujo | Caso de Prueba | Estado | Solicitud ID | Observaciones |\n`;
  md += `| --- | --- | --- | --- | --- |\n`;
  
  for (const f of reportData.flujos) {
    const statusEmoji = f.estado === 'ÉXITO' ? '✅ ÉXITO' : '❌ FALLÓ';
    md += `| ${f.id} | ${f.nombre} | ${statusEmoji} | ${f.solicitudId || 'N/A'} | ${f.obs || '-'} |\n`;
  }
  
  md += `\n\n---\n*Reporte generado automáticamente por QA Pedro utilizando Playwright.*`;
  
  fs.writeFileSync(REPORT_PATH, md, 'utf-8');
  console.log(`Reporte guardado en: ${REPORT_PATH}`);
}

test.describe('Suite de Regresión Completa en Producción - SGP', () => {
  
  test.afterAll(async () => {
    guardarReporte();
  });

  test('Ciclo de vida completo de 7 flujos', async ({ page }) => {
    test.setTimeout(600000); // Dar suficiente tiempo para los 7 flujos largos

    // ==========================================
    // FLUJO 1: AGENDA
    // ==========================================
    let flujo1 = { id: 1, nombre: 'AGENDA - Flujo completo con resolutor', estado: 'PENDIENTE' };
    try {
      const randStr = Math.random().toString(36).substring(7);
      const randName = `QA Pedro Agenda ${randStr}`;
      
      // 1. Operador Crea Solicitud
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.click('button:has-text("Nueva Solicitud")');
      await page.locator('label:text-is("Tipo") + select').selectOption('PEDIDO'); // Tipo
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(randName);
      await page.locator('label:text-is("Teléfono") + input').fill('3424123456');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Solicitud de regresión para flujo AGENDA. ID: ${randStr}`);
      
      // Guardar y capturar ID del toast
      await page.click('button:has-text("Guardar Solicitud")');
      const toastLocator = page.locator('div[role="status"]');
      await expect(toastLocator).toContainText('creada con éxito');
      const toastText = await toastLocator.innerText();
      const match = toastText.match(/#(\d+)/);
      const solicitudId = match ? match[1] : null;
      if (!solicitudId) throw new Error('No se pudo capturar el ID de la solicitud.');
      flujo1.solicitudId = solicitudId;
      console.log(`Flujo 1 (AGENDA) - Creado ID: ${solicitudId}`);

      // Reabrir solicitud para subir el adjunto inicial
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Adjuntos")');
      await subirAdjuntoRapido(page, testPdf);
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);
      const cancelBtn = page.locator('button:has-text("Cancelar")');
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
      }

      // 2. Distribuidor Asigna Responsable
      await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte'); // Zona
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' }); // Responsable
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1000);

      // 3. Responsable Agrega Asignación de Resolutor
      await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      // Agregar asignación
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('AGENDA');
      
      // Rellenar campos dinámicos
      const areaContainer = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(areaContainer, 'Tipo de actividad', 'reunión', 'select');
      await completarCampoAsignacion(areaContainer, 'Organización propia', 'si', 'select');
      await completarCampoAsignacion(areaContainer, 'Detalle de actividad', 'Reunión de coordinación de la regresión.', 'textarea');
      await completarCampoAsignacion(areaContainer, 'Asistentes', 'Equipo QA y Resolutores', 'input');
      await completarCampoAsignacion(areaContainer, 'Declaración de interés', 'no', 'select');
      await completarCampoAsignacion(areaContainer, 'Aporte otorgado', 'no', 'select');
      await completarCampoAsignacion(areaContainer, 'Datos de responsable', 'Pedro QA, DNI 1234, Tel 4321', 'input');
      
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // Agregar comentario de seguimiento
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Notas Seguimiento")');
      await page.locator('[placeholder*="Escribir una actualización"]').fill('Nota de seguimiento agenda regresión.');
      await page.locator('[placeholder*="Escribir una actualización"] ~ button, [placeholder*="Escribir una actualización"] + button').first().click();
      await page.waitForTimeout(1500);
      await page.click('button:has-text("Cancelar")');

      // 4. Resolutor Aprueba Asignación
      await login(page, CREDENTIALS.RESOLUTOR_AGENDA.email, CREDENTIALS.RESOLUTOR_AGENDA.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Aprobar Resolución")');
      await page.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]').fill('Aprobación técnica de agenda completada.');
      await page.click('button:has-text("Confirmar y Finalizar")');
      await page.waitForTimeout(2000);

      // 5. Validar estado final
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      const rowState = await page.locator(`tbody tr:has-text("#${solicitudId}") td`).nth(8).innerText();
      expect(rowState.toLowerCase()).toContain('resueltas');
      
      flujo1.estado = 'ÉXITO';
      flujo1.obs = 'Ciclo de vida completado y verificado en estado Resueltas.';
    } catch (err) {
      flujo1.estado = 'FALLÓ';
      flujo1.obs = err.message;
    }
    reportData.flujos.push(flujo1);

    // ==========================================
    // FLUJO 2: DECLARACIÓN DE INTERÉS
    // ==========================================
    let flujo2 = { id: 2, nombre: 'DECLARACIÓN DE INTERÉS - Flujo completo con adjunto dinámico', estado: 'PENDIENTE' };
    try {
      const randStr = Math.random().toString(36).substring(7);
      const randName = `QA Pedro Interes ${randStr}`;
      
      // 1. Operador Crea Solicitud
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.click('button:has-text("Nueva Solicitud")');
      await page.locator('label:text-is("Tipo") + select').selectOption('PEDIDO'); // Tipo
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(randName);
      await page.locator('label:text-is("Teléfono") + input').fill('3424123456');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Solicitud de regresión para flujo INTERES. ID: ${randStr}`);
      
      await page.click('button:has-text("Guardar Solicitud")');
      const toastLocator = page.locator('div[role="status"]');
      await expect(toastLocator).toContainText('creada con éxito');
      const toastText = await toastLocator.innerText();
      const match = toastText.match(/#(\d+)/);
      const solicitudId = match ? match[1] : null;
      if (!solicitudId) throw new Error('No se pudo capturar el ID de la solicitud.');
      flujo2.solicitudId = solicitudId;
      console.log(`Flujo 2 (INTERES) - Creado ID: ${solicitudId}`);

      // Reabrir solicitud para subir el adjunto inicial
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Adjuntos")');
      await subirAdjuntoRapido(page, testPdf);
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);
      const cancelBtn = page.locator('button:has-text("Cancelar")');
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
      }

      // 2. Distribuidor Asigna
      await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1000);

      // 3. Responsable Configura Asignación
      await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('DECLARACION DE INTERES');
      
      // Rellenar campos dinámicos
      const areaContainer = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(areaContainer, 'Nombre de objeto', 'Declaración del Congreso QA', 'input');
      await completarCampoAsignacion(areaContainer, 'Tipo de evento', 'educativo', 'select');
      await completarCampoAsignacion(areaContainer, 'Detalle de actividad', 'Congreso anual de pruebas funcionales.', 'textarea');
      await completarCampoAsignacion(areaContainer, 'Localidad', 'Santa Fe', 'input');
      await completarCampoAsignacion(areaContainer, 'Fecha', '2026-08-15', 'input');
      await completarCampoAsignacion(areaContainer, 'Hora', '10:00', 'input');
      await completarCampoAsignacion(areaContainer, 'Dirección de evento', 'Rivadavia 4500', 'input');
      await completarCampoAsignacion(areaContainer, 'Fundamentos de declaración', 'Fundamentos del congreso de testing.', 'textarea');
      await completarCampoAsignacion(areaContainer, 'Nota o folleto', testPdf, 'file');
      
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // Comentario de seguimiento
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Notas Seguimiento")');
      await page.locator('[placeholder*="Escribir una actualización"]').fill('Comentario para flujo Declaración.');
      await page.locator('[placeholder*="Escribir una actualización"] ~ button, [placeholder*="Escribir una actualización"] + button').first().click();
      await page.waitForTimeout(1500);
      await page.click('button:has-text("Cancelar")');

      // 4. Resolutor de Declaración de Interés Aprueba
      await login(page, CREDENTIALS.RESOLUTOR_DECLARACION.email, CREDENTIALS.RESOLUTOR_DECLARACION.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Aprobar Resolución")');
      await page.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]').fill('Resolución de declaración de interés aprobada por Eduardo.');
      await page.click('button:has-text("Confirmar y Finalizar")');
      await page.waitForTimeout(2000);

      // 5. Validar estado final
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      const rowState = await page.locator(`tbody tr:has-text("#${solicitudId}") td`).nth(8).innerText();
      expect(rowState.toLowerCase()).toContain('resueltas');
      
      flujo2.estado = 'ÉXITO';
      flujo2.obs = 'Ciclo de vida completado con archivo dinámico y verificado.';
    } catch (err) {
      flujo2.estado = 'FALLÓ';
      flujo2.obs = err.message;
    }
    reportData.flujos.push(flujo2);

    // ==========================================
    // FLUJO 3: OTRA (sin resolutor por defecto)
    // ==========================================
    let flujo3 = { id: 3, nombre: 'OTRA (OTRA_TEST) - Ciclo con resolución manual del Admin', estado: 'PENDIENTE' };
    try {
      const randStr = Math.random().toString(36).substring(7);
      const randName = `QA Pedro Otra ${randStr}`;
      
      // 1. Operador Crea Solicitud
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.click('button:has-text("Nueva Solicitud")');
      await page.locator('label:text-is("Tipo") + select').selectOption('PEDIDO'); // Tipo
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(randName);
      await page.locator('label:text-is("Teléfono") + input').fill('3424123456');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Solicitud de regresión para flujo OTRA. ID: ${randStr}`);
      
      await page.click('button:has-text("Guardar Solicitud")');
      const toastLocator = page.locator('div[role="status"]');
      await expect(toastLocator).toContainText('creada con éxito');
      const toastText = await toastLocator.innerText();
      const match = toastText.match(/#(\d+)/);
      const solicitudId = match ? match[1] : null;
      if (!solicitudId) throw new Error('No se pudo capturar el ID de la solicitud.');
      flujo3.solicitudId = solicitudId;
      console.log(`Flujo 3 (OTRA) - Creado ID: ${solicitudId}`);

      // Reabrir solicitud para subir el adjunto inicial
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Adjuntos")');
      await subirAdjuntoRapido(page, testPdf);
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);
      const cancelBtn = page.locator('button:has-text("Cancelar")');
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
      }

      // 2. Distribuidor Asigna
      await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1000);

      // 3. Responsable Configura Asignación OTRA_TEST
      await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('OTRA_TEST');
      
      // Rellenar campos dinámicos
      const areaContainer = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(areaContainer, 'Descripción corta', 'Breve descripción para flujo OTRA', 'input');
      await completarCampoAsignacion(areaContainer, 'Detalle de resolución', 'Detalles completos de la resolución de la solicitud alternativa.', 'textarea');
      await completarCampoAsignacion(areaContainer, 'Adjuntos adicionales', testPdf, 'file');
      
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // Agregar comentario
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Notas Seguimiento")');
      await page.locator('[placeholder*="Escribir una actualización"]').fill('Comentario para el flujo OTRA.');
      await page.locator('[placeholder*="Escribir una actualización"] ~ button, [placeholder*="Escribir una actualización"] + button').first().click();
      await page.waitForTimeout(1500);
      await page.click('button:has-text("Cancelar")');

      // 4. Admin Resuelve Manualmente
      await login(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);
      await page.locator('text=Ver Listado').first().click();
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      // Cambiar estado a Resueltas
      await page.locator('label:has-text("Estado") + select').selectOption('completadas');
      
      // Completar el campo "Resolución" y "Detalle"
      await page.locator('input[placeholder="Resultado breve..."]').fill('Resolución manual para OTRA realizada.');
      await page.locator('textarea[placeholder="Detalle extendido del seguimiento..."]').fill('Se resolvió administrativamente por no contar con resolutor por defecto.');
      
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(2000);

      // 5. Validar estado final
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      const rowState = await page.locator(`tbody tr:has-text("#${solicitudId}") td`).nth(8).innerText();
      expect(rowState.toLowerCase()).toContain('resueltas');
      
      flujo3.estado = 'ÉXITO';
      flujo3.obs = 'Ciclo completado con resolución manual por el Administrador.';
    } catch (err) {
      flujo3.estado = 'FALLÓ';
      flujo3.obs = err.message;
    }
    reportData.flujos.push(flujo3);

    // ==========================================
    // FLUJO 4: SUBSIDIO (Personal)
    // ==========================================
    let flujo4 = { id: 4, nombre: 'SUBSIDIO Personal - Ciclo completo con archivos (DNI/CBU)', estado: 'PENDIENTE' };
    try {
      const randStr = Math.random().toString(36).substring(7);
      const randName = `QA Pedro Subsidio Pers ${randStr}`;
      
      // 1. Operador Crea Solicitud
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.click('button:has-text("Nueva Solicitud")');
      await page.locator('label:text-is("Tipo") + select').selectOption('SUBSIDIO');
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(randName);
      await page.locator('label:text-is("Teléfono") + input').fill('3424123456');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Solicitud Subsidio Personal. ID: ${randStr}`);
      
      await page.click('button:has-text("Guardar Solicitud")');
      const toastLocator = page.locator('div[role="status"]');
      await expect(toastLocator).toContainText('creada con éxito');
      const toastText = await toastLocator.innerText();
      const match = toastText.match(/#(\d+)/);
      const solicitudId = match ? match[1] : null;
      if (!solicitudId) throw new Error('No se pudo capturar el ID de la solicitud.');
      flujo4.solicitudId = solicitudId;
      console.log(`Flujo 4 (SUBSIDIO Pers) - Creado ID: ${solicitudId}`);

      // Reabrir solicitud para subir el adjunto inicial
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Adjuntos")');
      await subirAdjuntoRapido(page, testPdf);
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);
      const cancelBtn = page.locator('button:has-text("Cancelar")');
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
      }

      // 2. Distribuidor Asigna
      await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1000);

      // 3. Responsable Configura Asignación
      await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('SUBSIDIO');
      
      // Rellenar campos dinámicos
      const areaContainer = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(areaContainer, 'Tipo de pedido', 'Personal', 'select');
      await completarCampoAsignacion(areaContainer, 'Descripción', 'Subsidio para compra de medicamentos.', 'textarea');
      await completarCampoAsignacion(areaContainer, 'Monto', '150000', 'input');
      await completarCampoAsignacion(areaContainer, 'Fin de subsidio', 'salud', 'select');
      await completarCampoAsignacion(areaContainer, 'Nombre y apellido', randName, 'input');
      await completarCampoAsignacion(areaContainer, 'DNI', '40123456', 'input');
      await completarCampoAsignacion(areaContainer, 'Dirección de DNI', 'San Martín 1500', 'input');
      
      await completarCampoAsignacion(areaContainer, 'DNI frente', testJpg, 'file');
      await page.waitForTimeout(2000);
      await completarCampoAsignacion(areaContainer, 'DNI dorso', testJpg, 'file');
      await page.waitForTimeout(2000);
      await completarCampoAsignacion(areaContainer, 'Constancia de CBU', testPdf, 'file');
      await page.waitForTimeout(1000);

      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // Comentario
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Notas Seguimiento")');
      await page.locator('[placeholder*="Escribir una actualización"]').fill('Comentario para Subsidio Personal.');
      await page.locator('[placeholder*="Escribir una actualización"] ~ button, [placeholder*="Escribir una actualización"] + button').first().click();
      await page.waitForTimeout(1500);
      await page.click('button:has-text("Cancelar")');

      // 4. Resolutor de Subsidio Aprueba
      await login(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Aprobar Resolución")');
      await page.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]').fill('Aprobado subsidio de salud para medicamentos.');
      await page.click('button:has-text("Confirmar y Finalizar")');
      await page.waitForTimeout(2000);

      // 5. Validar estado final
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      const rowState = await page.locator(`tbody tr:has-text("#${solicitudId}") td`).nth(8).innerText();
      expect(rowState.toLowerCase()).toContain('resueltas');
      
      flujo4.estado = 'ÉXITO';
      flujo4.obs = 'Subsidio personal completado y verificado en estado Resueltas.';
    } catch (err) {
      flujo4.estado = 'FALLÓ';
      flujo4.obs = err.message;
    }
    reportData.flujos.push(flujo4);

    // ==========================================
    // FLUJO 5: SUBSIDIO (Institucional en dinero)
    // ==========================================
    let flujo5 = { id: 5, nombre: 'SUBSIDIO Inst Dinero - Ciclo completo con Nota de pedido', estado: 'PENDIENTE' };
    try {
      const randStr = Math.random().toString(36).substring(7);
      const randName = `QA Pedro Subsidio Inst Dinero ${randStr}`;
      
      // 1. Operador Crea Solicitud
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.click('button:has-text("Nueva Solicitud")');
      await page.locator('label:text-is("Tipo") + select').selectOption('SUBSIDIO');
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(randName);
      await page.locator('label:text-is("Teléfono") + input').fill('3424123456');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Solicitud Subsidio Inst Dinero. ID: ${randStr}`);
      
      await page.click('button:has-text("Guardar Solicitud")');
      const toastLocator = page.locator('div[role="status"]');
      await expect(toastLocator).toContainText('creada con éxito');
      const toastText = await toastLocator.innerText();
      const match = toastText.match(/#(\d+)/);
      const solicitudId = match ? match[1] : null;
      if (!solicitudId) throw new Error('No se pudo capturar el ID de la solicitud.');
      flujo5.solicitudId = solicitudId;
      console.log(`Flujo 5 (Inst Dinero) - Creado ID: ${solicitudId}`);

      // Reabrir solicitud para subir el adjunto inicial
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Adjuntos")');
      await subirAdjuntoRapido(page, testPdf);
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);
      const cancelBtn = page.locator('button:has-text("Cancelar")');
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
      }

      // 2. Distribuidor Asigna
      await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1000);

      // 3. Responsable Configura Asignación
      await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('SUBSIDIO');
      
      // Rellenar campos dinámicos
      const areaContainer = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(areaContainer, 'Tipo de pedido', 'Institucional en dinero', 'select');
      await completarCampoAsignacion(areaContainer, 'Descripción', 'Subsidio institucional para refacción de vestuarios.', 'textarea');
      await completarCampoAsignacion(areaContainer, 'Monto', '500000', 'input');
      await completarCampoAsignacion(areaContainer, 'Fin de subsidio', 'deporte', 'select');
      await completarCampoAsignacion(areaContainer, 'Nombre de institución', 'Club Deportivo QA', 'input');
      await completarCampoAsignacion(areaContainer, 'Dirección de institución', 'Av. Galicia 2300', 'input');
      await completarCampoAsignacion(areaContainer, 'Localidad', 'Santa Fe', 'input');
      await completarCampoAsignacion(areaContainer, 'Responsable 1: Cargo', 'Presidente', 'input');
      await completarCampoAsignacion(areaContainer, 'Responsable 1: Nombre', 'Juan Presi', 'input');
      await completarCampoAsignacion(areaContainer, 'Responsable 1: DNI', '25123456', 'input');
      await completarCampoAsignacion(areaContainer, 'Nota de pedido', testPdf, 'file');
      await page.waitForTimeout(1000);

      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // Comentario
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Notas Seguimiento")');
      await page.locator('[placeholder*="Escribir una actualización"]').fill('Comentario para Subsidio Inst Dinero.');
      await page.locator('[placeholder*="Escribir una actualización"] ~ button, [placeholder*="Escribir una actualización"] + button').first().click();
      await page.waitForTimeout(1500);
      await page.click('button:has-text("Cancelar")');

      // 4. Resolutor Aprueba
      await login(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Aprobar Resolución")');
      await page.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]').fill('Aprobado subsidio institucional en dinero para refacciones.');
      await page.click('button:has-text("Confirmar y Finalizar")');
      await page.waitForTimeout(2000);

      // 5. Validar estado
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      const rowState = await page.locator(`tbody tr:has-text("#${solicitudId}") td`).nth(8).innerText();
      expect(rowState.toLowerCase()).toContain('resueltas');
      
      flujo5.estado = 'ÉXITO';
      flujo5.obs = 'Subsidio institucional en dinero completado exitosamente.';
    } catch (err) {
      flujo5.estado = 'FALLÓ';
      flujo5.obs = err.message;
    }
    reportData.flujos.push(flujo5);

    // ==========================================
    // FLUJO 6: SUBSIDIO (Institucional en especie)
    // ==========================================
    let flujo6 = { id: 6, nombre: 'SUBSIDIO Inst Especie - Ciclo completo', estado: 'PENDIENTE' };
    try {
      const randStr = Math.random().toString(36).substring(7);
      const randName = `QA Pedro Subsidio Inst Especie ${randStr}`;
      
      // 1. Operador Crea Solicitud
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.click('button:has-text("Nueva Solicitud")');
      await page.locator('label:text-is("Tipo") + select').selectOption('SUBSIDIO');
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(randName);
      await page.locator('label:text-is("Teléfono") + input').fill('3424123456');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Solicitud Subsidio Inst Especie. ID: ${randStr}`);
      
      await page.click('button:has-text("Guardar Solicitud")');
      const toastLocator = page.locator('div[role="status"]');
      await expect(toastLocator).toContainText('creada con éxito');
      const toastText = await toastLocator.innerText();
      const match = toastText.match(/#(\d+)/);
      const solicitudId = match ? match[1] : null;
      if (!solicitudId) throw new Error('No se pudo capturar el ID de la solicitud.');
      flujo6.solicitudId = solicitudId;
      console.log(`Flujo 6 (Inst Especie) - Creado ID: ${solicitudId}`);

      // Reabrir solicitud para subir el adjunto inicial
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Adjuntos")');
      await subirAdjuntoRapido(page, testPdf);
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);
      const cancelBtn = page.locator('button:has-text("Cancelar")');
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
      }

      // 2. Distribuidor Asigna
      await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1000);

      // 3. Responsable Configura Asignación
      await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('SUBSIDIO');
      
      // Rellenar campos dinámicos
      const areaContainer = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(areaContainer, 'Tipo de pedido', 'Institucional en especie', 'select');
      await completarCampoAsignacion(areaContainer, 'Descripción', 'Subsidio institucional en especie para pintura y materiales.', 'textarea');
      await completarCampoAsignacion(areaContainer, 'Monto', '300000', 'input');
      await completarCampoAsignacion(areaContainer, 'Fin de subsidio', 'educación', 'select');
      await completarCampoAsignacion(areaContainer, 'Nombre de institución', 'Escuela Técnica QA', 'input');
      await completarCampoAsignacion(areaContainer, 'Dirección de institución', 'General López 1200', 'input');
      await completarCampoAsignacion(areaContainer, 'Localidad', 'Santa Fe', 'input');
      await completarCampoAsignacion(areaContainer, 'Responsable 1: Cargo', 'Directora', 'input');
      await completarCampoAsignacion(areaContainer, 'Responsable 1: Nombre', 'María Directora', 'input');
      await completarCampoAsignacion(areaContainer, 'Responsable 1: DNI', '28123456', 'input');
      await completarCampoAsignacion(areaContainer, 'Nota de pedido', testPdf, 'file');
      await page.waitForTimeout(1000);

      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // Comentario
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Notas Seguimiento")');
      await page.locator('[placeholder*="Escribir una actualización"]').fill('Comentario para Subsidio Inst Especie.');
      await page.locator('[placeholder*="Escribir una actualización"] ~ button, [placeholder*="Escribir una actualización"] + button').first().click();
      await page.waitForTimeout(1500);
      await page.click('button:has-text("Cancelar")');

      // 4. Resolutor Aprueba
      await login(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Aprobar Resolución")');
      await page.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]').fill('Aprobado subsidio en especie de materiales escolares.');
      await page.click('button:has-text("Confirmar y Finalizar")');
      await page.waitForTimeout(2000);

      // 5. Validar estado
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      const rowState = await page.locator(`tbody tr:has-text("#${solicitudId}") td`).nth(8).innerText();
      expect(rowState.toLowerCase()).toContain('resueltas');
      
      flujo6.estado = 'ÉXITO';
      flujo6.obs = 'Subsidio institucional en especie completado exitosamente.';
    } catch (err) {
      flujo6.estado = 'FALLÓ';
      flujo6.obs = err.message;
    }
    reportData.flujos.push(flujo6);

    // ==========================================
    // FLUJO 7: SUBSIDIO (Institucional indistinto)
    // ==========================================
    let flujo7 = { id: 7, nombre: 'SUBSIDIO Inst Indistinto - Ciclo completo', estado: 'PENDIENTE' };
    try {
      const randStr = Math.random().toString(36).substring(7);
      const randName = `QA Pedro Subsidio Inst Indis ${randStr}`;
      
      // 1. Operador Crea Solicitud
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.click('button:has-text("Nueva Solicitud")');
      await page.locator('label:text-is("Tipo") + select').selectOption('SUBSIDIO');
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(randName);
      await page.locator('label:text-is("Teléfono") + input').fill('3424123456');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Solicitud Subsidio Inst Indistinto. ID: ${randStr}`);
      
      await page.click('button:has-text("Guardar Solicitud")');
      const toastLocator = page.locator('div[role="status"]');
      await expect(toastLocator).toContainText('creada con éxito');
      const toastText = await toastLocator.innerText();
      const match = toastText.match(/#(\d+)/);
      const solicitudId = match ? match[1] : null;
      if (!solicitudId) throw new Error('No se pudo capturar el ID de la solicitud.');
      flujo7.solicitudId = solicitudId;
      console.log(`Flujo 7 (Inst Indistinto) - Creado ID: ${solicitudId}`);

      // Reabrir solicitud para subir el adjunto inicial
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1500);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Adjuntos")');
      await subirAdjuntoRapido(page, testPdf);
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);
      const cancelBtn = page.locator('button:has-text("Cancelar")');
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
      }

      // 2. Distribuidor Asigna
      await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1000);

      // 3. Responsable Configura Asignación
      await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Agregar")');
      await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('SUBSIDIO');
      
      // Rellenar campos dinámicos
      const areaContainer = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
      await completarCampoAsignacion(areaContainer, 'Tipo de pedido', 'Institucional indistinto', 'select');
      await completarCampoAsignacion(areaContainer, 'Descripción', 'Subsidio institucional indistinto para equipamiento de biblioteca.', 'textarea');
      await completarCampoAsignacion(areaContainer, 'Monto', '450000', 'input');
      await completarCampoAsignacion(areaContainer, 'Fin de subsidio', 'otro', 'select');
      await completarCampoAsignacion(areaContainer, 'Nombre de institución', 'Biblioteca Popular QA', 'input');
      await completarCampoAsignacion(areaContainer, 'Dirección de institución', 'San Jerónimo 3400', 'input');
      await completarCampoAsignacion(areaContainer, 'Localidad', 'Santa Fe', 'input');
      await completarCampoAsignacion(areaContainer, 'Responsable 1: Cargo', 'Presidente', 'input');
      await completarCampoAsignacion(areaContainer, 'Responsable 1: Nombre', 'Carlos Biblio', 'input');
      await completarCampoAsignacion(areaContainer, 'Responsable 1: DNI', '20123456', 'input');
      await completarCampoAsignacion(areaContainer, 'Nota de pedido', testPdf, 'file');
      await page.waitForTimeout(1000);

      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // Comentario
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.click('button:has-text("Notas Seguimiento")');
      await page.locator('[placeholder*="Escribir una actualización"]').fill('Comentario para Subsidio Inst Indistinto.');
      await page.locator('[placeholder*="Escribir una actualización"] ~ button, [placeholder*="Escribir una actualización"] + button').first().click();
      await page.waitForTimeout(1500);
      await page.click('button:has-text("Cancelar")');

      // 4. Resolutor Aprueba
      await login(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${solicitudId}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
      
      await page.click('button:has-text("Aprobar Resolución")');
      await page.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]').fill('Aprobado subsidio para equipamiento de biblioteca.');
      await page.click('button:has-text("Confirmar y Finalizar")');
      await page.waitForTimeout(2000);

      // 5. Validar estado
      await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
      await page.locator('input[placeholder*="Buscar"]').fill(solicitudId);
      await page.waitForTimeout(1000);
      const rowState = await page.locator(`tbody tr:has-text("#${solicitudId}") td`).nth(8).innerText();
      expect(rowState.toLowerCase()).toContain('resueltas');
      
      flujo7.estado = 'ÉXITO';
      flujo7.obs = 'Subsidio institucional indistinto completado exitosamente.';
    } catch (err) {
      flujo7.estado = 'FALLÓ';
      flujo7.obs = err.message;
    }
    reportData.flujos.push(flujo7);

  });
});
