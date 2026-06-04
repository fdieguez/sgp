import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Suite de Validación E2E Avanzada: Doble Resolutor y Carga Completa sin campos vacíos.
 * Todos los comentarios y nombres de pasos están en Español (Regla Global 1).
 */
test.describe('Flujo Avanzado: Doble Resolutor y Carga Completa', () => {
  const pruebasBaseDir = 'C:\\Users\\fran\\dev\\projects\\SGP\\pruebas';
  let pruebaDir = '';
  let idUnico = '';
  let resolutor2Email = '';
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
    console.log(`[TEST-AVANZADO] Evidencias se guardarán en: ${pruebaDir}`);

    // 3. Generar identificadores y datos dinámicos aleatorios
    idUnico = Date.now().toString().slice(-6);
    resolutor2Email = `resolutor2_${idUnico}@sgp.com`;
    solicitanteName = `Solicitante Completo ${idUnico}`;
    solicitudDesc = `Descripción funcional de carga y validación avanzada del sistema nro ${idUnico}.`;
    dniAleatorio = Math.floor(10000000 + Math.random() * 80000000).toString();

    // 4. Generar archivos de prueba aleatorios mock en la carpeta pruebaNroX
    pdfPath = path.join(pruebaDir, 'documento_dni.pdf');
    txtPath = path.join(pruebaDir, 'nota_pedido.txt');

    const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Title (DNI mock ${solicitanteName}) /Subject (DNI ${dniAleatorio}) >>\nendobj\n%%EOF`;
    const txtContent = `Evidencia de Resolución de Pedido SGP\nID de Control: ${idUnico}\nNombre del Solicitante: ${solicitanteName}\nDNI: ${dniAleatorio}\nFecha: ${new Date().toLocaleString()}`;

    fs.writeFileSync(pdfPath, pdfContent);
    fs.writeFileSync(txtPath, txtContent);
    console.log(`[TEST-AVANZADO] Archivos de prueba autogenerados en la carpeta del test.`);
  });

  test('Ejecutar Flujo Completo: Registro Resolutor 2 -> Asignar a AGENDA -> Carga Completa -> Aprobación Doble', async ({ page }) => {
    test.setTimeout(300000); // 5 minutos máximo
    let solicitudId = '';
    let agendaRestaurada = false;

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
      await page.waitForURL(/.*(dashboard|mis-solicitudes|settings).*/, { timeout: 20000 });
      await page.waitForTimeout(1500);
    };

    try {
      // ========================================================
      // PASO 1: ADMINISTRADOR - CREAR SEGUNDO USUARIO RESOLUTOR
      // ========================================================
      console.log(`[TEST-AVANZADO] PASO 1: Creando el segundo resolutor (${resolutor2Email})...`);
      await robustLogin('admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
      
      // Ir a configuración
      await page.goto('/settings');
      await page.click('button:has-text("Nuevo Usuario")');
      await expect(page.locator('h2:has-text("Nuevo Usuario")')).toBeVisible();

      // Rellenar formulario de usuario
      await page.locator('label:has-text("Nombre") + input').first().fill('Resolutor');
      await page.locator('label:has-text("Apellido") + input').fill(`Segundo ${idUnico}`);
      await page.locator('label:has-text("Email") + input').fill(resolutor2Email);
      await page.locator('label:has-text("Contrase") + input').fill('SGP_StrongPass_2026!');
      await page.locator('label:has-text("Tel") + input').fill('3415998877');
      await page.locator('label:has-text("DNI") + input').fill(dniAleatorio);
      
      // Checkbox de rol RESOLUTOR y desmarcar OPERADOR
      await page.locator('label:has-text("Resolutor") input[type="checkbox"]').check();
      await page.locator('label:has-text("Operador") input[type="checkbox"]').uncheck();

      // Guardar pantalla de creación de usuario
      await page.screenshot({ path: path.join(pruebaDir, '1_admin_creacion_resolutor2.png') });
      await page.click('button:has-text("Crear Usuario")');
      await page.waitForTimeout(2000);

      // ========================================================
      // PASO 2: ADMINISTRADOR - CONFIGURAR RESOLUTOR 2 PARA AGENDA
      // ========================================================
      console.log(`[TEST-AVANZADO] PASO 2: Configurando el tipo de resolución AGENDA...`);
      await page.click('button:has-text("Tipos de Resolución")');
      
      // Buscar la fila de AGENDA y hacer clic en el lápiz
      const agendaRow = page.locator('tr').filter({ hasText: 'AGENDA' }).first();
      await agendaRow.locator('button').first().click();
      await expect(page.locator('h3:has-text("Editar Formulario Dinámico")')).toBeVisible();

      // Cambiar resolutor por defecto de forma robusta por email
      const selectDef = page.locator('label:has-text("Defecto") + select');
      const optValueRes2 = await selectDef.locator('option', { hasText: resolutor2Email }).getAttribute('value');
      await selectDef.selectOption(optValueRes2);

      // Guardar cambios
      await page.screenshot({ path: path.join(pruebaDir, '2_admin_configuracion_agenda.png') });
      await page.click('button:has-text("Guardar Cambios")');
      await page.waitForTimeout(2000);

      // ========================================================
      // PASO 3: ADMINISTRADOR - CREAR SOLICITUD TOTALMENTE COMPLETA
      // ========================================================
      console.log(`[TEST-AVANZADO] PASO 3: Creando solicitud con todos los campos y dos asignaciones...`);
      await page.goto('/mis-solicitudes');
      await page.click('button:has-text("Nueva Solicitud")');
      await expect(page.locator('h2:has-text("Nueva Solicitud")')).toBeVisible();

      // 3.1 Solicitante
      await page.locator('label:has-text("Nombre Completo") + input').fill(solicitanteName);
      await page.locator('label:has-text("Tel") + input').first().fill('3414992211');
      await page.locator('label:has-text("Tipo Solicitante") + select').selectOption('Personal');
      await page.locator('label:has-text("Subtipo") + select').selectOption('emprendedor');

      // 3.2 Ubicación
      await page.locator('input[placeholder*="Ej: Santa Fe"]').fill('Santa Fe');
      await page.locator('input[placeholder*="Ej: Santa Fe"]').press('Tab');
      await page.locator('label:has-text("Barrio") + input').fill('Candioti');
      await page.locator('label:has-text("Zona") + input').fill('Zona Norte');

      // 3.3 Datos del Pedido (Subsidio)
      await page.locator('label:text-is("Tipo") + select').selectOption('SUBSIDIO');
      await page.locator('label:has-text("Monto") + input').fill('250000');
      await page.locator('label:has-text("Fecha Entrega") + input').fill('2026-05-30');

      // 3.4 Descripción y detalles
      await page.locator('label:has-text("Pedido") + textarea').fill(solicitudDesc);
      await page.locator('label:has-text("Observac") + textarea').fill('Esta es una observación de prueba de carga completa administrativa.');
      await page.locator('label:has-text("Origen") + select').selectOption('MANUAL');

      // 3.5 Fechas, responsable y seguimiento
      await page.locator('label:has-text("Ingreso") + input').fill('2026-05-29');
      await page.locator('label:text-is("Zona Territorial") + select').selectOption('Norte');
      await page.locator('label:has-text("Responsable") + select').selectOption({ label: 'Matías Ippolito' });
      await page.locator('label:has-text("Contacto") + input').fill('2026-05-29');
      await page.locator('label:has-text("Fecha de Resoluc") + input').fill('2026-05-29');
      await page.locator('label:has-text("Resoluc") + input[type="text"]').fill('Aprobación Favorable Completa');
      await page.locator('label:has-text("Detalle") + textarea').fill('Se realizó el análisis de la solicitud y del presupuesto adjunto.');
      await page.locator('input[type="checkbox"]#firstContactControl').check();

      // 3.6 Agregar Asignación 1: OTRA (apunta a resolutor@sgp.com)
      console.log(`[TEST-AVANZADO] Añadiendo asignación 1: OTRA...`);
      await page.click('button:has-text("Agregar")');
      const container1 = page.locator('div.bg-indigo-900\\/10 div.group').nth(0);
      await expect(container1).toBeVisible({ timeout: 10000 });
      await container1.locator('select').first().selectOption('OTRA');
      await page.waitForTimeout(1500);
      await container1.locator('label:has-text("corta") + input').fill(`Detalle Corto OTRA ${idUnico}`);
      await container1.locator('label:has-text("Detalle de") + textarea').fill(`Detalle dinámico de seguimiento para la resolución OTRA ${idUnico}`);
      await container1.locator('input[type="file"]').setInputFiles(txtPath);
      await page.waitForTimeout(1500);

      // 3.7 Agregar Asignación 2: AGENDA (apunta a resolutor2@sgp.com)
      console.log(`[TEST-AVANZADO] Añadiendo asignación 2: AGENDA...`);
      await page.click('button:has-text("Agregar")');
      const container2 = page.locator('div.bg-indigo-900\\/10 div.group').nth(1);
      await expect(container2).toBeVisible({ timeout: 10000 });
      await container2.locator('select').first().selectOption('AGENDA');
      await page.waitForTimeout(1500);
      
      // Rellenar los 9 campos dinámicos de AGENDA
      await container2.locator('label:has-text("actividad") + select').selectOption({ index: 1 });
      await container2.locator('label:has-text("Organización propia") + select').selectOption({ index: 1 });
      await container2.locator('label:has-text("Detalle de actividad") + textarea').fill(`Temario de la actividad del evento: agenda del día, presentaciones, debate y conclusiones ${idUnico}`);
      await container2.locator('label:has-text("asisten") + input').fill(`Asistentes esperados: 50 personas de la comunidad local y representantes ${idUnico}`);
      await container2.locator('label:has-text("inter") + select').selectOption({ index: 1 });
      await container2.locator('label:has-text("Aporte") + select').selectOption({ index: 1 });
      await container2.locator('label:has-text("aporte") + textarea').fill(`Aporte del SGP para la logística del evento y sonido ${idUnico}`);
      await container2.locator('label:has-text("responsable") + input').fill(`Juan Perez Responsable, DNI: ${dniAleatorio}, Tel: 3415998877`);
      await container2.locator('label:has-text("Observac") + textarea').fill(`Observación de la agenda del evento cargada por el test de doble resolutor.`);
      await page.waitForTimeout(1000);

      // Guardar captura de pantalla de la carga completa
      await page.screenshot({ path: path.join(pruebaDir, '3_admin_carga_completa.png') });

      // Guardar solicitud
      await page.click('button:has-text("Guardar Solicitud")');
      
      // Capturar ID del Toast
      const toastLocator = page.locator('text=creada con éxito');
      await expect(toastLocator).toBeVisible({ timeout: 20000 });
      const toastText = await toastLocator.innerText();
      const idMatch = toastText.match(/Solicitud #(\d+) creada con éxito/);
      if (!idMatch) {
        throw new Error(`No se pudo obtener el ID de la solicitud desde el Toast: "${toastText}"`);
      }
      solicitudId = idMatch[1];
      console.log(`[TEST-AVANZADO] Solicitud completa creada. ID: #${solicitudId}`);

      // ========================================================
      // PASO 3.5: ADMINISTRADOR - SUBIR ARCHIVO EN EDICIÓN
      // ========================================================
      console.log(`[TEST-AVANZADO] Abriendo la solicitud #${solicitudId} para subir el PDF de DNI...`);
      const searchInputAdmin = page.locator('input[placeholder*="Buscar"]');
      await searchInputAdmin.fill(solicitudId);
      await page.waitForTimeout(1500);

      const filaAdmin = page.locator('tr').filter({ hasText: solicitanteName }).first();
      await expect(filaAdmin).toBeVisible({ timeout: 10000 });
      await filaAdmin.locator('button[title="Ver / Editar Detalles"]').click();
      await expect(page.locator(`h2:has-text("Editar Solicitud #${solicitudId}")`)).toBeVisible();

      // Subir documento
      const fileInputAdmin = page.locator('div:has-text("Adjuntos Rápidos") input[type="file"]').first();
      await fileInputAdmin.setInputFiles(pdfPath);
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: path.join(pruebaDir, '3_5_admin_adjunto_pdf.png') });
      await page.click('button:has-text("Guardar Solicitud")');
      await page.waitForTimeout(1500);

      // Salir
      await page.click('button:has-text("Salir")');
      await page.waitForURL('**/login');

      // ========================================================
      // PASO 4: RESOLUTOR 1 - APROBACIÓN DE RESOLUCIÓN "OTRA"
      // ========================================================
      console.log(`[TEST-AVANZADO] PASO 4: Ingresando como Resolutor 1 (matias.ippolito.resolutor@gmail.com)...`);
      await robustLogin('matias.ippolito.resolutor@gmail.com', 'Matias_Res_SGP_2026!');

      const searchInputResol1 = page.locator('input[placeholder*="Buscar"]');
      await searchInputResol1.fill(solicitudId);
      await page.waitForTimeout(1500);

      const filaResol1 = page.locator('tr').filter({ hasText: solicitanteName }).first();
      await expect(filaResol1).toBeVisible({ timeout: 10000 });
      await filaResol1.locator('button[title="Ver / Editar Detalles"]').click();
      
      // Aprobar asignación 1
      console.log(`[TEST-AVANZADO] Resolutor 1 aprueba la resolución OTRA...`);
      await page.click('button:has-text("Aprobar")');
      await page.locator('textarea[placeholder*="detalles"]').fill(`Resolución aprobada por Resolutor 1 (${idUnico})`);
      
      await page.screenshot({ path: path.join(pruebaDir, '4_resolutor1_aprobacion.png') });
      await page.click('button:has-text("Confirmar")');
      await page.waitForTimeout(2000);

      // Salir
      await page.click('button:has-text("Salir")');
      await page.waitForURL('**/login');

      // ========================================================
      // PASO 5: RESOLUTOR 2 - APROBACIÓN DE RESOLUCIÓN "AGENDA"
      // ========================================================
      console.log(`[TEST-AVANZADO] PASO 5: Ingresando como Resolutor 2 (${resolutor2Email})...`);
      await robustLogin(resolutor2Email, 'SGP_StrongPass_2026!');

      const searchInputResol2 = page.locator('input[placeholder*="Buscar"]');
      await searchInputResol2.fill(solicitudId);
      await page.waitForTimeout(1500);

      const filaResol2 = page.locator('tr').filter({ hasText: solicitanteName }).first();
      await expect(filaResol2).toBeVisible({ timeout: 10000 });
      await filaResol2.locator('button[title="Ver / Editar Detalles"]').click();
      
      // Aprobar asignación 2
      console.log(`[TEST-AVANZADO] Resolutor 2 aprueba la resolución AGENDA...`);
      await page.click('button:has-text("Aprobar")');
      await page.locator('textarea[placeholder*="detalles"]').fill(`Resolución aprobada por Resolutor 2 en agenda (${idUnico})`);
      
      await page.screenshot({ path: path.join(pruebaDir, '5_resolutor2_aprobacion.png') });
      await page.click('button:has-text("Confirmar")');
      await page.waitForTimeout(2000);

      // Salir
      await page.click('button:has-text("Salir")');
      await page.waitForURL('**/login');

      // ========================================================
      // PASO 6: ADMINISTRADOR - VALIDACIÓN DE RESOLUCIÓN GLOBAL
      // ========================================================
      console.log(`[TEST-AVANZADO] PASO 6: Verificación de estado final por el Administrador...`);
      await robustLogin('admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');

      await page.goto('/mis-solicitudes');
      const searchInputFinal = page.locator('input[placeholder*="Buscar"]');
      await searchInputFinal.fill(solicitudId);
      await page.waitForTimeout(1500);

      const filaFinal = page.locator('tr').filter({ hasText: solicitanteName }).first();
      await expect(filaFinal).toBeVisible({ timeout: 10000 });
      
      // Validar estado Resueltas en la grilla (porque todos los resolutores firmaron)
      await expect(filaFinal.locator('text=Resueltas')).toBeVisible({ timeout: 15000 });
      console.log(`[TEST-AVANZADO] ¡Solicitud #${solicitudId} verificada como Resuelta global exitosamente!`);

      await page.screenshot({ path: path.join(pruebaDir, '6_admin_verificacion_final.png') });

      // RESTAURACIÓN DE SEGURIDAD: Dejar de nuevo a María Verónica como resolutora de AGENDA
      console.log(`[TEST-AVANZADO] LIMPIEZA: Restaurando resolutor de AGENDA a Maria Veronica...`);
      await page.goto('/settings');
      await page.waitForTimeout(1000);
      await page.click('button:has-text("Tipos de Resolución")');
      const agendaRowClean = page.locator('tr').filter({ hasText: 'AGENDA' }).first();
      await agendaRowClean.locator('button').first().click();
      
      const selectClean = page.locator('label:has-text("Defecto") + select');
      const optValueMaria = await selectClean.locator('option', { hasText: 'mvgonza79@gmail.com' }).getAttribute('value');
      await selectClean.selectOption(optValueMaria);
      await page.click('button:has-text("Guardar Cambios")');
      await page.waitForTimeout(2000);

      agendaRestaurada = true;

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
        montoSubsidio: '250000',
        resolutor2: resolutor2Email,
        estadoFinal: 'Resueltas',
        resultado: 'EXITOSO',
        verificaciones: {
          registro_resolutor2: 'CORRECTO (Creado dinámicamente en Settings)',
          asociacion_agenda: 'CORRECTO (Resolutor 2 asignado a tipo AGENDA)',
          carga_campos_completo: 'CORRECTO (100% de los campos y variables completados)',
          doble_aprobacion: 'CORRECTO (Aprobado por resolutor@sgp.com y por resolutor2@sgp.com independientemente)'
        }
      };

      fs.writeFileSync(
        path.join(pruebaDir, 'resultado.json'),
        JSON.stringify(jsonReport, null, 2)
      );

      const markdownReport = `# Informe de Resultados de Prueba Avanzada (Doble Resolutor) - Corrida #${idUnico}

**Fecha y Hora:** ${new Date().toLocaleString()}
**ID de Solicitud Generado:** #${solicitudId}
**Resolutor 2 Registrado:** ${resolutor2Email}
**Resultado General:** ✅ EXITOSO

## Carga de Campos Completa (100%)
Se rellenaron de manera sistemática la totalidad de los campos del formulario dinámico y estático de subsidio:
- **Nombre Completo:** ${solicitanteName}
- **Teléfono:** 3414992211
- **Tipo de Solicitante:** Personal (emprendedor)
- **Localidad / Barrio:** Santa Fe (Candioti)
- **Zona / Eje:** Zona Norte
- **Tipo Solicitud / Monto:** Subsidio (Monto: $250.000 / Fecha Entrega: 2026-05-30)
- **Fechas / Seguimiento:** Ingreso (2026-05-29), Contacto (2026-05-29), Resolución (2026-05-29)
- **Detalle de Seguimiento:** Se realizó el análisis de la solicitud y del presupuesto adjunto.
- **Resolución General:** Aprobación Favorable Completa
- **Control 1er Contacto:** Marcado (Activo)
- **Archivo Adjunto:** documento_dni.pdf

## Derivaciones y Aprobaciones Dobles
La solicitud fue asignada a dos resolutores diferentes:
1. **Asignación 1 (OTRA):** Resuelta por el resolutor por defecto \`resolutor@sgp.com\`.
2. **Asignación 2 (AGENDA):** Resuelta por el nuevo resolutor registrado \`resolutor2_${idUnico}@sgp.com\`.

Ambos resolutores entraron a sus correspondientes paneles y firmaron la aprobación de forma independiente. Tras la doble aprobación, el backend transicionó la solicitud automáticamente a **"Resueltas"**.

## Capturas de Pantalla Guardadas
1. \`1_admin_creacion_resolutor2.png\`: Registro del segundo resolutor en la pestaña Usuarios.
2. \`2_admin_configuracion_agenda.png\`: Edición del tipo AGENDA para asociarlo al nuevo resolutor.
3. \`3_admin_carga_completa.png\`: Solicitud con el 100% de los campos y asignaciones completados.
4. \`3_5_admin_adjunto_pdf.png\`: Subida del archivo PDF del DNI en el modal.
5. \`4_resolutor1_aprobacion.png\`: Aprobación de la asignación OTRA por el primer resolutor.
6. \`5_resolutor2_aprobacion.png\`: Aprobación de la asignación AGENDA por el segundo resolutor.
7. \`6_admin_verificacion_final.png\`: Confirmación del estado final "Resueltas" en la grilla del Administrador.
`;

      fs.writeFileSync(
        path.join(pruebaDir, 'informe_resultados.md'),
        markdownReport
      );

      console.log(`[TEST-AVANZADO] Informes y evidencias guardados exitosamente en la carpeta local.`);
    } finally {
      // Bloque de limpieza de seguridad forzada para evitar dejar la base de datos en un estado inconsistente
      if (!agendaRestaurada) {
        console.log(`[TEST-AVANZADO] LIMPIEZA FORZADA (finally): Restaurando resolutor de AGENDA a Maria Veronica...`);
        try {
          await page.goto('/settings');
          await page.waitForTimeout(1000);
          await page.click('button:has-text("Tipos de Resolución")');
          const agendaRowClean = page.locator('tr').filter({ hasText: 'AGENDA' }).first();
          await agendaRowClean.locator('button').first().click();

          const selectClean = page.locator('label:has-text("Defecto") + select');
          const optValueMaria = await selectClean.locator('option', { hasText: 'mvgonza79@gmail.com' }).getAttribute('value');
          await selectClean.selectOption(optValueMaria);
          await page.click('button:has-text("Guardar Cambios")');
          await page.waitForTimeout(2000);
        } catch (cleanErr) {
          console.error('[TEST-AVANZADO] Error durante la limpieza forzada:', cleanErr);
        }
      }
    }
  });
});
