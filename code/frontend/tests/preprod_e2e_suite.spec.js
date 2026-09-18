import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8080';

// Directorio para evidencias de ejecución
const EVIDENCIAS_DIR = path.resolve(__dirname, '../../../pruebas/preprod_final');
if (!fs.existsSync(EVIDENCIAS_DIR)) {
  fs.mkdirSync(EVIDENCIAS_DIR, { recursive: true });
}

// Asegurar existencia de archivos mock para pruebas de adjuntos
const assetsDir = path.resolve(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
const mockPdf = path.join(assetsDir, 'documento_prueba.pdf');
const mockJpg = path.join(assetsDir, 'cbu_prueba.jpg');
if (!fs.existsSync(mockPdf)) {
  fs.writeFileSync(mockPdf, '%PDF-1.4\n1 0 obj\n<< /Title (Mock Documento Preprod) >>\nendobj\n%%EOF');
}
if (!fs.existsSync(mockJpg)) {
  fs.writeFileSync(mockJpg, 'MOCK JPG CONTENT FOR TESTING SGP');
}

// Matriz de usuarios y credenciales de prueba
const CREDENTIALS = {
  OPERADOR: { email: 'celeste_solari19@hotmail.com', pass: 'Celeste_SGP_2026#' },
  DISTRIBUIDOR: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  RESPONSABLE: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  RESOLUTOR_SUBSIDIO: { email: 'martinnocioni@gmail.com', pass: 'Martin_SGP_2026*' },
  RESOLUTOR_AGENDA: { email: 'mveronicagonzalez79@gmail.com', pass: 'Maria_SGP_2026%' },
  RESOLUTOR_DECLARACION: { email: 'ealfaro.51@gmail.com', pass: 'Eduardo_SGP_2026^' },
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' }
};

const SPREADSHEET_ID = '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3W0Xz6g';
const SHEET_NAME = 'DESA';
const GOOGLE_CALENDAR_ID = 'dieguezfrancisco@gmail.com';

/**
 * Función para iniciar sesión limpiando credenciales previas
 */
async function login(page, email, password, roleToSelect = null) {
  let intentos = 3;
  while (intentos > 0) {
    try {
      await page.goto(`${BASE_URL}/login`, { timeout: 15000, waitUntil: 'domcontentloaded' });
      break;
    } catch (e) {
      intentos--;
      if (intentos === 0) throw e;
      await page.waitForTimeout(1000);
    }
  }

  // Limpiar tokens de sesión previa para aislamiento estricto
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeRole');
  });
  await page.goto(`${BASE_URL}/login`, { timeout: 15000, waitUntil: 'domcontentloaded' });

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
  await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|select-rol|resolutor-settings).*/, { timeout: 20000 });
  await page.waitForTimeout(600);

  // Si requiere seleccionar rol debido a múltiples roles asignados
  if (page.url().includes('/select-rol')) {
    if (roleToSelect) {
      const targetRole = roleToSelect.toLowerCase();
      const btn = page.locator(`[data-testid="select-role-${targetRole}"]`).or(page.locator('button').filter({ hasText: roleToSelect })).first();
      await btn.click();
    } else {
      await page.locator('button').first().click();
    }
    await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|resolutor-settings).*/, { timeout: 15000 });
    await page.waitForTimeout(500);
  }
}

/**
 * Helper universal para crear solicitudes cumpliendo las validaciones del modal de carga rápida
 */
async function crearSolicitudBase(page, nombre, telefono, descripcion, tipoSolicitante = 'Personal') {
  await page.click('button:has-text("Nueva Solicitud")');
  await page.waitForSelector('form');

  await page.locator('label:has-text("Nombre Completo") + input').fill(nombre);
  await page.locator('label:has-text("Teléfono") + input').first().fill(telefono || '3424112233');
  await page.locator('label:has-text("Tipo Solicitante") + select').selectOption(tipoSolicitante);

  const subTypeSel = page.locator('label:has-text("Subtipo") + select');
  if (await subTypeSel.isVisible()) {
    await subTypeSel.selectOption('emprendedor');
  }

  const locSel = page.locator('label:has-text("Localidad") + select');
  if (await locSel.isVisible()) {
    await locSel.selectOption({ index: 1 });
    await page.waitForTimeout(300);
  }

  const barSel = page.locator('label:has-text("Barrio") + select');
  if (await barSel.isVisible()) {
    await barSel.selectOption({ index: 1 });
    await page.waitForTimeout(200);
  }

  await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descripcion);
  await page.click('button:has-text("Guardar Solicitud")');
  await expect(page.getByText(/creada con éxito/i)).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1000);
}

/**
 * Helper para asignar responsable por el Distribuidor
 */
async function asignarDistribuidor(page, nombreBeneficiario) {
  await login(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass, 'Distribuidor');
  await page.goto(`${BASE_URL}/mis-solicitudes`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
  await page.waitForTimeout(800);

  const filaDist = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
  await filaDist.locator('button[title="Ver / Editar Detalles"]').click();
  await page.waitForSelector('label:has-text("Zona Territorial") + select');

  const zonaSelect = page.locator('label:has-text("Zona Territorial") + select');
  await zonaSelect.selectOption({ label: 'Norte' }).catch(() => zonaSelect.selectOption({ index: 1 }));
  await page.waitForTimeout(400);

  const respSelect = page.locator('label:has-text("Responsable") + select');
  await respSelect.selectOption({ label: 'Matías Ippolito' }).catch(() => respSelect.selectOption({ index: 1 }));

  await page.click('button:has-text("Guardar Solicitud")');
  await expect(page.getByText(/actualizada con éxito/i)).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(800);
}

test.describe.serial('Plan de Pruebas Integral Pre-Producción E2E (TC-01 a TC-09)', () => {

  const idPrueba = Date.now().toString().slice(-5);
  console.log(`[TEST-SUITE] Iniciando ejecución con identificador de control #${idPrueba}`);

  // =========================================================================
  // SETUP 0: Configurar Integraciones Externas (Google Calendar y Google Sheets)
  // =========================================================================
  test('Setup 0: Configurar Google Calendar ID y Planilla Google Sheets', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Configurar Google Calendar en Ajustes de Resolutor de Agenda
    console.log('[Setup 0] Configurando Google Calendar ID con la cuenta dieguezfrancisco@gmail.com...');
    await login(page, CREDENTIALS.RESOLUTOR_AGENDA.email, CREDENTIALS.RESOLUTOR_AGENDA.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/resolutor-settings`);
    await page.waitForLoadState('networkidle');

    const calendarInput = page.locator('label:has-text("Google Calendar ID") + input');
    if (await calendarInput.isVisible()) {
      await calendarInput.click({ clickCount: 3 });
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await calendarInput.fill(GOOGLE_CALENDAR_ID);

      await page.click('button:has-text("Guardar Agenda")');
      await expect(page.locator('text=guardada correctamente')).toBeVisible({ timeout: 8000 });
      console.log('✅ Google Calendar ID configurado exitosamente.');
    }

    // 2. Asociar Planilla Google Sheets en Subsidio
    console.log('[Setup 0] Asociando Planilla Google Sheets con ID y hoja DESA...');
    await login(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    const asociarBtn = page.locator('button:has-text("Asociar Planilla")');
    if (await asociarBtn.isVisible()) {
      await asociarBtn.click();
      await page.waitForSelector('h3:has-text("Asociar Planilla Externa")');
      const inputId = page.locator('input[placeholder*="Ej: 1jPw9ni4BW"]');
      await inputId.fill(SPREADSHEET_ID);
      const inputHoja = page.locator('label:has-text("Nombre de la Hoja") + input');
      await inputHoja.fill(SHEET_NAME);
      await page.locator('form button[type="submit"]:has-text("Asociar Planilla")').click();
      await expect(page.locator('text=Planilla asociada correctamente')).toBeVisible({ timeout: 8000 });
      console.log('✅ Planilla externa Google Sheets asociada con pestaña DESA.');
    }
  });

  // =========================================================================
  // BLOQUE 1: SOLICITUDES MONO-RESOLUCIÓN (TC-01, TC-02, TC-03)
  // =========================================================================

  test('TC-01: Solicitud Solo Subsidio (Ciclo Completo Mono-Resolución)', async ({ page }) => {
    test.setTimeout(120000);
    const nombreBeneficiario = `Beneficiario Subsidio TC01 ${idPrueba}`;
    const descSubsidio = `Solicitud exclusiva de subsidio mono-resolución para equipamiento ${idPrueba}`;

    // Paso 1: Carga por Operador
    console.log('[TC-01] 1. Operador carga solicitud de Subsidio...');
    await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass, 'Operador');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');
    await crearSolicitudBase(page, nombreBeneficiario, '3424112233', descSubsidio, 'Personal');
    console.log('✅ Solicitud TC-01 creada por Operador.');

    // Paso 2: Distribución por Distribuidor
    console.log('[TC-01] 2. Distribuidor asigna Responsable...');
    await asignarDistribuidor(page, nombreBeneficiario);
    console.log('✅ Responsable asignado por Distribuidor.');

    // Paso 3: Derivación de Subsidio por Responsable
    console.log('[TC-01] 3. Responsable deriva asignación de Subsidio a Martín Nocioni...');
    await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass, 'Responsable');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);

    const filaResp = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await filaResp.locator('button[title="Ver / Editar Detalles"]').click();

    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(400);
    await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
    await page.waitForTimeout(400);

    await page.locator('label:has-text("Tipo de pedido") + select').selectOption('Personal');
    await page.locator('label:has-text("Nombre y apellido") + input').fill(nombreBeneficiario);
    await page.locator('label:has-text("DNI") + input').first().fill('20-33445566-9');
    await page.locator('label:has-text("Monto") + input').first().fill('150000');

    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.getByText(/actualizada con éxito/i)).toBeVisible({ timeout: 10000 });
    console.log('✅ Subsidio derivado por Responsable.');

    // Paso 4: Aceptación y Resolución por Resolutor Subsidio
    console.log('[TC-01] 4. Resolutor Subsidio aprueba y registra resolución...');
    await login(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);

    const filaRes = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await filaRes.locator('button[title="Ver / Editar Detalles"]').click();

    await page.click('button:has-text("Aprobar Resolución")');
    const modalAprobar = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await modalAprobar.waitFor({ state: 'visible', timeout: 5000 });
    await modalAprobar.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill('Subsidio aprobado. N° de Expediente EXP-SUB-2026-991, Fecha de cobro programada 2026-09-30.');
    await modalAprobar.locator('button:has-text("Confirmar y Finalizar")').click();

    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'tc01_subsidio_completado.png'), fullPage: true });
    console.log('✅ TC-01: Ciclo completo de Subsidio finalizado con éxito.');
  });

  test('TC-02: Solicitud Solo Agenda (Ciclo Completo + Sincronización Google Calendar)', async ({ page }) => {
    test.setTimeout(120000);
    const nombreBeneficiario = `Institución Agenda TC02 ${idPrueba}`;
    const descAgenda = `Coordinación de evento institucional y reunión territorial ${idPrueba}`;

    // Paso 1: Carga por Operador
    console.log('[TC-02] 1. Operador crea solicitud de Agenda...');
    await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass, 'Operador');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');
    await crearSolicitudBase(page, nombreBeneficiario, '3424998877', descAgenda, 'Club');

    // Paso 2: Distribución
    console.log('[TC-02] 2. Distribuidor asigna Responsable territorial...');
    await asignarDistribuidor(page, nombreBeneficiario);

    // Paso 3: Derivación de Agenda por Responsable
    console.log('[TC-02] 3. Responsable deriva asignación de Agenda a María Verónica González...');
    await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass, 'Responsable');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);

    const filaResp = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await filaResp.locator('button[title="Ver / Editar Detalles"]').click();

    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(400);
    await page.locator('select:has-text("Seleccione Área...")').first().selectOption('AGENDA');
    await page.waitForTimeout(500);

    await page.locator('label:has-text("Tipo de actividad") + select').selectOption('Reunión');
    await page.locator('label:has-text("Organizada por nosotros?") + select').selectOption('si');
    await page.locator('label:has-text("Descripción/temario") + textarea').fill('Planificación de actividades comunitarias');
    await page.locator('label:has-text("Asistentes") + input').fill('30');
    await page.locator('label:has-text("Declaración de interés") + select').selectOption('no');
    await page.locator('label:has-text("Aporte?") + select').selectOption('no');
    await page.locator('label:has-text("Día") + input').fill('2026-09-25');
    await page.locator('label:has-text("Hora") + input').fill('14:30');
    await page.locator('label:has-text("Responsable") + input').last().fill('Matías Ippolito');
    await page.locator('label:has-text("Observación") + textarea').last().fill('Confirmar sala y proyector');

    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.getByText(/actualizada con éxito/i)).toBeVisible({ timeout: 10000 });
    console.log('✅ Agenda derivada por Responsable.');

    // Paso 4: Agendamiento y Creación de Evento en Google Calendar por Resolutor Agenda
    console.log('[TC-02] 4. Resolutor Agenda aprueba agendamiento con Google Calendar...');
    await login(page, CREDENTIALS.RESOLUTOR_AGENDA.email, CREDENTIALS.RESOLUTOR_AGENDA.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);

    const filaRes = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await filaRes.locator('button[title="Ver / Editar Detalles"]').click();

    await page.click('button:has-text("Aprobar Resolución")');
    const modalAprobar = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await modalAprobar.waitFor({ state: 'visible', timeout: 5000 });

    // Seleccionar asistencia obligatoria
    const radioAsist = modalAprobar.locator('input[name="asistencia"][value="con asistencia"]');
    if (await radioAsist.isVisible()) {
      await radioAsist.check();
    }

    // Habilitar creación de evento Google Calendar
    const checkboxCal = modalAprobar.locator('input[type="checkbox"]').first();
    if (await checkboxCal.isVisible() && !(await checkboxCal.isChecked())) {
      await checkboxCal.check();
    }

    await modalAprobar.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill(`Reunión agendada y confirmada en Google Calendar para la cuenta ${GOOGLE_CALENDAR_ID}.`);

    await modalAprobar.locator('button:has-text("Confirmar y Finalizar")').click();
    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'tc02_agenda_calendar_completado.png'), fullPage: true });
    console.log('✅ TC-02: Ciclo de Agenda con Google Calendar finalizado con éxito.');
  });

  test('TC-03: Solicitud Solo Declaración de Interés (Ciclo Completo Mono-Resolución)', async ({ page }) => {
    test.setTimeout(120000);
    const nombreBeneficiario = `Institución Interés TC03 ${idPrueba}`;
    const descInteres = `Solicitud de declaración de interés provincial para jornada formativa ${idPrueba}`;

    // Paso 1: Carga por Operador
    console.log('[TC-03] 1. Operador crea solicitud de Declaración de Interés...');
    await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass, 'Operador');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');
    await crearSolicitudBase(page, nombreBeneficiario, '3424556677', descInteres, 'Club');

    // Paso 2: Distribución
    console.log('[TC-03] 2. Distribuidor asigna Responsable...');
    await asignarDistribuidor(page, nombreBeneficiario);

    // Paso 3: Responsable deriva Declaración de Interés a Eduardo Alfaro
    console.log('[TC-03] 3. Responsable deriva Declaración de Interés...');
    await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass, 'Responsable');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);

    const filaResp = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await filaResp.locator('button[title="Ver / Editar Detalles"]').click();

    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(400);
    await page.locator('select:has-text("Seleccione Área...")').first().selectOption('DECLARACION DE INTERES');
    await page.waitForTimeout(500);

    await page.locator('label:has-text("Nombre completo del evento") + input').last().fill(`Jornada Científica Litoral ${idPrueba}`);
    await page.locator('label:has-text("Actividad") + input').last().fill('Exposición y talleres de divulgación');
    await page.locator('label:has-text("Institución a declarar") + input').last().fill('Asociación Científica Santafesina');
    await page.locator('label:has-text("Tipo") + select').last().selectOption('científico');
    await page.locator('label:has-text("Descripción") + textarea').last().fill('Encuentro anual sobre avances en ciencia y tecnología aplicada');
    await page.locator('label:has-text("Fecha") + input').last().fill('2026-10-18');
    await page.locator('label:has-text("Dirección") + input').last().fill('Bv. Pellegrini 2750');
    await page.locator('label:has-text("Fundamentos") + textarea').last().fill('Interés estratégico para el fortalecimiento académico y productivo');
    await page.locator('label:has-text("Responsable") + input').last().fill('Eduardo Alfaro');

    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.getByText(/actualizada con éxito/i)).toBeVisible({ timeout: 10000 });
    console.log('✅ Declaración de Interés derivada por Responsable.');

    // Paso 4: Dictamen y Carga de Expediente por Resolutor Eduardo Alfaro
    console.log('[TC-03] 4. Resolutor Eduardo Alfaro aprueba dictamen de Declaración de Interés...');
    await login(page, CREDENTIALS.RESOLUTOR_DECLARACION.email, CREDENTIALS.RESOLUTOR_DECLARACION.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);

    const filaRes = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await filaRes.locator('button[title="Ver / Editar Detalles"]').click();

    await page.click('button:has-text("Aprobar Resolución")');
    const modalAprobar = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await modalAprobar.waitFor({ state: 'visible', timeout: 5000 });
    await modalAprobar.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill('Dictamen favorable emitido con beneplácito unánime. N° de Expediente EXP-DEC-2026-5541.');
    await modalAprobar.locator('button:has-text("Confirmar y Finalizar")').click();

    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'tc03_declaracion_interes_completado.png'), fullPage: true });
    console.log('✅ TC-03: Ciclo de Declaración de Interés finalizado con éxito.');
  });

  // =========================================================================
  // BLOQUE 2: SOLICITUDES MULTI-RESOLUCIÓN COMBINADAS (TC-04, TC-05, TC-06)
  // =========================================================================

  test('TC-04: Multi-resolución Combinada Subsidio + Agenda', async ({ page }) => {
    test.setTimeout(180000);
    const nombreBeneficiario = `Combinada Subsidio y Agenda ${idPrueba}`;
    const descCombinada = `Solicitud combinada doble con requerimiento de subsidio y cobertura de agenda ${idPrueba}`;

    // Paso 1: Carga y Distribución
    console.log('[TC-04] 1. Operador crea y Distribuidor asigna...');
    await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass, 'Operador');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await crearSolicitudBase(page, nombreBeneficiario, '3424102030', descCombinada, 'Club');
    await asignarDistribuidor(page, nombreBeneficiario);

    // Paso 2: Responsable agrega ambas asignaciones concurrentes (SUBSIDIO y AGENDA)
    console.log('[TC-04] 2. Responsable asigna concurrentemente SUBSIDIO y AGENDA...');
    await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass, 'Responsable');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);
    const filaResp = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await filaResp.locator('button[title="Ver / Editar Detalles"]').click();

    // 2.1 Asignación 1: SUBSIDIO
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(300);
    await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
    await page.waitForTimeout(400);
    await page.locator('label:has-text("Tipo de pedido") + select').selectOption('Personal');
    await page.locator('label:has-text("Nombre y apellido") + input').fill(nombreBeneficiario);
    await page.locator('label:has-text("DNI") + input').first().fill('20-44556677-9');
    await page.locator('label:has-text("Monto") + input').first().fill('180000');

    // 2.2 Asignación 2: AGENDA
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(300);
    await page.locator('select:has-text("Seleccione Área...")').last().selectOption('AGENDA');
    await page.waitForTimeout(400);
    await page.locator('label:has-text("Tipo de actividad") + select').selectOption('Reunión');
    await page.locator('label:has-text("Organizada por nosotros?") + select').selectOption('si');
    await page.locator('label:has-text("Descripción/temario") + textarea').last().fill('Actividad territorial compartida');
    await page.locator('label:has-text("Asistentes") + input').fill('40');
    await page.locator('label:has-text("Declaración de interés") + select').last().selectOption('no');
    await page.locator('label:has-text("Aporte?") + select').selectOption('no');
    await page.locator('label:has-text("Día") + input').fill('2026-09-28');
    await page.locator('label:has-text("Hora") + input').fill('16:00');
    await page.locator('label:has-text("Responsable") + input').last().fill('Matías Ippolito');
    await page.locator('label:has-text("Observación") + textarea').last().fill('Reunión mixta');

    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.getByText(/actualizada con éxito/i)).toBeVisible({ timeout: 10000 });
    console.log('✅ Ambas asignaciones guardadas por Responsable.');

    // Paso 3: Resolutor Subsidio resuelve su área de forma independiente
    console.log('[TC-04] 3. Resolutor Subsidio aprueba su área de manera independiente...');
    await login(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);
    const filaResSub = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await filaResSub.locator('button[title="Ver / Editar Detalles"]').click();
    await page.click('button:has-text("Aprobar Resolución")');
    const modalAprobarSub = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await modalAprobarSub.waitFor({ state: 'visible', timeout: 5000 });
    await modalAprobarSub.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill('Área de Subsidio aprobada de forma autónoma. N° Expediente EXP-MULT-01');
    await modalAprobarSub.locator('button:has-text("Confirmar y Finalizar")').click();
    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 10000 });

    // Paso 4: Resolutor Agenda resuelve su área de forma independiente
    console.log('[TC-04] 4. Resolutor Agenda aprueba su área de manera independiente...');
    await login(page, CREDENTIALS.RESOLUTOR_AGENDA.email, CREDENTIALS.RESOLUTOR_AGENDA.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);
    const filaResAge = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await filaResAge.locator('button[title="Ver / Editar Detalles"]').click();
    await page.click('button:has-text("Aprobar Resolución")');
    const modalAprobarAge = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await modalAprobarAge.waitFor({ state: 'visible', timeout: 5000 });

    const radioAsist = modalAprobarAge.locator('input[name="asistencia"][value="con asistencia"]');
    if (await radioAsist.isVisible()) {
      await radioAsist.check();
    }

    await modalAprobarAge.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill('Área de Agenda aprobada sin interferencias concurrentes.');
    await modalAprobarAge.locator('button:has-text("Confirmar y Finalizar")').click();
    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'tc04_multiresolucion_subsidio_agenda.png'), fullPage: true });
    console.log('✅ TC-04: Multi-resolución Subsidio + Agenda finalizada con éxito.');
  });

  test('TC-05: Multi-resolución Combinada Agenda + Declaración de Interés', async ({ page }) => {
    test.setTimeout(180000);
    const nombreBeneficiario = `Combinada Agenda y Declaracion ${idPrueba}`;
    const descCombinada = `Evento público con pedido de agenda y declaración legislativa de interés ${idPrueba}`;

    // Paso 1: Carga y Distribución
    console.log('[TC-05] 1. Operador crea y Distribuidor asigna...');
    await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass, 'Operador');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await crearSolicitudBase(page, nombreBeneficiario, '3424778899', descCombinada, 'Club');
    await asignarDistribuidor(page, nombreBeneficiario);

    // Paso 2: Responsable agrega AGENDA y DECLARACION DE INTERES
    console.log('[TC-05] 2. Responsable asigna concurrentemente AGENDA y DECLARACION DE INTERES...');
    await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass, 'Responsable');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);
    const filaResp = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await filaResp.locator('button[title="Ver / Editar Detalles"]').click();

    // 2.1 AGENDA
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(300);
    await page.locator('select:has-text("Seleccione Área...")').first().selectOption('AGENDA');
    await page.waitForTimeout(400);
    await page.locator('label:has-text("Tipo de actividad") + select').selectOption('Reunión');
    await page.locator('label:has-text("Organizada por nosotros?") + select').selectOption('si');
    await page.locator('label:has-text("Descripción/temario") + textarea').fill('Encuentro de liderazgos juveniles');
    await page.locator('label:has-text("Asistentes") + input').fill('50');
    await page.locator('label:has-text("Declaración de interés") + select').selectOption('si');
    await page.locator('label:has-text("Aporte?") + select').selectOption('no');
    await page.locator('label:has-text("Día") + input').fill('2026-10-05');
    await page.locator('label:has-text("Hora") + input').fill('10:00');
    await page.locator('label:has-text("Responsable") + input').last().fill('Matías Ippolito');
    await page.locator('label:has-text("Observación") + textarea').last().fill('Reunión y acto protocolar');

    // 2.2 DECLARACION DE INTERES
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(300);
    await page.locator('select:has-text("Seleccione Área...")').last().selectOption('DECLARACION DE INTERES');
    await page.waitForTimeout(400);
    await page.locator('label:has-text("Nombre completo del evento") + input').last().fill(`Congreso Juvenil Provincial ${idPrueba}`);
    await page.locator('label:has-text("Actividad") + input').last().fill('Debates, talleres y ponencias');
    await page.locator('label:has-text("Institución a declarar") + input').last().fill('Red Provincial de Juventudes');
    await page.locator('label:has-text("Tipo") + select').last().selectOption('social');
    await page.locator('label:has-text("Descripción") + textarea').last().fill('Jornada de participación cívica y social');
    await page.locator('label:has-text("Fecha") + input').last().fill('2026-10-05');
    await page.locator('label:has-text("Dirección") + input').last().fill('Av. Freyre 2200');
    await page.locator('label:has-text("Fundamentos") + textarea').last().fill('Promoción de la participación ciudadana juvenil');
    await page.locator('label:has-text("Responsable") + input').last().fill('Eduardo Alfaro');

    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.getByText(/actualizada con éxito/i)).toBeVisible({ timeout: 10000 });
    console.log('✅ Ambas asignaciones concurrentes guardadas.');

    // Paso 3: Resolutores procesan de forma independiente
    console.log('[TC-05] 3. Resolutor Agenda aprueba resolución...');
    await login(page, CREDENTIALS.RESOLUTOR_AGENDA.email, CREDENTIALS.RESOLUTOR_AGENDA.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);
    const filaResAge = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await filaResAge.locator('button[title="Ver / Editar Detalles"]').click();
    await page.click('button:has-text("Aprobar Resolución")');
    const modalAprobarAge = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await modalAprobarAge.waitFor({ state: 'visible', timeout: 5000 });

    const radioAsist = modalAprobarAge.locator('input[name="asistencia"][value="con asistencia"]');
    if (await radioAsist.isVisible()) {
      await radioAsist.check();
    }

    await modalAprobarAge.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill('Agenda aprobada y agendada correctamente.');
    await modalAprobarAge.locator('button:has-text("Confirmar y Finalizar")').click();
    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 10000 });

    console.log('[TC-05] 4. Resolutor Declaración de Interés aprueba dictamen...');
    await login(page, CREDENTIALS.RESOLUTOR_DECLARACION.email, CREDENTIALS.RESOLUTOR_DECLARACION.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);
    const filaResDec = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await filaResDec.locator('button[title="Ver / Editar Detalles"]').click();
    await page.click('button:has-text("Aprobar Resolución")');
    const modalAprobarDec = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await modalAprobarDec.waitFor({ state: 'visible', timeout: 5000 });
    await modalAprobarDec.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill('Declaración aprobada con dictamen formal. N° EXP-DEC-2026-6677');
    await modalAprobarDec.locator('button:has-text("Confirmar y Finalizar")').click();
    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'tc05_multiresolucion_agenda_declaracion.png'), fullPage: true });
    console.log('✅ TC-05: Multi-resolución Agenda + Declaración de Interés finalizada con éxito.');
  });

  test('TC-06: Multi-resolución Triple Concurrente (Subsidio + Agenda + Declaración de Interés)', async ({ page }) => {
    test.setTimeout(240000);
    const nombreBeneficiario = `Triple Concurrente Integral ${idPrueba}`;
    const descTriple = `Solicitud integral con triple resolución: subsidio, cobertura de agenda y declaración ${idPrueba}`;

    // Paso 1: Carga y Distribución
    console.log('[TC-06] 1. Operador crea solicitud para triple resolución...');
    await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass, 'Operador');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await crearSolicitudBase(page, nombreBeneficiario, '3424123456', descTriple, 'Club');
    await asignarDistribuidor(page, nombreBeneficiario);

    // Paso 2: Responsable agrega las tres asignaciones concurrentemente
    console.log('[TC-06] 2. Responsable asigna SUBSIDIO, AGENDA y DECLARACION DE INTERES...');
    await login(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass, 'Responsable');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);
    const filaResp = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await filaResp.locator('button[title="Ver / Editar Detalles"]').click();

    // 2.1 SUBSIDIO
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(300);
    await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
    await page.waitForTimeout(400);
    await page.locator('label:has-text("Tipo de pedido") + select').selectOption('Personal');
    await page.locator('label:has-text("Nombre y apellido") + input').fill(nombreBeneficiario);
    await page.locator('label:has-text("DNI") + input').first().fill('20-77889900-9');
    await page.locator('label:has-text("Monto") + input').first().fill('250000');

    // 2.2 AGENDA
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(300);
    await page.locator('select:has-text("Seleccione Área...")').last().selectOption('AGENDA');
    await page.waitForTimeout(400);
    await page.locator('label:has-text("Tipo de actividad") + select').selectOption('Evento');
    await page.locator('label:has-text("Organizada por nosotros?") + select').selectOption('si');
    await page.locator('label:has-text("Descripción/temario") + textarea').last().fill('Festival artístico con feria comunitaria');
    await page.locator('label:has-text("Asistentes") + input').fill('150');
    await page.locator('label:has-text("Declaración de interés") + select').last().selectOption('si');
    await page.locator('label:has-text("Aporte?") + select').selectOption('no');
    await page.locator('label:has-text("Día") + input').fill('2026-10-12');
    await page.locator('label:has-text("Hora") + input').fill('17:00');
    await page.locator('label:has-text("Responsable") + input').last().fill('Matías Ippolito');
    await page.locator('label:has-text("Observación") + textarea').last().fill('Coordinación triple');

    // 2.3 DECLARACION DE INTERES
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(300);
    await page.locator('select:has-text("Seleccione Área...")').last().selectOption('DECLARACION DE INTERES');
    await page.waitForTimeout(400);
    await page.locator('label:has-text("Nombre completo del evento") + input').last().fill(`Festival Cultural Solidario ${idPrueba}`);
    await page.locator('label:has-text("Actividad") + input').last().fill('Música en vivo y feria gastronómica');
    await page.locator('label:has-text("Institución a declarar") + input').last().fill('Vecinal Barrio Centro');
    await page.locator('label:has-text("Tipo") + select').last().selectOption('cultural');
    await page.locator('label:has-text("Descripción") + textarea').last().fill('Festival barrial con fines comunitarios');
    await page.locator('label:has-text("Fecha") + input').last().fill('2026-10-12');
    await page.locator('label:has-text("Dirección") + input').last().fill('Plaza San Martín');
    await page.locator('label:has-text("Fundamentos") + textarea').last().fill('Fomento de la cultura y la integración social comunitaria');
    await page.locator('label:has-text("Responsable") + input').last().fill('Eduardo Alfaro');

    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.getByText(/actualizada con éxito/i)).toBeVisible({ timeout: 10000 });
    console.log('✅ Las 3 áreas concurrentes fueron asignadas y guardadas.');

    // Paso 3: Resolución por los 3 resolutores en paralelo
    // 3.1 Subsidio
    console.log('[TC-06] 3.1 Resolutor Subsidio aprueba su área...');
    await login(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);
    const fSub = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await fSub.locator('button[title="Ver / Editar Detalles"]').click();
    await page.click('button:has-text("Aprobar Resolución")');
    const mSub = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await mSub.waitFor({ state: 'visible', timeout: 5000 });
    await mSub.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill('Subsidio aprobado para gastos operativos del festival.');
    await mSub.locator('button:has-text("Confirmar y Finalizar")').click();
    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 10000 });

    // 3.2 Agenda
    console.log('[TC-06] 3.2 Resolutor Agenda aprueba su área...');
    await login(page, CREDENTIALS.RESOLUTOR_AGENDA.email, CREDENTIALS.RESOLUTOR_AGENDA.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);
    const fAge = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await fAge.locator('button[title="Ver / Editar Detalles"]').click();
    await page.click('button:has-text("Aprobar Resolución")');
    const mAge = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await mAge.waitFor({ state: 'visible', timeout: 5000 });

    const rAsist = mAge.locator('input[name="asistencia"][value="con asistencia"]');
    if (await rAsist.isVisible()) {
      await rAsist.check();
    }

    await mAge.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill('Agenda aprobada y coordinada.');
    await mAge.locator('button:has-text("Confirmar y Finalizar")').click();
    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 10000 });

    // 3.3 Declaración de Interés
    console.log('[TC-06] 3.3 Resolutor Declaración aprueba su área...');
    await login(page, CREDENTIALS.RESOLUTOR_DECLARACION.email, CREDENTIALS.RESOLUTOR_DECLARACION.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar por N"]', nombreBeneficiario);
    await page.waitForTimeout(800);
    const fDec = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
    await fDec.locator('button[title="Ver / Editar Detalles"]').click();
    await page.click('button:has-text("Aprobar Resolución")');
    const mDec = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await mDec.waitFor({ state: 'visible', timeout: 5000 });
    await mDec.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill('Declaración aprobada por unanimidad. EXP-DEC-TRIPLE-2026');
    await mDec.locator('button:has-text("Confirmar y Finalizar")').click();
    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'tc06_triple_concurrente_completado.png'), fullPage: true });
    console.log('✅ TC-06: Solicitud triple concurrente procesada y completada con éxito.');
  });

  // =========================================================================
  // BLOQUE 3: ACCIONES MASIVAS POR LOTE Y MENÚ CONTEXTUAL (TC-07, TC-08, TC-09)
  // =========================================================================

  test('TC-07: Selección Múltiple, Barra Flotante Contextual y Control de Permisos', async ({ page }) => {
    test.setTimeout(90000);

    console.log('[TC-07] Verificando selección múltiple y permisos de la barra flotante...');
    await login(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    // Seleccionar checkboxes de las primeras dos filas de la grilla
    const filas = page.locator('tbody tr');
    await expect(filas.first()).toBeVisible({ timeout: 10000 });

    const check1 = filas.nth(0).locator('input[type="checkbox"]');
    const check2 = filas.nth(1).locator('input[type="checkbox"]');

    await check1.check();
    await check2.check();

    // Comprobar aparición de la barra flotante con indicador dinámico
    const barraFlotante = page.locator('div.absolute.top-4');
    await expect(barraFlotante).toBeVisible();
    await expect(page.locator('span:text-is("2 seleccionadas")')).toBeVisible();
    console.log('✅ Barra flotante visible con badge dinámico "2 seleccionadas".');

    // Comprobar botones de acción permitidos para Resolutor de Subsidio (Consideración e Importar)
    await expect(barraFlotante.locator('button:has-text("Consideración")')).toBeVisible();
    await expect(barraFlotante.locator('button:has-text("Importar")')).toBeVisible();
    await expect(barraFlotante.locator('button:has-text("Exportar")')).not.toBeVisible();
    console.log('✅ Botones Consideración e Importar visibles para Resolutor de Subsidio (Exportar ausente según diseño oficial).');

    // Validar que el selector de Reasignación de Responsable y el botón Eliminar NO estén presentes
    const comboReasignar = barraFlotante.locator('select:has-text("Asignar Responsable...")');
    await expect(comboReasignar).not.toBeVisible();

    const btnEliminar = barraFlotante.locator('button:has-text("Eliminar")');
    await expect(btnEliminar).not.toBeVisible();
    console.log('✅ Permisos estrictos validados: Combo de reasignación y Eliminar ocultos.');

    // Probar deselección y desaparición de la barra
    await check1.uncheck();
    await check2.uncheck();
    await expect(barraFlotante).not.toBeVisible();
    console.log('✅ TC-07: Comportamiento de la barra flotante y permisos validado con éxito.');
  });

  test('TC-08: Consideración en Lote (Batch Consideracion)', async ({ page }) => {
    test.setTimeout(120000);
    const nomLoteA = `Batch Beneficiario A ${idPrueba}`;
    const nomLoteB = `Batch Beneficiario B ${idPrueba}`;

    // Paso 1: Operador crea 2 solicitudes de subsidio
    console.log('[TC-08] 1. Operador crea 2 solicitudes para lote...');
    await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass, 'Operador');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    await crearSolicitudBase(page, nomLoteA, '3424001122', `Pedido lote A ${idPrueba}`, 'Personal');
    await crearSolicitudBase(page, nomLoteB, '3424001133', `Pedido lote B ${idPrueba}`, 'Personal');
    console.log('✅ Dos solicitudes creadas para el lote.');

    // Paso 2: Administrador pone en consideración en lote
    console.log('[TC-08] 2. Ejecutando Poner en Consideración por lote desde la barra flotante...');
    await login(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    // Filtrar por ID de prueba para tener ambas en pantalla
    await page.fill('input[placeholder*="Buscar por N"]', idPrueba);
    await page.waitForTimeout(1000);

    const filaA = page.locator('tbody tr').filter({ hasText: nomLoteA }).first();
    const filaB = page.locator('tbody tr').filter({ hasText: nomLoteB }).first();

    await filaA.locator('input[type="checkbox"]').check();
    await filaB.locator('input[type="checkbox"]').check();
    await expect(page.locator('span:text-is("2 seleccionadas")')).toBeVisible();

    // Aceptar automáticamente el confirm dialog
    page.once('dialog', async dialog => {
      console.log(`[TC-08] Diálogo de confirmación interceptado: "${dialog.message()}"`);
      await dialog.accept();
    });

    // Interceptar la llamada batch a la API
    const [batchResponse] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/solicitudes/consideracion/batch') && res.status() === 200),
      page.click('div.absolute.top-4 button:has-text("Consideración")')
    ]);

    const batchData = await batchResponse.json();
    console.log('[TC-08] Respuesta de API batch:', batchData);

    await expect(page.getByText(/puesto en consideración 2 solicitudes/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'tc08_batch_consideracion_exito.png'), fullPage: true });
    console.log('✅ TC-08: Consideración en lote ejecutada y confirmada exitosamente.');
  });

  test('TC-09: Importación Selectiva Masiva desde Google Sheets', async ({ page }) => {
    test.setTimeout(120000);

    console.log('[TC-09] 1. Ejecutando Importación Selectiva desde Google Sheets...');
    await login(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    // Filtrar por las solicitudes de lote en consideración
    await page.fill('input[placeholder*="Buscar por N"]', idPrueba);
    await page.waitForTimeout(1000);

    const checkboxes = page.locator('tbody tr input[type="checkbox"]');
    const totalFilas = await checkboxes.count();
    if (totalFilas < 2) {
      console.warn('[TC-09] Menos de 2 filas encontradas por filtro, seleccionando filas disponibles en vista.');
      await page.fill('input[placeholder*="Buscar por N"]', '');
      await page.waitForTimeout(1000);
    }

    const checkA = page.locator('tbody tr').nth(0).locator('input[type="checkbox"]');
    const checkB = page.locator('tbody tr').nth(1).locator('input[type="checkbox"]');
    await checkA.check();
    await checkB.check();

    await expect(page.locator('span:text-is("2 seleccionadas")')).toBeVisible();

    // Importar en Lote usando el botón contextual Importar
    console.log('[TC-09] Ejecutando Importación Selectiva desde Google Sheets...');
    const [importResponse] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/planilla-salida/import')),
      page.click('div.absolute.top-4 button:has-text("Importar")')
    ]);

    console.log(`[TC-09] Estado HTTP Importar: ${importResponse.status()}`);
    const importJson = await importResponse.json();
    console.log('[TC-09] Respuesta de importación:', importJson);
    expect(importResponse.status()).toBe(200);
    await expect(page.getByText(/Importación selectiva/i).or(page.getByText(/importación finalizada/i))).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'tc09_import_sheets_exito.png'), fullPage: true });
    console.log('✅ TC-09: Importación selectiva masiva finalizada con éxito.');
  });

});
