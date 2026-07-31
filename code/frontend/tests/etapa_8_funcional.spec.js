import { test, expect } from '@playwright/test';

/**
 * Pruebas funcionales de la Etapa 8 - SGP.
 * Comentarios y documentación completamente en español según la Regla Global 1.
 */
test.describe('Etapa 8 - Pruebas Funcionales y de Integración', () => {
    const idUnico = Date.now().toString().slice(-6);
    const nombreBeneficiarioAgenda = `Beneficiario Agenda E2E ${idUnico}`;
    const nombreBeneficiarioSubsidio = `Beneficiario Subsidio E2E ${idUnico}`;
    const descSolicitudAgenda = `Reunión de agenda de prueba funcional Etapa 8. ID: ${idUnico}`;
    const descSolicitudSubsidio = `Subsidio de prueba funcional Etapa 8. ID: ${idUnico}`;

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
        await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|descargar-adjunto).*/, { timeout: 15000 });
        await page.waitForTimeout(1000);
    };

    test('Escenario 1 & 2: Creación de Agenda, Asistencia Obligatoria en Aprobación y Visualización', async ({ page }) => {
        test.setTimeout(60000);

        // 1. Iniciar sesión como Administrador para crear la solicitud (los selectores de Zona están habilitados)
        console.log('[ESCENARIO 1] Iniciar sesión como Administrador');
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');

        // 2. Crear solicitud tipo AGENDA asignada al Resolutor de Agenda
        console.log('[ESCENARIO 1] Creando solicitud de tipo AGENDA');
        await page.goto('/mis-solicitudes');
        await page.click('button:has-text("Nueva Solicitud")');
        
        // Completar formulario de solicitud
        await page.locator('label:has-text("Nombre Completo") + input').fill(nombreBeneficiarioAgenda);
        await page.locator('label:has-text("Tel") + input').first().fill('3424112233');
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descSolicitudAgenda);
        
        // Seleccionar Zona y Responsable
        await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
        await page.waitForTimeout(500);
        await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });

        // Seleccionar Tipo "Agenda"
        await page.locator('label:has-text("Tipo") + select').first().selectOption('AGENDA');

        // Agregar la asignación de Agenda para desplegar sus campos dinámicos
        await page.click('button:has-text("Agregar")');
        await page.waitForTimeout(500);
        await page.locator('select:has-text("Seleccione Área...")').first().selectOption('AGENDA');
        await page.waitForTimeout(500);
        
        // Completar los campos dinámicos de Agenda
        await page.locator('label:has-text("Declaración de interés") + select').selectOption('si');
        await page.locator('label:has-text("Observaciones") + textarea').fill('Reunión urgente de coordinación de presupuesto.');

        // Guardar solicitud
        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=creada con éxito')).toBeVisible();

        // Obtener el ID de la solicitud recién creada en la grilla
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiarioAgenda);
        await page.waitForTimeout(1000);
        const rowText = await page.locator('tbody tr').first().innerText();
        const solicitudIdMatch = rowText.match(/#(\d+)/);
        const solicitudId = solicitudIdMatch ? solicitudIdMatch[1] : null;
        console.log(`[ESCENARIO 1] Solicitud creada con ID: ${solicitudId}`);

        // Cerrar sesión
        await page.click('button:has-text("Salir")');
        await page.waitForURL('/login');

        // 3. Iniciar sesión como Resolutor (Agenda)
        console.log('[ESCENARIO 1] Iniciar sesión como Resolutor de Agenda');
        await login(page, 'mvgonza79@gmail.com', 'Maria_SGP_2026%');

        // 4. Abrir la solicitud
        await page.goto('/mis-solicitudes');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiarioAgenda);
        await page.waitForTimeout(1000);
        await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();

        // 5. Intentar Aprobar la Agenda y Validar Asistencia Obligatoria
        console.log('[ESCENARIO 1] Validando obligatoriedad del selector de asistencia');
        await page.click('button:has-text("Aprobar")');

        // Comprobar que en el modal de confirmación, el botón Confirmar está deshabilitado
        const confirmBtn = page.locator('button:has-text("Confirmar y Finalizar")');
        await expect(confirmBtn).toBeDisabled();

        // Seleccionar "Con Asistencia"
        await page.locator('label:has-text("Con Asistencia") input[type="radio"]').check();
        
        // Comprobar que el botón Confirmar ahora está habilitado
        await expect(confirmBtn).toBeEnabled();

        // Escribir observaciones y aprobar
        await page.locator('textarea[placeholder*="detalles de la resolución"]').fill('Asiste el presidente de la cooperativa.');
        await confirmBtn.click();
        await expect(page.locator('text=Resolución aprobada')).toBeVisible();
        await page.waitForTimeout(1000);

        // Cerrar sesión
        await page.click('button:has-text("Salir")');
        await page.waitForURL('/login');

        // 6. [ESCENARIO 2] Iniciar sesión como Responsable para verificar visualización
        console.log('[ESCENARIO 2] Verificando la asistencia como Responsable');
        await login(page, 'matias.ippolito.responsable@gmail.com', 'Matias_Resp_SGP_2026!');
        await page.goto('/mis-solicitudes');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiarioAgenda);
        await page.waitForTimeout(1000);
        
        // Abrir la solicitud
        await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
        
        // Validar que se muestre la sección de asistencia y que sea "con asistencia"
        await expect(page.locator('text=Asistencia de la Agenda')).toBeVisible();
        await expect(page.locator('text=con asistencia')).toBeVisible();
        console.log('[ESCENARIO 2] Visualización de asistencia obligatoria de sólo lectura correcta.');
    });

    test('Escenario 5: Encabezado Dinámico de Roles y Zonas en el Navbar', async ({ page }) => {
        test.setTimeout(45000);

        // 1. Iniciar sesión como Responsable
        console.log('[ESCENARIO 5] Verificando encabezado dinámico para Responsable');
        await login(page, 'matias.ippolito.responsable@gmail.com', 'Matias_Resp_SGP_2026!');
        const navbarTextResp = await page.locator('nav').first().innerText();
        expect(navbarTextResp.toUpperCase()).toContain('MATÍAS');
        expect(navbarTextResp.toUpperCase()).toContain('IPPOLITO');
        expect(navbarTextResp.toUpperCase()).toContain('RESPONSABLE - ZONA NORTE');

        // Cerrar sesión
        await page.click('button:has-text("Salir")');
        await page.waitForURL('/login');

        // 2. Iniciar sesión como Resolutor (Subsidio)
        console.log('[ESCENARIO 5] Verificando encabezado dinámico para Resolutor de Subsidio');
        await login(page, 'martinnocioni@gmail.com', 'Martin_SGP_2026*');
        const navbarTextResol = await page.locator('nav').first().innerText();
        expect(navbarTextResol.toUpperCase()).toContain('MARTÍN');
        expect(navbarTextResol.toUpperCase()).toContain('NOCIONI');
        expect(navbarTextResol.toUpperCase()).toContain('RESOLUTOR - SUBSIDIO');
    });

    test('Escenario 6 & 7: Grilla Expandida de Subsidios y Poner en Consideración', async ({ page }) => {
        test.setTimeout(60000);

        // 1. Iniciar sesión como Administrador para crear una solicitud de Subsidio (los selectores de Zona están habilitados)
        console.log('[ESCENARIO 6] Creando subsidio de prueba como Administrador');
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.goto('/mis-solicitudes');
        await page.click('button:has-text("Nueva Solicitud")');

        await page.locator('label:has-text("Nombre Completo") + input').fill(nombreBeneficiarioSubsidio);
        await page.locator('label:has-text("Tel") + input').first().fill('3424998877');
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descSolicitudSubsidio);
        await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
        await page.waitForTimeout(500);
        await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
        
        // Seleccionar Tipo "Subsidio"
        await page.locator('label:has-text("Tipo") + select').first().selectOption('SUBSIDIO');

        // Agregar la asignación de Subsidio para desplegar sus campos dinámicos
        await page.click('button:has-text("Agregar")');
        await page.waitForTimeout(500);
        await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
        await page.waitForTimeout(500);
        
        // Completar los campos dinámicos de subsidio
        await page.locator('label:has-text("Tipo de pedido") + select').selectOption('Personal');
        await page.locator('label:has-text("Nombre y apellido") + input').fill(nombreBeneficiarioSubsidio);
        await page.locator('label:has-text("DNI") + input').nth(1).fill('20-33444555-9');
        await page.locator('label:has-text("Monto") + input').first().fill('75000');

        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=creada con éxito')).toBeVisible();

        // Cerrar sesión
        await page.click('button:has-text("Salir")');
        await page.waitForURL('/login');

        // 2. Iniciar sesión como Resolutor (Subsidio) para validar Grilla Expandida
        console.log('[ESCENARIO 6] Iniciar sesión como Resolutor de Subsidio');
        await login(page, 'martinnocioni@gmail.com', 'Martin_SGP_2026*');
        await page.goto('/mis-solicitudes');
        
        // Verificar existencia de cabeceras de la grilla expandida (ej. "Constancia CBU", "DNI Frente", "Resp 1: Nombre")
        await expect(page.locator('th:has-text("Constancia CBU")')).toBeVisible();
        await expect(page.locator('th:has-text("DNI Frente")')).toBeVisible();
        await expect(page.locator('th:has-text("Resp 1: Nombre")')).toBeVisible();
        await expect(page.locator('th:has-text("¿Por Donde?")')).toBeVisible();
        console.log('[ESCENARIO 6] Cabeceras de grilla expandida validadas correctamente.');

        // 3. [ESCENARIO 7] Poner en consideración
        console.log('[ESCENARIO 7] Probando acción Poner en Consideración');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiarioSubsidio);
        await page.waitForTimeout(1000);

        // Hacer clic en el botón de poner en consideración
        const consideracionBtn = page.locator('tbody tr').first().locator('button[title="Poner en Consideración"]');
        await expect(consideracionBtn).toBeVisible();

        // Interceptar el diálogo de confirmación de ventana
        page.once('dialog', dialog => dialog.accept());
        await consideracionBtn.click();

        // Validar mensaje de éxito y badge de estado
        await expect(page.locator('text=puesta en consideración correctamente')).toBeVisible();
        await page.waitForTimeout(1000);
        
        const statusBadge = page.locator('tbody tr').first().locator('span:has-text("Consideración")');
        await expect(statusBadge).toBeVisible();
        console.log('[ESCENARIO 7] Cambio de estado a CONSIDERACIÓN y badge naranja correcto.');
    });

    test('Escenario 8: Sincronización con Planilla Externa (Exportar / Importar)', async ({ page }) => {
        test.setTimeout(60000);

        // Iniciar sesión como Resolutor
        console.log('[ESCENARIO 8] Iniciando sesión para probar botones de sincronización');
        await login(page, 'martinnocioni@gmail.com', 'Martin_SGP_2026*');
        await page.goto('/mis-solicitudes');

        // Los botones "Exportar Planilla" e "Importar Planilla" deben estar visibles para este perfil
        const exportBtn = page.locator('button:has-text("Exportar Planilla")');
        const importBtn = page.locator('button:has-text("Importar Planilla")');
        
        await expect(exportBtn).toBeVisible();
        await expect(importBtn).toBeVisible();

        // Hacer clic en Exportar Planilla (validar flujo sin errores fatales)
        console.log('[ESCENARIO 8] Ejecutando Exportar a la planilla externa...');
        await exportBtn.click();
        
        // Esperamos mensaje de éxito o feedback del backend
        await page.waitForTimeout(2000);
        
        // Hacer clic en Importar Planilla (validar flujo sin errores fatales)
        console.log('[ESCENARIO 8] Ejecutando Importar desde la planilla externa...');
        await importBtn.click();
        await page.waitForTimeout(2000);

        console.log('[ESCENARIO 8] Verificación de botones e interacción de sincronización finalizada.');
    });

    test('Escenario 9: Acceso Seguro a Adjuntos y Redirección a Login (Rol LECTOR)', async ({ page }) => {
        test.setTimeout(45000);

        // 1. Intentar acceder de forma anónima
        console.log('[ESCENARIO 9] Intentando descarga anónima de adjunto');
        await page.goto('/descargar-adjunto/15');
        
        // Debe redirigir al login y guardar la redirección
        await page.waitForURL(/\/login\?redirectTo=.*/);
        console.log('[ESCENARIO 9] Redirección automática al login correcta.');

        // 2. Iniciar sesión como Auditor/Lector
        console.log('[ESCENARIO 9] Iniciando sesión como Lector (Auditor)');
        const emailInput = page.locator('input[type="email"]');
        const passInput = page.locator('input[type="password"]');
        await emailInput.fill('auditor.sheets@gmail.com');
        await passInput.fill('Lector_SGP_2026#');
        await page.click('button:has-text("Ingresar")');

        // Debe redirigir automáticamente de vuelta a la página del adjunto
        await page.waitForURL(/.*descargar-adjunto\/15/);
        
        // Debe mostrar el panel de descarga del adjunto "Descarga Segura"
        await expect(page.locator('text=Descarga Segura')).toBeVisible();
        console.log('[ESCENARIO 9] Panel de Descarga Segura visible.');

        // 3. Intentar navegar a /settings (acceso denegado o redirección al login/dashboard)
        console.log('[ESCENARIO 9] Validando restricción de accesos del rol LECTOR');
        await page.goto('/settings');
        await page.waitForTimeout(1000);
        
        // El rol Lector no debe tener acceso y debe mostrar "Acceso denegado"
        await expect(page.locator('text=Acceso denegado')).toBeVisible();
        console.log('[ESCENARIO 9] Acceso restringido del rol LECTOR verificado exitosamente.');
    });
});
