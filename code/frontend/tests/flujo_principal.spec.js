import { test, expect } from '@playwright/test';

test.describe.serial('Flujo Principal de Solicitud (Etapa 3)', () => {
  const idUnico = Date.now().toString().slice(-4);
  const descripcionSolicitud = `Pedido de anteojos autom ${idUnico}`;

  test('Paso 1: CREACIÓN - ROL OPERADOR', async ({ page }) => {
    await page.goto('/');
    
    // Login
    await page.fill('input[type="email"]', 'operador@sgp.com');
    await page.fill('input[type="password"]', 'SGP_StrongPass_2026!');
    await page.click('button:has-text("Ingresar")');
    
    // Esperar a que el login termine y cargue el dashboard
    await expect(page.locator('text=Panel SGP')).toBeVisible();

    // Ir a Mis Solicitudes
    await page.goto('/mis-solicitudes');

    // Nueva Solicitud
    await page.click('button:has-text("Nueva Solicitud")');
    
    // Esperar a que el modal se abra
    await expect(page.locator('h2:has-text("Nueva Solicitud")')).toBeVisible();

    // Llenar datos
    await page.locator('label:has-text("Nombre Completo") + input').fill('Juan Beneficiario');
    await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descripcionSolicitud);

    // Guardar
    await page.click('button:has-text("Guardar Solicitud")');

    // Verificar que aparece en la tabla
    await expect(page.locator(`text=${descripcionSolicitud}`).first()).toBeVisible();
    
    // Cerrar sesión (buscamos en el Navbar)
    await page.click('button:has-text("Salir")');
  });

  test('Paso 2: DISTRIBUCIÓN - ROL DISTRIBUIDOR', async ({ page }) => {
    await page.goto('/');

    // Login
    await page.fill('input[type="email"]', 'distribuidor@sgp.com');
    await page.fill('input[type="password"]', 'SGP_StrongPass_2026!');
    await page.click('button:has-text("Ingresar")');
    await expect(page.locator('text=Panel SGP')).toBeVisible();

    // Ir a Mis Solicitudes
    await page.goto('/mis-solicitudes');

    // Encontrar la solicitud y hacer clic en Editar
    const fila = page.locator('tr').filter({ hasText: descripcionSolicitud }).first();
    await fila.locator('button[title="Ver / Editar Detalles"]').click();

    // Modal de edición
    await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeVisible();

    // Asignar Responsable
    await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Juan Perez' }); // o 'Juan Perez (Norte)' según cómo esté cargado

    // Guardar
    await page.click('button:has-text("Guardar Solicitud")');

    // Esperar a que se cierre el modal
    await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeHidden();

    // Cerrar sesión
    await page.click('button:has-text("Salir")');
  });

  test('Paso 3: PROPUESTA Y DERIVACIÓN - ROL RESPONSABLE', async ({ page }) => {
    await page.goto('/');

    // Login
    await page.fill('input[type="email"]', 'jperez@sgp.com');
    await page.fill('input[type="password"]', '1234.5');
    await page.click('button:has-text("Ingresar")');
    await expect(page.locator('text=Panel SGP')).toBeVisible();

    await page.goto('/mis-solicitudes');

    // Editar
    const fila = page.locator('tr').filter({ hasText: descripcionSolicitud }).first();
    await fila.locator('button[title="Ver / Editar Detalles"]').click();

    // Modal
    await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeVisible();

    // Click en "+ Agregar" asignación
    await page.click('button:has-text("Agregar")');

    // Seleccionar el tipo de resolución (esto asigna automáticamente al resolutor configurado)
    const selectArea = page.locator('select').filter({ has: page.locator('option:has-text("Seleccione Área...")') });
    await selectArea.selectOption({ label: 'AGENDA - Ana Resolutora' });

    // Guardar
    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeHidden();

    // Cerrar sesión
    await page.click('button:has-text("Salir")');
  });

  test('Paso 4: RESOLUCIÓN Y CIERRE FINAL - ROL RESOLUTOR', async ({ page }) => {
    await page.goto('/');

    // Login
    await page.fill('input[type="email"]', 'resolutor@sgp.com');
    await page.fill('input[type="password"]', 'SGP_StrongPass_2026!');
    await page.click('button:has-text("Ingresar")');
    await expect(page.locator('text=Panel SGP')).toBeVisible();

    await page.goto('/mis-solicitudes');

    // Editar
    const fila = page.locator('tr').filter({ hasText: descripcionSolicitud }).first();
    await fila.locator('button[title="Ver / Editar Detalles"]').click();

    // Marcar resuelto
    // Como resolutor, puede aparecer "Aprobar Resolución"
    await page.click('button:has-text("Aprobar Resolución")');

    // Escribir observación
    await page.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]').fill('Anteojos entregados satisfactoriamente.');

    // Confirmar y Finalizar
    await page.click('button:has-text("Confirmar y Finalizar")');

    // Validar que se cierra
    await expect(page.locator('h3:has-text("¿Aprobar Resolución?")')).toBeHidden();
  });

});
