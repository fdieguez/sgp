package com.sgp.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tipo_resolucion")
public class TipoResolucion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String tipo;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true; // Para borrado lógico

    @ManyToOne
    @JoinColumn(name = "default_resolutor_id")
    private User resolutor;

    @OneToMany(mappedBy = "tipoResolucion", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<TipoResolucionAtributo> atributosConfig = new ArrayList<>();
}
