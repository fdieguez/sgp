import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Suite de Validación: Unificación de Vistas (Etapa 05)', () => {
  const idUnico = Date.now().toString().slice(-8);
  const descripcionTest = `Solicitud Test Unificacion ${idUnico}`;

  test.beforeAll(async () => {
    const dummyPath = path.join(process.cwd(), 'tests', 'test-file.txt');
    if (!fs.existsSync(dummyPath)) {
        fs.writeFileSync(dummyPath, 'Contenido de prueba para adjuntos SGP');
    }
  });

  test('Flujo Completo de Unificación de Vistas', async ({ page }) => {
    test.setTimeout(60000);
    // 1. LOGIN
    await page.goto('/login');
    // Limpiar campos explícitamente por si hay autocompletado
    const emailInput = page.locator('input[type="email"]');
    const passInput = page.locator('input[type="password"]');
    
    await emailInput.click({ clickCount: 3 });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await emailInput.fill('admin@sgp.com');

    await passInput.click({ clickCount: 3 });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await passInput.fill('SGP_Admin_#2026_Prod_Secure_!');

    await page.click('button:has-text("Ingresar")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.locator('text=Panel SGP')).toBeVisible();

    // 2. DASHBOARD - Verificar eliminación de métricas económicas
    await expect(page.locator('text=Total Solicitudes')).toBeVisible();
    await expect(page.locator('text=Subsidios Entregados')).toBeHidden();
    
    // 3. MIS SOLICITUDES - Verificar layout
    await page.goto('/mis-solicitudes');
    await expect(page.locator('button:has-text("Subsidios Entregados")')).toBeHidden();
    await expect(page.locator('text=Monto Total Subsidios')).toBeHidden();

    // 4. NUEVA SOLICITUD - Verificar modal unificado
    await page.click('button:has-text("Nueva Solicitud")');
    await expect(page.locator('h2:has-text("Nueva Solicitud")')).toBeVisible();
    
    // Probar campos dinámicos (Tipo -> Monto)
    await page.locator('label:text-is("Tipo") + select').selectOption('SUBSIDIO');
    await expect(page.locator('label:has-text("Monto")')).toBeVisible();
    await page.locator('label:text-is("Tipo") + select').selectOption('PEDIDO');
    await expect(page.locator('label:has-text("Monto")')).toBeHidden();

    // Pestañas deben estar ocultas en nueva solicitud
    await expect(page.locator('button:has-text("Notas Seguimiento")')).toBeHidden();
    
    // Crear solicitud
    await page.locator('label:has-text("Nombre Completo") + input').fill('Beneficiario Test Unificado');
    await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descripcionTest);
    await page.click('button:has-text("Guardar Solicitud")');
    
    // Esperar y buscar en la tabla
    await page.fill('input[placeholder*="Buscar por N° Orden"]', idUnico);
    await expect(page.locator('tbody tr')).not.toHaveCount(0);
    const fila = page.locator('tbody tr').first();
    await expect(fila).toContainText(descripcionTest);

    // 5. EDITAR / VER - Probar pestañas y funcionalidad
    await fila.locator('button[title="Ver / Editar Detalles"]').click();
    await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeVisible();
    
    // Probar pestañas
    // Notas Seguimiento
    await page.click('button:has-text("Notas Seguimiento")');
    await page.locator('input[placeholder="Escribir una actualización o comentario..."]').fill('Comentario de prueba unificado');
    await page.click('form:has(input[placeholder="Escribir una actualización o comentario..."]) button');
    await expect(page.locator('text=Comentario de prueba unificado')).toBeVisible();

    // Historial
    await page.click('button:has-text("Historial")');
    await expect(page.locator('text=Cargado/Creado')).toBeVisible();

    // Adjuntos
    await page.click('button:has-text("Adjuntos")');
    await expect(page.locator('text=haz clic para seleccionar')).toBeVisible();
    await page.setInputFiles('input[type="file"]', path.join(process.cwd(), 'tests', 'test-file.txt'));
    await expect(page.locator('text=test-file.txt')).toBeVisible({ timeout: 10000 });

    // 6. PERSISTENCIA Y CAMPOS DINÁMICOS
    await page.click('button:has-text("Formulario / Detalles")');
    
    // Cambiar estado
    const statusSelect = page.locator('label:has-text("Estado") + select');
    await statusSelect.selectOption({ label: 'En Proceso' });
    await page.waitForTimeout(1000); // Dar tiempo a React para actualizar el estado del formulario
    
    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.locator('text=Solicitud actualizada')).toBeVisible();
    await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeHidden();

    // Recargar para asegurar que traiga el estado actualizado del servidor
    await page.reload();
    await page.fill('input[placeholder*="Buscar por N° Orden"]', idUnico);
    
    // Validar en tabla - Usamos un selector fresco que busque por el ID único
    const filaFinal = page.locator('tr').filter({ hasText: idUnico });
    await expect(filaFinal.locator('text=En Proceso')).toBeVisible({ timeout: 15000 });
  });

});
