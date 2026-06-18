import { test, expect } from '@playwright/test';

test('Decodificar token de admin', async ({ page }) => {
  await page.goto('https://solicitudes.ultrasoft.website/login');
  await page.locator('input[type="email"]').fill('admin@sgp.com');
  await page.locator('input[type="password"]').fill('SGP_Admin_#2026_Prod_Secure_!');
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL('**/dashboard');
  
  const token = await page.evaluate(() => localStorage.getItem('token'));
  console.log(`[TOKEN]: ${token}`);
  
  if (token) {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
    console.log('[JWT PAYLOAD]:', JSON.stringify(payload, null, 2));
  } else {
    console.log('[JWT]: No se encontró token en localStorage');
  }
});
