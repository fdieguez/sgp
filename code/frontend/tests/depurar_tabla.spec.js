import { test } from '@playwright/test';

test('Depurar panel del Admin', async ({ page }) => {
  const email = 'admin@sgp.com';
  const pass = 'SGP_Admin_#2026_Prod_Secure_!';
  
  await page.goto('https://solicitudes.ultrasoft.website/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(pass);
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL(/.*(dashboard|mis-solicitudes).*/, { timeout: 30000 });
  await page.waitForTimeout(3000);

  // Tomar una captura de pantalla del panel
  await page.screenshot({ path: 'tests/assets/admin_panel.png' });
  console.log('Captura de pantalla de Admin guardada.');
});
