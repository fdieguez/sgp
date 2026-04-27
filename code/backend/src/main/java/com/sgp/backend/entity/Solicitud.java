package com.sgp.backend.entity;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import java.time.LocalDate;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "solicitudes")
@Inheritance(strategy = InheritanceType.JOINED)
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = Pedido.class, name = "PEDIDO"),
        @JsonSubTypes.Type(value = Subsidio.class, name = "SUBSIDIO")
})
public abstract class Solicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private LocalDate entryDate;

    // Status: "pendiente", "en proceso", "en resolucion", "completadas", "rechazada", "cancelada"
    @Column(nullable = false)
    private String status;

    // Origin: "WHATSAPP", "NOTE", "EMAIL", "SOCIAL_MEDIA", "IMPORTED"
    private String origin;

    // New fields based on feedback
    private LocalDate contactDate;

    private LocalDate resolutionDate;

    @Column(columnDefinition = "TEXT")
    private String resolution;

    @Column(columnDefinition = "TEXT")
    private String detail;

    @Column(columnDefinition = "TEXT")
    private String observation;

    private String zone;

    private Boolean firstContactControl;

    @Column(name = "suggested_resolution_type")
    private String suggestedResolutionType;

    // Transient field to receive assignment data from the frontend
    @Transient
    private java.util.List<com.sgp.backend.dto.ResolutorAssignmentDTO> assignments;

    private Boolean resolutionApproved;

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @ManyToOne
    @JoinColumn(name = "resolutor_asignado_id")
    // Existing field kept for compatibility
    private User resolutor;

    // New collection for multiple resolutor assignments
    @OneToMany(mappedBy = "solicitud", cascade = CascadeType.ALL, orphanRemoval = true)
    @lombok.Builder.Default
    private java.util.List<com.sgp.backend.entity.SolicitudResolutorAssignment> resolutorAssignments = new java.util.ArrayList<>();

    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty("locationName")
    private String locationName;

    @Transient
    @com.fasterxml.jackson.annotation.JsonProperty("barrio")
    private String barrio;

    @ManyToOne(optional = false)
    @JoinColumn(name = "person_id")
    private Person person; // The beneficiary

    @ManyToOne
    @JoinColumn(name = "location_id")
    private Location location;

    @ManyToOne
    @JoinColumn(name = "responsable_id")
    private User responsable;

    @ManyToOne
    @JoinColumn(name = "sheets_config_id")
    private SheetsConfig sheetsConfig;

    @OneToMany(mappedBy = "solicitud", cascade = CascadeType.ALL, orphanRemoval = true)
    @lombok.Builder.Default
    private java.util.List<AsignacionHistorial> historial = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "solicitud", cascade = CascadeType.ALL, orphanRemoval = true)
    @lombok.Builder.Default
    private java.util.List<DocumentoAdjunto> adjuntos = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "solicitud", cascade = CascadeType.ALL, orphanRemoval = true)
    @lombok.Builder.Default
    private java.util.List<TicketSeguimiento> tickets = new java.util.ArrayList<>();
}
