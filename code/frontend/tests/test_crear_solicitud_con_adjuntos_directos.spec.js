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

test.describe('🧪 Validación E2E: Carga de Adjuntos Directos al Crear Solicitud (Subida Diferida)', () => {

  test('CP-01: Verificación de UI de adjuntos habilitada al crear nueva solicitud', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // Abrir modal de Nueva Solicitud
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")', { timeout: 10000 });

    const modal = page.locator('div.fixed.inset-0').last();
    await expect(modal.locator('h2:has-text("Nueva Solicitud")')).toBeVisible();

    // 1. Verificar que NO existe el cartel restrictivo previo
    await expect(modal.locator('text=Guarde la solicitud primero para poder agregar adjuntos')).toHaveCount(0);
    await expect(modal.locator('text=Guarde la solicitud antes de subir archivos')).toHaveCount(0);

    // 2. Verificar que la pestaña "Adjuntos" superior está HABILITADA
    const tabAdjuntos = modal.locator('button:has-text("Adjuntos")');
    await expect(tabAdjuntos).toBeVisible();
    await expect(tabAdjuntos).toBeEnabled();

    // 3. Probar navegación directa a la pestaña "Adjuntos" antes de guardar
    await tabAdjuntos.click();
    await page.waitForTimeout(300);
    await expect(modal.locator('h3:has-text("Subir Documento")')).toBeVisible();

    // Subir archivo dentro de la pestaña "Adjuntos"
    const fileInputPestaña = modal.locator('div:has-text("Subir Documento") input[type="file"]');
    await fileInputPestaña.setInputFiles({
      name: 'documento_pestaña.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test tab content')
    });

    // Validar que se muestre en la lista de pendientes de la pestaña Adjuntos
    await expect(modal.locator('text=documento_pestaña.pdf')).toBeVisible();
    await expect(modal.locator('text=Listo para subir al guardar')).toBeVisible();

    // Volver a la pestaña Formulario / Detalles
    await modal.locator('button:has-text("Formulario / Detalles")').click();
    await page.waitForTimeout(300);

    // Verificar que la sección "Adjuntos Rápidos" del formulario también refleje el archivo
    await expect(modal.locator('h3:has-text("Adjuntos Rápidos")')).toBeVisible();
    await expect(modal.locator('span:has-text("listos para subir")')).toContainText('1');

    // Quitar el archivo desde el botón de la lista rápida
    await modal.locator('button:has-text("Quitar")').first().click();
    await expect(modal.locator('span:has-text("listos para subir")')).toContainText('0');
  });

  test('CP-02: Creación integral de solicitud con adjuntos subidos desde la pestaña Adjuntos', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // Abrir modal de nueva solicitud
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")', { timeout: 10000 });
    const modal = page.locator('div.fixed.inset-0').last();

    // Completar Solicitante en la cabecera
    const sufijo = Date.now().toString().slice(-4);
    const nombrePersona = `Beneficiario Pestaña ${sufijo}`;

    const inputSolicitante = modal.locator('input[placeholder*="Buscar por nombre"]').first();
    await inputSolicitante.fill(nombrePersona);
    await modal.locator('label:text-is("Teléfono") + input').fill('3424112233');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption({ label: 'Personal' });
    await page.waitForTimeout(300);

    await modal.locator('label:text-is("Subtipo") + select').selectOption({ label: 'Emprendedor' });
    await modal.locator('label:text-is("Localidad") + select').selectOption({ index: 1 });
    await page.waitForTimeout(300);

    // Seleccionar Barrio una vez cargada la localidad
    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });

    // Descripción requerida
    await modal.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Solicitud con adjunto desde pestaña ${sufijo}`);

    // Ir a la pestaña "Adjuntos" y subir archivo
    await modal.locator('button:has-text("Adjuntos")').click();
    await page.waitForTimeout(300);

    const fileInputPestaña = modal.locator('div:has-text("Subir Documento") input[type="file"]');
    await fileInputPestaña.setInputFiles({
      name: `comprobante_tab_${sufijo}.pdf`,
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 archivo cargado desde pestana adjuntos')
    });

    await expect(modal.locator(`text=comprobante_tab_${sufijo}.pdf`)).toBeVisible();
    await expect(modal.locator('text=Listo para subir al guardar')).toBeVisible();

    // Guardar solicitud directamente desde la pestaña "Adjuntos"
    const btnGuardar = modal.locator('button:has-text("Guardar Solicitud")');
    await btnGuardar.click();

    // Esperar a que el modal se cierre tras el guardado
    await expect(modal).toHaveCount(0, { timeout: 20000 });

    // Buscar la fila recién creada en la tabla de solicitudes
    await page.waitForTimeout(1000);
    const filaNueva = page.locator(`tr:has-text("${sufijo}")`).first();
    await expect(filaNueva).toBeVisible({ timeout: 10000 });

    // Abrir la solicitud creada usando el botón de ver/editar
    await filaNueva.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('button:has-text("Adjuntos")', { timeout: 10000 });

    const modalLectura = page.locator('div.fixed.inset-0').last();
    await modalLectura.locator('button:has-text("Adjuntos")').click();

    // Verificar que el archivo subido esté listado y persistido en la pestaña Adjuntos
    await expect(modalLectura.locator(`text=comprobante_tab_${sufijo}.pdf`)).toBeVisible({ timeout: 10000 });
  });

  test('CP-03: Carga diferida en campos dinámicos de resolución (FILE) al crear solicitud', async ({ page }) => {
    await iniciarSesion(page, CREDENCIALES.RESPONSABLE.email, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    // Abrir modal de nueva solicitud
    await page.click('button:has-text("Nueva Solicitud")');
    await page.waitForSelector('button:has-text("Guardar Solicitud")', { timeout: 10000 });
    const modal = page.locator('div.fixed.inset-0').last();

    // Completar Solicitante en la cabecera
    const sufijo = Date.now().toString().slice(-4);
    const nombrePersona = `Beneficiario Dinamico ${sufijo}`;

    const inputSolicitante = modal.locator('input[placeholder*="Buscar por nombre"]').first();
    await inputSolicitante.fill(nombrePersona);
    await modal.locator('label:text-is("Teléfono") + input').fill('3424887766');
    await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption({ label: 'Personal' });
    await page.waitForTimeout(300);

    await modal.locator('label:text-is("Subtipo") + select').selectOption({ label: 'Emprendedor' });
    await modal.locator('label:text-is("Localidad") + select').selectOption({ index: 1 });
    await page.waitForTimeout(300);

    await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });
    await modal.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Solicitud con campo dinámico de archivo ${sufijo}`);

    // Agregar asignación múltiple de resolución
    const botonAgregarAsignacion = modal.locator('button:has-text("Agregar")').last();
    await botonAgregarAsignacion.click();
    await page.waitForTimeout(500);

    // Seleccionar Área SUBSIDIO
    const selectArea = modal.locator('select').filter({ hasText: 'Seleccione Área' }).last();
    const opcionesArea = await selectArea.locator('option').allInnerTexts();
    const opcionSubsidio = opcionesArea.find(o => o.includes('SUBSIDIO'));
    await selectArea.selectOption({ label: opcionSubsidio });
    await page.waitForTimeout(600);

    // Seleccionar Tipo de pedido: Personal
    const selectTipoPedido = modal.locator('label').filter({ hasText: /^Tipo de pedido/i }).locator('xpath=following-sibling::select | ../select');
    await selectTipoPedido.selectOption({ label: 'Personal' });
    await page.waitForTimeout(600);

    // En el detalle de resolución, buscar el primer input type="file" (ej. DNI Frente)
    const detalleResolucion = modal.locator('div.bg-gray-800\\/80');
    const dynamicFileInput = detalleResolucion.locator('input[type="file"]').first();
    await expect(dynamicFileInput).toBeVisible();
    await expect(dynamicFileInput).toBeEnabled();

    // Adjuntar archivo en el campo dinámico antes de guardar la solicitud
    await dynamicFileInput.setInputFiles({
      name: `dni_frente_${sufijo}.pdf`,
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 archivo de documento de identidad de prueba')
    });

    // Validar estado diferido: "Listo para subir" y botón "Quitar"
    await expect(detalleResolucion.locator(`text=dni_frente_${sufijo}.pdf`)).toBeVisible();
    await expect(detalleResolucion.locator('text=Listo para subir')).toBeVisible();
    await expect(detalleResolucion.locator('button:has-text("Quitar")')).toBeVisible();

    // Guardar solicitud
    const btnGuardar = modal.locator('button:has-text("Guardar Solicitud")');
    await btnGuardar.click();

    // Esperar a que el modal se cierre
    await expect(modal).toHaveCount(0, { timeout: 25000 });

    // Buscar la fila creada y abrirla
    await page.waitForTimeout(1000);
    const filaNueva = page.locator(`tr:has-text("${sufijo}")`).first();
    await expect(filaNueva).toBeVisible({ timeout: 10000 });

    await filaNueva.locator('button[title="Ver / Editar Detalles"]').click();
    await page.waitForSelector('button:has-text("Guardar Solicitud")', { timeout: 10000 });

    const modalLectura = page.locator('div.fixed.inset-0').last();
    // Validar que en el detalle de resolución figure el archivo con enlace de descarga persistido
    await expect(modalLectura.locator(`text=dni_frente_${sufijo}.pdf`)).toBeVisible({ timeout: 10000 });
  });

});
