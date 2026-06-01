package com.sgp.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password; // Will store BCrypt hash

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = true)
    private String dni;

    @Column(nullable = true)
    private java.time.LocalDate birthDate;

    @Column(nullable = false)
    private String role; // e.g., "ADMIN", "USER"

    @Column(nullable = false)
    private String phone;

    @Column(nullable = true)
    private String zone;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_tipo_resolucion",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "tipo_resolucion_id")
    )
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("resolutor")
    @lombok.EqualsAndHashCode.Exclude
    @lombok.ToString.Exclude
    private java.util.Set<TipoResolucion> tiposResolucion = new java.util.HashSet<>();

    /**
     * Devuelve el nombre completo para el frontend.
     */
    public String getName() {
        return (firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "");
    }
}
