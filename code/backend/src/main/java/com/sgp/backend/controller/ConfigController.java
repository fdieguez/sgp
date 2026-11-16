package com.sgp.backend.controller;

import com.sgp.backend.entity.Config;
import com.sgp.backend.repository.ConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controlador REST para consultar la versión de base de datos y configuración del sistema.
 */
@RestController
@RequestMapping("/api/system-config")
@RequiredArgsConstructor
public class ConfigController {

    private final ConfigRepository configRepository;

    /**
     * Devuelve la versión vigente de la base de datos registrada en la tabla config.
     *
     * @return Mapa con la versión de BD, descripción y última actualización.
     */
    @GetMapping("/db-version")
    public ResponseEntity<Map<String, Object>> getDbVersion() {
        return configRepository.findTopByOrderByIdDesc()
                .map(cfg -> ResponseEntity.ok(Map.<String, Object>of(
                        "dbVersion", cfg.getDbVersion(),
                        "descripcion", cfg.getDescripcion() != null ? cfg.getDescripcion() : "",
                        "updatedAt", cfg.getUpdatedAt() != null ? cfg.getUpdatedAt().toString() : ""
                )))
                .orElseGet(() -> ResponseEntity.ok(Map.of(
                        "dbVersion", "sin-version",
                        "descripcion", "No hay versión registrada en tabla config",
                        "updatedAt", ""
                )));
    }
}
