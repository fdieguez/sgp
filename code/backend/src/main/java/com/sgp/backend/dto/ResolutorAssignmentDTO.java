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

    /** Email del resolutor asignado. */
    private String resolutorEmail;

    /** Tipo de resolución seleccionado (ej: "Subsidio", "Lentes", etc.). */
    private String tipoResolucion;

    /** Detalle libre o JSON serializado de los atributos del formulario dinámico. */
    private String detalle;
}
