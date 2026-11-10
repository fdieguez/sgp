import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

// Credenciales para la ejecución del caso de prueba en ambiente de desarrollo local
const CREDENTIALS = {
  DISTRIBUIDOR: { email: 'matias.ippolito@gmail.com', pass: 'Matias_Dist_SGP_mi6J!' }
};

/**
 * Función robusta de inicio de sesión
 */
const robustLogin = async (page, email, password) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  // Si hay sesión abierta previa, cerrar sesión
  const logoutBtn = page.locator('button:has-text("Salir")');
  if (await logoutBtn.count() > 0) {
    await logoutBtn.click();
    await page.waitForURL(/.*login.*/, { timeout: 10000 });
  }

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
  await page.waitForURL(/.*(dashboard|mis-solicitudes|select-rol).*/, { timeout: 20000 });

  // Si redirige a /select-rol, seleccionar perfil DISTRIBUIDOR
  const roleSelectorBtn = page.locator('[data-testid="select-role-distribuidor"]');
  if (await roleSelectorBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('[Login] Pantalla de selección de rol detectada: seleccionando DISTRIBUIDOR...');
    await roleSelectorBtn.click();
    await page.waitForURL(/.*(dashboard|mis-solicitudes).*/, { timeout: 15000 });
  }

  await page.waitForTimeout(500);
};

test.describe('Verificación de Edición de Solicitudes para Rol Distribuidor', () => {

  test('CP-DIST-01: Distribuidor hace clic en el lápiz de solicitud no creada por él y la modal abre con banner Lock sin error de Illegal constructor', async ({ page }) => {
    test.setTimeout(60000);

    // ==========================================
    // PASO 1: DISTRIBUIDOR - INICIO DE SESIÓN
    // ==========================================
    console.log('[Paso 1] Iniciando sesión como Distribuidor (matias.ippolito@gmail.com)...');
    await robustLogin(page, CREDENTIALS.DISTRIBUIDOR.email, CREDENTIALS.DISTRIBUIDOR.pass);

    if (!page.url().includes('/mis-solicitudes')) {
      await page.goto(`${BASE_URL}/mis-solicitudes`);
    }
    await page.waitForLoadState('networkidle');

    // ==========================================
    // PASO 2: BUSCAR SOLICITUD #2 (Creada por Operador)
    // ==========================================
    console.log('[Paso 2] Buscando solicitud creada por Operador en la bandeja del Distribuidor...');
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await searchInput.fill('Beneficiario Prueba Distribuidor');
    await page.waitForTimeout(1000);

    const filaSolicitud = page.locator('tr').filter({ hasText: 'Beneficiario Prueba Distribuidor' }).first();
    await expect(filaSolicitud).toBeVisible({ timeout: 10000 });

    // ==========================================
    // PASO 3: ABRIR MODAL CON EL LÁPIZ
    // ==========================================
    console.log('[Paso 3] Distribuidor hace clic en el botón del lápiz (Ver / Editar Detalles)...');
    const btnEditar = filaSolicitud.locator('button[title*="Ver / Editar Detalles"]').first();
    await expect(btnEditar).toBeVisible();
    await btnEditar.click();

    // ==========================================
    // PASO 4: VALIDACIÓN CRÍTICA 1 - NO ERROR BOUNDARY
    // ==========================================
    console.log('[Paso 4] Validando que NO aparezca el ErrorBoundary (TypeError: Illegal constructor)...');
    const errorBoundary = page.locator('text=¡Ups! Algo salió mal en este componente.');
    await expect(errorBoundary).toHaveCount(0);

    // ==========================================
    // PASO 5: VALIDACIÓN CRÍTICA 2 - MODAL VISIBLE
    // ==========================================
    console.log('[Paso 5] Validando que el modal de Solicitud se renderice correctamente...');
    const modal = page.locator('div[role="dialog"], .fixed.inset-0').first();
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('h2:has-text("Editar Solicitud")')).toBeVisible({ timeout: 5000 });

    // ==========================================
    // PASO 6: VALIDACIÓN CRÍTICA 3 - BANNER CON CANDADO (LOCK)
    // ==========================================
    console.log('[Paso 6] Validando renderizado del banner bloqueado con el ícono Lock de lucide-react...');
    const bannerBloqueo = modal.locator('text=Los datos de la carga inicial solo pueden ser modificados por el Operador o el Responsable que cargó este pedido.');
    await expect(bannerBloqueo).toBeVisible({ timeout: 5000 });

    // Validar presencia del SVG de Lock dentro del banner
    const iconoLock = modal.locator('.lucide-lock');
    await expect(iconoLock.first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Ícono Lock y banner de bloqueo renderizados perfectamente sin TypeError!');

    // ==========================================
    // PASO 7: CERRAR MODAL
    // ==========================================
    console.log('[Paso 7] Cerrando la modal...');
    const btnCerrar = modal.locator('button:has-text("Cancelar"), button[title="Cerrar"]').first();
    await btnCerrar.click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    console.log('🎉 Caso de prueba CP-DIST-01 completado exitosamente.');
  });

});
