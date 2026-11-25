import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = 'C:\\Users\\fran\\.gemini\\antigravity\\brain\\149c553f-fbc9-4fc5-853e-1cb712c912b7';

const ADMIN_USER = { email: 'admin@sgp.com', pass: 'SGP_Admin_#J57f_Prod_Secure_!' };
const MATIAS_USER = { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_mi6J!' };

async function login(page, email, password, autoSelectRole = true) {
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

    if (autoSelectRole && page.url().includes('/select-rol')) {
        await page.locator('.grid button').first().click();
        await page.waitForURL((url) => !url.pathname.includes('/select-rol'), { timeout: 15000 });
    }
}

test.describe('ABM Usuarios: hasta 4 roles, checks de zonas y correo de bienvenida', () => {
    test('Flujo E2E completo con Matías Ippólito (3 roles + zonas) y alta de usuario con email', async ({ page }) => {
        test.setTimeout(120000);

        // 1. Login como Admin y navegar a Configuración -> Usuarios
        await login(page, ADMIN_USER.email, ADMIN_USER.pass);
        await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(800);

        // Si Gestión de Usuarios está en una pestaña dentro de SettingsPage, activarla si existe
        const usersTab = page.locator('button:has-text("Usuarios")').first();
        if (await usersTab.isVisible()) {
            await usersTab.click();
            await page.waitForTimeout(500);
        }

        // 2. Buscar fila de Matías Ippólito y abrir edición
        const matiasRow = page.locator('tr', { hasText: MATIAS_USER.email }).first();
        await expect(matiasRow).toBeVisible({ timeout: 15000 });
        await matiasRow.locator('button[title="Editar"], button:has(svg.lucide-pencil)').first().click();

        // Verificar grilla de checkboxes de Zonas Territoriales y que NORTE está tildado
        const zonesGrid = page.getByTestId('zones-checkbox-grid');
        await expect(zonesGrid).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('zone-checkbox-NORTE')).toBeChecked();

        // Tildar 3er rol (RESOLUTOR), sumar zona OESTE y seleccionar un tipo de resolución
        const modal = page.locator('form');
        const resolutorCheckbox = modal.locator('input[type="checkbox"][value="RESOLUTOR"]');
        if (!(await resolutorCheckbox.isChecked())) {
            await resolutorCheckbox.check();
        }
        await page.getByTestId('zone-checkbox-OESTE').check();

        // Tildar un tipo de resolución (ej: OTRO)
        const otroLabel = modal.locator('label', { hasText: /^OTRO$/i }).first();
        if (await otroLabel.isVisible()) {
            await otroLabel.locator('input[type="checkbox"]').check();
        }

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'abm_01_editar_matias_3_roles_zonas.png') });

        // Guardar cambios
        await modal.locator('button[type="submit"]').click();
        await page.waitForTimeout(1000);
        await expect(matiasRow).toContainText('RESOLUTOR');

        // 3. Login como Matías Ippólito y verificar SelectRolPage con 3 tarjetas estilizadas
        await login(page, MATIAS_USER.email, MATIAS_USER.pass, false);
        await expect(page).toHaveURL(/.*select-rol.*/, { timeout: 15000 });
        await expect(page.getByTestId('select-role-responsable')).toBeVisible();
        await expect(page.getByTestId('select-role-distribuidor')).toBeVisible();
        await expect(page.getByTestId('select-role-resolutor')).toBeVisible();
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'abm_02_select_rol_3_tarjetas.png') });

        // Ingresar como Resolutor
        await page.getByTestId('select-role-resolutor').click();
        await page.waitForURL((url) => !url.pathname.includes('/select-rol'), { timeout: 15000 });
        await expect(page.locator('nav')).toContainText('RESOLUTOR');

        // 4. Volver como Admin y probar creación de usuario con 3 roles, 2 zonas y checkbox de email
        await login(page, ADMIN_USER.email, ADMIN_USER.pass);
        await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
        if (await usersTab.isVisible()) {
            await usersTab.click();
            await page.waitForTimeout(500);
        }

        const testEmail = `qa.multiroles.${Date.now()}@sgp.test`;
        await page.locator('button:has-text("Nuevo Usuario")').click();

        const createForm = page.locator('form');
        await createForm.locator('input[type="text"]').nth(0).fill('Usuario');
        await createForm.locator('input[type="text"]').nth(1).fill('Prueba QA');
        await createForm.locator('input[type="email"]').fill(testEmail);
        await createForm.locator('input[type="password"]').fill('Test_QA_2026!');
        await createForm.locator('input[type="tel"]').fill('3425000000');

        // Seleccionar 3 roles: OPERADOR (ya viene marcado) + RESPONSABLE + RESOLUTOR
        await createForm.locator('input[type="checkbox"][value="RESPONSABLE"]').check();
        await createForm.locator('input[type="checkbox"][value="RESOLUTOR"]').check();

        // Seleccionar 2 zonas con checkboxes
        await expect(page.getByTestId('zones-checkbox-grid')).toBeVisible();
        await page.getByTestId('zone-checkbox-NORTE').check();
        await page.getByTestId('zone-checkbox-SUR').check();

        // Tildar checkbox de envío de correo con credenciales
        const emailCheckbox = page.getByTestId('send-welcome-email-checkbox');
        await expect(emailCheckbox).toBeVisible();
        await emailCheckbox.check();

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'abm_03_crear_usuario_con_email_y_zonas.png') });

        await createForm.locator('button[type="submit"]').click();
        await page.waitForTimeout(1000);

        const newRow = page.locator('tr', { hasText: testEmail }).first();
        await expect(newRow).toBeVisible({ timeout: 10000 });
        await expect(newRow).toContainText('OPERADOR');
        await expect(newRow).toContainText('RESPONSABLE');
        await expect(newRow).toContainText('RESOLUTOR');

        // 5. Limpieza: eliminar usuario de prueba y restaurar a Matías a su estado original en local
        page.on('dialog', (dialog) => dialog.accept());
        await newRow.locator('button[title="Eliminar"], button:has(svg.lucide-trash-2)').first().click();
        await page.waitForTimeout(800);

        const matiasRowCleanup = page.locator('tr', { hasText: MATIAS_USER.email }).first();
        await matiasRowCleanup.locator('button[title="Editar"], button:has(svg.lucide-pencil)').first().click();
        const editForm = page.locator('form');
        await editForm.locator('input[type="checkbox"][value="RESOLUTOR"]').uncheck();
        await page.getByTestId('zone-checkbox-OESTE').uncheck();
        await editForm.locator('button[type="submit"]').click();
        await page.waitForTimeout(800);
    });
});
