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

test.describe('🧪 Validación E2E: Etapa 1 - Versión 1.2.0 (Campos, Formularios, Redes, Temas y Resolutores)', () => {

  test('CP-01: Verificación de Formulario Inicial (DNI ausente arriba, Redes Sociales presente, Check 1er Contacto removido)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');

    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Nueva Solicitud")');

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 1. En la sección Solicitante (arriba), el DNI ya NO debe ser un campo general de primer contacto
    const seccionSolicitante = modal.locator('text=Solicitante').locator('..').locator('..');
    const inputDniGeneral = seccionSolicitante.locator('label:text-is("DNI (Documento)")');
    await expect(inputDniGeneral).toHaveCount(0);

    // 2. El campo Redes Sociales / Perfil debe estar disponible
    const labelRedes = modal.locator('label:text-is("Redes Sociales / Perfil")');
    await expect(labelRedes).toBeVisible();
    const inputRedes = modal.locator('input[placeholder*="@usuario o link de perfil"]');
    await expect(inputRedes).toBeVisible();

    // 3. El check de primer contacto ("Control 1er Contacto Realizado") NO debe existir
    const checkPrimerContacto = modal.locator('input#firstContactControl, label:has-text("Control 1er Contacto")');
    await expect(checkPrimerContacto).toHaveCount(0);

    // Cerrar modal
    await modal.locator('button:has-text("Cancelar")').click();
  });

  test('CP-02: Tipo de Solicitante Simplificado (Institucional y Personal con sus respectivos subtipos)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');

    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Nueva Solicitud")');

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const selectTipo = modal.locator('label:text-is("Tipo Solicitante") + select');
    await expect(selectTipo).toBeVisible();

    const opciones = await selectTipo.locator('option').allTextContents();
    expect(opciones).toContain('Institucional');
    expect(opciones).toContain('Personal');
    expect(opciones).not.toContain('Club'); // Ya no debe estar en primer nivel

    // Seleccionar 'Personal' -> debe aparecer 'Subtipo Personal'
    await selectTipo.selectOption('Personal');
    await page.waitForTimeout(300);
    const selectSubtipoPersonal = modal.locator('label:text-is("Subtipo Personal") + select');
    await expect(selectSubtipoPersonal).toBeVisible();
    const optsPersonal = await selectSubtipoPersonal.locator('option').allTextContents();
    expect(optsPersonal.map(o => o.toLowerCase())).toContain('joven');
    expect(optsPersonal.map(o => o.toLowerCase())).toContain('emprendedor');

    // Seleccionar 'Institucional' -> debe aparecer 'Subtipo Institucional'
    await selectTipo.selectOption('Institucional');
    await page.waitForTimeout(300);
    const selectSubtipoInst = modal.locator('label:text-is("Subtipo Institucional") + select');
    await expect(selectSubtipoInst).toBeVisible();
    const optsInst = await selectSubtipoInst.locator('option').allTextContents();
    expect(optsInst).toContain('Club');
    expect(optsInst).toContain('Escuela');
    expect(optsInst).toContain('Iglesia');

    await modal.locator('button:has-text("Cancelar")').click();
  });

  test('CP-03: Tema Solicitud (12 opciones) y Origen (8 opciones)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');

    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Nueva Solicitud")');

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 1. Selector de Tema Solicitud
    const selectTema = modal.locator('label:text-is("Tema Solicitud") + select');
    await expect(selectTema).toBeVisible();
    const temas = await selectTema.locator('option').allTextContents();

    const temasRequeridos = [
      'DEPORTE', 'SALUD', 'CULTURA', 'EDUCACIÓN', 'SEGURIDAD', 'VIVIENDA',
      'TRABAJO / EMPRENDEDOR', 'ECONOMÍA - PRODUCCIÓN', 'TEMAS MUNICIPALES',
      'TEMAS PROVINCIALES', 'ASISTENCIA / SUBSISTENCIA', 'OTROS'
    ];
    for (const tema of temasRequeridos) {
      expect(temas).toContain(tema);
    }

    // 2. Selector de Origen
    const selectOrigen = modal.locator('label:text-is("Origen") + select');
    await expect(selectOrigen).toBeVisible();
    const origenes = await selectOrigen.locator('option').allTextContents();

    const origenesRequeridos = [
      'Directo de paco', 'Territorio', 'Oficina', 'Nota / Expediente',
      'Email', 'Instagram', 'Facebook', 'Derivado'
    ];
    for (const origen of origenesRequeridos) {
      expect(origenes).toContain(origen);
    }

    await modal.locator('button:has-text("Cancelar")').click();
  });

  test('CP-04: Resolutores sin nombres nominales (5 formas de resolución limpias)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');

    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Nueva Solicitud")');

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Botón Agregar Asignación
    const btnAgregarAsig = modal.locator('button:has-text("Agregar")').last();
    if (await btnAgregarAsig.count() > 0) {
      await btnAgregarAsig.click();
      await page.waitForTimeout(300);

      const selectArea = modal.locator('select:has-text("Seleccione Área...")').first();
      await expect(selectArea).toBeVisible();

      const optionsText = await selectArea.locator('option').allTextContents();
      
      // Debe contener las formas limpias
      expect(optionsText.some(t => t.includes('Agenda'))).toBeTruthy();
      expect(optionsText.some(t => t.includes('Subsidio en Dinero') || t.includes('Subsidio'))).toBeTruthy();
      expect(optionsText.some(t => t.includes('Subsidio en Especie'))).toBeTruthy();
      expect(optionsText.some(t => t.includes('Declaración de interés'))).toBeTruthy();
      expect(optionsText.some(t => t.includes('Otro'))).toBeTruthy();

      // NO debe tener el formato nominal " - Juan Perez" o similar
      for (const opt of optionsText) {
        expect(opt).not.toMatch(/-\s+[A-Za-z]+@/); // No emails
        expect(opt).not.toMatch(/-\s+Área General/); // No sufijo de usuario
      }
    }

    await modal.locator('button:has-text("Cancelar")').click();
  });

  test('CP-05: Creación integral de Solicitud con Tema, Redes Sociales y Subsidio (DNI en bloque de Subsidio)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');

    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Nueva Solicitud")');

    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const timestamp = Date.now();
    const nombrePersona = `Beneficiario E1-${timestamp}`;

    // Cargar datos del solicitante (SIN DNI en la cabecera)
    const inputSolicitante = modal.locator('input[placeholder*="Buscar por nombre"]').first();
    await inputSolicitante.fill(nombrePersona);
    await modal.locator('input[placeholder*="@usuario o link de perfil"]').fill('@usuario_etapa1');
    await modal.locator('label:text-is("Teléfono") + input').fill('3424112233');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption('Personal');
    await page.waitForTimeout(200);
    const selectSubtipo = modal.locator('label:text-is("Subtipo Personal") + select');
    await expect(selectSubtipo).toBeVisible();
    await selectSubtipo.selectOption({ index: 1 });

    // Cargar Ubicación
    await modal.locator('label:text-is("Localidad") + select').selectOption('Santa Fe');
    await page.waitForTimeout(400);
    const barrioSelect = modal.locator('label:text-is("Barrio") + select');
    await expect(barrioSelect).toBeVisible();
    await barrioSelect.selectOption({ index: 1 });

    // Descripción, Tema y Origen
    await modal.locator('label:text-is("Descripción / Pedido") + textarea').fill(`Solicitud con Tema y Redes Sociales - ${timestamp}`);
    await modal.locator('label:text-is("Tema Solicitud") + select').selectOption('DEPORTE');
    await modal.locator('label:text-is("Origen") + select').selectOption('Territorio');

    // Proponer resolución de Subsidio (Punto 1 y 10)
    const btnAgregarAsig = modal.locator('button:has-text("Agregar")').last();
    await btnAgregarAsig.click();
    await page.waitForTimeout(500);

    const selectArea = modal.locator('select').filter({ hasText: 'Seleccione Área' }).last();
    const opcionesArea = await selectArea.locator('option').allInnerTexts();
    const opcionSubsidio = opcionesArea.find(o => o.toLowerCase().includes('subsidio'));
    await selectArea.selectOption({ label: opcionSubsidio });
    await page.waitForTimeout(500);

    // Intentar guardar sin DNI -> debe bloquearse (Punto 1)
    const btnGuardar = modal.locator('button:has-text("Guardar Solicitud"), button:has-text("Crear Solicitud")').first();
    await btnGuardar.click();

    // Validar mensaje de error
    const toastDniError = page.locator('text=El DNI del solicitante/beneficiario es obligatorio para tramitar un subsidio.');
    await expect(toastDniError.first()).toBeVisible({ timeout: 6000 });

    // Completar el DNI en los campos de la propuesta de subsidio
    const inputDniSubsidio = modal.locator('input[placeholder*="Ej: 34567890"], input[name*="dni"], label:has-text("DNI") + input').last();
    await inputDniSubsidio.fill('38999888');
    await page.waitForTimeout(300);

    // Ahora guardar exitosamente
    await btnGuardar.click();

    // Esperar a que el modal se cierre con éxito
    await expect(modal).toHaveCount(0, { timeout: 20000 });
  });

});
