import { test, expect } from '@playwright/test';

/**
 * 🧪 Suite E2E v1.3.0: Pool Multi-Resolutor, Tomar Resolución, Guardar al Aprobar y Observaciones Opcionales
 *
 * Valida:
 *  1. Múltiples resolutores compartiendo un mismo tipo de resolución ven un caso en Pool (sin resolutor nominal).
 *  2. Un resolutor puede tomar el caso desde la grilla ("Tomar Resolución") y otro recibe HTTP 409 si intenta tomarlo.
 *  3. Al editar un dato en el modal y hacer clic directo en "Aprobar Resolución" (sin apretar "Guardar"),
 *     el sistema guarda los cambios automáticamente antes de aprobar.
 *  4. El campo "Mis Observaciones (Opcional)" permite aprobar dejándolo vacío.
 *  5. Al finalizar queda persistido quién resolvió la asignación y los cambios realizados.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

const CREDENCIALES = {
  ADMIN: { email: 'admin@sgp.com', password: process.env.TEST_ADMIN_PASS || 'password' },
  OPERADOR: { email: 'celeste_solari19@hotmail.com', password: process.env.TEST_OPERADOR_PASS || 'password' },
  EDUARDO: { email: 'ealfaro.51@gmail.com', password: process.env.TEST_EDUARDO_PASS || 'password' },
  VERONICA: { email: 'mveronicagonzalez79@gmail.com', password: process.env.TEST_VERONICA_PASS || 'password' }
};

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

const loginAPI = async (request, email, password) => {
  const res = await request.post(`${BACKEND_URL}/api/auth/login`, {
    data: { email, password }
  });
  expect(res.ok(), `Error de login API para ${email}: ${res.status()}`).toBeTruthy();
  const data = await res.json();
  return data.token;
};

test.describe('🧪 Validación E2E v1.3.0: Pool Multi-Resolutor, Guardar al Aprobar y Observaciones Opcionales', () => {
  let adminToken = '';
  let veronicaToken = '';
  let solicitudId = null;
  let assignmentId = null;
  let veronicaUserId = null;
  let veronicaOriginalTipoIds = [];
  const nombreSolicitante = `Vecino Pool MultiRes ${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    adminToken = await loginAPI(request, CREDENCIALES.ADMIN.email, CREDENCIALES.ADMIN.password);
    veronicaToken = await loginAPI(request, CREDENCIALES.VERONICA.email, CREDENCIALES.VERONICA.password);

    // 1. Obtener usuarios y tipos de resolución para sumar temporalmente DECLARACION DE INTERES a Verónica
    const usersRes = await request.get(`${BACKEND_URL}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const users = await usersRes.json();
    const veronica = users.find(u => u.email === CREDENCIALES.VERONICA.email);
    expect(veronica, 'No se encontró usuaria Verónica en BD local').toBeTruthy();
    veronicaUserId = veronica.id;
    veronicaOriginalTipoIds = (veronica.tiposResolucion || []).map(t => t.id);

    const tiposRes = await request.get(`${BACKEND_URL}/api/tipos-resolucion`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const tipos = await tiposRes.json();
    const declaTipo = tipos.find(t => (t.tipo || '').toUpperCase() === 'DECLARACION DE INTERES');
    expect(declaTipo, 'No se encontró tipo DECLARACION DE INTERES').toBeTruthy();

    const nuevosTiposVero = Array.from(new Set([...veronicaOriginalTipoIds, declaTipo.id]));
    const updVero = await request.put(`${BACKEND_URL}/api/users/${veronicaUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { tipoResolucionIds: nuevosTiposVero }
    });
    expect(updVero.ok(), `Error habilitando multi-resolutor en Verónica: ${updVero.status()}`).toBeTruthy();

    // 2. Crear solicitud base con asignación DECLARACION DE INTERES en POOL (resolutorEmail: null)
    const createRes = await request.post(`${BACKEND_URL}/api/solicitudes`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        description: 'Solicitud de prueba v1.3.0 para validar pool compartido y guardado al aprobar',
        origin: 'Directo de paco',
        tema: 'CULTURA',
        type: 'PEDIDO',
        status: 'en resolucion',
        person: {
          name: nombreSolicitante,
          phone: '3424556677',
          applicantType: 'Personal',
          applicantSubtype: 'Referente'
        }
      }
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    solicitudId = created.id;

    const updateRes = await request.put(`${BACKEND_URL}/api/solicitudes/${solicitudId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        description: created.description,
        origin: 'Directo de paco',
        tema: 'CULTURA',
        status: 'en resolucion',
        responsableId: 61,
        personName: nombreSolicitante,
        personPhone: '3424556677',
        personApplicantType: 'Personal',
        personApplicantSubtype: 'Referente',
        locationName: 'Santa Fe',
        assignments: [
          {
            tipoResolucion: 'DECLARACION DE INTERES',
            resolutorEmail: null,
            detalle: JSON.stringify({
              'Localidad': 'Santa Fe',
              'Tipo de pedido': 'Personal',
              'Nombre completo del evento': 'Evento Original',
              'Actividad': 'Visita',
              'Institución a declarar': 'Institución Original',
              'Tipo': 'otro',
              'Descripción': 'Descripción inicial del evento',
              'Fecha': '2026-11-28',
              'Dirección': 'Av. Freyre 1234',
              'Fundamentos': 'Fundamentos iniciales',
              'Responsable': 'Eduardo Alfaro'
            })
          }
        ]
      }
    });
    expect(updateRes.ok()).toBeTruthy();
    const updated = await updateRes.json();
    assignmentId = updated.resolutorAssignments?.[0]?.id;
    expect(assignmentId, 'La asignación en pool debe tener ID asignado').toBeTruthy();
    expect(updated.resolutorAssignments?.[0]?.resolutor).toBeNull();
  });

  test.afterAll(async ({ request }) => {
    if (solicitudId && adminToken) {
      await request.delete(`${BACKEND_URL}/api/solicitudes/${solicitudId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    }
    if (veronicaUserId && adminToken) {
      await request.put(`${BACKEND_URL}/api/users/${veronicaUserId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { tipoResolucionIds: veronicaOriginalTipoIds }
      });
    }
  });

  test('Pool compartido visible para ambos resolutores -> Tomar caso -> Conflicto 409 para el segundo -> Editar y Aprobar sin observaciones guarda cambios', async ({ page, request }) => {
    // 1. Verónica (segundo resolutor de DECLARACION DE INTERES) ve el caso en Pool
    await iniciarSesionUI(page, CREDENCIALES.VERONICA.email, CREDENCIALES.VERONICA.password, 'RESOLUTOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    await page.locator('input[placeholder*="Buscar"]').first().fill(nombreSolicitante);
    await page.waitForTimeout(800);

    const rowVero = page.locator(`tr:has-text("${nombreSolicitante}")`).first();
    await expect(rowVero).toBeVisible({ timeout: 10000 });
    await expect(rowVero).toContainText('Pool');
    await expect(rowVero.locator('button[title*="Tomar Resolución"]')).toBeVisible();

    // 2. Eduardo (primer resolutor de DECLARACION DE INTERES) también ve el caso en Pool y lo TOMA
    await iniciarSesionUI(page, CREDENCIALES.EDUARDO.email, CREDENCIALES.EDUARDO.password, 'RESOLUTOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    await page.locator('input[placeholder*="Buscar"]').first().fill(nombreSolicitante);
    await page.waitForTimeout(800);

    const rowEdu = page.locator(`tr:has-text("${nombreSolicitante}")`).first();
    await expect(rowEdu).toBeVisible({ timeout: 10000 });
    await expect(rowEdu).toContainText('Pool');

    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('DECLARACION DE INTERES');
      await dialog.accept();
    });
    await rowEdu.locator('button[title*="Tomar Resolución"]').first().click();

    await expect(page.locator('text=asignada a tu bandeja').first()).toBeVisible({ timeout: 8000 });
    await expect(rowEdu).toContainText('Eduardo Alfaro', { timeout: 8000 });

    // 3. Control de concurrencia: si Verónica intenta tomarla por API ahora, recibe HTTP 409
    const conflictRes = await request.post(`${BACKEND_URL}/api/solicitudes/${solicitudId}/asignaciones/${assignmentId}/tomar`, {
      headers: { Authorization: `Bearer ${veronicaToken}` }
    });
    expect(conflictRes.status()).toBe(409);

    // 4. Eduardo abre el modal, edita un campo dinámico y aprueba SIN guardar antes y SIN observaciones
    await rowEdu.locator('button[title="Ver / Editar Detalles"]').first().click();
    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible({ timeout: 8000 });

    // Modificar el campo "Institución a declarar" sin tocar el botón Guardar
    const inputInstitucion = modal.locator('input[value="Institución Original"]').first();
    await expect(inputInstitucion).toBeVisible({ timeout: 6000 });
    await inputInstitucion.fill('Institución Editada Al Aprobar v1.3.0');

    // Presionar directamente "Aprobar Resolución"
    await modal.locator('button:has-text("Aprobar Resolución")').first().click();

    // Verificar que el label indica Observaciones (Opcional) y confirmar dejándolo VACÍO
    await expect(page.locator('text=Mis Observaciones (Opcional)')).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("Confirmar y Finalizar")').first().click();

    // Debe guardar cambios y aprobar con éxito sin exigir observaciones
    await expect(page.locator('text=pasó a Resueltas').first()).toBeVisible({ timeout: 10000 });

    // 5. Verificar en backend que los cambios editados se guardaron y quedó registrado quién lo resolvió
    const verifyRes = await request.get(`${BACKEND_URL}/api/solicitudes/${solicitudId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(verifyRes.ok()).toBeTruthy();
    const finalSol = await verifyRes.json();

    expect(finalSol.status.toLowerCase()).toBe('completadas');
    const finalAsgn = finalSol.resolutorAssignments?.[0];
    expect(finalAsgn.approved).toBe(true);
    expect(finalAsgn.resolutor?.email).toBe(CREDENCIALES.EDUARDO.email);
    expect(finalAsgn.detalle).toContain('Institución Editada Al Aprobar v1.3.0');
  });

  test('Subsidio en Especie: muestra Monto solicitado y Monto real; Operador puede completar Monto real estando la solicitud Resuelta', async ({ page, request }) => {
    const nombreClub = `Club Especie MontoReal ${Date.now()}`;
    let especieId = null;

    try {
      // 1. Crear solicitud de Subsidio en Especie con Monto solicitado y aprobarla (estado Resueltas / completadas)
      const createRes = await request.post(`${BACKEND_URL}/api/solicitudes`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          description: 'Pedido de pelotas e indumentaria deportiva (Subsidio en Especie)',
          origin: 'Oficina',
          tema: 'DEPORTE',
          type: 'PEDIDO',
          status: 'en resolucion',
          person: {
            name: nombreClub,
            phone: '3424889900',
            type: 'Institucional',
            subType: 'Club'
          }
        }
      });
      expect(createRes.ok()).toBeTruthy();
      const created = await createRes.json();
      especieId = created.id;

      const updRes = await request.put(`${BACKEND_URL}/api/solicitudes/${especieId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          description: created.description,
          origin: 'Oficina',
          tema: 'DEPORTE',
          status: 'completadas',
          responsableId: 61,
          person: {
            name: nombreClub,
            phone: '3424889900',
            type: 'Institucional',
            subType: 'Club'
          },
          locationName: 'Santa Fe',
          barrio: 'Los Hornos',
          assignments: [
            {
              tipoResolucion: 'SUBSIDIO EN ESPECIE',
              resolutorEmail: null,
              detalle: JSON.stringify({
                'Tipo de pedido': 'Institucional en especie',
                'Nombre de institución': nombreClub,
                'Fecha del evento': '2026-12-05',
                'Descripción de bienes solicitados': '10 pelotas de fútbol y 15 camisetas',
                'Monto solicitado': '150000'
              })
            }
          ]
        }
      });
      expect(updRes.ok()).toBeTruthy();

      // Marcar como completadas explícitamente (simula solicitud ya resuelta)
      const statusRes = await request.put(`${BACKEND_URL}/api/solicitudes/${especieId}/status`, {
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'text/plain' },
        data: 'completadas'
      });
      expect(statusRes.ok()).toBeTruthy();

      // 2. Inicia sesión un OPERADOR, abre la solicitud ya RESUELTA y completa "Monto real"
      await iniciarSesionUI(page, CREDENCIALES.OPERADOR.email, CREDENCIALES.OPERADOR.password, 'OPERADOR');
      await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

      await page.locator('input[placeholder*="Buscar"]').first().fill(nombreClub);
      await page.waitForTimeout(800);

      const row = page.locator(`tr:has-text("${nombreClub}")`).first();
      await expect(row).toBeVisible({ timeout: 10000 });
      await expect(row).toContainText('Resueltas');

      await row.locator('button[title="Ver / Editar Detalles"]').first().click();
      const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
      await expect(modal).toBeVisible({ timeout: 8000 });

      // Verificar que existen las etiquetas "Monto solicitado" y "Monto real", y NO el campo plano "Monto"
      await expect(modal.locator('label:text-is("Monto solicitado")')).toBeVisible();
      await expect(modal.locator('label:text-is("Monto real")')).toBeVisible();
      await expect(modal.locator('label:text-is("Monto")')).toHaveCount(0);

      // Verificar valor precargado de Monto solicitado y completar Monto real
      const inputMontoSolicitado = modal.locator('label:text-is("Monto solicitado") + input');
      await expect(inputMontoSolicitado).toHaveValue('150000');

      const inputMontoReal = modal.locator('label:text-is("Monto real") + input');
      await inputMontoReal.fill('178500');

      // Guardar la solicitud estando en estado Resueltas
      await modal.locator('button:has-text("Guardar Solicitud")').click();
      await expect(modal).toHaveCount(0, { timeout: 12000 });

      // 3. Verificar en backend que mantuvo estado "completadas", guardó ambos montos y actualizó amount al Monto real
      const verifyRes = await request.get(`${BACKEND_URL}/api/solicitudes/${especieId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      expect(verifyRes.ok()).toBeTruthy();
      const finalSol = await verifyRes.json();

      expect(finalSol.status.toLowerCase()).toBe('completadas');
      expect(Number(finalSol.amount)).toBe(178500);
      const detJson = JSON.parse(finalSol.resolutorAssignments[0].detalle);
      expect(String(detJson['Monto solicitado'])).toBe('150000');
      expect(String(detJson['Monto real'])).toBe('178500');
    } finally {
      if (especieId && adminToken) {
        await request.delete(`${BACKEND_URL}/api/solicitudes/${especieId}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
      }
    }
  });
});
