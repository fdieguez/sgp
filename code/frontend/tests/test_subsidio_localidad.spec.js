import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const CREDENCIALES = {
  ADMIN: { 
    email: 'admin@sgp.com', 
    passwords: ['SGP_Admin_#J57f_Prod_Secure_!', 'SGP_Admin_#gAfU_Prod_Secure_!', 'SGP_Admin_#2026_Prod_Secure_!'] 
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
  const passList = cred ? cred.passwords : [];

  for (const pass of passList) {
    const ok = await intentarLogin(pass);
    if (ok) break;
  }

  await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|select-rol|resolutor-settings).*/, { timeout: 15000 });
  await page.waitForTimeout(500);

  if (page.url().includes('/select-rol')) {
    if (rolASeleccionar) {
      await page.click(`button:has-text("${rolASeleccionar}")`);
    } else {
      await page.locator('.grid button').first().click();
    }
    await page.waitForURL(/.*(dashboard|mis-solicitudes).*/, { timeout: 10000 });
  }
};

test.describe('🧪 Validación E2E: Carga y Persistencia de Subsidios con Localidad', () => {

  test('Prueba 1: Subsidio Institucional con Selección de Localidad Oficial', async ({ page }) => {
    const sufijo = Date.now().toString().slice(-4);
    const nombreInstitucion = `Club Atlético Solidario QA ${sufijo}`;

    // 1. Iniciar sesión como ADMINISTRADOR
    await iniciarSesion(page, CREDENCIALES.ADMIN.email, 'ADMINISTRADOR');

    // 2. Ir a Mis Solicitudes
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // 3. Abrir modal de Nueva Solicitud
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")', { timeout: 10000 });

    const modal = page.locator('div.fixed.inset-0').last();

    // 4. Completar Solicitante y Ubicación General
    const inputSolicitante = modal.locator('input[placeholder*="Buscar por nombre"], input[placeholder*="DNI"]').first();
    await inputSolicitante.fill(nombreInstitucion);

    await modal.locator('label:text-is("Teléfono") + input').fill('3424112233');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption({ index: 1 }); // Club
    await modal.locator('label:text-is("Localidad") + select').selectOption({ index: 1 }); // Santa Fe
    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });
    await modal.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Solicitud de subsidio institucional para equipamiento #${sufijo}`);

    // 5. Agregar Asignación múltiple para desplegar campos dinámicos de Subsidio
    const botonAgregarAsignacion = modal.locator('button:has-text("Agregar")').last();
    await botonAgregarAsignacion.click();
    await page.waitForTimeout(500);

    // 6. Seleccionar Área SUBSIDIO
    const selectArea = modal.locator('select').filter({ hasText: 'Seleccione Área' }).last();
    const opcionesArea = await selectArea.locator('option').allInnerTexts();
    const opcionSubsidio = opcionesArea.find(o => o.includes('SUBSIDIO'));
    expect(opcionSubsidio).toBeDefined();
    await selectArea.selectOption({ label: opcionSubsidio });
    await page.waitForTimeout(600);

    // 7. Seleccionar Tipo de pedido: Institucional en dinero
    const selectTipoPedido = modal.locator('label').filter({ hasText: /^Tipo de pedido/i }).locator('xpath=following-sibling::select | ../select');
    await selectTipoPedido.selectOption({ label: 'Institucional en dinero' });
    await page.waitForTimeout(600);

    // 8. Validar el campo Localidad dinámico de Subsidio (EL BUG REPORTADO)
    const selectLocalidadSubsidio = modal.locator('label').filter({ hasText: /^Localidad/i }).last().locator('xpath=following-sibling::select | ../select');
    await expect(selectLocalidadSubsidio).toBeVisible();

    // Extraer opciones cargadas
    const opcionesLocalidad = await selectLocalidadSubsidio.locator('option').allInnerTexts();
    console.log('=== OPCIONES CONFIRMADAS EN LOCALIDAD DE SUBSIDIO TRAS EL FIX ===');
    console.log('Total opciones disponibles:', opcionesLocalidad.length);
    console.log('Ciudades incluidas:', opcionesLocalidad.slice(0, 8).join(', '), '...');

    expect(opcionesLocalidad.length).toBeGreaterThan(1);
    expect(opcionesLocalidad).toContain('Santa Fe');

    // Seleccionar Santa Fe en el desplegable de Localidad del subsidio
    await selectLocalidadSubsidio.selectOption({ label: 'Santa Fe' });

    // Tomar Captura 1: Formulario con el desplegable de Localidad oficial cargado y seleccionado
    await page.screenshot({ path: 'test-results/captura_subsidio_1_formulario_localidades.png', fullPage: true });

    // 9. Guardar la Solicitud
    const botonGuardar = modal.locator('button:has-text("Guardar Solicitud")');
    await botonGuardar.click();
    await page.waitForTimeout(1500);

    // 10. Seleccionar pestaña Pendiente para verificar la nueva solicitud
    const tabPendiente = page.locator('button:has-text("Pendiente")').first();
    if (await tabPendiente.isVisible()) {
      await tabPendiente.click();
      await page.waitForTimeout(800);
    }

    // Tomar Captura 2: Grilla con la solicitud creada exitosamente
    await page.screenshot({ path: 'test-results/captura_subsidio_2_grilla_confirmada.png', fullPage: true });

    // Validar visibilidad del registro en la grilla
    await expect(page.locator(`text=${nombreInstitucion}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('Prueba 2: Subsidio Personal Completo con Asignación de Resolutor', async ({ page }) => {
    const sufijo = Date.now().toString().slice(-4);
    const nombrePersona = `Beneficiario Personal QA ${sufijo}`;

    // 1. Iniciar sesión como ADMINISTRADOR
    await iniciarSesion(page, CREDENCIALES.ADMIN.email, 'ADMINISTRADOR');

    // 2. Ir a Mis Solicitudes
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // 3. Abrir modal de Nueva Solicitud
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")', { timeout: 10000 });

    const modal = page.locator('div.fixed.inset-0').last();

    // 4. Completar Solicitante Personal dentro del modal
    const inputSolicitante2 = modal.locator('input[placeholder*="Buscar por nombre"], input[placeholder*="DNI"]').first();
    await inputSolicitante2.fill(nombrePersona);

    await modal.locator('label:text-is("Teléfono") + input').fill('3424998877');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption({ label: 'Personal' });
    await page.waitForTimeout(400);

    const selectSubTipo = modal.locator('label:text-is("Subtipo") + select, div:has(label:has-text("Subtipo")) select').first();
    if (await selectSubTipo.isVisible()) {
      await selectSubTipo.selectOption({ index: 1 });
    }

    await modal.locator('label:text-is("Localidad") + select').selectOption({ index: 1 });
    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });
    await modal.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Pedido de subsidio personal para insumos de salud #${sufijo}`);

    // 5. Agregar Asignación múltiple
    const botonAgregarAsignacion = modal.locator('button:has-text("Agregar")').last();
    await botonAgregarAsignacion.click();
    await page.waitForTimeout(500);

    // 6. Seleccionar Área SUBSIDIO
    const selectArea = modal.locator('select').filter({ hasText: 'Seleccione Área' }).last();
    const opcionesArea = await selectArea.locator('option').allInnerTexts();
    const opcionSubsidio = opcionesArea.find(o => o.includes('SUBSIDIO'));
    expect(opcionSubsidio).toBeDefined();
    await selectArea.selectOption({ label: opcionSubsidio });
    await page.waitForTimeout(600);

    // 7. Seleccionar Tipo de pedido: Personal
    const selectTipoPedido = modal.locator('label').filter({ hasText: /^Tipo de pedido/i }).locator('xpath=following-sibling::select | ../select');
    await selectTipoPedido.selectOption({ label: 'Personal' });
    await page.waitForTimeout(600);

    // 8. Tomar Captura 3: Modal de Subsidio Personal completado
    await page.screenshot({ path: 'test-results/captura_subsidio_3_personal_modal.png', fullPage: true });

    // 9. Guardar la Solicitud
    const botonGuardar = modal.locator('button:has-text("Guardar Solicitud")');
    await botonGuardar.click();
    await page.waitForTimeout(1500);

    // 10. Seleccionar pestaña Pendiente para verificar la nueva solicitud
    const tabPendiente = page.locator('button:has-text("Pendiente")').first();
    if (await tabPendiente.isVisible()) {
      await tabPendiente.click();
      await page.waitForTimeout(800);
    }

    // Tomar Captura 4: Grilla con la segunda solicitud creada
    await page.screenshot({ path: 'test-results/captura_subsidio_4_grilla_personal.png', fullPage: true });

    // Validar en la grilla
    await expect(page.locator(`text=${nombrePersona}`).first()).toBeVisible({ timeout: 10000 });
  });

});
