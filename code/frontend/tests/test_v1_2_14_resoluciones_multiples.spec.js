import { test, expect } from '@playwright/test';

/**
 * 🧪 Suite E2E v1.2.14: Claridad en Resoluciones Múltiples, Progreso, Toast y Botón Rápido para Agenda
 *
 * Replica el caso #130 (AGENDA + DECLARACION DE INTERES en la misma solicitud):
 *  1. Verifica badges individuales (Pendiente / Aprobada) y contador de avance (0/2 -> 1/2 -> Resueltas).
 *  2. Verifica toast preciso al aprobar parcialmente vs. al completar la última resolución.
 *  3. Verifica filtro rápido "Solo mis pendientes" para el rol Resolutor.
 *  4. Verifica que el botón verde en una asignación de AGENDA abra directamente el modal de aprobación (asistencia obligatoria).
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

const CREDENCIALES = {
  ADMIN: { email: 'admin@sgp.com', password: process.env.TEST_ADMIN_PASS || 'password' },
  EDUARDO_DECLA: { email: 'ealfaro.51@gmail.com', password: process.env.TEST_EDUARDO_PASS || 'password' },
  VERONICA_AGENDA: { email: 'mveronicagonzalez79@gmail.com', password: process.env.TEST_VERONICA_PASS || 'password' }
};

/**
 * Inicia sesión en la interfaz web y selecciona el rol deseado si el usuario posee múltiples roles.
 */
const iniciarSesionUI = async (page, email, password, rolASeleccionar = 'RESOLUTOR') => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });

  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(800);

  if (page.url().includes('/select-rol')) {
    const exactLabel = rolASeleccionar.charAt(0).toUpperCase() + rolASeleccionar.slice(1).toLowerCase();
    const cardRol = page.getByText(exactLabel, { exact: true }).first();
    await cardRol.click();
    await page.waitForURL(url => !url.pathname.includes('/select-rol'), { timeout: 10000 });
    await page.waitForTimeout(800);
  }
};

/**
 * Obtiene token JWT vía API para preparar y limpiar los datos de prueba.
 */
const loginAPI = async (request, email, password) => {
  const res = await request.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email, password }
  });
  expect(res.ok(), `Error de login API para ${email}: ${res.status()}`).toBeTruthy();
  const data = await res.json();
  return data.token;
};

test.describe('🧪 Validación E2E v1.2.14: Resoluciones Múltiples y Claridad Visual', () => {
  let adminToken = '';
  let solicitudId = null;
  const nombreSolicitante = `Taller Prueba MultiRes ${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    adminToken = await loginAPI(request, CREDENCIALES.ADMIN.email, CREDENCIALES.ADMIN.password);

    // 1. Crear solicitud base con responsable asignado
    const createRes = await request.post(`${BACKEND_URL}/api/solicitudes`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        description: 'Caso de prueba E2E v1.2.14 replicando caso #130 (Agenda + Declaración de Interés)',
        origin: 'Directo de paco',
        tema: 'CULTURA',
        type: 'PEDIDO',
        status: 'en resolucion',
        person: {
          name: nombreSolicitante,
          phone: '3424112233',
          applicantType: 'Personal',
          applicantSubtype: 'Referente'
        }
      }
    });
    expect(createRes.ok(), `Error creando solicitud de prueba: ${createRes.status()}`).toBeTruthy();
    const created = await createRes.json();
    solicitudId = created.id;

    // 2. Asignar las dos resoluciones (AGENDA + DECLARACION DE INTERES) y responsable
    const updateRes = await request.put(`${BACKEND_URL}/api/solicitudes/${solicitudId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        description: created.description,
        origin: 'Directo de paco',
        tema: 'CULTURA',
        status: 'en resolucion',
        responsableId: 61,
        personName: nombreSolicitante,
        personPhone: '3424112233',
        personApplicantType: 'Personal',
        personApplicantSubtype: 'Referente',
        locationName: 'Santa Fe',
        assignments: [
          {
            tipoResolucion: 'AGENDA',
            resolutorEmail: CREDENCIALES.VERONICA_AGENDA.email,
            detalle: JSON.stringify({
              'Lugar - Localidad': 'Santa Fe',
              'Lugar - Barrio': 'Los Hornos',
              'Tipo de actividad': 'Visita',
              'Organizada por nosotros?': 'si',
              'Descripción/temario': 'Visita al taller mecánico premiado',
              'Asistentes': 'Equipo y vecinos',
              'Declaración de interés': 'si',
              'Aporte?': 'no',
              'Día': '2026-11-25',
              'Hora': '11:00',
              'Responsable': 'Carlos Egestti',
              'Observación': 'Fecha tentativa'
            })
          },
          {
            tipoResolucion: 'DECLARACION DE INTERES',
            resolutorEmail: CREDENCIALES.EDUARDO_DECLA.email,
            detalle: JSON.stringify({ 'Localidad': 'Santa Fe', 'Institución a declarar': 'Taller Prueba' })
          }
        ]
      }
    });
    expect(updateRes.ok(), `Error asignando resoluciones múltiples: ${updateRes.status()}`).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    if (solicitudId && adminToken) {
      await request.delete(`${BACKEND_URL}/api/solicitudes/${solicitudId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
  });

  test('Flujo completo: Eduardo aprueba Declaración (1/2) -> Filtro Solo mis pendientes -> Verónica aprueba Agenda desde botón verde (2/2 Resueltas)', async ({ page }) => {
    // --- PARTE 1: EDUARDO ALFARO (DECLARACION DE INTERES) ---
    await iniciarSesionUI(page, CREDENCIALES.EDUARDO_DECLA.email, CREDENCIALES.EDUARDO_DECLA.password, 'RESOLUTOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    const inputBuscar = page.locator('input[placeholder*="Buscar"]').first();
    await inputBuscar.fill(nombreSolicitante);
    await page.waitForTimeout(800);

    const row = page.locator(`tr:has-text("${nombreSolicitante}")`).first();
    await expect(row).toBeVisible({ timeout: 10000 });

    // Verificar estado inicial: En Resolución + 0/2 aprobadas + Falta AGENDA y DECLARACION DE INTERES
    await expect(row).toContainText('En Resolución');
    await expect(row).toContainText('0/2 aprobadas');
    await expect(row).toContainText('Pendiente');

    // Aprobar rápidamente la Declaración de Interés (aceptando confirm nativo)
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('DECLARACION DE INTERES');
      await dialog.accept();
    });

    const btnAprobarEdu = row.locator('button[title*="Aprobar Rápidamente"]').first();
    await expect(btnAprobarEdu).toBeVisible();
    await btnAprobarEdu.click();

    // Verificar Toast informativo indicando que falta AGENDA
    const toastParcial = page.locator('text=pendiente de: AGENDA').first();
    await expect(toastParcial).toBeVisible({ timeout: 8000 });

    // Verificar actualización visual en la fila: 1/2 aprobadas, Falta: AGENDA, badge Aprobada y sin botón verde
    await expect(row).toContainText('1/2 aprobadas', { timeout: 8000 });
    await expect(row).toContainText('Falta: AGENDA');
    await expect(row).toContainText('Aprobada');
    await expect(row.locator('button[title*="Aprobar Rápidamente"]')).toHaveCount(0);

    // Probar toggle "Solo mis pendientes"
    const btnSoloPendientes = page.locator('button:has-text("Solo mis pendientes")');
    await expect(btnSoloPendientes).toBeVisible();
    await btnSoloPendientes.click();
    await page.waitForTimeout(400);
    await expect(page.locator(`tr:has-text("${nombreSolicitante}")`)).toHaveCount(0);

    // Desactivar toggle -> vuelve a aparecer
    await btnSoloPendientes.click();
    await page.waitForTimeout(400);
    await expect(page.locator(`tr:has-text("${nombreSolicitante}")`).first()).toBeVisible();

    // --- PARTE 2: VERÓNICA GONZÁLEZ (AGENDA) ---
    await iniciarSesionUI(page, CREDENCIALES.VERONICA_AGENDA.email, CREDENCIALES.VERONICA_AGENDA.password, 'RESOLUTOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    const inputBuscarVero = page.locator('input[placeholder*="Buscar"]').first();
    await inputBuscarVero.fill(nombreSolicitante);
    await page.waitForTimeout(800);

    const rowVero = page.locator(`tr:has-text("${nombreSolicitante}")`).first();
    await expect(rowVero).toBeVisible({ timeout: 10000 });
    await expect(rowVero).toContainText('1/2 aprobadas');
    await expect(rowVero).toContainText('Falta: AGENDA');

    // Al hacer clic en el botón verde de AGENDA, debe abrir el modal de aprobación (no dar error 500)
    const btnAprobarAgenda = rowVero.locator('button[title*="Abrir aprobación de AGENDA"]').first();
    await expect(btnAprobarAgenda).toBeVisible();
    await btnAprobarAgenda.click();

    // Debe abrirse automáticamente el sub-modal de confirmación de aprobación con radio buttons de asistencia obligatoria
    const radioConAsistencia = page.locator('label:has-text("Con Asistencia")').first();
    await expect(radioConAsistencia).toBeVisible({ timeout: 8000 });
    await radioConAsistencia.click();

    // Completar observaciones obligatorias
    const textareaObs = page.locator('textarea[placeholder*="detalles de la resolución"], textarea').last();
    await textareaObs.fill('Visita agendada y confirmada en prueba E2E v1.2.14');

    // Confirmar aprobación final
    const btnConfirmar = page.locator('button:has-text("Confirmar y Finalizar")').first();
    await btnConfirmar.click();

    // Verificar Toast final de paso a Resueltas
    const toastFinal = page.locator('text=pasó a Resueltas').first();
    await expect(toastFinal).toBeVisible({ timeout: 10000 });

    // Verificar en la fila que el estado global pasó a "Resueltas"
    await page.waitForTimeout(800);
    const rowFinal = page.locator(`tr:has-text("${nombreSolicitante}")`).first();
    await expect(rowFinal).toContainText('Resueltas', { timeout: 8000 });
  });
});
