import { test, expect } from '@playwright/test';

test('Configurar OTRA_TEST con tres atributos dinámicos', async ({ page }) => {
  test.setTimeout(90000);
  
  page.on('dialog', async dialog => {
    console.log(`[DIÁLOGO]: ${dialog.message()}`);
    await dialog.dismiss();
  });

  await page.goto('https://solicitudes.ultrasoft.website/login');
  await page.locator('input[type="email"]').fill('admin@sgp.com');
  await page.locator('input[type="password"]').fill('SGP_Admin_#2026_Prod_Secure_!');
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL('**/dashboard');
  
  await page.goto('https://solicitudes.ultrasoft.website/settings');
  await page.waitForTimeout(2000);
  
  await page.click('button:has-text("Tipos de Resolución")');
  await page.waitForTimeout(2500);
  
  // Buscar la fila de OTRA_TEST
  const row = page.locator('tbody tr').filter({ hasText: 'OTRA_TEST' });
  await expect(row).toBeVisible();
  
  // Hacer clic en el botón de lápiz (editar) en esa fila
  await row.locator('.text-blue-400').click();
  await expect(page.locator('h3:has-text("Editar Formulario Dinámico")')).toBeVisible();
  
  // Agregar dos campos más (ya hay uno configurado)
  const additionalAttrs = ['Detalle de resolución', 'Adjuntos adicionales'];
  
  for (let i = 0; i < additionalAttrs.length; i++) {
    const attrName = additionalAttrs[i];
    await page.locator('button:has-text("Agregar")').click();
    await page.waitForTimeout(500);
    
    // El select correspondiente estará en la posición i + 2 (1 de resolutor, 1 de descripción corta, y luego las nuevas)
    const selectIndex = i + 2;
    const selectLocator = page.locator('select').nth(selectIndex);
    
    const optionValue = await selectLocator.locator('option').filter({ hasText: attrName }).first().getAttribute('value');
    if (optionValue) {
      await selectLocator.selectOption(optionValue);
      console.log(`Agregado y seleccionado en edición: ${attrName} (value: ${optionValue})`);
    } else {
      throw new Error(`No se encontró el atributo "${attrName}" en el dropdown.`);
    }
    
    // Orden (input number i + 1, ya que el primero es índice 0)
    await page.locator('input[type="number"]').nth(i + 1).fill((i + 2).toString());
  }
  
  // Guardar cambios
  await page.click('button:has-text("Guardar Cambios")');
  await page.waitForTimeout(4000);
  
  console.log('OTRA_TEST configurada exitosamente con los 3 atributos dinámicos.');
});
