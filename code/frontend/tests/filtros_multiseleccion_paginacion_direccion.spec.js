import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = 'C:\\Users\\fran\\.gemini\\antigravity\\brain\\149c553f-fbc9-4fc5-853e-1cb712c912b7';
const ADMIN_USER = { email: 'admin@sgp.com', pass: 'SGP_Admin_#J57f_Prod_Secure_!' };

test.describe('UX: Filtros multi-selección, paginación 10/50/100/500, Dirección, autocompletado y truncado 2 líneas', () => {
    test('Valida E2E los 5 requerimientos en local con capturas', async ({ page }) => {
        test.setTimeout(90000);

        // 1. Login como Admin y navegar a Mis Solicitudes
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload({ waitUntil: 'domcontentloaded' });

        await page.locator('input[type="email"]').fill(ADMIN_USER.email);
        await page.locator('input[type="password"]').fill(ADMIN_USER.pass);
        await page.locator('button[type="submit"]').click();
        await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });

        await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(800);

        // 2. Probar selector de largo de tabla (10 -> 50)
        const rowsSelect = page.getByTestId('rows-per-page-select');
        await expect(rowsSelect).toBeVisible({ timeout: 15000 });
        await rowsSelect.selectOption('50');
        await page.waitForTimeout(1000);
        const rowCount50 = await page.locator('tbody tr').count();
        expect(rowCount50).toBeGreaterThan(10);

        // 3. Probar truncado de "Detalles de Resolución" a 2 renglones + tooltip
        const clampedDetails = page.getByTestId('resolucion-detail-clamped').first();
        await expect(clampedDetails).toBeVisible({ timeout: 10000 });
        const titleAttr = await clampedDetails.getAttribute('title');
        expect(titleAttr && titleAttr.length > 0).toBe(true);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ux_02_tabla_truncado_2_renglones.png') });

        // 4. Probar filtros avanzados con selección múltiple (2 Estados)
        await page.locator('button[title*="filtros avanzados"]').click();
        const statusTrigger = page.getByTestId('filter-status-trigger');
        await expect(statusTrigger).toBeVisible();
        await statusTrigger.click();
        await page.getByTestId('filter-status-opt-pendiente').click();
        await page.getByTestId('filter-status-opt-en resolucion').click();
        await expect(statusTrigger).toContainText('2 seleccionados');
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ux_01_filtros_multiseleccion_y_paginacion.png') });

        // Cerrar dropdown
        await statusTrigger.click();

        // 5. Probar campo Dirección y autocompletado al agregar Tipo de Resolución
        await page.locator('button:has-text("Nueva Solicitud")').click();
        const dirInput = page.getByTestId('solicitud-direccion-input');
        await expect(dirInput).toBeVisible({ timeout: 10000 });

        await dirInput.fill('Bv. Gálvez 1540 - Club Unión');
        await page.getByTestId('solicitud-fecha-evento-input').fill('2026-12-15');
        await page.locator('textarea').first().fill('Evento cultural barrial con escenario');

        // Seleccionar Barrio si está disponible
        const barrioSelect = page.locator('select').filter({ hasText: 'Seleccione Barrio...' }).first();
        if (await barrioSelect.isVisible()) {
            const opts = await barrioSelect.locator('option').count();
            if (opts > 1) {
                await barrioSelect.selectOption({ index: 1 });
            }
        }

        // Agregar resolución y seleccionar AGENDA
        const addResBtn = page.locator('button:has-text("Agregar")').first();
        await expect(addResBtn).toBeVisible({ timeout: 10000 });
        await addResBtn.click();
        await page.waitForTimeout(300);

        const areaSelect = page.locator('select').filter({ hasText: 'Seleccione Área...' }).last();
        await areaSelect.selectOption('AGENDA');
        await page.waitForTimeout(500);

        // Verificar que se autocompletó Descripción/temario con el texto de la solicitud
        const agendaValues = await page.locator('textarea').evaluateAll((els) => els.map((el) => el.value));
        expect(agendaValues.filter((v) => v.includes('Evento cultural barrial con escenario')).length).toBeGreaterThanOrEqual(2);
        await page.locator('label', { hasText: 'Descripción/temario' }).first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ux_03_direccion_y_autocompletado_agenda.png') });

        // Cambiar a DECLARACION DE INTERES y verificar que se autocompletó Dirección
        await areaSelect.scrollIntoViewIfNeeded();
        await areaSelect.selectOption('DECLARACION DE INTERES');
        await page.waitForTimeout(500);
        const inputValues = await page.locator('input[type="text"]').evaluateAll((els) => els.map((el) => el.value));
        expect(inputValues.filter((v) => v === 'Bv. Gálvez 1540 - Club Unión').length).toBeGreaterThanOrEqual(2);
        const dateValues = await page.locator('input[type="date"]').evaluateAll((els) => els.map((el) => el.value));
        expect(dateValues.filter((v) => v === '2026-12-15').length).toBeGreaterThanOrEqual(2);
        await page.locator('label', { hasText: 'Dirección' }).last().scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ux_04_autocompletado_declaracion.png') });
    });
});
