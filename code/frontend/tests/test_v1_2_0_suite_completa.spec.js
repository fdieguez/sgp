import { test, expect } from '@playwright/test';

/**
 * 🎯 Suite Completa E2E: Versión 1.2.0
 * 
 * Cobertura de funcionalidades:
 *  - Carga inicial:
 *      * Sin campo DNI en cabecera
 *      * Tipo Solicitante Institucional / Personal y sus subtipos obligatorios
 *      * Tema Solicitud (12 temas normalizados)
 *      * Redes Sociales (persistencia del perfil)
 *      * Clasificación de Origen (8 orígenes)
 *      * Remoción de check de primer contacto
 *  - Etapa 2 (Permisos y Estados Automáticos):
 *      * Bloqueo de Carga Original para no creadores (solo Operador o Creador)
 *      * Subsidios propuestos (Dinero y Especie): DNI obligatorio en subsidio,
 *        edición permitida solo a Creador y Resolutor asignado, bloqueo para terceros
 *      * Estados Automáticos:
 *          - Sin resolución -> "Asignadas" (en proceso)
 *          - Con resolución -> "En Resolución"
 *      * Resolutores limpios sin nombres en el selector
 *      * Verificación de persistencia en Modal de Detalle
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const CREDENCIALES = {
  ADMIN: { email: 'admin@sgp.com', password: 'password' },
  OPERADOR: { email: 'carinacdevard@gmail.com', password: 'password' },
  RESPONSABLE: { email: 'hrdorigo@gmail.com', password: 'password' },
  RESPONSABLE_OTRO: { email: 'sabrivschmidt@gmail.com', password: 'password' },
  RESOLUTOR_SUBSIDIO: { email: 'resolutor@sgp.com', password: 'password' }
};

const iniciarSesion = async (page, email, rolASeleccionar = null) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });

  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', 'password');
  await page.click('button[type="submit"]');

  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

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

test.describe('🎯 Suite Completa E2E: Versión 1.2.0 (Flujos Cruzados, Roles, Validaciones y Modal Detalle)', () => {

  test('CP-01: Flujo cruzado completo: Creación por Responsable -> Asignadas -> Bloqueo para Responsable no creador -> Edición libre para Operador', async ({ page }) => {
    const timestamp = Date.now();
    const nombrePersona = `Beneficiario FlujoCruzado-${timestamp}`;
    const descOriginal = `Descripcion Original para flujo cruzado - ${timestamp}`;

    // 1. Creador crea solicitud
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Nueva Solicitud")');

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    await modal.locator('input[placeholder*="Buscar por nombre"]').first().fill(nombrePersona);
    await modal.locator('input[placeholder*="@usuario o link de perfil"]').fill('@usuario_cruzado');
    await modal.locator('label:text-is("Teléfono") + input').fill('3424101010');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption('Personal');
    await page.waitForTimeout(200);
    await modal.locator('label:text-is("Subtipo Personal") + select').selectOption({ index: 1 });

    await modal.locator('label:text-is("Localidad") + select').selectOption('Santa Fe');
    await page.waitForTimeout(300);
    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });

    await modal.locator('label:text-is("Descripción / Pedido") + textarea').fill(descOriginal);
    await modal.locator('label:text-is("Tema Solicitud") + select').selectOption('EDUCACIÓN');
    await modal.locator('label:text-is("Origen") + select').selectOption('Territorio');

    await modal.locator('button:has-text("Guardar Solicitud")').click();
    await expect(modal).toHaveCount(0, { timeout: 15000 });

    // Verificar que queda en Asignadas
    await page.locator('button:has-text("Asignadas")').first().click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="Buscar"]').first().fill(nombrePersona);
    await page.waitForTimeout(500);
    const rowAsignada = page.locator(`tr:has-text("${nombrePersona}")`).first();
    await expect(rowAsignada).toBeVisible({ timeout: 6000 });
    await expect(rowAsignada.locator('td:has-text("Asignadas")')).toBeVisible();

    // 2. Responsable No Creador intenta editar
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE_OTRO.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const tabAsignadasOtro = page.locator('button:has-text("Asignadas")').first();
    if (await tabAsignadasOtro.count() > 0) {
      await tabAsignadasOtro.click();
      await page.waitForTimeout(500);
    }
    const inputBuscarOtro = page.locator('input[placeholder*="Buscar"]').first();
    if (await inputBuscarOtro.count() > 0) {
      await inputBuscarOtro.fill(nombrePersona);
      await page.waitForTimeout(500);
    }
    const btnEditarOtro = page.locator(`tr:has-text("${nombrePersona}") button:has-text("Ver"), tr:has-text("${nombrePersona}") button[title*="Editar"], tr:has-text("${nombrePersona}") button[title*="Detalles"]`).first();
    if (await btnEditarOtro.count() > 0) {
      await btnEditarOtro.click();
      const modalBloqueado = page.locator('div[role="dialog"], .fixed.inset-0').last();
      await expect(modalBloqueado).toBeVisible({ timeout: 5000 });

      // Banner y campos bloqueados
      await expect(modalBloqueado.locator('text=Los datos de la carga inicial solo pueden ser modificados por el Operador o el Responsable que cargó este pedido')).toBeVisible();
      await expect(modalBloqueado.locator('input[placeholder*="Buscar por nombre"]').first()).toBeDisabled();
      await expect(modalBloqueado.locator('label:text-is("Descripción / Pedido") + textarea')).toBeDisabled();
      await modalBloqueado.locator('button:has-text("Cancelar")').click();
    }

    // 3. Operador abre y edita libremente
    await iniciarSesion(page, CREDENCIALES.OPERADOR.email, 'OPERADOR');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const tabAsignadasOp = page.locator('button:has-text("Asignadas")').first();
    if (await tabAsignadasOp.count() > 0) {
      await tabAsignadasOp.click();
      await page.waitForTimeout(500);
    }

    await page.locator('input[placeholder*="Buscar"]').first().fill(nombrePersona);
    await page.waitForTimeout(500);

    const btnEditarOp = page.locator(`tr:has-text("${nombrePersona}") button:has-text("Ver"), tr:has-text("${nombrePersona}") button[title*="Editar"], tr:has-text("${nombrePersona}") button[title*="Detalles"]`).first();
    await btnEditarOp.click();
    const modalOp = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modalOp).toBeVisible({ timeout: 5000 });

    // Sin banner de bloqueo y campos habilitados
    await expect(modalOp.locator('text=Los datos de la carga inicial solo pueden ser modificados por el Operador')).toHaveCount(0);
    const inputDescOp = modalOp.locator('label:text-is("Descripción / Pedido") + textarea');
    await expect(inputDescOp).toBeEnabled();

    // Modificar datos y guardar
    const nuevaDesc = `${descOriginal} - Editada por Operador`;
    await inputDescOp.fill(nuevaDesc);
    await modalOp.locator('label:text-is("Tema Solicitud") + select').selectOption('VIVIENDA');
    await modalOp.locator('button:has-text("Guardar Solicitud")').click();
    await expect(modalOp).toHaveCount(0, { timeout: 15000 });
  });

  test('CP-02: Propuesta de Subsidio en Dinero: DNI obligatorio, modo solo lectura para terceros y editable para el Resolutor', async ({ page }) => {
    const timestamp = Date.now();
    const nombrePersona = `Beneficiario SubsidioDinero-${timestamp}`;

    // 1. Responsable crea con Subsidio en Dinero
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Nueva Solicitud")');

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    await modal.locator('input[placeholder*="Buscar por nombre"]').first().fill(nombrePersona);
    await modal.locator('label:text-is("Teléfono") + input').fill('3424998877');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption('Personal');
    await page.waitForTimeout(200);
    await modal.locator('label:text-is("Subtipo Personal") + select').selectOption({ index: 1 });

    await modal.locator('label:text-is("Localidad") + select').selectOption('Santa Fe');
    await page.waitForTimeout(300);
    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });

    await modal.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Pedido con subsidio en dinero para validación - ${timestamp}`);
    await modal.locator('label:text-is("Tema Solicitud") + select').selectOption('ASISTENCIA / SUBSISTENCIA');
    await modal.locator('label:text-is("Origen") + select').selectOption('Directo de paco');

    // Agregar Asignación
    await modal.locator('button:has-text("Agregar")').last().click();
    await page.waitForTimeout(400);

    const selectArea = modal.locator('select').filter({ hasText: 'Seleccione Área' }).last();
    await selectArea.selectOption({ label: 'Subsidio en Dinero' });
    await page.waitForTimeout(500);

    // Intentar guardar sin DNI -> Toast de bloqueo
    await modal.locator('button:has-text("Guardar Solicitud")').click();
    const toastDniError = page.locator('text=El DNI del solicitante/beneficiario es obligatorio para tramitar un subsidio.');
    await expect(toastDniError.first()).toBeVisible({ timeout: 6000 });

    // Completar DNI en los campos del subsidio
    const inputDniSubsidio = modal.locator('input[placeholder*="Ej: 34567890"], input[name*="dni"], label:has-text("DNI") + input').last();
    await inputDniSubsidio.fill('37111222');
    await page.waitForTimeout(200);

    await modal.locator('button:has-text("Guardar Solicitud")').click();
    await expect(modal).toHaveCount(0, { timeout: 15000 });

    // 2. Otro Responsable ve la solicitud: subsidio debe estar en solo lectura y no puede eliminarlo
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE_OTRO.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const tabEnResOtro = page.locator('button:has-text("En Resolución")').first();
    if (await tabEnResOtro.count() > 0) {
      await tabEnResOtro.click();
      await page.waitForTimeout(500);
    }

    await page.locator('input[placeholder*="Buscar"]').first().fill(nombrePersona);
    await page.waitForTimeout(500);

    const btnVerTercero = page.locator(`tr:has-text("${nombrePersona}") button:has-text("Ver"), tr:has-text("${nombrePersona}") button[title*="Editar"], tr:has-text("${nombrePersona}") button[title*="Detalles"]`).first();
    if (await btnVerTercero.count() > 0) {
      await btnVerTercero.click();
      const modalTercero = page.locator('div[role="dialog"], .fixed.inset-0').last();
      await expect(modalTercero).toBeVisible({ timeout: 5000 });

      // El campo DNI del subsidio debe estar deshabilitado para terceros
      const inputDniTercero = modalTercero.locator('input[placeholder*="Ej: 34567890"], input[name*="dni"], label:has-text("DNI") + input').last();
      await expect(inputDniTercero).toBeDisabled();

      // No debe tener botón de eliminar asignación (Trash2)
      const btnTrash = modalTercero.locator('button[title="Eliminar asignación"]');
      await expect(btnTrash).toHaveCount(0);

      await modalTercero.locator('button:has-text("Cancelar")').click();
    }

    // 3. Resolutor de Subsidio entra y sí puede editarlo
    await iniciarSesion(page, CREDENCIALES.RESOLUTOR_SUBSIDIO.email, 'RESOLUTOR');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const tabEnResResolutor = page.locator('button:has-text("En Resolución")').first();
    if (await tabEnResResolutor.count() > 0) {
      await tabEnResResolutor.click();
      await page.waitForTimeout(500);
    }

    await page.locator('input[placeholder*="Buscar"]').first().fill(nombrePersona);
    await page.waitForTimeout(500);

    const btnVerResolutor = page.locator(`tr:has-text("${nombrePersona}") button:has-text("Ver"), tr:has-text("${nombrePersona}") button[title*="Editar"], tr:has-text("${nombrePersona}") button[title*="Detalles"]`).first();
    if (await btnVerResolutor.count() > 0) {
      await btnVerResolutor.click();
      const modalRes = page.locator('div[role="dialog"], .fixed.inset-0').last();
      await expect(modalRes).toBeVisible({ timeout: 5000 });

      const inputDniRes = modalRes.locator('input[placeholder*="Ej: 34567890"], input[name*="dni"], label:has-text("DNI") + input').last();
      await expect(inputDniRes).toBeEnabled();

      await modalRes.locator('button:has-text("Cancelar")').click();
    }
  });

  test('CP-03: Propuesta de Subsidio en Especie: selector limpio, DNI obligatorio y persistencia de datos', async ({ page }) => {
    const timestamp = Date.now();
    const nombrePersona = `Beneficiario Especie-${timestamp}`;

    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Nueva Solicitud")');

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    await modal.locator('input[placeholder*="Buscar por nombre"]').first().fill(nombrePersona);
    await modal.locator('label:text-is("Teléfono") + input').fill('3424223344');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption('Personal');
    await page.waitForTimeout(200);
    await modal.locator('label:text-is("Subtipo Personal") + select').selectOption({ index: 1 });

    await modal.locator('label:text-is("Localidad") + select').selectOption('Santa Fe');
    await page.waitForTimeout(300);
    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });

    await modal.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Pedido con subsidio en especie - ${timestamp}`);
    await modal.locator('label:text-is("Tema Solicitud") + select').selectOption('ECONOMÍA - PRODUCCIÓN');
    await modal.locator('label:text-is("Origen") + select').selectOption('Instagram');

    // Asignación de Subsidio en Especie
    await modal.locator('button:has-text("Agregar")').last().click();
    await page.waitForTimeout(400);

    const selectArea = modal.locator('select').filter({ hasText: 'Seleccione Área' }).last();
    await selectArea.selectOption({ label: 'Subsidio en Especie' });
    await page.waitForTimeout(500);

    // Completar DNI
    const inputDni = modal.locator('input[placeholder*="Ej: 34567890"], input[name*="dni"], label:has-text("DNI") + input').last();
    await inputDni.fill('36555444');

    await modal.locator('button:has-text("Guardar Solicitud")').click();
    await expect(modal).toHaveCount(0, { timeout: 15000 });

    // Verificar en la pestaña "En Resolución"
    await page.locator('button:has-text("En Resolución")').first().click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="Buscar"]').first().fill(nombrePersona);
    await page.waitForTimeout(500);

    const row = page.locator(`tr:has-text("${nombrePersona}")`).first();
    await expect(row).toBeVisible({ timeout: 6000 });
    await expect(row.locator('td:has-text("En Resolución")')).toBeVisible();
  });

  test('CP-04: Tipos de Solicitante y Subtipos: validación de obligatoriedad y persistencia de redes sociales', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Nueva Solicitud")');

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const timestamp = Date.now();
    const nombreInstitucion = `Club Social y Deportivo-${timestamp}`;

    await modal.locator('input[placeholder*="Buscar por nombre"]').first().fill(nombreInstitucion);
    await modal.locator('input[placeholder*="@usuario o link de perfil"]').fill('https://instagram.com/clubsanfe');
    await modal.locator('label:text-is("Teléfono") + input').fill('3424123123');

    // Seleccionar 'Institucional'
    const selectTipo = modal.locator('label:text-is("Tipo Solicitante") + select');
    await selectTipo.selectOption('Institucional');
    await page.waitForTimeout(300);

    // Debe mostrar Subtipo Institucional
    const selectSubtipoInst = modal.locator('label:text-is("Subtipo Institucional") + select');
    await expect(selectSubtipoInst).toBeVisible();
    await selectSubtipoInst.selectOption('Club');

    await modal.locator('label:text-is("Localidad") + select').selectOption('Santa Fe');
    await page.waitForTimeout(300);
    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });

    await modal.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Solicitud institucional del club - ${timestamp}`);
    await modal.locator('label:text-is("Tema Solicitud") + select').selectOption('DEPORTE');
    await modal.locator('label:text-is("Origen") + select').selectOption('Facebook');

    await modal.locator('button:has-text("Guardar Solicitud")').click();
    await expect(modal).toHaveCount(0, { timeout: 15000 });

    // Filtrar y verificar
    await page.locator('button:has-text("Asignadas")').first().click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="Buscar"]').first().fill(nombreInstitucion);
    await page.waitForTimeout(500);

    const row = page.locator(`tr:has-text("${nombreInstitucion}")`).first();
    await expect(row).toBeVisible({ timeout: 6000 });
  });

  test('CP-05: Verificación en Modal de Detalle (Tema Solicitud, Origen y Redes Sociales sin 1er Contacto)', async ({ page }) => {
    const timestamp = Date.now();
    const nombrePersona = `Beneficiario Detalle-${timestamp}`;

    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Nueva Solicitud")');

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    await modal.locator('input[placeholder*="Buscar por nombre"]').first().fill(nombrePersona);
    await modal.locator('input[placeholder*="@usuario o link de perfil"]').fill('@red_social_verificada');
    await modal.locator('label:text-is("Teléfono") + input').fill('3424999999');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption('Personal');
    await page.waitForTimeout(200);
    await modal.locator('label:text-is("Subtipo Personal") + select').selectOption({ index: 1 });

    await modal.locator('label:text-is("Localidad") + select').selectOption('Santa Fe');
    await page.waitForTimeout(300);
    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });

    await modal.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Solicitud para verificación de modal de detalles - ${timestamp}`);
    await modal.locator('label:text-is("Tema Solicitud") + select').selectOption('TEMAS PROVINCIALES');
    await modal.locator('label:text-is("Origen") + select').selectOption('Email');

    await modal.locator('button:has-text("Guardar Solicitud")').click();
    await expect(modal).toHaveCount(0, { timeout: 15000 });

    // Buscar la fila
    await page.locator('button:has-text("Asignadas")').first().click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="Buscar"]').first().fill(nombrePersona);
    await page.waitForTimeout(500);

    const row = page.locator(`tr:has-text("${nombrePersona}")`).first();
    await expect(row).toBeVisible({ timeout: 6000 });

    // Abrir modal de la solicitud
    const btnVer = row.locator('button:has-text("Ver"), button[title*="Ver"], button[title*="Detalles"], button[title*="Editar"]').first();
    await btnVer.click();

    const modalVerificacion = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modalVerificacion).toBeVisible({ timeout: 5000 });

    // 1. Debe mostrar Redes Sociales con el valor persistido
    const inputRedes = modalVerificacion.locator('input[placeholder*="@usuario o link de perfil"]');
    await expect(inputRedes).toHaveValue('@red_social_verificada');

    // 2. Debe mostrar Tema Solicitud y Origen con sus valores persistidos
    const selectTema = modalVerificacion.locator('label:text-is("Tema Solicitud") + select');
    await expect(selectTema).toHaveValue('TEMAS PROVINCIALES');

    const selectOrigen = modalVerificacion.locator('label:text-is("Origen") + select');
    await expect(selectOrigen).toHaveValue('Email');

    // 3. NO debe mostrar checkbox o bloque de 1er Contacto
    await expect(modalVerificacion.locator('text=1er Contacto, text=Primer Contacto, text=firstContactControl')).toHaveCount(0);

    await modalVerificacion.locator('button:has-text("Cancelar")').click();
  });

});
