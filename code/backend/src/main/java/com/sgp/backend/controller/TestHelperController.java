package com.sgp.backend.controller;

import com.sgp.backend.service.GoogleSheetsService;
import com.sgp.backend.service.FileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/test-helper")
@RequiredArgsConstructor
@Slf4j
public class TestHelperController {

    private final GoogleSheetsService googleSheetsService;
    private final FileService fileService;
    private final jakarta.persistence.EntityManager entityManager;

    @PostMapping("/modify-solicitud-row")
    public ResponseEntity<?> modifySolicitudRow(@RequestBody Map<String, Object> payload) {
        String spreadsheetId = (String) payload.get("spreadsheetId");
        String sheetName = (String) payload.get("sheetName");
        String solicitudId = String.valueOf(payload.get("solicitudId"));
        String columnName = (String) payload.get("columnName");
        String newValue = (String) payload.get("newValue");

        log.info("TestHelper: Modificando fila de solicitud ID {} en planilla {} / columna {} -> {}", 
                solicitudId, spreadsheetId, columnName, newValue);

        String cleanColumnName = columnName != null ? columnName.trim().toLowerCase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u") : "";

        try {
            String range = "'" + sheetName + "'!A1:AD1000";
            List<List<Object>> data = googleSheetsService.readSheet(spreadsheetId, range);
            if (data == null || data.size() < 2) {
                return ResponseEntity.badRequest().body(Map.of("error", "No hay datos en la planilla."));
            }

            List<Object> h1 = data.get(0);
            List<Object> h2 = data.get(1);
            int idCol = -1;
            int targetCol = -1;
            int size = Math.max(h1.size(), h2.size());

            for (int j = 0; j < size; j++) {
                String val1 = getCleanHeaderVal(h1, j);
                String val2 = getCleanHeaderVal(h2, j);
                if ("id".equals(val1) || "id".equals(val2) || val1.contains("identificador") || val2.contains("identificador")) {
                    idCol = j;
                }
                
                boolean match = false;
                if (cleanColumnName.contains("descripcion") || cleanColumnName.contains("detalle")) {
                    match = val1.contains("descrip") || val2.contains("descrip") || val1.contains("detalle") || val2.contains("detalle");
                } else if (cleanColumnName.contains("monto") || cleanColumnName.contains("dinero")) {
                    match = val1.contains("monto") || val2.contains("monto") || val1.contains("dinero") || val2.contains("dinero");
                } else {
                    match = cleanColumnName.equals(val1) || cleanColumnName.equals(val2) || val1.contains(cleanColumnName) || val2.contains(cleanColumnName);
                }
                
                if (match) {
                    targetCol = j;
                }
            }

            if (idCol == -1) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se encontró la columna de ID."));
            }
            if (targetCol == -1) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se encontró la columna: " + columnName));
            }

            int targetRow = -1;
            for (int r = 2; r < data.size(); r++) {
                List<Object> row = data.get(r);
                if (row.size() > idCol && solicitudId.equals(String.valueOf(row.get(idCol)).trim())) {
                    targetRow = r + 1; // 1-based
                    break;
                }
            }

            if (targetRow == -1) {
                return ResponseEntity.badRequest().body(Map.of("error", "No se encontró la fila para el ID " + solicitudId));
            }

            String colLetter = getColumnLetter(targetCol);
            String cellRange = "'" + sheetName + "'!" + colLetter + targetRow;
            googleSheetsService.writeSheet(spreadsheetId, cellRange, List.of(List.of((Object) newValue)));

            return ResponseEntity.ok(Map.of("message", "Celda actualizada correctamente", "cell", cellRange));
        } catch (Exception e) {
            log.error("Error al modificar celda en test helper", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @Transactional
    @PostMapping("/keep-only-witness")
    public ResponseEntity<?> keepOnlyWitness(@RequestBody Map<String, Object> payload) {
        Object keepIdObj = payload.get("keepId");
        if (keepIdObj == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "El parámetro 'keepId' es obligatorio."));
        }
        Long keepId = Long.parseLong(String.valueOf(keepIdObj));
        log.info("TestHelper: Purgando base de datos y manteniendo únicamente la solicitud ID {}", keepId);

        try {
            List<com.sgp.backend.entity.DocumentoAdjunto> adjuntos = entityManager.createQuery(
                "SELECT da FROM DocumentoAdjunto da WHERE da.solicitud.id != :keepId", 
                com.sgp.backend.entity.DocumentoAdjunto.class)
                .setParameter("keepId", keepId)
                .getResultList();

            for (com.sgp.backend.entity.DocumentoAdjunto adjunto : adjuntos) {
                if (adjunto.getFileName() != null) {
                    try {
                        fileService.deleteFile(adjunto.getFileName());
                    } catch (Exception e) {
                        log.warn("Fallo al eliminar archivo físico de adjunto {}", adjunto.getFileName(), e);
                    }
                }
            }

            try {
                entityManager.createNativeQuery("DELETE FROM pedidos WHERE id != :keepId")
                    .setParameter("keepId", keepId).executeUpdate();
            } catch (Exception e) {
                // ignore
            }
            try {
                entityManager.createNativeQuery("DELETE FROM subsidios WHERE id != :keepId")
                    .setParameter("keepId", keepId).executeUpdate();
            } catch (Exception e) {
                // ignore
            }

            entityManager.createQuery("DELETE FROM TicketSeguimiento t WHERE t.solicitud.id != :keepId")
                .setParameter("keepId", keepId).executeUpdate();
            entityManager.createQuery("DELETE FROM DocumentoAdjunto d WHERE d.solicitud.id != :keepId")
                .setParameter("keepId", keepId).executeUpdate();
            entityManager.createQuery("DELETE FROM SolicitudResolutorAssignment a WHERE a.solicitud.id != :keepId")
                .setParameter("keepId", keepId).executeUpdate();
            entityManager.createQuery("DELETE FROM AsignacionHistorial h WHERE h.solicitud.id != :keepId")
                .setParameter("keepId", keepId).executeUpdate();
            entityManager.createQuery("DELETE FROM Solicitud s WHERE s.id != :keepId")
                .setParameter("keepId", keepId).executeUpdate();

            return ResponseEntity.ok(Map.of("message", "Limpieza de transacciones finalizada. Caso testigo mantenido: " + keepId));
        } catch (Exception e) {
            log.error("Error al limpiar base de datos en test helper", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @Transactional
    @PostMapping("/clear-all-solicitudes")
    public ResponseEntity<?> clearAllSolicitudes() {
        log.info("TestHelper: Limpiando absolutamente todas las solicitudes y reseteando auto_increment");
        try {
            entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 0").executeUpdate();
            
            try {
                List<com.sgp.backend.entity.DocumentoAdjunto> adjuntos = entityManager.createQuery(
                    "SELECT da FROM DocumentoAdjunto da", 
                    com.sgp.backend.entity.DocumentoAdjunto.class)
                    .getResultList();
                for (com.sgp.backend.entity.DocumentoAdjunto adjunto : adjuntos) {
                    if (adjunto.getFileName() != null) {
                        try {
                            fileService.deleteFile(adjunto.getFileName());
                        } catch (Exception e) {
                            log.warn("Fallo al eliminar archivo físico de adjunto {}", adjunto.getFileName(), e);
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Error al intentar limpiar archivos físicos de adjuntos: {}", e.getMessage());
            }

            entityManager.createNativeQuery("TRUNCATE TABLE documento_adjunto").executeUpdate();
            entityManager.createNativeQuery("TRUNCATE TABLE ticket_seguimiento").executeUpdate();
            entityManager.createNativeQuery("TRUNCATE TABLE asignacion_historial").executeUpdate();
            entityManager.createNativeQuery("TRUNCATE TABLE solicitud_resolutor_assignment").executeUpdate();
            entityManager.createNativeQuery("TRUNCATE TABLE solicitudes").executeUpdate();
            
            try {
                entityManager.createNativeQuery("UPDATE projects SET sheets_config_id = null").executeUpdate();
                entityManager.createNativeQuery("DELETE FROM sheets_config").executeUpdate();
                log.info("TestHelper: Configuraciones de SheetsConfig purgadas de forma exitosa.");
            } catch (Exception e) {
                log.warn("Error al intentar limpiar sheets_config: {}", e.getMessage());
            }
            
            try {
                java.sql.Connection conn = entityManager.unwrap(java.sql.Connection.class);
                String dbProductName = conn.getMetaData().getDatabaseProductName().toLowerCase();
                if (dbProductName.contains("mysql") || dbProductName.contains("mariadb")) {
                    entityManager.createNativeQuery("ALTER TABLE solicitudes AUTO_INCREMENT = 1").executeUpdate();
                } else {
                    entityManager.createNativeQuery("ALTER TABLE solicitudes ALTER COLUMN id RESTART WITH 1").executeUpdate();
                }
            } catch (Exception e) {
                log.warn("Fallo al reiniciar el AUTO_INCREMENT de solicitudes: {}", e.getMessage());
            }
            
            entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 1").executeUpdate();
            
            return ResponseEntity.ok(Map.of("message", "Todas las solicitudes han sido eliminadas y el identificador de inicio ha sido reseteado a 1."));
        } catch (Exception e) {
            log.error("Error al limpiar todas las solicitudes", e);
            try {
                entityManager.createNativeQuery("SET FOREIGN_KEY_CHECKS = 1").executeUpdate();
            } catch (Exception ex) {}
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/sheet-titles")
    public ResponseEntity<?> getSheetTitles(@RequestParam String spreadsheetId) {
        try {
            List<String> titles = googleSheetsService.getSheetTitles(spreadsheetId);
            return ResponseEntity.ok(Map.of("titles", titles));
        } catch (Exception e) {
            log.error("Error al obtener títulos de hojas", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/read-sheet")
    public ResponseEntity<?> readSheet(@RequestParam String spreadsheetId, @RequestParam String range) {
        try {
            List<List<Object>> data = googleSheetsService.readSheet(spreadsheetId, range);
            return ResponseEntity.ok(Map.of("data", data != null ? data : List.of()));
        } catch (Exception e) {
            log.error("Error al leer hoja", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/clear-sheet")
    public ResponseEntity<?> clearSheet(@RequestBody Map<String, Object> payload) {
        String spreadsheetId = (String) payload.get("spreadsheetId");
        String sheetName = (String) payload.get("sheetName");
        log.info("TestHelper: Limpiando la pestaña {} de la planilla {}", sheetName, spreadsheetId);
        try {
            googleSheetsService.clearSheet(spreadsheetId, "'" + sheetName + "'!A3:Z1000");
            return ResponseEntity.ok(Map.of("message", "Planilla limpiada exitosamente"));
        } catch (Exception e) {
            log.error("Fallo al limpiar planilla", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    private String getCleanHeaderVal(List<Object> row, int index) {
        if (row == null || index >= row.size() || row.get(index) == null) return "";
        return row.get(index).toString().trim().toLowerCase()
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u");
    }

    private String getColumnLetter(int colIndex) {
        if (colIndex < 26) {
            return String.valueOf((char) ('A' + colIndex));
        } else {
            return "A" + (char) ('A' + (colIndex - 26));
        }
    }
}
