package com.sgp.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * DTO used to receive resolutor assignment data from the frontend.
 * Contains the resolutor identifier (email), the resolution type, and a generic detail field.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResolutorAssignmentDTO {
    @NotNull
    private String resolutorEmail; // email of the resolutor

    @NotNull
    private String tipoResolucion; // resolution type

    @NotNull
    @Size(max = 100)
    private String detalle; // max 100 characters, generic detail
}
