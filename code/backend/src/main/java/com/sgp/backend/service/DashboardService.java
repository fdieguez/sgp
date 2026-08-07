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

    public DashboardStatsDTO getStats(String type, Integer year) {
        Specification<Solicitud> spec = Specification.where(null);

        // Aplicar filtrado basado en roles (alineado con SolicitudService)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String email = auth.getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                String userRole = user.getRole();
                // Si es ADMIN, DISTRIBUIDOR o AUDITOR, tiene acceso completo a todas las estadísticas sin filtrar
                if (userRole != null && !userRole.contains("ADMIN") && !userRole.contains("DISTRIBUIDOR") && !userRole.contains("AUDITOR")) {
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

        // Aplicar filtros dinámicos (Etapa 10)
        if (type != null && !type.trim().isEmpty() && !"ALL".equalsIgnoreCase(type.trim())) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.upper(root.get("type")), type.trim().toUpperCase()));
        }
        if (year != null) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.function("YEAR", Integer.class, root.get("entryDate")), year));
        }

        List<Solicitud> filteredSolicitudes = solicitudRepository.findAll(spec);

        long totalSolicitudes = filteredSolicitudes.size();
        long pendingSolicitudes = filteredSolicitudes.stream().filter(s -> s.getStatus() != null && "pendiente".equalsIgnoreCase(s.getStatus().trim())).count();
        long inProgressSolicitudes = filteredSolicitudes.stream().filter(s -> s.getStatus() != null && "en proceso".equalsIgnoreCase(s.getStatus().trim())).count();
        long inResolutionSolicitudes = filteredSolicitudes.stream().filter(s -> s.getStatus() != null && "en resolucion".equalsIgnoreCase(s.getStatus().trim())).count();
        long completedSolicitudes = filteredSolicitudes.stream().filter(s -> s.getStatus() != null && "completadas".equalsIgnoreCase(s.getStatus().trim())).count();
        long rejectedSolicitudes = filteredSolicitudes.stream().filter(s -> s.getStatus() != null && "rechazada".equalsIgnoreCase(s.getStatus().trim())).count();

        BigDecimal totalDelivered = filteredSolicitudes.stream()
                .filter(s -> "SUBSIDIO".equalsIgnoreCase(s.getType()) && s.getStatus() != null && "completadas".equalsIgnoreCase(s.getStatus().trim()))
                .map(Solicitud::getAmount)
                .filter(amount -> amount != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Long> solicitudesByOrigin = new HashMap<>();
        for (Solicitud s : filteredSolicitudes) {
            String origin = s.getOrigin();
            if (origin == null || origin.trim().isEmpty())
                origin = "UNKNOWN";
            solicitudesByOrigin.put(origin, solicitudesByOrigin.getOrDefault(origin, 0L) + 1);
        }

        // 1. Serie Temporal Mensual de Cantidades
        Map<String, Long> monthlyCounts = new HashMap<>();
        for (Solicitud s : filteredSolicitudes) {
            if (s.getEntryDate() != null) {
                String key = s.getEntryDate().getYear() + "-" + String.format("%02d", s.getEntryDate().getMonthValue());
                monthlyCounts.put(key, monthlyCounts.getOrDefault(key, 0L) + 1);
            }
        }
        java.util.List<Map<String, Object>> solicitudesMensuales = monthlyCounts.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("mes", entry.getKey());
                    map.put("cantidad", entry.getValue());
                    return map;
                })
                .collect(java.util.stream.Collectors.toList());

        // 2. Serie Temporal Mensual de Montos (Solo Subsidios)
        Map<String, BigDecimal> monthlyAmounts = new HashMap<>();
        for (Solicitud s : filteredSolicitudes) {
            if ("SUBSIDIO".equalsIgnoreCase(s.getType()) && s.getEntryDate() != null && s.getAmount() != null) {
                String key = s.getEntryDate().getYear() + "-" + String.format("%02d", s.getEntryDate().getMonthValue());
                monthlyAmounts.put(key, monthlyAmounts.getOrDefault(key, BigDecimal.ZERO).add(s.getAmount()));
            }
        }
        java.util.List<Map<String, Object>> montosMensualesSubsidios = monthlyAmounts.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("mes", entry.getKey());
                    map.put("monto", entry.getValue());
                    return map;
                })
                .collect(java.util.stream.Collectors.toList());

        // 3. Distribución por Localidad
        Map<String, Long> solicitudesPorLocalidad = new HashMap<>();
        for (Solicitud s : filteredSolicitudes) {
            String loc = (s.getLocation() != null) ? s.getLocation().getName() : s.getLocationName();
            if (loc == null || loc.trim().isEmpty()) loc = "Sin Localidad";
            solicitudesPorLocalidad.put(loc.trim(), solicitudesPorLocalidad.getOrDefault(loc.trim(), 0L) + 1);
        }

        // 4. Distribución por Barrio / Zona dentro de Santa Fe
        Map<String, Long> solicitudesPorBarrioSantaFe = new HashMap<>();
        for (Solicitud s : filteredSolicitudes) {
            String loc = (s.getLocation() != null) ? s.getLocation().getName() : s.getLocationName();
            if (loc != null && loc.trim().equalsIgnoreCase("santa fe")) {
                String barrio = s.getBarrio();
                if (barrio == null || barrio.trim().isEmpty()) {
                    barrio = s.getZone();
                }
                if (barrio == null || barrio.trim().isEmpty()) {
                    barrio = "Sin Zona/Barrio";
                }
                solicitudesPorBarrioSantaFe.put(barrio.trim(), solicitudesPorBarrioSantaFe.getOrDefault(barrio.trim(), 0L) + 1);
            }
        }

        // 5. Estadísticas de Subsidios agrupados por subsidioType
        Map<String, Map<String, Object>> typeStats = new HashMap<>();
        for (Solicitud s : filteredSolicitudes) {
            if ("SUBSIDIO".equalsIgnoreCase(s.getType())) {
                String subType = s.getSubsidioType();
                if (subType == null || subType.trim().isEmpty()) subType = "Otros";
                
                Map<String, Object> stats = typeStats.getOrDefault(subType, new HashMap<>());
                long count = (long) stats.getOrDefault("cantidad", 0L) + 1;
                BigDecimal amount = ((BigDecimal) stats.getOrDefault("monto", BigDecimal.ZERO)).add(s.getAmount() != null ? s.getAmount() : BigDecimal.ZERO);
                
                stats.put("tipo", subType);
                stats.put("cantidad", count);
                stats.put("monto", amount);
                typeStats.put(subType, stats);
            }
        }
        java.util.List<Map<String, Object>> estadisticasPorTipoSubsidio = new java.util.ArrayList<>(typeStats.values());

        return DashboardStatsDTO.builder()
                .totalSolicitudes(totalSolicitudes)
                .pendingSolicitudes(pendingSolicitudes)
                .inProgressSolicitudes(inProgressSolicitudes)
                .inResolutionSolicitudes(inResolutionSolicitudes)
                .completedSolicitudes(completedSolicitudes)
                .rejectedSolicitudes(rejectedSolicitudes)
                .totalSubsidiesDelivered(totalDelivered)
                .solicitudesByOrigin(solicitudesByOrigin)
                .solicitudesMensuales(solicitudesMensuales)
                .montosMensualesSubsidios(montosMensualesSubsidios)
                .solicitudesPorLocalidad(solicitudesPorLocalidad)
                .solicitudesPorBarrioSantaFe(solicitudesPorBarrioSantaFe)
                .estadisticasPorTipoSubsidio(estadisticasPorTipoSubsidio)
                .build();
    }
}
