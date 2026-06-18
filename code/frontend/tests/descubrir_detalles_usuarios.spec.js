import { test, expect } from '@playwright/test';

test('Descubrir checkboxes de usuarios en settings', async ({ page }) => {
  test.setTimeout(90000);
  
  await page.goto('https://solicitudes.ultrasoft.website/login');
  await page.locator('input[type="email"]').fill('admin@sgp.com');
  await page.locator('input[type="password"]').fill('SGP_Admin_#2026_Prod_Secure_!');
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL('**/dashboard');
  
  await page.goto('https://solicitudes.ultrasoft.website/settings');
  await page.waitForTimeout(2000);
  
  const emails = [
    'martinnocioni@gmail.com',
    'mvgonza79@gmail.com',
    'ealfaro.51@gmail.com'
  ];
  
  for (const email of emails) {
    console.log(`\n--- Detalles para ${email} ---`);
    const row = page.locator('tr').filter({ hasText: email }).first();
    await row.locator('button').first().click(); // Clic en Editar
    await expect(page.locator('h2:has-text("Editar Usuario")')).toBeVisible();
    
    // Obtener roles checked
    const roles = ['Operador', 'Distribuidor', 'Responsable', 'Resolutor'];
    for (const role of roles) {
      const isChecked = await page.locator(`label:has-text("${role}") input`).isChecked();
      console.log(`Rol ${role}: ${isChecked}`);
    }
    
    // Obtener resoluciones checkeadas
    const resTypes = ['AGENDA', 'SUBSIDIO', 'DECLARACION DE INTERES', 'OTRA'];
    for (const resType of resTypes) {
      const locator = page.locator(`label:has-text("${resType}") input`);
      if (await locator.count() > 0) {
        const isChecked = await locator.isChecked();
        console.log(`Resolución ${resType}: ${isChecked}`);
      } else {
        console.log(`Resolución ${resType}: No encontrada en el modal`);
      }
    }
    
    // Cerrar modal
    await page.click('button:has-text("Cancelar")');
    await page.waitForTimeout(1000);
  }
});
