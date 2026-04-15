package com.sgp.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "atributo_resolucion")
public class AtributoResolucion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nombre;

    /**
     * Tipo de dato: TEXT, NUMBER, DATE, TEXTAREA, FILE, SELECT
     */
    @Column(nullable = false, length = 50)
    private String tipoDato;

    /**
     * Opciones para tipos SELECT, almacenados separados por comas
     */
    @Column(columnDefinition = "TEXT")
    private String opciones;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true; // Para borrado lógico
}
