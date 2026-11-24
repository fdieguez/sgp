import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = 'C:\\Users\\fran\\.gemini\\antigravity\\brain\\149c553f-fbc9-4fc5-853e-1cb712c912b7';

const ADMIN_USER = { email: 'admin@sgp.com', pass: 'SGP_Admin_#J57f_Prod_Secure_!' };
const MENTIONED_USER = {
    email: 'celeste_solari19@hotmail.com',
    pass: 'Celeste_SGP_Npg8#',
    handle: 'celeste_solari19'
};

async function login(page, email, password) {
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
        await page.locator('.grid button').first().click();
        await page.waitForURL((url) => !url.pathname.includes('/select-rol'), { timeout: 15000 });
    }
}

test.describe('US-01: Notificaciones In-App y Menciones (@)', () => {
    test('Flujo E2E completo: autocompletado @, creación de notificación, campanita y navegación directa', async ({ page }) => {
        test.setTimeout(90000);

        // 1. Limpiar notificaciones previas del usuario mencionado para validar conteo exacto
        await login(page, MENTIONED_USER.email, MENTIONED_USER.pass);
        const bellBtnInitial = page.getByTestId('notification-bell-btn');
        await expect(bellBtnInitial).toBeVisible();
        await bellBtnInitial.click();
        const markAllBtn = page.getByTestId('mark-all-read-btn');
        if (await markAllBtn.isEnabled()) {
            await markAllBtn.click();
            await page.waitForTimeout(500);
        }

        // 2. Iniciar sesión como ADMIN y abrir una solicitud existente
        await login(page, ADMIN_USER.email, ADMIN_USER.pass);
        await page.waitForLoadState('networkidle');

        const firstSolicitudId = await page.evaluate(async () => {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8080/api/solicitudes?size=1', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            return data?.content?.[0]?.id || null;
        });
        expect(firstSolicitudId).not.toBeNull();

        await page.evaluate((solId) => {
            window.dispatchEvent(new CustomEvent('sgp:open-solicitud-notificacion', { detail: { solicitudId: solId } }));
        }, firstSolicitudId);

        const input = page.getByTestId('seguimiento-input');
        await expect(input).toBeVisible({ timeout: 15000 });

        // 3. Escribir '@' y parte del nombre para probar el autocompletado
        await input.click();
        await input.type('Hola @celes', { delay: 40 });

        const suggestions = page.getByTestId('mention-suggestions');
        await expect(suggestions).toBeVisible({ timeout: 10000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_autocomplete_menciones.png') });

        // Seleccionar a Celeste
        const option = page.getByTestId(`mention-option-${MENTIONED_USER.handle}`);
        await expect(option).toBeVisible();
        await option.click();

        const uniqueText = `por favor revisar esta solicitud (${Date.now()})`;
        await input.type(uniqueText, { delay: 20 });
        await page.getByTestId('seguimiento-send-btn').click();

        // Verificar que aparece en el historial con mención resaltada
        await expect(page.locator(`text=${uniqueText}`)).toBeVisible({ timeout: 10000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_nota_con_mencion_resaltada.png') });

        // 4. Iniciar sesión como el usuario mencionado y verificar la campanita + badge
        await login(page, MENTIONED_USER.email, MENTIONED_USER.pass);
        const badge = page.getByTestId('notification-badge');
        await expect(badge).toBeVisible({ timeout: 15000 });
        await expect(badge).toHaveText('1');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_campanita_badge_no_leidas.png') });

        // 5. Abrir popover de notificaciones
        await page.getByTestId('notification-bell-btn').click();
        const popover = page.getByTestId('notification-popover');
        await expect(popover).toBeVisible();
        await expect(popover).toContainText(`#${firstSolicitudId}`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_popover_notificaciones.png') });

        // 6. Hacer clic en la notificación no leída -> debe marcar como leída y abrir el modal en Notas Seguimiento
        const notifItem = popover.locator('[data-testid^="notification-item-"]').first();
        await notifItem.click();

        // El badge debe desaparecer porque quedó en 0
        await expect(badge).toBeHidden({ timeout: 10000 });

        // El modal debe abrirse automáticamente en la pestaña Notas Seguimiento mostrando el comentario
        await expect(page.getByTestId('seguimiento-input')).toBeVisible({ timeout: 15000 });
        await expect(page.locator(`text=${uniqueText}`)).toBeVisible({ timeout: 10000 });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_modal_abierto_en_seguimiento.png') });
    });
});
