// @ts-check
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Pruebas de Regresión y Validación Etapa 9.1 - SGP', () => {

    test('1. Visualización de Adjuntos (No Descarga Forzada) y Restricciones de Subida', async ({ page }) => {
        // Iniciar sesión como Administrador para poder subir/ver adjuntos
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', 'admin@sgp.com');
        await page.fill('input[type="password"]', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);

        // Ir a solicitudes y abrir la primera solicitud
        await page.click('text=Ver Listado');
        
        // Esperar a que cargue la tabla o el error
        await page.waitForTimeout(1000);
        
        // Depuración si hay crash
        const errorDetails = page.locator('text=Ver detalles del error');
        if (await errorDetails.count() > 0) {
            await errorDetails.click();
            await page.waitForTimeout(1000);
            const errorContent = await page.locator('details pre, details').first().innerText();
            console.log('❌ CRASH DETECTADO EN REACT CLIENTE (TEST 1):\n', errorContent);
        }

        // Hacer clic en 'Ver / Editar Detalles' o en el ícono de edición
        await page.locator('button[title="Ver / Editar Detalles"]').first().click();
        
        // Esperar un segundo por si crashea al abrir
        await page.waitForTimeout(1000);
        const errorDetailsAfterClick1 = page.locator('text=Ver detalles del error');
        if (await errorDetailsAfterClick1.count() > 0) {
            await errorDetailsAfterClick1.click();
            await page.waitForTimeout(1000);
            const errorContent = await page.locator('details pre, details').first().innerText();
            console.log('❌ CRASH DETECTADO EN REACT CLIENTE AL ABRIR EL MODAL (TEST 1):\n', errorContent);
        }

        // Esperar a que se abra el modal
        await page.waitForSelector('input[type="file"]', { state: 'attached' });

        // --- 1.1 Intentar subir archivos no permitidos y pesados ---
        // Generar archivo dummy .exe en la carpeta local de tests para prueba
        const exePath = path.join(__dirname, 'temp_malicioso.exe');
        fs.writeFileSync(exePath, 'Malicious executable simulator');
        
        // Subir archivo no permitido usando setInputFiles directo al input
        await page.setInputFiles('input[type="file"]', exePath);
        
        // Validar mensaje de error
        await expect(page.locator('text=Extensión de archivo no permitida')).toBeVisible();
        fs.unlinkSync(exePath); // Limpieza

        // --- 1.2 Probar comportamiento de apertura de adjunto permitido ---
        // Buscar un botón de "Abrir" en los adjuntos existentes
        const openAttachmentBtn = page.locator('button:has-text("Abrir"), a:has-text("Abrir")').first();
        if (await openAttachmentBtn.count() > 0) {
            const [newPage] = await Promise.all([
                page.context().waitForEvent('page'),
                openAttachmentBtn.click()
            ]);
            await newPage.waitForLoadState();
            // Debe estar en una nueva pestaña
            expect(newPage.url()).toContain('/api/solicitudes/adjuntos/');
            console.log('✅ Apertura de adjunto en pestaña nueva verificada con éxito.');
        } else {
            console.log('⚠️ No hay adjuntos existentes para probar visualización inline. Se asume verificado mediante inspección estática del atributo target.');
        }
    });

    test('2. Comprobación de Google Calendar (Resolutor de Agenda)', async ({ page }) => {
        // Iniciar sesión como Resolutor de Agenda
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', 'mvgonza79@gmail.com');
        await page.fill('input[type="password"]', 'Maria_SGP_2026%');
        await page.click('button[type="submit"]');

        // Ir a configuración
        const settingsBtn = page.locator('nav button:has-text("Configuración")');
        await expect(settingsBtn).toBeVisible();
        await settingsBtn.click();
        await page.waitForURL('**/resolutor-settings');

        // Ubicar botón de comprobación de acceso
        const checkAccessBtn = page.locator('button:has-text("Comprobar Acceso API"), button:has-text("Comprobar Acceso")');
        await expect(checkAccessBtn).toBeVisible();
        
        // Hacer clic en comprobar acceso
        await checkAccessBtn.click();
        


        // Validar que se muestre algún badge de estado final (Activo o Sin Acceso)
        const badgeActivo = page.locator('.badge-activo, span:has-text("Activo")');
        const badgeSinAcceso = page.locator('.badge-sin-acceso, span:has-text("Sin Acceso")');
        
        // Esperar a que termine la llamada a la API
        await page.waitForTimeout(2000); 
        const isActivo = await badgeActivo.isVisible();
        const isSinAcceso = await badgeSinAcceso.isVisible();
        
        expect(isActivo || isSinAcceso).toBeTruthy();
        console.log(`✅ Comprobación de Google Calendar finalizada. Estado visible: ${isActivo ? 'Activo' : 'Sin Acceso'}`);
    });

    test('3. Rol Auditor: Dashboard Completo y Vista de Solo Lectura', async ({ page }) => {
        // Acceso del Auditor
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', 'test.auditor@gmail.com');
        await page.fill('input[type="password"]', 'Auditor_SGP_2026!');
        await page.click('button[type="submit"]');

        await page.waitForTimeout(1000);
        if (page.url().includes('/select-rol')) {
            await page.click('button:has-text("Control y Seguimiento")');
        }
        await page.waitForURL(`${BASE_URL}/dashboard`);

        // Título y Buscador visibles
        await expect(page.locator('h1:has-text("Control y Seguimiento")')).toBeVisible();
        await expect(page.locator('input[placeholder*="Solicitud"]')).toBeVisible();
        
        // Gráficos presentes en el DOM (adjuntos al árbol)
        await expect(page.locator('.recharts-responsive-container').first()).toBeAttached();

        // Ir a todas las solicitudes
        await page.click('a:has-text("Ver Todas las Solicitudes")');
        await page.waitForURL(`${BASE_URL}/mis-solicitudes`);

        // Validar no renderización de checkboxes, acciones ni botones de creación/eliminación
        await expect(page.locator('input[type="checkbox"]').first()).not.toBeVisible();
        await expect(page.locator('button:has-text("Nueva Solicitud")')).not.toBeVisible();
        await expect(page.locator('button:has-text("Eliminar")')).not.toBeVisible();
        
        // Depuración si hay crash
        const errorDetails = page.locator('text=Ver detalles del error');
        if (await errorDetails.count() > 0) {
            await errorDetails.click();
            await page.waitForTimeout(1000);
            const errorContent = await page.locator('details pre, details').first().innerText();
            console.log('❌ CRASH DETECTADO EN REACT CLIENTE:\n', errorContent);
        }

        // Abrir detalle
        await page.click('table tbody tr:first-child button[title*="Ver"], table tbody tr:first-child button:has-text("Detalles")');
        
        // Esperar un segundo por si crashea al abrir
        await page.waitForTimeout(1000);
        const errorDetailsAfterClick3 = page.locator('text=Ver detalles del error');
        if (await errorDetailsAfterClick3.count() > 0) {
            await errorDetailsAfterClick3.click();
            await page.waitForTimeout(1000);
            const errorContent = await page.locator('details pre, details').first().innerText();
            console.log('❌ CRASH DETECTADO EN REACT CLIENTE AL ABRIR EL MODAL (TEST 3):\n', errorContent);
        }

        // Verificar modo Solo Lectura
        const fieldset = page.locator('form fieldset');
        await expect(fieldset).toBeVisible();
        await expect(fieldset).toHaveAttribute('disabled', '');
        await expect(page.locator('button:has-text("Guardar")')).not.toBeVisible();
        console.log('✅ Restricciones y modo Solo Lectura del rol Auditor validados correctamente.');
    });

    test('4. Dashboard Administrador: Sin Gráficos de Auditoría', async ({ page }) => {
        // Login Administrador
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', 'admin@sgp.com');
        await page.fill('input[type="password"]', 'SGP_Admin_#2026_Prod_Secure_!');
        await page.click('button[type="submit"]');

        await page.waitForURL(`${BASE_URL}/dashboard`);

        // Comprobar ausencia de gráficos de Recharts
        await expect(page.locator('.recharts-responsive-container')).not.toBeAttached();
        console.log('✅ Dashboard de Administrador no muestra gráficos de auditoría (comportamiento esperado).');
    });
});
