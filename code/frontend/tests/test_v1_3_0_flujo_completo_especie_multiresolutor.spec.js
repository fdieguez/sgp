import { test, expect } from '@playwright/test';

/**
 * 🧪 Suite E2E Completa v1.3.0: Flujo Integral de Subsidio en Especie con Múltiples Resolutores (100% UI)
 *
 * Recorrido validado de punta a punta desde la interfaz web:
 *  1. Un Responsable crea 2 solicitudes nuevas (A y B) desde "Nueva Solicitud" asignando "Subsidio en Especie"
 *     con "Monto solicitado" (verificando que NO aparece "Monto" plano y que quedan en Pool compartido).
 *  2. Dos resolutores distintos de SUBSIDIO EN ESPECIE (Martín Nocioni y Eduardo Alfaro) visualizan AMBAS solicitudes.
 *  3. Martín Nocioni toma la Solicitud A desde la grilla ("Tomar Resolución"), edita la descripción de bienes y
 *     aprueba directo sin apretar Guardar y sin Observaciones -> pasa a Resueltas y queda guardado Martín como resolutor.
 *  4. Eduardo Alfaro verifica que la Solicitud A ya no está disponible para tomar, toma la Solicitud B desde la grilla
 *     y la aprueba -> pasa a Resueltas y queda guardado Eduardo como resolutor.
 *  5. Un Operador ingresa a la Solicitud A ya en estado Resueltas, completa "Monto real" y guarda ->
 *     se verifica que permanece en estado Resueltas y actualiza el monto efectivo al Monto real.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

const CREDENCIALES = {
  ADMIN: { email: 'admin@sgp.com', password: process.env.TEST_ADMIN_PASS || 'password' },
  OPERADOR: { email: 'celeste_solari19@hotmail.com', password: process.env.TEST_OPERADOR_PASS || 'password' },
  RESPONSABLE: { email: 'hrdorigo@gmail.com', password: process.env.TEST_RESPONSABLE_PASS || 'password' },
  RESOLUTOR_1: { email: 'martinnocioni@gmail.com', password: process.env.TEST_MARTIN_PASS || 'password' },
  RESOLUTOR_2: { email: 'ealfaro.51@gmail.com', password: process.env.TEST_EDUARDO_PASS || 'password' }
};

const iniciarSesionUI = async (page, email, password, rolASeleccionar = null) => {
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

  if (page.url().includes('/select-rol') && rolASeleccionar) {
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

/**
 * Crea una solicitud nueva con Subsidio en Especie 100% desde el modal UI.
 */
const crearSolicitudEspecieDesdeUI = async (page, { nombreInstitucion, descripcion, bienes, montoSolicitado }) => {
  await page.click('button:has-text("Nueva Solicitud")');
  const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
  await expect(modal).toBeVisible({ timeout: 6000 });

  await modal.locator('input[placeholder*="Buscar por nombre"]').first().fill(nombreInstitucion);
  await modal.locator('label:text-is("Teléfono") + input').fill('3424778899');
  await modal.locator('label:text-is("Tipo Solicitante") + select').selectOption('Institucional');
  await page.waitForTimeout(200);
  const subtipoSelect = modal.locator('label:text-is("Subtipo Institucional") + select');
  if (await subtipoSelect.count() > 0) {
    await subtipoSelect.selectOption('Club');
  }

  await modal.locator('label:text-is("Localidad") + select').selectOption('Santa Fe');
  await page.waitForTimeout(300);
  await modal.locator('label:text-is("Barrio") + select').selectOption({ index: 1 });

  await modal.locator('label:text-is("Descripción / Pedido") + textarea').fill(descripcion);
  await modal.locator('label:text-is("Tema Solicitud") + select').selectOption('DEPORTE');
  await modal.locator('label:text-is("Origen") + select').selectOption('Oficina');

  // Agregar asignación de tipo "Subsidio en Especie"
  await modal.locator('button:has-text("Agregar")').last().click();
  await page.waitForTimeout(400);

  const selectArea = modal.locator('select').filter({ hasText: 'Seleccione Área' }).last();
  await selectArea.selectOption({ label: 'Subsidio en Especie' });
  await page.waitForTimeout(500);

  // Verificar que muestra "Monto solicitado" y "Monto real", NO "Monto" plano, y que indica Pool
  await expect(modal.locator('label:text-is("Monto solicitado")')).toBeVisible();
  await expect(modal.locator('label:text-is("Monto real")')).toBeVisible();
  await expect(modal.locator('label:text-is("Monto")')).toHaveCount(0);
  await expect(modal.locator('text=Pool:')).toBeVisible();

  // Completar datos de Subsidio en Especie
  await modal.locator('label:text-is("Nombre de institución") + input').fill(nombreInstitucion);
  await modal.locator('label:text-is("Fecha del evento") + input').fill('2026-12-10');
  await modal.locator('label:text-is("Descripción de bienes solicitados") + textarea').fill(bienes);
  await modal.locator('label:text-is("Monto solicitado") + input').fill(String(montoSolicitado));

  await modal.locator('button:has-text("Guardar Solicitud")').click();
  await expect(modal).toHaveCount(0, { timeout: 15000 });
};

test.describe('🧪 Flujo Completo E2E v1.3.0: Subsidio en Especie Multi-Resolutor (100% UI)', () => {
  test.setTimeout(120000);

  let adminToken = '';
  let martinUserId = null;
  let martinOriginalTipos = [];
  let eduardoUserId = null;
  let eduardoOriginalTipos = [];
  const createdIds = [];

  const ts = Date.now();
  const nombreSolA = `Club Norte Especie A ${ts}`;
  const nombreSolB = `Club Sur Especie B ${ts}`;

  test.beforeAll(async ({ request }) => {
    adminToken = await loginAPI(request, CREDENCIALES.ADMIN.email, CREDENCIALES.ADMIN.password);

    const [usersRes, tiposRes] = await Promise.all([
      request.get(`${BACKEND_URL}/api/users`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      request.get(`${BACKEND_URL}/api/tipos-resolucion`, { headers: { Authorization: `Bearer ${adminToken}` } })
    ]);
    const users = await usersRes.json();
    const tipos = await tiposRes.json();

    const tipoEspecie = tipos.find(t => (t.tipo || '').toUpperCase() === 'SUBSIDIO EN ESPECIE');
    expect(tipoEspecie, 'Debe existir el tipo SUBSIDIO EN ESPECIE').toBeTruthy();

    // Habilitar SUBSIDIO EN ESPECIE a ambos resolutores (Martín y Eduardo)
    const martin = users.find(u => u.email === CREDENCIALES.RESOLUTOR_1.email);
    const eduardo = users.find(u => u.email === CREDENCIALES.RESOLUTOR_2.email);
    expect(martin && eduardo, 'Deben existir Martín y Eduardo en BD local').toBeTruthy();

    martinUserId = martin.id;
    martinOriginalTipos = (martin.tiposResolucion || []).map(t => t.id);
    eduardoUserId = eduardo.id;
    eduardoOriginalTipos = (eduardo.tiposResolucion || []).map(t => t.id);

    await request.put(`${BACKEND_URL}/api/users/${martinUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { tipoResolucionIds: Array.from(new Set([...martinOriginalTipos, tipoEspecie.id])) }
    });
    await request.put(`${BACKEND_URL}/api/users/${eduardoUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { tipoResolucionIds: Array.from(new Set([...eduardoOriginalTipos, tipoEspecie.id])) }
    });
  });

  test.afterAll(async ({ request }) => {
    // Restaurar tipos de resolución originales y borrar solicitudes de prueba
    if (adminToken) {
      for (const id of createdIds) {
        await request.delete(`${BACKEND_URL}/api/solicitudes/${id}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
      }
      if (martinUserId) {
        await request.put(`${BACKEND_URL}/api/users/${martinUserId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: { tipoResolucionIds: martinOriginalTipos }
        });
      }
      if (eduardoUserId) {
        await request.put(`${BACKEND_URL}/api/users/${eduardoUserId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          data: { tipoResolucionIds: eduardoOriginalTipos }
        });
      }
    }
  });

  test('Creación UI de 2 solicitudes en Especie -> Ambos resolutores las ven -> Cada uno toma y resuelve una -> Operador carga Monto real post-resolución', async ({ page, request }) => {
    // === PASO 1: RESPONSABLE CREA 2 SOLICITUDES CON SUBSIDIO EN ESPECIE DESDE LA UI ===
    await iniciarSesionUI(page, CREDENCIALES.RESPONSABLE.email, CREDENCIALES.RESPONSABLE.password, 'RESPONSABLE');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    await crearSolicitudEspecieDesdeUI(page, {
      nombreInstitucion: nombreSolA,
      descripcion: 'Solicitud A para torneo infantil (Subsidio en Especie)',
      bienes: '12 pelotas y juegos de redes',
      montoSolicitado: 120000
    });

    await crearSolicitudEspecieDesdeUI(page, {
      nombreInstitucion: nombreSolB,
      descripcion: 'Solicitud B para escuela de básquet (Subsidio en Especie)',
      bienes: '20 camisetas y aros nuevos',
      montoSolicitado: 250000
    });

    // Recuperar IDs recién creados para verificación final y limpieza
    const listRes = await request.get(`${BACKEND_URL}/api/solicitudes?search=${encodeURIComponent(String(ts))}&size=20`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const listData = await listRes.json();
    const rowsApi = listData.content || listData;
    const solA = rowsApi.find(s => s.person?.name === nombreSolA);
    const solB = rowsApi.find(s => s.person?.name === nombreSolB);
    expect(solA && solB, 'Ambas solicitudes A y B deben existir en backend').toBeTruthy();
    createdIds.push(solA.id, solB.id);

    // Ambas deben haber quedado en POOL (resolutor === null) y en estado "en resolucion"
    expect(solA.status.toLowerCase()).toBe('en resolucion');
    expect(solB.status.toLowerCase()).toBe('en resolucion');
    expect(solA.resolutorAssignments[0].resolutor).toBeNull();
    expect(solB.resolutorAssignments[0].resolutor).toBeNull();

    // === PASO 2: RESOLUTOR 1 (MARTÍN NOCIONI) VE AMBAS, TOMA LA A, EDITA Y APRUEBA SIN OBSERVACIONES ===
    await iniciarSesionUI(page, CREDENCIALES.RESOLUTOR_1.email, CREDENCIALES.RESOLUTOR_1.password, 'RESOLUTOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    await page.locator('input[placeholder*="Buscar"]').first().fill(String(ts));
    await page.waitForTimeout(800);

    const rowAMartin = page.locator(`tr:has-text("${nombreSolA}")`).first();
    const rowBMartin = page.locator(`tr:has-text("${nombreSolB}")`).first();
    await expect(rowAMartin).toBeVisible({ timeout: 10000 });
    await expect(rowBMartin).toBeVisible({ timeout: 10000 });

    // Martín toma la Solicitud A desde la grilla
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('SUBSIDIO EN ESPECIE');
      await dialog.accept();
    });
    await rowAMartin.locator('button[title*="Tomar Resolución"]').first().click();
    await expect(page.locator('text=asignada a tu bandeja').first()).toBeVisible({ timeout: 8000 });

    // Martín abre la Solicitud A, modifica bienes y aprueba directo (guardado automático + observaciones vacías)
    await rowAMartin.locator('button[title="Ver / Editar Detalles"]').first().click();
    const modalMartin = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modalMartin).toBeVisible({ timeout: 8000 });

    await modalMartin.locator('label:text-is("Descripción de bienes solicitados") + textarea').fill('12 pelotas, redes y 2 infladores (editado por Martín)');
    await modalMartin.locator('button:has-text("Aprobar Resolución")').first().click();
    await expect(page.locator('text=Mis Observaciones (Opcional)')).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("Confirmar y Finalizar")').first().click();
    await expect(page.locator('text=pasó a Resueltas').first()).toBeVisible({ timeout: 10000 });

    // === PASO 3: RESOLUTOR 2 (EDUARDO ALFARO) VE LA B EN POOL, LA TOMA Y LA APRUEBA ===
    await iniciarSesionUI(page, CREDENCIALES.RESOLUTOR_2.email, CREDENCIALES.RESOLUTOR_2.password, 'RESOLUTOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    await page.locator('input[placeholder*="Buscar"]').first().fill(String(ts));
    await page.waitForTimeout(800);

    // La Solicitud A ya fue tomada y resuelta por Martín (no debe aparecerle a Eduardo para tomar)
    await expect(page.locator(`tr:has-text("${nombreSolA}")`)).toHaveCount(0);

    // La Solicitud B sigue disponible en el Pool para Eduardo
    const rowBEduardo = page.locator(`tr:has-text("${nombreSolB}")`).first();
    await expect(rowBEduardo).toBeVisible({ timeout: 10000 });

    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('SUBSIDIO EN ESPECIE');
      await dialog.accept();
    });
    await rowBEduardo.locator('button[title*="Tomar Resolución"]').first().click();
    await expect(page.locator('text=asignada a tu bandeja').first()).toBeVisible({ timeout: 8000 });

    // Eduardo abre la Solicitud B y la aprueba sin observaciones
    await rowBEduardo.locator('button[title="Ver / Editar Detalles"]').first().click();
    const modalEduardo = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modalEduardo).toBeVisible({ timeout: 8000 });
    await modalEduardo.locator('button:has-text("Aprobar Resolución")').first().click();
    await page.locator('button:has-text("Confirmar y Finalizar")').first().click();
    await expect(page.locator('text=pasó a Resueltas').first()).toBeVisible({ timeout: 10000 });

    // === PASO 4: OPERADOR CARGA "MONTO REAL" EN SOLICITUD A ESTANDO EN ESTADO RESUELTAS ===
    await iniciarSesionUI(page, CREDENCIALES.OPERADOR.email, CREDENCIALES.OPERADOR.password, 'OPERADOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`, { waitUntil: 'networkidle' });

    await page.locator('input[placeholder*="Buscar"]').first().fill(nombreSolA);
    await page.waitForTimeout(800);

    const rowAOp = page.locator(`tr:has-text("${nombreSolA}")`).first();
    await expect(rowAOp).toBeVisible({ timeout: 10000 });
    await expect(rowAOp).toContainText('Resueltas');

    await rowAOp.locator('button[title="Ver / Editar Detalles"]').first().click();
    const modalOp = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modalOp).toBeVisible({ timeout: 8000 });

    await expect(modalOp.locator('label:text-is("Monto solicitado") + input')).toHaveValue('120000');
    await modalOp.locator('label:text-is("Monto real") + input').fill('135000');
    await modalOp.locator('button:has-text("Guardar Solicitud")').click();
    await expect(modalOp).toHaveCount(0, { timeout: 12000 });

    // === PASO 5: VERIFICACIÓN FINAL DE INTEGRIDAD EN BACKEND ===
    const [finalARes, finalBRes] = await Promise.all([
      request.get(`${BACKEND_URL}/api/solicitudes/${solA.id}`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      request.get(`${BACKEND_URL}/api/solicitudes/${solB.id}`, { headers: { Authorization: `Bearer ${adminToken}` } })
    ]);
    const finalA = await finalARes.json();
    const finalB = await finalBRes.json();

    // Solicitud A: Resuelta por Martín, editada al aprobar, Monto real cargado por Operador y estado Resueltas preservado
    expect(finalA.status.toLowerCase()).toBe('completadas');
    expect(Number(finalA.amount)).toBe(135000);
    expect(finalA.resolutorAssignments[0].approved).toBe(true);
    expect(finalA.resolutorAssignments[0].resolutor?.email).toBe(CREDENCIALES.RESOLUTOR_1.email);
    const detA = JSON.parse(finalA.resolutorAssignments[0].detalle);
    expect(detA['Descripción de bienes solicitados']).toContain('editado por Martín');
    expect(String(detA['Monto solicitado'])).toBe('120000');
    expect(String(detA['Monto real'])).toBe('135000');

    // Solicitud B: Resuelta por Eduardo, Monto solicitado intacto
    expect(finalB.status.toLowerCase()).toBe('completadas');
    expect(Number(finalB.amount)).toBe(250000);
    expect(finalB.resolutorAssignments[0].approved).toBe(true);
    expect(finalB.resolutorAssignments[0].resolutor?.email).toBe(CREDENCIALES.RESOLUTOR_2.email);
  });
});
