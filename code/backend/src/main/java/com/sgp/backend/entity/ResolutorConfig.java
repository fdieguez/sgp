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
@Table(name = "resolutor_config")
public class ResolutorConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // e.g "SUBSIDIO", "DECLARACION_INTERES", "PEDIDO_AGENDA", "GESTION_GOBIERNO"
    @Column(nullable = false, unique = true)
    private String tipoResolucion;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User resolutor;
}
