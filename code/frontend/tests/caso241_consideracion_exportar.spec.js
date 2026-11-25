import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const SCREENSHOT_DIR = 'C:\\Users\\fran\\.gemini\\antigravity\\brain\\149c553f-fbc9-4fc5-853e-1cb712c912b7';
const MARTIN_USER = { email: 'martinnocioni@gmail.com', pass: 'Martin_SGP_b7kP*' };

async function loginAsResolutor(page, email, password) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 });
    await page.waitForTimeout(500);

    if (page.url().includes('/select-rol')) {
        await page.getByTestId('select-role-resolutor').click();
        await page.waitForURL((url) => !url.pathname.includes('/select-rol'), { timeout: 15000 });
    }
}

test.describe('Resolutor Subsidio en Dinero: Botones unificados, tooltips, preview de importación y caso #241', () => {
    test('Flujo E2E completo de Martín Nocioni: botones, barra selectiva, modal preview y APIs', async ({ page }) => {
        test.setTimeout(90000);

        // Interceptar la llamada real de preview/import solo para redirigir a planilla de prueba local y no tocar prod Sheets
        await page.route('**/api/planilla-salida/import/preview', async (route) => {
            const req = route.request();
            const postData = req.postDataJSON() || {};
            postData.spreadsheetId = 'sheet-test-local-preview';
            await route.continue({ postData: JSON.stringify(postData) });
        });

        await loginAsResolutor(page, MARTIN_USER.email, MARTIN_USER.pass);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // 1. Verificar botones superiores unificados y sus tooltips
        const btnConsidExport = page.getByTestId('btn-consideracion-exportar-todos');
        const btnSoloExport = page.getByTestId('btn-solo-exportar-todos');
        const btnImport = page.getByTestId('btn-importar-planilla');

        await expect(btnConsidExport).toBeVisible({ timeout: 15000 });
        await expect(btnSoloExport).toBeVisible();
        await expect(btnImport).toBeVisible();

        expect(await btnConsidExport.getAttribute('title')).toContain('Consideración');
        expect(await btnSoloExport.getAttribute('title')).toContain('SIN modificar su estado');
        expect(await btnImport.getAttribute('title')).toContain('planilla externa');

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'subsidio_01_botones_superiores.png') });

        // 2. Seleccionar checkboxes de 2 filas y verificar barra flotante con botones unificados + tooltips
        const checkboxes = page.locator('tbody input[type="checkbox"]');
        await expect(checkboxes.first()).toBeVisible({ timeout: 10000 });
        await checkboxes.nth(0).check();
        await checkboxes.nth(1).check();

        await expect(page.getByTestId('btn-bulk-consideracion-exportar')).toBeVisible();
        await expect(page.getByTestId('btn-bulk-solo-exportar')).toBeVisible();
        await expect(page.getByTestId('btn-bulk-importar')).toBeVisible();
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'subsidio_02_barra_seleccion_masiva.png') });

        // 3. Hacer clic en "Importar Planilla" y validar el modal de previsualización (IDs + Confirmar / Cancelar)
        await btnImport.click();
        const modal = page.getByTestId('import-preview-modal');
        await expect(modal).toBeVisible({ timeout: 10000 });
        await expect(modal).toContainText('#241');
        await expect(page.getByTestId('btn-confirm-import')).toBeVisible();
        await expect(page.getByTestId('btn-cancel-import')).toBeVisible();
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'subsidio_03_modal_preview_import.png') });

        // Cancelar para no alterar el estado durante la captura
        await page.getByTestId('btn-cancel-import').click();
        await expect(modal).toBeHidden();

        // 4. Verificar APIs de caso #241 (consideracion + exportar solo sin cambiar estado)
        const exportRes = await page.evaluate(async (backendUrl) => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${backendUrl}/api/planilla-salida/export`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Active-Role': 'RESOLUTOR'
                },
                body: JSON.stringify({
                    spreadsheetId: 'sheet-test-caso241-bulk',
                    ids: [241, 163]
                })
            });
            return { status: res.status, body: await res.json() };
        }, BACKEND_URL);

        expect(exportRes.status).toBe(200);
        expect(exportRes.body?.count).toBe(2);
    });
});
