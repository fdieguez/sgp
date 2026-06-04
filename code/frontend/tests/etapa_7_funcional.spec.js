import { test, expect } from '@playwright/test';

/**
 * Pruebas funcionales de la Etapa 7 - SGP.
 * Comentarios y documentación completamente en español según la Regla Global 1.
 */
test.describe('Etapa 7 - Pruebas Funcionales de Zonas, Cascada y Visibilidad', () => {
    const idUnico = Date.now().toString().slice(-6);
    const nombreUsuario = `Resp E2E ${idUnico}`;
    const emailUsuario = `resp.e2e.${idUnico}@sgp.com`;
    const nombreBeneficiario = `Beneficiario E2E 7 ${idUnico}`;
    const descSolicitud = `Solicitud de prueba funcional para la etapa 7. ID: ${idUnico}`;

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

    test('Prueba 1: Obligatoriedad de Zona para rol Responsable en ABM de Usuarios', async ({ page }) => {
        test.setTimeout(45000);

        // 1. Loguearse como Administrador
        console.log('[TEST 1] Iniciando sesión como Administrador');
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');

        // 2. Ir a gestión de usuarios
        await page.goto('/settings');
        await page.waitForTimeout(1000);

        // 3. Abrir modal de nuevo usuario
        await page.click('button:has-text("Nuevo Usuario")');
        await expect(page.locator('h2:has-text("Nuevo Usuario")')).toBeVisible();

        // Completar datos básicos
        await page.locator('label:has-text("Nombre") + input').first().fill('Test');
        await page.locator('label:has-text("Apellido") + input').fill(nombreUsuario);
        await page.locator('label:has-text("Email") + input').fill(emailUsuario);
        await page.locator('label:has-text("Contraseña") + input').fill('Resp_SGP_2026!');
        await page.locator('label:has-text("Teléfono") + input').fill('342123456');

        // Seleccionar rol Responsable (desmarcando Operador)
        await page.locator('label:has-text("Responsable") input[type="checkbox"]').check();
        await page.locator('label:has-text("Operador") input[type="checkbox"]').uncheck();

        // Dejar el campo Zona Territorial vacío e intentar enviar
        await page.locator('label:has-text("Zona Territorial") + input').fill('');
        
        // Validar que el elemento de entrada tiene el atributo 'required' en el HTML5
        const zoneInput = page.locator('label:has-text("Zona Territorial") + input');
        await expect(zoneInput).toHaveAttribute('required');
        console.log('[TEST 1] Validación de zona obligatoria mediante atributo HTML5 required correcta.');
    });

    test('Prueba 2: Selector de Responsable en Cascada (Zona -> Responsable)', async ({ page }) => {
        test.setTimeout(45000);

        // 1. Loguearse como Administrador
        console.log('[TEST 2] Iniciando sesión como Administrador para probar selector en cascada');
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');

        // 2. Crear una solicitud rápida
        await page.goto('/mis-solicitudes');
        await page.click('button:has-text("Nueva Solicitud")');
        await page.locator('label:has-text("Nombre Completo") + input').fill(nombreBeneficiario);
        await page.locator('label:has-text("Tel") + input').first().fill('3424001122');
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descSolicitud);
        
        // Verificar que el select de Responsable esté deshabilitado porque no hay zona seleccionada
        const respSelect = page.locator('label:has-text("Responsable") + select');
        await expect(respSelect).toBeDisabled();

        // Seleccionar Zona Norte
        await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
        await page.waitForTimeout(500);

        // Verificar que se habilite el select de Responsable
        await expect(respSelect).toBeEnabled();

        // Verificar que Matías Ippolito (Norte) esté disponible y Barbara (Sur) no
        const optionsText = await respSelect.innerText();
        expect(optionsText).toContain('Matías Ippolito');
        expect(optionsText).not.toContain('Barbara Brancatto');

        // Cambiar a Zona Sur
        await page.locator('label:has-text("Zona Territorial") + select').selectOption('Sur');
        await page.waitForTimeout(500);

        // Verificar que Barbara Brancatto (Sur) esté disponible y Matías no
        const optionsTextSur = await respSelect.innerText();
        expect(optionsTextSur).toContain('Barbara Brancatto');
        expect(optionsTextSur).not.toContain('Matías Ippolito');

        // Asignar a Barbara Brancatto y guardar
        await respSelect.selectOption({ label: 'Barbara Brancatto' });
        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=creada con éxito')).toBeVisible();
        console.log('[TEST 2] Prueba de selector en cascada completada exitosamente.');
    });

    test('Prueba 3: Visibilidad continua del Distribuidor tras asignación de responsable', async ({ page }) => {
        test.setTimeout(45000);

        // 1. Loguearse como Distribuidor (Matías Ippolito)
        console.log('[TEST 3] Iniciando sesión como Distribuidor Matías Ippolito');
        await login(page, 'matias.ippolito@gmail.com', 'Matias_Dist_SGP_2026!');

        await page.goto('/mis-solicitudes');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiario);
        await page.waitForTimeout(1000);

        // Comprobar que ve la solicitud que acabamos de crear en la Prueba 2 (asignada a Barbara Brancatto)
        const fila = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
        await expect(fila).toBeVisible();

        // Editar la solicitud para reasignar responsable
        await fila.locator('button[title="Ver / Editar Detalles"]').click();
        await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeVisible();

        // Cambiar zona a Norte y responsable a Matías Ippolito (Responsable)
        await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
        await page.waitForTimeout(500);
        await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
        
        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=Solicitud actualizada')).toBeVisible();
        await page.waitForTimeout(1000);

        // Verificar que, a pesar de estar asignada, la solicitud SIGUE visible en la bandeja del Distribuidor
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiario);
        await page.waitForTimeout(1000);
        const filaDespues = page.locator('tbody tr').filter({ hasText: nombreBeneficiario }).first();
        await expect(filaDespues).toBeVisible();
        
        console.log('[TEST 3] Prueba de visibilidad del Distribuidor completada exitosamente.');
    });
});
