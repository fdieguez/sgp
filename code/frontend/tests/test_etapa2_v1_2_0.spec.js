import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const CREDENCIALES = {
  ADMIN: { 
    email: 'admin@sgp.com', 
    passwords: ['SGP_Admin_#J57f_Prod_Secure_!', 'SGP_Admin_#gAfU_Prod_Secure_!', 'SGP_Admin_#2026_Prod_Secure_!', 'password'] 
  },
  RESPONSABLE: {
    email: 'dieguezfrancisco@gmail.com',
    passwords: ['password']
  },
  RESPONSABLE_OTRO: {
    email: 'lea.aufranc@gmail.com',
    passwords: ['Leandro&trYi&Kb', 'password']
  },
  OPERADOR: {
    email: 'celeste_solari19@hotmail.com',
    passwords: ['Celeste_SGP_Npg8#', 'password']
  },
  RESOLUTOR_SUBSIDIO: {
    email: 'martinnocioni@gmail.com',
    passwords: ['Martin_SGP_b7kP*', 'password']
  }
};

const iniciarSesion = async (page, email, rolASeleccionar = null) => {
  await page.goto(`${BASE_URL}/login`, { timeout: 15000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const botonSalir = page.locator('button:has-text("Salir")');
  if (await botonSalir.count() > 0) {
    await botonSalir.click();
    await page.waitForURL(/.*login.*/, { timeout: 10000 });
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

  const cred = Object.values(CREDENCIALES).find(c => c.email === email);
  const passList = cred ? cred.passwords : ['password'];

  for (const pass of passList) {
    const ok = await intentarLogin(pass);
    if (ok) break;
  }

  await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|select-rol|resolutor-settings).*/, { timeout: 15000 });
  await page.waitForTimeout(500);

  if (page.url().includes('/select-rol')) {
    if (rolASeleccionar) {
      const btnRol = page.locator(`button:has-text("${rolASeleccionar}")`).first();
      if (await btnRol.count() > 0) {
        await btnRol.click();
      } else {
        await page.click('button[type="submit"], button:has-text("Continuar"), .grid button');
      }
    } else {
      await page.click('button[type="submit"], button:has-text("Continuar"), .grid button');
    }
    await page.waitForTimeout(1000);
  }
};

test.describe('🧪 Validación E2E: Etapa 2 - Versión 1.2.0 (Permisos de Carga Original, Subsidio y Estados Automáticos)', () => {

  test('CP-01: Estado automático al crear Solicitud por Responsable SIN resolución (debe quedar "Asignadas" / en proceso)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');

    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Nueva Solicitud")');

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const timestamp = Date.now();
    const nombrePersona = `Solicitante AutoAsignado-${timestamp}`;

    // Cargar datos del solicitante
    await modal.locator('input[placeholder*="Buscar por nombre"]').first().fill(nombrePersona);
    await modal.locator('label:text-is("Teléfono") + input').fill('3424001122');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption('Personal');
    await page.waitForTimeout(200);
    const selectSubtipo = modal.locator('label:text-is("Subtipo Personal") + select');
    await selectSubtipo.selectOption({ index: 1 });

    // Localidad y Barrio
    await modal.locator('label:text-is("Localidad") + select').selectOption('Santa Fe');
    await page.waitForTimeout(300);
    const barrioSelect = modal.locator('label:text-is("Barrio") + select');
    await barrioSelect.selectOption({ index: 1 });

    // Descripción, Tema y Origen (SIN resoluciones asignadas)
    const desc = `Solicitud sin resoluciones creadas por responsable - ${timestamp}`;
    await modal.locator('label:text-is("Descripción / Pedido") + textarea').fill(desc);
    await modal.locator('label:text-is("Tema Solicitud") + select').selectOption('SALUD');
    await modal.locator('label:text-is("Origen") + select').selectOption('Oficina');

    // Guardar
    await modal.locator('button:has-text("Guardar Solicitud")').click();
    await expect(modal).toHaveCount(0, { timeout: 15000 });

    // Verificar en la pestaña "Asignadas" (en proceso)
    const tabAsignadas = page.locator('button:has-text("Asignadas")').first();
    await tabAsignadas.click();
    await page.waitForTimeout(1000);

    // Buscar en el filtro
    const inputBuscar = page.locator('input[placeholder*="Buscar"]').first();
    await inputBuscar.fill(nombrePersona);
    await page.waitForTimeout(500);

    // Debe encontrarse en la tabla bajo Asignadas
    const row = page.locator(`tr:has-text("${nombrePersona}")`).first();
    await expect(row).toBeVisible({ timeout: 6000 });
    await expect(row.locator('td:has-text("Asignadas")')).toBeVisible();
  });

  test('CP-02: Estado automático al crear Solicitud por Responsable CON posible resolución (debe quedar "En Resolución")', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');

    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Nueva Solicitud")');

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const timestamp = Date.now();
    const nombrePersona = `Solicitante EnResolucion-${timestamp}`;

    // Cargar datos básicos
    await modal.locator('input[placeholder*="Buscar por nombre"]').first().fill(nombrePersona);
    await modal.locator('label:text-is("Teléfono") + input').fill('3424334455');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption('Personal');
    await page.waitForTimeout(200);
    await modal.locator('label:text-is("Subtipo Personal") + select').selectOption({ index: 1 });

    await modal.locator('label:text-is("Localidad") + select').selectOption('Santa Fe');
    await page.waitForTimeout(300);
    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });

    const desc = `Solicitud con propuesta de resolución - ${timestamp}`;
    await modal.locator('label:text-is("Descripción / Pedido") + textarea').fill(desc);
    await modal.locator('label:text-is("Tema Solicitud") + select').selectOption('CULTURA');
    await modal.locator('label:text-is("Origen") + select').selectOption('Territorio');

    // Proponer resolución de Agenda
    await modal.locator('button:has-text("Agregar")').last().click();
    await page.waitForTimeout(400);

    const selectArea = modal.locator('select').filter({ hasText: 'Seleccione Área' }).last();
    await selectArea.selectOption({ label: 'Agenda' });
    await page.waitForTimeout(500);

    // Completar campos obligatorios de Agenda
    const selectTipoAct = modal.locator('label:has-text("Tipo de actividad") + select').last();
    if (await selectTipoAct.count() > 0) await selectTipoAct.selectOption({ index: 1 });

    const selectOrg = modal.locator('label:has-text("Organizada por nosotros?") + select').last();
    if (await selectOrg.count() > 0) await selectOrg.selectOption({ index: 1 });

    const inputTemario = modal.locator('label:has-text("Descripción/temario") + textarea, label:has-text("Descripción/temario") + input').last();
    if (await inputTemario.count() > 0) await inputTemario.fill('Reunión barrial comunitaria');

    const inputAsistentes = modal.locator('label:has-text("Asistentes") + input').last();
    if (await inputAsistentes.count() > 0) await inputAsistentes.fill('Vecinos del barrio');

    const selectInteres = modal.locator('label:has-text("Declaración de interés") + select').last();
    if (await selectInteres.count() > 0) await selectInteres.selectOption({ index: 1 });

    const selectAporte = modal.locator('label:has-text("Aporte?") + select').last();
    if (await selectAporte.count() > 0) await selectAporte.selectOption({ label: 'no' });

    const inputDia = modal.locator('label:has-text("Día") + input').last();
    if (await inputDia.count() > 0) await inputDia.fill('2026-11-15');

    const inputHora = modal.locator('label:has-text("Hora") + input').last();
    if (await inputHora.count() > 0) await inputHora.fill('18:00');

    const inputResp = modal.locator('label:has-text("Responsable") + input, input[placeholder*="Responsable"]').last();
    if (await inputResp.count() > 0) await inputResp.fill('Responsable Comunitario');

    const inputObs = modal.locator('label:has-text("Observación") + textarea, label:has-text("Observación") + input').last();
    if (await inputObs.count() > 0) await inputObs.fill('Sin observaciones especiales');

    // Guardar
    await modal.locator('button:has-text("Guardar Solicitud")').click();
    await expect(modal).toHaveCount(0, { timeout: 15000 });

    // Verificar en la pestaña "En Resolución"
    const tabEnResolucion = page.locator('button:has-text("En Resolución")').first();
    await tabEnResolucion.click();
    await page.waitForTimeout(1000);

    const inputBuscar = page.locator('input[placeholder*="Buscar"]').first();
    await inputBuscar.fill(nombrePersona);
    await page.waitForTimeout(500);

    const row = page.locator(`tr:has-text("${nombrePersona}")`).first();
    await expect(row).toBeVisible({ timeout: 6000 });
    await expect(row.locator('td:has-text("En Resolución")')).toBeVisible();
  });

  test('CP-03: Bloqueo de Carga Original para Responsable que NO es el creador (Punto 6)', async ({ page }) => {
    // 1. Responsable creador genera la solicitud
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Nueva Solicitud")');

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const timestamp = Date.now();
    const nombrePersona = `Beneficiario Protegido-${timestamp}`;
    const descOriginal = `Descripcion Original Protegida-${timestamp}`;

    await modal.locator('input[placeholder*="Buscar por nombre"]').first().fill(nombrePersona);
    await modal.locator('input[placeholder*="@usuario o link de perfil"]').fill('@perfil_original');
    await modal.locator('label:text-is("Teléfono") + input').fill('3424556677');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption('Personal');
    await page.waitForTimeout(200);
    await modal.locator('label:text-is("Subtipo Personal") + select').selectOption({ index: 1 });

    await modal.locator('label:text-is("Localidad") + select').selectOption('Santa Fe');
    await page.waitForTimeout(300);
    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });

    await modal.locator('label:text-is("Descripción / Pedido") + textarea').fill(descOriginal);
    await modal.locator('label:text-is("Tema Solicitud") + select').selectOption('SEGURIDAD');
    await modal.locator('label:text-is("Origen") + select').selectOption('Territorio');

    await modal.locator('button:has-text("Guardar Solicitud")').click();
    await expect(modal).toHaveCount(0, { timeout: 15000 });

    // 2. Inicia sesión OTRO Responsable (no creador)
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE_OTRO.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // Para verla, si está en el listado general o panel
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Buscar la solicitud por nombre
    const inputBuscar = page.locator('input[placeholder*="Buscar"]').first();
    if (await inputBuscar.count() > 0) {
      await inputBuscar.fill(nombrePersona);
      await page.waitForTimeout(500);
    }

    // Abrir detalles
    const btnEditar = page.locator(`tr:has-text("${nombrePersona}") button:has-text("Ver"), tr:has-text("${nombrePersona}") button[title*="Editar"], tr:has-text("${nombrePersona}") button[title*="Detalles"]`).first();
    if (await btnEditar.count() > 0) {
      await btnEditar.click();
      const modalEdicion = page.locator('div[role="dialog"], .fixed.inset-0').last();
      await expect(modalEdicion).toBeVisible({ timeout: 5000 });

      // Debe mostrar el banner de bloqueo de carga original (Punto 6)
      const bannerBloqueo = modalEdicion.locator('text=Los datos de la carga inicial solo pueden ser modificados por el Operador o el Responsable que cargó este pedido');
      await expect(bannerBloqueo).toBeVisible();

      // Campos de carga original deben estar deshabilitados (disabled)
      const inputNombre = modalEdicion.locator('input[placeholder*="Buscar por nombre"]').first();
      await expect(inputNombre).toBeDisabled();

      const inputRedes = modalEdicion.locator('input[placeholder*="@usuario o link de perfil"]');
      await expect(inputRedes).toBeDisabled();

      const inputTel = modalEdicion.locator('label:text-is("Teléfono") + input');
      await expect(inputTel).toBeDisabled();

      const selectTipo = modalEdicion.locator('label:text-is("Tipo Solicitante") + select');
      await expect(selectTipo).toBeDisabled();

      const selectLoc = modalEdicion.locator('label:text-is("Localidad") + select');
      await expect(selectLoc).toBeDisabled();

      const inputDesc = modalEdicion.locator('label:text-is("Descripción / Pedido") + textarea');
      await expect(inputDesc).toBeDisabled();

      const selectTema = modalEdicion.locator('label:text-is("Tema Solicitud") + select');
      await expect(selectTema).toBeDisabled();

      await modalEdicion.locator('button:has-text("Cancelar")').click();
    }
  });

  test('CP-04: Operador sí puede editar la Carga Original (Punto 6)', async ({ page }) => {
    // 1. Iniciar sesión como Operador
    await iniciarSesion(page, CREDENCIALES.OPERADOR.email, 'OPERADOR');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });

    // Abrir la primera solicitud disponible en la tabla
    const fila = page.locator('table tbody tr').first();
    await expect(fila).toBeVisible({ timeout: 8000 });

    const btnEditar = fila.locator('button:has-text("Ver"), button[title*="Editar"], button[title*="Detalles"]').first();
    await btnEditar.click();

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // NO debe aparecer el banner de bloqueo para el operador
    const bannerBloqueo = modal.locator('text=Los datos de la carga inicial solo pueden ser modificados por el Operador');
    await expect(bannerBloqueo).toHaveCount(0);

    // Campos de carga original deben estar habilitados para el Operador
    const inputNombre = modal.locator('input[placeholder*="Buscar por nombre"]').first();
    await expect(inputNombre).toBeEnabled();

    const inputRedes = modal.locator('input[placeholder*="@usuario o link de perfil"]');
    await expect(inputRedes).toBeEnabled();

    const inputDesc = modal.locator('label:text-is("Descripción / Pedido") + textarea');
    await expect(inputDesc).toBeEnabled();

    const selectTema = modal.locator('label:text-is("Tema Solicitud") + select');
    await expect(selectTema).toBeEnabled();

    const selectOrigen = modal.locator('label:text-is("Origen") + select');
    await expect(selectOrigen).toBeEnabled();

    await modal.locator('button:has-text("Cancelar")').click();
  });

  test('CP-05: Protección de Subsidio Propuesto (solo Responsable proponente o Resolutor pueden cambiarlo - Punto 8)', async ({ page }) => {
    // 1. Responsable creador crea solicitud con Subsidio en Dinero
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Nueva Solicitud")');

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const timestamp = Date.now();
    const nombrePersona = `Beneficiario Subsidio-${timestamp}`;

    await modal.locator('input[placeholder*="Buscar por nombre"]').first().fill(nombrePersona);
    await modal.locator('label:text-is("Teléfono") + input').fill('3424889900');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption('Personal');
    await page.waitForTimeout(200);
    await modal.locator('label:text-is("Subtipo Personal") + select').selectOption({ index: 1 });

    await modal.locator('label:text-is("Localidad") + select').selectOption('Santa Fe');
    await page.waitForTimeout(300);
    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });

    await modal.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Propuesta de subsidio para verificación - ${timestamp}`);
    await modal.locator('label:text-is("Tema Solicitud") + select').selectOption('VIVIENDA');
    await modal.locator('label:text-is("Origen") + select').selectOption('Territorio');

    // Agregar asignación de Subsidio en Dinero
    await modal.locator('button:has-text("Agregar")').last().click();
    await page.waitForTimeout(400);

    const selectArea = modal.locator('select').filter({ hasText: 'Seleccione Área' }).last();
    const opcionesArea = await selectArea.locator('option').allInnerTexts();
    const opcionSubsidio = opcionesArea.find(o => o.toLowerCase().includes('subsidio'));
    await selectArea.selectOption({ label: opcionSubsidio });
    await page.waitForTimeout(500);

    // Completar DNI obligatorio
    const inputDniSubsidio = modal.locator('input[placeholder*="Ej: 34567890"], input[name*="dni"], label:has-text("DNI") + input').last();
    await inputDniSubsidio.fill('39888777');

    await modal.locator('button:has-text("Guardar Solicitud")').click();
    await expect(modal).toHaveCount(0, { timeout: 15000 });

    // 2. Inicia sesión el Resolutor de Subsidios (martinnocioni@gmail.com)
    await iniciarSesion(page, CREDENCIALES.RESOLUTOR_SUBSIDIO.email, 'RESOLUTOR');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });

    // Buscar la solicitud recién creada
    const inputBuscar = page.locator('input[placeholder*="Buscar"]').first();
    if (await inputBuscar.count() > 0) {
      await inputBuscar.fill(nombrePersona);
      await page.waitForTimeout(500);
    }

    const filaResolutor = page.locator(`tr:has-text("${nombrePersona}")`).first();
    if (await filaResolutor.count() > 0) {
      await filaResolutor.locator('button:has-text("Ver"), button[title*="Editar"], button[title*="Detalles"]').first().click();
      const modalRes = page.locator('div[role="dialog"], .fixed.inset-0').last();
      await expect(modalRes).toBeVisible({ timeout: 5000 });

      // El resolutor asignado al subsidio DEBE poder editar el detalle del subsidio
      const inputDniRes = modalRes.locator('input[placeholder*="Ej: 34567890"], input[name*="dni"], label:has-text("DNI") + input').last();
      await expect(inputDniRes).toBeEnabled();

      await modalRes.locator('button:has-text("Cancelar")').click();
    }
  });

});
