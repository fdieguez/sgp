package com.sgp.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents an assignment of a resolutor (or multiple resolutores) to a Solicitud.
 * Allows storing additional detail data for each resolution type.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "solicitud_resolutor_assignment")
public class SolicitudResolutorAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "solicitud_id")
    private Solicitud solicitud;

    @ManyToOne(optional = false)
    @JoinColumn(name = "resolutor_id")
    private User resolutor;

    /**
     * Tipo de resolución, e.g. "SUBSIDIO", "MATERIALES", etc.
     */
    @Column(nullable = false)
    private String tipoResolucion;

    /**
     * Campo genérico para almacenar datos específicos de la resolución en formato JSON.
     */
    @Column(columnDefinition = "TEXT")
    private String detalle;
}
