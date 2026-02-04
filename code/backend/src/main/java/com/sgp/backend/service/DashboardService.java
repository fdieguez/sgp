package com.sgp.backend.service;

import com.sgp.backend.dto.DashboardStatsDTO;
import com.sgp.backend.repository.SolicitudRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final SolicitudRepository solicitudRepository;

    public DashboardStatsDTO getStats() {
        long totalSolicitudes = solicitudRepository.count();
        long pendingSolicitudes = solicitudRepository.countByStatus("PENDING");
        long completedSolicitudes = solicitudRepository.countByStatus("COMPLETED");

        BigDecimal totalDelivered = solicitudRepository.sumSubsidiosAmountByStatus("COMPLETED");
        if (totalDelivered == null) {
            totalDelivered = BigDecimal.ZERO;
        }

        List<Object[]> originsRaw = solicitudRepository.countSolicitudesByOrigin();
        Map<String, Long> solicitudesByOrigin = new HashMap<>();
        for (Object[] row : originsRaw) {
            String origin = (String) row[0];
            Long count = (Long) row[1];
            if (origin == null)
                origin = "UNKNOWN";
            solicitudesByOrigin.put(origin, count);
        }

        return DashboardStatsDTO.builder()
                .totalSolicitudes(totalSolicitudes)
                .pendingSolicitudes(pendingSolicitudes)
                .completedSolicitudes(completedSolicitudes)
                .totalSubsidiesDelivered(totalDelivered)
                .solicitudesByOrigin(solicitudesByOrigin)
                .build();
    }
}
