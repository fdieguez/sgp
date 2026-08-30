import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';


const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8080';

const CREDENTIALS = {
  OPERADOR: { email: 'celestesolari19@gmail.com', pass: 'Celeste_SGP_2026#' },
  DISTRIBUIDOR_MATIAS: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_2026!' },
  DISTRIBUIDOR_SABRI: { email: 'sabrivschmidt@gmail.com', pass: 'Sabrina_SGP_2026$' },
  RESPONSABLE_BARBARA: { email: 'barbarabrancatto@gmail.com', pass: 'Barbara_Resp_SGP_2026!' },
  RESOLUTOR_MARTIN: { email: 'martinnocioni@gmail.com', pass: 'Martin_SGP_2026*' },
  RESOLUTOR_MARIA: { email: 'mvgonza79@gmail.com', pass: 'Maria_SGP_2026%' },
  RESOLUTOR_EDUARDO: { email: 'ealfaro.51@gmail.com', pass: 'Eduardo_SGP_2026^' },
  AUDITOR: { email: 'test.auditor@gmail.com', pass: 'Auditor_SGP_2026!' }
};

const SPREADSHEET_ID = '1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g';
const SHEET_NAME = 'DESA';

const iniciarSesion = async (page, email, password, rolASeleccionar = null) => {
  await page.goto(`${BASE_URL}/login`, { timeout: 15000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const logoutBtn = page.locator('button:has-text("Salir")');
  if (await logoutBtn.count() > 0) {
    await logoutBtn.click();
    await page.waitForURL(/.*login.*/, { timeout: 10000 });
  }

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.click('button:has-text("Ingresar")');
  await page.waitForURL(/.*(dashboard|mis-solicitudes|settings|select-rol).*/, { timeout: 15000 });
  await page.waitForTimeout(500);

  if (page.url().includes('/select-rol')) {
    if (rolASeleccionar) {
      await page.click(`button:has-text("${rolASeleccionar}")`);
    } else {
      await page.locator('.grid button').first().click();
    }
    await page.waitForURL(/.*(dashboard|mis-solicitudes|settings).*/, { timeout: 15000 });
    await page.waitForTimeout(500);
  }
};

function restartBackend(overwriteUsers) {
  console.log(`[Reinicio-Backend] Configurando sgp.seed.overwrite-users a ${overwriteUsers}...`);
  const propsPath = 'c:/Users/fran/dev/projects/SGP/code/backend/src/main/resources/application.properties';
  let content = fs.readFileSync(propsPath, 'utf8');
  content = content.replace(/sgp\.seed\.overwrite-users=.*/, `sgp.seed.overwrite-users=${overwriteUsers}`);
  fs.writeFileSync(propsPath, content, 'utf8');

  // También sobrescribir en target/classes si existe
  const targetPropsPath = 'c:/Users/fran/dev/projects/SGP/code/backend/target/classes/application.properties';
  if (fs.existsSync(targetPropsPath)) {
    fs.writeFileSync(targetPropsPath, content, 'utf8');
  }

  console.log('[Reinicio-Backend] Deteniendo el backend en el puerto 8080...');
  try {
    execSync('powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess -Force"', { stdio: 'ignore' });
  } catch (e) {
    // ignorar
  }

  execSync('powershell -Command "Start-Sleep -Seconds 3"');

  console.log('[Reinicio-Backend] Iniciando backend...');
  const javaHome = 'C:\\Program Files\\Microsoft\\jdk-17.0.17.10-hotspot';
  const mavenHome = 'C:\\Users\\fran\\dev\\maven';
  const env = { ...process.env };
  env.JAVA_HOME = javaHome;
  env.MAVEN_HOME = mavenHome;
  env.Path = `${javaHome}\\bin;${mavenHome}\\bin;${env.Path || ''}`;

  // Usamos spawn para iniciar el proceso de Maven en segundo plano redirigiendo logs
  const logFile = 'c:/Users/fran/dev/projects/SGP/code/backend/target/backend-restart.log';
  const out = fs.openSync(logFile, 'a');
  const child = spawn('mvn.cmd', ['spring-boot:run'], {
    cwd: 'c:/Users/fran/dev/projects/SGP/code/backend',
    env: env,
    detached: true,
    shell: true,
    stdio: ['ignore', out, out]
  });
  child.unref();

  console.log('[Reinicio-Backend] Esperando a que el puerto 8080 esté listo...');
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      execSync('powershell -Command "Invoke-RestMethod -Uri http://localhost:8080/api/welcome"', { stdio: 'ignore' });
      ready = true;
      break;
    } catch (e) {
      execSync('powershell -Command "Start-Sleep -Seconds 2"');
    }
  }
  if (!ready) throw new Error("El backend no se inició a tiempo.");
  console.log('[Reinicio-Backend] Backend iniciado con éxito en puerto 8080.');
}

test.describe('Etapa 10 - Plan de Pruebas de Usabilidad, Multirrol y Dashboard', () => {
  test.describe.configure({ mode: 'serial' });

  test('Inicialización de base de datos', async ({ page }) => {
    // Limpiar base de datos
    console.log('[QA-Local] Limpiando solicitudes...');
    const clearDbRes = await page.request.post(`${BACKEND_URL}/api/test-helper/clear-all-solicitudes`);
    expect(clearDbRes.ok()).toBeTruthy();

    console.log('[QA-Local] Limpiando pestaña DESA en Sheets...');
    const clearRes = await page.request.post(`${BACKEND_URL}/api/test-helper/clear-sheet`, {
      data: {
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME
      }
    });
    expect(clearRes.ok()).toBeTruthy();
  });

  // 1. Validación de Selectores Estrictos (Localidad y Barrio)
  test('1. Validación de Selectores Estrictos (Localidad y Barrio)', async ({ page }) => {
    await iniciarSesion(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.click('button:has-text("Nueva Solicitud")');

    // Comprobar que localidad es un select y no un input text común
    const selectLocalidad = page.locator('label:has-text("Localidad") + select');
    await expect(selectLocalidad).toBeVisible();
    
    // Seleccionar Santa Fe y comprobar que Barrio se habilita y tiene "Otro" al final
    await selectLocalidad.selectOption('Santa Fe');
    const selectBarrio = page.locator('label:has-text("Barrio") + select');
    await expect(selectBarrio).toBeEnabled();

    const opcionesBarrio = await selectBarrio.locator('option').allInnerTexts();
    expect(opcionesBarrio.length).toBeGreaterThan(1);
    expect(opcionesBarrio[opcionesBarrio.length - 1]).toBe('Otro');

    // Cambiar localidad a Laguna Paiva y comprobar que se resetea barrio a vacío
    await selectLocalidad.selectOption('Laguna Paiva');
    await expect(selectBarrio).toHaveValue('');

    // Comprobar que en Laguna Paiva la única opción además de la vacía es "Otro"
    const opcionesBarrioRosario = await selectBarrio.locator('option').allInnerTexts();
    const cleanOptions = Array.from(new Set(opcionesBarrioRosario.map(o => o.trim().toLowerCase()).filter(o => o !== 'seleccione barrio...' && o !== '')));
    expect(cleanOptions).toEqual(['otro']);

    // Rellenar resto y guardar
    await page.locator('label:has-text("Nombre Completo / Institución") + input').fill('Beneficiario Selectores Estrictos');
    await page.locator('label:has-text("Teléfono") + input').first().fill('3424001122');
    await page.locator('label:has-text("Descripción / Pedido") + textarea').fill('Prueba de selector estricto');
    await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
    await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');
    await selectBarrio.selectOption('Otro');

    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.locator('text=creada con éxito')).toBeVisible();
  });

  // 2. Validación de Solicitudes Visibles por Rol (Punto 1 del Usuario)
  test('2. Validación de Solicitudes Visibles por Rol', async ({ page }) => {
    // 2.1 Crear 3 solicitudes sin responsable asignado (quedan globales PENDIENTE)
    await iniciarSesion(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
    const globalIds = [];

    for (let i = 1; i <= 3; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.click('button:has-text("Nueva Solicitud")');
      const name = `Solicitud Pendiente Global ${i} - ${Math.floor(Math.random()*10000)}`;
      await page.locator('label:has-text("Nombre Completo / Institución") + input').fill(name);
      await page.locator('label:has-text("Teléfono") + input').first().fill('3424001122');
      await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Global ${i}`);
      await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
      await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');
      await page.locator('label:has-text("Localidad") + select').selectOption('Santa Fe');
      await page.locator('label:has-text("Barrio") + select').selectOption('Otro');
      await page.click('button:has-text("Guardar Solicitud")');
      
      const toastSuccess = page.locator('text=creada con éxito');
      await expect(toastSuccess).toBeVisible();
      const text = await toastSuccess.innerText();
      const id = text.match(/#(\d+)/)[1];
      globalIds.push(id);
    }
    console.log(`Creadas solicitudes globales pendientes: ${globalIds}`);

    // 2.2 Login como Distribuidor Sabri (debe verlas en la lista)
    await iniciarSesion(page, CREDENTIALS.DISTRIBUIDOR_SABRI.email, CREDENTIALS.DISTRIBUIDOR_SABRI.pass, 'DISTRIBUIDOR');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar"]', `Solicitud Pendiente Global`);
    await page.waitForTimeout(1000);
    const countSabri = await page.locator('tbody tr').count();
    expect(countSabri).toBeGreaterThanOrEqual(3);
    console.log(`Distribuidor Sabri visualiza ${countSabri} solicitudes globales.`);

    // 2.3 Login como Responsable Barbara (NO debe verlas ya que no están asignadas a ella)
    await iniciarSesion(page, CREDENTIALS.RESPONSABLE_BARBARA.email, CREDENTIALS.RESPONSABLE_BARBARA.pass, 'Responsable');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.fill('input[placeholder*="Buscar"]', `Solicitud Pendiente Global`);
    await page.waitForTimeout(1000);
    const countBarbara = await page.locator('tbody tr').count();
    expect(countBarbara).toBe(0);
    console.log('Responsable Barbara no visualiza solicitudes globales sin asignación.');
  });

  // 3. Validación de Sesión Multirrol (Rol Activo - Punto 2 del Usuario)
  test('3. Validación de Sesión Multirrol', async ({ page }) => {
    // Iniciar sesión con Martín (RESOLUTOR y OPERADOR)
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_MARTIN.email, CREDENTIALS.RESOLUTOR_MARTIN.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    
    // Almacenamos rol activo en localStorage
    const activeRoleRes = await page.evaluate(() => localStorage.getItem('activeRole'));
    expect(activeRoleRes).toBe('RESOLUTOR');
    
    // Cambiar a Operador
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_MARTIN.email, CREDENTIALS.RESOLUTOR_MARTIN.pass, 'Operador');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    const activeRoleOp = await page.evaluate(() => localStorage.getItem('activeRole'));
    expect(activeRoleOp).toBe('OPERADOR');
  });

  // 4. Validación de Dashboard del Auditor y Distribución Geográfica
  test('4. Validación de Dashboard del Auditor', async ({ page }) => {
    await iniciarSesion(page, CREDENTIALS.AUDITOR.email, CREDENTIALS.AUDITOR.pass);
    await page.goto(`${BASE_URL}/dashboard`);

    // Selector de año inicializado en "Todos los años"
    const selectAnio = page.locator('select:near(label:has-text("Año"))').first();
    await expect(selectAnio).toHaveValue('ALL');

    // Tarjeta "Pendientes" no traducida como ESTAR (tiene translate="no")
    const tarjetaPendientes = page.locator('span[translate="no"]:has-text("Pendientes")');
    await expect(tarjetaPendientes).toBeVisible();

    // Gráficos cargados
    const recharts = page.locator('.recharts-responsive-container');
    expect(await recharts.count()).toBeGreaterThanOrEqual(1);
  });

  // 5. Control de Sobrescritura de Usuarios (Siembra de BD)
  test('5. Control de Sobrescritura de Usuarios', async ({ page }) => {
    test.setTimeout(120000);
    // Modificar DNI de Martín manualmente en DB mediante TestHelper
    console.log('[QA-Local] Modificando DNI de Martín a 99999999...');
    const modifyDni = await page.request.post(`${BACKEND_URL}/api/test-helper/modify-user-dni`, {
      data: { email: 'martinnocioni@gmail.com', dni: '99999999' }
    });
    expect(modifyDni.ok()).toBeTruthy();

    // Comprobar cambio en DB
    const getU1 = await page.request.get(`${BACKEND_URL}/api/test-helper/get-user?email=martinnocioni@gmail.com`);
    expect((await getU1.json()).dni).toBe('99999999');

    // Reiniciar backend con sgp.seed.overwrite-users=false
    restartBackend(false);
    await page.waitForTimeout(5000);

    // Comprobar que no se sobreescribió Martín (sigue con DNI 99999999)
    const getU2 = await page.request.get(`${BACKEND_URL}/api/test-helper/get-user?email=martinnocioni@gmail.com`);
    expect((await getU2.json()).dni).toBe('99999999');
    console.log('✅ Control de sobrescritura verificado: DNI de Martín conservó su cambio manual (99999999).');

    // Restaurar backend con sgp.seed.overwrite-users=true para dejarlo listo
    restartBackend(true);
    await page.waitForTimeout(5000);

    // Comprobar que ahora sí se sobrescribió Martín (DNI volvió al sembrado)
    const getU3 = await page.request.get(`${BACKEND_URL}/api/test-helper/get-user?email=martinnocioni@gmail.com`);
    expect((await getU3.json()).dni).toBe('31.111.251');
    console.log('✅ Restauración de sobrescritura verificada: DNI de Martín volvió al sembrado original.');
  });

  // 6. Matriz de Pruebas de Flujos y Casos de Negocio
  test('6. Matriz de Pruebas - Escenarios de Negocio', async ({ page }) => {
    test.setTimeout(600000);

    // ==========================================
    // ESCENARIO A: 7 Solicitudes de Subsidio
    // ==========================================
    console.log('[QA-Local-EscA] Iniciando Escenario A: 7 Subsidios...');
    const subIds = [];
    const subNames = [];

    // Crear 7 solicitudes como Operador
    await iniciarSesion(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
    for (let i = 1; i <= 7; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.click('button:has-text("Nueva Solicitud")');
      const name = `Subsidio EscA ${i} - ${Math.floor(Math.random()*10000)}`;
      await page.locator('label:has-text("Nombre Completo / Institución") + input').fill(name);
      await page.locator('label:has-text("Teléfono") + input').first().fill('3424001122');
      await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Subsidio EscA ${i}`);
      await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
      await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');
      await page.locator('label:has-text("Localidad") + select').selectOption('Santa Fe');
      await page.locator('label:has-text("Barrio") + select').selectOption('Otro');
      await page.click('button:has-text("Guardar Solicitud")');

      const toastSuccess = page.locator('text=creada con éxito');
      await expect(toastSuccess).toBeVisible();
      const text = await toastSuccess.innerText();
      const id = text.match(/#(\d+)/)[1];
      subIds.push(id);
      subNames.push(name);
    }

    // Distribuidor asigna responsable Matías Ippolito y zona Norte a las 7
    await iniciarSesion(page, CREDENTIALS.DISTRIBUIDOR_MATIAS.email, CREDENTIALS.DISTRIBUIDOR_MATIAS.pass, 'DISTRIBUIDOR');
    for (let i = 0; i < 7; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', subNames[i]);
      await page.waitForTimeout(500);
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);
      await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.getByText('Solicitud actualizada con éxito')).toBeVisible();
    }

    // Responsable añade resolución SUBSIDIO a las 7
    await iniciarSesion(page, CREDENTIALS.RESPONSABLE_BARBARA.email, CREDENTIALS.RESPONSABLE_BARBARA.pass, 'Responsable'); // Usamos Barbara que es responsable
    // Nota: Barbara tiene zone "Sur" pero Matias es responsable, let's login as MATIAS RESPONSABLE!
    await iniciarSesion(page, CREDENTIALS.DISTRIBUIDOR_MATIAS.email, CREDENTIALS.DISTRIBUIDOR_MATIAS.pass, 'Responsable');
    for (let i = 0; i < 7; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', subNames[i]);
      await page.waitForTimeout(500);
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      await page.click('button:has-text("Agregar")');
      await page.waitForTimeout(500);
      await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
      await page.waitForTimeout(500);

      await page.locator('label:has-text("Tipo de pedido")').locator('..').locator('select').selectOption('Personal');
      await page.locator('label:has-text("Nombre y apellido")').locator('..').locator('input').fill(`Benef EscA ${i}`);
      await page.locator('label:text-is("DNI")').locator('..').locator('input').fill('12345678');
      await page.locator('label:has-text("Dirección de DNI")').locator('..').locator('input').fill('Calle Falsa 123');

      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.getByText('Solicitud actualizada con éxito')).toBeVisible();
    }

    // Enviar a consideración
    // 2 solicitudes de forma individual
    for (let i = 0; i < 2; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', subNames[i]);
      await page.waitForTimeout(500);
      page.once('dialog', dialog => dialog.accept());
      await page.locator('tbody tr').first().locator('button[title="Poner en Consideración"]').click();
      await page.waitForTimeout(1000);
    }

    // 5 solicitudes en lote (bulk action)
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    // Limpiar buscador
    await page.fill('input[placeholder*="Buscar"]', 'Subsidio EscA');
    await page.waitForTimeout(1000);
    // Seleccionar los checkboxes de las 5 restantes (solicitudes 3 a 7)
    // Para simplificar, tildamos los checkboxes de las filas correspondientes en la grilla
    for (let i = 2; i < 7; i++) {
      const id = subIds[i];
      await page.locator(`tbody tr:has-text("#${id}") input[type="checkbox"]`).check();
    }
    // Clic en consideración en la barra flotante
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Consideración', exact: true }).click();
    await page.waitForTimeout(2000);

    // Resolutor de Subsidio (Martin) asocia y exporta a planilla ("DESA")
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_MARTIN.email, CREDENTIALS.RESOLUTOR_MARTIN.pass, 'Resolutor');
    await page.goto(`${BASE_URL}/mis-solicitudes`);
    await page.click('button:has-text("Asociar Planilla")');
    await page.waitForSelector('h3:has-text("Asociar Planilla Externa")');
    await page.locator('input[placeholder*="Ej: 1jPw9ni4BW"]').fill(SPREADSHEET_ID);
    await page.locator('label:has-text("Nombre de la Hoja") + input').fill(SHEET_NAME);
    await page.locator('form button[type="submit"]:has-text("Asociar Planilla")').click();
    await page.waitForTimeout(2000);

    // Exportar a Google Sheets
    await page.click('button:has-text("Exportar...")');
    await page.click('button:has-text("Google Sheets")');
    await expect(page.locator('text=Sincronización de exportación finalizada')).toBeVisible({ timeout: 45000 });

    // Modificar los montos en Google Sheets a un monto positivo (> 0)
    console.log('[QA-Local-EscA] Modificando montos en planilla a 150000...');
    for (const id of subIds) {
      const res = await page.request.post(`${BACKEND_URL}/api/test-helper/modify-solicitud-row`, {
        data: {
          spreadsheetId: SPREADSHEET_ID,
          sheetName: SHEET_NAME,
          solicitudId: id,
          columnName: 'Monto en dinero',
          newValue: '150000'
        }
      });
      expect(res.ok()).toBeTruthy();
    }

    // Esperar propagación de caché
    await page.waitForTimeout(5000);

    // Importar la planilla en el SGP
    await page.locator('button:has-text("Importar Planilla")').click();
    await expect(page.locator('text=Sincronización de importación finalizada')).toBeVisible({ timeout: 45000 });

    // Verificar que las 7 pasaron a Completadas
    for (let i = 0; i < 7; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', subNames[i]);
      await page.waitForTimeout(500);
      const isSubsidioView = await page.locator('thead th:has-text("Monto Solicitado")').count() > 0;
      const colIndex = isSubsidioView ? 13 : 9;
      const estadoCelda = page.locator('tbody tr').first().locator(`td:nth-child(${colIndex})`);
      await expect(estadoCelda).toHaveText('Resueltas');
    }
    console.log('✅ Escenario A de 7 Subsidios completado con éxito.');

    // ==========================================
    // ESCENARIO B: Flujo de Agenda y Calendario (5 Pruebas)
    // ==========================================
    console.log('[QA-Local-EscB] Iniciando Escenario B: 5 Agendas...');
    const agendaIds = [];
    const agendaNames = [];

    // Crear 5 solicitudes de Agenda como Operador
    await iniciarSesion(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
    for (let i = 1; i <= 5; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.click('button:has-text("Nueva Solicitud")');
      const name = `Agenda EscB ${i} - ${Math.floor(Math.random()*10000)}`;
      await page.locator('label:has-text("Nombre Completo / Institución") + input').fill(name);
      await page.locator('label:has-text("Teléfono") + input').first().fill('3424001122');
      await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Agenda EscB ${i}`);
      await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
      await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');
      await page.locator('label:has-text("Localidad") + select').selectOption('Santa Fe');
      await page.locator('label:has-text("Barrio") + select').selectOption('Otro');
      await page.click('button:has-text("Guardar Solicitud")');

      const toastSuccess = page.locator('text=creada con éxito');
      await expect(toastSuccess).toBeVisible();
      const text = await toastSuccess.innerText();
      const id = text.match(/#(\d+)/)[1];
      agendaIds.push(id);
      agendaNames.push(name);
    }

    // Distribuidor asigna responsable Matías Ippolito y zona Norte a las 5
    await iniciarSesion(page, CREDENTIALS.DISTRIBUIDOR_MATIAS.email, CREDENTIALS.DISTRIBUIDOR_MATIAS.pass, 'DISTRIBUIDOR');
    for (let i = 0; i < 5; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', agendaNames[i]);
      await page.waitForTimeout(500);
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);
      await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.getByText('Solicitud actualizada con éxito')).toBeVisible();
    }

    // Responsable añade resolución AGENDA a las 5
    await iniciarSesion(page, CREDENTIALS.DISTRIBUIDOR_MATIAS.email, CREDENTIALS.DISTRIBUIDOR_MATIAS.pass, 'Responsable');
    for (let i = 0; i < 5; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', agendaNames[i]);
      await page.waitForTimeout(500);
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      await page.click('button:has-text("Agregar")');
      await page.waitForTimeout(500);
      await page.locator('select:has-text("Seleccione Área...")').first().selectOption('AGENDA');
      await page.waitForTimeout(500);
      
      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.getByText('Solicitud actualizada con éxito')).toBeVisible();
    }

    // Resolutor de Agenda (Maria Veronica) aprueba las 5
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_MARIA.email, CREDENTIALS.RESOLUTOR_MARIA.pass, 'Resolutor');
    
    // Caso 1: 3 solicitudes con Asistencia obligatoria "con asistencia" y evento de Google Calendar
    for (let i = 0; i < 3; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', agendaNames[i]);
      await page.waitForTimeout(500);
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      await page.click('button:has-text("Aprobar Resolución")');
      const submodal = page.locator('div:has(h3:has-text("Aprobar"))').last();
      await submodal.waitFor();

      // Seleccionar Con Asistencia
      await submodal.locator('input[name="asistencia"][value="con asistencia"]').check();

      // Check Crear evento
      await submodal.getByRole('checkbox', { name: /Crear evento/ }).check();

      // Completar campos del calendario
      await submodal.locator('label:has-text("Título") + input').fill(`Evento EscB ${i}`);
      await submodal.locator('label:has-text("Fecha") + input').fill('2026-09-15');
      await submodal.locator('label:has-text("Ubicación") + input').fill('Oficina Central SGP');

      await submodal.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]').fill('Aprobado con asistencia obligatoria');
      await submodal.locator('button:has-text("Confirmar y Finalizar")').click();
      await page.waitForTimeout(2000);
    }

    // Caso 2: 2 solicitudes con Asistencia obligatoria "sin asistencia"
    for (let i = 3; i < 5; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', agendaNames[i]);
      await page.waitForTimeout(500);
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      await page.click('button:has-text("Aprobar Resolución")');
      const submodal = page.locator('div:has(h3:has-text("Aprobar"))').last();
      await submodal.waitFor();

      // Seleccionar Sin Asistencia
      await submodal.locator('input[name="asistencia"][value="sin asistencia"]').check();

      // Asegurar que no esté tildado crear evento
      await submodal.getByRole('checkbox', { name: /Crear evento/ }).uncheck();

      await submodal.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]').fill('Aprobado sin asistencia');
      await submodal.locator('button:has-text("Confirmar y Finalizar")').click();
      await page.waitForTimeout(2000);
    }
    console.log('✅ Escenario B de 5 Agendas completado con éxito.');

    // ==========================================
    // ESCENARIO C: Declaración de Interés (5 Pruebas)
    // ==========================================
    console.log('[QA-Local-EscC] Iniciando Escenario C: 5 Declaraciones...');
    const decIds = [];
    const decNames = [];

    // Crear 5 solicitudes de Declaración de Interés
    await iniciarSesion(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
    for (let i = 1; i <= 5; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.click('button:has-text("Nueva Solicitud")');
      const name = `Declaracion EscC ${i} - ${Math.floor(Math.random()*10000)}`;
      await page.locator('label:has-text("Nombre Completo / Institución") + input').fill(name);
      await page.locator('label:has-text("Teléfono") + input').first().fill('3424001122');
      await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Declaracion EscC ${i}`);
      await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
      await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');
      await page.locator('label:has-text("Localidad") + select').selectOption('Santa Fe');
      await page.locator('label:has-text("Barrio") + select').selectOption('Otro');
      await page.click('button:has-text("Guardar Solicitud")');

      const toastSuccess = page.locator('text=creada con éxito');
      await expect(toastSuccess).toBeVisible();
      const text = await toastSuccess.innerText();
      const id = text.match(/#(\d+)/)[1];
      decIds.push(id);
      decNames.push(name);
    }

    // Distribuidor asigna responsable Matías Ippolito y zona Norte a las 5
    await iniciarSesion(page, CREDENTIALS.DISTRIBUIDOR_MATIAS.email, CREDENTIALS.DISTRIBUIDOR_MATIAS.pass, 'DISTRIBUIDOR');
    for (let i = 0; i < 5; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', decNames[i]);
      await page.waitForTimeout(500);
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);
      await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.getByText('Solicitud actualizada con éxito')).toBeVisible();
    }

    // Responsable añade resolución DECLARACION DE INTERES a las 5
    await iniciarSesion(page, CREDENTIALS.DISTRIBUIDOR_MATIAS.email, CREDENTIALS.DISTRIBUIDOR_MATIAS.pass, 'Responsable');
    for (let i = 0; i < 5; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', decNames[i]);
      await page.waitForTimeout(500);
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      await page.click('button:has-text("Agregar")');
      await page.waitForTimeout(500);
      await page.locator('select:has-text("Seleccione Área...")').first().selectOption('DECLARACION DE INTERES');
      await page.waitForTimeout(500);
      
      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.getByText('Solicitud actualizada con éxito')).toBeVisible();
    }

    // Resolutor de Declaración de Interés (Eduardo Alfaro) aprueba las 5
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_EDUARDO.email, CREDENTIALS.RESOLUTOR_EDUARDO.pass, 'Resolutor');
    for (let i = 0; i < 5; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', decNames[i]);
      await page.waitForTimeout(500);
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      await page.click('button:has-text("Aprobar Resolución")');
      const submodal = page.locator('div:has(h3:has-text("Aprobar"))').last();
      await submodal.waitFor();

      await submodal.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]').fill('Aprobado Declaración EscC');
      await submodal.locator('button:has-text("Confirmar y Finalizar")').click();
      await page.waitForTimeout(2000);
    }
    console.log('✅ Escenario C de 5 Declaraciones completado con éxito.');

    // ==========================================
    // ESCENARIO D: Resoluciones Combinadas (8 Pruebas)
    // ==========================================
    console.log('[QA-Local-EscD] Iniciando Escenario D: 8 Combinadas...');
    const combIds = [];
    const combNames = [];

    // Crear 8 solicitudes de prueba
    await iniciarSesion(page, CREDENTIALS.OPERADOR.email, CREDENTIALS.OPERADOR.pass);
    for (let i = 1; i <= 8; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.click('button:has-text("Nueva Solicitud")');
      const name = `Combinada EscD ${i} - ${Math.floor(Math.random()*10000)}`;
      await page.locator('label:has-text("Nombre Completo / Institución") + input').fill(name);
      await page.locator('label:has-text("Teléfono") + input').first().fill('3424001122');
      await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(`Combinada EscD ${i}`);
      await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
      await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');
      await page.locator('label:has-text("Localidad") + select').selectOption('Santa Fe');
      await page.locator('label:has-text("Barrio") + select').selectOption('Otro');
      await page.click('button:has-text("Guardar Solicitud")');

      const toastSuccess = page.locator('text=creada con éxito');
      await expect(toastSuccess).toBeVisible();
      const text = await toastSuccess.innerText();
      const id = text.match(/#(\d+)/)[1];
      combIds.push(id);
      combNames.push(name);
    }

    // Distribuidor asigna responsable Matías Ippolito y zona Norte a las 8
    await iniciarSesion(page, CREDENTIALS.DISTRIBUIDOR_MATIAS.email, CREDENTIALS.DISTRIBUIDOR_MATIAS.pass, 'DISTRIBUIDOR');
    for (let i = 0; i < 8; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', combNames[i]);
      await page.waitForTimeout(500);
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);
      await page.locator('label:has-text("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.getByText('Solicitud actualizada con éxito')).toBeVisible();
    }

    // Responsable asigna ambos resolutores (Subsidio y Agenda) a cada una de las 8
    await iniciarSesion(page, CREDENTIALS.DISTRIBUIDOR_MATIAS.email, CREDENTIALS.DISTRIBUIDOR_MATIAS.pass, 'Responsable');
    for (let i = 0; i < 8; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', combNames[i]);
      await page.waitForTimeout(500);
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      // Asignar primer resolutor (SUBSIDIO)
      await page.click('button:has-text("Agregar")');
      await page.waitForTimeout(500);
      await page.locator('select:has-text("Seleccione Área...")').first().selectOption('SUBSIDIO');
      await page.waitForTimeout(500);

      await page.locator('label:has-text("Tipo de pedido")').locator('..').locator('select').selectOption('Personal');
      await page.locator('label:has-text("Nombre y apellido")').locator('..').locator('input').fill(`Benef EscD ${i}`);
      await page.locator('label:text-is("DNI")').locator('..').locator('input').fill('12345678');
      await page.locator('label:has-text("Dirección de DNI")').locator('..').locator('input').fill('Calle Falsa 123');

      // Asignar segundo resolutor (AGENDA)
      await page.click('button:has-text("Agregar")');
      await page.waitForTimeout(500);
      await page.locator('select:has-text("Seleccione Área...")').nth(1).selectOption('AGENDA');
      await page.waitForTimeout(500);

      await page.click('button:has-text("Guardar Solicitud")');
      await expect(page.getByText('Solicitud actualizada con éxito')).toBeVisible();
    }

    // Martín (Resolutor Subsidio) aprueba primero
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_MARTIN.email, CREDENTIALS.RESOLUTOR_MARTIN.pass, 'Resolutor');
    for (let i = 0; i < 8; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', combNames[i]);
      await page.waitForTimeout(500);
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      await page.click('button:has-text("Aprobar Resolución")');
      const submodal = page.locator('div:has(h3:has-text("Aprobar"))').last();
      await submodal.waitFor();
      await submodal.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]').fill('Aprobado Resolutor 1 (Subsidio)');
      await submodal.locator('button:has-text("Confirmar y Finalizar")').click();
      await page.waitForTimeout(2000);
    }

    // Verificar que la solicitud sigue en estado "En proceso" o "En resolución" (no está Completada todavía)
    for (let i = 0; i < 8; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', combNames[i]);
      await page.waitForTimeout(500);
      const isSubsidioView = await page.locator('thead th:has-text("Monto Solicitado")').count() > 0;
      const colIndex = isSubsidioView ? 13 : 9;
      const estadoCelda = page.locator('tbody tr').first().locator(`td:nth-child(${colIndex})`);
      // Debería estar en estado "En resolución" o similar, no "Resueltas"
      await expect(estadoCelda).not.toHaveText('Resueltas');
    }

    // María Verónica (Resolutor Agenda) aprueba después
    await iniciarSesion(page, CREDENTIALS.RESOLUTOR_MARIA.email, CREDENTIALS.RESOLUTOR_MARIA.pass, 'Resolutor');
    for (let i = 0; i < 8; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', combNames[i]);
      await page.waitForTimeout(500);
      await page.locator('tbody tr').first().locator('button[title="Ver / Editar Detalles"]').click();
      await page.waitForTimeout(1000);

      await page.click('button:has-text("Aprobar Resolución")');
      const submodal = page.locator('div:has(h3:has-text("Aprobar"))').last();
      await submodal.waitFor();

      // Seleccionar Sin Asistencia
      await submodal.locator('input[name="asistencia"][value="sin asistencia"]').check();
      await submodal.getByRole('checkbox', { name: /Crear evento/ }).uncheck();

      await submodal.locator('textarea[placeholder="Escriba aquí los detalles de la resolución..."]').fill('Aprobado Resolutor 2 (Agenda)');
      await submodal.locator('button:has-text("Confirmar y Finalizar")').click();
      await page.waitForTimeout(2000);
    }

    // Verificar que finalmente las 8 transicionaron a Completadas ("Resueltas")
    for (let i = 0; i < 8; i++) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
      await page.fill('input[placeholder*="Buscar"]', combNames[i]);
      await page.waitForTimeout(500);
      const isSubsidioView = await page.locator('thead th:has-text("Monto Solicitado")').count() > 0;
      const colIndex = isSubsidioView ? 13 : 9;
      const estadoCelda = page.locator('tbody tr').first().locator(`td:nth-child(${colIndex})`);
      await expect(estadoCelda).toHaveText('Resueltas');
    }
    console.log('✅ Escenario D de 8 Combinadas completado con éxito.');
  });
});
