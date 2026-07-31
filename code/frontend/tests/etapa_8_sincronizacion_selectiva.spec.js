import { test, expect } from '@playwright/test';

/**
 * Pruebas automatizadas de Playwright para la Sincronización Selectiva (Etapa 8).
 * Comentarios en español según la Regla Global 1.
 */
test.describe('Etapa 8 - Sincronización Selectiva por Checkbox', () => {
    const idUnico = Date.now().toString().slice(-6);
    const nombreA = `Selectiva Beneficiario A ${idUnico}`;
    const nombreB = `Selectiva Beneficiario B ${idUnico}`;
    const descA = `Pedido A de sincronización selectiva. ID: ${idUnico}`;
    const descB = `Pedido B de sincronización selectiva. ID: ${idUnico}`;

    // Helper para realizar login de forma robusta
    const login = async (page, email, pass) => {
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
        await passInput.fill(pass);
        
        await page.click('button:has-text("Ingresar")');
        await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|descargar-adjunto).*/, { timeout: 20000 });
        await page.waitForTimeout(1000);
    };

    test('Flujo Completo: Carga de 2 solicitudes por Operador -> Asignación por Distribuidor -> Derivación por Responsable -> Consideración y Sync Selectiva por Resolutor', async ({ page }) => {
        test.setTimeout(180000); // 3 minutos para el flujo completo

        // Interceptar y loguear todas las respuestas de API con error
        page.on('response', async response => {
            const url = response.url();
            if (url.includes('/api/')) {
                const status = response.status();
                if (status >= 400) {
                    try {
                        const body = await response.text();
                        console.error(`[API ERROR] ${response.request().method()} ${url} -> Status: ${status}. Response: ${body}`);
                    } catch (e) {
                        console.error(`[API ERROR] ${response.request().method()} ${url} -> Status: ${status} (No se pudo leer cuerpo)`);
                    }
                }
            }
        });
        // Interceptar y loguear todos los mensajes de consola del navegador
        page.on('console', msg => {
            console.log(`[BROWSER CONSOLE] ${msg.text()}`);
        });
        // ==========================================
        // 0. Administrador: Crear proyecto SUBSIDIO si no existe
        // ==========================================
        console.log('[SYNC SELECTIVA] 0. Inicializando proyecto SUBSIDIO como Administrador');
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        const subsidioCardSearch = page.locator('div.bg-gray-800', { has: page.locator('p:has-text("1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g")') });
        if (!(await subsidioCardSearch.first().isVisible())) {
            console.log('[SYNC SELECTIVA] No se detectó planilla SUBSIDIO. Creándola...');
            await page.click('button:has-text("Nueva Planilla")');
            await page.locator('label:has-text("Spreadsheet ID") + input').fill('1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g');
            await page.locator('label:has-text("Nombre de la Hoja") + input').fill('FRAN');
            await page.click('button:has-text("Guardar")');
            await page.waitForTimeout(1500);
        } else {
            // Si ya existe, asociar la planilla FRAN por si acaso
            console.log('[SYNC SELECTIVA] Planilla SUBSIDIO detectada. Verificando configuración...');
            await subsidioCardSearch.first().locator('a[title="Ver Datos"]').click();
            await page.waitForURL(/\/projects\/config\/\d+/);
            await page.locator('button[title*="Asociar planilla"]').click();
            await page.waitForSelector('h3:has-text("Asociar Planilla Externa")');
            await page.locator('input[placeholder*="Ej: 1jPw9ni4BW"]').fill('1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g');
            await page.locator('label:has-text("Nombre de la Hoja") + input').fill('FRAN');
            await page.locator('form button[type="submit"]:has-text("Asociar Planilla")').click();
            await expect(page.locator('text=Planilla asociada correctamente')).toBeVisible();
            await page.waitForTimeout(1000);
        }
        await page.click('button:has-text("Salir")');
        await page.waitForURL('**/login');

        // ==========================================
        // 1. Operador: Cargar dos solicitudes de Subsidio
        // ==========================================
        console.log('[SYNC SELECTIVA] 1. Iniciando sesión como Operador');
        await login(page, 'celestesolari19@gmail.com', 'Celeste_SGP_2026#');
        await page.goto('/mis-solicitudes');

        // Crear Solicitud A
        console.log('[SYNC SELECTIVA] Operador crea Solicitud A');
        await page.click('button:has-text("Nueva Solicitud")');
        await page.locator('label:has-text("Nombre Completo") + input').fill(nombreA);
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descA);
        await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
        await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');
        await page.locator('input[placeholder*="Ej: Santa Fe"]').fill('Santa Fe');
        await page.locator('input[placeholder*="Ej: Santa Fe"]').press('Tab');
        await page.locator('label:has-text("Tipo") + select').first().selectOption('SUBSIDIO');

        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=creada con éxito')).toBeVisible();
        await page.waitForTimeout(1000);

        // Crear Solicitud B
        console.log('[SYNC SELECTIVA] Operador crea Solicitud B');
        await page.click('button:has-text("Nueva Solicitud")');
        await page.locator('label:has-text("Nombre Completo") + input').fill(nombreB);
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descB);
        await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
        await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');
        await page.locator('input[placeholder*="Ej: Santa Fe"]').fill('Santa Fe');
        await page.locator('input[placeholder*="Ej: Santa Fe"]').press('Tab');
        await page.locator('label:has-text("Tipo") + select').first().selectOption('SUBSIDIO');

        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=creada con éxito')).toBeVisible();
        await page.waitForTimeout(1500);

        await page.click('button:has-text("Salir")');
        await page.waitForURL('**/login');

        // ==========================================
        // 2. Distribuidor: Asignar Responsable
        // ==========================================
        console.log('[SYNC SELECTIVA] 2. Iniciando sesión como Distribuidor');
        await login(page, 'matias.ippolito@gmail.com', 'Matias_Dist_SGP_2026!');
        await page.goto('/mis-solicitudes');

        // Asignar Solicitud A
        console.log('[SYNC SELECTIVA] Distribuidor asigna Solicitud A');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreA);
        await page.waitForTimeout(1000);
        await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
        await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
        await page.waitForTimeout(500);
        await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
        await page.click('button:has-text("Guardar Solicitud")');
        await page.waitForTimeout(1500);

        // Asignar Solicitud B
        console.log('[SYNC SELECTIVA] Distribuidor asigna Solicitud B');
        await page.click('input[placeholder*="Buscar por N° Orden"]');
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreB);
        await page.waitForTimeout(1000);
        await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
        await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
        await page.waitForTimeout(500);
        await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
        await page.click('button:has-text("Guardar Solicitud")');
        await page.waitForTimeout(1500);

        await page.click('button:has-text("Salir")');
        await page.waitForURL('**/login');

        // ==========================================
        // 3. Responsable: Agregar asignación de Subsidio (Martín Nocioni)
        // ==========================================
        console.log('[SYNC SELECTIVA] 3. Iniciando sesión como Responsable');
        await login(page, 'matias.ippolito.responsable@gmail.com', 'Matias_Resp_SGP_2026!');
        await page.goto('/mis-solicitudes');

        // Asignar Resolutor para Solicitud A
        console.log('[SYNC SELECTIVA] Responsable deriva Solicitud A');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreA);
        await page.waitForTimeout(1000);
        await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
        
        // Agregar la asignación de Subsidio y completar campos
        await page.click('button:has-text("Agregar")');
        await page.waitForTimeout(500);
        await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
        await page.waitForTimeout(500);
        
        await page.locator('label:has-text("Tipo de pedido") + select').selectOption('Personal');
        await page.locator('label:has-text("Nombre y apellido") + input').fill(nombreA);
        await page.locator('label:has-text("DNI") + input').nth(1).fill('20-11111111-9');
        await page.locator('label:has-text("Monto") + input').first().fill('100000');
        
        await page.click('button:has-text("Guardar Solicitud")');
        await page.waitForTimeout(1500);

        // Asignar Resolutor para Solicitud B
        console.log('[SYNC SELECTIVA] Responsable deriva Solicitud B');
        await page.click('input[placeholder*="Buscar por N° Orden"]');
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreB);
        await page.waitForTimeout(1000);
        await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
        
        // Agregar la asignación de Subsidio y completar campos
        await page.click('button:has-text("Agregar")');
        await page.waitForTimeout(500);
        await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
        await page.waitForTimeout(500);
        
        await page.locator('label:has-text("Tipo de pedido") + select').selectOption('Personal');
        await page.locator('label:has-text("Nombre y apellido") + input').fill(nombreB);
        await page.locator('label:has-text("DNI") + input').nth(1).fill('20-22222222-9');
        await page.locator('label:has-text("Monto") + input').first().fill('120000');
        
        await page.click('button:has-text("Guardar Solicitud")');
        await page.waitForTimeout(1500);

        await page.click('button:has-text("Salir")');
        await page.waitForURL('**/login');

        // ==========================================
        // 4. Resolutor: Poner en Consideración, Checkboxes y Sync Selectiva
        // ==========================================
        console.log('[SYNC SELECTIVA] 4. Iniciando sesión como Resolutor de Subsidio');
        await login(page, 'martinnocioni@gmail.com', 'Martin_SGP_2026*');
        
        // Asociar planilla real FRAN directamente en mis-solicitudes
        console.log('[SYNC SELECTIVA] Resolutor asocia planilla con pestaña FRAN');
        await page.goto('/mis-solicitudes');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const buttons = await page.locator('button').allInnerTexts();
        console.log('[BOTONES VISIBLES]:', buttons);
        
        await page.locator('button:has-text("Asociar Planilla")').click();
        await page.waitForSelector('h3:has-text("Asociar Planilla Externa")');
        const inputId = page.locator('input[placeholder*="Ej: 1jPw9ni4BW"]');
        await inputId.fill('1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g');
        await page.locator('label:has-text("Nombre de la Hoja") + input').fill('FRAN');
        await page.locator('form button[type="submit"]:has-text("Asociar Planilla")').click();
        await expect(page.locator('text=Planilla asociada correctamente')).toBeVisible();
        await page.waitForTimeout(1000);

        // Poner en consideración Solicitud A
        console.log('[SYNC SELECTIVA] Resolutor pone Solicitud A en consideración');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreA);
        await page.waitForTimeout(1000);
        page.once('dialog', dialog => dialog.accept());
        await page.locator('tbody tr').first().locator('button[title="Poner en Consideración"]').click();
        await expect(page.locator('text=puesta en consideración correctamente')).toBeVisible();
        await page.waitForTimeout(1500);

        // Poner en consideración Solicitud B
        console.log('[SYNC SELECTIVA] Resolutor pone Solicitud B en consideración');
        await page.click('input[placeholder*="Buscar por N° Orden"]');
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreB);
        await page.waitForTimeout(1000);
        page.once('dialog', dialog => dialog.accept());
        await page.locator('tbody tr').first().locator('button[title="Poner en Consideración"]').click();
        await expect(page.locator('text=puesta en consideración correctamente')).toBeVisible();
        await page.waitForTimeout(1500);

        // Buscar el identificador común para listar ambas solicitudes en la grilla
        console.log('[SYNC SELECTIVA] Resolutor busca ambas solicitudes por ID único');
        await page.click('input[placeholder*="Buscar por N° Orden"]');
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', idUnico);
        await page.waitForTimeout(1500);

        // Seleccionar los checkboxes de ambas solicitudes
        const filaA = page.locator('tr').filter({ hasText: nombreA }).first();
        await filaA.locator('input[type="checkbox"]').check();
        console.log('[SYNC SELECTIVA] Fila A seleccionada');

        const filaB = page.locator('tr').filter({ hasText: nombreB }).first();
        await filaB.locator('input[type="checkbox"]').check();
        console.log('[SYNC SELECTIVA] Fila B seleccionada');

        // Validar barra flotante de acciones por lote y "2 seleccionadas"
        await expect(page.locator('span:text-is("2 seleccionadas")')).toBeVisible();
        console.log('[SYNC SELECTIVA] Barra flotante con "2 seleccionadas" es visible');

        // VALIDACIÓN DE CORRECCIÓN: Combo "Asignar Responsable..." NO debe ser visible para el Resolutor
        const comboResponsable = page.locator('div.absolute.top-4 select:has-text("Asignar Responsable...")');
        await expect(comboResponsable).toBeHidden();
        console.log('[SYNC SELECTIVA] Verificación de barra flotante: Combo "Asignar Responsable" oculto para Resolutor (ÉXITO)');

        // Probar Exportación Selectiva
        console.log('[SYNC SELECTIVA] Resolutor hace clic en Exportar en la barra flotante');
        await page.click('div.absolute.top-4 button:text-is("Exportar")');
        await expect(page.locator('text=Sincronización de exportación finalizada')).toBeVisible();
        await page.waitForTimeout(2000);

        // Volver a seleccionar para probar Importación Selectiva
        console.log('[SYNC SELECTIVA] Volviendo a seleccionar filas para Importación');
        await filaA.locator('input[type="checkbox"]').check();
        await filaB.locator('input[type="checkbox"]').check();
        await expect(page.locator('span:text-is("2 seleccionadas")')).toBeVisible();

        console.log('[SYNC SELECTIVA] Resolutor hace clic en Importar en la barra flotante');
        await page.click('div.absolute.top-4 button:text-is("Importar")');
        await expect(page.locator('text=Sincronización de importación finalizada')).toBeVisible();
        await page.waitForTimeout(1500);

        console.log('[SYNC SELECTIVA] Flujo E2E de sincronización selectiva finalizado con éxito.');
    });
});
