// @ts-check
import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
// Guardar capturas de pantalla en la carpeta de artefactos de la sesión de Antigravity
const ARTIFACT_DIR = 'C:/Users/fran/.gemini/antigravity/brain/8212d97d-e75f-4b22-8fff-58ee54c5278e';

test('Capturar Dashboard del Auditor y Filtros para Documentación', async ({ page }) => {
    // 1. Login como Auditor
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'test.auditor@gmail.com');
    await page.fill('input[type="password"]', 'Auditor_SGP_2026!');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);
    if (page.url().includes('/select-rol')) {
        await page.click('button:has-text("Control y Seguimiento")');
    }
    await page.waitForURL(`${BASE_URL}/dashboard`);

    // Esperar a que el título principal y el buscador estén listos
    await expect(page.locator('h1:has-text("Control y Seguimiento")')).toBeVisible();
    await expect(page.locator('.recharts-responsive-container').first()).toBeAttached();
    
    // Esperar 2 segundos para dar tiempo a que las animaciones de Recharts terminen de dibujarse
    await page.waitForTimeout(2000);

    // Tomar captura de pantalla del Dashboard del Auditor
    const dashboardScreenshotPath = path.join(ARTIFACT_DIR, 'auditor_dashboard.png');
    await page.screenshot({ path: dashboardScreenshotPath, fullPage: true });
    console.log(`📸 Captura del Dashboard del Auditor guardada en: ${dashboardScreenshotPath}`);

    // 2. Filtrar por la resolución "Subsidios" en el select
    const typeSelect = page.locator('select').first();
    await typeSelect.selectOption('SUBSIDIO');

    // Esperar a que se actualicen los gráficos tras el filtrado
    await page.waitForTimeout(2000);

    // Tomar captura de pantalla de los gráficos filtrados
    const filteredScreenshotPath = path.join(ARTIFACT_DIR, 'auditor_filtered.png');
    await page.screenshot({ path: filteredScreenshotPath, fullPage: true });
    console.log(`📸 Captura de los Gráficos Filtrados guardada en: ${filteredScreenshotPath}`);
});
