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

    // "PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"
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

    @ManyToOne(optional = false)
    @JoinColumn(name = "person_id")
    private Person person; // The beneficiary

    @ManyToOne
    @JoinColumn(name = "location_id")
    private Location location;

    @ManyToOne
    @JoinColumn(name = "responsable_id")
    private Responsable responsable;

    @ManyToOne
    @JoinColumn(name = "sheets_config_id")
    private SheetsConfig sheetsConfig;
}
