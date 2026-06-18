import { test, expect } from '@playwright/test';

test('Probar creación de OTRA_TEST', async ({ page }) => {
  test.setTimeout(60000);
  
  page.on('dialog', async dialog => {
    console.log(`[DIÁLOGO]: ${dialog.message()}`);
    await dialog.dismiss();
  });

  page.on('response', async response => {
    if (response.url().includes('/api/tipos-resolucion')) {
      console.log(`[HTTP RESP] URL: ${response.url()}, STATUS: ${response.status()}`);
      try {
        const text = await response.text();
        console.log(`[HTTP RESP BODY]: ${text}`);
      } catch (e) {
        console.log('[HTTP RESP BODY]: (no se pudo leer el cuerpo)');
      }
    }
  });

  await page.goto('https://solicitudes.ultrasoft.website/login');
  await page.locator('input[type="email"]').fill('admin@sgp.com');
  await page.locator('input[type="password"]').fill('SGP_Admin_#2026_Prod_Secure_!');
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL('**/dashboard');
  
  await page.goto('https://solicitudes.ultrasoft.website/settings');
  await page.waitForTimeout(2000);
  
  await page.click('button:has-text("Tipos de Resolución")');
  await page.waitForTimeout(2000);
  
  await page.click('button:has-text("Nuevo Tipo")');
  await expect(page.locator('h3:has-text("Nuevo Formulario Dinámico")')).toBeVisible();
  
  await page.locator('input[placeholder="Ej: ASESORAMIENTO"]').fill('OTRA_TEST');
  await page.locator('select').first().selectOption('');
  
  await page.locator('button:has-text("Agregar")').click();
  await page.waitForTimeout(500);
  
  const selectLocator = page.locator('select').nth(1);
  const optionValue = await selectLocator.locator('option').filter({ hasText: 'Descripción corta' }).first().getAttribute('value');
  await selectLocator.selectOption(optionValue);
  await page.locator('input[type="number"]').nth(0).fill('1');
  
  await page.click('button:has-text("Guardar Cambios")');
  await page.waitForTimeout(4000);
});
