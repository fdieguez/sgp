package com.sgp.backend.service;

import com.sgp.backend.dto.DashboardStatsDTO;
import com.sgp.backend.repository.SolicitudRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.sgp.backend.entity.Responsable;
import com.sgp.backend.entity.User;
import com.sgp.backend.repository.ResponsableRepository;
import com.sgp.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.data.jpa.domain.Specification;
import com.sgp.backend.entity.Solicitud;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final SolicitudRepository solicitudRepository;
    private final ResponsableRepository responsableRepository;
    private final UserRepository userRepository;

    public DashboardStatsDTO getStats() {
        Specification<Solicitud> spec = Specification.where(null);

        // Apply Role Based Filtering (same logic as SolicitudService)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_USER"))) {
            String email = auth.getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                Responsable resp = responsableRepository.findByUserId(user.getId()).orElse(null);
                if (resp != null) {
                    final String zoneStr = resp.getZone();
                    final Responsable responsableCriteria = resp;

                    Specification<Solicitud> roleSpec = (root, query, cb) -> {
                        jakarta.persistence.criteria.Predicate zonePredicate = cb.disjunction();
                        if (zoneStr != null && !zoneStr.trim().isEmpty()) {
                            zonePredicate = cb.equal(
                                    cb.lower(cb.trim(root.get("zone"))),
                                    zoneStr.trim().toLowerCase());
                        }
                        jakarta.persistence.criteria.Predicate respPredicate = cb.equal(root.get("responsable"),
                                responsableCriteria);
                        return cb.or(zonePredicate, respPredicate);
                    };
                    spec = spec.and(roleSpec);
                } else {
                    spec = spec.and((root, query, cb) -> cb.disjunction());
                }
            }
        }

        List<Solicitud> filteredSolicitudes = solicitudRepository.findAll(spec);

        long totalSolicitudes = filteredSolicitudes.size();
        long pendingSolicitudes = filteredSolicitudes.stream().filter(s -> "PENDING".equals(s.getStatus())).count();
        long completedSolicitudes = filteredSolicitudes.stream().filter(s -> "COMPLETED".equals(s.getStatus())).count();

        BigDecimal totalDelivered = filteredSolicitudes.stream()
                .filter(s -> "COMPLETED".equals(s.getStatus()) && s instanceof com.sgp.backend.entity.Subsidio)
                .map(s -> ((com.sgp.backend.entity.Subsidio) s).getAmount())
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Long> solicitudesByOrigin = new HashMap<>();
        for (Solicitud s : filteredSolicitudes) {
            String origin = s.getOrigin();
            if (origin == null || origin.trim().isEmpty())
                origin = "UNKNOWN";
            solicitudesByOrigin.put(origin, solicitudesByOrigin.getOrDefault(origin, 0L) + 1);
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
