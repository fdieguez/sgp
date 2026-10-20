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

test.describe('🧪 Validación E2E: DNI Obligatorio en Subsidio, Edición sin bloqueo de Fecha Entrega y Saneamiento de Nombres', () => {

  test('CP-01: Exigir DNI obligatorio al tramitar Subsidio y permitir guardar cuando se completa', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // Abrir modal de nueva solicitud
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")', { timeout: 10000 });
    const modal = page.locator('div.fixed.inset-0').last();

    const sufijo = Date.now().toString().slice(-4);
    const nombrePersona = `Beneficiario DNI QA ${sufijo}`;

    const inputSolicitante = modal.locator('input[placeholder*="Buscar por nombre"]').first();
    await inputSolicitante.fill(nombrePersona);
    await modal.locator('label:text-is("Teléfono") + input').fill('3424123456');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption({ label: 'Personal' });
    await page.waitForTimeout(300);

    await modal.locator('label:text-is("Subtipo") + select').selectOption({ label: 'Emprendedor' });
    await modal.locator('label:text-is("Localidad") + select').selectOption({ index: 1 });
    await page.waitForTimeout(300);

    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });
    await modal.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Solicitud de subsidio para test de DNI ${sufijo}`);

    // Agregar asignación de área SUBSIDIO
    const botonAgregarAsignacion = modal.locator('button:has-text("Agregar")').last();
    await botonAgregarAsignacion.click();
    await page.waitForTimeout(500);

    const selectArea = modal.locator('select').filter({ hasText: 'Seleccione Área' }).last();
    const opcionesArea = await selectArea.locator('option').allInnerTexts();
    const opcionSubsidio = opcionesArea.find(o => o.includes('SUBSIDIO'));
    await selectArea.selectOption({ label: opcionSubsidio });
    await page.waitForTimeout(500);

    // Dejar el DNI vacío e intentar guardar -> Debe bloquearse
    const inputDni = modal.locator('input[placeholder*="Ej: 34567890"]');
    await inputDni.fill('');

    const btnGuardar = modal.locator('button:has-text("Guardar Solicitud")');
    await btnGuardar.click();

    // Validar mensaje de error
    const toastDniError = page.locator('text=El DNI del solicitante/beneficiario es obligatorio para tramitar un subsidio.');
    await expect(toastDniError).toBeVisible({ timeout: 6000 });

    // Completar el DNI y guardar nuevamente
    await inputDni.fill('38999888');
    await btnGuardar.click();

    // Esperar a que el modal se cierre con éxito
    await expect(modal).toHaveCount(0, { timeout: 20000 });
  });

  test('CP-02: Edición de solicitud de Subsidio sin bloqueo por Fecha de Entrega (Opción 1)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // Abrir modal de nueva solicitud con DNI
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")', { timeout: 10000 });
    const modal = page.locator('div.fixed.inset-0').last();

    const sufijo = Date.now().toString().slice(-4);
    const nombrePersona = `Beneficiario Edicion ${sufijo}`;

    const inputSolicitante = modal.locator('input[placeholder*="Buscar por nombre"]').first();
    await inputSolicitante.fill(nombrePersona);
    await modal.locator('input[placeholder*="Ej: 34567890"]').fill('39111222');
    await modal.locator('label:text-is("Teléfono") + input').fill('3424123456');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption({ label: 'Personal' });
    await page.waitForTimeout(300);

    await modal.locator('label:text-is("Subtipo") + select').selectOption({ label: 'Emprendedor' });
    await modal.locator('label:text-is("Localidad") + select').selectOption({ index: 1 });
    await page.waitForTimeout(300);

    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });
    await modal.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Solicitud para validar edicion de subsidio ${sufijo}`);

    // Asignar resolución SUBSIDIO
    const botonAgregarAsignacion = modal.locator('button:has-text("Agregar")').last();
    await botonAgregarAsignacion.click();
    await page.waitForTimeout(500);

    const selectArea = modal.locator('select').filter({ hasText: 'Seleccione Área' }).last();
    const opcionesArea = await selectArea.locator('option').allInnerTexts();
    const opcionSubsidio = opcionesArea.find(o => o.includes('SUBSIDIO'));
    await selectArea.selectOption({ label: opcionSubsidio });
    await page.waitForTimeout(500);

    // Guardar solicitud inicial
    await modal.locator('button:has-text("Guardar Solicitud")').click();
    await expect(modal).toHaveCount(0, { timeout: 20000 });

    // Buscar la fila recién creada y abrirla para editar
    await page.waitForTimeout(1000);
    const filaNueva = page.locator(`tr:has-text("${sufijo}")`).first();
    await expect(filaNueva).toBeVisible({ timeout: 10000 });

    await filaNueva.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('button:has-text("Guardar Solicitud")', { timeout: 10000 });
    const modalEditar = page.locator('div.fixed.inset-0').last();

    // Validar que los campos de Subsidio indiquen que son opcionales
    await expect(modalEditar.locator('label:has-text("Fecha Entrega (Opcional)")')).toBeVisible({ timeout: 10000 });

    // Modificar la descripción sin tocar Fecha de Entrega (dejarla vacía)
    await modalEditar.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Descripción actualizada sin fecha de entrega ${sufijo}`);

    // Guardar cambios
    await modalEditar.locator('button:has-text("Guardar Solicitud")').click();

    // Validar que se guarde exitosamente y el modal se cierre (sin error de fecha de otorgamiento obligatoria)
    await expect(modalEditar).toHaveCount(0, { timeout: 20000 });
    await expect(page.locator('text=La fecha de otorgamiento es obligatoria.')).toHaveCount(0);
  });

  test('CP-03: Verificación de saneamiento de acentos (Matías Ippólito sin caracteres corruptos)', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');

    // 1. Obtener token del usuario autenticado y consultar /api/responsables
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const response = await page.request.get('http://localhost:8080/api/responsables', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    expect(response.ok()).toBeTruthy();
    const responsables = await response.json();

    const matias = responsables.find(r => r.email === 'matias.ippolito@gmail.com');
    expect(matias).toBeDefined();
    expect(matias.firstName).toBe('Matías');
    expect(matias.lastName).toBe('Ippólito');
    expect(matias.name).toBe('Matías Ippólito');
    // Confirmar que no contenga caracteres dañados de consola (├, ┤, etc.)
    expect(matias.firstName).not.toContain('├');
    expect(matias.lastName).not.toContain('├');

    // 2. Verificar otros usuarios saneados
    const veronica = responsables.find(r => r.email === 'mveronicagonzalez79@gmail.com');
    if (veronica) {
      expect(veronica.firstName).toBe('Verónica');
      expect(veronica.lastName).toBe('González');
      expect(veronica.firstName).not.toContain('├');
    }
  });

});
