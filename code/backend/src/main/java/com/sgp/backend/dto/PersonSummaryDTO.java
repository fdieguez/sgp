package com.sgp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO que encapsula los datos personales y el historial 360° de solicitudes asociadas (CDU-06 y CDU-07).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonSummaryDTO {

    private Long id;
    private String name;
    private String type;
    private String subType;
    private String dni;
    private String phone;
    private String email;
    private String address;
    private Long locationId;
    private String locationName;

    // Métricas del Historial 360° (CDU-07)
    private long totalSolicitudes;
    private long pendientes;
    private long enProceso;
    private long enResolucion;
    private long completadas;
    private long rechazadas;
    private long consideracion;
}
