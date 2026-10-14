import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

/**
 * Credenciales de prueba estándar para entorno local
 */
const CREDENCIALES = {
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' },
  RESOLUTOR: { email: 'resolutor@sgp.com', pass: 'password123' },
  OPERADOR: { email: 'celeste_solari19@hotmail.com', pass: 'password123' }
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

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.click('button:has-text("Ingresar")');
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
    const inputSolicitante = page.locator('input[placeholder*="Escribe al menos 2 caracteres"]').first();
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
    const inputDni = page.locator('label:text-is("DNI") + input, label:has-text("DNI") input').first();
    await inputDni.fill(dniPrueba);
    await inputDni.blur();

    await page.locator('label:text-is("Teléfono") + input').fill('3424112233');
    await page.locator('label:text-is("Tipo Solicitante") + select').selectOption({ index: 1 });
    await page.locator('label:text-is("Localidad") + select').selectOption({ index: 1 });
    await page.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });
    await page.locator('label:text-is("Descripción / Pedido") + textarea').fill('Solicitud de prueba QA para versión 1.1.0');

    // Guardar la solicitud
    await page.click('button:has-text("Guardar Solicitud")');
    await page.waitForSelector('text=Solicitud creada exitosamente, text=guardada, text=éxito', { timeout: 10000 });
  });

  test('TC-V1.1-02: Vista 360° e Historial de Solicitudes de la Persona (CDU-07)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.ADMIN.email, CREDENCIALES.ADMIN.pass, 'ADMINISTRADOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // Abrir modal de nueva solicitud para buscar la persona recién creada
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")');

    const inputSolicitante = page.locator('input[placeholder*="Escribe al menos 2 caracteres"]').first();
    await inputSolicitante.fill(nombrePrueba);
    await page.waitForTimeout(600);

    // Seleccionar la persona desde la lista de sugerencias
    const sugerencia = page.locator(`text=${nombrePrueba}`).first();
    await expect(sugerencia).toBeVisible();
    await sugerencia.click();

    // Validar que se despliegue el badge o resumen de Vista 360°
    const badgeHistorial = page.locator('text=/.*solicitudes? registradas?.*/i');
    await expect(badgeHistorial).toBeVisible();

    // Cerrar modal
    await page.keyboard.press('Escape');
  });

  test('TC-V1.1-03: Detección de Inconsistencia por DNI y Sugerencia de Reutilización (CDU-08)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.ADMIN.email, CREDENCIALES.ADMIN.pass, 'ADMINISTRADOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")');

    // Ingresar un nombre intencionalmente diferente
    const inputSolicitante = page.locator('input[placeholder*="Escribe al menos 2 caracteres"]').first();
    await inputSolicitante.fill('Nombre Inconsistente QA');

    // Ingresar el DNI que ya pertenece a nombrePrueba
    const inputDni = page.locator('label:text-is("DNI") + input, label:has-text("DNI") input').first();
    await inputDni.fill(dniPrueba);
    await inputDni.blur();

    // Validar que aparezca la alerta interactiva de inconsistencia
    const alertaInconsistencia = page.locator('text=/El DNI ingresado ya pertenece a/i');
    await expect(alertaInconsistencia).toBeVisible();

    // Verificar presencia del botón de acción correctiva
    const botonUsarRegistrado = page.locator('button:has-text("Usar datos registrados")');
    await expect(botonUsarRegistrado).toBeVisible();

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

    // Seleccionar Tipo de Solicitud que despliegue responsables dinámicos (Subsidios o Agenda)
    const selectTipo = page.locator('label:text-is("Tipo de Solicitud") + select, label:has-text("Tipo") select').first();
    const opcionesTipo = await selectTipo.locator('option').allInnerTexts();

    const opcionConResponsable = opcionesTipo.find(o => o.includes('Subsidio') || o.includes('Agenda'));
    if (opcionConResponsable) {
      await selectTipo.selectOption({ label: opcionConResponsable });
      await page.waitForTimeout(500);

      // Verificar si se renderizó algún campo dinámico con PersonAutocomplete
      const autocompleteDinamico = page.locator('div[data-testid="responsable-autocomplete"], input[placeholder*="Buscar"]').nth(1);
      if (await autocompleteDinamico.isVisible()) {
        await autocompleteDinamico.fill(nombrePrueba);
        await page.waitForTimeout(500);
        const itemDinamico = page.locator(`text=${nombrePrueba}`).first();
        if (await itemDinamico.isVisible()) {
          await itemDinamico.click();
        }
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
    const modalAbierto = page.locator('button:has-text("Guardar Solicitud"), button:has-text("Resolver")');
    await expect(modalAbierto.first()).toBeVisible();

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

    // Ubicar la sección o componente de Invitados Frecuentes
    const seccionInvitados = page.locator('text=/Invitados Frecuentes/i').first();
    await expect(seccionInvitados).toBeVisible({ timeout: 10000 });

    // Formulario de agregar nuevo invitado frecuente
    const inputNombreInvitado = page.locator('input[placeholder*="Nombre"]').first();
    const inputEmailInvitado = page.locator('input[placeholder*="@gmail.com"], input[type="email"]').first();
    const botonAgregar = page.locator('button:has-text("Agregar Invitado")');

    await inputNombreInvitado.fill('Secretaría General QA');
    await inputEmailInvitado.fill(emailInvitadoQA);
    await botonAgregar.click();

    // Verificar que aparezca en la lista de invitados persistidos
    const invitadoEnLista = page.locator(`text=${emailInvitadoQA}`);
    await expect(invitadoEnLista).toBeVisible({ timeout: 5000 });
  });

  test('TC-V1.1-07: Selección de Invitados al Crear Evento en Google Calendar (CDU-15)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.ADMIN.email, CREDENCIALES.ADMIN.pass, 'ADMINISTRADOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // Filtrar o buscar una solicitud en estado de Agenda o lista para resolver
    const botonEditar = page.locator('button[title*="Editar"], button[title*="Ver"]').first();
    await botonEditar.click();
    await page.waitForTimeout(800);

    // Localizar el checkbox "Crear evento en Google Calendar"
    const checkboxCalendar = page.locator('label:has-text("Crear evento en Google Calendar") input[type="checkbox"]');
    if (await checkboxCalendar.isVisible()) {
      if (!await checkboxCalendar.isChecked()) {
        await checkboxCalendar.check();
      }

      // Validar que se despliegue el contenedor con los invitados configurados
      const contenedorInvitados = page.locator('text=/Invitados a la reunión/i');
      await expect(contenedorInvitados).toBeVisible();

      // Verificar que el invitado creado en el test anterior figure disponible con checkbox
      const checkboxInvitado = page.locator(`label:has-text("${emailInvitadoQA}") input[type="checkbox"]`);
      if (await checkboxInvitado.isVisible()) {
        await checkboxInvitado.check();
        await expect(checkboxInvitado).toBeChecked();
      }
    }

    await page.keyboard.press('Escape');
  });
});
