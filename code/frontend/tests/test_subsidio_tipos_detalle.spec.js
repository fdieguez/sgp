import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const CREDENCIALES = {
  ADMIN: { 
    email: 'admin@sgp.com', 
    passwords: ['SGP_Admin_#J57f_Prod_Secure_!', 'SGP_Admin_#gAfU_Prod_Secure_!', 'SGP_Admin_#2026_Prod_Secure_!'] 
  },
  RESPONSABLE: {
    email: 'dieguezfrancisco@gmail.com',
    passwords: ['password']
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
      await page.click(`button:has-text("${rolASeleccionar}")`);
    } else {
      await page.locator('.grid button').first().click();
    }
    await page.waitForURL(/.*(dashboard|mis-solicitudes).*/, { timeout: 10000 });
  }
};

test.describe('🧪 Validación E2E: Formularios y Condicionales de Subsidio (Personal, Dinero, Especie)', () => {

  test('Verificar opciones y precarga en Tipo Personal, Dinero y Especie', async ({ page }) => {
    // 1. Iniciar sesión como RESPONSABLE (dieguezfrancisco@gmail.com)
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');

    // 2. Navegar a Mis Solicitudes
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // 3. Abrir modal de Nueva Solicitud
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")', { timeout: 10000 });

    const modal = page.locator('div.fixed.inset-0').last();

    // 4. Completar Solicitante en la cabecera
    const sufijo = Date.now().toString().slice(-4);
    const nombrePersona = `Carlos Beneficiario QA ${sufijo}`;
    const inputSolicitante = modal.locator('input[placeholder*="Buscar por nombre"], input[placeholder*="DNI"]').first();
    await inputSolicitante.fill(nombrePersona);

    await modal.locator('label:text-is("Teléfono") + input').fill('3424998877');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption({ label: 'Personal' });
    await page.waitForTimeout(300);

    await modal.locator('label:text-is("Localidad") + select').selectOption({ index: 1 });
    await modal.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Solicitud de subsidio integral ${sufijo}`);

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

    // 7. Ubicar el select de "Tipo de pedido"
    const selectTipoPedido = modal.locator('label').filter({ hasText: /^Tipo de pedido/i }).locator('xpath=following-sibling::select | ../select');
    await expect(selectTipoPedido).toBeVisible();

    // ==========================================
    // CASO A: TIPO PERSONAL
    // ==========================================
    await selectTipoPedido.selectOption({ label: 'Personal' });
    await page.waitForTimeout(600);

    // Verificar precarga automática de Nombre y Teléfono del solicitante en el detalle de resolución
    const detalleResolucion = modal.locator('div.bg-gray-800\\/80');
    const inputNombrePers = detalleResolucion.locator(`input[value="${nombrePersona}"]`);
    await expect(inputNombrePers).toBeVisible();

    const inputTelPers = detalleResolucion.locator('input[value="3424998877"]');
    await expect(inputTelPers).toBeVisible();

    // Verificar que el campo Compañía es un select con 4 opciones: MOVISTAR, CLARO, PERSONAL, OTRA
    const selectCompania = detalleResolucion.locator('label').filter({ hasText: /^Compañía/i }).locator('xpath=following-sibling::select | ../select');
    await expect(selectCompania).toBeVisible();
    const opcionesCompania = await selectCompania.locator('option').allInnerTexts();
    expect(opcionesCompania).toContain('MOVISTAR');
    expect(opcionesCompania).toContain('CLARO');
    expect(opcionesCompania).toContain('PERSONAL');
    expect(opcionesCompania).toContain('OTRA');

    // Comprobar que NO están visibles los campos institucionales ni de especie
    await expect(modal.locator('label:text-is("Nombre de institución")')).toHaveCount(0);
    await expect(modal.locator('label:text-is("Fecha del evento")')).toHaveCount(0);
    await expect(modal.locator('label:text-is("Responsable 1: Nombre")')).toHaveCount(0);
    await expect(modal.locator('label:text-is("Descripción del monto y bienes solicitados")')).toHaveCount(0);

    // ==========================================
    // CASO B: TIPO INSTITUCIONAL EN DINERO
    // ==========================================
    await selectTipoPedido.selectOption({ label: 'Institucional en dinero' });
    await page.waitForTimeout(600);

    // Deben mostrarse campos de institución, localidad y autoridades
    await expect(modal.locator('label:has-text("Nombre de institución")')).toBeVisible();
    await expect(modal.locator('label:has-text("Dirección de institución")')).toBeVisible();
    await expect(modal.locator('label:has-text("Localidad")').last()).toBeVisible();
    await expect(modal.locator('label:has-text("Responsable 1: Nombre")')).toBeVisible();
    await expect(modal.locator('label:has-text("Responsable 1: DNI")')).toBeVisible();
    await expect(modal.locator('label:has-text("Responsable 1: Cargo")')).toBeVisible();
    await expect(modal.locator('label:has-text("Nota de pedido")')).toBeVisible();

    // NO deben mostrarse campos de Personal ni de Especie
    await expect(modal.locator('label:has-text("Compañía")')).toHaveCount(0);
    await expect(modal.locator('label:has-text("Fecha del evento")')).toHaveCount(0);
    await expect(modal.locator('label:has-text("Descripción del monto y bienes solicitados")')).toHaveCount(0);

    // ==========================================
    // CASO C: TIPO INSTITUCIONAL EN ESPECIE
    // ==========================================
    await selectTipoPedido.selectOption({ label: 'Institucional en especie' });
    await page.waitForTimeout(600);

    // Deben mostrarse Nombre de institución, Fecha del evento, Descripción de bienes y Observaciones
    await expect(modal.locator('label:has-text("Nombre de institución")')).toBeVisible();
    await expect(modal.locator('label:has-text("Fecha del evento")')).toBeVisible();
    await expect(modal.locator('label:has-text("Descripción del monto y bienes solicitados")')).toBeVisible();
    await expect(modal.locator('label:has-text("Observaciones")').last()).toBeVisible();

    // NO deben mostrarse campos de dinero ni autoridades ni personal
    await expect(modal.locator('label:has-text("Dirección de institución")')).toHaveCount(0);
    await expect(modal.locator('label:has-text("Responsable 1: Nombre")')).toHaveCount(0);
    await expect(modal.locator('label:has-text("Responsable 1: DNI")')).toHaveCount(0);
    await expect(modal.locator('label:has-text("Responsable 1: Cargo")')).toHaveCount(0);
    await expect(modal.locator('label:has-text("Nota de pedido")')).toHaveCount(0);
    await expect(modal.locator('label:has-text("Compañía")')).toHaveCount(0);
    // Y el campo numérico simple Monto tampoco debe figurar en especie
    const labelsMonto = modal.locator('div.bg-gray-800\\/80 label').filter({ hasText: /^Monto(\s*\*|$)/ });
    await expect(labelsMonto).toHaveCount(0);

    // Tomar captura de confirmación final
    await page.screenshot({ path: 'test-results/captura_subsidio_especie_verificado.png', fullPage: true });
  });
});
