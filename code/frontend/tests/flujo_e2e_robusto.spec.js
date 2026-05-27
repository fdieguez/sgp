import { test, expect } from '@playwright/test';

/**
 * Suite de Validación E2E: Ciclo de Vida Completo de una Solicitud
 * Valida el flujo íntegro en un solo hilo de ejecución.
 */
test.describe('Validación E2E SGP: Flujo Maestro Consolidado', () => {
  const idSuffix = Date.now().toString().slice(-6);
  
  const userResponsable = {
    email: `resp_${idSuffix}@sgp.com`,
    password: 'Password123!',
    firstName: 'Juan',
    lastName: `Responsable ${idSuffix}`,
    fullName: `Juan Responsable ${idSuffix}`
  };

  const userResolutor = {
    email: `resol_${idSuffix}@sgp.com`,
    password: 'Password123!',
    firstName: 'Ana',
    lastName: `Resolutora ${idSuffix}`,
    fullName: `Ana Resolutora ${idSuffix}`
  };

  const attrName = `Expediente ${idSuffix}`;
  const resolutionTypeName = `SUBSIDIO ESPECIAL ${idSuffix}`;
  const solicitudDesc = `E2E-ROBUSTO-${idSuffix}`;

  test('Cerrar Ciclo de Vida: Admin -> Operador -> Responsable -> Resolutor', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos para dar tiempo suficiente a todas las fases

    const robustLogin = async (email, password) => {
      await page.goto('/login');
      // Limpiar campos explícitamente por si hay autocompletado
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
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      await expect(page.locator('text=Panel SGP')).toBeVisible();
    };

    // --- PASO 1: CONFIGURACIÓN (ADMIN) ---
    console.log("DEBUG: Iniciando login de Admin...");
    await robustLogin('admin@sgp.com', 'SGP_Admin_#2026_Prod_Secure_!');
    console.log("DEBUG: Login exitoso. Creando usuario Responsable...");

    // 1.1 Crear Usuario Responsable
    await page.goto('/settings');
    await page.click('button:has-text("Nuevo Usuario")');
    await page.locator('label:has-text("Nombre") + input').fill(userResponsable.firstName);
    await page.locator('label:has-text("Apellido") + input').fill(userResponsable.lastName);
    await page.locator('label:has-text("Email") + input').fill(userResponsable.email);
    await page.locator('label:has-text("Contraseña") + input').fill(userResponsable.password);
    await page.locator('label:has-text("Teléfono") + input').fill('123456789');
    await page.locator('label:has-text("Operador") > input').uncheck(); // Desmarcar rol por defecto
    await page.locator('label:has-text("Responsable") > input').check();
    await page.locator('label:has-text("Zona Territorial") + input').fill('Zona E2E');
    console.log("DEBUG: Formulario Responsable completo, haciendo click en Crear...");
    await page.click('button:has-text("Crear Usuario")');
    console.log("DEBUG: Esperando visibilidad del email del Responsable...");
    await expect(page.locator(`text=${userResponsable.email}`)).toBeVisible();
    console.log("DEBUG: Usuario Responsable creado. Creando usuario Resolutor...");

    // 1.2 Crear Usuario Resolutor
    await page.click('button:has-text("Nuevo Usuario")');
    await page.locator('label:has-text("Nombre") + input').fill(userResolutor.firstName);
    await page.locator('label:has-text("Apellido") + input').fill(userResolutor.lastName);
    await page.locator('label:has-text("Email") + input').fill(userResolutor.email);
    await page.locator('label:has-text("Contraseña") + input').fill(userResolutor.password);
    await page.locator('label:has-text("Teléfono") + input').fill('987654321');
    await page.locator('label:has-text("Operador") > input').uncheck(); // Desmarcar rol por defecto
    await page.locator('label:has-text("Resolutor") > input').check();
    console.log("DEBUG: Formulario Resolutor completo, haciendo click en Crear...");
    await page.click('button:has-text("Crear Usuario")');
    console.log("DEBUG: Esperando visibilidad del email del Resolutor...");
    await expect(page.locator(`text=${userResolutor.email}`)).toBeVisible();
    console.log("DEBUG: Usuario Resolutor creado. Creando Atributo...");

    // 1.3 Crear Atributo
    await page.click('button:has-text("Catálogo de Atributos")');
    await page.click('button:has-text("Nuevo Atributo")');
    await page.locator('label:has-text("Nombre (Etiqueta)") + input').fill(attrName);
    await page.locator('label:has-text("Tipo de Dato") + select').selectOption('TEXT');
    console.log("DEBUG: Formulario Atributo completo, guardando...");
    await page.click('button:has-text("Guardar")');
    console.log("DEBUG: Esperando visibilidad del atributo...");
    await expect(page.locator(`text=${attrName}`)).toBeVisible();
    console.log("DEBUG: Atributo creado. Creando Tipo de Resolución...");

    // 1.4 Crear Tipo de Resolución
    await page.click('button:has-text("Tipos de Resolución")');
    await page.click('button:has-text("Nuevo Tipo")');
    await page.locator('label:has-text("Nombre Único") + input').fill(resolutionTypeName);
    // Seleccionar el resolutor que acabamos de crear (formato: email (firstName))
    await page.locator('label:has-text("Resolutor por Defecto") + select').selectOption({ label: `${userResolutor.email} (${userResolutor.firstName})` });
    
    await page.click('button:has-text("Agregar")');
    await page.locator('div.flex.items-center.gap-3 select').last().selectOption({ label: `${attrName} (TEXT)` });
    console.log("DEBUG: Formulario Tipo Resolución completo, guardando...");
    await page.click('button:has-text("Guardar Cambios")');
    console.log("DEBUG: Esperando visibilidad del Tipo de Resolución...");
    await expect(page.locator(`text=${resolutionTypeName}`)).toBeVisible();
    console.log("DEBUG: Tipo de Resolución creado.");

    // --- PASO 2: CREACIÓN Y ASIGNACIÓN (ADMIN) ---
    console.log("DEBUG: Iniciando Paso 2: Creación de Solicitud y Asignaciones...");
    await page.goto('/mis-solicitudes');
    await page.click('button:has-text("Nueva Solicitud")');
    await page.locator('label:has-text("Nombre Completo") + input').fill('Beneficiario E2E');
    await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(solicitudDesc);
    console.log("DEBUG: Guardando nueva solicitud...");
    await page.click('button:has-text("Guardar Solicitud")');

    console.log("DEBUG: Buscando solicitud creada...");
    const searchInputAdmin = page.locator('input[placeholder*="Buscar"]');
    await searchInputAdmin.fill(idSuffix);
    await page.waitForTimeout(1000);

    const fila = page.locator('tr').filter({ hasText: solicitudDesc }).first();
    await expect(fila).toBeVisible({ timeout: 10000 });
    console.log("DEBUG: Solicitud encontrada, abriendo detalles...");
    await fila.locator('button[title="Ver / Editar Detalles"]').click();

    // Asignar Responsable (el que creamos)
    console.log("DEBUG: Asignando Responsable...");
    await page.locator('label:has-text("Responsable") + select').selectOption({ label: userResponsable.fullName });
    
    // Agregar Asignación de Resolutor
    console.log("DEBUG: Agregando asignación de Resolutor...");
    await page.click('button:has-text("Agregar")');
    await page.waitForTimeout(500);
    
    // Seleccionar el tipo de resolución creado en Fase 1
    const selectArea = page.locator('div.p-4.bg-indigo-900\\/10 select').last();
    // Encontrar la opción que contiene el nombre
    const optionText = await selectArea.locator('option').filter({ hasText: resolutionTypeName }).first().innerText();
    await selectArea.selectOption({ label: optionText });
    
    // Completar Atributo Dinámico
    console.log("DEBUG: Completando atributo dinámico...");
    await page.locator(`label:has-text("${attrName}") + input`).fill(`EXP-VAL-${idSuffix}`);
    console.log("DEBUG: Guardando asignaciones en solicitud...");
    await page.click('button:has-text("Guardar Solicitud")');
    await page.waitForTimeout(2000);

    // Verificación de persistencia (Cerrar y abrir de nuevo)
    console.log("DEBUG: Abriendo detalles de nuevo para verificar persistencia...");
    await fila.locator('button[title="Ver / Editar Detalles"]').click();
    await expect(page.locator('div.p-4.bg-indigo-900\\/10 select').first()).toHaveValue(resolutionTypeName);
    console.log("DEBUG: Persistencia verificada, cerrando modal...");
    await page.click('button[title="Cerrar"]');

    // Recargar la página para asegurar la obtención de los datos más frescos en la grilla
    console.log("DEBUG: Recargando la página para refrescar la grilla...");
    await page.reload();
    await page.waitForTimeout(1000);

    const filaFresca = page.locator('tr').filter({ hasText: solicitudDesc }).first();
    await expect(filaFresca.locator('text=En Resolución')).toBeVisible();

    // --- PASO 3: APROBACIÓN (RESOLUTOR) ---
    console.log("DEBUG: Iniciando Paso 3: Aprobación del Resolutor...");
    await page.click('button:has-text("Salir")');
    await robustLogin(userResolutor.email, userResolutor.password);
    
    await page.goto('/mis-solicitudes');
    await page.waitForTimeout(2000);
    await page.reload();
    console.log("DEBUG: Buscando solicitud desde panel de Resolutor...");
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await searchInput.fill(idSuffix);
    await page.waitForTimeout(1000); 
    
    const filaResolutor = page.locator('tr').filter({ hasText: solicitudDesc }).first();
    await expect(filaResolutor).toBeVisible({ timeout: 15000 });
    console.log("DEBUG: Solicitud encontrada por Resolutor, abriendo detalles...");
    await filaResolutor.locator('button[title="Ver / Editar Detalles"]').click();

    // 3.3 APROBAR RESOLUCIÓN
    // Verificar que ve su asignación (el select debe tener el valor correcto aunque esté deshabilitado)
    const selectAreaRes = page.locator('div.p-4.bg-indigo-900\\/10 select').first();
    await expect(selectAreaRes).toHaveValue(resolutionTypeName);
    
    // Verificar que ve el atributo dinámico
    await expect(page.locator(`label:has-text("${attrName}")`)).toBeVisible();
    await expect(page.locator(`input[value="EXP-VAL-${idSuffix}"]`)).toBeVisible();

    await page.click('button:has-text("Aprobar Resolución")');
    await page.locator('textarea[placeholder*="detalles de la resolución"]').fill('Aprobado vía E2E Automático');
    await page.click('button:has-text("Confirmar y Finalizar")');
    
    // Verificación Final
    await page.reload();
    await page.fill('input[placeholder*="Buscar"]', idSuffix);
    // El estado cambia a "Completado" en la UI (StatusBadge lo capitaliza)
    await expect(page.locator('tr').filter({ hasText: solicitudDesc }).locator('text=Completado')).toBeVisible();
  });

});
