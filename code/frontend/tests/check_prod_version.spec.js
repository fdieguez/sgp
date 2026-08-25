import { test, expect } from '@playwright/test';

const BASE_URL = 'https://solicitudes.ultrasoft.website';
const CREDENTIALS = {
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' }
};

test('Diagnosticar versión de Roles en producción', async ({ page }) => {
  test.setTimeout(60000); // 1 minuto

  console.log('🔄 Iniciando sesión como Administrador en producción...');
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email-address', CREDENTIALS.ADMIN.email);
  await page.fill('#password', CREDENTIALS.ADMIN.pass);
  await page.click('button[type="submit"]');

  console.log('⏳ Esperando redirección al Dashboard...');
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  console.log('🔄 Navegando a la página de Ajustes (Gestión de Usuarios)...');
  await page.goto(`${BASE_URL}/settings`);
  await page.waitForTimeout(3000);

  console.log('🔄 Haciendo clic en "Nuevo Usuario"...');
  await page.click('button:has-text("Nuevo Usuario")');
  await page.waitForTimeout(3000);

  // Obtener el HTML del modal para inspeccionar el DOM exacto
  console.log('🔍 Inspeccionando el HTML del modal de usuario...');
  const modal = page.locator('div:has(h2:has-text("Nuevo Usuario"))').last();
  const modalHtml = await modal.innerHTML();
  console.log('--- CONTENIDO DEL MODAL ---');
  console.log(modalHtml);
  console.log('---------------------------');
});
