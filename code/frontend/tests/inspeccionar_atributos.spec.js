import { test, expect } from '@playwright/test';

test('Listar atributos del catálogo en producción', async ({ page }) => {
  test.setTimeout(60000);
  
  await page.goto('https://solicitudes.ultrasoft.website/login');
  await page.locator('input[type="email"]').fill('admin@sgp.com');
  await page.locator('input[type="password"]').fill('SGP_Admin_#2026_Prod_Secure_!');
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL('**/dashboard');
  
  await page.goto('https://solicitudes.ultrasoft.website/settings');
  await page.waitForTimeout(2000);
  
  await page.click('button:has-text("Catálogo de Atributos")');
  await page.waitForTimeout(2000);
  
  console.log('--- CATÁLOGO DE ATRIBUTOS ---');
  const attrRows = await page.locator('tbody tr').all();
  for (const row of attrRows) {
    const text = await row.innerText();
    console.log('Atributo:', text.replace(/\n/g, ' | '));
  }
});
