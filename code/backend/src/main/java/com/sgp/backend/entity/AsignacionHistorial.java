package com.sgp.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "asignacion_historial")
public class AsignacionHistorial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "solicitud_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Solicitud solicitud;

    @ManyToOne
    @JoinColumn(name = "responsable_user_id")
    private User responsable; // The one being assigned/unassigned. Null if unassigned.

    @Column(nullable = false)
    private String actionType; // e.g., "ASSIGNED", "UNASSIGNED", "REASSIGNED"

    @Column(nullable = false)
    private String assignedByUsername; // Email or name of the user who made the change

    @Column(nullable = false)
    private LocalDateTime actionDate;
}
