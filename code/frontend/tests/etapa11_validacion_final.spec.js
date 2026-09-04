import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8080';

// Credenciales para la ejecución de pruebas
const CREDENTIALS = {
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' },
  RESOLUTOR_MARIA: { email: 'mvgonza79@gmail.com', pass: 'Maria_SGP_2026%' }
};

// Carpeta de evidencias
const EVIDENCIAS_DIR = path.resolve(__dirname, '../../../pruebas/pruebaEtapa11');

/**
 * Función auxiliar para iniciar sesión en SGP
 */
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

test.describe('📋 Plan de Pruebas: Etapa 11 - Estabilización Final Pre-Producción', () => {
  test.describe.configure({ mode: 'serial' });

  let solicitudIdCreada = null;
  const nombreSolicitudAgenda = `Solicitud Etapa 11 Agenda ${Date.now().toString().slice(-4)}`;

  test.beforeAll(async ({ request }) => {
    console.log('[Setup] Limpiando solicitudes previas en la base de datos...');
    try {
      await request.post(`${BACKEND_URL}/api/test-helper/clear-all-solicitudes`);
    } catch (e) {
      console.warn('[Setup] Advertencia al limpiar solicitudes:', e.message);
    }
  });

  // =========================================================================
  // CASO DE PRUEBA 1: Campos Completos de Agenda, Precarga y Validaciones
  // =========================================================================
  test('Caso de Prueba 1: Campos Completos de Agenda, Precarga y Validaciones', async ({ page }) => {
    test.setTimeout(90000);

    console.log('[Caso 1] Iniciando sesión como Administrador...');
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);

    console.log('[Caso 1] Navegando a Mis Solicitudes para crear una solicitud de prueba...');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    // Abrir modal de nueva solicitud
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('form');

    // Completar datos básicos con Localidad "Santa Fe" y Barrio "Centro"
    await page.locator('label:has-text("Nombre Completo / Institución") + input').fill(nombreSolicitudAgenda);
    await page.locator('label:has-text("Teléfono") + input').first().fill('3424123456');
    await page.locator('label:has-text("Descripción / Pedido") + textarea').fill('Evento territorial para validación Etapa 11');
    await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
    await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');

    // Localidad y Barrio de la solicitud principal con espera activa de opciones
    const selectLocalidad = page.locator('label:has-text("Localidad") + select');
    await selectLocalidad.locator('option', { hasText: 'Santa Fe' }).waitFor({ state: 'attached', timeout: 15000 });
    await selectLocalidad.selectOption('Santa Fe');

    const selectBarrio = page.locator('label:has-text("Barrio") + select');
    await selectBarrio.locator('option', { hasText: 'Centro' }).waitFor({ state: 'attached', timeout: 15000 });
    await selectBarrio.selectOption('Centro');

    // Zona Territorial y Responsable
    const inputZona = page.locator('input[placeholder*="Auto-asignada"]');
    if (await inputZona.count() > 0) {
      await inputZona.fill('Norte');
    }
    const selectZona = page.locator('label:has-text("Zona Territorial") + select');
    if (await selectZona.count() > 0) {
      const opt = selectZona.locator('option').nth(1);
      if (await opt.count() > 0) {
        await selectZona.selectOption({ index: 1 });
      }
    }
    const selectResp = page.locator('label:has-text("Responsable") + select');
    if (await selectResp.count() > 0) {
      const optResp = selectResp.locator('option').nth(1);
      if (await optResp.count() > 0) {
        await selectResp.selectOption({ index: 1 });
      }
    }

    // Agregar resolución de tipo AGENDA
    console.log('[Caso 1] Agregando asignación de área AGENDA...');
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(500);

    const selectArea = page.locator('select:has-text("Seleccione Área...")').first();
    await selectArea.selectOption('AGENDA');
    await page.waitForTimeout(800);

    // 1. Validar que aparezcan los campos requeridos de Agenda
    const camposRequeridos = [
      'Tipo de actividad',
      'Organizada por nosotros?',
      'Descripción/temario',
      'Asistentes',
      'Declaración de interés',
      'Aporte?',
      'Día',
      'Hora',
      'Lugar - Localidad',
      'Lugar - Barrio',
      'Responsable',
      'Observación'
    ];

    for (const campo of camposRequeridos) {
      const labelCampo = page.locator(`label:has-text("${campo}")`).first();
      await expect(labelCampo).toBeVisible();
    }

    // 2. Validar que Lugar - Localidad y Lugar - Barrio se hayan precargado automáticamente
    const selectLugarLocalidad = page.locator('label:has-text("Lugar - Localidad") + select');
    const selectLugarBarrio = page.locator('label:has-text("Lugar - Barrio") + select');

    await expect(selectLugarLocalidad).toHaveValue('Santa Fe');
    await expect(selectLugarBarrio).toHaveValue('Centro');
    console.log('✅ Precarga automática de Localidad (Santa Fe) y Barrio (Centro) validada.');

    // 3. Validar que Descripción/monto esté oculto inicialmente si Aporte? no es "si"
    const labelDescMonto = page.locator('label:has-text("Descripción/monto")');
    await expect(labelDescMonto).toHaveCount(0);
    console.log('✅ Campo Descripción/monto oculto inicialmente validado.');

    // 4. Cambiar Aporte? a "si" y comprobar que Descripción/monto se muestra de inmediato
    const selectAporte = page.locator('label:has-text("Aporte?") + select');
    await selectAporte.selectOption('si');
    await expect(labelDescMonto).toBeVisible();
    console.log('✅ Campo Descripción/monto visible al seleccionar Aporte: "si".');

    // 5. Intentar guardar con campos obligatorios vacíos y comprobar validación
    console.log('[Caso 1] Intentando guardar con campos de agenda vacíos...');
    await page.click('button:has-text("Guardar Solicitud")');
    
    // Validar mensaje de error (toast)
    const toastError = page.getByText(/obligatorio/i);
    await expect(toastError.first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Validación de campos obligatorios en guardado comprobada con éxito.');

    // Tomar captura de pantalla de los campos de Agenda
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso1_agenda_campos.png'), fullPage: true });

    // 6. Completar todos los 13 campos de Agenda
    console.log('[Caso 1] Completando los 13 atributos de la Agenda con datos válidos...');
    await page.locator('label:has-text("Tipo de actividad") + select').selectOption('Reunión');
    await page.locator('label:has-text("Organizada por nosotros?") + select').selectOption('si');
    await page.locator('label:has-text("Descripción/temario") + textarea').fill('Coordinación de gabinete territorial de Santa Fe');
    await page.locator('label:has-text("Asistentes") + input').fill('25 funcionarios');
    await page.locator('label:has-text("Declaración de interés") + select').selectOption('no');
    // Aporte ya está en 'si'
    await page.locator('label:has-text("Descripción/monto") + input').fill('$ 75.000 refrigerio');
    await page.locator('label:has-text("Día") + input').fill('2026-09-25');
    await page.locator('label:has-text("Hora") + input').fill('11:00');
    // Localidad y Barrio ya están en Santa Fe y Centro
    await page.locator('label:has-text("Responsable") + input').fill('Martín Nocioni');
    await page.locator('label:has-text("Observación") + textarea').last().fill('Prioridad alta según requerimiento ministerial');

    // Guardar solicitud exitosamente
    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.getByText(/creada con éxito/i)).toBeVisible({ timeout: 8000 });
    console.log('✅ Solicitud guardada con éxito.');

    // Tomar captura de guardado
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso1_agenda_guardado.png'), fullPage: true });

    // 7. Reabrir solicitud y validar persistencia de los 13 campos
    console.log('[Caso 1] Reabriendo solicitud para validar persistencia de los 13 atributos...');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar"]', nombreSolicitudAgenda);
    await page.waitForTimeout(800);

    const fila = page.locator('tbody tr').first();
    const idTexto = await fila.locator('td').nth(1).innerText();
    solicitudIdCreada = idTexto.replace('#', '').trim();
    console.log(`[Caso 1] Solicitud creada con ID #${solicitudIdCreada}`);

    await fila.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('form');

    // Comprobar persistencia de valores en el formulario
    await expect(page.locator('label:has-text("Tipo de actividad") + select')).toHaveValue('Reunión');
    await expect(page.locator('label:has-text("Organizada por nosotros?") + select')).toHaveValue('si');
    await expect(page.locator('label:has-text("Descripción/temario") + textarea')).toHaveValue('Coordinación de gabinete territorial de Santa Fe');
    await expect(page.locator('label:has-text("Asistentes") + input')).toHaveValue('25 funcionarios');
    await expect(page.locator('label:has-text("Declaración de interés") + select')).toHaveValue('no');
    await expect(page.locator('label:has-text("Aporte?") + select')).toHaveValue('si');
    await expect(page.locator('label:has-text("Descripción/monto") + input')).toHaveValue('$ 75.000 refrigerio');
    await expect(page.locator('label:has-text("Día") + input')).toHaveValue('2026-09-25');
    await expect(page.locator('label:has-text("Hora") + input')).toHaveValue('11:00');
    await expect(page.locator('label:has-text("Lugar - Localidad") + select')).toHaveValue('Santa Fe');
    await expect(page.locator('label:has-text("Lugar - Barrio") + select')).toHaveValue('Centro');
    await expect(page.locator('label:has-text("Responsable") + input')).toHaveValue('Martín Nocioni');
    await expect(page.locator('label:has-text("Observación") + textarea').last()).toHaveValue('Prioridad alta según requerimiento ministerial');

    console.log('✅ Persistencia íntegra de los 13 atributos de Agenda verificada.');
    await page.locator('button:has-text("Cancelar"), button:has-text("Cerrar")').first().click();
  });

  // =========================================================================
  // CASO DE PRUEBA 2: Depuración de Tipos de Pedido en Subsidio
  // =========================================================================
  test('Caso de Prueba 2: Depuración de Tipos de Pedido en Subsidio', async ({ page }) => {
    test.setTimeout(60000);

    console.log('[Caso 2] Iniciando sesión como Administrador...');
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);

    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('form');

    console.log('[Caso 2] Agregando asignación de tipo SUBSIDIO...');
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(500);

    const selectArea = page.locator('select:has-text("Seleccione Área...")').first();
    await selectArea.selectOption('SUBSIDIO');
    await page.waitForTimeout(800);

    const selectTipoPedido = page.locator('label:has-text("Tipo de pedido")').locator('..').locator('select');
    await expect(selectTipoPedido).toBeVisible();

    // Obtener todas las opciones disponibles del selector
    const opciones = await selectTipoPedido.locator('option').allInnerTexts();
    const opcionesLimpias = opciones.map(o => o.trim()).filter(o => o !== 'Seleccionar...' && o !== '');
    console.log('[Caso 2] Opciones encontradas en Tipo de pedido:', opcionesLimpias);

    // 1. Validar que las opciones sean exclusivamente las 3 válidas
    expect(opcionesLimpias).toContain('Personal');
    expect(opcionesLimpias).toContain('Institucional en dinero');
    expect(opcionesLimpias).toContain('Institucional en especie');

    // 2. Validar explícitamente que la opción "Institucional indistinto" NO existe
    const opcionIndistinto = selectTipoPedido.locator('option:has-text("Institucional indistinto")');
    await expect(opcionIndistinto).toHaveCount(0);
    console.log('✅ Confirmado: La opción "Institucional indistinto" fue eliminada y no existe en el selector.');

    // Tomar captura de evidencia
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso2_subsidio_tipo_pedido.png'), fullPage: true });

    await page.locator('button:has-text("Cancelar"), button:has-text("Cerrar")').first().click();
  });

  // =========================================================================
  // CASO DE PRUEBA 3: Ordenamiento Interactivo por N° Orden en la Tabla
  // =========================================================================
  test('Caso de Prueba 3: Ordenamiento Interactivo por N° Orden en la Tabla', async ({ page }) => {
    test.setTimeout(60000);

    console.log('[Caso 3] Iniciando sesión como Administrador...');
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);

    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    // Asegurar que haya al menos dos solicitudes para validar ordenamiento
    const filasIniciales = page.locator('tbody tr');
    if (await filasIniciales.count() < 2) {
      console.log('[Caso 3] Creando segunda solicitud para prueba de ordenamiento...');
      await page.click('button:has-text("Nueva Solicitud")');
      await page.waitForSelector('form');

      await page.locator('label:has-text("Nombre Completo / Institución") + input').fill('Segunda Solicitud Test');
      await page.locator('label:has-text("Teléfono") + input').first().fill('3424998877');
      await page.locator('label:has-text("Descripción / Pedido") + textarea').fill('Descripción segunda solicitud');
      await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
      await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');

      const selLoc = page.locator('label:has-text("Localidad") + select');
      await selLoc.locator('option', { hasText: 'Santa Fe' }).waitFor({ state: 'attached', timeout: 15000 });
      await selLoc.selectOption('Santa Fe');

      const selBar = page.locator('label:has-text("Barrio") + select');
      await selBar.locator('option', { hasText: 'Centro' }).waitFor({ state: 'attached', timeout: 15000 });
      await selBar.selectOption('Centro');

      const inputZona = page.locator('input[placeholder*="Auto-asignada"]');
      if (await inputZona.count() > 0) {
        await inputZona.fill('Norte');
      }

      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.getByText(/creada con éxito/i)).toBeVisible({ timeout: 8000 });
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.waitForLoadState('networkidle');
    }

    // Localizar cabecera N° Orden
    const cabeceraOrden = page.locator('th:has-text("N° Orden")');
    await expect(cabeceraOrden).toBeVisible();

    // 1. Verificar clase cursor-pointer
    await expect(cabeceraOrden).toHaveClass(/cursor-pointer/);
    console.log('✅ Cabecera N° Orden contiene clase interactiva cursor-pointer.');

    // 2. Primer clic: Orden Ascendente
    console.log('[Caso 3] Haciendo clic en N° Orden para ordenar de forma ASCENDENTE...');
    await cabeceraOrden.click();
    await page.waitForTimeout(500);

    // Validar icono ArrowUp
    const iconoAsc = cabeceraOrden.locator('svg.lucide-arrow-up');
    await expect(iconoAsc).toBeVisible();

    // Validar que el primer ID es menor que el último
    const primerIdAsc = await page.locator('tbody tr').first().locator('td').nth(1).innerText();
    const ultimoIdAsc = await page.locator('tbody tr').last().locator('td').nth(1).innerText();
    const numPrimeroAsc = parseInt(primerIdAsc.replace(/\D/g, ''), 10);
    const numUltimoAsc = parseInt(ultimoIdAsc.replace(/\D/g, ''), 10);
    expect(numPrimeroAsc).toBeLessThanOrEqual(numUltimoAsc);
    console.log(`✅ Orden Ascendente comprobado: #${numPrimeroAsc} <= #${numUltimoAsc}`);

    // Tomar captura de orden ascendente
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso3_orden_ascendente.png'), fullPage: true });

    // 3. Segundo clic: Orden Descendente
    console.log('[Caso 3] Haciendo clic en N° Orden para ordenar de forma DESCENDENTE...');
    await cabeceraOrden.click();
    await page.waitForTimeout(500);

    // Validar icono ArrowDown
    const iconoDesc = cabeceraOrden.locator('svg.lucide-arrow-down');
    await expect(iconoDesc).toBeVisible();

    // Validar que el primer ID es mayor que el último
    const primerIdDesc = await page.locator('tbody tr').first().locator('td').nth(1).innerText();
    const ultimoIdDesc = await page.locator('tbody tr').last().locator('td').nth(1).innerText();
    const numPrimeroDesc = parseInt(primerIdDesc.replace(/\D/g, ''), 10);
    const numUltimoDesc = parseInt(ultimoIdDesc.replace(/\D/g, ''), 10);
    expect(numPrimeroDesc).toBeGreaterThanOrEqual(numUltimoDesc);
    console.log(`✅ Orden Descendente comprobado: #${numPrimeroDesc} >= #${numUltimoDesc}`);

    // Tomar captura de orden descendente
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso3_orden_descendente.png'), fullPage: true });
  });

  // =========================================================================
  // CASO DE PRUEBA 4: Flujo Completo de Dictamen de Agenda
  // =========================================================================
  test('Caso de Prueba 4: Flujo Completo de Dictamen de Agenda', async ({ page }) => {
    test.setTimeout(90000);

    console.log('[Caso 4] Iniciando sesión como Resolutora de Agenda (María Verónica)...');
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_MARIA.email, CREDENTIALS.RESOLUTOR_MARIA.pass, 'RESOLUTOR');

    console.log(`[Caso 4] Buscando la solicitud de Agenda #${solicitudIdCreada}...`);
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[placeholder*="Buscar"]', nombreSolicitudAgenda);
    await page.waitForTimeout(800);

    const fila = page.locator('tbody tr').first();
    await expect(fila).toBeVisible();
    await fila.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('form');

    // 1. Validar que los detalles de Agenda se visualicen correctamente en modo lectura
    await expect(page.locator('form').getByText('Coordinación de gabinete territorial de Santa Fe')).toBeVisible();
    console.log('✅ Detalles de Agenda visualizados correctamente en modo resolutor.');

    // Tomar captura previa al dictamen
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso4_dictamen_agenda.png'), fullPage: true });

    // 2. Hacer clic en "Aprobar Resolución"
    console.log('[Caso 4] Aprobando resolución de Agenda...');
    await page.click('button:has-text("Aprobar Resolución")');

    const submodal = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await submodal.waitFor();

    // Seleccionar "Con Asistencia"
    await submodal.locator('input[name="asistencia"][value="con asistencia"]').check();

    // Desmarcar creación de evento de Google Calendar para la prueba aislada
    const checkCalendar = submodal.getByRole('checkbox', { name: /Crear evento/ });
    if (await checkCalendar.count() > 0) {
      await checkCalendar.uncheck();
    }

    // Completar observaciones
    await submodal.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill('Aprobada para ejecución de agenda territorial con asistencia de autoridades');

    // Confirmar y Finalizar
    await submodal.locator('button:has-text("Confirmar y Finalizar")').click();
    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 8000 });

    // Validar estado Resueltas en la tabla
    await expect(fila.locator('text=Resueltas')).toBeVisible({ timeout: 10000 });

    // Reabrir la solicitud para verificar la firma y estado finalizado
    await fila.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('form');
    await expect(page.locator('text=Resolución Finalizada')).toBeVisible({ timeout: 10000 });
    console.log('✅ Resolución de Agenda firmada y finalizada exitosamente.');

    // Tomar captura de la resolución firmada
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso4_resolucion_firmada.png'), fullPage: true });
    await page.locator('button:has-text("Cerrar"), button:has-text("Cancelar")').first().click();
  });
});
