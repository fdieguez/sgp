import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8080';

// Credenciales para la ejecución de pruebas
const CREDENTIALS = {
  ADMIN: { email: 'admin@sgp.com', pass: 'SGP_Admin_#2026_Prod_Secure_!' },
  OPERADOR: { email: 'celestesolari19@gmail.com', pass: 'Celeste_SGP_2026#' }
};

const filePathPng = path.resolve(__dirname, 'assets/admin_panel.png');
const filePathPdf = path.resolve(__dirname, 'assets/documento_prueba.pdf');

/**
 * Función auxiliar para iniciar sesión en el SGP
 */
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

test.describe('📋 Plan de Pruebas: Visualizador de Adjuntos (SGP)', () => {
  test.describe.configure({ mode: 'serial' });

  let adjuntoIdReal = null;
  let solicitudIdCreada = null;
  let authToken = null;

  test.beforeAll(async ({ request }) => {
    // 1. Limpieza inicial de la base de datos de pruebas
    console.log('[Setup] Limpiando solicitudes previas...');
    await request.post(`${BACKEND_URL}/api/test-helper/clear-all-solicitudes`);

    // 2. Obtener token de autenticación de Administrador
    console.log('[Setup] Obteniendo token de Administrador...');
    const loginRes = await request.post(`${BACKEND_URL}/api/auth/login`, {
      data: {
        email: CREDENTIALS.ADMIN.email,
        password: CREDENTIALS.ADMIN.pass
      }
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    authToken = loginData.token;

    // 3. Crear una solicitud de prueba en el backend
    console.log('[Setup] Creando solicitud de prueba...');
    const solicitudRes = await request.post(`${BACKEND_URL}/api/solicitudes`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      data: {
        description: 'Solicitud para prueba del visualizador de adjuntos',
        origin: 'WEB',
        type: 'PEDIDO',
        person: {
          name: 'Juan Test Adjunto',
          phone: '3424112233'
        }
      }
    });
    expect(solicitudRes.ok()).toBeTruthy();
    const solicitudData = await solicitudRes.json();
    solicitudIdCreada = solicitudData.id;
    console.log(`[Setup] Solicitud creada con ID #${solicitudIdCreada}`);

    // 4. Subir un archivo adjunto físico a la solicitud creada
    console.log('[Setup] Subiendo archivo adjunto real...');
    const fileBuffer = fs.readFileSync(filePathPng);
    const uploadRes = await request.post(`${BACKEND_URL}/api/solicitudes/${solicitudIdCreada}/adjuntos`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      multipart: {
        file: {
          name: 'admin_panel.png',
          mimeType: 'image/png',
          buffer: fileBuffer
        }
      }
    });
    expect(uploadRes.ok()).toBeTruthy();
    const uploadData = await uploadRes.json();
    adjuntoIdReal = uploadData.id;
    console.log(`[Setup] Archivo adjunto subido exitosamente con ID #${adjuntoIdReal}`);
  });

  // =========================================================================
  // CASO DE PRUEBA 1: Acceso con Sesión Activa (Flujo Feliz)
  // =========================================================================
  test('Caso de Prueba 1: Acceso con Sesión Activa (Flujo Feliz)', async ({ page }) => {
    test.setTimeout(60000);
    expect(adjuntoIdReal).toBeTruthy();

    console.log('[Caso 1] Iniciando sesión como Administrador...');
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);

    console.log(`[Caso 1] Navegando directamente a /descargar-adjunto/${adjuntoIdReal}...`);
    // Escuchar la respuesta de la petición al endpoint /view
    const responsePromise = page.waitForResponse(
      res => res.url().includes(`/api/solicitudes/adjuntos/${adjuntoIdReal}/view`) && res.status() === 200,
      { timeout: 15000 }
    );

    await page.goto(`${BASE_URL}/descargar-adjunto/${adjuntoIdReal}`);

    // Validar que no haya pantalla blanca de error (el contenedor principal existe)
    const container = page.locator('h2:has-text("Visualizador Seguro")');
    await expect(container).toBeVisible({ timeout: 5000 });

    // Esperar la respuesta exitosa del backend
    const viewResponse = await responsePromise;
    expect(viewResponse.status()).toBe(200);
    const contentType = viewResponse.headers()['content-type'];
    expect(contentType).toContain('image');

    // Comprobar que la pantalla reemplaza hacia la visualización del blob o indica éxito
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    const isBlobUrl = currentUrl.startsWith('blob:');
    const isSuccessMessage = await page.locator('text=¡Carga exitosa!').count() > 0;

    console.log(`[Caso 1] URL resultante: ${currentUrl} | Es Blob: ${isBlobUrl} | Mensaje Éxito: ${isSuccessMessage}`);
    expect(isBlobUrl || isSuccessMessage).toBeTruthy();
    console.log('✅ Caso de Prueba 1 completado exitosamente.');
  });

  // =========================================================================
  // CASO DE PRUEBA 2: Acceso Directo sin Sesión / Sesión Expirada
  // =========================================================================
  test('Caso de Prueba 2.1: Acceso Directo sin Sesión con Redirección Automática Post-Login', async ({ browser }) => {
    test.setTimeout(60000);
    expect(adjuntoIdReal).toBeTruthy();

    console.log('[Caso 2.1] Abriendo contexto limpio (sin sesión / incógnito)...');
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();

    console.log(`[Caso 2.1] Navegando anónimamente a /descargar-adjunto/${adjuntoIdReal}...`);
    await anonPage.goto(`${BASE_URL}/descargar-adjunto/${adjuntoIdReal}`);

    // Validar que no hay pantalla blanca y que redirige a Login con redirectTo
    await anonPage.waitForURL(url => url.pathname === '/login' && url.searchParams.has('redirectTo'), { timeout: 10000 });
    const redirectToParam = new URL(anonPage.url()).searchParams.get('redirectTo');
    console.log(`[Caso 2.1] Redirigido correctamente al Login con redirectTo: ${redirectToParam}`);
    expect(redirectToParam).toBe(`/descargar-adjunto/${adjuntoIdReal}`);

    // Ingresar credenciales en el formulario de Login
    console.log('[Caso 2.1] Ingresando credenciales para validar redirección automática...');
    await anonPage.locator('input[type="email"]').fill(CREDENTIALS.ADMIN.email);
    await anonPage.locator('input[type="password"]').fill(CREDENTIALS.ADMIN.pass);
    await anonPage.click('button:has-text("Ingresar")');

    // Validar que el sistema vuelve automáticamente a la apertura del archivo
    await anonPage.waitForURL(url => url.pathname.includes(`/descargar-adjunto/${adjuntoIdReal}`) || url.href.startsWith('blob:'), { timeout: 15000 });
    console.log(`[Caso 2.1] Redirección automática post-login exitosa a: ${anonPage.url()}`);

    await anonContext.close();
    console.log('✅ Caso de Prueba 2.1 completado exitosamente.');
  });

  test('Caso de Prueba 2.2: Sesión Expirada (Error 401/403 Controlado)', async ({ page }) => {
    test.setTimeout(60000);
    expect(adjuntoIdReal).toBeTruthy();

    console.log('[Caso 2.2] Iniciando sesión para simular sesión activa...');
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);

    console.log('[Caso 2.2] Interceptando /view para simular sesión expirada (401)...');
    // Interceptar la petición al endpoint de visualización para simular un token expirado (401)
    await page.route(`**/api/solicitudes/adjuntos/${adjuntoIdReal}/view`, route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized', message: 'La sesión ha expirado.' })
      });
    });

    await page.goto(`${BASE_URL}/descargar-adjunto/${adjuntoIdReal}`);

    // Validar que no hay pantalla blanca
    await expect(page.locator('h2:has-text("Visualizador Seguro")')).toBeVisible({ timeout: 5000 });

    // Validar que se muestra la tarjeta con el mensaje de sesión expirada
    const mensajeError = page.locator('text=Su sesión no es válida o ha expirado. Inicie sesión nuevamente para visualizar este archivo.');
    await expect(mensajeError).toBeVisible({ timeout: 5000 });

    // Validar la presencia del botón "Iniciar Sesión"
    const botonLogin = page.locator('button:has-text("Iniciar Sesión")');
    await expect(botonLogin).toBeVisible();

    // Hacer clic en "Iniciar Sesión" y comprobar que redirige a Login con el redirectTo adecuado
    await botonLogin.click();
    await page.waitForURL(url => url.pathname === '/login' && url.searchParams.has('redirectTo'), { timeout: 5000 });
    expect(new URL(page.url()).searchParams.get('redirectTo')).toBe(`/descargar-adjunto/${adjuntoIdReal}`);

    console.log('✅ Caso de Prueba 2.2 completado exitosamente.');
  });

  // =========================================================================
  // CASO DE PRUEBA 3: Archivo Inexistente (Error 404 Controlado)
  // =========================================================================
  test('Caso de Prueba 3: Archivo Inexistente (Error 404 Controlado)', async ({ page }) => {
    test.setTimeout(60000);

    console.log('[Caso 3] Iniciando sesión como Administrador...');
    await iniciarSesion(page, CREDENTIALS.ADMIN.email, CREDENTIALS.ADMIN.pass);

    const idInexistente = '99999';
    console.log(`[Caso 3] Navegando hacia archivo inexistente /descargar-adjunto/${idInexistente}...`);
    await page.goto(`${BASE_URL}/descargar-adjunto/${idInexistente}`);

    // Validar que no hay pantalla blanca
    await expect(page.locator('h2:has-text("Visualizador Seguro")')).toBeVisible({ timeout: 5000 });

    // Validar que se muestra la tarjeta informativa correspondiente
    const tarjetaInformativa = page.locator('text=El archivo adjunto solicitado no existe o fue eliminado.');
    await expect(tarjetaInformativa).toBeVisible({ timeout: 8000 });

    // Validar que se muestran los botones "Reintentar Visualización" e "Ir al Panel Principal"
    const btnReintentar = page.locator('button:has-text("Reintentar Visualización")');
    const btnPanelPrincipal = page.locator('button:has-text("Ir al Panel Principal")');

    await expect(btnReintentar).toBeVisible();
    await expect(btnPanelPrincipal).toBeVisible();

    // Validar navegación al hacer clic en "Ir al Panel Principal"
    console.log('[Caso 3] Haciendo clic en "Ir al Panel Principal"...');
    await btnPanelPrincipal.click();
    await page.waitForURL(/.*(dashboard|mis-solicitudes).*/, { timeout: 10000 });
    console.log(`[Caso 3] Navegación normal comprobada. URL actual: ${page.url()}`);

    console.log('✅ Caso de Prueba 3 completado exitosamente.');
  });
});
