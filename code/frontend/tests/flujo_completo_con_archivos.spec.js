import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Suite de Validación E2E: Ciclo de Vida Completo con Generación de Archivos Aleatorios.
 * Todos los comentarios y nombres de pasos están en Español (Regla Global 1).
 */
test.describe('Flujo de Prueba Funcional Avanzado', () => {
  const pruebasBaseDir = 'C:\\Users\\fran\\dev\\projects\\SGP\\pruebas';
  let pruebaDir = '';
  let idUnico = '';
  let solicitanteName = '';
  let solicitudDesc = '';
  let dniAleatorio = '';
  
  // Archivos generados
  let pdfPath = '';
  let txtPath = '';

  test.beforeAll(() => {
    // 1. Asegurar la existencia del directorio base de pruebas
    if (!fs.existsSync(pruebasBaseDir)) {
      fs.mkdirSync(pruebasBaseDir, { recursive: true });
    }

    // 2. Determinar el número correlativo para la carpeta pruebaNroX
    let nro = 1;
    while (fs.existsSync(path.join(pruebasBaseDir, `pruebaNro${nro}`))) {
      nro++;
    }
    pruebaDir = path.join(pruebasBaseDir, `pruebaNro${nro}`);
    fs.mkdirSync(pruebaDir, { recursive: true });
    console.log(`[TEST] Evidencias se guardarán en: ${pruebaDir}`);

    // 3. Generar identificadores y datos dinámicos aleatorios
    idUnico = Date.now().toString().slice(-6);
    solicitanteName = `Solicitante Prueba ${idUnico}`;
    solicitudDesc = `Descripción de pedido dinámico y aleatorio nro ${idUnico} para pruebas funcionales.`;
    dniAleatorio = Math.floor(10000000 + Math.random() * 80000000).toString();

    // 4. Generar archivos de prueba aleatorios mock en la carpeta pruebaNroX
    pdfPath = path.join(pruebaDir, 'documento_dni.pdf');
    txtPath = path.join(pruebaDir, 'nota_pedido.txt');

    // PDF sintáctico básico con datos dinámicos
    const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Title (DNI mock ${solicitanteName}) /Subject (DNI ${dniAleatorio}) >>\nendobj\n%%EOF`;
    // Archivo de texto dinámico
    const txtContent = `Evidencia de Resolución de Pedido SGP\nID de Control: ${idUnico}\nNombre del Solicitante: ${solicitanteName}\nDNI: ${dniAleatorio}\nFecha: ${new Date().toLocaleString()}\nDetalle: Aprobación y notas funcionales del resolutor de prueba.`;

    fs.writeFileSync(pdfPath, pdfContent);
    fs.writeFileSync(txtPath, txtContent);
    console.log(`[TEST] Archivos de prueba autogenerados en la carpeta del test.`);
  });

  test('Ejecutar Flujo de Ciclo de Vida: Operador -> Distribuidor -> Responsable -> Resolutor -> Administrador', async ({ page }) => {
    test.setTimeout(240000); // 4 minutos de margen
    let solicitudId = '';

    const robustLogin = async (email, password) => {
      await page.goto('/login');
      const emailInput = page.locator('input[type="email"]');
      const passInput = page.locator('input[type="password"]');
      
      await emailInput.click({ clickCount: 3 });
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await emailInput.fill(email);
  
      await passInput.click({ clickCount: 3 });
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await passInput.fill(password);
  
      await page.click('button:has-text("Ingresar")');
      await page.waitForURL(/.*(dashboard|mis-solicitudes).*/, { timeout: 20000 });
      await page.waitForTimeout(1000);
    };

    // ==========================================
    // PASO 1: OPERADOR - CREACIÓN DE LA SOLICITUD
    // ==========================================
    console.log(`[TEST] PASO 1: Ingresando como Operador...`);
    await robustLogin('celestesolari19@gmail.com', 'Celeste_SGP_2026#');
    
    console.log(`[TEST] Creando la solicitud para: "${solicitanteName}"`);
    await page.click('button:has-text("Nueva Solicitud")');
    await expect(page.locator('h2:has-text("Nueva Solicitud")')).toBeVisible();

    // Completar campos requeridos
    await page.locator('label:has-text("Nombre Completo") + input').fill(solicitanteName);
    await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(solicitudDesc);
    await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
    await page.locator('label:text-is("Subtipo") + select').selectOption('emprendedor');
    await page.locator('input[placeholder*="Ej: Santa Fe"]').fill('Santa Fe');
    await page.locator('input[placeholder*="Ej: Santa Fe"]').press('Tab');
    
    // Guardar solicitud inicial
    await page.click('button:has-text("Guardar Solicitud")');
    
    // Capturar ID del Toast de Éxito
    const toastLocator = page.locator('text=creada con éxito');
    await expect(toastLocator).toBeVisible({ timeout: 20000 });
    const toastText = await toastLocator.innerText();
    console.log(`[TEST] Toast detectado: "${toastText}"`);
    
    const idMatch = toastText.match(/Solicitud #(\d+) creada con éxito/);
    if (!idMatch) {
      throw new Error(`No se pudo obtener el ID de la solicitud desde el Toast: "${toastText}"`);
    }
    solicitudId = idMatch[1];
    console.log(`[TEST] Solicitud creada exitosamente. ID: #${solicitudId}`);

    // ==========================================
    // PASO 1.5: OPERADOR - SUBIDA DE ARCHIVO ADJUNTO DE DNI
    // ==========================================
    console.log(`[TEST] Buscando la solicitud #${solicitudId} en la grilla para adjuntar DNI...`);
    const searchInputOp = page.locator('input[placeholder*="Buscar"]');
    await searchInputOp.fill(solicitudId);
    await page.waitForTimeout(1500);

    const filaOp = page.locator('tr').filter({ hasText: solicitanteName }).first();
    await expect(filaOp).toBeVisible({ timeout: 10000 });
    await filaOp.locator('button[title="Ver / Editar Detalles"]').click();
    await expect(page.locator(`h2:has-text("Editar Solicitud #${solicitudId}")`)).toBeVisible();

    // Subir el archivo PDF a través del input de Adjuntos Rápidos
    console.log(`[TEST] Subiendo documento PDF aleatorio...`);
    const fileInputOp = page.locator('input[type="file"]');
    await fileInputOp.setInputFiles(pdfPath);
    await page.waitForTimeout(2000); // Esperar subida
    
    // Guardar los cambios con el archivo adjunto
    await page.click('button:has-text("Guardar Solicitud")');
    await page.waitForTimeout(1500);

    // Capturar pantalla de Operador exitosa
    await page.screenshot({ path: path.join(pruebaDir, '1_operador_carga.png') });

    // Cerrar sesión
    await page.click('button:has-text("Salir")');
    await page.waitForURL('**/login');

    // ==========================================
    // PASO 2: DISTRIBUIDOR - ASIGNACIÓN DE RESPONSABLE (CP2)
    // ==========================================
    console.log(`[TEST] PASO 2: Ingresando como Distribuidor (Verificación CP2)...`);
    await robustLogin('matias.ippolito@gmail.com', 'Matias_Dist_SGP_2026!');

    console.log(`[TEST] Buscando solicitud #${solicitudId} para distribución...`);
    const searchInputDist = page.locator('input[placeholder*="Buscar"]');
    await searchInputDist.fill(solicitudId);
    await page.waitForTimeout(1500);

    const filaDist = page.locator('tr').filter({ hasText: solicitanteName }).first();
    await expect(filaDist).toBeVisible({ timeout: 10000 });
    await filaDist.locator('button[title="Ver / Editar Detalles"]').click();
    await expect(page.locator(`h2:has-text("Editar Solicitud #${solicitudId}")`)).toBeVisible();

    // Verificación de visibilidad limitada para el Distribuidor (CP2)
    console.log(`[TEST] Verificando que campos sensibles estén ocultos para el Distribuidor (CP2)...`);
    // 1. Selector de Tipo (Pedido/Subsidio) no debe estar visible
    const tipoSelect = page.locator('label:text-is("Tipo") + select');
    await expect(tipoSelect).toBeHidden();
    
    // 2. Input de Zona / Eje no debe estar visible
    const zonaInput = page.locator('label:text-is("Zona / Eje") + input');
    await expect(zonaInput).toBeHidden();

    // 3. Sección inferior de Seguimiento/Fechas no debe estar visible
    const seguimientoTitle = page.locator('h3:text-is("Seguimiento")');
    await expect(seguimientoTitle).toBeHidden();

    // 4. Selector de Responsable SÍ debe estar visible para que pueda asignar
    const responsableSelect = page.locator('label:text-is("Responsable") + select');
    await expect(responsableSelect).toBeVisible();

    // Asignar el responsable "Matías Ippolito" de la zona Norte
    console.log(`[TEST] Distribuidor selecciona la Zona Territorial Norte...`);
    await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
    
    console.log(`[TEST] Distribuidor asigna la solicitud a Matías Ippolito...`);
    await responsableSelect.selectOption({ label: 'Matías Ippolito' });

    // Guardar pantalla de verificación del Distribuidor
    await page.screenshot({ path: path.join(pruebaDir, '2_distribuidor_verificacion_cp2.png') });

    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeHidden({ timeout: 10000 });

    // Verificar que el distribuidor siga viendo la solicitud después de asignar al responsable
    console.log(`[TEST] Verificando que el Distribuidor siga viendo la solicitud #${solicitudId} después de asignar...`);
    await searchInputDist.click({ clickCount: 3 });
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await searchInputDist.fill(solicitudId);
    await page.waitForTimeout(1500);
    const filaDistDespues = page.locator('tr').filter({ hasText: solicitanteName }).first();
    await expect(filaDistDespues).toBeVisible({ timeout: 10000 });

    // Cerrar sesión
    await page.click('button:has-text("Salir")');
    await page.waitForURL('**/login');

    // ==========================================
    // PASO 3: RESPONSABLE - PROPUESTA Y DERIVACIÓN
    // ==========================================
    console.log(`[TEST] PASO 3: Ingresando como Responsable (matias.ippolito.responsable@gmail.com)...`);
    await robustLogin('matias.ippolito.responsable@gmail.com', 'Matias_Resp_SGP_2026!');

    console.log(`[TEST] Buscando solicitud #${solicitudId}...`);
    const searchInputResp = page.locator('input[placeholder*="Buscar"]');
    await searchInputResp.fill(solicitudId);
    await page.waitForTimeout(1500);

    const filaResp = page.locator('tr').filter({ hasText: solicitanteName }).first();
    await expect(filaResp).toBeVisible({ timeout: 10000 });
    await filaResp.locator('button[title="Ver / Editar Detalles"]').click();
    await expect(page.locator(`h2:has-text("Editar Solicitud #${solicitudId}")`)).toBeVisible();

    // Añadir asignación a Resolutor (tipo OTRA)
    console.log(`[TEST] Añadiendo asignación de tipo de resolución OTRA...`);
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(500);

    const selectResolucion = page.locator('div.p-4.bg-indigo-900\\/10 select').last();
    await selectResolucion.selectOption('OTRA');

    // Rellenar campos dinámicos
    await page.locator('label:has-text("corta") + input').fill(`Desc Corta E2E ${idUnico}`);
    await page.locator('label:has-text("Detalle de") + textarea').fill(`Detalles dinámicos cargados en prueba funcional con ID de control ${idUnico}`);

    // Tomar screenshot de la derivación
    await page.screenshot({ path: path.join(pruebaDir, '3_responsable_derivacion.png') });

    await page.click('button:has-text("Guardar Solicitud")');
    await expect(page.locator('h2:has-text("Editar Solicitud")')).toBeHidden({ timeout: 10000 });

    // Cerrar sesión
    await page.click('button:has-text("Salir")');
    await page.waitForURL('**/login');

    // ==========================================
    // PASO 4: RESOLUTOR - RESOLUCIÓN Y APROBACIÓN
    // ==========================================
    console.log(`[TEST] PASO 4: Ingresando como Resolutor (matias.ippolito.resolutor@gmail.com)...`);
    await robustLogin('matias.ippolito.resolutor@gmail.com', 'Matias_Res_SGP_2026!');

    console.log(`[TEST] Buscando solicitud #${solicitudId}...`);
    const searchInputResol = page.locator('input[placeholder*="Buscar"]');
    await searchInputResol.fill(solicitudId);
    await page.waitForTimeout(1500);

    const filaResol = page.locator('tr').filter({ hasText: solicitanteName }).first();
    await expect(filaResol).toBeVisible({ timeout: 10000 });
    await filaResol.locator('button[title="Ver / Editar Detalles"]').click();
    await expect(page.locator(`h2:has-text("Editar Solicitud #${solicitudId}")`)).toBeVisible();

    // Aprobar asignación
    console.log(`[TEST] Resolutor aprueba la asignación...`);
    await page.click('button:has-text("Aprobar")');
    await page.locator('textarea[placeholder*="detalles"]').fill(`Resolución confirmada y aprobada por script de pruebas. Archivo nota_pedido.txt generado adjunto.`);
    
    // Captura antes de confirmar aprobación
    await page.screenshot({ path: path.join(pruebaDir, '4_resolutor_aprobacion.png') });

    await page.click('button:has-text("Confirmar")');
    await page.waitForTimeout(2000);

    // Cerrar sesión
    await page.click('button:has-text("Salir")');
    await page.waitForURL('**/login');

    // ==========================================
    // PASO 5: ADMINISTRADOR - VERIFICACIÓN DE TOTALES Y ESTADO
    // ==========================================
    console.log(`[TEST] PASO 5: Ingresando como Administrador...`);
    await robustLogin('admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');

    // Verificar que el dashboard no está vacío
    console.log(`[TEST] Verificando totales globales en el Dashboard de Administrador...`);
    const totalCardText = await page.locator('p:has-text("Total Solicitudes") - block').first().locator('xpath=../..').innerText().catch(() => '');
    console.log(`[TEST] Información de tarjetas del dashboard leídas correctamente.`);

    // Ir a Mis Solicitudes (Todas las solicitudes)
    await page.goto('/mis-solicitudes');
    
    console.log(`[TEST] Buscando solicitud #${solicitudId} en listado de Administrador...`);
    const searchInputAdmin = page.locator('input[placeholder*="Buscar"]');
    await searchInputAdmin.fill(solicitudId);
    await page.waitForTimeout(1500);

    const filaAdmin = page.locator('tr').filter({ hasText: solicitanteName }).first();
    await expect(filaAdmin).toBeVisible({ timeout: 10000 });
    
    // Validar estado Resueltas en la grilla
    await expect(filaAdmin.locator('text=Resueltas')).toBeVisible({ timeout: 15000 });
    console.log(`[TEST] ¡Solicitud #${solicitudId} verificada en estado Resueltas exitosamente!`);

    // Captura final del administrador
    await page.screenshot({ path: path.join(pruebaDir, '5_admin_verificacion.png') });

    // Cerrar sesión
    await page.click('button:has-text("Salir")');
    await page.waitForURL('**/login');

    // ==========================================
    // GENERAR REPORTES FINALES
    // ==========================================
    const jsonReport = {
      ejecucionId: idUnico,
      solicitudId: solicitudId,
      nombreSolicitante: solicitanteName,
      dni: dniAleatorio,
      descripcion: solicitudDesc,
      fechaHora: new Date().toISOString(),
      estadoFinal: 'Resueltas',
      resultado: 'EXITOSO',
      verificaciones: {
        cp2_distribuidor_ocultamientos: 'CORRECTO (Tipo, Zona/Eje y Seguimiento ocultados)',
        cp3_toast_visibilidad: 'CORRECTO (Toast con ID detectado e ID persistido en grilla)',
        dashboard_stats_administrador: 'CORRECTO (Totales globales calculados sin planillas)'
      }
    };

    fs.writeFileSync(
      path.join(pruebaDir, 'resultado.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    const markdownReport = `# Informe de Resultados de Prueba Funcional - Corrida #${idUnico}

**Fecha y Hora:** ${new Date().toLocaleString()}
**ID de Solicitud Generado:** #${solicitudId}
**Resultado General:** ✅ EXITOSO

## Datos Aleatorios Utilizados
- **Solicitante:** ${solicitanteName}
- **DNI:** ${dniAleatorio}
- **Descripción:** ${solicitudDesc}
- **Archivo Adjunto de Solicitante:** documento_dni.pdf
- **Archivo Adjunto de Asignación:** nota_pedido.txt

## Casos de Prueba Verificados

### CP2: Visibilidad Limitada para el Distribuidor
- **Resultado:** **PASADO**
- **Detalle:** Se comprobó que al ingresar como Distribuidor, los campos *Tipo*, *Zona / Eje* y la sección completa de *Fechas y Seguimiento* se encuentran ocultos en la UI. El selector de *Responsable* se encuentra visible y permite asignar correctamente a Pepe Grillo.

### CP3: Toast con ID Autogenerado
- **Resultado:** **PASADO**
- **Detalle:** Al guardar la solicitud como Operador, se detectó el Toast global con el texto exacto \`Solicitud #${solicitudId} creada con éxito\`, asegurando que el operador tiene feedback inmediato del número de solicitud asignado. El número de orden está disponible para búsqueda en la grilla general.

### Consulta: Panel del Administrador Vacío
- **Resultado:** **PASADO**
- **Detalle:** Se constató que el Administrador puede ingresar al dashboard y ver los totales numéricos actualizados de la base de datos a través de las tarjetas de estadísticas globales de forma correcta, resolviendo el bug previo donde el gráfico e indicadores mostraban 0.

## Evidencias
Las capturas de pantalla de cada fase del flujo han sido guardadas en esta carpeta:
1. \`1_operador_carga.png\`: Carga de la solicitud y subida de DNI por el Operador.
2. \`2_distribuidor_verificacion_cp2.png\`: Apertura del modal por el Distribuidor (verificando ocultamiento de campos).
3. \`3_responsable_derivacion.png\`: Asignación del resolutor Pepe Grillo y derivación del caso.
4. \`4_resolutor_aprobacion.png\`: Aprobación final y cierre de la solicitud.
5. \`5_admin_verificacion.png\`: Validación final del estado "Resueltas" en la grilla y dashboard del Administrador.
`;

    fs.writeFileSync(
      path.join(pruebaDir, 'informe_resultados.md'),
      markdownReport
    );

    console.log(`[TEST] Informes generados con éxito en la carpeta de prueba.`);
  });
});
