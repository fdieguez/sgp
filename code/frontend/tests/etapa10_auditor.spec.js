// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Pruebas Funcionales y de Regresión de la Etapa 10 - Rol de Auditor y Gráficos', () => {

    test('Flujo E2E de Auditoría: Login, Filtros del Dashboard y Buscador Global de Solo Lectura', async ({ page }) => {
        // 1. Acceso del Auditor
        console.log('Iniciando sesión como Auditor...');
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', 'test.auditor@gmail.com');
        await page.fill('input[type="password"]', 'Auditor_SGP_2026!');
        await page.click('button[type="submit"]');

        // Seleccionar rol de Auditor si tiene múltiples o redirige a la selección
        if (page.url().includes('/select-rol')) {
            console.log('Pantalla de selección de rol activa. Seleccionando Control y Seguimiento...');
            await page.click('text=Control y Seguimiento');
        }
        
        await page.waitForURL(`${BASE_URL}/dashboard`);
        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
        
        // Confirmar títulos y cabeceras
        await expect(page.locator('h1')).toContainText('Control y Seguimiento');
        console.log('✅ Acceso del Auditor correcto y redirección al Dashboard exitosa.');

        // 2. Comprobar Tarjetas de Métricas principales
        await expect(page.locator('text=Solicitudes Totales')).toBeVisible();
        await expect(page.locator('text=Pendientes')).toBeVisible();
        await expect(page.locator('text=En Resolución')).toBeVisible();
        await expect(page.locator('text=Completadas')).toBeVisible();
        await expect(page.locator('text=Rechazadas')).toBeVisible();
        console.log('✅ Tarjetas de métricas del Dashboard visibles.');

        // 3. Comprobar selectores y realizar filtrado interactivo
        const selectTipo = page.locator('select:near(label:has-text("Tipo Solicitud"))').first();
        const selectAnio = page.locator('select:near(label:has-text("Año"))').first();
        
        await expect(selectTipo).toBeVisible();
        await expect(selectAnio).toBeVisible();

        // Cambiar el filtro a Subsidios
        console.log('Cambiando filtro de Tipo Solicitud a SUBSIDIO...');
        await selectTipo.selectOption('SUBSIDIO');
        await page.waitForTimeout(500); // Dar un breve tiempo para el refetch

        // 4. Comprobar la presencia de la Suite de Gráficos Recharts
        // Recharts dibuja gráficos SVG o divs con la clase recharts-responsive-container
        const rechartsContainers = page.locator('.recharts-responsive-container');
        const containerCount = await rechartsContainers.count();
        console.log(`Se encontraron ${containerCount} gráficos activos de Recharts.`);
        expect(containerCount).toBeGreaterThanOrEqual(1);
        console.log('✅ Gráficos interactivos de Recharts cargados.');

        // 5. Utilizar el Buscador Global
        const inputBuscador = page.locator('input[placeholder="Escribe Nº Solicitud o Beneficiario..."]');
        await expect(inputBuscador).toBeVisible();
        
        console.log('Escribiendo consulta de prueba en el buscador...');
        await inputBuscador.fill('Pérez');
        await page.waitForTimeout(1000); // Esperar el debounce de búsqueda (300ms) y carga de API

        // Si hay resultados de búsqueda, validar la apertura en solo lectura
        const dropdownResults = page.locator('button:has-text("#")');
        if (await dropdownResults.count() > 0) {
            console.log('Resultados de búsqueda encontrados. Abriendo el primer resultado...');
            await dropdownResults.first().click();

            // Verificar que se abra el modal en modo Solo Lectura
            const tituloModal = page.locator('h2:has-text("Solo Lectura")');
            await expect(tituloModal).toBeVisible();
            console.log('✅ Modal de Solicitud abierto en modo de Solo Lectura.');

            // Comprobar que el fieldset esté deshabilitado (no se pueden editar campos)
            const fieldset = page.locator('form fieldset');
            await expect(fieldset).toHaveAttribute('disabled', '');
            console.log('✅ Control de inputs del formulario bloqueado (disabled).');

            // Comprobar que no existan botones de guardar o aprobación
            const botonGuardar = page.locator('button:has-text("Guardar Solicitud")');
            await expect(botonGuardar).not.toBeVisible();
            
            const botonAprobar = page.locator('button:has-text("Aprobar Resolución")');
            await expect(botonAprobar).not.toBeVisible();
            console.log('✅ Botones de Guardado y Aprobación correctamente ocultos para el Auditor.');

            // Cerrar el modal
            await page.click('button:has-text("Cerrar")');
            await expect(tituloModal).not.toBeVisible();
            console.log('✅ Modal de Solo Lectura cerrado de forma correcta.');
        } else {
            console.log('⚠️ No se encontraron solicitudes para realizar la prueba del modal de lectura (base de datos sin sembrado). Se verificó el buscador estáticamente.');
        }
    });
});
