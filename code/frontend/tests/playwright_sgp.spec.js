import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Suite de pruebas de Playwright para validar el flujo E2E del Modelo KISS.
 * Pruebas obligatoriamente comentadas en español (Regla Global 1).
 */
test.describe('Validación E2E SGP: Ciclo de Vida y Planilla de Salida (KISS Model)', () => {
    test.describe.configure({ mode: 'serial' });

    const idUnico = Math.floor(Math.random() * 900000) + 100000;
    const descSimple = `Solicitud Simple E2E - ID ${idUnico}`;
    const descCompleja = `Solicitud Compleja E2E - ID ${idUnico}`;
    const nombreBeneficiario = `Beneficiario E2E ${idUnico}`;
    const dniBeneficiario = `20-${idUnico}-9`;
    
    // Archivos de prueba temporales
    const filePathFrente = path.join(__dirname, 'assets', `dni_frente_${idUnico}.png`);
    const filePathDorso = path.join(__dirname, 'assets', `dni_dorso_${idUnico}.png`);
    const filePathCbu = path.join(__dirname, 'assets', `cbu_${idUnico}.pdf`);

    test.beforeAll(() => {
        const assetsDir = path.join(__dirname, 'assets');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        // Crear archivos dummy con tamaño pequeño
        fs.writeFileSync(filePathFrente, 'Contenido DNI frente dummy');
        fs.writeFileSync(filePathDorso, 'Contenido DNI dorso dummy');
        fs.writeFileSync(filePathCbu, 'Contenido CBU dummy');
    });

    test.afterAll(() => {
        // Limpieza de archivos físicos temporales de prueba
        try {
            if (fs.existsSync(filePathFrente)) fs.unlinkSync(filePathFrente);
            if (fs.existsSync(filePathDorso)) fs.unlinkSync(filePathDorso);
            if (fs.existsSync(filePathCbu)) fs.unlinkSync(filePathCbu);
        } catch (e) {
            console.error("Error al eliminar los archivos temporales de prueba:", e);
        }
    });

    // Función auxiliar para iniciar sesión en SGP
    const iniciarSesion = async (page, email, password) => {
        await page.goto('/login');
        await page.locator('input[type="email"]').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.click('button:has-text("Ingresar")');
        await page.waitForURL(/.*(dashboard|mis-solicitudes|settings).*/, { timeout: 20000 });
        await page.waitForTimeout(1000);
    };

    test('Paso 1: Limpieza del sistema y base de datos (Admin)', async ({ page }) => {
        test.setTimeout(45000);
        console.log('[E2E SGP] Iniciando Paso 1: Limpieza general de la base de datos');
        
        await iniciarSesion(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.goto('/settings');

        // Hacer clic en la pestaña de Mantenimiento
        await page.locator('button:has-text("Mantenimiento")').click();
        await page.waitForTimeout(1000);

        // Completar formulario de limpieza de transacciones
        await page.locator('label:has-text("Contraseña del Administrador Actual") + input').fill('SGP_Admin_#2026_Prod_Secure_!');
        await page.locator('label:has-text("Confirmación de Seguridad") + input').fill('LIMPIAR');

        // Escuchar el cuadro de diálogo nativo confirm y aceptar
        page.once('dialog', dialog => dialog.accept());
        await page.click('button:has-text("EJECUTAR LIMPIEZA PERMANENTE")');

        // Validar mensaje de éxito de la limpieza
        await expect(page.locator('text=Limpieza de base de datos transaccional completada con éxito')).toBeVisible({ timeout: 10000 });
        console.log('[E2E SGP] Limpieza completada correctamente.');
    });

    test('Paso 2: Crear solicitud simple (Operador)', async ({ page }) => {
        test.setTimeout(45000);
        console.log('[E2E SGP] Iniciando Paso 2: Creando solicitud simple');

        await iniciarSesion(page, 'celestesolari19@gmail.com', 'Celeste_SGP_2026#');
        await page.goto('/mis-solicitudes');
        await page.click('button:has-text("Nueva Solicitud")');

        // Llenar campos con datos aleatorios
        await page.locator('label:has-text("Nombre Completo / Institución") + input').fill(`Solicitante Simple ${idUnico}`);
        await page.locator('label:has-text("Teléfono") + input').first().fill('3424000111');
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descSimple);
        await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Club');
        await page.locator('input[placeholder*="Ej: Santa Fe"]').fill('Santa Fe');
        await page.locator('input[placeholder*="Ej: Santa Fe"]').press('Tab');
        
        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=creada con éxito')).toBeVisible();
        console.log('[E2E SGP] Solicitud simple creada exitosamente.');
    });

    test('Paso 3: Crear solicitud compleja básica (Operador)', async ({ page }) => {
        test.setTimeout(45000);
        console.log('[E2E SGP] Iniciando Paso 3: Creando solicitud compleja básica sin asignaciones');

        await iniciarSesion(page, 'celestesolari19@gmail.com', 'Celeste_SGP_2026#');
        await page.goto('/mis-solicitudes');
        await page.click('button:has-text("Nueva Solicitud")');

        // Completar campos comunes de la solicitud compleja
        await page.locator('label:has-text("Nombre Completo / Institución") + input').fill(nombreBeneficiario);
        await page.locator('label:has-text("Teléfono") + input').first().fill('3424998877');
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descCompleCompleja(descCompleja));
        await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
        await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');
        await page.locator('input[placeholder*="Ej: Santa Fe"]').fill('Santa Fe');
        await page.locator('input[placeholder*="Ej: Santa Fe"]').press('Tab');
        
        // En la versión 1.0, las solicitudes nuevas siempre se crean como PEDIDO y no se muestra el campo Tipo ni Monto en creación.

        // Guardar solicitud
        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=creada con éxito')).toBeVisible();
        console.log('[E2E SGP] Solicitud compleja básica guardada exitosamente.');
    });

    test('Paso 4: Asignar Responsable y Zona (Distribuidor)', async ({ page }) => {
        test.setTimeout(45000);
        console.log('[E2E SGP] Iniciando Paso 4: Asignando Responsable y Zona');

        await iniciarSesion(page, 'matias.ippolito@gmail.com', 'Matias_Dist_SGP_2026!');
        await page.goto('/mis-solicitudes');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiario);
        await page.waitForTimeout(1000);

        await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
        await page.waitForTimeout(1000);

        // Asignar zona y responsable
        await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
        await page.waitForTimeout(500);
        await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });

        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=Solicitud actualizada con éxito')).toBeVisible();
        console.log('[E2E SGP] Responsable y Zona asignados correctamente.');
    });

    test('Paso 5: Derivar y Completar Asignaciones Múltiples con Adjuntos (Responsable)', async ({ page }) => {
        test.setTimeout(120000);
        console.log('[E2E SGP] Iniciando Paso 5: Creando asignaciones múltiples y subiendo archivos de soporte como Responsable');

        await iniciarSesion(page, 'matias.ippolito.responsable@gmail.com', 'Matias_Resp_SGP_2026!');
        await page.goto('/mis-solicitudes');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiario);
        await page.waitForTimeout(1000);

        // Abrir detalles
        await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
        await page.waitForTimeout(1000);

        // 1. Agregar Resolución del tipo SUBSIDIO
        await page.click('button:has-text("Agregar")');
        await page.waitForTimeout(500);
        await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
        await page.waitForTimeout(500);

        // Completar campos específicos de SUBSIDIO usando contenedores basados en etiquetas
        await page.locator('label:has-text("Tipo de pedido")').locator('..').locator('select').selectOption('Personal');
        await page.locator('label:has-text("Nombre y apellido")').locator('..').locator('input').fill(nombreBeneficiario);
        await page.locator('label:text-is("DNI")').locator('..').locator('input').fill(dniBeneficiario);
        await page.locator('label:has-text("Dirección de DNI")').locator('..').locator('input').fill('Calle Falsa 123 - Santa Fe');

        // Cargar archivos físicos de soporte con locadores por etiqueta
        console.log('[E2E SGP] Subiendo archivo DNI frente...');
        await page.locator('label:has-text("DNI frente")').locator('..').locator('input[type="file"]').setInputFiles(filePathFrente);
        await page.waitForTimeout(3000);

        console.log('[E2E SGP] Subiendo archivo DNI dorso...');
        await page.locator('label:has-text("DNI dorso")').locator('..').locator('input[type="file"]').setInputFiles(filePathDorso);
        await page.waitForTimeout(3000);

        console.log('[E2E SGP] Subiendo archivo Constancia de CBU...');
        await page.locator('label:has-text("Constancia de CBU")').locator('..').locator('input[type="file"]').setInputFiles(filePathCbu);
        await page.waitForTimeout(3000);

        // 2. Agregar Resolución del tipo AGENDA
        await page.click('button:has-text("Agregar")');
        await page.waitForTimeout(500);
        // Seleccionamos el último selector de área agregado
        await page.locator('select:has-text("Seleccione Área...")').last().selectOption('AGENDA');
        await page.waitForTimeout(500);

        // Completar campos específicos de AGENDA
        await page.locator('input[type="date"]').last().fill('2026-08-15');
        await page.locator('label:has-text("Declaración de interés")').locator('..').locator('select').selectOption('si');
        await page.locator('label:has-text("Observaciones")').locator('..').locator('textarea').fill('Coordinación de presupuesto y entrega de insumos de emprendimiento.');

        // Guardar cambios
        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=Solicitud actualizada con éxito')).toBeVisible();
        console.log('[E2E SGP] Asignaciones múltiples configuradas y archivos de soporte subidos correctamente.');
    });

    test('Paso 6: Puesta en consideración e integración con Google Sheets (Resolutor)', async ({ page }) => {
        test.setTimeout(90000);
        console.log('[E2E SGP] Iniciando Paso 6: Puesta en consideración y exportación preliminar a Google Sheets');

        await iniciarSesion(page, 'martinnocioni@gmail.com', 'Martin_SGP_2026*');
        await page.goto('/mis-solicitudes');

        // Asociar la planilla real si no estuviese asociada
        console.log('[E2E SGP] Asociando planilla de salida');
        await page.click('button:has-text("Asociar Planilla")');
        await page.waitForSelector('h3:has-text("Asociar Planilla Externa")');
        await page.locator('input[placeholder*="Ej: 1jPw9ni4BW"]').fill('1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g');
        await page.locator('label:has-text("Nombre de la Hoja") + input').fill('TEST');
        await page.locator('form button[type="submit"]:has-text("Asociar Planilla")').click();
        await expect(page.locator('text=Planilla asociada correctamente')).toBeVisible();
        await page.waitForTimeout(1000);

        // Buscar solicitud y poner en consideración
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiario);
        await page.waitForTimeout(1000);

        // Obtener el ID de la solicitud
        const rowText = await page.locator('tbody tr').first().innerText();
        const idMatch = rowText.match(/#(\d+)/);
        const solicitudId = idMatch ? idMatch[1] : null;
        expect(solicitudId).not.toBeNull();
        console.log(`[E2E SGP] ID de solicitud compleja detectado: ${solicitudId}`);

        page.once('dialog', dialog => dialog.accept());
        await page.locator('tbody tr').first().locator('button[title="Poner en Consideración"]').click();
        await expect(page.locator('text=puesta en consideración correctamente')).toBeVisible();
        await page.waitForTimeout(1500);

        // Exportar a la planilla
        console.log('[E2E SGP] Exportando fila a Google Sheets...');
        await page.locator('button:has-text("Exportar Planilla")').click();
        await expect(page.locator('text=Sincronización de exportación finalizada')).toBeVisible({ timeout: 20000 });
        await page.waitForTimeout(2000);

        // Simular cambios en la planilla externa llamando al backend helper
        console.log('[E2E SGP] Simulando modificación de datos en la planilla de Google Sheets...');
        const modifiedDesc = `Descripción modificada en planilla externa E2E - ID ${idUnico}`;
        const modifyResponse = await page.request.post('/api/test-helper/modify-solicitud-row', {
            data: {
                spreadsheetId: '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g',
                sheetName: 'TEST',
                solicitudId: solicitudId,
                columnName: 'Descripción',
                newValue: modifiedDesc
            }
        });
        expect(modifyResponse.ok()).toBeTruthy();

        const modifyAmountResponse = await page.request.post('/api/test-helper/modify-solicitud-row', {
            data: {
                spreadsheetId: '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g',
                sheetName: 'TEST',
                solicitudId: solicitudId,
                columnName: 'Monto en dinero',
                newValue: '225000'
            }
        });
        expect(modifyAmountResponse.ok()).toBeTruthy();
        console.log('[E2E SGP] Simulación de planilla completada.');

        // Importar los cambios al sistema
        console.log('[E2E SGP] Importando cambios de la planilla a SGP...');
        await page.locator('button:has-text("Importar Planilla")').click();
        await expect(page.locator('text=Sincronización de importación finalizada')).toBeVisible({ timeout: 20000 });
        await page.waitForTimeout(1500);

        // Verificar cambios en el modal
        console.log('[E2E SGP] Verificando que la descripción y el monto se actualizaron...');
        await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
        await page.waitForTimeout(1000);

        const currentDesc = await page.locator('label:has-text("Descripción / Pedido") + textarea').inputValue();
        const currentAmount = await page.locator('label:has-text("Monto") + input').first().inputValue();
        
        expect(currentDesc).toBe(modifiedDesc);
        expect(currentAmount).toBe('225000');
        console.log('[E2E SGP] Cambios de importación validados correctamente en la interfaz.');

        await page.click('button:has-text("Cancelar")');
        await page.waitForTimeout(500);

        // Ejecutar la exportación definitiva
        console.log('[E2E SGP] Ejecutando exportación definitiva...');
        await page.locator('button:has-text("Exportar Planilla")').click();
        await expect(page.locator('text=Sincronización de exportación finalizada')).toBeVisible({ timeout: 20000 });
        console.log('[E2E SGP] Exportación definitiva concluida.');

        // Purgar todos los demás datos dejando solo este caso testigo
        console.log('[E2E SGP] Ejecutando purga final de base de datos dejando sólo la solicitud testigo ID: ' + solicitudId);
        const purgeResponse = await page.request.post('/api/test-helper/keep-only-witness', {
            data: {
                keepId: solicitudId
            }
        });
        expect(purgeResponse.ok()).toBeTruthy();
        console.log('[E2E SGP] Limpieza exitosa. Test completado.');
    });
});

function descCompleCompleja(base) {
    return `${base}. Esta es una solicitud compleja utilizada para validar el flujo completo unificado de múltiples resolutores.`;
}
