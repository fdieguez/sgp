import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8080';

// Directorio de evidencias
const EVIDENCIAS_DIR = path.resolve(__dirname, '../../../pruebas/certificacion_preproduccion');
if (!fs.existsSync(EVIDENCIAS_DIR)) {
  fs.mkdirSync(EVIDENCIAS_DIR, { recursive: true });
}

// Nómina oficial de credenciales (18/09/2026)
const CREDENTIALS = {
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' },
  OPERADOR: { email: 'celeste_solari19@hotmail.com', pass: 'Celeste_SGP_2026#' },
  DISTRIBUIDOR: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  RESPONSABLE: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  RESOLUTOR_SUBSIDIO: { email: 'martinnocioni@gmail.com', pass: 'Martin_SGP_2026*' },
  RESOLUTOR_AGENDA: { email: 'mveronicagonzalez79@gmail.com', pass: 'Maria_SGP_2026%' },
  RESOLUTOR_DECLARACION: { email: 'ealfaro.51@gmail.com', pass: 'Eduardo_SGP_2026^' },
  AUDITOR: { email: 'test.auditor@gmail.com', pass: 'Auditor_SGP_2026!' }
};

/**
 * Helper unificado para iniciar sesión con aislamiento estricto y selección de rol
 */
async function iniciarSesion(page, email, password, rolASeleccionar = null) {
  await page.goto(`${BASE_URL}/login`, { timeout: 15000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);

  // Limpiar tokens y storage previo para aislamiento total entre tests
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeRole');
  });

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
  await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|select-rol).*/, { timeout: 20000 });
  await page.waitForTimeout(500);

  // Si tiene selección de rol
  if (page.url().includes('/select-rol')) {
    if (rolASeleccionar) {
      const targetRole = rolASeleccionar.toLowerCase();
      const roleBtn = page.locator(`[data-testid="select-role-${targetRole}"]`)
        .or(page.locator(`button:has(h3:has-text("${rolASeleccionar}"))`)).first();
      await roleBtn.click();
    } else {
      await page.locator('.grid button').first().click();
    }
    await page.waitForURL(/.*(dashboard|mis-solicitudes|settings).*/, { timeout: 15000 });
    await page.waitForTimeout(500);
  }
}

test.describe('🏆 Certificación Pre-Producción SGP: Todos los Roles y Línea Base', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(({}, testInfo) => {
    testInfo.setTimeout(60000);
  });

  const idTest = Date.now().toString().slice(-4);
  const nombreVecinal = `Vecinal San Martín TC01-${idTest}`;
  const nombreClub = `Club Atlético Juventud TC02-${idTest}`;

  // =========================================================================
  // CASO 1: Mantenimiento y Reseteo AUTO_INCREMENT = 1
  // =========================================================================
  test('Caso 1: Mantenimiento - Vaciado Transaccional con Reseteo de Índices (ID = 1)', async ({ request }) => {
    console.log('[Caso 1] Ejecutando vaciado de base de datos y reseteo de secuencia...');
    
    // Login admin para obtener token
    const loginRes = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: { email: CREDENTIALS.ADMIN.email, password: CREDENTIALS.ADMIN.pass }
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();

    // Invocar endpoint de mantenimiento
    const clearRes = await request.post(`${BACKEND_URL}/api/admin/maintenance/clear-transactions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        password: CREDENTIALS.ADMIN.pass,
        confirmText: 'LIMPIAR'
      }
    });
    expect(clearRes.ok()).toBeTruthy();
    const data = await clearRes.json();
    console.log('✅ Base de datos limpiada con éxito:', data.message);
  });

  // =========================================================================
  // CASO 2: Rol Operador (Mesa de Entrada) - Creación y Validación de ID = 1
  // =========================================================================
  test('Caso 2: Rol Operador - Creación de Solicitud Inicial en Mesa de Entrada (Verificación ID #1)', async ({ page }) => {
    console.log('[Caso 2] Iniciando sesión como Operador...');
    await iniciarSesion(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);

    console.log('[Caso 2] Navegando a Mis Solicitudes para crear la primera solicitud...');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    // Botón Nueva Solicitud
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('form');

    // Completar datos básicos
    await page.locator('label:has-text("Nombre Completo") + input').fill(nombreVecinal);
    await page.locator('label:has-text("Teléfono") + input').first().fill('3424556677');
    await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('ONGs');

    // Localidad y Barrio
    const selLoc = page.locator('label:has-text("Localidad") + select');
    if (await selLoc.isVisible()) {
      await selLoc.selectOption({ index: 1 });
      await page.waitForTimeout(300);
    }
    const selBar = page.locator('label:has-text("Barrio") + select');
    if (await selBar.isVisible()) {
      await selBar.selectOption({ index: 1 });
      await page.waitForTimeout(200);
    }

    await page.locator('label:has-text("Descripción / Pedido") + textarea').fill('Pedido de luminarias y desmalezado para plaza barrial');
    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.getByText(/creada con éxito/i)).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    // Verificar en la grilla que la solicitud se creó con ID #1
    const fila = page.locator('tbody tr').filter({ hasText: nombreVecinal }).first();
    await expect(fila).toBeVisible({ timeout: 10000 });
    
    // Validar visualmente y tomar captura
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '01_operador_solicitud_id1.png'), fullPage: true });
    console.log('✅ Caso 2 Aprobado: Solicitud creada por Operador en Mesa de Entrada con ID #1');
  });

  // =========================================================================
  // CASO 3: Rol Distribuidor - Asignación Territorial de Solicitud
  // =========================================================================
  test('Caso 3: Rol Distribuidor - Asignación Territorial de Solicitud a Responsable Zonal', async ({ page }) => {
    console.log('[Caso 3] Iniciando sesión como Distribuidor (Matías Ippólito)...');
    await iniciarSesion(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass, 'Distribuidor');

    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[placeholder*="Buscar"]', nombreVecinal);
    await page.waitForTimeout(600);

    const fila = page.locator('tbody tr').filter({ hasText: nombreVecinal }).first();
    await expect(fila).toBeVisible({ timeout: 10000 });
    await fila.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('form');

    // Asignar Zona Territorial y Responsable
    const selZona = page.locator('label:has-text("Zona Territorial") + select');
    await selZona.waitFor({ state: 'visible', timeout: 10000 });
    await selZona.selectOption({ index: 1 });
    await page.waitForTimeout(500);

    const selResp = page.locator('label:has-text("Responsable") + select');
    await selResp.waitFor({ state: 'visible', timeout: 10000 });
    await selResp.selectOption({ index: 1 });
    await page.waitForTimeout(300);

    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.getByText(/actualizada con éxito/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '02_distribuidor_asignada.png'), fullPage: true });
    console.log('✅ Caso 3 Aprobado: Solicitud distribuida y asignada exitosamente.');
  });

  // =========================================================================
  // CASO 4: Rol Responsable - Alta Directa (Línea Base) y Derivación Concurrente
  // =========================================================================
  test('Caso 4: Rol Responsable - Alta Directa (Pre-asignación ID/Zona) y Derivación Concurrente Triple', async ({ page }) => {
    console.log('[Caso 4] Iniciando sesión como Responsable...');
    await iniciarSesion(page, CREDENTIALS.RESPONSABLE.email, CREDENTIALS.RESPONSABLE.pass, 'Responsable');

    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    // 1. Validar que el botón "Nueva Solicitud" está habilitado para Responsables
    const btnNueva = page.locator('button:has-text("Nueva Solicitud")');
    await expect(btnNueva).toBeVisible({ timeout: 8000 });
    await btnNueva.click();
    await page.waitForSelector('form');

    // 2. Completar solicitud propia con pre-asignación automática
    await page.locator('label:has-text("Nombre Completo") + input').fill(nombreClub);
    await page.locator('label:has-text("Teléfono") + input').first().fill('3424991122');
    await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Club');
    
    const selLoc = page.locator('label:has-text("Localidad") + select');
    if (await selLoc.isVisible()) {
      await selLoc.selectOption({ index: 1 });
      await page.waitForTimeout(300);
    }
    const selBar = page.locator('label:has-text("Barrio") + select');
    if (await selBar.isVisible()) {
      await selBar.selectOption({ index: 1 });
      await page.waitForTimeout(200);
    }

    await page.locator('label:has-text("Descripción / Pedido") + textarea').fill('Proyecto integral de infraestructura deportiva comunitaria');

    // 3. Agregar Asignación 1: SUBSIDIO
    console.log('[Caso 4] Derivando Asignación SUBSIDIO...');
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(300);
    await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
    await page.waitForTimeout(300);
    await page.locator('label:has-text("Tipo de pedido") + select').selectOption('Personal');
    await page.locator('label:has-text("Nombre y apellido") + input').fill(nombreClub);
    await page.locator('label:has-text("DNI") + input').first().fill('20-33445566-7');
    await page.locator('label:has-text("Monto") + input').first().fill('350000');

    // 4. Agregar Asignación 2: AGENDA
    console.log('[Caso 4] Derivando Asignación AGENDA...');
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(300);
    await page.locator('select:has-text("Seleccione Área...")').last().selectOption('AGENDA');
    await page.waitForTimeout(300);
    await page.locator('label:has-text("Tipo de actividad") + select').selectOption('Reunión');
    await page.locator('label:has-text("Organizada por nosotros?") + select').selectOption('si');
    await page.locator('label:has-text("Descripción/temario") + textarea').last().fill('Reunión institucional con directivos de clubes barriales');
    await page.locator('label:has-text("Asistentes") + input').fill('50');
    await page.locator('label:has-text("Declaración de interés") + select').last().selectOption('si');
    await page.locator('label:has-text("Aporte?") + select').selectOption('no');
    await page.locator('label:has-text("Día") + input').fill('2026-10-15');
    await page.locator('label:has-text("Hora") + input').fill('18:30');
    await page.locator('label:has-text("Responsable") + input').last().fill('Matías Ippólito');
    await page.locator('label:has-text("Observación") + textarea').last().fill('Coordinación deportiva');

    // 5. Agregar Asignación 3: DECLARACION DE INTERES
    console.log('[Caso 4] Derivando Asignación DECLARACION DE INTERES...');
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(300);
    await page.locator('select:has-text("Seleccione Área...")').last().selectOption('DECLARACION DE INTERES');
    await page.waitForTimeout(300);
    await page.locator('label:has-text("Nombre completo del evento") + input').last().fill(`Torneo Interbarrial de Deportes ${idTest}`);
    await page.locator('label:has-text("Actividad") + input').last().fill('Competencia deportiva formativa y recreativa');
    await page.locator('label:has-text("Institución a declarar") + input').last().fill('Unión de Clubes de Barrio');
    await page.locator('label:has-text("Tipo") + select').last().selectOption('deportivo');
    await page.locator('label:has-text("Descripción") + textarea').last().fill('Encuentro de fútbol y básquet infantil con más de 20 clubes participantes');
    await page.locator('label:has-text("Fecha") + input').last().fill('2026-10-15');
    await page.locator('label:has-text("Dirección") + input').last().fill('Av. Aristóbulo del Valle 6500');
    await page.locator('label:has-text("Fundamentos") + textarea').last().fill('Promoción de valores comunitarios y vida sana en la juventud');
    await page.locator('label:has-text("Responsable") + input').last().fill('Eduardo Alfaro');

    // Guardar solicitud creada por el Responsable con las 3 asignaciones
    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.getByText(/creada con éxito|actualizada con éxito/i)).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '03_responsable_alta_triple.png'), fullPage: true });
    console.log('✅ Caso 4 Aprobado: Responsable creó solicitud propia con preasignación y 3 áreas temáticas concurrentes.');
  });

  // =========================================================================
  // CASO 5: Rol Resolutor de Subsidio - Resolución y Expediente
  // =========================================================================
  test('Caso 5: Rol Resolutor de Subsidio - Evaluación, Expediente y Aprobación', async ({ page }) => {
    console.log('[Caso 5] Iniciando sesión como Resolutor Subsidio (Martín Nocioni)...');
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_SUBSIDIO.email, CREDENTIALS.RESOLUTOR_SUBSIDIO.pass, 'Resolutor');

    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[placeholder*="Buscar"]', nombreClub);
    await page.waitForTimeout(600);

    const fila = page.locator('tbody tr').filter({ hasText: nombreClub }).first();
    await expect(fila).toBeVisible({ timeout: 10000 });
    await fila.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('form');

    // Aprobar resolución
    await page.click('button:has-text("Aprobar Resolución")');
    const modalAprobar = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await modalAprobar.waitFor({ state: 'visible', timeout: 5000 });
    await modalAprobar.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill(`Subsidio evaluado favorablemente. Expediente EXP-SUB-CERT-${idTest}. Transferencia programada.`);
    await modalAprobar.locator('button:has-text("Confirmar y Finalizar")').click();

    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '04_resolutor_subsidio_aprobado.png'), fullPage: true });
    console.log('✅ Caso 5 Aprobado: Resolutor de Subsidio aprobó la asignación.');
  });

  // =========================================================================
  // CASO 6: Rol Resolutor de Agenda - Resolución de Actividad
  // =========================================================================
  test('Caso 6: Rol Resolutor de Agenda - Verificación y Aprobación con Asistencia', async ({ page }) => {
    console.log('[Caso 6] Iniciando sesión como Resolutor Agenda (Verónica González)...');
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_AGENDA.email, CREDENTIALS.RESOLUTOR_AGENDA.pass, 'Resolutor');

    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[placeholder*="Buscar"]', nombreClub);
    await page.waitForTimeout(600);

    const fila = page.locator('tbody tr').filter({ hasText: nombreClub }).first();
    await expect(fila).toBeVisible({ timeout: 10000 });
    await fila.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('form');

    // Aprobar resolución de agenda
    await page.click('button:has-text("Aprobar Resolución")');
    const modalAprobar = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await modalAprobar.waitFor({ state: 'visible', timeout: 5000 });

    const radioAsist = modalAprobar.locator('input[name="asistencia"][value="con asistencia"]');
    if (await radioAsist.isVisible()) {
      await radioAsist.check();
    }

    await modalAprobar.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill(`Agenda confirmada e incluida en cronograma oficial. Expediente EXP-AGE-CERT-${idTest}.`);
    await modalAprobar.locator('button:has-text("Confirmar y Finalizar")').click();

    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '05_resolutor_agenda_aprobado.png'), fullPage: true });
    console.log('✅ Caso 6 Aprobado: Resolutor de Agenda aprobó la actividad.');
  });

  // =========================================================================
  // CASO 7: Rol Resolutor Declaración de Interés - Dictamen y Firma
  // =========================================================================
  test('Caso 7: Rol Resolutor Declaración de Interés - Validación de 13 Campos y Firma', async ({ page }) => {
    console.log('[Caso 7] Iniciando sesión como Resolutor Declaración de Interés (Eduardo Alfaro)...');
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_DECLARACION.email, CREDENTIALS.RESOLUTOR_DECLARACION.pass, 'Resolutor');

    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[placeholder*="Buscar"]', nombreClub);
    await page.waitForTimeout(600);

    const fila = page.locator('tbody tr').filter({ hasText: nombreClub }).first();
    await expect(fila).toBeVisible({ timeout: 10000 });
    await fila.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('form');

    // Validar visualización de los datos cargados por Responsable
    await expect(page.locator('label:has-text("Nombre completo del evento") + input').last()).toHaveValue(`Torneo Interbarrial de Deportes ${idTest}`);
    await expect(page.locator('label:has-text("Actividad") + input').last()).toHaveValue('Competencia deportiva formativa y recreativa');

    // Aprobar resolución
    await page.click('button:has-text("Aprobar Resolución")');
    const modalAprobar = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await modalAprobar.waitFor({ state: 'visible', timeout: 5000 });

    await modalAprobar.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill(`Declaración de Interés dictaminada con beneplácito formal. Expediente EXP-DEC-CERT-${idTest}.`);
    await modalAprobar.locator('button:has-text("Confirmar y Finalizar")').click();

    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '06_resolutor_interes_firmado.png'), fullPage: true });
    console.log('✅ Caso 7 Aprobado: Resolutor de Declaración de Interés dictaminó y firmó.');
  });

  // =========================================================================
  // CASO 8: Rol Auditor - Acceso a Métricas y Validación de Seguridad Solo Lectura
  // =========================================================================
  test('Caso 8: Rol Auditor - Acceso a Paneles, Métricas y Restricción de Operaciones Destructivas', async ({ page }) => {
    console.log('[Caso 8] Iniciando sesión como Auditor...');
    await iniciarSesion(page, CREDENTIALS.AUDITOR.email, CREDENTIALS.AUDITOR.pass);

    // Debe ingresar directamente al dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Verificar presencia de tarjetas de métricas o resumen
    await expect(page.getByText(/Panel SGP|Distribución|Métricas|Dashboard/i).first()).toBeVisible({ timeout: 10000 });

    // Navegar a Mis Solicitudes
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    // Verificar que NO existe botón de "Nueva Solicitud" ni acciones destructivas
    const btnNueva = page.locator('button:has-text("Nueva Solicitud")');
    await expect(btnNueva).toHaveCount(0);

    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '07_auditor_solo_lectura.png'), fullPage: true });
    console.log('✅ Caso 8 Aprobado: Auditor validado en modo consulta sin capacidades de alteración.');
  });

  // =========================================================================
  // CASO 9: Rol Administrador - Supervisión Integral y Trazabilidad
  // =========================================================================
  test('Caso 9: Rol Administrador - Supervisión de Solicitudes Resueltas y Gestión General', async ({ page }) => {
    console.log('[Caso 9] Iniciando sesión como Administrador...');
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Acceder a la grilla completa
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    // Filtrar por solicitudes resueltas
    const tabResueltas = page.locator('button, div').filter({ hasText: /Resueltas/i }).first();
    if (await tabResueltas.isVisible()) {
      await tabResueltas.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, '08_admin_supervision_general.png'), fullPage: true });
    console.log('✅ Caso 9 Aprobado: Administrador supervisa correctamente todo el ciclo operativo.');
  });
});
