package com.sgp.backend.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
public class DashboardStatsDTO {
    private long totalSolicitudes;
    private long pendingSolicitudes;
    private long inProgressSolicitudes;
    private long inResolutionSolicitudes;
    private long completedSolicitudes;
    private long rejectedSolicitudes;
    private BigDecimal totalSubsidiesDelivered;
    private Map<String, Long> solicitudesByOrigin;

    // Campos estadísticos extendidos para la Etapa 10
    private java.util.List<Map<String, Object>> solicitudesMensuales;
    private java.util.List<Map<String, Object>> montosMensualesSubsidios;
    private Map<String, Long> solicitudesPorLocalidad;
    private Map<String, Long> solicitudesPorBarrioSantaFe;
    private java.util.List<Map<String, Object>> estadisticasPorTipoSubsidio;
}
