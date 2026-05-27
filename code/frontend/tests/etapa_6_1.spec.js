import { test, expect } from '@playwright/test';

test.describe.serial('Suite de Validación: Etapa 6.1 (Migraciones y Roles)', () => {
    
    // Función helper para login
    const login = async (page, email, pass) => {
        await page.goto('/login');
        const emailInput = page.locator('input[type="email"]');
        const passInput = page.locator('input[type="password"]');
        await emailInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await emailInput.fill(email);
        await passInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await passInput.fill(pass);
        await page.click('button:has-text("Ingresar")');
        await page.waitForURL(/.*(dashboard|mis-solicitudes).*/, { timeout: 15000 });
    };

    test('Caso de Prueba 2: Visibilidad Limitada por Rol (Operadores)', async ({ page }) => {
        // Asumiendo que existe un operador.
        await login(page, 'operador@sgp.com', 'SGP_StrongPass_2026!');
        await page.goto('/mis-solicitudes');
        await page.click('button:has-text("Nueva Solicitud")');
        await expect(page.locator('h2:has-text("Nueva Solicitud")')).toBeVisible();

        // 3. Verificar que no aparezca el combo de "Tipo" (Pedido/Subsidio).
        // En unificacion_vistas usaba label:text-is("Tipo").
        await expect(page.locator('label:text-is("Tipo")')).toBeHidden();

        // 4. Confirmar que no existen Zona / Eje, Responsable y Seguimiento.
        await expect(page.locator('label:text-is("Zona / Eje")')).toBeHidden();
        await expect(page.locator('label:text-is("Responsable")')).toBeHidden();
        await expect(page.locator('h3:has-text("Seguimiento")')).toBeHidden();
    });

    test('Caso de Prueba 3: Nuevos Atributos del Solicitante y Adjuntos Rápidos', async ({ page }) => {
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.goto('/mis-solicitudes');
        await page.click('button:has-text("Nueva Solicitud")');
        await expect(page.locator('h2:has-text("Nueva Solicitud")')).toBeVisible();

        // "Tipo Solicitante"
        const tipoSolicitanteLabel = page.locator('label:has-text("Tipo Solicitante")');
        await expect(tipoSolicitanteLabel).toBeVisible();
        await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');

        // Aparece el nuevo combo "Subtipo"
        const subtipoLabel = page.locator('label:text-is("Subtipo")');
        await expect(subtipoLabel).toBeVisible();
        await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');

        // Completar y guardar
        const idUnico = Date.now().toString().slice(-4);
        const desc = `Test Etapa 6.1 ${idUnico}`;
        await page.locator('label:has-text("Nombre Completo") + input').fill('Solicitante Etapa 6.1');
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(desc);
        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=creada con éxito')).toBeVisible();

        // Volver a abrir para probar adjuntos rápidos (simulado viendo que exista el botón)
        const filaFinal = page.locator('tr').filter({ hasText: desc }).first();
        await filaFinal.locator('button[title="Ver / Editar Detalles"]').click();
        await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeVisible();
        
        // El input de archivos está en Formulario / Detalles al final
        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toBeAttached();
    });

    test('Caso de Prueba 4: Listado de Localidades (Ajuste a Santa Fe y Laguna Paiva)', async ({ page }) => {
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.goto('/mis-solicitudes');
        await page.click('button:has-text("Nueva Solicitud")');
        
        // Esperamos que en el datalist existan Santa Fe y Laguna Paiva
        const dataList = page.locator('datalist#cities-list');
        await expect(dataList.locator('option[value="Santa Fe"]')).toBeAttached();
        await expect(dataList.locator('option[value="Laguna Paiva"]')).toBeAttached();
        // Verificar que hay opciones en total (no trajo todo el país)
        const count = await dataList.locator('option').count();
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThan(100); 
    });

    test('Caso de Prueba 5: Dashboard y Métricas', async ({ page }) => {
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.goto('/dashboard');
        
        // Verificar "Pendiente" en singular (o Pendientes no)
        await expect(page.locator('p:has-text("Pendiente")')).toBeVisible();
        
        // Asegurarse de que no diga "Subsidios Entregados"
        await expect(page.locator('text=Subsidios Entregados')).toBeHidden();
    });
});
