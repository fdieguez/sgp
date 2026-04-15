package com.sgp.backend.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tipo_resolucion_atributo")
public class TipoResolucionAtributo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tipo_resolucion_id")
    @JsonBackReference
    @ToString.Exclude
    private TipoResolucion tipoResolucion;

    @ManyToOne(optional = false)
    @JoinColumn(name = "atributo_resolucion_id")
    private AtributoResolucion atributo;

    @Column(nullable = false)
    @Builder.Default
    private Boolean requerido = false;

    @Column(nullable = false)
    @Builder.Default
    private Integer orden = 0;
}
