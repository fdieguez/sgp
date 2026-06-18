import { test, expect } from '@playwright/test';

test('Descubrir usuarios y resolutores en producción', async ({ page }) => {
  test.setTimeout(60000);
  
  // Login como Admin
  await page.goto('https://solicitudes.ultrasoft.website/login');
  await page.locator('input[type="email"]').fill('admin@sgp.com');
  await page.locator('input[type="password"]').fill('SGP_Admin_#2026_Prod_Secure_!');
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL('**/dashboard');
  
  // Ir a configuración de usuarios
  await page.goto('https://solicitudes.ultrasoft.website/settings');
  await page.waitForTimeout(2000);
  
  console.log('--- LISTA DE USUARIOS ---');
  const userRows = await page.locator('tbody tr').all();
  for (const row of userRows) {
    const text = await row.innerText();
    console.log('Usuario:', text.replace(/\n/g, ' | '));
  }
  
  // Ir a Tipos de Resolución en settings
  await page.click('button:has-text("Tipos de Resolución")');
  await page.waitForTimeout(2000);
  
  console.log('--- TIPOS DE RESOLUCIÓN ---');
  const typeRows = await page.locator('tbody tr').all();
  for (const row of typeRows) {
    const text = await row.innerText();
    console.log('Tipo:', text.replace(/\n/g, ' | '));
  }
});
