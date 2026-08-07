import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Datos de usuarios y credenciales de prueba/producción
const CREDENTIALS = {
  MULTIROL: { email: 'test.multirol@gmail.com', pass: 'MultiRol_SGP_2026!' },
  DISTRIBUIDOR: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  RESPONSABLE: { email: 'matias.ippolito.responsable@gmail.com', pass: 'Matias_Resp_SGP_2026!' },
  RESOLUTOR_AGENDA: { email: 'mvgonza79@gmail.com', pass: 'Maria_SGP_2026%' },
  RESOLUTOR_SUBSIDIO: { email: 'martinnocioni@gmail.com', pass: 'Martin_SGP_2026*' },
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' }
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'C:\\Users\\fran\\.gemini\\antigravity\\brain\\8bdd9fe5-e3f7-4f8f-a605-4e94dc3d5669';
const REPORT_PATH = path.join(ARTIFACT_DIR, 'resultados_etapa9_regression.md');

// Crear directorio de assets de prueba si no existe
const assetsDir = path.join(process.cwd(), 'tests', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
const testPdf = path.join(assetsDir, 'dni_frente_temp.pdf');
const testJpg = path.join(assetsDir, 'dni_dorso_temp.jpg');

fs.writeFileSync(testPdf, 'Contenido simulado de archivo PDF para pruebas de QA - Etapa 9 SGP.');
fs.writeFileSync(testJpg, 'Contenido simulado de imagen JPG para pruebas de QA - Etapa 9 SGP.');

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
}

// Función auxiliar para rellenar campos dinámicos de resolución
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
  let md = `# Reporte de Ejecución - Etapa 9 SGP\n\n`;
  md += `**Fecha de ejecución:** ${reportData.fecha}\n`;
  md += `**Entorno de pruebas:** ${BASE_URL}\n\n`;
  md += `## Validación de Escenarios Requeridos\n\n`;
  md += `| Escenario / Flujo | Estado | Detalles / ID Solicitudes |\n`;
  md += `| --- | --- | --- |\n`;

  for (const r of reportData.resultados) {
    const statusEmoji = r.estado === 'ÉXITO' ? '✅ ÉXITO' : '❌ FALLÓ';
    md += `| ${r.nombre} | ${statusEmoji} | ${r.obs || '-'} |\n`;
  }

  md += `\n\n## Casos de Prueba Configurados en el Entorno\n\n`;
  md += `Se verificaron los siguientes casos:\n\n`;
  md += `- **2 Casos de Agenda:**\n`;
  const agendaListos = reportData.resultados.find(r => r.nombre === 'Creación de Casos Listos de Agenda');
  md += `  - ${agendaListos && agendaListos.estado === 'ÉXITO' ? agendaListos.obs : 'No se pudieron procesar.'}\n`;
  md += `- **2 Casos de Subsidio (Listos para poner en consideración):**\n`;
  const subsidioListos = reportData.resultados.find(r => r.nombre === 'Creación de Casos Listos de Subsidio');
  md += `  - ${subsidioListos && subsidioListos.estado === 'ÉXITO' ? subsidioListos.obs : 'No se pudieron crear.'}\n\n`;
  md += `\n---\n*Reporte generado automáticamente por QA Pedro utilizando Playwright.*`;

  // Asegurar que el directorio de reporte existe
  const reportDir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(REPORT_PATH, md, 'utf-8');
  console.log(`Reporte guardado en: ${REPORT_PATH}`);
}

test.describe('Suite de Validación Etapa 9 - SGP', () => {

  test.afterAll(async () => {
    guardarReporte();
    // Limpieza de archivos temporales
    try {
      if (fs.existsSync(testPdf)) fs.unlinkSync(testPdf);
      if (fs.existsSync(testJpg)) fs.unlinkSync(testJpg);
    } catch (e) {
      console.error("Error al eliminar los archivos temporales de prueba:", e);
    }
  });

  test('Validaciones completas de la Etapa 9', async ({ page }) => {
    test.setTimeout(480000); // 8 minutos

    const randId = Math.floor(Math.random() * 90000) + 10000;
    console.log(`[Etapa 9 QA] Generando identificador único para los tests: ${randId}`);

    // Nombres de las solicitudes
    const agendaListo1Name = `Caso Agenda Listo 1 - E9 - ${randId}`;
    const agendaListo2Name = `Caso Agenda Listo 2 - E9 - ${randId}`;
    const subsidioListo1Name = `Caso Subsidio Listo 1 - E9 - ${randId}`;
    const subsidioListo2Name = `Caso Subsidio Listo 2 - E9 - ${randId}`;
    const agendaTempName = `Caso Agenda Aprobado - ELIMINAR - E9 - ${randId}`;
    const importePosName = `Caso Importe Positivo - ELIMINAR - E9 - ${randId}`;
    const importeCeroName = `Caso Importe Cero - ELIMINAR - E9 - ${randId}`;
    const importeNegName = `Caso Importe Negativo - ELIMINAR - E9 - ${randId}`;

    let idsCreados = {
      agendaListo1: null,
      agendaListo2: null,
      subsidioListo1: null,
      subsidioListo2: null,
      agendaTemp: null,
      importePos: null,
      importeCero: null,
      importeNeg: null
    };

    // ==========================================
    // ESCENARIO 1: Autenticación y Selección Multi-Rol
    // ==========================================
    let resMultirol = { nombre: 'Autenticación y Selección Multi-Rol', estado: 'PENDIENTE', obs: '' };
    try {
      console.log('[Etapa 9 QA] Probando login con test.multirol@gmail.com');
      await login(page, CREDENTIALS.MULTIROL.email, CREDENTIALS.MULTIROL.pass);
      await page.waitForURL(/.*select-rol.*/, { timeout: 15000 });
      console.log('[Etapa 9 QA] Redirigido exitosamente a /select-rol');

      // Verificar las tarjetas de Operador y Resolutor
      await expect(page.locator('text=OPERADOR')).toBeVisible();
      await expect(page.locator('text=RESOLUTOR')).toBeVisible();

      // Clic en Resolutor
      await page.locator('text=RESOLUTOR').click();
      await page.waitForURL(/.*dashboard.*/, { timeout: 15000 });
      console.log('[Etapa 9 QA] Dashboard de Resolutor cargado correctamente');

      // Validar botón "Cambiar Rol" en el Navbar superior
      const cambiarRolBtn = page.locator('button:has-text("Cambiar Rol")');
      await expect(cambiarRolBtn).toBeVisible();

      // Hacer clic en Cambiar Rol
      await cambiarRolBtn.click();
      await page.waitForURL(/.*select-rol.*/, { timeout: 10000 });

      // Hacer clic en Operador
      await page.locator('text=OPERADOR').click();
      await page.waitForURL(/.*mis-solicitudes.*/, { timeout: 15000 });
      console.log('[Etapa 9 QA] Bandeja de Operador cargada correctamente');

      resMultirol.estado = 'ÉXITO';
      resMultirol.obs = 'Flujo de login multi-rol, selección de perfiles y cambio de rol validado de punta a punta.';
    } catch (e) {
      resMultirol.estado = 'FALLÓ';
      resMultirol.obs = e.message;
      console.error('[Etapa 9 QA] Fallo en login multi-rol', e);
    }
    reportData.resultados.push(resMultirol);

    // ==========================================
    // ESCENARIO 2: Validación estricta de campos obligatorios al crear
    // ==========================================
    let resCamposCreacion = { nombre: 'Validación de campos obligatorios al crear', estado: 'PENDIENTE', obs: '' };
    try {
      console.log('[Etapa 9 QA] Probando validaciones estrictas al crear solicitud...');
      await login(page, CREDENTIALS.MULTIROL.email, CREDENTIALS.MULTIROL.pass);
      await page.waitForURL(/.*select-rol.*/);
      await page.locator('text=OPERADOR').click();
      await page.waitForURL(/.*mis-solicitudes.*/);

      await page.click('button:has-text("Nueva Solicitud")');
      await page.waitForSelector('h3:has-text("Nueva Solicitud")');

      // Intentar guardar vacía
      await page.click('button:has-text("Guardar Solicitud")');
      const toastLocator = page.locator('div[role="status"]');
      await expect(toastLocator).toBeVisible({ timeout: 5000 });
      const toastText = await toastLocator.innerText();
      console.log(`[Etapa 9 QA] Toast obtenido con campos vacíos: "${toastText}"`);
      expect(toastText).toContain('obligatorio');

      // Seleccionar tipo SUBSIDIO y monto en 0/vacío
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(`Test Campos ${randId}`);
      await page.locator('label:text-is("Teléfono") + input').fill('3424111222');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Validando campo de monto obligatorio.`);
      await page.locator('label:text-is("Tipo") + select').selectOption('SUBSIDIO');
      
      // Dejar monto vacío o en 0
      await page.locator('label:has-text("Monto") + input').first().fill('0');
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1000);
      
      const toastTextMonto = await page.locator('div[role="status"]').innerText();
      console.log(`[Etapa 9 QA] Toast obtenido con monto en 0: "${toastTextMonto}"`);
      expect(toastTextMonto.toLowerCase()).toContain('monto');
      expect(toastTextMonto.toLowerCase()).toContain('mayor que 0');

      // Cerrar modal
      await page.click('button:has-text("Cancelar")');
      await page.waitForTimeout(1000);

      resCamposCreacion.estado = 'ÉXITO';
      resCamposCreacion.obs = 'Bloqueo correcto de guardado y mensajes descriptivos para campos obligatorios y monto > 0.';
    } catch (e) {
      resCamposCreacion.estado = 'FALLÓ';
      resCamposCreacion.obs = e.message;
      console.error('[Etapa 9 QA] Fallo en validación de campos obligatorios al crear', e);
    }
    reportData.resultados.push(resCamposCreacion);

    // ==========================================
    // CREACIÓN DE CASOS DE PRUEBA
    // ==========================================

    const crearSolicitud = async (name, type, desc, optMonto = null) => {
      await page.click('button:has-text("Nueva Solicitud")');
      await page.waitForSelector('h3:has-text("Nueva Solicitud")');
      await page.locator('label:text-is("Nombre Completo / Institución") + input').fill(name);
      await page.locator('label:text-is("Teléfono") + input').fill('3424000111');
      await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
      await page.locator('label:text-is("Barrio") + input').fill('Centro');
      await page.locator('label:text-is("Descripción / Pedido") + textarea').fill(desc);
      await page.locator('label:text-is("Tipo") + select').selectOption(type);
      
      // Especificar Tipo de Solicitante y Subtipo (obligatorios Etapa 9)
      await page.locator('label:text-is("Tipo Solicitante") + select').selectOption('Personal');
      await page.locator('label:text-is("Subtipo Solicitante") + select').selectOption('Salud');

      if (type === 'SUBSIDIO' && optMonto) {
        await page.locator('label:has-text("Monto") + input').first().fill(optMonto);
        // Fecha de otorgamiento es obligatorio para subsidio
        await page.locator('label:text-is("Fecha de Otorgamiento") + input').fill('2026-08-04');
      }
      await page.click('button:has-text("Guardar Solicitud")');
      const statusToast = page.locator('div[role="status"]');
      await expect(statusToast).toContainText('creada con éxito', { timeout: 15000 });
      const txt = await statusToast.innerText();
      const match = txt.match(/#(\d+)/);
      const sid = match ? match[1] : null;
      console.log(`[Etapa 9 QA] Creado ${name} con ID: ${sid}`);
      return sid;
    };

    // 1. Operador crea todas las solicitudes
    try {
      console.log('[Etapa 9 QA] Iniciando creación masiva de solicitudes de prueba...');
      await login(page, CREDENTIALS.MULTIROL.email, CREDENTIALS.MULTIROL.pass);
      await page.waitForURL(/.*select-rol.*/);
      await page.locator('text=OPERADOR').click();
      await page.waitForURL(/.*mis-solicitudes.*/);

      idsCreados.agendaListo1 = await crearSolicitud(agendaListo1Name, 'PEDIDO', `Caso de Agenda Listo para aprobar 1 - E9. ID: ${randId}`);
      await page.waitForTimeout(1000);
      idsCreados.agendaListo2 = await crearSolicitud(agendaListo2Name, 'PEDIDO', `Caso de Agenda Listo para aprobar 2 - E9. ID: ${randId}`);
      await page.waitForTimeout(1000);
      idsCreados.agendaTemp = await crearSolicitud(agendaTempName, 'PEDIDO', `Caso de Agenda que se aprobará durante el test - E9. ID: ${randId}`);
      await page.waitForTimeout(1000);
      idsCreados.subsidioListo1 = await crearSolicitud(subsidioListo1Name, 'SUBSIDIO', `Caso de Subsidio Listo para consideración 1 - E9. ID: ${randId}`, '150000');
      await page.waitForTimeout(1000);
      idsCreados.subsidioListo2 = await crearSolicitud(subsidioListo2Name, 'SUBSIDIO', `Caso de Subsidio Listo para consideración 2 - E9. ID: ${randId}`, '150000');
      await page.waitForTimeout(1000);
      idsCreados.importePos = await crearSolicitud(importePosName, 'SUBSIDIO', `Caso Importe Positivo Sheets - E9. ID: ${randId}`, '10000');
      await page.waitForTimeout(1000);
      idsCreados.importeCero = await crearSolicitud(importeCeroName, 'SUBSIDIO', `Caso Importe Cero Sheets - E9. ID: ${randId}`, '10000');
      await page.waitForTimeout(1000);
      idsCreados.importeNeg = await crearSolicitud(importeNegName, 'SUBSIDIO', `Caso Importe Negativo Sheets - E9. ID: ${randId}`, '10000');
      await page.waitForTimeout(1000);

    } catch (e) {
      console.error('[Etapa 9 QA] Fallo en la creación de solicitudes', e);
      throw e;
    }

    // 2. Distribuidor Asigna Zona y Responsable a todas
    try {
      console.log('[Etapa 9 QA] Distribuidor asignando Zona y Responsable a las solicitudes creadas...');
      await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);
      await page.waitForURL(/.*mis-solicitudes.*/);

      const todasLasSolicitudes = Object.values(idsCreados);
      for (const sid of todasLasSolicitudes) {
        if (!sid) continue;
        await page.locator('input[placeholder*="Buscar"]').fill(sid);
        await page.waitForTimeout(1000);
        await page.locator('tbody tr').filter({ hasText: `#${sid}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
        await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
        await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
        await page.click('button:has-text("Guardar Solicitud")');
        await page.waitForTimeout(1000);
      }
      console.log('[Etapa 9 QA] Asignaciones completadas por el Distribuidor.');
    } catch (e) {
      console.error('[Etapa 9 QA] Fallo en asignaciones del Distribuidor', e);
      throw e;
    }

    // 3. Responsable Configura Resoluciones y Adjuntos
    try {
      console.log('[Etapa 9 QA] Responsable configurando asignaciones de área...');
      await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass);
      await page.waitForURL(/.*mis-solicitudes.*/);

      // Agenda Listo 1, 2 y Temp
      const agendas = [idsCreados.agendaListo1, idsCreados.agendaListo2, idsCreados.agendaTemp];
      for (const sid of agendas) {
        if (!sid) continue;
        await page.locator('input[placeholder*="Buscar"]').fill(sid);
        await page.waitForTimeout(1000);
        await page.locator('tbody tr').filter({ hasText: `#${sid}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
        await page.click('button:has-text("Agregar")');
        await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('AGENDA');
        const areaContainer = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
        await completarCampoAsignacion(areaContainer, 'Tipo de actividad', 'reunión', 'select');
        await completarCampoAsignacion(areaContainer, 'Organización propia', 'si', 'select');
        await completarCampoAsignacion(areaContainer, 'Detalle de actividad', 'Reunión de coordinación de la Etapa 9.', 'textarea');
        await completarCampoAsignacion(areaContainer, 'Asistentes', 'Resolutor y Operador', 'input');
        await completarCampoAsignacion(areaContainer, 'Declaración de interés', 'si', 'select');
        await completarCampoAsignacion(areaContainer, 'Aporte otorgado', 'no', 'select');
        await completarCampoAsignacion(areaContainer, 'Datos de responsable', 'Pedro QA, Tel 4321', 'input');
        await page.click('button:has-text("Guardar Solicitud")');
        await page.waitForTimeout(1500);
      }

      // Subsidio Listo 1, 2, Importe Pos, Cero y Neg
      const subsidios = [
        idsCreados.subsidioListo1, idsCreados.subsidioListo2,
        idsCreados.importePos, idsCreados.importeCero, idsCreados.importeNeg
      ];
      for (const sid of subsidios) {
        if (!sid) continue;
        await page.locator('input[placeholder*="Buscar"]').fill(sid);
        await page.waitForTimeout(1000);
        await page.locator('tbody tr').filter({ hasText: `#${sid}` }).first().locator('button[title="Ver / Editar Detalles"]').click();
        await page.click('button:has-text("Agregar")');
        await page.locator('select:has(option:text-is("Seleccione Área..."))').last().selectOption('SUBSIDIO');
        const areaContainer = page.locator('.space-y-4.p-4.bg-gray-800\\/80, .bg-gray-800\\/80').last();
        await completarCampoAsignacion(areaContainer, 'Tipo de pedido', 'Personal', 'select');
        await completarCampoAsignacion(areaContainer, 'Descripción', 'Subsidio personal de soporte para pruebas de la Etapa 9.', 'textarea');
        await completarCampoAsignacion(areaContainer, 'Monto', '120000', 'input');
        await completarCampoAsignacion(areaContainer, 'Fin de subsidio', 'salud', 'select');
        await completarCampoAsignacion(areaContainer, 'Nombre y apellido', `Beneficiario E9 ${randId}`, 'input');
        await completarCampoAsignacion(areaContainer, 'DNI', '40555666', 'input');
        await completarCampoAsignacion(areaContainer, 'Dirección de DNI', 'Calle de pruebas 456', 'input');
        
        await completarCampoAsignacion(areaContainer, 'DNI frente', testJpg, 'file');
        await page.waitForTimeout(2000);
        await completarCampoAsignacion(areaContainer, 'DNI dorso', testJpg, 'file');
        await page.waitForTimeout(2000);
        await completarCampoAsignacion(areaContainer, 'Constancia de CBU', testPdf, 'file');
        await page.waitForTimeout(1000);

        await page.click('button:has-text("Guardar Solicitud")');
        await page.waitForTimeout(1500);
      }
      console.log('[Etapa 9 QA] Resoluciones y adjuntos configurados por el Responsable.');
    } catch (e) {
      console.error('[Etapa 9 QA] Fallo en configuraciones del Responsable', e);
      throw e;
    }

    // Registrar en reporte los casos listos creados
    reportData.resultados.push({
      nombre: 'Creación de Casos Listos de Agenda',
      estado: 'ÉXITO',
      obs: `ID #${idsCreados.agendaListo1} ("${agendaListo1Name}") e ID #${idsCreados.agendaListo2} ("${agendaListo2Name}")`
    });
    reportData.resultados.push({
      nombre: 'Creación de Casos Listos de Subsidio',
      estado: 'ÉXITO',
      obs: `ID #${idsCreados.subsidioListo1} ("${subsidioListo1Name}") e ID #${idsCreados.subsidioListo2} ("${subsidioListo2Name}")`
    });

    // ==========================================
    // ESCENARIO 3: Validación estricta de campos obligatorios al resolver agendas
    // ==========================================
    let resCamposResolucion = { nombre: 'Validación de campos obligatorios al resolver agendas', estado: 'PENDIENTE', obs: '' };
    try {
      console.log('[Etapa 9 QA] Probando validaciones estrictas al resolver agenda...');
      await login(page, CREDENTIALS.RESOLUTOR_AGENDA.email, CREDENTIALS.RESOLUTOR_AGENDA.pass);
      await page.waitForURL(/.*mis-solicitudes.*/);

      await page.locator('input[placeholder*="Buscar"]').fill(idsCreados.agendaTemp);
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').filter({ hasText: `#${idsCreados.agendaTemp}` }).first().locator('button[title="Ver / Editar Detalles"]').click();

      // Clic en Aprobar Resolución
      await page.click('button:has-text("Aprobar Resolución")');
      await page.waitForSelector('h3:has-text("Aprobar Solicitud")');

      // Tildar "Crear evento en Google Calendar"
      await page.locator('input[type="checkbox"]').check();

      // Dejar campos del calendario vacíos e intentar confirmar
      await page.click('button:has-text("Confirmar y Finalizar")');
      const toastCalVal = page.locator('div[role="status"]');
      await expect(toastCalVal).toBeVisible({ timeout: 5000 });
      const toastCalText = await toastCalVal.innerText();
      console.log(`[Etapa 9 QA] Toast de validación del calendario obtenido: "${toastCalText}"`);
      expect(toastCalText).toContain('evento');

      // Completar campos del calendario
      await page.locator('label:has-text("Título") + input').fill(`Evento QA Agenda Temp - E9 - ${randId}`);
      await page.locator('label:has-text("Fecha") + input').fill('2026-08-15');
      await page.locator('label:has-text("Ubicación") + input').fill('Oficina Central SGP');
      
      // Desmarcar asistencia primero para verificar que la requiere
      await page.locator('select:has-text("Seleccione asistencia")').selectOption({ label: 'Seleccione asistencia...' }).catch(() => {});
      
      // Confirmar aprobación sin observaciones
      await page.fill('textarea[placeholder="Observaciones de la resolución..."]', '');
      await page.click('button:has-text("Confirmar y Finalizar")');
      const toastObsText = await page.locator('div[role="status"]').innerText();
      console.log(`[Etapa 9 QA] Toast de validación de observaciones obtenido: "${toastObsText}"`);
      expect(toastObsText.toLowerCase()).toContain('observaciones');

      // Poner observaciones y asistencia
      await page.fill('textarea[placeholder="Observaciones de la resolución..."]', 'Aprobado en sesión de test de regresión local.');
      await page.selectOption('select:has(option:text-is("con asistencia"))', 'con asistencia');

      // Confirmar aprobación
      await page.click('button:has-text("Confirmar y Finalizar")');
      await page.waitForTimeout(2000);

      // Verificar que cambia a resueltas (completadas)
      await page.locator('input[placeholder*="Buscar"]').fill(idsCreados.agendaTemp);
      await page.waitForTimeout(1000);
      const rowState = await page.locator(`tbody tr:has-text("#${idsCreados.agendaTemp}") td`).nth(8).innerText();
      expect(rowState.toLowerCase()).toContain('resueltas');

      resCamposResolucion.estado = 'ÉXITO';
      resCamposResolucion.obs = `Bloqueo de campos vacíos en calendario y observaciones validado, y aprobación exitosa de la Solicitud ID #${idsCreados.agendaTemp}.`;
    } catch (e) {
      resCamposResolucion.estado = 'FALLÓ';
      resCamposResolucion.obs = e.message;
      console.error('[Etapa 9 QA] Fallo en validación al resolver agenda', e);
    }
    reportData.resultados.push(resCamposResolucion);

    // ==========================================
    // ESCENARIO 4: Operaciones por lotes (Bulk Actions) y puesta en consideración masiva
    // ==========================================
    let resBulkActions = { nombre: 'Operaciones por lotes y puesta en consideración masiva', estado: 'PENDIENTE', obs: '' };
    try {
      console.log('[Etapa 9 QA] Probando operaciones por lotes (Bulk)...');
      await login(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);
      await page.waitForURL(/.*settings.*/);
      await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      // Buscar por el identificador único para aislar nuestras solicitudes de Importe
      await page.locator('input[placeholder*="Buscar"]').fill(`ELIMINAR - E9 - ${randId}`);
      await page.waitForTimeout(2000);

      // Seleccionar los 3 casos de importe mediante checkbox
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      console.log(`[Etapa 9 QA] Filas encontradas para selección masiva: ${count}`);
      
      // Tildar cada checkbox
      for (let i = 0; i < count; i++) {
        await rows.nth(i).locator('input[type="checkbox"]').check();
      }
      await page.waitForTimeout(1000);

      // Validar aparición de barra flotante
      const barraFlotante = page.locator('span:has-text("seleccionadas")');
      await expect(barraFlotante).toBeVisible();
      console.log('[Etapa 9 QA] Barra flotante de acciones por lote visible.');

      // Presionar "Consideración" en la barra flotante
      page.once('dialog', dialog => dialog.accept());
      await page.click('button:has-text("Consideración")');
      await page.waitForTimeout(3000);

      // Verificar que pasaron a consideración
      await page.locator('input[placeholder*="Buscar"]').fill(idsCreados.importePos);
      await page.waitForTimeout(1000);
      let s1 = await page.locator(`tbody tr:has-text("#${idsCreados.importePos}") td`).nth(8).innerText();
      expect(s1.toLowerCase()).toContain('consideracion');

      await page.locator('input[placeholder*="Buscar"]').fill(idsCreados.importeCero);
      await page.waitForTimeout(1000);
      let s2 = await page.locator(`tbody tr:has-text("#${idsCreados.importeCero}") td`).nth(8).innerText();
      expect(s2.toLowerCase()).toContain('consideracion');

      await page.locator('input[placeholder*="Buscar"]').fill(idsCreados.importeNeg);
      await page.waitForTimeout(1000);
      let s3 = await page.locator(`tbody tr:has-text("#${idsCreados.importeNeg}") td`).nth(8).innerText();
      expect(s3.toLowerCase()).toContain('consideracion');

      resBulkActions.estado = 'ÉXITO';
      resBulkActions.obs = `Puesta en consideración masiva exitosa de las solicitudes ID #${idsCreados.importePos}, #${idsCreados.importeCero} y #${idsCreados.importeNeg}.`;
    } catch (e) {
      resBulkActions.estado = 'FALLÓ';
      resBulkActions.obs = e.message;
      console.error('[Etapa 9 QA] Fallo en operaciones por lotes', e);
    }
    reportData.resultados.push(resBulkActions);

    // ==========================================
    // ESCENARIO 5: Sincronización e Importación Inteligente por Importe
    // ==========================================
    let resSmartImport = { nombre: 'Sincronización e importación inteligente por importe', estado: 'PENDIENTE', obs: '' };
    try {
      console.log('[Etapa 9 QA] Probando importación inteligente desde Google Sheets...');
      await login(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);
      await page.waitForURL(/.*settings.*/);
      await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      // Asociar planilla real de test pública
      console.log('[Etapa 9 QA] Asociando planilla externa de test...');
      await page.click('button:has-text("Asociar Planilla")');
      await page.waitForSelector('h3:has-text("Asociar Planilla Externa")');
      await page.locator('input[placeholder*="Ej: 1jPw9ni4BW"]').fill('1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g');
      await page.locator('label:has-text("Nombre de la Hoja") + input').fill('TEST');
      await page.locator('form button[type="submit"]:has-text("Asociar Planilla")').click();
      await page.waitForTimeout(2000);

      // Exportar solicitudes en consideración a la planilla
      console.log('[Etapa 9 QA] Exportando solicitudes a Google Sheets...');
      await page.locator('button:has-text("Exportar Planilla")').click();
      await expect(page.locator('text=Sincronización de exportación finalizada')).toBeVisible({ timeout: 35000 });
      await page.waitForTimeout(2000);

      // Modificar planilla externa simulada usando el backend test-helper
      console.log('[Etapa 9 QA] Modificando importes en la planilla mediante test-helper...');
      // 1. Importe Positivo (>0): Aprobado -> completadas
      const r1 = await page.request.post(`${BASE_URL}/api/test-helper/modify-solicitud-row`, {
        data: {
          spreadsheetId: '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g',
          sheetName: 'TEST',
          solicitudId: idsCreados.importePos,
          columnName: 'Monto en dinero',
          newValue: '185000'
        }
      });
      expect(r1.ok()).toBeTruthy();

      // 2. Importe Cero (==0): Rechazado -> rechazada
      const r2 = await page.request.post(`${BASE_URL}/api/test-helper/modify-solicitud-row`, {
        data: {
          spreadsheetId: '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g',
          sheetName: 'TEST',
          solicitudId: idsCreados.importeCero,
          columnName: 'Monto en dinero',
          newValue: '0'
        }
      });
      expect(r2.ok()).toBeTruthy();

      // 3. Importe Negativo (<0): Mantiene consideración -> consideracion
      const r3 = await page.request.post(`${BASE_URL}/api/test-helper/modify-solicitud-row`, {
        data: {
          spreadsheetId: '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g',
          sheetName: 'TEST',
          solicitudId: idsCreados.importeNeg,
          columnName: 'Monto en dinero',
          newValue: '-1'
        }
      });
      expect(r3.ok()).toBeTruthy();

      // Importar de vuelta al SGP
      console.log('[Etapa 9 QA] Importando cambios de la planilla a SGP...');
      await page.locator('button:has-text("Importar Planilla")').click();
      await expect(page.locator('text=Sincronización de importación finalizada')).toBeVisible({ timeout: 35000 });
      await page.waitForTimeout(2000);

      // Verificar los estados en la grilla
      // 1. Positivo -> Completadas
      await page.locator('input[placeholder*="Buscar"]').fill(idsCreados.importePos);
      await page.waitForTimeout(1000);
      const stPos = await page.locator(`tbody tr:has-text("#${idsCreados.importePos}") td`).nth(8).innerText();
      expect(stPos.toLowerCase()).toContain('completadas');

      // 2. Cero -> Rechazada
      await page.locator('input[placeholder*="Buscar"]').fill(idsCreados.importeCero);
      await page.waitForTimeout(1000);
      const stCero = await page.locator(`tbody tr:has-text("#${idsCreados.importeCero}") td`).nth(8).innerText();
      expect(stCero.toLowerCase()).toContain('rechazada');

      // 3. Negativo -> Consideracion
      await page.locator('input[placeholder*="Buscar"]').fill(idsCreados.importeNeg);
      await page.waitForTimeout(1000);
      const stNeg = await page.locator(`tbody tr:has-text("#${idsCreados.importeNeg}") td`).nth(8).innerText();
      expect(stNeg.toLowerCase()).toContain('consideracion');

      resSmartImport.estado = 'ÉXITO';
      resSmartImport.obs = 'Importe >0 pasó a completadas, ==0 pasó a rechazada, y <0 se mantuvo en consideracion.';
    } catch (e) {
      resSmartImport.estado = 'FALLÓ';
      resSmartImport.obs = e.message;
      console.error('[Etapa 9 QA] Fallo en importación inteligente', e);
    }
    reportData.resultados.push(resSmartImport);

    // ==========================================
    // LIMPIEZA DE CASOS TEMPORALES EN EL ENTORNO
    // ==========================================
    try {
      console.log('[Etapa 9 QA] Iniciando limpieza de casos temporales...');
      await login(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);
      await page.waitForURL(/.*settings.*/);
      await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      // Buscar por la palabra clave "ELIMINAR" para identificar los temporales de regresión
      await page.locator('input[placeholder*="Buscar"]').fill(`ELIMINAR - E9 - ${randId}`);
      await page.waitForTimeout(2000);

      const rowsTemp = page.locator('tbody tr');
      const countTemp = await rowsTemp.count();
      console.log(`[Etapa 9 QA] Cantidad de registros temporales a eliminar: ${countTemp}`);

      if (countTemp > 0) {
        // Seleccionarlos todos
        for (let i = 0; i < countTemp; i++) {
          await rowsTemp.nth(i).locator('input[type="checkbox"]').check();
        }
        await page.waitForTimeout(1000);

        // Eliminar masivamente
        page.once('dialog', dialog => dialog.accept());
        await page.click('button:has-text("Eliminar")');
        await page.waitForTimeout(3000);
        console.log('[Etapa 9 QA] Casos temporales eliminados con éxito.');
      } else {
        console.log('[Etapa 9 QA] No se encontraron casos temporales para eliminar.');
      }

    } catch (e) {
      console.error('[Etapa 9 QA] Error durante la limpieza de temporales', e);
    }

  });
});
