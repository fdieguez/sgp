import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8080';

// Credenciales para la ejecución del caso de prueba
const CREDENTIALS = {
  OPERADOR: { email: 'celeste_solari19@hotmail.com', pass: 'Celeste_SGP_Npg8#' }
};

// Crear archivo de prueba para simular la nota adjunta
const assetsDir = path.resolve(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
const testPdfPath = path.join(assetsDir, 'Nota_Pedido_Operador_Test.pdf');
if (!fs.existsSync(testPdfPath)) {
  fs.writeFileSync(testPdfPath, '%PDF-1.4\n1 0 obj\n<< /Title (Nota de Pedido Oficial Operador) >>\nendobj\n%%EOF');
}

/**
 * Función auxiliar para iniciar sesión en SGP
 */
const login = async (page, email, password) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Si hay sesión abierta previa, cerrar sesión
  const logoutBtn = page.locator('button:has-text("Salir")');
  if (await logoutBtn.count() > 0) {
    await logoutBtn.click();
    await page.waitForURL(/.*login.*/, { timeout: 10000 });
  }

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Ingresar")');

  // Esperar redirección al dashboard o a mis-solicitudes
  await page.waitForURL(/.*(dashboard|mis-solicitudes|select-rol).*/, { timeout: 15000 });
  await page.waitForTimeout(500);

  // Si requiere seleccionar rol, elegir OPERADOR
  if (page.url().includes('/select-rol')) {
    await page.click('button:has-text("OPERADOR")');
    await page.waitForURL(/.*(dashboard|mis-solicitudes).*/, { timeout: 15000 });
    await page.waitForTimeout(500);
  }
};

test.describe('Verificación de Visualización y Edición de Adjuntos/Notas por Operador', () => {

  test('CP-OPERADOR-01: Operador carga pedido con adjuntos y puede verlos al volver a ingresar/editar', async ({ page }) => {
    test.setTimeout(90000);

    const randomSuffix = Math.floor(Math.random() * 90000) + 10000;
    const nombreBeneficiario = `Vecino Prueba ${randomSuffix}`;
    const descripcionPedido = `Pedido con nota formal adjunta nro ${randomSuffix}`;

    // 1. Iniciar sesión como Operadora
    console.log('[Paso 1] Iniciando sesión como Operador...');
    await login(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);

    // Asegurar estar en mis-solicitudes
    if (!page.url().includes('/mis-solicitudes')) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
    }
    await page.waitForLoadState('networkidle');

    // 2. Hacer clic en "Nueva Solicitud"
    console.log('[Paso 2] Abriendo formulario de Nueva Solicitud...');
    const btnNueva = page.locator('button:has-text("Nueva Solicitud")');
    await expect(btnNueva).toBeVisible({ timeout: 10000 });
    await btnNueva.click();

    // Validar apertura del modal
    const modal = page.locator('div[role="dialog"], .fixed.inset-0').first();
    await expect(modal).toBeVisible();

    // 3. Completar campos obligatorios del pedido
    console.log('[Paso 3] Completando datos del pedido y solicitante...');
    const solicitanteInput = modal.locator('input[placeholder*="Buscar por nombre o DNI"]');
    await solicitanteInput.fill(nombreBeneficiario);

    // Teléfono
    const telefonoInput = modal.locator('label:has-text("Teléfono") + input');
    await telefonoInput.fill('3424123456');

    // Tipo de Solicitante
    const tipoSelect = modal.locator('label:has-text("Tipo Solicitante") + select');
    await tipoSelect.selectOption('Personal');

    // Subtipo Personal
    const subTipoSelect = modal.locator('label:has-text("Subtipo Personal") + select');
    await subTipoSelect.selectOption('emprendedor');

    // Barrio (Obligatorio)
    const barrioSelect = modal.locator('label:text-is("Barrio") + select');
    await expect(barrioSelect).toBeVisible();
    await barrioSelect.selectOption({ index: 1 });

    // Descripción del pedido
    const descTextarea = modal.locator('label:has-text("Descripción / Pedido") + textarea');
    await descTextarea.fill(descripcionPedido);

    // Origen: Nota / Expediente
    const origenSelect = modal.locator('label:has-text("Origen") + select');
    if (await origenSelect.count() > 0) {
      await origenSelect.selectOption('Nota / Expediente');
    }

    // 4. Adjuntar archivo en la sección "Adjuntos Rápidos"
    console.log('[Paso 4] Adjuntando archivo de nota de pedido...');
    const fileInput = modal.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testPdfPath);

    // Validar feedback visual previo a guardar
    await expect(modal.locator('text=archivo(s) seleccionado(s) listos para subir.')).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('text=Nota_Pedido_Operador_Test.pdf')).toBeVisible();

    // 5. Guardar la solicitud
    console.log('[Paso 5] Guardando pedido y subiendo adjunto...');
    const btnGuardar = modal.locator('button:has-text("Guardar Solicitud")');
    await btnGuardar.click();

    // Esperar toast o cierre de modal
    await expect(modal).not.toBeVisible({ timeout: 15000 });
    console.log('[Paso 5] Pedido guardado exitosamente.');

    // 6. Localizar el caso en la tabla de solicitudes
    console.log('[Paso 6] Buscando el pedido creado en la tabla...');
    await page.waitForTimeout(1000);
    const filaPedido = page.locator('tr').filter({ hasText: nombreBeneficiario }).first();
    await expect(filaPedido).toBeVisible({ timeout: 10000 });

    // Validar que en la tabla se visualice el badge de adjunto
    const badgeAdjunto = filaPedido.locator('text=1 adjunto');
    await expect(badgeAdjunto).toBeVisible();
    console.log('✅ Badge de "1 adjunto" visible en la tabla.');

    // 7. Volver a ingresar a ver el caso / editar
    console.log('[Paso 7] Reingresando al caso mediante "Ver / Editar Detalles"...');
    const btnEditar = filaPedido.locator('button[title*="Editar"]').first();
    await btnEditar.click();

    // Validar apertura de la modal de edición
    await expect(modal).toBeVisible({ timeout: 10000 });

    // 8. VALIDACIÓN CLAVE 1: Contador en pestaña "Formulario / Detalles"
    console.log('[Paso 8] Validando contador y lista en pestaña Detalles...');
    const contadorGuardados = modal.locator('text=adjuntos guardados.');
    await expect(contadorGuardados).toBeVisible({ timeout: 10000 });
    console.log('✅ Contador muestra correctamente "1 adjuntos guardados."');

    // 9. VALIDACIÓN CLAVE 2: Archivo listado en la misma pestaña de Detalles con acciones
    const archivoEnDetalles = modal.locator('text=Nota_Pedido_Operador_Test.pdf').first();
    await expect(archivoEnDetalles).toBeVisible();
    console.log('✅ Archivo listado visible directamente en la pestaña de carga/detalles.');

    const btnVisualizarDetalles = modal.locator('button[title="Visualizar documento"]').first();
    await expect(btnVisualizarDetalles).toBeVisible();
    const btnDescargarDetalles = modal.locator('button[title="Descargar documento"]').first();
    await expect(btnDescargarDetalles).toBeVisible();
    console.log('✅ Botones de Visualizar y Descargar disponibles en detalles.');

    // 10. VALIDACIÓN CLAVE 3: Badge en la pestaña superior "Adjuntos"
    console.log('[Paso 10] Validando badge de cantidad en pestaña superior Adjuntos...');
    const tabAdjuntos = modal.locator('button:has-text("Adjuntos")');
    await expect(tabAdjuntos).toBeVisible();
    const badgeTab = tabAdjuntos.locator('span:has-text("1")');
    await expect(badgeTab).toBeVisible();
    console.log('✅ Pestaña "Adjuntos" muestra el badge numérico con "1".');

    // 11. VALIDACIÓN CLAVE 4: Navegar a la pestaña "Adjuntos" y comprobar visualización
    console.log('[Paso 11] Entrando a la pestaña "Adjuntos"...');
    await tabAdjuntos.click();

    const archivoEnTabAdjuntos = modal.locator('button:has-text("Nota_Pedido_Operador_Test.pdf")');
    await expect(archivoEnTabAdjuntos).toBeVisible();

    // Validar botones de acción visibles sin depender de hover oculto
    const btnOjo = modal.locator('button[title="Visualizar"]').first();
    await expect(btnOjo).toBeVisible();
    const btnDownload = modal.locator('button[title="Descargar"]').first();
    await expect(btnDownload).toBeVisible();
    console.log('✅ Pestaña "Adjuntos" completamente operativa con acciones visibles.');

    console.log('🎉 Caso de prueba finalizado con éxito.');
  });

});
