import { test, expect } from '@playwright/test';

const usersToTest = [
  {
    email: 'juanm.dieguez@gmail.com',
    pass: 'Juan$zKDU@Gd',
    role: 'AUDITOR',
    name: 'Juan Manuel Dieguez'
  },
  {
    email: 'admin@sgp.com',
    pass: 'SGP_Admin_#J57f_Prod_Secure_!',
    role: 'ADMINISTRADOR',
    name: 'Admin Supremo'
  },
  {
    email: 'celeste_solari19@hotmail.com',
    pass: 'Celeste_SGP_Npg8#',
    role: 'OPERADOR',
    name: 'Maria Celeste Solari'
  },
  {
    email: 'matias.ippolito@gmail.com',
    pass: 'Matias_Dist_SGP_mi6J!',
    role: 'RESPONSABLE / DISTRIBUIDOR',
    name: 'Matías Ippólito'
  },
  {
    email: 'martinnocioni@gmail.com',
    pass: 'Martin_SGP_b7kP*',
    role: 'RESPONSABLE / RESOLUTOR',
    name: 'Martín Nocioni'
  },
  {
    email: 'adflucha@gmail.com',
    pass: 'Alejandro#CCq7!Dt',
    role: 'RESPONSABLE',
    name: 'Alejandro Fluchá'
  }
];

test.describe('Validación de Logins en Localhost SGP', () => {
  for (const user of usersToTest) {
    test(`Login exitoso para ${user.name} (${user.email})`, async ({ page }) => {
      // 1. Navegar a la página de login
      await page.goto('http://localhost:5173/login');
      await expect(page).toHaveTitle(/SGP/i);

      // 2. Llenar credenciales
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.pass);

      // 3. Hacer click en Ingresar a la Plataforma
      await page.click('button:has-text("Ingresar a la Plataforma")');

      // 4. Verificar que no haya mensaje de error
      const errorMsg = page.locator('text=Credenciales inválidas');
      await expect(errorMsg).not.toBeVisible();

      // 5. Verificar redirección fuera de /login (/dashboard o /mis-solicitudes)
      await expect(page).not.toHaveURL(/.*\/login$/, { timeout: 10000 });
      
      console.log(`✅ [OK] Login verificado para ${user.email} -> URL: ${page.url()}`);
    });
  }
});
