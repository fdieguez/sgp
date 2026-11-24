package com.sgp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO de respuesta para exponer notificaciones al frontend sin serializar relaciones perezosas completas.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificacionResponse {
    private Long id;
    private Long solicitudId;
    private Long autorId;
    private String autorNombre;
    private String autorEmail;
    private String mensaje;
    private boolean leida;
    private LocalDateTime fechaCreacion;
}
