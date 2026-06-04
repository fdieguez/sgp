package com.sgp.backend.service;

import com.sgp.backend.dto.DashboardStatsDTO;
import com.sgp.backend.repository.SolicitudRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.sgp.backend.entity.User;
import com.sgp.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.entity.SolicitudResolutorAssignment;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Subquery;
import jakarta.persistence.criteria.Root;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final SolicitudRepository solicitudRepository;
    private final UserRepository userRepository;

    public DashboardStatsDTO getStats() {
        Specification<Solicitud> spec = Specification.where(null);

        // Aplicar filtrado basado en roles (alineado con SolicitudService)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String email = auth.getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                String userRole = user.getRole();
                // Si es ADMIN o DISTRIBUIDOR, tiene acceso completo a todas las estadísticas sin filtrar
                if (userRole != null && !userRole.contains("ADMIN") && !userRole.contains("DISTRIBUIDOR")) {
                    spec = spec.and((root, query, cb) -> {
                        List<jakarta.persistence.criteria.Predicate> orPredicates = new java.util.ArrayList<>();
                        
                        if (userRole.contains("OPERADOR")) {
                            orPredicates.add(cb.equal(root.get("createdBy"), user));
                        }
                        if (userRole.contains("RESPONSABLE")) {
                            final String zoneStr = user.getZone();
                            jakarta.persistence.criteria.Predicate zonePredicate = cb.disjunction();
                            if (zoneStr != null && !zoneStr.trim().isEmpty()) {
                                zonePredicate = cb.equal(
                                        cb.lower(cb.trim(root.get("zone"))),
                                        zoneStr.trim().toLowerCase());
                            }
                            jakarta.persistence.criteria.Predicate respPredicate = cb.equal(root.get("responsable"), user);
                            orPredicates.add(cb.or(zonePredicate, respPredicate));
                        }
                        if (userRole.contains("RESOLUTOR")) {
                            Subquery<Long> subquery = query.subquery(Long.class);
                            Root<SolicitudResolutorAssignment> assignmentRoot = subquery.from(SolicitudResolutorAssignment.class);
                            subquery.select(assignmentRoot.get("solicitud").get("id"))
                                    .where(cb.equal(assignmentRoot.get("resolutor"), user));
                            
                            orPredicates.add(cb.or(
                                cb.equal(root.get("resolutor"), user),
                                cb.in(root.get("id")).value(subquery)
                            ));
                        }
                        
                        if (orPredicates.isEmpty()) {
                            return cb.disjunction();
                        }
                        
                        return cb.or(orPredicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
                    });
                }
            }
        }

        List<Solicitud> filteredSolicitudes = solicitudRepository.findAll(spec);

        long totalSolicitudes = filteredSolicitudes.size();
        long pendingSolicitudes = filteredSolicitudes.stream().filter(s -> s.getStatus() != null && "pendiente".equalsIgnoreCase(s.getStatus().trim())).count();
        long inProgressSolicitudes = filteredSolicitudes.stream().filter(s -> s.getStatus() != null && "en proceso".equalsIgnoreCase(s.getStatus().trim())).count();
        long inResolutionSolicitudes = filteredSolicitudes.stream().filter(s -> s.getStatus() != null && "en resolucion".equalsIgnoreCase(s.getStatus().trim())).count();
        long completedSolicitudes = filteredSolicitudes.stream().filter(s -> s.getStatus() != null && "completadas".equalsIgnoreCase(s.getStatus().trim())).count();
        long rejectedSolicitudes = filteredSolicitudes.stream().filter(s -> s.getStatus() != null && "rechazada".equalsIgnoreCase(s.getStatus().trim())).count();

        BigDecimal totalDelivered = filteredSolicitudes.stream()
                .filter(s -> s instanceof com.sgp.backend.entity.Subsidio && s.getStatus() != null && "completadas".equalsIgnoreCase(s.getStatus().trim()))
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
                .inProgressSolicitudes(inProgressSolicitudes)
                .inResolutionSolicitudes(inResolutionSolicitudes)
                .completedSolicitudes(completedSolicitudes)
                .rejectedSolicitudes(rejectedSolicitudes)
                .totalSubsidiesDelivered(totalDelivered)
                .solicitudesByOrigin(solicitudesByOrigin)
                .build();
    }
}
