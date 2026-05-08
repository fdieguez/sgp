# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flujo_e2e_robusto.spec.js >> Validación E2E SGP: Flujo Maestro Consolidado >> Cerrar Ciclo de Vida: Admin -> Operador -> Responsable -> Resolutor
- Location: tests\flujo_e2e_robusto.spec.js:30:3

# Error details

```
Test timeout of 900000ms exceeded.
```

```
Error: page.click: Test timeout of 900000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Guardar Solicitud")')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - navigation [ref=e5]:
        - generic [ref=e7]:
          - generic [ref=e8]:
            - img [ref=e9]
            - link "Panel SGP" [ref=e12] [cursor=pointer]:
              - /url: /dashboard
          - generic [ref=e13]:
            - generic [ref=e14]:
              - generic [ref=e15]: Ana Resolutora 627527
              - generic [ref=e16]: RESOLUTOR
            - button "Claro" [ref=e17] [cursor=pointer]:
              - img [ref=e18]
              - generic [ref=e24]: Claro
            - button "Ayuda" [ref=e25] [cursor=pointer]:
              - img [ref=e26]
              - generic [ref=e29]: Ayuda
            - button "Salir" [ref=e30] [cursor=pointer]:
              - img [ref=e31]
              - generic [ref=e34]: Salir
      - generic [ref=e35]:
        - generic [ref=e36]:
          - link "Inicio" [ref=e37] [cursor=pointer]:
            - /url: /dashboard
            - img [ref=e38]
            - text: Inicio
          - generic [ref=e40]:
            - button [ref=e41] [cursor=pointer]:
              - img [ref=e42]
            - button "Nueva Solicitud" [ref=e44] [cursor=pointer]:
              - img [ref=e45]
              - text: Nueva Solicitud
        - generic [ref=e46]:
          - generic [ref=e47]:
            - generic [ref=e48]:
              - heading "Mis Solicitudes" [level=1] [ref=e49]
              - paragraph [ref=e50]:
                - img [ref=e51]
                - text: Mostrar 0 registros
            - generic [ref=e55]:
              - img [ref=e56]
              - textbox "Buscar por N° Orden, nombre, DNI, localidad..." [ref=e59]: "627527"
          - generic [ref=e60]:
            - button "Pendientes 0" [ref=e61] [cursor=pointer]:
              - generic [ref=e62]: Pendientes
              - generic [ref=e64]: "0"
            - button "En Proceso 0" [ref=e65] [cursor=pointer]:
              - generic [ref=e66]: En Proceso
              - generic [ref=e68]: "0"
            - button "En Resolución 0" [ref=e69] [cursor=pointer]:
              - generic [ref=e70]: En Resolución
              - generic [ref=e72]: "0"
            - button "Completados 0" [ref=e73] [cursor=pointer]:
              - generic [ref=e74]: Completados
              - generic [ref=e76]: "0"
            - button "Rechazados 0" [ref=e77] [cursor=pointer]:
              - generic [ref=e78]: Rechazados
              - generic [ref=e80]: "0"
        - generic [ref=e82]:
          - generic [ref=e83]:
            - heading "Analítica de Distribución" [level=3] [ref=e84]:
              - img [ref=e85]
              - text: Analítica de Distribución
            - combobox [ref=e87]:
              - option "Por Estado" [selected]
              - option "Por Localidad"
              - option "Por Origen"
          - application [ref=e91]
        - table [ref=e97]:
          - rowgroup [ref=e98]:
            - row "N° Orden Fecha Ingreso Mes Origen Nombre / Institución Localidad Barrio Teléfono Solicitud ZONA / EJE RESPONSABLE F. Contacto F. Resolución Estado Detalle Observación Monto CONTROL 1er C. Acciones" [ref=e99]:
              - columnheader "N° Orden" [ref=e100]
              - columnheader "Fecha Ingreso" [ref=e101] [cursor=pointer]:
                - text: Fecha Ingreso
                - img [ref=e102]
              - columnheader "Mes" [ref=e104]
              - columnheader "Origen" [ref=e105] [cursor=pointer]
              - columnheader "Nombre / Institución" [ref=e106] [cursor=pointer]
              - columnheader "Localidad" [ref=e107] [cursor=pointer]
              - columnheader "Barrio" [ref=e108]
              - columnheader "Teléfono" [ref=e109]
              - columnheader "Solicitud" [ref=e110]
              - columnheader "ZONA / EJE" [ref=e111]
              - columnheader "RESPONSABLE" [ref=e112]
              - columnheader "F. Contacto" [ref=e113]
              - columnheader "F. Resolución" [ref=e114]
              - columnheader "Estado" [ref=e115] [cursor=pointer]
              - columnheader "Detalle" [ref=e116]
              - columnheader "Observación" [ref=e117]
              - columnheader "Monto" [ref=e118]
              - columnheader "CONTROL 1er C." [ref=e119]
              - columnheader "Acciones" [ref=e120]
          - rowgroup
        - generic [ref=e121]:
          - generic [ref=e122]: Página 1 de 1
          - generic [ref=e123]:
            - button "Anterior" [disabled] [ref=e124]
            - button "Siguiente" [ref=e125] [cursor=pointer]
    - generic:
      - generic: SGP
      - generic: v0.3.0
  - generic [ref=e126]: "0"
```

# Test source

```ts
  67  |     await expect(page.locator(`text=${userResponsable.email}`)).toBeVisible();
  68  | 
  69  |     // 1.2 Crear Usuario Resolutor
  70  |     await page.click('button:has-text("Nuevo Usuario")');
  71  |     await page.locator('label:has-text("Nombre") + input').fill(userResolutor.firstName);
  72  |     await page.locator('label:has-text("Apellido") + input').fill(userResolutor.lastName);
  73  |     await page.locator('label:has-text("Email") + input').fill(userResolutor.email);
  74  |     await page.locator('label:has-text("Contraseña") + input').fill(userResolutor.password);
  75  |     await page.locator('label:has-text("Rol del Sistema") + select').selectOption('RESOLUTOR');
  76  |     await page.click('button:has-text("Crear Usuario")');
  77  |     await expect(page.locator(`text=${userResolutor.email}`)).toBeVisible();
  78  | 
  79  |     // 1.3 Crear Atributo
  80  |     await page.click('button:has-text("Catálogo de Atributos")');
  81  |     await page.click('button:has-text("Nuevo Atributo")');
  82  |     await page.locator('label:has-text("Nombre (Etiqueta)") + input').fill(attrName);
  83  |     await page.locator('label:has-text("Tipo de Dato") + select').selectOption('TEXT');
  84  |     await page.click('button:has-text("Guardar")');
  85  |     await expect(page.locator(`text=${attrName}`)).toBeVisible();
  86  | 
  87  |     // 1.4 Crear Tipo de Resolución
  88  |     await page.click('button:has-text("Tipos de Resolución")');
  89  |     await page.click('button:has-text("Nuevo Tipo")');
  90  |     await page.locator('label:has-text("Nombre Único") + input').fill(resolutionTypeName);
  91  |     // Seleccionar el resolutor que acabamos de crear (formato: email (firstName))
  92  |     await page.locator('label:has-text("Resolutor por Defecto") + select').selectOption({ label: `${userResolutor.email} (${userResolutor.firstName})` });
  93  |     
  94  |     await page.click('button:has-text("Agregar")');
  95  |     await page.locator('div.flex.items-center.gap-3 select').last().selectOption({ label: `${attrName} (TEXT)` });
  96  |     await page.click('button:has-text("Guardar Cambios")');
  97  |     await expect(page.locator(`text=${resolutionTypeName}`)).toBeVisible();
  98  | 
  99  |     // --- PASO 2: CREACIÓN Y ASIGNACIÓN (ADMIN) ---
  100 |     await page.goto('/mis-solicitudes');
  101 |     await page.click('button:has-text("Nueva Solicitud")');
  102 |     await page.locator('label:has-text("Nombre Completo") + input').fill('Beneficiario E2E');
  103 |     await page.locator('label:has-text("Descripción / Pedido") + textarea').fill(solicitudDesc);
  104 |     await page.click('button:has-text("Guardar Solicitud")');
  105 | 
  106 |     const searchInputAdmin = page.locator('input[placeholder*="Buscar"]');
  107 |     await searchInputAdmin.fill(idSuffix);
  108 |     await page.waitForTimeout(1000);
  109 | 
  110 |     const fila = page.locator('tr').filter({ hasText: solicitudDesc }).first();
  111 |     await expect(fila).toBeVisible({ timeout: 10000 });
  112 |     await fila.locator('button[title="Editar"]').click();
  113 | 
  114 |     // Asignar Responsable (el que creamos)
  115 |     await page.locator('label:has-text("Responsable") + select').selectOption({ label: userResponsable.fullName });
  116 |     
  117 |     // Agregar Asignación de Resolutor
  118 |     await page.click('button:has-text("Agregar")');
  119 |     await page.waitForTimeout(500);
  120 |     
  121 |     // Seleccionar el tipo de resolución creado en Fase 1
  122 |     const selectArea = page.locator('div.p-4.bg-indigo-900\\/10 select').last();
  123 |     // Encontrar la opción que contiene el nombre
  124 |     const optionText = await selectArea.locator('option').filter({ hasText: resolutionTypeName }).first().innerText();
  125 |     await selectArea.selectOption({ label: optionText });
  126 |     
  127 |     // Completar Atributo Dinámico
  128 |     await page.locator(`label:has-text("${attrName}") + input`).fill(`EXP-VAL-${idSuffix}`);
  129 |     await page.click('button:has-text("Guardar Solicitud")');
  130 |     await page.waitForTimeout(2000);
  131 | 
  132 |     // Verificación de persistencia (Cerrar y abrir de nuevo)
  133 |     await fila.locator('button[title="Editar"]').click();
  134 |     await expect(page.locator('div.p-4.bg-indigo-900\\/10 select').first()).toHaveValue(resolutionTypeName);
  135 |     await page.click('button[title="Cerrar"]');
  136 | 
  137 |     await expect(fila.locator('text=En Resolución')).toBeVisible();
  138 | 
  139 |     // --- PASO 3: APROBACIÓN (RESOLUTOR) ---
  140 |     await page.click('button:has-text("Salir")');
  141 |     await robustLogin(userResolutor.email, userResolutor.password);
  142 |     
  143 |     await page.goto('/mis-solicitudes');
  144 |     await page.waitForTimeout(2000);
  145 |     await page.reload();
  146 |     const searchInput = page.locator('input[placeholder*="Buscar"]');
  147 |     await searchInput.fill(idSuffix);
  148 |     await page.waitForTimeout(1000); 
  149 |     
  150 |     const filaResolutor = page.locator('tr').filter({ hasText: solicitudDesc }).first();
  151 |     await expect(filaResolutor).toBeVisible({ timeout: 15000 });
  152 |     await filaResolutor.locator('button[title="Ver Detalle"]').click();
  153 | 
  154 |     // 3.3 APROBAR RESOLUCIÓN
  155 |     // Verificar que ve su asignación (el select debe tener el valor correcto aunque esté deshabilitado)
  156 |     const selectAreaRes = page.locator('div.p-4.bg-indigo-900\\/10 select').first();
  157 |     await expect(selectAreaRes).toHaveValue(resolutionTypeName);
  158 |     
  159 |     // Verificar que ve el atributo dinámico
  160 |     await expect(page.locator(`label:has-text("${attrName}")`)).toBeVisible();
  161 |     await expect(page.locator(`input[value="EXP-VAL-${idSuffix}"]`)).toBeVisible();
  162 | 
  163 |     await page.click('button:has-text("Aprobar Resolución")');
  164 |     await page.locator('textarea[placeholder*="detalles de la resolución"]').fill('Aprobado vía E2E Automático');
  165 |     await page.click('button:has-text("Confirmar y Finalizar")');
  166 | 
> 167 |     await page.click('button:has-text("Guardar Solicitud")');
      |                ^ Error: page.click: Test timeout of 900000ms exceeded.
  168 |     
  169 |     // Verificación Final
  170 |     await page.reload();
  171 |     await page.fill('input[placeholder*="Buscar"]', idSuffix);
  172 |     // El estado cambia a "Completado" en la UI (StatusBadge lo capitaliza)
  173 |     await expect(page.locator('tr').filter({ hasText: solicitudDesc }).locator('text=Completado')).toBeVisible();
  174 |   });
  175 | 
  176 | });
  177 | 
```