package com.sgp.backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Entidad que representa a un contacto invitado frecuente para eventos de Google Calendar en Agenda (CDU-14).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "agenda_guests")
public class AgendaGuest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sheets_config_id", nullable = false)
    @JsonIgnore
    private SheetsConfig sheetsConfig;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
