package com.sgp.backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO dedicado para recibir los datos del formulario de actualización de una solicitud.
 * Evita el problema de deserialización polimórfica al usar directamente la entidad
 * abstracta {@code Solicitud} como @RequestBody en el endpoint PUT.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SolicitudUpdateDTO {

    /* ── Identificación del subtipo ─────────────────────────────────── */
    private String type; // "PEDIDO" o "SUBSIDIO"

    /* ── Campos básicos ──────────────────────────────────────────────── */
    private String description;
    private String status;
    private String origin;
    private LocalDate entryDate;

    /* ── Beneficiario ────────────────────────────────────────────────── */
    private PersonDTO person;

    /* ── Ubicación ───────────────────────────────────────────────────── */
    private String locationName;
    private String barrio;
    private String zone;

    /* ── Seguimiento ─────────────────────────────────────────────────── */
    private LocalDate contactDate;
    private LocalDate resolutionDate;
    private String resolution;
    private String detail;
    private String observation;
    private Boolean firstContactControl;

    /* ── Gestión ─────────────────────────────────────────────────────── */
    /** ID del responsable asignado; null significa sin asignación explícita. */
    private Long responsableId;

    private String suggestedResolutionType;
    private Boolean resolutionApproved;

    /* ── Subsidio (solo aplica si type == "SUBSIDIO") ────────────────── */
    private java.math.BigDecimal amount;
    private java.time.LocalDate grantDate;

    /* ── Asignaciones de resolutores ─────────────────────────────────── */
    private List<ResolutorAssignmentDTO> assignments;

    /* ── DTO interno para el beneficiario ────────────────────────────── */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PersonDTO {
        private Long id;
        private String name;
        private String phone;
        private String type;
        private String subType;
    }
}
