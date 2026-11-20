package com.sgp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para recibir datos de asignación de un resolutor desde el frontend.
 * Contiene el identificador del resolutor (email), el tipo de resolución y un
 * campo de detalle libre que puede almacenar texto plano o un JSON serializado
 * con los atributos del formulario dinámico.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResolutorAssignmentDTO {

    /** Identificador opcional de una asignación ya existente. */
    private Long id;

    /** Email del resolutor asignado (puede ser null o vacío si queda en el pool del tipo de resolución). */
    private String resolutorEmail;

    /** Tipo de resolución seleccionado (ej: "Subsidio", "Lentes", etc.). */
    private String tipoResolucion;

    /** Detalle libre o JSON serializado de los atributos del formulario dinámico. */
    private String detalle;

    /** Constructor retrocompatible de 3 argumentos (sin id). */
    public ResolutorAssignmentDTO(String resolutorEmail, String tipoResolucion, String detalle) {
        this.resolutorEmail = resolutorEmail;
        this.tipoResolucion = tipoResolucion;
        this.detalle = detalle;
    }
}
