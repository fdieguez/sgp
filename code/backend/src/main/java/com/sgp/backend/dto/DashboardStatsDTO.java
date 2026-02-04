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
    private long completedSolicitudes; // "DELIVERED" or "COMPLETED" - let's verify Order status strings
    private BigDecimal totalSubsidiesDelivered;
    private Map<String, Long> solicitudesByOrigin;
}
