import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8080';
const ARTIFACTS_DIR = 'C:/Users/fran/.gemini/antigravity/brain/149c553f-fbc9-4fc5-853e-1cb712c912b7';

async function login(page, email, password) {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

test.describe('Rechazar Resolución para todos los tipos de resolutores', () => {
    test('Resolutor rechaza una solicitud pendiente con motivo obligatorio y pasa a Rechazado', async ({ page, request }) => {
        test.setTimeout(90000);

        // 1. Obtener token de Admin por API y crear una solicitud temporal en pool de SUBSIDIO EN ESPECIE
        const loginRes = await request.post(`${API_URL}/api/auth/login`, {
            data: { email: 'admin@sgp.com', password: 'SGP_Admin_#J57f_Prod_Secure_!' }
        });
        expect(loginRes.ok()).toBeTruthy();
        const adminAuth = await loginRes.json();
        const adminHeaders = { Authorization: `Bearer ${adminAuth.token}` };

        // Buscar ID de responsable válido
        const respRes = await request.get(`${API_URL}/api/responsables`, { headers: adminHeaders });
        const responsables = await respRes.json();
        const firstResp = responsables[0];

        const createRes = await request.post(`${API_URL}/api/solicitudes`, {
            headers: adminHeaders,
            data: {
                type: 'SUBSIDIO',
                description: 'PRUEBA E2E RECHAZO RESOLUTOR - ELIMINAR',
                status: 'en resolucion',
                origin: 'MANUAL',
                locationName: 'Santa Fe',
                barrio: 'Centro',
                responsableId: firstResp?.id || 1,
                person: { name: 'TEST RECHAZO E2E', phone: '3425000000', type: 'Institucional' },
                assignments: [
                    {
                        tipoResolucion: 'SUBSIDIO EN ESPECIE',
                        resolutorEmail: null,
                        detalle: JSON.stringify({
                            'Tipo de pedido': 'Institucional en especie',
                            'Nombre de institución': 'TEST RECHAZO E2E',
                            'Localidad': 'Santa Fe'
                        })
                    }
                ]
            }
        });
        expect(createRes.ok()).toBeTruthy();
        const created = await createRes.json();
        const createdId = created.id;

        try {
            // 2. Ingresar como Martín Nocioni -> Resolutor -> Subsidio en especie
            await page.setViewportSize({ width: 1280, height: 800 });
            await login(page, 'martinnocioni@gmail.com', 'Martin_SGP_b7kP*');

            await page.waitForSelector('text=Resolutor', { timeout: 15000 });
            await page.getByText('Resolutor', { exact: true }).click();
            await page.getByText('Subsidio en especie', { exact: false }).first().click();
            await page.waitForURL((url) => !url.pathname.includes('/select-role'), { timeout: 15000 });

            if (!page.url().includes('/mis-solicitudes')) {
                await page.goto(`${BASE_URL}/mis-solicitudes`);
            }
            await page.waitForSelector('tbody tr', { timeout: 15000 });

            // Buscar la solicitud temporal por ID o texto
            const searchInput = page.locator('input[placeholder*="Buscar por N° Orden"]');
            await searchInput.fill('TEST RECHAZO E2E');
            await page.waitForTimeout(800);

            const targetRow = page.locator('tbody tr').filter({ hasText: `#${createdId}` }).first();
            await expect(targetRow).toBeVisible({ timeout: 10000 });
            await targetRow.locator('button[title="Ver / Editar Detalles"]').click();

            // 3. Verificar botón Rechazar Resolución junto a Aprobar Resolución
            await expect(page.getByTestId('btn-aprobar-resolucion')).toBeVisible({ timeout: 10000 });
            const btnRechazar = page.getByTestId('btn-rechazar-resolucion');
            await expect(btnRechazar).toBeVisible();
            await btnRechazar.click();

            // 4. Sub-modal exige motivo obligatorio
            await expect(page.getByTestId('modal-confirmar-rechazo')).toBeVisible();
            const btnConfirmar = page.getByTestId('btn-confirmar-rechazo');
            await expect(btnConfirmar).toBeDisabled();

            await page.getByTestId('reject-observaciones-input').fill('No cumple con la documentación respaldatoria requerida.');
            await expect(btnConfirmar).toBeEnabled();

            await page.screenshot({
                path: `${ARTIFACTS_DIR}/ux_08_modal_rechazar_resolucion.png`,
                fullPage: false
            });

            // 5. Confirmar rechazo y verificar estado Rechazado en backend
            await btnConfirmar.click();
            await expect(page.getByTestId('modal-confirmar-rechazo')).toHaveCount(0, { timeout: 10000 });

            const afterRes = await request.get(`${API_URL}/api/solicitudes/${createdId}`, { headers: adminHeaders });
            expect(afterRes.ok()).toBeTruthy();
            const afterData = await afterRes.json();
            expect(afterData.status).toBe('rechazada');
            expect(afterData.observation).toContain('Rechazado por');
            expect(afterData.observation).toContain('No cumple con la documentación');
            expect(afterData.resolutorAssignments[0].rejected).toBe(true);
            expect(afterData.resolutorAssignments[0].observaciones).toContain('No cumple con la documentación');

            // 5b. Reabrir la solicitud rechazada y verificar cartel destacado + "Rechazado por:"
            await page.waitForTimeout(800);
            const rejectedRow = page.locator('tbody tr').filter({ hasText: `#${createdId}` }).first();
            await expect(rejectedRow).toBeVisible({ timeout: 10000 });
            await rejectedRow.locator('button[title="Ver / Editar Detalles"]').click();

            const bannerRechazo = page.getByTestId('banner-resoluciones-rechazadas');
            await expect(bannerRechazo).toBeVisible({ timeout: 10000 });
            await expect(bannerRechazo).toContainText('Rechazado por');
            await expect(bannerRechazo).toContainText('No cumple con la documentación');
            await expect(page.locator('text=Rechazado por:')).toBeVisible();

            await page.screenshot({
                path: `${ARTIFACTS_DIR}/ux_09_banner_solicitud_rechazada.png`,
                fullPage: false
            });
        } finally {
            // 6. Limpiar la solicitud temporal para no dejar basura en BD local
            await request.delete(`${API_URL}/api/solicitudes/${createdId}`, { headers: adminHeaders });
        }
    });
});
