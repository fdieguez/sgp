package com.sgp.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entidad de configuración general del sistema.
 * Almacena la versión actual del esquema de la base de datos para trazabilidad entre entornos.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "config")
public class Config {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Versión vigente del esquema de la base de datos (formato SemVer, ej: 1.2.9).
     */
    @Column(name = "db_version", nullable = false, length = 30)
    private String dbVersion;

    /**
     * Descripción breve de la última actualización o migración aplicada sobre la base.
     */
    @Column(name = "descripcion", length = 255)
    private String descripcion;

    /**
     * Fecha y hora de última actualización de la configuración de versión.
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
