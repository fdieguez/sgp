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
}
