import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Suite de Pruebas Funcionales: Etapa 6.2 - Dinámica de Resoluciones y Roles
 * Todos los comentarios y nombres de pasos están escritos en Español según la Regla Global 1.
 */
test.describe.serial('Etapa 6.2 - Dinámica de Resoluciones y Roles', () => {
    const idUnico = Date.now().toString().slice(-6);
    const nombreBeneficiario = `E2E 6.2 ${idUnico}`;
    const descSolicitud = `Solicitud de prueba funcional etapa 6.2 - ID ${idUnico}`;
    const dummyFilePath = path.join(process.cwd(), 'tests', 'test-file.txt');

    // Inicializar archivo dummy si no existe
    test.beforeAll(() => {
        if (!fs.existsSync(dummyFilePath)) {
            fs.writeFileSync(dummyFilePath, 'Contenido de prueba para adjuntos etapa 6.2');
        }
    });

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
        // Esperamos a que la navegación ocurra
        await page.waitForTimeout(2000);
    };

    // ========================================================
    // Caso de Prueba 1.1 y 1.2: Ruteo e Ingreso (Bypass de Dashboard)
    // ========================================================
    test('1. Ruteo e Ingreso (Bypass de Dashboard) según rol', async ({ page }) => {
        // Operador
        console.log('[TEST] Probando ruteo de Operador...');
        await login(page, 'celestesolari19@gmail.com', 'Celeste_SGP_2026#');
        await page.waitForURL('**/mis-solicitudes', { timeout: 15000 });
        await expect(page.locator('h1:has-text("Mis Solicitudes")')).toBeVisible();
        await expect(page.locator('text=Mis Planillas')).toBeHidden();
        await expect(page.locator('text=Total Solicitudes')).toBeHidden();
        await page.click('button:has-text("Salir")');

        // Distribuidor
        console.log('[TEST] Probando ruteo de Distribuidor...');
        await login(page, 'matias.ippolito@gmail.com', 'Matias_Dist_SGP_2026!');
        await page.waitForURL('**/mis-solicitudes', { timeout: 15000 });
        await expect(page.locator('h1:has-text("Mis Solicitudes")')).toBeVisible();
        await expect(page.locator('text=Mis Planillas')).toBeHidden();
        await expect(page.locator('text=Total Solicitudes')).toBeHidden();
        await page.click('button:has-text("Salir")');

        // Responsable
        console.log('[TEST] Probando ruteo de Responsable...');
        await login(page, 'matias.ippolito.responsable@gmail.com', 'Matias_Resp_SGP_2026!');
        await page.waitForURL('**/mis-solicitudes', { timeout: 15000 });
        await expect(page.locator('h1:has-text("Mis Solicitudes")')).toBeVisible();
        await expect(page.locator('text=Mis Planillas')).toBeHidden();
        await expect(page.locator('text=Total Solicitudes')).toBeHidden();
        await page.click('button:has-text("Salir")');

        // Administrador
        console.log('[TEST] Probando ruteo de Administrador...');
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        await expect(page.locator('text=Panel SGP')).toBeVisible();
        await expect(page.locator('text=Mis Planillas')).toBeVisible();
        await page.click('button:has-text("Salir")');
    });

    // ========================================================
    // Caso de Prueba 2.1: Tipos de Resolución Básicos
    // ========================================================
    test('2. Disponibilidad de Tipos de Resolución en el modal', async ({ page }) => {
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.goto('/mis-solicitudes');
        await page.click('button:has-text("Nueva Solicitud")');
        await expect(page.locator('h2:has-text("Nueva Solicitud")')).toBeVisible();

        // Completar algunos datos mínimos para poder ver asignaciones
        await page.locator('label:has-text("Nombre Completo") + input').fill(nombreBeneficiario);
        await page.locator('label:has-text("Tel") + input').first().fill('3424001122');
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descSolicitud);

        // Seleccionar zona y responsable (cascada)
        await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
        await page.waitForTimeout(500);
        await page.locator('label:has-text("Responsable") + select').selectOption({ index: 1 });

        // Click en "Agregar" en la sección de asignaciones
        await page.click('button:has-text("Agregar")');
        const container = page.locator('div.bg-indigo-900\\/10 div.group').first();
        await expect(container).toBeVisible();

        // Verificar el selector de tipos de resolución
        const selectTipoResolucion = container.locator('select').first();
        const options = await selectTipoResolucion.locator('option').allInnerTexts();
        const optionsTrimmed = options.map(o => o.trim());

        console.log('[TEST] Opciones de tipo resolución encontradas:', optionsTrimmed);
        
        // Deben listarse exactamente las 4 opciones oficiales (más la de marcador de posición)
        expect(optionsTrimmed.length).toBe(5);
        expect(optionsTrimmed.some(o => o.includes('AGENDA'))).toBe(true);
        expect(optionsTrimmed.some(o => o.includes('SUBSIDIO'))).toBe(true);
        expect(optionsTrimmed.some(o => o.includes('DECLARACION DE INTERES'))).toBe(true);
        expect(optionsTrimmed.some(o => o.includes('OTRA'))).toBe(true);
    });

    // ========================================================
    // Caso de Prueba 3.1, 3.2, 3.3: Formulario Dinámico y Condicional - SUBSIDIO
    // ========================================================
    test('3. Formulario Dinámico y Condicional - SUBSIDIO', async ({ page }) => {
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.goto('/mis-solicitudes');
        await page.click('button:has-text("Nueva Solicitud")');
        
        await page.locator('label:has-text("Nombre Completo") + input').fill(nombreBeneficiario);
        await page.locator('label:has-text("Tel") + input').first().fill('3424001122');
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descSolicitud);
        await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
        await page.waitForTimeout(500);
        await page.locator('label:has-text("Responsable") + select').selectOption({ index: 1 });

        await page.click('button:has-text("Agregar")');
        const container = page.locator('div.bg-indigo-900\\/10 div.group').first();
        await expect(container).toBeVisible();

        // Seleccionar SUBSIDIO
        await container.locator('select').first().selectOption('SUBSIDIO');
        await page.waitForTimeout(1000);

        // Caso 3.1: Verificar campos generales iniciales
        // Tipo de pedido, Descripción, Monto, Fin de subsidio (o Fin)
        await expect(container.locator('label:has-text("Tipo de pedido")')).toBeVisible();
        await expect(container.locator('label:has-text("Descripción")')).toBeVisible();
        await expect(container.locator('label:has-text("Monto")')).toBeVisible();
        await expect(container.locator('label:has-text("Fin")')).toBeVisible();

        // Los bloques condicionales (ej: Nombre y apellido, Nombre de la Institución) deben estar ocultos inicialmente
        await expect(container.locator('label:has-text("Nombre y apellido")')).toBeHidden();
        await expect(container.locator('label:has-text("Nombre de institución")')).toBeHidden();

        // Caso 3.2: Comportamiento Reactivo - Subtipo "Personal"
        console.log('[TEST] Seleccionando Tipo de pedido: Personal');
        await container.locator('label:has-text("Tipo de pedido") + select').selectOption('Personal');
        await page.waitForTimeout(500);

        // Bloque Personal visible
        await expect(container.locator('label:has-text("Nombre y apellido")')).toBeVisible();
        await expect(container.locator('label:has-text("DNI")').first()).toBeVisible();
        await expect(container.locator('label:has-text("Dirección de DNI")')).toBeVisible();
        await expect(container.locator('label:has-text("DNI frente")')).toBeVisible();
        await expect(container.locator('label:has-text("DNI dorso")')).toBeVisible();
        await expect(container.locator('label:has-text("Constancia de CBU")')).toBeVisible();

        // Bloque Institucional permanece oculto
        await expect(container.locator('label:has-text("Nombre de institución")')).toBeHidden();

        // Reactividad: al cambiar a vacío, deben desaparecer
        await container.locator('label:has-text("Tipo de pedido") + select').selectOption('');
        await page.waitForTimeout(500);
        await expect(container.locator('label:has-text("Nombre y apellido")')).toBeHidden();

        // Caso 3.3: Comportamiento Reactivo - Subtipo "Institucional"
        console.log('[TEST] Seleccionando Tipo de pedido: Institucional en dinero');
        await container.locator('label:has-text("Tipo de pedido") + select').selectOption('Institucional en dinero');
        await page.waitForTimeout(500);

        // Bloque Institucional visible
        await expect(container.locator('label:has-text("Nombre de institución")')).toBeVisible();
        await expect(container.locator('label:has-text("Dirección de institución")')).toBeVisible();
        await expect(container.locator('label:has-text("Localidad")')).toBeVisible();
        await expect(container.locator('label:has-text("Responsable 1: Nombre")')).toBeVisible();
        await expect(container.locator('label:has-text("Responsable 1: DNI")')).toBeVisible();
        await expect(container.locator('label:has-text("Responsable 1: Cargo")')).toBeVisible();
        await expect(container.locator('label:has-text("Responsable 2: Nombre")')).toBeVisible();
        await expect(container.locator('label:has-text("Responsable 2: DNI")')).toBeVisible();
        await expect(container.locator('label:has-text("Responsable 2: Cargo")')).toBeVisible();
        await expect(container.locator('label:has-text("Nota de pedido")')).toBeVisible();

        // Bloque Personal permanece oculto
        await expect(container.locator('label:has-text("Nombre y apellido")')).toBeHidden();

        // Alternar a Personal y verificar ocultamiento de Institucional
        await container.locator('label:has-text("Tipo de pedido") + select').selectOption('Personal');
        await page.waitForTimeout(500);
        await expect(container.locator('label:has-text("Nombre y apellido")')).toBeVisible();
        await expect(container.locator('label:has-text("Nombre de institución")')).toBeHidden();
    });

    // ========================================================
    // Caso de Prueba 4.1, 4.2, 4.3: Formularios Dinámicos - Otros Tipos
    // ========================================================
    test('4. Formularios Dinámicos - Otros Tipos (AGENDA, DECLARACION, OTRA)', async ({ page }) => {
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.goto('/mis-solicitudes');
        await page.click('button:has-text("Nueva Solicitud")');
        
        await page.locator('label:has-text("Nombre Completo") + input').fill(nombreBeneficiario);
        await page.locator('label:has-text("Tel") + input').first().fill('3424001122');
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descSolicitud);
        await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
        await page.waitForTimeout(500);
        await page.locator('label:has-text("Responsable") + select').selectOption({ index: 1 });

        await page.click('button:has-text("Agregar")');
        const container = page.locator('div.bg-indigo-900\\/10 div.group').first();
        await expect(container).toBeVisible();

        // 4.1 AGENDA - 9 campos
        console.log('[TEST] Validando campos de AGENDA...');
        await container.locator('select').first().selectOption('AGENDA');
        await page.waitForTimeout(1000);

        await expect(container.locator('label:has-text("Tipo de actividad")')).toBeVisible();
        await expect(container.locator('label:has-text("Organización propia")')).toBeVisible();
        await expect(container.locator('label:has-text("Detalle de actividad")')).toBeVisible();
        await expect(container.locator('label:has-text("Asistentes")')).toBeVisible();
        await expect(container.locator('label:has-text("Declaración de interés")')).toBeVisible();
        await expect(container.locator('label:has-text("Aporte otorgado")')).toBeVisible();
        await expect(container.locator('label:has-text("Detalle de aporte")')).toBeVisible();
        await expect(container.locator('label:has-text("Datos de responsable")')).toBeVisible();
        await expect(container.locator('label:has-text("Observaciones")')).toBeVisible();

        // 4.2 DECLARACION DE INTERES - 11 campos
        console.log('[TEST] Validando campos de DECLARACION DE INTERES...');
        await container.locator('select').first().selectOption('DECLARACION DE INTERES');
        await page.waitForTimeout(1000);

        await expect(container.locator('label:has-text("Nombre de objeto")')).toBeVisible();
        await expect(container.locator('label:has-text("Tipo de evento")')).toBeVisible();
        await expect(container.locator('label:has-text("Detalle de actividad")')).toBeVisible();
        await expect(container.locator('label:has-text("Localidad")')).toBeVisible();
        await expect(container.locator('label:has-text("Fecha")')).toBeVisible();
        await expect(container.locator('label:has-text("Hora")')).toBeVisible();
        await expect(container.locator('label:has-text("Dirección de evento")')).toBeVisible();
        await expect(container.locator('label:has-text("Fundamentos de declaración")')).toBeVisible();
        await expect(container.locator('label:has-text("Nota o folleto")')).toBeVisible();
        await expect(container.locator('label:has-text("Observaciones")')).toBeVisible();
        await expect(container.locator('label:has-text("Datos de responsable")')).toBeVisible();

        // 4.3 OTRA - 3 campos
        console.log('[TEST] Validando campos de OTRA...');
        await container.locator('select').first().selectOption('OTRA');
        await page.waitForTimeout(1000);

        await expect(container.locator('label:has-text("Descripción corta")')).toBeVisible();
        await expect(container.locator('label:has-text("Detalle de resolución")')).toBeVisible();
        await expect(container.locator('label:has-text("Adjuntos adicionales")')).toBeVisible();
    });

    // ========================================================
    // Caso de Prueba 5.1: Carga, persistencia y visualización de archivos
    // ========================================================
    test('5. Persistencia y subida de archivos en campos dinámicos', async ({ page }) => {
        test.setTimeout(90000);

        // 1. Crear solicitud inicial
        await login(page, 'celestesolari19@gmail.com', 'Celeste_SGP_2026#');
        await page.goto('/mis-solicitudes');
        await page.click('button:has-text("Nueva Solicitud")');
        
        const solicitanteUnico = `Persistencia Archivo ${idUnico}`;
        await page.locator('label:has-text("Nombre Completo") + input').fill(solicitanteUnico);
        await page.locator('label:has-text("Tel") + input').first().fill('3424001122');
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill('Prueba de persistencia de archivos 6.2');
        
        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=creada con éxito')).toBeVisible();
        await page.click('button:has-text("Salir")');

        // 2. Entrar como Admin, abrir la solicitud, configurar SUBSIDIO Personal y subir archivo
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.goto('/mis-solicitudes');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', solicitanteUnico);
        await page.waitForTimeout(1000);

        const fila = page.locator('tbody tr').filter({ hasText: solicitanteUnico }).first();
        await expect(fila).toBeVisible();
        await fila.locator('button[title="Ver / Editar Detalles"]').click();
        await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeVisible();

        // Configurar Zona y Responsable
        await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
        await page.waitForTimeout(500);
        await page.locator('label:has-text("Responsable") + select').selectOption({ index: 1 });

        // Agregar asignación
        await page.click('button:has-text("Agregar")');
        const container = page.locator('div.bg-indigo-900\\/10 div.group').first();
        await expect(container).toBeVisible();
        await container.locator('select').first().selectOption('SUBSIDIO');
        await page.waitForTimeout(1000);

        // Seleccionar Personal y completar
        await container.locator('label:has-text("Tipo de pedido") + select').selectOption('Personal');
        await page.waitForTimeout(500);
        await container.locator('label:has-text("Fin") + select').selectOption({ index: 1 });
        await container.locator('label:has-text("Nombre y apellido") + input').fill(solicitanteUnico);

        // Guardar primero la solicitud (obligatorio antes de poder subir archivos dinámicos)
        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=Solicitud actualizada')).toBeVisible();
        await page.waitForTimeout(1500);

        // Volver a abrir la solicitud para subir el archivo
        await page.fill('input[placeholder*="Buscar por N° Orden"]', solicitanteUnico);
        await page.waitForTimeout(1000);
        await fila.locator('button[title="Ver / Editar Detalles"]').click();
        await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeVisible();

        // Buscar el input de Constancia de CBU y subir el archivo dummy
        const containerReopened = page.locator('div.bg-indigo-900\\/10 div.group').first();
        const fileInput = containerReopened.locator('label:has-text("Constancia de CBU") + div input[type="file"]');
        await fileInput.setInputFiles(dummyFilePath);
        await page.waitForTimeout(2000); // Esperar que suba

        // Guardar la solicitud con el archivo
        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=Solicitud actualizada')).toBeVisible();
        await page.waitForTimeout(1500);

        // 3. Reabrir por segunda vez y comprobar el enlace de descarga
        await page.fill('input[placeholder*="Buscar por N° Orden"]', solicitanteUnico);
        await page.waitForTimeout(1000);
        await fila.locator('button[title="Ver / Editar Detalles"]').click();
        await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeVisible();

        // Verificar que el enlace de descarga de CBU esté visible y contenga la URL esperada
        const downloadLink = containerReopened.locator('label:has-text("Constancia de CBU") + div a');
        await expect(downloadLink).toBeVisible();
        const href = await downloadLink.getAttribute('href');
        console.log('[TEST] Enlace de descarga encontrado:', href);
        expect(href).toContain('/api/solicitudes/adjuntos/');
        expect(href).toContain('/download');
    });

    // ========================================================
    // Caso de Prueba 6.1: Validación de Nombres de Estados
    // ========================================================
    test('6. Validación de Nombres de Estados en la UI (Mapeos)', async ({ page }) => {
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        
        // 6.1 Ir a /mis-solicitudes
        await page.goto('/mis-solicitudes');
        await page.waitForTimeout(1000);

        // Crear una solicitud en estado pendiente
        const solicitanteEstado = `Estado Mapeo ${idUnico}`;
        await page.click('button:has-text("Nueva Solicitud")');
        await page.locator('label:has-text("Nombre Completo") + input').fill(solicitanteEstado);
        await page.locator('label:has-text("Tel") + input').first().fill('3424001122');
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill('Prueba de mapeo de estados');
        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=creada con éxito')).toBeVisible();

        // Buscarla y verificar que diga "Pendiente" en singular
        await page.fill('input[placeholder*="Buscar por N° Orden"]', solicitanteEstado);
        await page.waitForTimeout(1000);
        const fila = page.locator('tbody tr').filter({ hasText: solicitanteEstado }).first();
        await expect(fila).toContainText('Pendiente');
        await expect(fila).not.toContainText('Pendientes');

        // Editarla y cambiar el estado a "Asignadas" (en proceso en DB)
        await fila.locator('button[title="Ver / Editar Detalles"]').click();
        await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeVisible();

        // Cambiar estado a "Asignadas"
        const selectEstado = page.locator('label:has-text("Estado") + select');
        await selectEstado.selectOption({ label: 'Asignadas' });
        
        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=Solicitud actualizada')).toBeVisible();
        await page.waitForTimeout(1500);

        // Buscarla de nuevo y verificar que el estado en la tabla sea "Asignadas"
        await page.fill('input[placeholder*="Buscar por N° Orden"]', solicitanteEstado);
        await page.waitForTimeout(1000);
        const filaAsignada = page.locator('tbody tr').filter({ hasText: solicitanteEstado }).first();
        await expect(filaAsignada).toContainText('Asignadas');

        // Ir al Dashboard
        await page.goto('/dashboard');
        await page.waitForTimeout(1000);

        // Las tarjetas métricas del dashboard deben usar "Pendiente", "Asignadas" o "Resueltas"
        await expect(page.locator('p:has-text("Pendiente")')).toBeVisible();
    });
});
