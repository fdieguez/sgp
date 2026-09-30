import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'admin@sgp.com');
  await page.fill('input[type="password"]', 'SGP_Admin_#2026_Prod_Secure_!');
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|select-rol).*/);
  
  if (page.url().includes('/select-rol')) {
    await page.click('button:has-text("ADMINISTRADOR")');
    await page.waitForURL(/.*(dashboard|mis-solicitudes|settings).*/);
  }
  
  await page.goto('http://localhost:5173/mis-solicitudes');
  await page.click('button:has-text("Nueva Solicitud")');
  await page.waitForSelector('button:has-text("Guardar Solicitud")');
  
  const fields = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('label')).map(l => {
        let sibling = l.nextElementSibling;
        return l.textContent.trim() + " -> " + (sibling ? sibling.tagName : 'NONE');
    });
  });
  
  console.log("FIELDS FOUND:");
  console.log(fields.join('\n'));
  
  await browser.close();
})();
