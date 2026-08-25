import { test, expect } from '@playwright/test';

const BASE_URL = 'https://solicitudes.ultrasoft.website';
const CREDENTIALS = {
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' }
};

test('Sembrar casos testigo en producción como Admin', async ({ page }) => {
  test.setTimeout(90000); // 1.5 minutos

  console.log('🔄 Iniciando sesión como Administrador en producción...');
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email-address', CREDENTIALS.ADMIN.email);
  await page.fill('#password', CREDENTIALS.ADMIN.pass);
  await page.click('button[type="submit"]');
  
  // Esperar la redirección post-login de forma obligatoria
  console.log('⏳ Esperando redirección al Dashboard...');
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Ahora sí, forzar navegación al listado
  await page.goto(`${BASE_URL}/mis-solicitudes`);
  await page.waitForTimeout(2000);

  // Caso Testigo 1: Subsidio
  console.log('✍️ Creando Caso Testigo 1 (Subsidio)...');
  await page.click('button:has-text("Nueva Solicitud")');
  await page.locator('label:text-is("Nombre Completo / Institución") + input').fill('MANUAL QA SUBSIDIO TESTIGO');
  await page.locator('label:text-is("Teléfono") + input').fill('3424000111');
  await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
  await page.locator('label:text-is("Barrio") + input').fill('Centro');
  await page.locator('label:text-is("Descripción / Pedido") + textarea').fill('Caso testigo representativo listo para ruteo e importación (Subsidio).');
  await page.locator('label:text-is("Tipo") + select').selectOption('SUBSIDIO');
  await page.locator('label:has-text("Monto") + input').first().fill('750000');
  await page.click('button:has-text("Guardar Solicitud")');
  
  const toast1 = page.locator('div[role="status"]');
  await expect(toast1).toContainText('creada con éxito', { timeout: 15000 });
  console.log('✅ Caso Testigo 1 (Subsidio) creado exitosamente.');
  await page.waitForTimeout(2000);

  // Caso Testigo 2: Agenda
  console.log('✍️ Creando Caso Testigo 2 (Agenda)...');
  await page.click('button:has-text("Nueva Solicitud")');
  await page.locator('label:text-is("Nombre Completo / Institución") + input').fill('MANUAL QA AGENDA TESTIGO');
  await page.locator('label:text-is("Teléfono") + input').fill('3424000222');
  await page.locator('label:text-is("Localidad") + input').fill('Santa Fe');
  await page.locator('label:text-is("Barrio") + input').fill('Sur');
  await page.locator('label:text-is("Descripción / Pedido") + textarea').fill('Caso testigo representativo listo para agendamiento (Agenda).');
  await page.locator('label:text-is("Tipo") + select').selectOption('AGENDA');
  await page.click('button:has-text("Guardar Solicitud")');
  
  const toast2 = page.locator('div[role="status"]');
  await expect(toast2).toContainText('creada con éxito', { timeout: 15000 });
  console.log('✅ Caso Testigo 2 (Agenda) creado exitosamente.');
});
