import { test, expect } from '@playwright/test';

/**
 * Suite de Validación E2E en Producción: Ciclo de Vida Completo de una Solicitud
 * Valida el flujo íntegro desde la carga de una solicitud por un Operador,
 * distribución por Distribuidor, asignación por Responsable, y aprobación final por Resolutor.
 */
test.describe('Validación E2E SGP en Producción', () => {
  const idUnico = Date.now().toString().slice(-5);
  
  const solicitanteName = `Solicitante Prod E2E ${idUnico}`;
  const solicitudDesc = `Descripción E2E Prod ${idUnico}`;

  test('Flujo Completo E2E: Operador -> Distribuidor -> Responsable -> Resolutor', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos máximo para toda la secuencia en producción

    const robustLogin = async (email, password) => {
      await page.goto('/login');
      const emailInput = page.locator('input[type="email"]');
      const passInput = page.locator('input[type="password"]');
      
      await emailInput.click({ clickCount: 3 });
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await emailInput.fill(email);

      await passInput.click({ clickCount: 3 });
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await passInput.fill(password);

      await page.click('button:has-text("Ingresar")');
      await page.waitForURL(/.*(dashboard|mis-solicitudes).*/, { timeout: 20000 });
    };

    // --- PASO 1: CREACIÓN (OPERADOR) ---
    console.log(`[E2E-PROD] Iniciando login como Operador (operador@sgp.com)...`);
    await robustLogin('operador@sgp.com', 'SGP_StrongPass_2026!');
    console.log(`[E2E-PROD] Creando nueva solicitud con Solicitante: "${solicitanteName}"...`);
    
    await page.click('button:has-text("Nueva Solicitud")');
    await expect(page.locator('h2:has-text("Nueva Solicitud")')).toBeVisible();

    // Completar solicitante
    await page.locator('label:has-text("Nombre Completo") + input').fill(solicitanteName);
    await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(solicitudDesc);
    
    // Tipo de solicitante
    await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
    await expect(page.locator('label:text-is("Subtipo")')).toBeVisible();
    await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');

    // Guardar y capturar el ID de la solicitud mediante el Toast
    await page.click('button:has-text("Guardar Solicitud")');
    console.log(`[E2E-PROD] Esperando notificación Toast de éxito...`);
    const toastLocator = page.locator('text=creada con éxito');
    await expect(toastLocator).toBeVisible({ timeout: 15000 });
    const toastText = await toastLocator.innerText();
    console.log(`[E2E-PROD] Toast recibido: "${toastText}"`);
    
    const idMatch = toastText.match(/Solicitud #(\d+) creada con éxito/);
    if (!idMatch) {
      throw new Error(`No se pudo extraer el ID de la solicitud del texto del Toast: "${toastText}"`);
    }
    const solicitudId = idMatch[1];
    console.log(`[E2E-PROD] ¡Solicitud creada con éxito en Producción! ID detectado: #${solicitudId}`);

    // Cerrar sesión
    await page.click('button:has-text("Salir")');
    await page.waitForURL('**/login');

    // --- PASO 2: DISTRIBUCIÓN (DISTRIBUIDOR) ---
    console.log(`[E2E-PROD] Iniciando login como Distribuidor (distribuidor@sgp.com)...`);
    await robustLogin('distribuidor@sgp.com', 'SGP_StrongPass_2026!');

    // Buscar la solicitud por su número de orden / ID
    console.log(`[E2E-PROD] Buscando solicitud #${solicitudId} en la grilla...`);
    const searchInputDist = page.locator('input[placeholder*="Buscar"]');
    await searchInputDist.fill(solicitudId);
    await page.waitForTimeout(1500);

    const filaDist = page.locator('tr').filter({ hasText: solicitanteName }).first();
    await expect(filaDist).toBeVisible({ timeout: 10000 });
    await filaDist.locator('button[title="Ver / Editar Detalles"]').click();

    // Asignar Responsable "Pepe Grillo"
    console.log(`[E2E-PROD] Asignando responsable Pepe Grillo...`);
    await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Pepe Grillo' });
    
    // Guardar
    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeHidden({ timeout: 10000 });

    // Cerrar sesión
    await page.click('button:has-text("Salir")');
    await page.waitForURL('**/login');

    // --- PASO 3: PROPUESTA Y DERIVACIÓN (RESPONSABLE) ---
    console.log(`[E2E-PROD] Iniciando login como Responsable (pgrillo@sgp.com)...`);
    await robustLogin('pgrillo@sgp.com', '1234.5');

    // Buscar la solicitud
    console.log(`[E2E-PROD] Buscando solicitud #${solicitudId}...`);
    const searchInputResp = page.locator('input[placeholder*="Buscar"]');
    await searchInputResp.fill(solicitudId);
    await page.waitForTimeout(1500);

    const filaResp = page.locator('tr').filter({ hasText: solicitanteName }).first();
    await expect(filaResp).toBeVisible({ timeout: 10000 });
    await filaResp.locator('button[title="Ver / Editar Detalles"]').click();

    // Agregar asignación de Resolutor
    console.log(`[E2E-PROD] Añadiendo asignación de tipo de resolución OTRA...`);
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(500);

    const selectResolucion = page.locator('div.p-4.bg-indigo-900\\/10 select').last();
    await selectResolucion.selectOption('OTRA');

    // Rellenar campos dinámicos de OTRA
    console.log(`[E2E-PROD] Completando campos dinámicos de OTRA...`);
    await page.locator('label:has-text("corta") + input').fill(`E2E Prod - Desc Corta ${idUnico}`);
    await page.locator('label:has-text("Detalle de") + textarea').fill(`Detalles dinámicos en producción para solicitud #${solicitudId}.`);

    // Guardar
    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeHidden({ timeout: 10000 });

    // Cerrar sesión
    await page.click('button:has-text("Salir")');
    await page.waitForURL('**/login');

    // --- PASO 4: RESOLUCIÓN Y APROBACIÓN (RESOLUTOR) ---
    console.log(`[E2E-PROD] Iniciando login como Resolutor (resolutor@sgp.com)...`);
    await robustLogin('resolutor@sgp.com', 'SGP_StrongPass_2026!');

    // Buscar la solicitud
    console.log(`[E2E-PROD] Buscando solicitud #${solicitudId} en grilla de Resolutor...`);
    const searchInputResol = page.locator('input[placeholder*="Buscar"]');
    await searchInputResol.fill(solicitudId);
    await page.waitForTimeout(1500);

    const filaResol = page.locator('tr').filter({ hasText: solicitanteName }).first();
    await expect(filaResol).toBeVisible({ timeout: 10000 });
    await filaResol.locator('button[title="Ver / Editar Detalles"]').click();

    // Aprobar asignación
    console.log(`[E2E-PROD] Resolutor aprobando la resolución de la solicitud...`);
    await page.click('button:has-text("Aprobar")');
    await page.locator('textarea[placeholder*="detalles"]').fill(`Resolución aprobada de forma automatizada por script E2E en Prod. ID de control: ${idUnico}`);
    await page.click('button:has-text("Confirmar")');

    // Verificar estado final
    console.log(`[E2E-PROD] Validando estado final de la solicitud...`);
    await page.waitForTimeout(2000);
    await page.reload();
    
    const searchInputFinal = page.locator('input[placeholder*="Buscar"]');
    await searchInputFinal.fill(solicitudId);
    await page.waitForTimeout(1500);

    // Debe mostrarse en el estado traducido "Resueltas" en la grilla del frontend
    const filaFinal = page.locator('tr').filter({ hasText: solicitanteName }).first();
    await expect(filaFinal.locator('text=Resueltas')).toBeVisible({ timeout: 15000 });
    
    console.log(`[E2E-PROD] ¡Flujo E2E completado con éxito en Producción para la Solicitud #${solicitudId}!`);
  });
});
