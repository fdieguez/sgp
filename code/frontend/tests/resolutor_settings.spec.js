import { test, expect } from '@playwright/test';

test.describe('Etapa 8 - Menú de Configuración de Resolutores', () => {
    
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
        await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|resolutor-settings).*/, { timeout: 15000 });
        await page.waitForTimeout(1000);
    };

    test('Caso 1: Resolutor de Agenda configura su Google Calendar ID', async ({ page }) => {
        test.setTimeout(60000);

        // 1. Iniciar sesión como Resolutor de Agenda
        console.log('[TEST AGENDA] Iniciando sesión como Resolutor de Agenda');
        await login(page, 'mvgonza79@gmail.com', 'Maria_SGP_2026%');

        // 2. Hacer clic en el botón de Configuración en el Navbar
        console.log('[TEST AGENDA] Navegando a Mis Ajustes');
        const settingsBtn = page.locator('nav button:has-text("Configuración")');
        await expect(settingsBtn).toBeVisible();
        await settingsBtn.click();
        
        await page.waitForURL('**/resolutor-settings');
        await expect(page.locator('h1:has-text("Mis Ajustes de Resolutor")')).toBeVisible();

        // 3. Comprobar que ve la sección de Agenda pero NO la de Subsidio
        await expect(page.locator('h2:has-text("Configuración de Google Calendar")')).toBeVisible();
        await expect(page.locator('h2:has-text("Asociación de Planilla")')).not.toBeVisible();

        // 4. Cambiar el Google Calendar ID y guardar
        const calendarInput = page.locator('label:has-text("Google Calendar ID") + input');
        await calendarInput.click({ clickCount: 3 });
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        
        const testCalendarId = `agenda-test-${Date.now()}@group.calendar.google.com`;
        await calendarInput.fill(testCalendarId);
        
        await page.click('button:has-text("Guardar Agenda")');
        await expect(page.locator('text=guardada correctamente')).toBeVisible();

        // 5. Recargar y verificar la persistencia
        await page.reload();
        await page.waitForTimeout(1000);
        await expect(calendarInput).toHaveValue(testCalendarId);
        console.log('[TEST AGENDA] Persistencia de Google Calendar ID validada correctamente.');
    });

    test('Caso 2: Resolutor de Subsidio configura su Spreadsheet ID y Hoja', async ({ page }) => {
        test.setTimeout(60000);

        // 1. Iniciar sesión como Resolutor de Subsidio
        console.log('[TEST SUBSIDIO] Iniciando sesión como Resolutor de Subsidio');
        await login(page, 'martinnocioni@gmail.com', 'Martin_SGP_2026*');

        // 2. Hacer clic en el botón de Configuración en el Navbar
        console.log('[TEST SUBSIDIO] Navegando a Mis Ajustes');
        const settingsBtn = page.locator('nav button:has-text("Configuración")');
        await expect(settingsBtn).toBeVisible();
        await settingsBtn.click();
        
        await page.waitForURL('**/resolutor-settings');
        await expect(page.locator('h1:has-text("Mis Ajustes de Resolutor")')).toBeVisible();

        // 3. Comprobar que ve la sección de Subsidio pero NO la de Agenda
        await expect(page.locator('h2:has-text("Asociación de Planilla")')).toBeVisible();
        await expect(page.locator('h2:has-text("Configuración de Google Calendar")')).not.toBeVisible();

        // 4. Cambiar Spreadsheet ID y Nombre de la Hoja
        const spreadsheetInput = page.locator('label:has-text("Spreadsheet ID") + input');
        const sheetNameInput = page.locator('label:has-text("Nombre de la Hoja") + input');

        await spreadsheetInput.click({ clickCount: 3 });
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        const testSpreadsheetId = `sheet-test-${Date.now()}`;
        await spreadsheetInput.fill(testSpreadsheetId);

        await sheetNameInput.click({ clickCount: 3 });
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        const testSheetName = `Hoja Test ${Date.now()}`;
        await sheetNameInput.fill(testSheetName);

        await page.click('button:has-text("Asociar Planilla")');
        await expect(page.locator('text=guardada correctamente')).toBeVisible();

        // 5. Recargar y verificar persistencia
        await page.reload();
        await page.waitForTimeout(1000);
        await expect(spreadsheetInput).toHaveValue(testSpreadsheetId);
        await expect(sheetNameInput).toHaveValue(testSheetName);
        console.log('[TEST SUBSIDIO] Persistencia de asociación de planilla validada correctamente.');
    });

    test('Caso 3: Usuario sin especificidad no ve secciones de configuración', async ({ page }) => {
        test.setTimeout(45000);

        // Iniciar sesión como Lector (Lector no es Resolutor, no debería ver el menú en navbar)
        console.log('[TEST SEGUIDAD] Iniciando sesión como Lector');
        await login(page, 'auditor.sheets@gmail.com', 'Lector_SGP_2026#');

        // No debe estar visible el botón Configuración
        const settingsBtn = page.locator('nav button:has-text("Configuración")');
        await expect(settingsBtn).not.toBeVisible();

        // Si intenta navegar directamente a la URL, debería ver el mensaje de sin especialidades
        await page.goto('/resolutor-settings');
        await expect(page.locator('text=No tienes especialidades de resolución asignadas')).toBeVisible();
        console.log('[TEST SEGURIDAD] Restricción de acceso sin especificidad correcta.');
    });
});
