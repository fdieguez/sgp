package com.sgp.backend.service;

import com.sgp.backend.dto.DashboardStatsDTO;
import com.sgp.backend.repository.OrderRepository;
import com.sgp.backend.repository.SubsidyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final OrderRepository orderRepository;
    private final SubsidyRepository subsidyRepository;

    public DashboardStatsDTO getStats() {
        long totalOrders = orderRepository.count();
        long pendingOrders = orderRepository.countByStatus("PENDING");
        long completedOrders = orderRepository.countByStatus("COMPLETED");

        BigDecimal totalDelivered = subsidyRepository.sumAmountByStatus("DELIVERED");
        if (totalDelivered == null) {
            totalDelivered = BigDecimal.ZERO;
        }

        List<Object[]> originsRaw = orderRepository.countOrdersByOrigin();
        Map<String, Long> ordersByOrigin = new HashMap<>();
        for (Object[] row : originsRaw) {
            String origin = (String) row[0];
            Long count = (Long) row[1];
            if (origin == null)
                origin = "UNKNOWN";
            ordersByOrigin.put(origin, count);
        }

        return DashboardStatsDTO.builder()
                .totalOrders(totalOrders)
                .pendingOrders(pendingOrders)
                .completedOrders(completedOrders)
                .totalSubsidiesDelivered(totalDelivered)
                .ordersByOrigin(ordersByOrigin)
                .build();
    }
}
