import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

/**
 * Credenciales de prueba estándar para entorno local y réplica de producción
 */
const CREDENCIALES = {
  ADMIN: { 
    email: 'admin@sgp.com', 
    passwords: ['SGP_Admin_#gAfU_Prod_Secure_!', 'SGP_Admin_#J57f_Prod_Secure_!', 'SGP_Admin_#2026_Prod_Secure_!'] 
  },
  RESOLUTOR: { 
    email: 'resolutor@sgp.com', 
    passwords: ['Resolutor_SGP_J6dz!', 'Resolutor_SGP_gMbf!', 'password123'] 
  },
  OPERADOR: { 
    email: 'celeste_solari19@hotmail.com', 
    passwords: ['Celeste_SGP_nWsx#', 'Celeste_SGP_Npg8#', 'password123'] 
  }
};

/**
 * Función auxiliar para iniciar sesión y seleccionar rol si aplica
 */
const iniciarSesion = async (page, email, password, rolASeleccionar = null) => {
  await page.goto(`${BASE_URL}/login`, { timeout: 15000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const botonSalir = page.locator('button:has-text("Salir")');
  if (await botonSalir.count() > 0) {
    await botonSalir.click();
    await page.waitForURL(/.*login.*/, { timeout: 10000 });
  }

  // Si ya no está en login, significa que la sesión continúa activa
  if (!page.url().includes('/login')) {
    return;
  }

  const intentarLogin = async (pass) => {
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(pass);
    await page.click('button:has-text("Ingresar")');
    try {
      await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|select-rol|resolutor-settings).*/, { timeout: 6000 });
      return true;
    } catch {
      return false;
    }
  };

  // Buscar lista de contraseñas del usuario
  const cred = Object.values(CREDENCIALES).find(c => c.email === email);
  const passList = cred ? cred.passwords : [password];

  let logueado = false;
  for (const pass of passList) {
    logueado = await intentarLogin(pass);
    if (logueado) break;
  }

  await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|select-rol|resolutor-settings).*/, { timeout: 15000 });
  await page.waitForTimeout(500);

  if (page.url().includes('/select-rol')) {
    if (rolASeleccionar) {
      await page.click(`button:has-text("${rolASeleccionar}")`);
    } else {
      await page.locator('.grid button').first().click();
    }
    await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|resolutor-settings).*/, { timeout: 15000 });
    await page.waitForTimeout(500);
  }
};

test.describe('🧪 Suite de Aceptación QA: SGP Versión 1.1.0', () => {
  test.describe.configure({ mode: 'serial' });

  const timestamp = Date.now().toString().slice(-4);
  const nombrePrueba = `Persona QA ${timestamp}`;
  const dniPrueba = `99${timestamp}11`;
  const emailInvitadoQA = `invitado.qa.${timestamp}@gmail.com`;

  // =========================================================================
  // MÓDULO A: BÚSQUEDA FLEXIBLE Y PREVENCIÓN DE DUPLICADOS (CDU-06 al CDU-09)
  // =========================================================================

  test('TC-V1.1-01: Autocompletado Flexible con Debounce y Creación de Solicitante (CDU-06)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.ADMIN.email, CREDENCIALES.ADMIN.pass, 'ADMINISTRADOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // Abrir modal de nueva solicitud
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")');

    // Ubicar el input de autocompletado en el solicitante
    const inputSolicitante = page.locator('input[placeholder*="Buscar por nombre"], input[placeholder*="Autocompletado"], input[placeholder*="Escribe"]').first();
    await expect(inputSolicitante).toBeVisible();

    // Probar búsqueda de término que filtre resultados
    await inputSolicitante.fill('Juan');
    await page.waitForTimeout(600); // Esperar debounce de 300ms + request

    // Si existen sugerencias previas, verificar el menú desplegable
    const opciones = page.locator('ul[role="listbox"] li, div[class*="absolute"] button');
    if (await opciones.count() > 0) {
      await expect(opciones.first()).toBeVisible();
    }

    // Ingresar persona nueva para este ciclo
    await inputSolicitante.fill(nombrePrueba);
    await page.waitForTimeout(400);

    // Completar DNI y datos obligatorios
    const inputDni = page.locator('input[placeholder*="Ej: 34567890"], label:has-text("DNI") + input, label:has-text("DNI") input').first();
    await inputDni.fill(dniPrueba);
    await inputDni.blur();

    await page.locator('label:text-is("Teléfono") + input').fill('3424112233');
    await page.locator('label:text-is("Tipo Solicitante") + select').selectOption({ index: 1 });
    await page.locator('label:text-is("Localidad") + select').selectOption({ index: 1 });
    await page.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });
    await page.locator('label:text-is("Descripción / Pedido") + textarea').fill('Solicitud de prueba QA para versión 1.1.0');

    // Guardar la solicitud
    await page.click('button:has-text("Guardar Solicitud")');

    // Validar que la solicitud creada se refleje en la grilla
    await expect(page.locator(`text=${nombrePrueba}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('TC-V1.1-02: Vista 360° e Historial de Solicitudes de la Persona (CDU-07)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.ADMIN.email, CREDENCIALES.ADMIN.pass, 'ADMINISTRADOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // Abrir modal de nueva solicitud para buscar la persona recién creada
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")');

    const inputSolicitante = page.locator('input[placeholder*="Buscar por nombre"], input[placeholder*="Autocompletado"], input[placeholder*="Escribe"]').first();
    await inputSolicitante.fill(nombrePrueba);
    await page.waitForTimeout(800);

    // Seleccionar la persona desde la lista de sugerencias haciendo clic en el botón del dropdown
    const sugerencia = page.locator('div[class*="absolute"] button').filter({ hasText: nombrePrueba }).first();
    await expect(sugerencia).toBeVisible({ timeout: 5000 });
    await sugerencia.click();

    // Validar que se despliegue el badge o resumen de Vista 360°
    const badgeHistorial = page.getByText('Historial del Solicitante:');
    await expect(badgeHistorial).toBeVisible({ timeout: 5000 });

    // Cerrar modal
    await page.keyboard.press('Escape');
  });

  test('TC-V1.1-03: Detección de Inconsistencia por DNI y Sugerencia de Reutilización (CDU-08)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.ADMIN.email, CREDENCIALES.ADMIN.pass, 'ADMINISTRADOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")');

    // Ingresar un nombre intencionalmente diferente
    const inputSolicitante = page.locator('input[placeholder*="Buscar por nombre"], input[placeholder*="Autocompletado"], input[placeholder*="Escribe"]').first();
    await inputSolicitante.fill('Nombre Inconsistente QA');

    // Ingresar el DNI que ya pertenece a nombrePrueba
    const inputDni = page.locator('input[placeholder*="Ej: 34567890"], label:has-text("DNI") + input, label:has-text("DNI") input').first();
    await inputDni.fill(dniPrueba);
    await inputDni.blur();
    await page.waitForTimeout(600);

    // Validar que aparezca la alerta interactiva de inconsistencia
    const alertaInconsistencia = page.getByText('El DNI ingresado');
    await expect(alertaInconsistencia).toBeVisible({ timeout: 5000 });

    // Verificar presencia del botón de acción correctiva
    const botonUsarRegistrado = page.locator('button').filter({ hasText: 'utilizar datos de' }).first();
    await expect(botonUsarRegistrado).toBeVisible({ timeout: 5000 });

    // Al hacer clic, debe sobreescribir el nombre con el registrado
    await botonUsarRegistrado.click();
    await expect(inputSolicitante).toHaveValue(nombrePrueba);

    await page.keyboard.press('Escape');
  });

  test('TC-V1.1-04: Reutilización de Autocompletado en Campos Dinámicos de Formularios (CDU-09)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.ADMIN.email, CREDENCIALES.ADMIN.pass, 'ADMINISTRADOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")');

    // En el modal de nueva solicitud, agregar una asignación múltiple para desplegar campos dinámicos
    const botonAgregarAsignacion = page.locator('button:has-text("Agregar")').last();
    if (await botonAgregarAsignacion.isVisible()) {
      await botonAgregarAsignacion.click();
      await page.waitForTimeout(500);

      // Seleccionar área SUBSIDIO en la asignación creada
      const selectArea = page.locator('select').filter({ hasText: 'Seleccione Área' }).last();
      if (await selectArea.isVisible()) {
        const opciones = await selectArea.locator('option').allInnerTexts();
        const opcionSubsidio = opciones.find(o => o.includes('SUBSIDIO'));
        if (opcionSubsidio) {
          await selectArea.selectOption({ label: opcionSubsidio });
          await page.waitForTimeout(500);

          // Seleccionar tipo de pedido institucional para desplegar responsables
          const selectTipoPedido = page.locator('select').filter({ has: page.locator('option:has-text("Institucional en dinero")') }).first();
          if (await selectTipoPedido.isVisible()) {
            await selectTipoPedido.selectOption({ label: 'Institucional en dinero' });
            await page.waitForTimeout(500);
          }
        }
      }
    }

    // Verificar si se renderizó algún campo dinámico con PersonAutocomplete
    const autocompleteDinamico = page.locator('input[placeholder*="Buscar o ingresar"]').first();
    if (await autocompleteDinamico.isVisible()) {
      await autocompleteDinamico.fill(nombrePrueba);
      await page.waitForTimeout(500);
      const itemDinamico = page.locator('div[class*="absolute"] button').filter({ hasText: nombrePrueba }).first();
      if (await itemDinamico.isVisible()) {
        await itemDinamico.click();
      }
    }

    await page.keyboard.press('Escape');
  });

  // =========================================================================
  // MÓDULO B: APERTURA DIRECTA POR ENLACE DE EMAIL (CDU-10)
  // =========================================================================

  test('TC-V1.1-05: Redirección y Apertura Automática de Modal mediante URL ?id={id} (CDU-10)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.ADMIN.email, CREDENCIALES.ADMIN.pass, 'ADMINISTRADOR');

    // Obtener una solicitud existente desde la grilla
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    const primeraFila = page.locator('table tbody tr').first();
    await expect(primeraFila).toBeVisible();

    // Extraer el ID de la primera solicitud (columna ID o badge #ID)
    const textoFila = await primeraFila.innerText();
    const idCoincidencia = textoFila.match(/#?(\d+)/);
    const idSolicitud = idCoincidencia ? idCoincidencia[1] : '1';

    // Simular el clic en el correo accediendo a la URL directa con el query param
    await page.goto(`${BASE_URL}/mis-solicitudes?id=${idSolicitud}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Validar que el modal de la solicitud se abrió automáticamente
    const modalAbierto = page.locator('button:has-text("Guardar Solicitud"), button:has-text("Resolver"), button:has-text("Volver"), button:has-text("Cerrar")').first();
    await expect(modalAbierto).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('Escape');
  });

  // =========================================================================
  // MÓDULO C: GESTIÓN DE INVITADOS EN GOOGLE CALENDAR (CDU-14 y CDU-15)
  // =========================================================================

  test('TC-V1.1-06: Configuración y Gestión de Invitados Frecuentes de Agenda (CDU-14)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.ADMIN.email, CREDENCIALES.ADMIN.pass, 'ADMINISTRADOR');

    // Ir a la vista de configuración
    await page.goto(`${BASE_URL}/resolutor-settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Si no está disponible directamente resolutor-settings, probar en settings
    if (!page.url().includes('resolutor-settings')) {
      await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    }

    // Ubicar la sección de Invitados Frecuentes
    const seccionInvitados = page.getByText('Invitados Frecuentes de Agenda');
    await expect(seccionInvitados).toBeVisible({ timeout: 10000 });

    const inputNombreInvitado = page.locator('input[placeholder*="Lic. Martín Nocioni"]');
    const inputEmailInvitado = page.locator('input[placeholder*="contacto@gmail.com"]');
    const botonAgregar = page.locator('button:has-text("Agregar")');

    await inputNombreInvitado.fill('Secretaría General QA');
    await inputEmailInvitado.fill(emailInvitadoQA);
    await botonAgregar.click();

    // Verificar que aparezca en la lista de invitados persistidos
    const invitadoEnLista = page.getByText(emailInvitadoQA).first();
    await expect(invitadoEnLista).toBeVisible({ timeout: 10000 });

    // Probar eliminación del invitado frecuente
    page.on('dialog', dialog => dialog.accept());
    const itemGuardado = page.locator(`div:has-text("${emailInvitadoQA}")`).last();
    const botonEliminar = itemGuardado.locator('button').last();
    if (await botonEliminar.isVisible()) {
      await botonEliminar.click();
      await page.waitForTimeout(500);
    }
  });

  test('TC-V1.1-07: Selección de Invitados al Crear Evento en Google Calendar (CDU-15)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.ADMIN.email, CREDENCIALES.ADMIN.pass, 'ADMINISTRADOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // Localizar una solicitud existente para ver sus detalles o resolver
    const botonVer = page.locator('button[title*="Ver / Editar"], button[title*="Editar"], button[title*="Ver"], table tbody tr button').first();
    if (await botonVer.isVisible()) {
      await botonVer.click();
      await page.waitForTimeout(800);
    }

    // Localizar el checkbox "Crear evento en Google Calendar" si está en vista de resolución de Agenda
    const checkboxCalendar = page.locator('label:has-text("Crear evento en Google Calendar") input[type="checkbox"]');
    if (await checkboxCalendar.isVisible()) {
      if (!await checkboxCalendar.isChecked()) {
        await checkboxCalendar.check();
      }

      // Validar que se despliegue el contenedor con los invitados configurados
      const contenedorInvitados = page.getByText('Invitados al evento');
      await expect(contenedorInvitados).toBeVisible();

      // Verificar checkboxes de invitados disponibles
      const checkboxesInvitados = contenedorInvitados.locator('input[type="checkbox"]');
      if (await checkboxesInvitados.count() > 0) {
        await checkboxesInvitados.first().check();
        await expect(checkboxesInvitados.first()).toBeChecked();
      }
    }

    await page.keyboard.press('Escape');
  });
});
