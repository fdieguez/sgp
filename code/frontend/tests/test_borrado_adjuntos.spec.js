import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8080';
const CREDENTIALS = {
  RESOLUTOR_SUBSIDIO: { email: 'martinnocioni@gmail.com', pass: 'Martin_SGP_2026*' }
};

test.describe('Prueba de Borrado Unificado de Adjuntos (Solicitud #47)', () => {
  test('Iniciar sesión, abrir solicitud #47 y verificar borrado de adjuntos huérfanos', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Iniciar Sesión como Resolutor de Subsidios
    console.log('[Test-Borrado] Iniciando sesión...');
    await page.goto(`${BASE_URL}/login`);
    await page.locator('input[type="email"]').fill(CREDENTIALS.RESOLUTOR_SUBSIDIO.email);
    await page.locator('input[type="password"]').fill(CREDENTIALS.RESOLUTOR_SUBSIDIO.pass);
    await page.click('button:has-text("Ingresar")');
    
    // Esperar a que pase el login
    await page.waitForTimeout(2000);

    if (page.url().includes('/select-rol')) {
      await page.click('button:has-text("RESOLUTOR")');
      await page.waitForTimeout(2000);
    }

    // 2. Navegar a Mis Solicitudes
    console.log('[Test-Borrado] Navegando a mis solicitudes...');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.waitForLoadState('networkidle');

    // 3. Buscar y abrir la solicitud #47
    console.log('[Test-Borrado] Abriendo Solicitud #47...');
    await page.locator('input[placeholder*="Buscar por N° Orden"]').fill('47');
    await page.waitForTimeout(1500);
    
    // Hacer clic en el botón de ver/editar detalles dentro de la fila de la solicitud 47
    const filaSolicitud = page.locator('tbody tr').filter({ hasText: '#47' }).first();
    await expect(filaSolicitud).toBeVisible();
    await filaSolicitud.locator('button[title="Ver / Editar Detalles"]').click();

    console.log('[Test-Borrado] Modal abierto. Validando presencia de adjuntos dinámicos...');
    
    // Ir a la pestaña Formularios / Detalles donde están los adjuntos de CBU / DNI
    await page.click('button:has-text("Formulario / Detalles")');
    await page.waitForTimeout(1000);

    // Validar si los botones de eliminar del CBU o DNI están visibles y hacer clic
    const botonesEliminar = page.locator('button:has-text("Eliminar")');
    const cantidadEliminar = await botonesEliminar.count();
    console.log(`[Test-Borrado] Cantidad de archivos dinámicos con opción de eliminar: ${cantidadEliminar}`);

    // Manejar diálogo de confirmación automáticamente (confirmar borrado)
    page.on('dialog', async dialog => {
      console.log(`[Test-Borrado] Aceptando alerta de confirmación: ${dialog.message()}`);
      await dialog.accept();
    });

    // Intentar borrar el primer adjunto dinámico huérfano si existe
    if (cantidadEliminar > 0) {
      console.log('[Test-Borrado] Eliminando primer adjunto dinámico...');
      await botonesEliminar.first().click();
      await page.waitForTimeout(2000);
      // Validar que se muestre el toast de éxito
      await expect(page.locator('text=Archivo eliminado')).toBeVisible();
      console.log('[Test-Borrado] Adjunto dinámico eliminado con éxito.');
    }

    // 4. Ir a la pestaña "Adjuntos" generales y probar el borrado
    console.log('[Test-Borrado] Cambiando a pestaña Adjuntos generales...');
    await page.click('button:has-text("Adjuntos")');
    await page.waitForTimeout(1000);

    // Buscar iconos de tacho de basura de la pestaña general
    const tachosBasura = page.locator('button.text-red-400, button.hover\\:text-red-300');
    const cantidadTachos = await tachosBasura.count();
    console.log(`[Test-Borrado] Cantidad de adjuntos generales a eliminar: ${cantidadTachos}`);

    if (cantidadTachos > 0) {
      console.log('[Test-Borrado] Eliminando primer adjunto general...');
      await tachosBasura.first().click();
      await page.waitForTimeout(2000);
      // Validar que se muestre el toast de éxito
      await expect(page.locator('text=Archivo eliminado')).toBeVisible();
      console.log('[Test-Borrado] Adjunto general eliminado con éxito.');
    }

    // 5. Guardar la solicitud para persistir los cambios del JSON detalle en la asignación
    console.log('[Test-Borrado] Guardando la solicitud para persistir los cambios...');
    await page.click('button:has-text("Guardar Solicitud")');
    await page.waitForTimeout(2000);

    console.log('[Test-Borrado] Test finalizado de manera exitosa.');
  });
});
