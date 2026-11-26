import { test, expect } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:/Users/fran/.gemini/antigravity/brain/149c553f-fbc9-4fc5-853e-1cb712c912b7';

/**
 * Inicia sesión con el email y contraseña indicados y espera la redirección fuera de /login.
 */
async function login(page, email, password) {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

test.describe('Exportación Unificada (Excel/CSV/Sheets) y Modal en Dos Columnas', () => {
    test('Admin: Exportar Excel/CSV respetando selección y modal en 2 columnas', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await login(page, 'admin@sgp.com', 'SGP_Admin_#J57f_Prod_Secure_!');

        await page.goto(`${BASE_URL}/mis-solicitudes`);
        await page.waitForSelector('tbody tr', { timeout: 15000 });
        await expect(page.locator('tbody button[title="Poner en Consideración"]')).toHaveCount(0);

        // 1. Abrir menú Exportar sin filas chequeadas
        const exportBtn = page.getByTestId('btn-exportar-menu');
        await expect(exportBtn).toBeVisible();
        await exportBtn.click();

        const dropdown = page.getByTestId('exportar-dropdown-menu');
        await expect(dropdown).toBeVisible();
        await expect(dropdown).toContainText('listada(s) en tabla');
        await expect(page.getByTestId('export-option-xlsx')).toBeVisible();
        await expect(page.getByTestId('export-option-csv')).toBeVisible();

        // 2. Descargar Excel (.xlsx) con todas las listadas
        const [xlsxDownload] = await Promise.all([
            page.waitForEvent('download'),
            page.getByTestId('export-option-xlsx').click()
        ]);
        expect(xlsxDownload.suggestedFilename()).toMatch(/^solicitudes_sgp_\d{4}-\d{2}-\d{2}\.xlsx$/);

        // 3. Seleccionar 2 filas con checkbox y verificar alcance + descarga CSV de 2 registros
        const checkboxes = page.locator('tbody tr input[type="checkbox"]');
        await checkboxes.nth(0).check();
        await checkboxes.nth(1).check();

        await expect(exportBtn).toContainText('2');
        await exportBtn.click();
        await expect(dropdown).toContainText('Alcance: 2 seleccionada(s)');

        await page.screenshot({
            path: `${ARTIFACTS_DIR}/ux_05_exportar_admin_seleccion.png`,
            fullPage: false
        });

        const [csvDownload] = await Promise.all([
            page.waitForEvent('download'),
            page.getByTestId('export-option-csv').click()
        ]);
        expect(csvDownload.suggestedFilename()).toMatch(/^solicitudes_sgp_\d{4}-\d{2}-\d{2}\.csv$/);
        const csvPath = await csvDownload.path();
        const csvContent = fs.readFileSync(csvPath, 'utf-8').trim();
        const csvLines = csvContent.split(/\r?\n/);
        // 1 línea de encabezados + 2 filas seleccionadas = 3 líneas (salvo saltos internos, mínimo 3)
        expect(csvLines.length).toBeGreaterThanOrEqual(3);

        // 4. Abrir modal de edición y verificar layout de 2 columnas lado a lado
        const editBtn = page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]');
        await editBtn.click();
        const twoColGrid = page.getByTestId('solicitud-modal-two-col');
        await expect(twoColGrid).toBeVisible({ timeout: 10000 });

        // Comprobar geométricamente que la columna derecha está a la derecha de la izquierda (misma altura Y, mayor X)
        const leftColBox = await twoColGrid.locator('> div').nth(0).boundingBox();
        const rightColBox = await twoColGrid.locator('> div').nth(1).boundingBox();
        expect(leftColBox).not.toBeNull();
        expect(rightColBox).not.toBeNull();
        expect(rightColBox.x).toBeGreaterThan(leftColBox.x + 200);

        await page.screenshot({
            path: `${ARTIFACTS_DIR}/ux_06_modal_dos_columnas.png`,
            fullPage: false
        });
    });

    test('Resolutor Subsidio en Dinero: Exportar unificado con Planilla Externa, Excel y CSV', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await login(page, 'martinnocioni@gmail.com', 'Martin_SGP_b7kP*');

        // Esperar al selector de perfiles y elegir Resolutor -> Subsidio en dinero
        await page.waitForSelector('text=Resolutor', { timeout: 15000 });
        await page.getByText('Resolutor', { exact: true }).click();
        await page.getByText('Subsidio en dinero', { exact: false }).first().click();
        await page.waitForURL((url) => !url.pathname.includes('/select-role'), { timeout: 15000 });

        if (!page.url().includes('/mis-solicitudes')) {
            await page.goto(`${BASE_URL}/mis-solicitudes`);
        }
        await page.waitForSelector('[data-testid="btn-exportar-menu"]', { timeout: 15000 });

        await expect(page.getByTestId('btn-consideracion-exportar-todos')).toBeVisible();
        // Verificar que NO existe el botón "Poner en Consideración" al final de las filas
        await expect(page.locator('tbody button[title="Poner en Consideración"]')).toHaveCount(0);

        // Verificar que al seleccionar 1 fila SÍ aparece el menú contextual flotante para Subsidio en Dinero
        const firstCheckbox = page.locator('tbody tr input[type="checkbox"]').first();
        if (await firstCheckbox.count() > 0) {
            await firstCheckbox.check();
            await expect(page.getByTestId('bulk-actions-bar')).toBeVisible();
            await firstCheckbox.uncheck();
        }

        await page.getByTestId('btn-exportar-menu').click();

        const dropdown = page.getByTestId('exportar-dropdown-menu');
        await expect(dropdown).toBeVisible();
        await expect(page.getByTestId('export-option-sheets')).toBeVisible();
        await expect(page.getByTestId('export-option-xlsx')).toBeVisible();
        await expect(page.getByTestId('export-option-csv')).toBeVisible();

        await page.screenshot({
            path: `${ARTIFACTS_DIR}/ux_07_exportar_resolutor_subsidio.png`,
            fullPage: false
        });
    });

    test('Resolutor Subsidio en Especie: sin menú contextual flotante ni planilla externa', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await login(page, 'martinnocioni@gmail.com', 'Martin_SGP_b7kP*');

        await page.waitForSelector('text=Resolutor', { timeout: 15000 });
        await page.getByText('Resolutor', { exact: true }).click();
        await page.getByText('Subsidio en especie', { exact: false }).first().click();
        await page.waitForURL((url) => !url.pathname.includes('/select-role'), { timeout: 15000 });

        if (!page.url().includes('/mis-solicitudes')) {
            await page.goto(`${BASE_URL}/mis-solicitudes`);
        }
        await page.waitForSelector('[data-testid="btn-exportar-menu"]', { timeout: 15000 });

        // No debe mostrar botón de Consideración ni Planilla Externa ni botón en fila
        await expect(page.getByTestId('btn-consideracion-exportar-todos')).toHaveCount(0);
        await expect(page.getByTestId('btn-importar-planilla')).toHaveCount(0);
        await expect(page.locator('tbody button[title="Poner en Consideración"]')).toHaveCount(0);

        // Al seleccionar una fila, NO debe aparecer la barra flotante contextual
        const firstCheckbox = page.locator('tbody tr input[type="checkbox"]').first();
        if (await firstCheckbox.count() > 0) {
            await firstCheckbox.check();
            await expect(page.getByTestId('bulk-actions-bar')).toHaveCount(0);
        }

        // En Exportar solo debe ofrecer Excel y CSV (sin Google Sheets)
        await page.getByTestId('btn-exportar-menu').click();
        await expect(page.getByTestId('export-option-sheets')).toHaveCount(0);
        await expect(page.getByTestId('export-option-xlsx')).toBeVisible();
        await expect(page.getByTestId('export-option-csv')).toBeVisible();
    });
});
