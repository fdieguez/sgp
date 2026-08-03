# Informe de Auditoría Forense de Integridad

**Proyecto**: SGP (Sistema de Gestión de Proyectos)
**Fecha**: 2026-07-31
**Auditor**: Forensic Auditor (`teamwork_preview_auditor`)
**Perfil de Auditoría**: General Project (Forensic Audit)
**Veredicto Final**: **CLEAN**

---

## 1. Observation (Observaciones Directas)

Se inspeccionaron empíricamente los cuatro (4) archivos de código fuente designados para la auditoría, y se ejecutaron las pruebas compilatorias e integrales en el módulo de backend:

1. **`code/backend/src/main/java/com/sgp/backend/service/EmailService.java`**:
   - En la línea 36-37, el método `sendSubsidioApprovedEmail` posee las anotaciones `@Async` y `@Transactional(readOnly = true)`.
   - La implementación es auténtica, utilizando `JavaMailSender`, `SolicitudRepository` y `FileService` para adjuntar recursos reales y enviar correos electrónicos de forma asíncrona.
   - El 100% de los comentarios JavaDoc e inline están en idioma español.

2. **`code/backend/src/main/java/com/sgp/backend/service/SolicitudService.java`**:
   - En las líneas 654-676, el método `aprobarAsignacion` evalúa explícitamente `assignment.getTipoResolucion()` (en lugar del tipo genérico de la solicitud) para determinar si ejecuta la integración con Google Calendar (`AGENDA`) o con EmailService (`SUBSIDIO`).
   - En las líneas 683-714, el método `ponerEnConsideracion` verifica si el usuario autenticado tiene rol `"RESOLUTOR"` y valida que su colección de tipos de resolución contenga la competencia `"SUBSIDIO"`. En caso de no contar con dicha competencia, arroja `ResponseStatusException(HttpStatus.FORBIDDEN, ...)`.
   - Toda la lógica del servicio es completa, funcional y respaldada por repositorios JPA.
   - El 100% de los comentarios de código y notas explicativas están en idioma español.

3. **`code/frontend/src/pages/ProjectDetailsPage.jsx`**:
   - En la línea 116 se define `isResolutorSubsidio`:
     `const isResolutorSubsidio = user?.role === 'RESOLUTOR' && user?.tiposResolucion?.some(t => t.tipo.toUpperCase() === 'SUBSIDIO');`
   - En las líneas 1060-1065 y 1122-1127, la acción/botón "Poner en Consideración" se renderiza condicionalmente restringiendo el acceso únicamente a usuarios autorizados:
     `(user?.role === 'ADMINISTRADOR' || user?.role === 'ADMIN' || user?.role === 'RESPONSABLE' || isResolutorSubsidio === true)`
   - El 100% de los comentarios JSX y bloques inline están redactados en español.

4. **`code/frontend/src/components/SolicitudModal.jsx`**:
   - En la línea 14 se define `isResolutorSubsidio`.
   - En las líneas 33-35 se define `canPonerConsideracion`:
     `const canPonerConsideracion = user?.role === 'ADMINISTRADOR' || user?.role === 'ADMIN' || user?.role === 'RESPONSABLE' || isResolutorSubsidio === true || formData.status === 'consideracion';`
   - En la línea 576, la opción de estado `'consideracion'` dentro del selector `<select>` se condiciona a `{canPonerConsideracion && <option value="consideracion">Consideración</option>}`.
   - El 100% de los comentarios dentro del componente están redactados en español.

5. **Pruebas y Compilación de Backend (`code/backend`)**:
   - Comando `mvn compile` finalizado con éxito: `BUILD SUCCESS` (Total time: 1.596 s).
   - Comando `mvn test` finalizado con éxito: `BUILD SUCCESS` (Tests run: 12, Failures: 0, Errors: 0, Skipped: 0).

---

## 2. Logic Chain (Cadena de Razonamiento)

1. **Autenticidad de Código**:
   - Premisa: Una violación de integridad ocurre si existen respuestas simuladas (facades sintéticas) o resultados hardcodeados para engañar las pruebas.
   - Evidencia: El análisis de código demostró el flujo completo de persistencia H2/JPA, la comunicación asíncrona mediante Spring Framework, la renderización condicional basada en roles con React Context (`AuthContext`) y la invocación de endpoints REST de Spring Boot.
   - Conclusión: No existen fachadas sintéticas ni datos hardcodeados. El código es 100% auténtico.

2. **Regla de Idioma Obligatoria**:
   - Premisa: Todo comentario, JavaDoc, JSDoc o nota inline en el código debe estar obligatoriamente en español.
   - Evidencia: Inspección exhaustiva por expresiones regulares y lectura completa de los 4 archivos. Se constató que cada nota explicativa está redactada en español.
   - Conclusión: Cumplimiento del 100% de la regla de idioma.

3. **Criterios del Usuario**:
   - Criterio 1: `@Async sendSubsidioApprovedEmail` con `@Transactional(readOnly = true)` en `EmailService.java`. Verificado en líneas 36-37.
   - Criterio 2: `aprobarAsignacion` evalúa `assignment.getTipoResolucion()` en `SolicitudService.java`. Verificado en líneas 654-676.
   - Criterio 3: `ponerEnConsideracion` valida el rol `"RESOLUTOR"` y competencia `"SUBSIDIO"`, arrojando HTTP 403 Forbidden. Verificado en líneas 690-701.
   - Criterio 4: UI (`ProjectDetailsPage.jsx` y `SolicitudModal.jsx`) restringe el acceso a "Poner en Consideración" a usuarios autorizados. Verificado en ambas páginas/componentes mediante variables de control de rol (`isResolutorSubsidio`, `canPonerConsideracion`).
   - Conclusión: Los 4 criterios requeridos por el usuario se cumplen rigurosamente.

4. **Compilación y Pruebas Backend**:
   - Premisa: El sistema debe compilar sin errores y superar la suite de pruebas unitarias/integración.
   - Evidencia: `mvn compile` finalizó con `BUILD SUCCESS`. `mvn test` ejecutó 12 pruebas con 0 fallos y 0 errores.
   - Conclusión: El estado técnico del backend es estable y limpio.

---

## 3. Caveats (Salvedades)

- No se ejecutó un entorno de frontend interactivo End-to-End con Cypress/Playwright dado que la suite oficial de validación del proyecto para esta etapa se basa en compilación/pruebas de backend y verificación estática/dinámica de componentes UI.
- No existen salvedades que comprometan el veredicto final.

---

## 4. Conclusion (Conclusión y Veredicto)

**Veredicto Definiciòn**: **CLEAN**

El producto de trabajo inspeccionado cumple de forma exhaustiva con todas las especificaciones de autenticidad, idioma en comentarios, requisitos funcionales de autorización y seguridad por roles, y ejecución limpia de la suite de pruebas automatizadas en el backend (0 errores, 0 fallos).

---

## 5. Verification Method (Método de Verificación Independiente)

Para reproducir independientemente esta auditoría y verificar los resultados:

1. **Verificación de Compilación y Pruebas Backend**:
   ```bash
   cd c:\Users\fran\dev\projects\SGP\code\backend
   mvn clean compile
   mvn test
   ```
   *Criterio de Invalidez*: Cualquier fallo de compilación o test fallido (`Failures > 0` o `Errors > 0`).

2. **Verificación de Criterios de Código**:
   - Inspeccionar `EmailService.java` línea 36-38 para verificar `@Async` y `@Transactional(readOnly = true)`.
   - Inspeccionar `SolicitudService.java` línea 654 para confirmar `assignment.getTipoResolucion()`.
   - Inspeccionar `SolicitudService.java` línea 697 para confirmar `HttpStatus.FORBIDDEN`.
   - Inspeccionar `ProjectDetailsPage.jsx` línea 1060 y `SolicitudModal.jsx` línea 35 para confirmar las restricciones de UI.

3. **Verificación de Idioma en Comentarios**:
   - Ejecutar la búsqueda de comentarios en el workspace para confirmar que no existen notas en inglés.
