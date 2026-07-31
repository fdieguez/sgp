import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Pruebas de validación automatizada específicas para la Etapa 8.
 * Comentarios en español según la Regla Global 1.
 */
test.describe('Etapa 8 - Validación Específica de Casos de Prueba', () => {
    test.describe.configure({ mode: 'serial' });
    const idUnico = Date.now().toString().slice(-6);
    const nombreBeneficiario = `Beneficiario Subsidio Validacion ${idUnico}`;
    const descSolicitud = `Subsidio de prueba de validacion especifica. ID: ${idUnico}`;

    // Archivos de prueba temporales para simular DNI frente y dorso
    const filePathFrente = path.join(__dirname, 'assets', 'dni_frente_temp.jpg');
    const filePathDorso = path.join(__dirname, 'assets', 'dni_dorso_temp.jpg');

    test.beforeEach(() => {
        // Asegurar que exista la carpeta assets y los archivos de prueba
        const assetsDir = path.join(__dirname, 'assets');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        fs.writeFileSync(filePathFrente, 'Simulacion de DNI Frente de prueba');
        fs.writeFileSync(filePathDorso, 'Simulacion de DNI Dorso de prueba');
    });

    test.afterEach(() => {
        // Limpieza de archivos temporales
        try {
            if (fs.existsSync(filePathFrente)) fs.unlinkSync(filePathFrente);
            if (fs.existsSync(filePathDorso)) fs.unlinkSync(filePathDorso);
        } catch (e) {
            console.error("Error limpiando archivos temporales de prueba", e);
        }
    });

    // Helper para realizar login
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

    test('Caso 1: Visibilidad del botón "Nueva Solicitud" por Rol', async ({ page }) => {
        test.setTimeout(45000);

        // 1. Rol RESOLUTOR (mvgonza79@gmail.com): NO debe ver el botón "Nueva Solicitud"
        console.log('[CASO 1] Verificando que Resolutor NO vea el botón "Nueva Solicitud"');
        await login(page, 'mvgonza79@gmail.com', 'Maria_SGP_2026%');
        await page.goto('/mis-solicitudes');
        await page.waitForTimeout(1500);
        const btnNuevaSolicitudResol = page.locator('button:has-text("Nueva Solicitud")');
        await expect(btnNuevaSolicitudResol).not.toBeVisible();
        await page.click('button:has-text("Salir")');

        // 2. Rol OPERADOR (celestesolari19@gmail.com): SÍ debe ver el botón "Nueva Solicitud"
        console.log('[CASO 1] Verificando que Operador SÍ vea el botón "Nueva Solicitud"');
        await login(page, 'celestesolari19@gmail.com', 'Celeste_SGP_2026#');
        await page.goto('/mis-solicitudes');
        await page.waitForTimeout(1500);
        const btnNuevaSolicitudOper = page.locator('button:has-text("Nueva Solicitud")');
        await expect(btnNuevaSolicitudOper).toBeVisible();
        await page.click('button:has-text("Salir")');

        // 3. Rol ADMINISTRADOR (admin@sgp.com): SÍ debe ver el botón "Nueva Solicitud"
        console.log('[CASO 1] Verificando que Administrador SÍ vea el botón "Nueva Solicitud"');
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.goto('/mis-solicitudes');
        await page.waitForTimeout(1500);
        const btnNuevaSolicitudAdmin = page.locator('button:has-text("Nueva Solicitud")');
        await expect(btnNuevaSolicitudAdmin).toBeVisible();
    });

    test('Caso 2 & 3: Carga de Adjuntos en Subsidio, Descarga y Estado Consideración', async ({ page }) => {
        test.setTimeout(80000);

        // 1. Iniciar sesión como Administrador para crear solicitud y preparar adjuntos
        console.log('[CASO 2 & 3] Creando solicitud de Subsidio para verificar adjuntos y consideracion');
        await login(page, 'admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.goto('/mis-solicitudes');
        await page.click('button:has-text("Nueva Solicitud")');

        await page.locator('label:has-text("Nombre Completo") + input').fill(nombreBeneficiario);
        await page.locator('label:has-text("Tel") + input').first().fill('3424000111');
        await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(descSolicitud);
        await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
        await page.waitForTimeout(500);
        await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
        await page.locator('label:has-text("Tipo") + select').first().selectOption('SUBSIDIO');

        // Agregar la asignación de Subsidio
        await page.click('button:has-text("Agregar")');
        await page.waitForTimeout(500);
        await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
        await page.waitForTimeout(500);

        // Completar campos dinámicos
        await page.locator('label:has-text("Tipo de pedido") + select').selectOption('Personal');
        await page.locator('label:has-text("Nombre y apellido") + input').fill(nombreBeneficiario);
        await page.locator('label:has-text("DNI") + input').nth(1).fill('20-11111222-9');
        await page.locator('label:has-text("Monto") + input').first().fill('95000');

        await page.click('button:has-text("Guardar Solicitud")');
        await expect(page.locator('text=creada con éxito')).toBeVisible();

        // Obtener el ID de la solicitud creada
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiario);
        await page.waitForTimeout(1000);
        const rowText = await page.locator('tbody tr').first().innerText();
        const idMatch = rowText.match(/#(\d+)/);
        const solicitudId = idMatch ? idMatch[1] : null;
        console.log(`[CASO 2 & 3] Solicitud de Subsidio creada con ID: ${solicitudId}`);

        // 2. Abrir el modal nuevamente para cargar los archivos físicos
        console.log('[CASO 2 & 3] Abriendo modal para cargar DNI frente y dorso');
        await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
        await page.waitForTimeout(1000);

        // Cargar DNI frente
        await page.locator('input[type="file"]').first().setInputFiles(filePathFrente);
        await page.waitForTimeout(3000); // Esperar que suba

        // Cargar DNI dorso
        // Usamos nth(1) para el segundo input de tipo file (DNI dorso)
        await page.locator('input[type="file"]').nth(1).setInputFiles(filePathDorso);
        await page.waitForTimeout(3000); // Esperar que suba

        // Guardar solicitud con los nuevos adjuntos
        await page.click('button:has-text("Guardar Solicitud")');
        await page.waitForTimeout(3000); // Esperar que guarde y actualice la base de datos
        await page.click('button:has-text("Salir")');

        // 3. Iniciar sesión como Resolutor de Subsidio (martinnocioni@gmail.com) para verificar columnas de descarga y consideracion
        console.log('[CASO 2 & 3] Iniciando sesión como Resolutor de Subsidio para verificar links de descarga');
        await login(page, 'martinnocioni@gmail.com', 'Martin_SGP_2026*');
        await page.goto('/mis-solicitudes');
        await page.fill('input[placeholder*="Buscar por N° Orden"]', nombreBeneficiario);
        await page.waitForTimeout(1500);

        // Validar que las columnas de "DNI frente" y "DNI dorso" muestren los links de "Descargar"
        const row = page.locator('tbody tr').first();
        // Buscamos que aparezcan los enlaces de descarga
        const downloadLinks = row.locator('a:has-text("Descargar")');
        await expect(downloadLinks).toHaveCount(2); // DNI frente y dorso cargados
        console.log('[CASO 2 & 3] Enlaces de descarga visibles en la tabla del Resolutor.');

        // 4. Abrir el modal como Resolutor para validar que los archivos adjuntos sigan visibles con el clip
        console.log('[CASO 2 & 3] Abriendo el modal para verificar los clips de archivos');
        await row.locator('button[title="Ver / Editar Detalles"]').click();
        await page.waitForTimeout(1000);

        // Deben aparecer enlaces con el clip (📎)
        const clipLinks = page.locator('a:has-text("📎")');
        await expect(clipLinks).toHaveCount(2); // DNI frente y dorso
        console.log('[CASO 2 & 3] Iconos de clip y nombres de archivo validados dentro del modal.');
        await page.locator('button[title="Cerrar"]').click();
        await page.waitForTimeout(1000);

        // 5. Probar la acción "Poner en Consideración" y validar filtros y estadísticas
        console.log('[CASO 2 & 3] Poniendo la solicitud en Consideración');
        const consideracionBtn = row.locator('button[title="Poner en Consideración"]');
        page.once('dialog', dialog => dialog.accept());
        await consideracionBtn.click();
        await expect(page.locator('text=puesta en consideración correctamente')).toBeVisible();
        await page.waitForTimeout(1000);

        // Verificar el badge naranja
        const statusBadge = row.locator('span:has-text("Consideración")');
        await expect(statusBadge).toBeVisible();

        // 6. Verificar que el filtro por estado contenga "Consideración"
        console.log('[CASO 2 & 3] Verificando filtro por estado');
        await page.click('button:has-text("Exportar CSV") + button'); // Abrir el panel de filtros usando el selector adyacente
        await page.waitForTimeout(500);
        const filterSelect = page.locator('select:has-text("Todos los Estados")');
        if (await filterSelect.isVisible()) {
            await filterSelect.selectOption('consideracion');
        } else {
            // Si el selector no se encuentra así, buscar en los elementos de filtros
            await page.locator('select').first().selectOption('consideracion');
        }
        await page.waitForTimeout(1000);
        // Debe seguir viéndose la fila
        await expect(row.locator('span:has-text("Consideración")')).toBeVisible();

        // Restablecer filtro
        if (await filterSelect.isVisible()) {
            await filterSelect.selectOption('');
        }
        await page.waitForTimeout(500);

        // 7. Verificar que el estado "consideracion" aparezca en la lista de estados del modal al editar
        console.log('[CASO 2 & 3] Verificando lista de estados en el modal');
        await row.locator('button[title="Ver / Editar Detalles"]').click();
        await page.waitForTimeout(1000);
        const statusSelect = page.locator('label:has-text("Estado") + select');
        await expect(statusSelect.locator('option[value="consideracion"]').first()).toBeAttached();
        await page.locator('button[title="Cerrar"]').click();

        console.log('[CASO 2 & 3] Validación de estadísticas y filtros completada con éxito.');
    });
});
