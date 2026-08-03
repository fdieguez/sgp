# Reporte de Revisión — Reviewer 2

## 1. Observación (Observation)

Al ejecutar la suite completa de pruebas en backend (`mvn test` en `code/backend`), el comando finalizó con estado **BUILD FAILURE** (Exit Code: 1).

**Detalle del fallo**:
- **Tests ejecutados**: 12, **Errores**: 2, **Fallos**: 0.
- **Clase afectada**: `com.sgp.backend.SolicitudM21Test`
- **Ubicación**: `SolicitudM21Test.java:77` (en el método `@BeforeEach setUp()`)
- **Excepción**: `org.springframework.dao.DataIntegrityViolationException`
- **Causa**: `La columna "ENTRY_DATE" no permite valores nulos (NULL)` (NULL not allowed for column "ENTRY_DATE").

**Revisión de Código**:
1. **EmailService.java**:
   - Métodos y `@Transactional(readOnly = true)` correctos. Comentarios en ESPAÑOL.
2. **SolicitudService.java**:
   - `aprobarAsignacion` evalúa `assignment.getTipoResolucion()`.
   - `ponerEnConsideracion` valida el rol `"RESOLUTOR"` y competencia `"SUBSIDIO"` (lanza HTTP 403 Forbidden). Comentarios en ESPAÑOL.
3. **Frontend (`ProjectDetailsPage.jsx` y `SolicitudModal.jsx`)**:
   - Lógica de visibilidad del botón y opción 'consideracion' correcta y comentarios en ESPAÑOL.

---

## 2. Cadena Lógica (Logic Chain)

1. En `SolicitudM21Test.java:77`, el método `setUp()` guarda directamente la entidad usando `solicitudRepository.save(Solicitud.builder().type("SUBSIDIO").status("pendiente").description(...).build())`.
2. La columna `ENTRY_DATE` en la base de datos posee restricción `NOT NULL`.
3. Al llamar a `solicitudRepository.save(...)` directamente (en lugar de `solicitudService.createSolicitud(...)`, que asigna por defecto `entryDate = LocalDate.now()`), la propiedad `entryDate` queda en `null`.
4. Esto provoca una `DataIntegrityViolationException` al insertar en base de datos, fallando los 2 métodos de prueba en `SolicitudM21Test`.
5. De acuerdo a los protocolos de revisión y tolerancia a fallos, no se aprueba ningún entregable cuyo comando de prueba (`mvn test`) falle.

---

## 3. Salvedades (Caveats)

- La lógica de negocio en `EmailService.java`, `SolicitudService.java`, `ProjectDetailsPage.jsx` y `SolicitudModal.jsx` es conceptual y técnicamente correcta. El único bloqueante es la corrección en `SolicitudM21Test.java` para incluir `.entryDate(java.time.LocalDate.now())` o invocar el servicio.

---

## 4. Conclusión (Conclusion)

**Veredicto**: **REQUEST_CHANGES**

- **Finding [Major]**: Fallo en la suite de pruebas backend `mvn test` por `DataIntegrityViolationException` en `SolicitudM21Test.java:77` debido a `ENTRY_DATE` nulo.
- **Acción requerida**: Actualizar `SolicitudM21Test.java:77` para asignar `entryDate` (ej: `.entryDate(java.time.LocalDate.now())`) en el builder de la solicitud de prueba para que `mvn test` pase limpiamente.

---

## 5. Método de Verificación (Verification Method)

1. Ejecutar en `code/backend`:
   ```bash
   mvn test
   ```
2. Verificar que `SolicitudM21Test` y todos los 12 tests del módulo backend pasen con **BUILD SUCCESS** (0 errors, 0 failures).
