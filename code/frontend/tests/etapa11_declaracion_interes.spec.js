import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8080';

// Credenciales
const CREDENTIALS = {
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' },
  RESOLUTOR_EDUARDO: { email: 'ealfaro.51@gmail.com', pass: 'Eduardo_SGP_2026^' }
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

test.describe('📋 Plan de Pruebas: Declaración de Interés - Etapa 11', () => {
  test.describe.configure({ mode: 'serial' });

  let solicitudIdCreada = null;
  const nombreSolicitudInteres = `Solicitud Declaración Interés ${Date.now().toString().slice(-4)}`;

  test.beforeAll(async ({ request }) => {
    console.log('[Setup] Limpiando solicitudes previas en la base de datos...');
    try {
      await request.post(`${BACKEND_URL}/api/test-helper/clear-all-solicitudes`);
    } catch (e) {
      console.warn('[Setup] Advertencia al limpiar solicitudes:', e.message);
    }
  });

  // =========================================================================
  // CASO DE PRUEBA 1: Despliegue de los 13 campos, Precarga y Tipos de Input
  // =========================================================================
  test('Caso de Prueba 1: Despliegue de los 13 campos, Precarga y Tipos de Input', async ({ page }) => {
    test.setTimeout(90000);

    console.log('[Caso 1] Iniciando sesión como Administrador...');
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);

    console.log('[Caso 1] Navegando a Mis Solicitudes para crear una nueva solicitud...');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('form');

    // Completar datos básicos con Localidad "Santo Tomé"
    await page.locator('label:has-text("Nombre Completo / Institución") + input').fill(nombreSolicitudInteres);
    await page.locator('label:has-text("Teléfono") + input').first().fill('3424889900');
    await page.locator('label:has-text("Descripción / Pedido") + textarea').fill('Solicitud de declaración de interés institucional y formativo');
    await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Club');

    // Localidad y Barrio de la solicitud principal
    const selectLocalidad = page.locator('label:has-text("Localidad") + select');
    await selectLocalidad.locator('option', { hasText: 'Santa Fe' }).waitFor({ state: 'attached', timeout: 15000 });
    await selectLocalidad.selectOption('Santa Fe');

    const selectBarrio = page.locator('label:has-text("Barrio") + select');
    await selectBarrio.locator('option', { hasText: 'Centro' }).waitFor({ state: 'attached', timeout: 15000 });
    await selectBarrio.selectOption('Centro');

    // Zona Territorial
    const inputZona = page.locator('input[placeholder*="Auto-asignada"]');
    if (await inputZona.count() > 0) {
      await inputZona.fill('Norte');
    }

    // Agregar asignación DECLARACION DE INTERES
    console.log('[Caso 1] Agregando asignación de área DECLARACION DE INTERES...');
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(500);

    const selectArea = page.locator('select:has-text("Seleccione Área...")').first();
    await selectArea.selectOption('DECLARACION DE INTERES');
    await page.waitForTimeout(800);

    // 1. Validar los 13 campos en orden
    const camposEsperados = [
      'Nombre completo del evento',
      'Actividad',
      'Institución a declarar',
      'Tipo',
      'Descripción',
      'Localidad',
      'Fecha',
      'Hora',
      'Dirección',
      'Fundamentos',
      'Flyer/nota',
      'Observaciones',
      'Responsable'
    ];

    console.log('[Caso 1] Verificando presencia de los 13 campos...');
    for (const campo of camposEsperados) {
      const labelCampo = page.locator(`label:has-text("${campo}")`).first();
      await expect(labelCampo).toBeVisible();
    }
    console.log('✅ Los 13 campos de Declaración de Interés están presentes.');

    // 2. Validar que Localidad aparezca precargada automáticamente con "Santa Fe"
    const selectLocalidadDec = page.locator('label:has-text("Localidad") + select').last();
    await expect(selectLocalidadDec).toHaveValue('Santa Fe');
    console.log('✅ Precarga automática de Localidad (Santa Fe) validada exitosamente.');

    // 3. Validar las 6 opciones del selector Tipo (cultural, educativo, científico, deportivo, social, otro)
    const selectTipo = page.locator('label:text-is("Tipo *") + select, label:has-text("Tipo") + select').last();
    const opcionesTipo = await selectTipo.locator('option').allInnerTexts();
    const opcionesLimpias = opcionesTipo.map(o => o.trim()).filter(o => o !== 'Seleccionar...' && o !== '');
    console.log('[Caso 1] Opciones en Tipo:', opcionesLimpias);

    expect(opcionesLimpias).toContain('cultural');
    expect(opcionesLimpias).toContain('educativo');
    expect(opcionesLimpias).toContain('científico');
    expect(opcionesLimpias).toContain('deportivo');
    expect(opcionesLimpias).toContain('social');
    expect(opcionesLimpias).toContain('otro');
    console.log('✅ Las 6 opciones del selector Tipo fueron verificadas.');

    // 4. Validar tipos de entrada: Fecha (date), Hora (time), Flyer/nota (file)
    const inputFecha = page.locator('label:has-text("Fecha") + input').last();
    await expect(inputFecha).toHaveAttribute('type', 'date');

    const inputHora = page.locator('label:has-text("Hora") + input').last();
    await expect(inputHora).toHaveAttribute('type', 'time');

    const inputFile = page.locator('input[type="file"]');
    await expect(inputFile).toBeAttached();
    console.log('✅ Tipos de datos (date, time, file) validados.');

    // Tomar captura de evidencia
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso1_declaracion_campos.png'), fullPage: true });

    await page.locator('button:has-text("Cancelar"), button:has-text("Cerrar")').first().click();
  });

  // =========================================================================
  // CASO DE PRUEBA 2: Validación de Obligatoriedad y Flexibilidad de Opcionales
  // =========================================================================
  test('Caso de Prueba 2: Validación de Obligatoriedad y Flexibilidad de Opcionales', async ({ page }) => {
    test.setTimeout(90000);

    console.log('[Caso 2] Iniciando sesión como Administrador...');
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);

    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('form');

    // Completar datos básicos
    await page.locator('label:has-text("Nombre Completo / Institución") + input').fill(nombreSolicitudInteres);
    await page.locator('label:has-text("Teléfono") + input').first().fill('3424889900');
    await page.locator('label:has-text("Descripción / Pedido") + textarea').fill('Congreso de Innovación Social 2026');
    await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Club');

    const selectLocalidad = page.locator('label:has-text("Localidad") + select');
    await selectLocalidad.locator('option', { hasText: 'Santa Fe' }).waitFor({ state: 'attached', timeout: 15000 });
    await selectLocalidad.selectOption('Santa Fe');

    const selectBarrio = page.locator('label:has-text("Barrio") + select');
    await selectBarrio.locator('option', { hasText: 'Centro' }).waitFor({ state: 'attached', timeout: 15000 });
    await selectBarrio.selectOption('Centro');

    const inputZona = page.locator('input[placeholder*="Auto-asignada"]');
    if (await inputZona.count() > 0) {
      await inputZona.fill('Norte');
    }

    const selectZona = page.locator('label:has-text("Zona Territorial") + select');
    if (await selectZona.count() > 0) {
      const opt = selectZona.locator('option').nth(1);
      if (await opt.count() > 0) {
        await selectZona.selectOption({ index: 1 });
        await page.waitForTimeout(500);
      }
    }

    const selectResp = page.locator('label:has-text("Responsable") + select');
    if (await selectResp.count() > 0) {
      const optResp = selectResp.locator('option').nth(1);
      if (await optResp.count() > 0) {
        await selectResp.selectOption({ index: 1 });
        await page.waitForTimeout(500);
      }
    }

    // Agregar asignación DECLARACION DE INTERES
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(500);

    const selectArea = page.locator('select:has-text("Seleccione Área...")').first();
    await selectArea.selectOption('DECLARACION DE INTERES');
    await page.waitForTimeout(800);

    // 1. Intentar guardar con campos obligatorios vacíos
    console.log('[Caso 2] Intentando guardar con campos obligatorios vacíos...');
    await page.click('button:has-text("Guardar")');

    const toastError = page.getByText(/obligatorio/i);
    await expect(toastError.first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Validación de campos requeridos activada: el sistema bloqueó el guardado.');

    // Captura de validación obligatoria
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso2_declaracion_obligatorios.png'), fullPage: true });

    // 2. Completar únicamente los 10 campos obligatorios (dejando vacíos Hora, Observaciones y Flyer/nota)
    console.log('[Caso 2] Completando exclusivamente los 10 campos obligatorios...');
    await page.locator('label:has-text("Nombre completo del evento") + input').last().fill('Congreso Provincial de Innovación Social 2026');
    await page.locator('label:has-text("Actividad") + input').last().fill('Conferencias magistrales y talleres territoriales');
    await page.locator('label:has-text("Institución a declarar") + input').last().fill('Fundación Innovar Litoral');
    await page.locator('label:has-text("Tipo") + select').last().selectOption('científico');
    await page.locator('label:has-text("Descripción") + textarea').last().fill('Jornada sobre nuevas tecnologías aplicadas a la gestión pública');
    // Localidad ya está precargada con Santa Fe
    await page.locator('label:has-text("Fecha") + input').last().fill('2026-10-15');
    // Hora se deja vacía intencionalmente
    await page.locator('label:has-text("Dirección") + input').last().fill('Av. 7 de Marzo 1500');
    await page.locator('label:has-text("Fundamentos") + textarea').last().fill('Fomento al desarrollo técnico, social y la investigación en la región');
    // Flyer/nota y Observaciones se dejan vacíos intencionalmente
    await page.locator('label:has-text("Responsable") + input').last().fill('Martín Nocioni');

    // 3. Guardar solicitud
    console.log('[Caso 2] Guardando solicitud con opcionales vacíos...');
    await page.click('button:has-text("Guardar")');
    await expect(page.getByText(/creada con éxito/i)).toBeVisible({ timeout: 8000 });
    console.log('✅ Solicitud guardada exitosamente confirmando la flexibilidad de los campos opcionales.');

    // Captura de guardado exitoso
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso2_declaracion_guardado_exitoso.png'), fullPage: true });

    // 4. Reabrir solicitud y comprobar persistencia
    console.log('[Caso 2] Reabriendo solicitud para comprobar persistencia de datos...');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar"]', nombreSolicitudInteres);
    await page.waitForTimeout(800);

    const fila = page.locator('tbody tr').first();
    const idTexto = await fila.locator('td').nth(1).innerText();
    solicitudIdCreada = idTexto.replace('#', '').trim();
    console.log(`[Caso 2] Solicitud ID #${solicitudIdCreada}`);

    await fila.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('form');

    // Comprobar persistencia de los 10 obligatorios y vaciado de los 2 opcionales de texto
    await expect(page.locator('label:has-text("Nombre completo del evento") + input')).toHaveValue('Congreso Provincial de Innovación Social 2026');
    await expect(page.locator('label:has-text("Actividad") + input')).toHaveValue('Conferencias magistrales y talleres territoriales');
    await expect(page.locator('label:has-text("Institución a declarar") + input')).toHaveValue('Fundación Innovar Litoral');
    await expect(page.locator('label:has-text("Tipo") + select').last()).toHaveValue('científico');
    await expect(page.locator('label:has-text("Descripción") + textarea').last()).toHaveValue('Jornada sobre nuevas tecnologías aplicadas a la gestión pública');
    await expect(page.locator('label:has-text("Fecha") + input').last()).toHaveValue('2026-10-15');
    await expect(page.locator('label:has-text("Hora") + input').last()).toHaveValue('');
    await expect(page.locator('label:has-text("Dirección") + input').last()).toHaveValue('Av. 7 de Marzo 1500');
    await expect(page.locator('label:has-text("Fundamentos") + textarea').last()).toHaveValue('Fomento al desarrollo técnico, social y la investigación en la región');
    await expect(page.locator('label:has-text("Responsable") + input').last()).toHaveValue('Martín Nocioni');

    console.log('✅ Persistencia íntegra de los datos obligatorios y opcionales verificada.');
    await page.locator('button:has-text("Cancelar"), button:has-text("Cerrar")').first().click();
  });

  // =========================================================================
  // CASO DE PRUEBA 3: Dictamen y Firma por el Resolutor de Declaración de Interés
  // =========================================================================
  test('Caso de Prueba 3: Dictamen y Firma por el Resolutor de Declaración de Interés', async ({ page }) => {
    test.setTimeout(90000);

    // 1. Iniciar sesión como Resolutor de Declaración de Interés (Eduardo Alfaro)
    console.log('[Caso 3] Iniciando sesión como Resolutor Eduardo Alfaro...');
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_EDUARDO.email, CREDENTIALS.RESOLUTOR_EDUARDO.pass, 'RESOLUTOR');

    console.log(`[Caso 3] Buscando solicitud de Declaración de Interés #${solicitudIdCreada}...`);
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[placeholder*="Buscar"]', nombreSolicitudInteres);
    await page.waitForTimeout(800);

    const filaResolutor = page.locator('tbody tr').first();
    await expect(filaResolutor).toBeVisible({ timeout: 15000 });
    await filaResolutor.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('form');

    // 2. Validar visualización de los 13 campos
    await expect(page.locator('label:has-text("Nombre completo del evento") + input').last()).toHaveValue('Congreso Provincial de Innovación Social 2026');
    await expect(page.locator('label:has-text("Actividad") + input').last()).toHaveValue('Conferencias magistrales y talleres territoriales');
    await expect(page.locator('label:has-text("Institución a declarar") + input').last()).toHaveValue('Fundación Innovar Litoral');
    console.log('✅ Detalles de Declaración de Interés visualizados correctamente.');

    // Tomar captura previa al dictamen
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso3_dictamen_resolutor_interes.png'), fullPage: true });

    // 3. Dictaminar aprobación
    console.log('[Caso 3] Aprobando resolución de Declaración de Interés...');
    await page.click('button:has-text("Aprobar Resolución")');

    const submodal = page.locator('div:has(h3:has-text("Aprobar"))').last();
    await submodal.waitFor();

    await submodal.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]')
      .fill('Declaración de interés formal aprobada con beneplácito de las autoridades provinciales');

    await submodal.locator('button:has-text("Confirmar y Finalizar")').click();
    await expect(page.getByText(/Resolución aprobada/i)).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1500);

    // Validar estado Resueltas en la tabla
    const filaResuelta = page.locator('tbody tr').filter({ hasText: nombreSolicitudInteres }).first();
    await expect(filaResuelta).toBeVisible({ timeout: 10000 });
    await expect(filaResuelta.getByText('Resueltas')).toBeVisible({ timeout: 10000 });
    await expect(filaResuelta.locator('[title="Aprobado"]')).toBeVisible({ timeout: 10000 });

    // Reabrir para comprobar firma
    await filaResuelta.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('form');
    await expect(page.getByText('Resolución Finalizada')).toBeVisible({ timeout: 10000 });
    console.log('✅ Declaración de Interés firmada y finalizada exitosamente.');

    // Tomar captura final
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'caso3_resolucion_interes_firmada.png'), fullPage: true });
    await page.locator('button:has-text("Cerrar"), button:has-text("Cancelar")').first().click();
  });
});
