package com.sgp.backend.controller;

import com.sgp.backend.service.MaintenanceService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador para operaciones de mantenimiento del sistema.
 * Restringido exclusivamente al rol ADMINISTRADOR.
 */
@RestController
@RequestMapping("/api/admin/maintenance")
@RequiredArgsConstructor
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    /**
     * Endpoint para limpiar las tablas transaccionales de la base de datos y adjuntos.
     * Requiere contraseña del administrador y confirmación escrita ("LIMPIAR").
     *
     * @param request Cuerpo del request con contraseña y texto de confirmación.
     * @return ResponseEntity con mensaje de éxito o error.
     */
    @PostMapping("/clear-transactions")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> clearTransactions(@RequestBody ClearTransactionsRequest request) {
        try {
            maintenanceService.clearTransactions(request.getPassword(), request.getConfirmText());
            return ResponseEntity.ok(java.util.Map.of("message", "Limpieza de base de datos transaccional completada con éxito"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(java.util.Map.of("error", "Error interno al ejecutar la limpieza: " + e.getMessage()));
        }
    }

    /**
     * DTO interno para recibir los datos de confirmación de limpieza de transacciones.
     */
    @Data
    public static class ClearTransactionsRequest {
        private String password;
        private String confirmText;
    }
}
