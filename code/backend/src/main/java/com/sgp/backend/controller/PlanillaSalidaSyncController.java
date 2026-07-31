package com.sgp.backend.controller;

import com.sgp.backend.service.SyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

/**
 * Controlador REST encargado de exponer las operaciones de sincronización
 * bidireccional de la planilla externa de salida de Google Sheets.
 */
@RestController
@RequestMapping("/api/planilla-salida")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMINISTRADOR', 'RESOLUTOR')")
public class PlanillaSalidaSyncController {

    private final SyncService syncService;

    /**
     * Exporta las solicitudes en estado 'CONSIDERACION' a la planilla externa de Google Sheets.
     * Admite una lista de 'ids' en el payload para exportación selectiva.
     *
     * @param payload Contiene el identificador de la planilla 'spreadsheetId' y opcionalmente los 'ids'.
     * @return Mensaje informativo indicando la cantidad de registros exportados.
     */
    @PostMapping("/export")
    public ResponseEntity<Map<String, Object>> exportarPlanilla(@RequestBody Map<String, Object> payload) {
        String spreadsheetId = (String) payload.get("spreadsheetId");
        if (spreadsheetId == null || spreadsheetId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El parámetro 'spreadsheetId' es requerido."));
        }

        List<Long> ids = null;
        if (payload.containsKey("ids") && payload.get("ids") instanceof List) {
            List<?> rawList = (List<?>) payload.get("ids");
            ids = new java.util.ArrayList<>();
            for (Object obj : rawList) {
                if (obj instanceof Number) {
                    ids.add(((Number) obj).longValue());
                } else if (obj instanceof String) {
                    try {
                        ids.add(Long.parseLong((String) obj));
                    } catch (NumberFormatException e) {
                        // Ignorar valores de ID inválidos
                    }
                }
            }
        }

        try {
            int count = syncService.exportarPlanillaSalida(spreadsheetId, ids);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Sincronización de exportación finalizada. " + count + " solicitudes exportadas a la planilla de salida.",
                    "count", count
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Fallo al exportar planilla de salida: " + e.getMessage()
            ));
        }
    }

    /**
     * Importa las respuestas desde la planilla externa de Google Sheets a la base de datos del SGP.
     * Admite una lista de 'ids' en el payload para importación selectiva.
     *
     * @param payload Contiene el identificador de la planilla 'spreadsheetId' y opcionalmente los 'ids'.
     * @return Mensaje informativo indicando la cantidad de registros actualizados.
     */
    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importarPlanilla(@RequestBody Map<String, Object> payload) {
        String spreadsheetId = (String) payload.get("spreadsheetId");
        if (spreadsheetId == null || spreadsheetId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "El parámetro 'spreadsheetId' es requerido."));
        }

        List<Long> ids = null;
        if (payload.containsKey("ids") && payload.get("ids") instanceof List) {
            List<?> rawList = (List<?>) payload.get("ids");
            ids = new java.util.ArrayList<>();
            for (Object obj : rawList) {
                if (obj instanceof Number) {
                    ids.add(((Number) obj).longValue());
                } else if (obj instanceof String) {
                    try {
                        ids.add(Long.parseLong((String) obj));
                    } catch (NumberFormatException e) {
                        // Ignorar valores de ID inválidos
                    }
                }
            }
        }

        try {
            int count = syncService.importarPlanillaSalida(spreadsheetId, ids);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Sincronización de importación finalizada. " + count + " registros actualizados desde la planilla de salida.",
                    "count", count
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Fallo al importar planilla de salida: " + e.getMessage()
            ));
        }
    }
}
