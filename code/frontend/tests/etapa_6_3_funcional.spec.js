import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Pruebas funcionales de la Etapa 6.3 - SGP.
 * Comentarios y documentación completamente en español según la Regla Global 1.
 */
test.describe('Etapa 6.3 - Pruebas Funcionales de Multi-Resolución', () => {
    const idUnico = Date.now().toString().slice(-6);
    const nombreBeneficiario = `Beneficiario E2E 6.3 ${idUnico}`;
    const descSolicitud = `Solicitud de prueba funcional para multi-resolución en etapa 6.3. ID: ${idUnico}`;
    
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
        await page.waitForURL(/.*(dashboard|mis-solicitudes|settings).*/, { timeout: 15000 });
        await page.waitForTimeout(1000);
    };

    test('Prueba 1: Ciclo completo de creación, asignación y resolución por resolutor con tipo habilitado', async ({ page }) => {
        test.setTimeout(90000);

        // 1. Loguearse como Operador (Celeste Solari)
        console.log('[TEST 1] Iniciando sesión como Operador Celeste Solari');
        await login(page, 'celestesolari19@gmail.com', 'Celeste_SGP_2026#');

        // 2. Crear nueva solicitud
        console.log('[TEST 1] Creando nueva solicitud');
        await page.click('button:has-text("Nueva Solicitud")');
        await expect(page.locator('h2:has-text("Nueva Solicitud")')).toBeVisible();

        await page.locator('label:has-text("Nombre Completo") + input').fill(nombreBeneficiario);
        await page.locator('label:has-text("Tel") + input').first().fill('3424001122');
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descSolicitud);
        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=creada con éxito')).toBeVisible();

        // Salir
        await page.click('button:has-text("Salir")');
        await page.waitForURL('**/login');

        // 3. Loguearse como Administrador para asignar responsable y tipo de resolución
        console.log('[TEST 1] Iniciando sesión como Administrador');
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');

        await page.goto('/mis-solicitudes');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiario);
        await page.waitForTimeout(1000);

        const fila = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
        await expect(fila).toBeVisible();
        await fila.locator('button[title="Ver / Editar Detalles"]').click();

        // Cargar responsable
        console.log('[TEST 1] Asignando responsable y resolución de tipo SUBSIDIO');
        await page.locator('label:has-text("Responsable") + select').selectOption({ index: 1 });

        // Agregar asignación de tipo SUBSIDIO (que por defecto se asigna a Martín Nocioni)
        await page.click('button:has-text("Agregar")');
        const container = page.locator('div.bg-indigo-900\\/10 div.group').first();
        await expect(container).toBeVisible();
        await container.locator('select').first().selectOption('SUBSIDIO');
        await page.waitForTimeout(1000);

        // Completar datos obligatorios de la asignación
        await container.locator('label:has-text("pedido") + select').selectOption('Personal');
        await page.waitForTimeout(500);
        await container.locator('label:has-text("descrip") + textarea').fill('Descripción de subsidio para la prueba');
        await container.locator('label:has-text("Fin") + select').selectOption({ index: 1 });
        await container.locator('label:has-text("Apellido") + input').fill('Beneficiario E2E 6.3');
        
        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=Solicitud actualizada')).toBeVisible();

        // Salir
        await page.click('button:has-text("Salir")');
        await page.waitForURL('**/login');

        // 4. Loguearse como Resolutor Subsidios (Martín Nocioni) y validar visibilidad/resolución
        console.log('[TEST 1] Iniciando sesión como Resolutor Martín Nocioni');
        await login(page, 'martinnocioni@gmail.com', 'Martin_SGP_2026*');

        await page.goto('/mis-solicitudes');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiario);
        await page.waitForTimeout(1000);

        // Debería ver la solicitud
        const filaResolutor = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
        await expect(filaResolutor).toBeVisible();
        await filaResolutor.locator('button[title="Ver / Editar Detalles"]').click();

        // Aprobar resolución
        console.log('[TEST 1] Aprobando la asignación de SUBSIDIO');
        await page.click('button:has-text("Aprobar")');
        await page.locator('textarea[placeholder*="detalles"]').fill('Resolución aprobada mediante prueba Playwright 6.3');
        await page.click('button:has-text("Confirmar")');
        await page.waitForTimeout(2000);

        // Salir
        await page.click('button:has-text("Salir")');
        await page.waitForURL('**/login');

        // 5. Loguearse como Administrador y verificar que figure como Resuelta
        console.log('[TEST 1] Verificando estado final resuelto como Administrador');
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.goto('/mis-solicitudes');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiario);
        await page.waitForTimeout(1000);

        const filaFinal = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
        await expect(filaFinal.locator('text=Resueltas')).toBeVisible();
        console.log('[TEST 1] Prueba 1 completada exitosamente.');
    });

    test('Prueba 2: Filtro de bandeja basado en perfiles multi-resolución (habilitación/deshabilitación de checkboxes)', async ({ page }) => {
        test.setTimeout(90000);

        // 1. Loguearse como Administrador
        console.log('[TEST 2] Iniciando sesión como Administrador');
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');

        // Crear una solicitud de prueba asignada a SUBSIDIO (Martín Nocioni)
        console.log('[TEST 2] Creando solicitud de prueba para verificar visibilidad');
        await page.goto('/mis-solicitudes');
        await page.click('button:has-text("Nueva Solicitud")');
        const nombreSoliTest = `Test Filtro ${idUnico}`;
        await page.locator('label:has-text("Nombre Completo") + input').fill(nombreSoliTest);
        await page.locator('label:has-text("Tel") + input').first().fill('3424001122');
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill('Test de filtrado por tipo de resolución');
        await page.locator('label:text-is("Tipo") + select').selectOption('SUBSIDIO');
        await page.locator('label:has-text("Responsable") + select').selectOption({ index: 1 });

        await page.click('button:has-text("Agregar")');
        const container = page.locator('div.bg-indigo-900\\/10 div.group').first();
        await expect(container).toBeVisible();
        await container.locator('select').first().selectOption('SUBSIDIO');
        await page.waitForTimeout(1000);
        await container.locator('label:has-text("pedido") + select').selectOption('Personal');
        await page.waitForTimeout(500);
        await container.locator('label:has-text("descrip") + textarea').fill('Descripción de subsidio para filtro');
        await container.locator('label:has-text("Fin") + select').selectOption({ index: 1 });
        await container.locator('label:has-text("Apellido") + input').fill('Beneficiario Filtro');

        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=creada con éxito')).toBeVisible();

        // 2. Modificar el perfil del usuario martinnocioni@gmail.com para DESMARCAR Subsidios
        console.log('[TEST 2] Desmarcando el checkbox de SUBSIDIO en el perfil del resolutor Martín Nocioni');
        await page.goto('/settings');
        await page.waitForTimeout(1000);

        const filaUsuario = page.locator('tbody tr').filter({ hasText: 'martinnocioni@gmail.com' }).first();
        await expect(filaUsuario).toBeVisible();
        await filaUsuario.locator('button').first().click(); // Clic en editar usuario
        await expect(page.locator('h2:has-text("Editar Usuario")')).toBeVisible();

        // Desmarcar Subsidio
        const subsidioCheckbox = page.locator('label:has-text("SUBSIDIO") input[type="checkbox"]');
        await subsidioCheckbox.uncheck();
        await page.click('button:has-text("Guardar Cambios")');
        await page.waitForTimeout(1500);

        // Salir
        await page.click('button:has-text("Salir")');
        await page.waitForURL('**/login');

        // 3. Iniciar sesión como Martín Nocioni y comprobar que NO ve la solicitud
        console.log('[TEST 2] Logueando como Martín Nocioni y comprobando que no tiene la solicitud visible');
        await login(page, 'martinnocioni@gmail.com', 'Martin_SGP_2026*');
        await page.goto('/mis-solicitudes');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreSoliTest);
        await page.waitForTimeout(1000);

        // La tabla de solicitudes debe estar vacía o no contener el registro
        await expect(page.locator('tbody tr').filter({ hasText: nombreSoliTest })).toBeHidden();

        // Salir
        await page.click('button:has-text("Salir")');
        await page.waitForURL('**/login');

        // 4. Iniciar sesión como Administrador y volver a MARCAR Subsidio para Martín Nocioni
        console.log('[TEST 2] Re-marcando el checkbox de SUBSIDIO para Martín Nocioni');
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.goto('/settings');
        await page.waitForTimeout(1000);

        const filaUsuarioRestaurar = page.locator('tbody tr').filter({ hasText: 'martinnocioni@gmail.com' }).first();
        await filaUsuarioRestaurar.locator('button').first().click();
        await expect(page.locator('h2:has-text("Editar Usuario")')).toBeVisible();

        const subsidioCheckboxRestaurar = page.locator('label:has-text("SUBSIDIO") input[type="checkbox"]');
        await subsidioCheckboxRestaurar.check();
        await page.click('button:has-text("Guardar Cambios")');
        await page.waitForTimeout(1500);

        // Salir
        await page.click('button:has-text("Salir")');
        await page.waitForURL('**/login');

        // 5. Iniciar sesión como Martín Nocioni y comprobar que AHORA SÍ ve la solicitud
        console.log('[TEST 2] Logueando de nuevo como Martín Nocioni y comprobando que la solicitud vuelve a ser visible');
        await login(page, 'martinnocioni@gmail.com', 'Martin_SGP_2026*');
        await page.goto('/mis-solicitudes');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreSoliTest);
        await page.waitForTimeout(1000);

        await expect(page.locator('tbody tr').filter({ hasText: nombreSoliTest }).first()).toBeVisible();
        console.log('[TEST 2] Prueba 2 completada exitosamente.');
    });
});
