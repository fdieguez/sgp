import { test, expect } from '@playwright/test';

test.describe('Etapa 8 - Asociación de Planilla por Administrador y Resolutor', () => {

    // Helper para realizar login de forma robusta sin esperar una URL específica
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
        // Esperamos a que el selector del menú o navbar sea visible, indicando que el login se completó
        await page.waitForSelector('nav');
    };

    test('Flujo E2E de Asociación de Planilla con controles de rol', async ({ page }) => {
        // 1. Iniciar sesión como Administrador (admin@sgp.com)
        console.log('[ASOCIAR PLANILLA] Iniciando sesión como Administrador');
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');

        // Ir al dashboard y crear la planilla SUBSIDIO si no existe
        await page.goto('/dashboard');
        
        const subsidioCardSearch = page.locator('div.bg-gray-800', { has: page.locator('p:has-text("1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g")') });
        if (!(await subsidioCardSearch.first().isVisible())) {
            console.log('[ASOCIAR PLANILLA] No se detectó planilla SUBSIDIO. Creándola...');
            await page.click('button:has-text("Nueva Planilla")');
            await page.locator('label:has-text("Spreadsheet ID") + input').fill('1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g');
            await page.locator('label:has-text("Nombre de la Hoja") + input').fill('SUBSIDIO');
            await page.click('button:has-text("Guardar")');
            await page.waitForTimeout(1500); // esperar a que se persista
        }

        // Ubicar la tarjeta que contiene el spreadsheetId de prueba y hacer clic en su enlace "Ver Datos"
        const subsidioCard = page.locator('div.bg-gray-800', { has: page.locator('p:has-text("1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g")') }).first();
        const viewLink = subsidioCard.locator('a[title="Ver Datos"]');
        await viewLink.click();
        
        // Validar que navegó a la vista del proyecto y extraer la URL
        await page.waitForURL(/\/projects\/config\/\d+/);
        const projectUrl = page.url();
        console.log(`[ASOCIAR PLANILLA] Navegación exitosa al detalle de proyecto SUBSIDIO: ${projectUrl}`);

        // El botón "Asociar Planilla" (el de abrir el modal) debe estar visible
        const asociarBtn = page.locator('button[title*="Asociar planilla"]');
        await expect(asociarBtn).toBeVisible();
        console.log('[ASOCIAR PLANILLA] Botón "Asociar Planilla" visible para Administrador');

        // Hacer clic en el botón para abrir el modal
        await asociarBtn.click();

        // Validar que el modal está abierto y autenfoca el input
        const modalHeader = page.locator('h3:has-text("Asociar Planilla Externa")');
        await expect(modalHeader).toBeVisible();
        
        const inputId = page.locator('input[placeholder*="Ej: 1jPw9ni4BW"]');
        await expect(inputId).toBeFocused();
        await inputId.fill('1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g');

        // Completar también el nombre de la hoja en el modal
        await page.locator('label:has-text("Nombre de la Hoja") + input').fill('SUBSIDIO');

        // Asociar la planilla (botón de submit del modal)
        const submitBtn = page.locator('form button[type="submit"]:has-text("Asociar Planilla")');
        await submitBtn.click();

        // Validar toast de éxito
        await expect(page.locator('text=Planilla asociada correctamente')).toBeVisible();
        console.log('[ASOCIAR PLANILLA] Planilla asociada con éxito por el Administrador');

        // Cerrar sesión
        await page.locator('button:has-text("Salir")').click();
        await page.waitForURL(/\/login/);

        // 2. Iniciar sesión como Resolutor de Subsidio (Martín Nocioni)
        console.log('[ASOCIAR PLANILLA] Iniciando sesión como Resolutor de Subsidio');
        await login(page, 'martinnocioni@gmail.com', 'Martin_SGP_2026*');

        // Ir directamente a la URL del proyecto Subsidio obtenida dinámicamente
        await page.goto(projectUrl);
        await page.waitForLoadState('networkidle');

        // El botón debe estar visible para él también
        const asociarBtnMartin = page.locator('button[title*="Asociar planilla"]');
        await expect(asociarBtnMartin).toBeVisible();
        console.log('[ASOCIAR PLANILLA] Botón "Asociar Planilla" visible para el Resolutor de Subsidio');

        // Cerrar sesión
        await page.locator('button:has-text("Salir")').click();
        await page.waitForURL(/\/login/);

        // 3. Iniciar sesión como Resolutor de Agenda (María Gonzalez)
        console.log('[ASOCIAR PLANILLA] Iniciando sesión como Resolutor de Agenda');
        await login(page, 'mvgonza79@gmail.com', 'Maria_SGP_2026%');

        // Ir directamente a la URL del proyecto Subsidio
        await page.goto(projectUrl);
        await page.waitForLoadState('networkidle');

        // El botón "Asociar Planilla" NO debe estar visible para ella
        const asociarBtnMaria = page.locator('button[title*="Asociar planilla"]');
        await expect(asociarBtnMaria).not.toBeVisible();
        console.log('[ASOCIAR PLANILLA] Botón "Asociar Planilla" NO visible para Resolutor de Agenda (Correcto)');
    });
});
