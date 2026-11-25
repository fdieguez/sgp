import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const SCREENSHOT_DIR = 'C:\\Users\\fran\\.gemini\\antigravity\\brain\\149c553f-fbc9-4fc5-853e-1cb712c912b7';
const MARTIN_USER = { email: 'martinnocioni@gmail.com', pass: 'Martin_SGP_b7kP*' };

test.describe('Opción A: Submenú de Especialidad para Resolutor Multi-Tipo', () => {
    test('Martín Nocioni elige especialidad Subsidio en Dinero y luego cambia a Subsidio en Especie', async ({ page }) => {
        test.setTimeout(90000);

        // 1. Login como Martín Nocioni
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
        await page.reload({ waitUntil: 'domcontentloaded' });

        await page.locator('input[type="email"]').fill(MARTIN_USER.email);
        await page.locator('input[type="password"]').fill(MARTIN_USER.pass);
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/.*select-rol.*/, { timeout: 20000 });

        // 2. Clic en tarjeta Resolutor -> debe abrir el submenú de especialidades
        await page.getByTestId('select-role-resolutor').click();
        await expect(page.getByTestId('resolutor-submenu')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('select-tipo-subsidio-en-dinero')).toBeVisible();
        await expect(page.getByTestId('select-tipo-subsidio-en-especie')).toBeVisible();
        await expect(page.getByTestId('btn-volver-roles')).toBeVisible();
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'submenu_01_especialidades_resolutor.png') });

        // 3. Ingresar como Subsidio en Dinero -> verificar Navbar y botones exclusivos
        await page.getByTestId('select-tipo-subsidio-en-dinero').click();
        await page.waitForURL((url) => !url.pathname.includes('/select-rol'), { timeout: 15000 });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800);

        await expect(page.locator('nav')).toContainText('RESOLUTOR - SUBSIDIO EN DINERO');
        await expect(page.getByTestId('btn-consideracion-exportar-todos')).toBeVisible();
        await expect(page.getByTestId('btn-solo-exportar-todos')).toBeVisible();
        await expect(page.getByTestId('btn-importar-planilla')).toBeVisible();
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'submenu_02_bandeja_subsidio_dinero.png') });

        // 4. Cambiar de especialidad a Subsidio en Especie desde Navbar -> Cambiar Rol
        await page.locator('nav button:has-text("Cambiar Rol")').click();
        await page.waitForURL(/.*select-rol.*/, { timeout: 10000 });
        await page.getByTestId('select-role-resolutor').click();
        await expect(page.getByTestId('resolutor-submenu')).toBeVisible();
        await page.getByTestId('select-tipo-subsidio-en-especie').click();
        await page.waitForURL((url) => !url.pathname.includes('/select-rol'), { timeout: 15000 });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800);

        await expect(page.locator('nav')).toContainText('RESOLUTOR - SUBSIDIO EN ESPECIE');
        await expect(page.getByTestId('btn-consideracion-exportar-todos')).toBeHidden();
        await expect(page.getByTestId('btn-solo-exportar-todos')).toBeHidden();
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'submenu_03_bandeja_subsidio_especie.png') });
    });
});
