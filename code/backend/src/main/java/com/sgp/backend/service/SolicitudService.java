package com.sgp.backend.service;

import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.entity.Person;
import com.sgp.backend.entity.Location;
import com.sgp.backend.entity.User;
import com.sgp.backend.repository.SolicitudRepository;
import com.sgp.backend.repository.PersonRepository;
import com.sgp.backend.repository.LocationRepository;
import com.sgp.backend.repository.UserRepository;
import com.sgp.backend.repository.AsignacionHistorialRepository;
import com.sgp.backend.repository.TipoResolucionRepository;
import com.sgp.backend.entity.AsignacionHistorial;
import com.sgp.backend.entity.SolicitudResolutorAssignment;
import com.sgp.backend.repository.SolicitudResolutorAssignmentRepository;
import com.sgp.backend.dto.ResolutorAssignmentDTO;
import com.sgp.backend.dto.SolicitudUpdateDTO;
import com.sgp.backend.security.SecurityUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import jakarta.persistence.criteria.Subquery;
import jakarta.persistence.criteria.Root;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class SolicitudService {

    private final SolicitudRepository solicitudRepository;
    private final PersonRepository personRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final AsignacionHistorialRepository asignacionHistorialRepository;
    private final TipoResolucionRepository tipoResolucionRepository;
    private final SolicitudResolutorAssignmentRepository assignmentRepository;
    private final com.sgp.backend.repository.SheetsConfigRepository sheetsConfigRepository;
    private final com.sgp.backend.repository.ProjectRepository projectRepository;
    
    // Servicios adicionales de la Etapa 8
    private final GoogleCalendarService googleCalendarService;
    private final EmailService emailService;
    private final SyncService syncService;
    private final ObjectMapper objectMapper;

    public org.springframework.data.domain.Page<Solicitud> getAllSolicitudes(String status, String search, String responsableId, String locationId, String origin, java.time.LocalDate dateFrom, java.time.LocalDate dateTo, org.springframework.data.domain.Pageable pageable) {
        return getAllSolicitudes(status, search, responsableId, locationId, origin, dateFrom, dateTo, null, pageable);
    }

    public org.springframework.data.domain.Page<Solicitud> getAllSolicitudes(String status, String search, String responsableId, String locationId, String origin, java.time.LocalDate dateFrom, java.time.LocalDate dateTo, String tipoPedido, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<Solicitud> spec = buildSpecification(status, search, responsableId, locationId, origin, dateFrom, dateTo, tipoPedido);
        return solicitudRepository.findAll(spec, pageable);
    }

    public org.springframework.data.domain.Page<Solicitud> getSolicitudesByConfig(Long configId, String status, String search, String responsableId, String locationId, String origin, java.time.LocalDate dateFrom, java.time.LocalDate dateTo, org.springframework.data.domain.Pageable pageable) {
        return getSolicitudesByConfig(configId, status, search, responsableId, locationId, origin, dateFrom, dateTo, null, pageable);
    }

    public org.springframework.data.domain.Page<Solicitud> getSolicitudesByConfig(Long configId, String status, String search, String responsableId, String locationId, String origin, java.time.LocalDate dateFrom, java.time.LocalDate dateTo, String tipoPedido, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<Solicitud> baseSpec = org.springframework.data.jpa.domain.Specification
                .where((root, query, cb) -> cb.equal(root.get("sheetsConfig").get("id"), configId));
        org.springframework.data.jpa.domain.Specification<Solicitud> spec = baseSpec.and(buildSpecification(status, search, responsableId, locationId, origin, dateFrom, dateTo, tipoPedido));
        return solicitudRepository.findAll(spec, pageable);
    }

    public java.util.Map<String, Object> getSolicitudStats(Long configId, String search, String responsableId, String locationId, String origin, java.time.LocalDate dateFrom, java.time.LocalDate dateTo) {
        return getSolicitudStats(configId, search, responsableId, locationId, origin, dateFrom, dateTo, null);
    }

    public java.util.Map<String, Object> getSolicitudStats(Long configId, String search, String responsableId, String locationId, String origin, java.time.LocalDate dateFrom, java.time.LocalDate dateTo, String tipoPedido) {
        org.springframework.data.jpa.domain.Specification<Solicitud> spec = org.springframework.data.jpa.domain.Specification.where(null);
        if (configId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("sheetsConfig").get("id"), configId));
        }
        spec = spec.and(buildSpecification(null, search, responsableId, locationId, origin, dateFrom, dateTo, tipoPedido));
        
        List<Solicitud> allMatching = solicitudRepository.findAll(spec);
        
        long pendiente = allMatching.stream().filter(s -> s.getStatus() != null && "pendiente".equalsIgnoreCase(s.getStatus().trim())).count();
        long enProceso = allMatching.stream().filter(s -> s.getStatus() != null && "en proceso".equalsIgnoreCase(s.getStatus().trim())).count();
        long enResolucion = allMatching.stream().filter(s -> s.getStatus() != null && "en resolucion".equalsIgnoreCase(s.getStatus().trim())).count();
        long completadas = allMatching.stream().filter(s -> s.getStatus() != null && "completadas".equalsIgnoreCase(s.getStatus().trim())).count();
        long rechazada = allMatching.stream().filter(s -> s.getStatus() != null && "rechazada".equalsIgnoreCase(s.getStatus().trim())).count();
        long consideracion = allMatching.stream().filter(s -> s.getStatus() != null && "consideracion".equalsIgnoreCase(s.getStatus().trim())).count();
        
        java.math.BigDecimal totalSubsidios = allMatching.stream()
                .filter(s -> "SUBSIDIO".equalsIgnoreCase(s.getType()) && s.getStatus() != null && "completadas".equalsIgnoreCase(s.getStatus().trim()))
                .map(Solicitud::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
                
        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("pendiente", pendiente);
        stats.put("enProceso", enProceso);
        stats.put("enResolucion", enResolucion);
        stats.put("completadas", completadas);
        stats.put("rechazada", rechazada);
        stats.put("consideracion", consideracion);
        stats.put("totalSubsidios", totalSubsidios);
        
        return stats;
    }

    private List<String> splitCsv(String raw) {
        if (raw == null || raw.isBlank()) return java.util.Collections.emptyList();
        return java.util.Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    private List<Long> splitCsvLongs(String raw) {
        List<Long> ids = new java.util.ArrayList<>();
        for (String token : splitCsv(raw)) {
            try {
                ids.add(Long.parseLong(token));
            } catch (NumberFormatException ignored) {
                // Ignorar IDs no numéricos
            }
        }
        return ids;
    }

    private org.springframework.data.jpa.domain.Specification<Solicitud> buildSpecification(String status, String search, String responsableId, String locationId, String origin, java.time.LocalDate dateFrom, java.time.LocalDate dateTo, String tipoPedido) {
        org.springframework.data.jpa.domain.Specification<Solicitud> spec = org.springframework.data.jpa.domain.Specification.where(null);

        List<String> statusList = splitCsv(status);
        if (!statusList.isEmpty()) {
            spec = spec.and((root, query, cb) -> root.get("status").in(statusList));
        }

        if (search != null && !search.isEmpty()) {
            String likePattern = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("description")), likePattern),
                    cb.like(cb.lower(root.get("person").get("name")), likePattern),
                    cb.like(cb.lower(root.get("id").as(String.class)), likePattern)));
        }

        List<Long> respIds = splitCsvLongs(responsableId);
        if (!respIds.isEmpty()) {
            boolean includeUnassigned = respIds.contains(0L);
            List<Long> assignedIds = respIds.stream().filter(id -> id != 0L).toList();
            spec = spec.and((root, query, cb) -> {
                if (includeUnassigned && !assignedIds.isEmpty()) {
                    return cb.or(cb.isNull(root.get("responsable")), root.get("responsable").get("id").in(assignedIds));
                } else if (includeUnassigned) {
                    return cb.isNull(root.get("responsable"));
                } else {
                    return root.get("responsable").get("id").in(assignedIds);
                }
            });
        }

        List<Long> locIds = splitCsvLongs(locationId);
        if (!locIds.isEmpty()) {
            // Contempla tanto la localidad directa como barrios cuyo padre sea alguna localidad seleccionada
            spec = spec.and((root, query, cb) -> {
                jakarta.persistence.criteria.Join<Object, Object> locJoin = root.join("location", jakarta.persistence.criteria.JoinType.LEFT);
                jakarta.persistence.criteria.Join<Object, Object> parentJoin = locJoin.join("parent", jakarta.persistence.criteria.JoinType.LEFT);
                return cb.or(locJoin.get("id").in(locIds), parentJoin.get("id").in(locIds));
            });
        }

        List<String> originList = splitCsv(origin);
        if (!originList.isEmpty()) {
            spec = spec.and((root, query, cb) -> root.get("origin").in(originList));
        }

        if (dateFrom != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("entryDate"), dateFrom));
        }

        if (dateTo != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("entryDate"), dateTo));
        }

        // Filtro por uno o múltiples tipos de pedido de subsidio
        List<String> tipoPedidoList = splitCsv(tipoPedido);
        if (!tipoPedidoList.isEmpty()) {
            spec = spec.and((root, query, cb) -> {
                List<jakarta.persistence.criteria.Predicate> orTipos = new java.util.ArrayList<>();
                for (String tpRaw : tipoPedidoList) {
                    final String tpLower = tpRaw.toLowerCase();
                    jakarta.persistence.criteria.Subquery<Long> sub = query.subquery(Long.class);
                    jakarta.persistence.criteria.Root<SolicitudResolutorAssignment> aRoot = sub.from(SolicitudResolutorAssignment.class);
                    sub.select(aRoot.get("solicitud").get("id"));

                    jakarta.persistence.criteria.Predicate isSubsidioAsgn = cb.like(cb.upper(aRoot.get("tipoResolucion")), "%SUBSIDIO%");
                    jakarta.persistence.criteria.Predicate matchTipo;
                    if ("personal".equals(tpLower)) {
                        matchTipo = cb.or(
                                cb.like(cb.lower(aRoot.get("detalle")), "%\"tipo de pedido\":\"personal\"%"),
                                cb.like(cb.lower(aRoot.get("detalle")), "%\"tipo de pedido\": \"personal\"%"),
                                cb.equal(cb.lower(root.get("person").get("type")), "personal")
                        );
                    } else if (tpLower.contains("especie")) {
                        matchTipo = cb.or(
                                cb.like(cb.lower(aRoot.get("detalle")), "%institucional en especie%"),
                                cb.equal(cb.upper(aRoot.get("tipoResolucion")), "SUBSIDIO EN ESPECIE")
                        );
                    } else {
                        matchTipo = cb.or(
                                cb.like(cb.lower(aRoot.get("detalle")), "%institucional en dinero%"),
                                cb.and(
                                        cb.notEqual(cb.upper(aRoot.get("tipoResolucion")), "SUBSIDIO EN ESPECIE"),
                                        cb.notEqual(cb.lower(cb.coalesce(root.get("person").get("type"), "")), "personal"),
                                        cb.notLike(cb.lower(cb.coalesce(aRoot.get("detalle"), "")), "%\"tipo de pedido\":\"personal\"%"),
                                        cb.notLike(cb.lower(cb.coalesce(aRoot.get("detalle"), "")), "%\"tipo de pedido\": \"personal\"%"),
                                        cb.notLike(cb.lower(cb.coalesce(aRoot.get("detalle"), "")), "%institucional en especie%")
                                )
                        );
                    }
                    sub.where(cb.and(isSubsidioAsgn, matchTipo));
                    orTipos.add(cb.in(root.get("id")).value(sub));
                }
                return cb.or(orTipos.toArray(new jakarta.persistence.criteria.Predicate[0]));
            });
        }

        // Aplicar filtrado basado en roles
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String email = auth.getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                String userRole = com.sgp.backend.security.SecurityUtils.getActiveRole(user);
                // Si es ADMIN, DISTRIBUIDOR, OPERADOR o AUDITOR, tiene acceso completo a todas las solicitudes sin filtrado
                if (userRole != null && !userRole.contains("ADMIN") && !userRole.contains("DISTRIBUIDOR") && !userRole.contains("OPERADOR") && !userRole.contains("AUDITOR")) {
                    spec = spec.and((root, query, cb) -> {
                        query.distinct(true);
                        jakarta.persistence.criteria.Join<Solicitud, SolicitudResolutorAssignment> assignments = root.join("resolutorAssignments", jakarta.persistence.criteria.JoinType.LEFT);
                        
                        List<jakarta.persistence.criteria.Predicate> orPredicates = new java.util.ArrayList<>();
                        
                        if (userRole.contains("OPERADOR")) {
                            orPredicates.add(cb.equal(root.get("createdBy"), user));
                        }
                        if (userRole.contains("RESPONSABLE")) {
                            jakarta.persistence.criteria.Predicate isAssignedToMe = cb.equal(root.get("responsable"), user);
                            final String zoneStr = user.getZone();
                            if (zoneStr != null && !zoneStr.trim().isEmpty()) {
                                String[] zones = zoneStr.split(",");
                                List<jakarta.persistence.criteria.Predicate> zonePreds = new java.util.ArrayList<>();
                                for (String z : zones) {
                                    String trimmedZ = z.trim().toLowerCase();
                                    if (!trimmedZ.isEmpty()) {
                                        zonePreds.add(cb.equal(cb.lower(cb.trim(root.get("zone"))), trimmedZ));
                                    }
                                }
                                if (!zonePreds.isEmpty()) {
                                    jakarta.persistence.criteria.Predicate isUnassignedInMyZone = cb.and(
                                        cb.isNull(root.get("responsable")),
                                        cb.or(zonePreds.toArray(new jakarta.persistence.criteria.Predicate[0]))
                                    );
                                    orPredicates.add(cb.or(isAssignedToMe, isUnassignedInMyZone));
                                } else {
                                    orPredicates.add(isAssignedToMe);
                                }
                            } else {
                                orPredicates.add(isAssignedToMe);
                            }
                        }
                        if (userRole.contains("RESOLUTOR")) {
                            String activeTipoResolucion = SecurityUtils.getActiveTipoResolucion(user);
                            List<String> tiposAsignados = activeTipoResolucion != null
                                    ? java.util.List.of(activeTipoResolucion)
                                    : user.getTiposResolucion().stream()
                                            .map(com.sgp.backend.entity.TipoResolucion::getTipo)
                                            .filter(t -> t != null && !t.trim().isEmpty())
                                            .map(t -> t.trim().toUpperCase())
                                            .collect(java.util.stream.Collectors.toList());
                            
                            if (tiposAsignados.isEmpty()) {
                                orPredicates.add(cb.disjunction());
                            } else {
                                // Asignaciones ya tomadas por este resolutor
                                jakarta.persistence.criteria.Predicate isAssignedToMe = cb.and(
                                    cb.equal(assignments.get("resolutor").get("id"), user.getId()),
                                    cb.upper(assignments.get("tipoResolucion")).in(tiposAsignados)
                                );

                                // Asignaciones en Pool compartido (sin resolutor asignado) de los tipos habilitados para este resolutor
                                jakarta.persistence.criteria.Predicate isInPoolForMyTypes = cb.and(
                                    cb.isNull(assignments.get("resolutor")),
                                    cb.upper(assignments.get("tipoResolucion")).in(tiposAsignados)
                                );
                                
                                jakarta.persistence.criteria.Predicate isLegacyResolutor = cb.and(
                                    cb.equal(root.get("resolutor").get("id"), user.getId()),
                                    cb.notEqual(root.get("status"), "completadas"),
                                    cb.upper(root.get("suggestedResolutionType")).in(tiposAsignados)
                                );
                                
                                orPredicates.add(cb.or(isLegacyResolutor, isAssignedToMe, isInPoolForMyTypes));
                            }
                        }
                        
                        if (orPredicates.isEmpty()) {
                            return cb.disjunction();
                        }
                        
                        return cb.or(orPredicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
                    });
                }
            }
        }

        return spec;
    }

    @org.springframework.transaction.annotation.Transactional
    public void bulkAssign(List<Long> ids, Long responsableId) {
        User responsable = null;
        if (responsableId != null && responsableId > 0) {
            responsable = userRepository.findById(responsableId)
                    .orElseThrow(() -> new RuntimeException("Responsable no encontrado"));
        }
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User asignador = null;
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            asignador = userRepository.findByEmail(auth.getName()).orElse(null);
        }

        for (Long id : ids) {
            Solicitud solicitud = solicitudRepository.findById(id).orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));
            solicitud.setResponsable(responsable);
            updateSolicitudStatus(solicitud); // Recalcular estado automático tras la asignación
            solicitudRepository.save(solicitud);

            AsignacionHistorial historial = new AsignacionHistorial();
            historial.setSolicitud(solicitud);
            historial.setResponsable(responsable);
            historial.setActionDate(java.time.LocalDateTime.now());
            historial.setAssignedByUsername(asignador != null ? asignador.getEmail() : "Sistema");
            historial.setActionType(responsable == null ? "UNASSIGNED" : "ASSIGNED");
            asignacionHistorialRepository.save(historial);
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public void bulkDelete(List<Long> ids) {
        for (Long id : ids) {
            solicitudRepository.deleteById(id);
        }
    }

    /**
     * Valida que el DNI del solicitante esté presente cuando corresponde a un subsidio personal/en dinero.
     * No exige DNI si el solicitante es Institucional o si las asignaciones de subsidio son exclusivamente en especie.
     */
    private void validateSubsidioDni(boolean isTypeSubsidio, String personType, String personDni, List<String> assignmentTypes) {
        List<String> subsidioAssignments = assignmentTypes == null ? java.util.Collections.emptyList()
                : assignmentTypes.stream()
                        .filter(t -> t != null && t.toUpperCase().contains("SUBSIDIO"))
                        .toList();
        boolean isSubsidio = isTypeSubsidio || !subsidioAssignments.isEmpty();
        if (!isSubsidio) {
            return;
        }
        boolean isInstitucional = personType != null && "Institucional".equalsIgnoreCase(personType.trim());
        boolean onlySubsidioEnEspecie = !isTypeSubsidio
                && !subsidioAssignments.isEmpty()
                && subsidioAssignments.stream().allMatch(t -> "SUBSIDIO EN ESPECIE".equalsIgnoreCase(t.trim()));
        if (isInstitucional || onlySubsidioEnEspecie) {
            return;
        }
        if (personDni == null || personDni.trim().isEmpty()) {
            throw new IllegalArgumentException("El DNI del solicitante/beneficiario es obligatorio para tramitar un subsidio.");
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public Solicitud createSolicitud(Solicitud solicitud) {
        // Validación obligatoria de DNI para subsidios (excepto Institucional o exclusivamente en especie)
        boolean isTypeSubsidio = solicitud.getType() != null && solicitud.getType().toUpperCase().contains("SUBSIDIO");
        List<String> assignmentTypes = solicitud.getResolutorAssignments() == null ? java.util.Collections.emptyList()
                : solicitud.getResolutorAssignments().stream().map(SolicitudResolutorAssignment::getTipoResolucion).toList();
        validateSubsidioDni(
                isTypeSubsidio,
                solicitud.getPerson() != null ? solicitud.getPerson().getType() : null,
                solicitud.getPerson() != null ? solicitud.getPerson().getDni() : null,
                assignmentTypes
        );

        // 1. Procesar Persona
        if (solicitud.getPerson() != null) {
            Person p = solicitud.getPerson();
            if (p.getId() == null) {
                final Person personToSave = p;
                p = personRepository.findByName(p.getName())
                        .orElseGet(() -> {
                            if (personToSave.getType() == null) {
                                personToSave.setType("INDIVIDUAL");
                            }
                            return personRepository.save(personToSave);
                        });
            }
            if (solicitud.getPerson().getDni() != null && !solicitud.getPerson().getDni().trim().isEmpty()) {
                p.setDni(solicitud.getPerson().getDni().trim());
                p = personRepository.save(p);
            }
            if (solicitud.getPerson().getSocialMedia() != null && !solicitud.getPerson().getSocialMedia().trim().isEmpty()) {
                p.setSocialMedia(solicitud.getPerson().getSocialMedia().trim());
                p = personRepository.save(p);
            }
            solicitud.setPerson(p);
        }

        // 2. Procesar Ubicación (usando locationName y barrio del payload del frontend)
        if (solicitud.getLocationName() != null && !solicitud.getLocationName().trim().isEmpty()) {
            final String cityName = solicitud.getLocationName().trim();
            final String inputBarrio = (solicitud.getBarrio() != null && !solicitud.getBarrio().trim().isEmpty()) ? solicitud.getBarrio().trim() : null;

            // Buscar o crear Ciudad
            Location cityLocation = locationRepository.findFirstByNameAndType(cityName, "CITY")
                    .orElseGet(() -> locationRepository.findFirstByNameAndType(cityName, "LOCALITY")
                    .orElseGet(() -> locationRepository.findFirstByName(cityName)
                    .orElseGet(() -> {
                        Location newCity = new Location();
                        newCity.setName(cityName);
                        newCity.setType("CITY");
                        newCity.setShowInUi(true);
                        return locationRepository.save(newCity);
                    })));

            if (inputBarrio != null) {
                // Buscar o crear Barrio
                Location finalCityLocation = cityLocation;
                Location neighborhood = locationRepository.findFirstByNameAndParentId(inputBarrio, cityLocation.getId())
                        .orElseGet(() -> {
                            Location newNeighborhood = new Location();
                            newNeighborhood.setName(inputBarrio);
                            newNeighborhood.setType("NEIGHBORHOOD");
                            newNeighborhood.setParent(finalCityLocation);
                            return locationRepository.save(newNeighborhood);
                        });
                solicitud.setLocation(neighborhood);
            } else {
                solicitud.setLocation(cityLocation);
            }
        } else if (solicitud.getLocation() != null) {
            // Alternativa para enfoques antiguos
            Location l = solicitud.getLocation();
            if (l.getId() == null && l.getName() != null) {
                final Location locationToSave = l;
                l = locationRepository.findFirstByName(l.getName())
                        .orElseGet(() -> {
                            locationToSave.setType("CITY"); // Predeterminado para manual
                            return locationRepository.save(locationToSave);
                        });
            }
            solicitud.setLocation(l);
        }

        // Establecer seguimiento de creación
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = null;
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            currentUser = userRepository.findByEmail(auth.getName()).orElse(null);
            if (currentUser != null) {
                solicitud.setCreatedBy(currentUser);
                String activeRole = SecurityUtils.getActiveRole(currentUser);
                // Punto 9: Si el creador actúa como Responsable y no se especificó otro responsable, auto-asignarlo
                if (activeRole != null && activeRole.equalsIgnoreCase("RESPONSABLE")) {
                    if (solicitud.getResponsable() == null) {
                        solicitud.setResponsable(currentUser);
                    }
                }
            }
        }

        // 3. Valores predeterminados
        if (solicitud.getEntryDate() == null) {
            solicitud.setEntryDate(java.time.LocalDate.now());
        }

        Solicitud saved = solicitudRepository.save(solicitud);

        // Procesar asignaciones si están presentes
        boolean isCreator = true;
        String activeRoleCreator = SecurityUtils.getActiveRole(currentUser);
        boolean isOperadorOrAdmin = activeRoleCreator != null &&
                (activeRoleCreator.equalsIgnoreCase("OPERADOR") ||
                 activeRoleCreator.equalsIgnoreCase("ADMINISTRADOR") ||
                 activeRoleCreator.equalsIgnoreCase("ADMIN"));
        processAssignments(saved, solicitud.getAssignments(), currentUser, isCreator, false, isOperadorOrAdmin);

        // Actualizar estado automático según reglas de negocio (Punto 9)
        updateSolicitudStatus(saved);
        saved = solicitudRepository.save(saved);

        // Registrar la creación en el historial
        if (saved.getCreatedBy() != null) {
            logAssignmentChange(saved, saved.getCreatedBy(), "CREATED");
        }

        if (saved.getResponsable() != null) {
            logAssignmentChange(saved, saved.getResponsable(), "ASSIGNED");
        }

        return saved;
    }

    @org.springframework.transaction.annotation.Transactional
    public Solicitud updateSolicitud(Long id, SolicitudUpdateDTO dto) {
        Solicitud existing = solicitudRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitud not found"));

        User oldResponsable = existing.getResponsable();
        String oldStatus = existing.getStatus();

        // Determinar permisos sobre la carga inicial (Punto 6)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = null;
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            currentUser = userRepository.findByEmail(auth.getName()).orElse(null);
        }

        String activeRoleUpdater = SecurityUtils.getActiveRole(currentUser);
        boolean isOperadorOrAdmin = activeRoleUpdater != null &&
                (activeRoleUpdater.equalsIgnoreCase("OPERADOR") ||
                 activeRoleUpdater.equalsIgnoreCase("ADMINISTRADOR") ||
                 activeRoleUpdater.equalsIgnoreCase("ADMIN"));

        boolean isCreator = currentUser != null && existing.getCreatedBy() != null &&
                existing.getCreatedBy().getId().equals(currentUser.getId());

        boolean isDistribuidor = currentUser != null && currentUser.getRole() != null &&
                currentUser.getRole().toUpperCase().contains("DISTRIBUIDOR");

        boolean isAssignedResponsable = currentUser != null && existing.getResponsable() != null &&
                existing.getResponsable().getId().equals(currentUser.getId());

        boolean isResolutorSubsidio = currentUser != null && "RESOLUTOR".equalsIgnoreCase(activeRoleUpdater)
                && currentUser.getTiposResolucion() != null
                && currentUser.getTiposResolucion().stream()
                        .anyMatch(tr -> tr.getTipo() != null && tr.getTipo().toUpperCase().contains("SUBSIDIO"));

        boolean canEditStatus = isOperadorOrAdmin || isDistribuidor || isAssignedResponsable
                || (isResolutorSubsidio && dto.getStatus() != null && "consideracion".equalsIgnoreCase(dto.getStatus().trim()));

        boolean canEditInitialData = isOperadorOrAdmin || isCreator;

        // Validación obligatoria de DNI para subsidios (excepto Institucional o exclusivamente en especie)
        boolean isTypeSubsidio = (dto.getType() != null && dto.getType().toUpperCase().contains("SUBSIDIO")) ||
                (existing.getType() != null && existing.getType().toUpperCase().contains("SUBSIDIO"));
        List<String> dtoAssignmentTypes = dto.getAssignments() == null ? java.util.Collections.emptyList()
                : dto.getAssignments().stream().map(ResolutorAssignmentDTO::getTipoResolucion).toList();
        String effectivePersonType = dto.getPerson() != null && dto.getPerson().getType() != null
                ? dto.getPerson().getType()
                : (existing.getPerson() != null ? existing.getPerson().getType() : null);
        String effectivePersonDni = dto.getPerson() != null
                ? dto.getPerson().getDni()
                : (existing.getPerson() != null ? existing.getPerson().getDni() : null);
        validateSubsidioDni(isTypeSubsidio, effectivePersonType, effectivePersonDni, dtoAssignmentTypes);

        // 1. Actualizar beneficiario (Solo si tiene permiso sobre carga original - Punto 6)
        if (canEditInitialData && dto.getPerson() != null) {
            Person p;
            if (dto.getPerson().getId() != null) {
                // Persona existente: actualizar sus campos
                p = personRepository.findById(dto.getPerson().getId()).orElse(new Person());
                p.setName(dto.getPerson().getName());
                p.setPhone(dto.getPerson().getPhone());
                p.setType(dto.getPerson().getType() != null ? dto.getPerson().getType() : p.getType());
                p.setSubType(dto.getPerson().getSubType());
                if (dto.getPerson().getDni() != null) {
                    p.setDni(dto.getPerson().getDni().trim());
                }
                if (dto.getPerson().getSocialMedia() != null) {
                    p.setSocialMedia(dto.getPerson().getSocialMedia().trim());
                }
                p = personRepository.save(p);
            } else {
                // Persona nueva: buscar por nombre o crear
                final String nombre = dto.getPerson().getName();
                final String telefono = dto.getPerson().getPhone();
                p = personRepository.findByName(nombre).orElseGet(() -> {
                    Person nueva = new Person();
                    nueva.setName(nombre);
                    nueva.setPhone(telefono);
                    nueva.setType(dto.getPerson().getType() != null ? dto.getPerson().getType() : "INDIVIDUAL");
                    nueva.setSubType(dto.getPerson().getSubType());
                    if (dto.getPerson().getDni() != null) {
                        nueva.setDni(dto.getPerson().getDni().trim());
                    }
                    if (dto.getPerson().getSocialMedia() != null) {
                        nueva.setSocialMedia(dto.getPerson().getSocialMedia().trim());
                    }
                    return personRepository.save(nueva);
                });
            }
            existing.setPerson(p);
        }

        // 2. Actualizar ubicación usando los campos planos del DTO (Solo si tiene permiso sobre carga original - Punto 6)
        if (canEditInitialData && dto.getLocationName() != null && !dto.getLocationName().trim().isEmpty()) {
            final String cityName = dto.getLocationName().trim();
            final String inputBarrio = (dto.getBarrio() != null && !dto.getBarrio().trim().isEmpty())
                    ? dto.getBarrio().trim() : null;

            Location cityLocation = locationRepository.findFirstByNameAndType(cityName, "CITY")
                    .orElseGet(() -> locationRepository.findFirstByNameAndType(cityName, "LOCALITY")
                    .orElseGet(() -> locationRepository.findFirstByName(cityName)
                    .orElseGet(() -> {
                        Location newCity = new Location();
                        newCity.setName(cityName);
                        newCity.setType("CITY");
                        newCity.setShowInUi(true);
                        return locationRepository.save(newCity);
                    })));

            if (inputBarrio != null) {
                Location finalCityLocation = cityLocation;
                Location neighborhood = locationRepository.findFirstByNameAndParentId(inputBarrio, cityLocation.getId())
                        .orElseGet(() -> {
                            Location nuevo = new Location();
                            nuevo.setName(inputBarrio);
                            nuevo.setType("NEIGHBORHOOD");
                            nuevo.setParent(finalCityLocation);
                            return locationRepository.save(nuevo);
                        });
                existing.setLocation(neighborhood);
            } else {
                existing.setLocation(cityLocation);
            }
        }

        // 3. Actualizar campos primitivos (Solo si tiene permiso sobre carga original - Punto 6)
        if (canEditInitialData) {
            if (dto.getType() != null) {
                existing.setType(dto.getType());
            }
            existing.setDescription(dto.getDescription());
            existing.setOrigin(dto.getOrigin());
            existing.setTema(dto.getTema());
            if (dto.getEntryDate() != null) {
                existing.setEntryDate(dto.getEntryDate());
            }
        }

        // Solo los usuarios autorizados (Admin, Operador, Distribuidor o el Responsable titular asignado)
        // pueden modificar manualmente el estado de la solicitud.
        if (canEditStatus && dto.getStatus() != null && !dto.getStatus().trim().isEmpty()) {
            existing.setStatus(dto.getStatus());
        }
        existing.setZone(dto.getZone());
        if (dto.getDireccion() != null) {
            existing.setDireccion(dto.getDireccion().trim().isEmpty() ? null : dto.getDireccion().trim());
        }
        existing.setFechaEvento(dto.getFechaEvento());
        existing.setContactDate(dto.getContactDate());
        existing.setResolutionDate(dto.getResolutionDate());
        existing.setObservation(dto.getObservation());
        existing.setResolution(dto.getResolution());
        existing.setDetail(dto.getDetail());
        existing.setFirstContactControl(dto.getFirstContactControl());

        // 4. Campos específicos de Subsidio (Punto 8: incluye al responsable asignado para casos derivados)
        boolean canEditSubsidioData = isCreator || isAssignedResponsable || isOperadorOrAdmin;
        if (canEditSubsidioData) {
            if (dto.getAmount() != null) existing.setAmount(dto.getAmount());
            if (dto.getGrantDate() != null) existing.setGrantDate(dto.getGrantDate());
            if (dto.getSubsidioType() != null) existing.setSubsidioType(dto.getSubsidioType());
        }

        // 5. Flujo de sugerencia de resolución
        String newSuggestedType = dto.getSuggestedResolutionType();
        if (newSuggestedType != null && !newSuggestedType.trim().isEmpty()
                && !newSuggestedType.equals(existing.getSuggestedResolutionType())) {
            existing.setSuggestedResolutionType(newSuggestedType);
            existing.setResolutionApproved(false);
            tipoResolucionRepository.findByTipoIgnoreCase(newSuggestedType)
                    .filter(c -> c.getResolutor() != null)
                    .ifPresent(c -> existing.setResolutor(c.getResolutor()));
        } else if (dto.getResolutionApproved() != null) {
            existing.setResolutionApproved(dto.getResolutionApproved());
        }

        // 6. Asignación de responsable
        // Solo se actualiza si el DTO trae un responsableId explícito.
        // Si viene null, se CONSERVA el responsable actual (no se borra accidentalmente).
        if (dto.getResponsableId() != null) {
            if (dto.getResponsableId() <= 0) {
                // Desasignación explícita (responsableId = 0)
                existing.setResponsable(null);
            } else {
                userRepository.findById(dto.getResponsableId())
                        .ifPresent(existing::setResponsable);
            }
        }

        Solicitud saved = solicitudRepository.save(existing);

        // 7. Sincronizar asignaciones de resolutores (Punto 8)
        processAssignments(saved, dto.getAssignments(), currentUser, isCreator, isAssignedResponsable, isOperadorOrAdmin);

        // 8. Recalcular estado automático (solo si no se cambió de forma manual autorizada en el DTO)
        // Regla inviolable: Si la solicitud tiene responsable asignado, bajo ningún concepto puede quedar en "pendiente".
        boolean hasResponsable = saved.getResponsable() != null;
        boolean statusChangedManually = canEditStatus && dto.getStatus() != null && !dto.getStatus().equalsIgnoreCase(oldStatus);
        
        if (hasResponsable && "pendiente".equalsIgnoreCase(saved.getStatus())) {
            statusChangedManually = false;
        }
        // Si pasó a "en proceso" por asignar responsable pero tiene asignaciones de resolutor pendientes, recalcular a "en resolucion"
        if ("en proceso".equalsIgnoreCase(saved.getStatus()) && saved.getResolutorAssignments() != null && !saved.getResolutorAssignments().isEmpty()) {
            statusChangedManually = false;
        }

        // Si la solicitud ya estaba en "completadas" (Resueltas) y el usuario no pidió cambiar el estado manualmente
        // (ej: un Operador cargando el Monto real post-aprobación), preservar el estado "completadas".
        boolean keepCompleted = "completadas".equalsIgnoreCase(oldStatus)
                && (dto.getStatus() == null || "completadas".equalsIgnoreCase(dto.getStatus().trim()));

        if (!statusChangedManually && !keepCompleted) {
            updateSolicitudStatus(saved);
        }
        solicitudRepository.save(saved);

        // 9. Auditoría de cambio de responsable
        User newResponsable = saved.getResponsable();
        if (oldResponsable == null && newResponsable != null) {
            logAssignmentChange(saved, newResponsable, "ASSIGNED");
        } else if (oldResponsable != null && newResponsable == null) {
            logAssignmentChange(saved, oldResponsable, "UNASSIGNED");
        } else if (oldResponsable != null && newResponsable != null
                && !oldResponsable.getId().equals(newResponsable.getId())) {
            logAssignmentChange(saved, newResponsable, "REASSIGNED");
        }

        return saved;
    }

    private void logAssignmentChange(Solicitud solicitud, User responsable, String actionType) {
        String username = "Sistema";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            username = auth.getName();
            User user = userRepository.findByEmail(username).orElse(null);
            if (user != null) {
                username = user.getEmail(); // O user.getName() si existe. El email es más seguro.
            }
        }

        String safeActionType = actionType != null ? actionType : "UPDATED";
        if (safeActionType.length() > 250) {
            safeActionType = safeActionType.substring(0, 247) + "...";
        }

        AsignacionHistorial history = AsignacionHistorial.builder()
                .solicitud(solicitud)
                .responsable(responsable) // Incluso para UNASSIGNED, registra quién fue desasignado
                .actionType(safeActionType)
                .assignedByUsername(username)
                .actionDate(LocalDateTime.now())
                .build();
        
        asignacionHistorialRepository.save(history);
    }

    private void processAssignments(Solicitud solicitud, List<ResolutorAssignmentDTO> dtos, User currentUser, boolean isCreator, boolean isAssignedResponsable, boolean isOperadorOrAdmin) {
        if (dtos == null) return;
        
        List<SolicitudResolutorAssignment> currentAssignments = solicitud.getResolutorAssignments();
        if (currentAssignments == null) {
            currentAssignments = new java.util.ArrayList<>();
            solicitud.setResolutorAssignments(currentAssignments);
        }

        // 1. Eliminar asignaciones que ya no están presentes en el listado recibido del cliente
        currentAssignments.removeIf(existingAssignment -> {
            boolean isSubsidio = existingAssignment.getTipoResolucion() != null &&
                    existingAssignment.getTipoResolucion().toUpperCase().contains("SUBSIDIO");
            if (isSubsidio) {
                boolean isAssignedResolutor = currentUser != null && existingAssignment.getResolutor() != null &&
                        existingAssignment.getResolutor().getId().equals(currentUser.getId());
                boolean isPoolResolutorOfType = currentUser != null && existingAssignment.getResolutor() == null &&
                        tieneTipoResolucion(currentUser, existingAssignment.getTipoResolucion());
                boolean canDeleteSubsidio = isCreator || isAssignedResponsable || isAssignedResolutor || isPoolResolutorOfType || isOperadorOrAdmin;
                if (!canDeleteSubsidio) {
                    return false; // Proteger asignación de subsidio si no tiene permisos (Punto 8)
                }
            }
            return dtos.stream().noneMatch(dto -> {
                if (dto.getTipoResolucion() == null || existingAssignment.getTipoResolucion() == null) return false;
                if (dto.getId() != null && existingAssignment.getId() != null) {
                    return dto.getId().equals(existingAssignment.getId());
                }
                boolean sameType = dto.getTipoResolucion().equalsIgnoreCase(existingAssignment.getTipoResolucion());
                if (!sameType) return false;
                // Si ambos traen resolutor específico, comparar email; si alguno es pool (null/vacío), emparejar por tipo
                boolean dtoHasEmail = dto.getResolutorEmail() != null && !dto.getResolutorEmail().trim().isEmpty();
                if (dtoHasEmail && existingAssignment.getResolutor() != null) {
                    return dto.getResolutorEmail().trim().equalsIgnoreCase(existingAssignment.getResolutor().getEmail());
                }
                return true;
            });
        });
        
        // 2. Actualizar las asignaciones existentes o agregar las nuevas sin reiniciar la colección
        for (ResolutorAssignmentDTO dto : dtos) {
            if (dto.getTipoResolucion() == null || dto.getTipoResolucion().trim().isEmpty()) continue;

            String emailLimpio = (dto.getResolutorEmail() != null && !dto.getResolutorEmail().trim().isEmpty())
                    ? dto.getResolutorEmail().trim()
                    : null;
            User resolutor = emailLimpio != null ? userRepository.findByEmail(emailLimpio).orElse(null) : null;

            SolicitudResolutorAssignment existing = null;
            if (dto.getId() != null) {
                existing = currentAssignments.stream()
                        .filter(a -> dto.getId().equals(a.getId()))
                        .findFirst()
                        .orElse(null);
            }
            if (existing == null) {
                final User finalRes = resolutor;
                existing = currentAssignments.stream()
                        .filter(a -> a.getTipoResolucion() != null &&
                                a.getTipoResolucion().equalsIgnoreCase(dto.getTipoResolucion()) &&
                                (finalRes == null || a.getResolutor() == null || a.getResolutor().getId().equals(finalRes.getId())))
                        .findFirst()
                        .orElse(null);
            }

            boolean isSubsidio = dto.getTipoResolucion().toUpperCase().contains("SUBSIDIO");
            User effectiveResolutor = (existing != null && existing.getResolutor() != null) ? existing.getResolutor() : resolutor;
            boolean isAssignedResolutor = currentUser != null && effectiveResolutor != null && effectiveResolutor.getId().equals(currentUser.getId());
            boolean isPoolResolutorOfType = currentUser != null && effectiveResolutor == null && tieneTipoResolucion(currentUser, dto.getTipoResolucion());
            boolean canEditThisAssignment = !isSubsidio || isCreator || isAssignedResponsable || isAssignedResolutor || isPoolResolutorOfType || isOperadorOrAdmin;

            if (existing != null) {
                // Actualizar el detalle de la asignación existente solo si tiene permiso (Punto 8)
                if (canEditThisAssignment) {
                    existing.setDetalle(dto.getDetalle());
                    existing.setTipoResolucion(dto.getTipoResolucion());
                    // Preservar el resolutor si ya tomó el caso; solo asignar si aún estaba en pool y vino explícito
                    if (existing.getResolutor() == null && resolutor != null) {
                        existing.setResolutor(resolutor);
                    }
                }
            } else {
                // Solo quien puede crear/proponer subsidio puede agregar nueva asignación de subsidio
                if (canEditThisAssignment) {
                    SolicitudResolutorAssignment assignment = SolicitudResolutorAssignment.builder()
                            .solicitud(solicitud)
                            .resolutor(resolutor) // Puede ser null (Pool compartido del tipo de resolución)
                            .tipoResolucion(dto.getTipoResolucion())
                            .detalle(dto.getDetalle())
                            .build();
                    currentAssignments.add(assignment);
                }
            }

            if (dto.getTipoResolucion() != null && dto.getTipoResolucion().equalsIgnoreCase("AGENDA")) {
                solicitud.setType("AGENDA");
            }

            // Requisito R1: Procesar la asignación de tipo SUBSIDIO y extraer su monto desde el JSON de detalle
            if (dto.getTipoResolucion() != null && dto.getTipoResolucion().toUpperCase().contains("SUBSIDIO")) {
                solicitud.setType("SUBSIDIO");
                if (dto.getDetalle() != null && !dto.getDetalle().trim().isEmpty()) {
                    try {
                        JsonNode rootNode = objectMapper.readTree(dto.getDetalle());
                        JsonNode montoNode = null;
                        // En Subsidios en Especie se prioriza "Monto real" si ya fue cargado; si no, "Monto solicitado"
                        if (rootNode.has("Monto real") && !rootNode.get("Monto real").isNull() && !rootNode.get("Monto real").asText("").trim().isEmpty()) {
                            montoNode = rootNode.get("Monto real");
                        } else if (rootNode.has("Monto solicitado") && !rootNode.get("Monto solicitado").isNull() && !rootNode.get("Monto solicitado").asText("").trim().isEmpty()) {
                            montoNode = rootNode.get("Monto solicitado");
                        } else if (rootNode.has("Monto")) {
                            montoNode = rootNode.get("Monto");
                        } else if (rootNode.has("monto")) {
                            montoNode = rootNode.get("monto");
                        } else if (rootNode.has("Monto en dinero")) {
                            montoNode = rootNode.get("Monto en dinero");
                        }

                        if (montoNode != null && !montoNode.isNull()) {
                            BigDecimal monto = null;
                            if (montoNode.isNumber()) {
                                monto = montoNode.decimalValue();
                            } else {
                                monto = parseAmountString(montoNode.asText());
                            }
                            if (monto != null) {
                                solicitud.setAmount(monto);
                            }
                        }

                        // Registrar localidad de Subsidio en el catálogo maestro para futuras sugerencias en la UI
                        if (rootNode.has("Localidad") && !rootNode.get("Localidad").isNull()) {
                            String locNombre = rootNode.get("Localidad").asText();
                            if (locNombre != null && !locNombre.trim().isEmpty()) {
                                final String nombreLimpio = locNombre.trim();
                                locationRepository.findFirstByName(nombreLimpio).orElseGet(() -> {
                                    Location nuevaLoc = new Location();
                                    nuevaLoc.setName(nombreLimpio);
                                    nuevaLoc.setType("CITY");
                                    nuevaLoc.setShowInUi(true);
                                    return locationRepository.save(nuevaLoc);
                                });
                            }
                        }
                    } catch (Exception e) {
                        // Ignorar errores de deserialización JSON de forma segura
                    }
                }
            }
        }
        solicitudRepository.save(solicitud);
    }

    /**
     * Convierte una cadena de texto que representa un monto numérico a BigDecimal de forma segura.
     * Soporta números planos ("75000", "75000.50"), formato español ("75.000,00"),
     * puntos de miles ("75.000") y símbolos de moneda ("$ 75.000,00").
     */
    private BigDecimal parseAmountString(String raw) {
        if (raw == null) {
            return null;
        }
        String txt = raw.trim();
        if (txt.isEmpty()) {
            return null;
        }

        // Eliminar símbolos de moneda y caracteres no numéricos excepto '.', ',' y '-'
        txt = txt.replaceAll("[^0-9.,-]", "").trim();
        if (txt.isEmpty()) {
            return null;
        }

        try {
            if (txt.contains(",")) {
                if (txt.contains(".")) {
                    int lastDot = txt.lastIndexOf('.');
                    int lastComma = txt.lastIndexOf(',');
                    if (lastDot < lastComma) {
                        // Formato español: "75.000,00" -> quitar puntos de miles y reemplazar coma decimal por punto
                        txt = txt.replace(".", "").replace(",", ".");
                    } else {
                        // Formato anglosajón: "75,000.00" -> quitar comas de miles
                        txt = txt.replace(",", "");
                    }
                } else {
                    // Solo contiene comas: "75000,50" -> reemplazar coma por punto decimal
                    txt = txt.replace(",", ".");
                }
            } else if (txt.contains(".")) {
                // Solo contiene puntos, sin comas (ej. "75.000" o "75000.50")
                int countDots = txt.length() - txt.replace(".", "").length();
                if (countDots > 1) {
                    // Múltiples puntos de miles: "1.234.567" -> eliminar todos los puntos
                    txt = txt.replace(".", "");
                } else {
                    // Un solo punto: evaluar si es separador de miles o decimal
                    String[] parts = txt.split("\\.");
                    if (parts.length == 2) {
                        String left = parts[0];
                        String right = parts[1];
                        if (right.length() == 3 && left.length() >= 1 && left.length() <= 3) {
                            // Punto de miles: "75.000" -> "75000"
                            txt = left + right;
                        }
                    }
                }
            }
            return new BigDecimal(txt);
        } catch (Exception e) {
            return null;
        }
    }

    public Solicitud updateStatus(Long id, String status) {
        Solicitud solicitud = solicitudRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitud not found"));
        solicitud.setStatus(status);
        return solicitudRepository.save(solicitud);
    }

    public Solicitud getSolicitudById(Long id) {
        return solicitudRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitud not found"));
    }

    public void deleteSolicitud(Long id) {
        if (!solicitudRepository.existsById(id)) {
            throw new RuntimeException("Solicitud not found");
        }
        solicitudRepository.deleteById(id);
    }

    /**
     * Verifica si el usuario posee habilitado el tipo de resolución indicado (comparación insensible a mayúsculas).
     */
    private boolean tieneTipoResolucion(User user, String tipoResolucion) {
        if (user == null || tipoResolucion == null || tipoResolucion.trim().isEmpty() || user.getTiposResolucion() == null) {
            return false;
        }
        String target = tipoResolucion.trim();
        return user.getTiposResolucion().stream()
                .anyMatch(tr -> tr.getTipo() != null && tr.getTipo().trim().equalsIgnoreCase(target));
    }

    /**
     * Permite a un usuario con rol RESOLUTOR (habilitado en ese tipo de resolución) o ADMINISTRADOR
     * tomar una asignación de resolución que se encuentre en el pool compartido (sin resolutor asignado).
     * Controla concurrencia con HTTP 409 si otro resolutor ya la tomó y registra el movimiento en auditoría.
     */
    @org.springframework.transaction.annotation.Transactional
    public Solicitud tomarAsignacionResolutor(Long solicitudId, Long assignmentId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Usuario no autenticado");
        }

        User currentUser = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        String activeRole = com.sgp.backend.security.SecurityUtils.getActiveRole(currentUser);
        boolean isAdmin = activeRole != null && activeRole.contains("ADMIN");
        boolean isResolutor = activeRole != null && activeRole.contains("RESOLUTOR");
        if (!isAdmin && !isResolutor) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "No tienes permisos para tomar esta resolución");
        }

        Solicitud solicitud = solicitudRepository.findById(solicitudId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Solicitud no encontrada"));

        SolicitudResolutorAssignment assignment = solicitud.getResolutorAssignments().stream()
                .filter(a -> assignmentId.equals(a.getId()))
                .findFirst()
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Asignación de resolución no encontrada"));

        if (Boolean.TRUE.equals(assignment.getApproved())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT, "Esta resolución ya fue aprobada anteriormente");
        }

        if (!isAdmin && !tieneTipoResolucion(currentUser, assignment.getTipoResolucion())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
                    "No tienes habilitado el tipo de resolución " + assignment.getTipoResolucion() + " para tomar este caso");
        }

        if (assignment.getResolutor() != null) {
            if (assignment.getResolutor().getId().equals(currentUser.getId())) {
                return solicitud; // Idempotente: ya fue tomada por este mismo resolutor
            }
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "Esta resolución ya fue tomada por otro resolutor: " + assignment.getResolutor().getName());
        }

        assignment.setResolutor(currentUser);
        Solicitud saved = solicitudRepository.save(solicitud);
        logAssignmentChange(saved, currentUser, "RESOLUCIÓN TOMADA (" + assignment.getTipoResolucion() + ")");
        return saved;
    }

    @org.springframework.transaction.annotation.Transactional
    public void aprobarAsignacion(Long solicitudId, String emailResolutor, String observaciones, String asistencia, java.util.Map<String, Object> calendarData) {
        Solicitud solicitud = solicitudRepository.findById(solicitudId)
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));

        User resolutor = userRepository.findByEmail(emailResolutor)
                .orElseThrow(() -> new RuntimeException("Resolutor no encontrado"));

        Long requestedAssignmentId = null;
        if (calendarData != null && calendarData.get("assignmentId") != null) {
            try {
                requestedAssignmentId = Long.valueOf(calendarData.get("assignmentId").toString());
            } catch (NumberFormatException ignored) {
                requestedAssignmentId = null;
            }
        }

        final Long targetAssignmentId = requestedAssignmentId;
        // 1. Buscar asignación pendiente ya tomada por este resolutor (priorizando assignmentId si se indicó)
        SolicitudResolutorAssignment assignment = solicitud.getResolutorAssignments().stream()
                .filter(a -> !Boolean.TRUE.equals(a.getApproved())
                        && !Boolean.TRUE.equals(a.getRejected())
                        && a.getResolutor() != null
                        && a.getResolutor().getId().equals(resolutor.getId())
                        && (targetAssignmentId == null || targetAssignmentId.equals(a.getId())))
                .findFirst()
                // 2. Respaldo: si la resolución aún está en el pool compartido del tipo que atiende este resolutor, se la auto-asigna y aprueba
                .orElseGet(() -> solicitud.getResolutorAssignments().stream()
                        .filter(a -> !Boolean.TRUE.equals(a.getApproved())
                                && !Boolean.TRUE.equals(a.getRejected())
                                && a.getResolutor() == null
                                && tieneTipoResolucion(resolutor, a.getTipoResolucion())
                                && (targetAssignmentId == null || targetAssignmentId.equals(a.getId())))
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("Asignación pendiente no encontrada para este resolutor")));

        // Asegurar que siempre quede guardado quién resolvió el caso
        if (assignment.getResolutor() == null) {
            assignment.setResolutor(resolutor);
        }

        // Validar y registrar la asistencia de forma obligatoria si la asignación es de tipo AGENDA
        if ("AGENDA".equalsIgnoreCase(assignment.getTipoResolucion())) {
            if (asistencia == null || asistencia.trim().isEmpty()) {
                throw new IllegalArgumentException("La selección de asistencia ('con asistencia' o 'sin asistencia') es obligatoria para solicitudes de tipo AGENDA.");
            }
            solicitud.setAsistencia(asistencia.trim());
        }

        assignment.setApproved(true);
        
        String obsLimpia = observaciones != null ? observaciones.trim() : "";
        String eventInfo = "";
        if ("AGENDA".equalsIgnoreCase(assignment.getTipoResolucion()) && calendarData != null) {
            String date = calendarData.get("date") != null ? calendarData.get("date").toString() : null;
            String time = calendarData.get("time") != null ? calendarData.get("time").toString() : null;
            if (date != null && !date.trim().isEmpty()) {
                eventInfo = " (📅 Evento agendado para el día: " + date + (time != null && !time.trim().isEmpty() ? " a las " + time + " hs" : "") + ")";
            }
        }
        String finalObs = (obsLimpia + eventInfo).trim();
        assignment.setObservaciones(finalObs);
        
        // Registrar en historial quién aprobó la resolución (observaciones opcionales)
        String detalleHistorial = "RESOLUCIÓN APROBADA (" + assignment.getTipoResolucion() + ")"
                + (!obsLimpia.isEmpty() ? ": " + obsLimpia : "")
                + (asistencia != null && !asistencia.trim().isEmpty() ? " | Asistencia: " + asistencia.trim() : "");
        logAssignmentChange(solicitud, resolutor, detalleHistorial);

        // Recalcular estado de la solicitud
        updateSolicitudStatus(solicitud);
        
        Solicitud saved = solicitudRepository.save(solicitud);

        // Disparar integraciones asíncronas externas tras aprobación exitosa.
        if ("AGENDA".equalsIgnoreCase(assignment.getTipoResolucion())) {
            if (calendarData != null && "true".equalsIgnoreCase(String.valueOf(calendarData.get("createEvent")))) {
                String calendarId = calendarData.get("calendarId") != null ? calendarData.get("calendarId").toString() : null;
                if (calendarId == null || calendarId.trim().isEmpty()) {
                    if (saved.getSheetsConfig() != null && saved.getSheetsConfig().getCalendarId() != null && !saved.getSheetsConfig().getCalendarId().trim().isEmpty()) {
                        calendarId = saved.getSheetsConfig().getCalendarId();
                    }
                }
                if (calendarId == null || calendarId.trim().isEmpty()) {
                    // Buscar la configuración de Agenda en la base de datos de manera proactiva (comentarios en ESPAÑOL)
                    java.util.List<com.sgp.backend.entity.SheetsConfig> configs = sheetsConfigRepository.findAll();
                    for (com.sgp.backend.entity.SheetsConfig config : configs) {
                        if (config.getCalendarId() != null && !config.getCalendarId().trim().isEmpty()) {
                            com.sgp.backend.entity.Project project = projectRepository.findBySheetsConfig(config).orElse(null);
                            String projectName = (project != null) ? project.getName() : config.getSheetName();
                            if (projectName != null && projectName.toUpperCase().contains("AGENDA")) {
                                calendarId = config.getCalendarId();
                                break;
                            }
                        }
                    }
                    // Respaldo secundario: cualquier configuración que tenga un calendarId no vacío
                    if (calendarId == null || calendarId.trim().isEmpty()) {
                        for (com.sgp.backend.entity.SheetsConfig config : configs) {
                            if (config.getCalendarId() != null && !config.getCalendarId().trim().isEmpty()) {
                                calendarId = config.getCalendarId();
                                break;
                            }
                        }
                    }
                }
                if (calendarId == null || calendarId.trim().isEmpty()) {
                    calendarId = emailResolutor; // Respaldo definitivo al correo electrónico del resolutor si no hay configuración
                }
                String title = calendarData.get("title") != null ? calendarData.get("title").toString() : "";
                String description = calendarData.get("description") != null ? calendarData.get("description").toString() : "";
                String location = calendarData.get("location") != null ? calendarData.get("location").toString() : "";
                String date = calendarData.get("date") != null ? calendarData.get("date").toString() : "";
                String time = calendarData.get("time") != null ? calendarData.get("time").toString() : "";

                // Extraer lista de invitados seleccionados (CDU-15)
                java.util.List<String> guestEmails = new java.util.ArrayList<>();
                Object guestObj = calendarData.get("guestEmails");
                if (guestObj instanceof java.util.List<?> list) {
                    for (Object item : list) {
                        if (item != null) {
                            guestEmails.add(item.toString());
                        }
                    }
                } else if (guestObj instanceof String str && !str.trim().isEmpty()) {
                    for (String part : str.split(",")) {
                        if (!part.trim().isEmpty()) {
                            guestEmails.add(part.trim());
                        }
                    }
                }
                
                try {
                    googleCalendarService.createEvent(calendarId, title, description, location, date, time, saved.getId(), guestEmails);
                } catch (Exception e) {
                    throw new RuntimeException(e.getMessage(), e);
                }
            }
        }

        // Notificación por correo electrónico liviana al Responsable Territorial (CDU-10)
        // Se dispara para cualquier tipo de resolución aprobada sin archivos adjuntos pesados
        if (saved.getResponsable() != null && saved.getResponsable().getEmail() != null && !saved.getResponsable().getEmail().trim().isEmpty()) {
            emailService.sendSolicitudAprobadaEmail(
                    saved.getResponsable().getEmail(),
                    saved.getId(),
                    assignment.getTipoResolucion(),
                    observaciones
            );
        } else {
            log.info("No se envía correo de notificación de aprobación: la solicitud #{} no posee responsable territorial asignado con correo válido.", saved.getId());
        }
    }

    /**
     * Pone una solicitud de subsidio en estado de 'CONSIDERACION' para que pueda sincronizarse externamente.
     * Valida que si el usuario autenticado posee el rol RESOLUTOR, cuente obligatoriamente con la competencia SUBSIDIO.
     */
    @org.springframework.transaction.annotation.Transactional
    public Solicitud ponerEnConsideracion(Long id) {
        // Obtener el usuario autenticado del contexto de seguridad
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String email = auth.getName();
            User currentUser = userRepository.findByEmail(email).orElse(null);
            if (currentUser != null && currentUser.getRole() != null) {
                String activeRole = com.sgp.backend.security.SecurityUtils.getActiveRole(currentUser);
                // Verificar si el usuario tiene rol RESOLUTOR
                if ("RESOLUTOR".equalsIgnoreCase(activeRole)) {
                    // Verificar si la colección de tipos de resolución del resolutor contiene alguna competencia de SUBSIDIO (Dinero o Especie)
                    boolean tieneSubsidio = currentUser.getTiposResolucion() != null && currentUser.getTiposResolucion().stream()
                            .anyMatch(tr -> tr.getTipo() != null && tr.getTipo().toUpperCase().contains("SUBSIDIO"));
                    if (!tieneSubsidio) {
                        // Lanzar HTTP 403 Forbidden si el resolutor no tiene la competencia SUBSIDIO
                        throw new org.springframework.web.server.ResponseStatusException(
                                org.springframework.http.HttpStatus.FORBIDDEN,
                                "El resolutor no posee la competencia 'SUBSIDIO' necesaria para poner la solicitud en consideración."
                        );
                    }
                }
            }
        }

        Solicitud solicitud = solicitudRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));

        solicitud.setStatus("consideracion");
        Solicitud saved = solicitudRepository.save(solicitud);

        // Auto-exportar a la planilla de salida vinculada
        try {
            String spreadsheetId = null;
            if (saved.getSheetsConfig() != null && saved.getSheetsConfig().getSpreadsheetId() != null && !saved.getSheetsConfig().getSpreadsheetId().startsWith("spreadsheet-")) {
                spreadsheetId = saved.getSheetsConfig().getSpreadsheetId();
            } else {
                var configOpt = sheetsConfigRepository.findAll().stream()
                        .filter(c -> c.getSheetName() != null && !c.getSheetName().toUpperCase().contains("AGENDA") && c.getSpreadsheetId() != null && !c.getSpreadsheetId().startsWith("spreadsheet-"))
                        .findFirst();
                if (configOpt.isPresent()) {
                    spreadsheetId = configOpt.get().getSpreadsheetId();
                } else {
                    spreadsheetId = "1jPw9ni4BW_bRfw_M9aja7jO5RGX5IFq8w43T3W0Xz6g";
                }
            }

            if (spreadsheetId != null) {
                syncService.exportarPlanillaSalida(spreadsheetId, java.util.List.of(id));
            }
        } catch (Exception e) {
            System.err.println("⚠️ Advertencia al exportar a Google Sheets en ponerEnConsideracion para la solicitud #" + id + ": " + e.getMessage());
        }

        logAssignmentChange(saved, null, "PUESTA EN CONSIDERACIÓN");
        return saved;
    }

    @org.springframework.transaction.annotation.Transactional
    public java.util.List<Solicitud> ponerEnConsideracionBatch(java.util.List<Long> ids) {
        java.util.List<Solicitud> result = new java.util.ArrayList<>();
        if (ids != null) {
            for (Long id : ids) {
                result.add(ponerEnConsideracion(id));
            }
        }
        return result;
    }

    /**
     * Permite a un usuario con rol RESPONSABLE auto-asignarse una solicitud que se encuentre
     * sin responsable asignado dentro de su zona territorial (o a un Administrador).
     * Controla la concurrencia de forma transaccional y registra el movimiento en el historial.
     */
    @org.springframework.transaction.annotation.Transactional
    public Solicitud tomarSolicitud(Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Usuario no autenticado");
        }

        User currentUser = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        String activeRole = com.sgp.backend.security.SecurityUtils.getActiveRole(currentUser);
        boolean isAuthorized = activeRole != null && (activeRole.contains("RESPONSABLE") || activeRole.contains("ADMIN"));
        if (!isAuthorized) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "No tienes permisos para tomar esta solicitud");
        }

        Solicitud solicitud = solicitudRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Solicitud no encontrada"));

        // Comprobar si ya fue tomada por otro responsable
        if (solicitud.getResponsable() != null) {
            if (solicitud.getResponsable().getId().equals(currentUser.getId())) {
                return solicitud; // Ya pertenece a este usuario
            }
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT,
                    "La solicitud ya fue tomada por otro responsable: " + solicitud.getResponsable().getName());
        }

        // Validar compatibilidad de zona geográfica si el usuario no es Administrador
        if (!activeRole.contains("ADMIN")) {
            if (solicitud.getZone() != null && !solicitud.getZone().trim().isEmpty()
                    && currentUser.getZone() != null && !currentUser.getZone().trim().isEmpty()) {
                java.util.List<String> userZones = java.util.Arrays.stream(currentUser.getZone().split(","))
                        .map(String::trim)
                        .map(String::toLowerCase)
                        .filter(s -> !s.isEmpty())
                        .collect(java.util.stream.Collectors.toList());
                if (!userZones.contains(solicitud.getZone().trim().toLowerCase())) {
                    throw new org.springframework.web.server.ResponseStatusException(
                            org.springframework.http.HttpStatus.FORBIDDEN,
                            "La solicitud pertenece a la zona " + solicitud.getZone() + " y tu zona asignada es " + currentUser.getZone());
                }
            }
        }

        // Asignar el responsable actual y actualizar el estado
        solicitud.setResponsable(currentUser);
        updateSolicitudStatus(solicitud);
        Solicitud saved = solicitudRepository.save(solicitud);

        // Registrar en el historial de asignaciones
        logAssignmentChange(saved, currentUser, "AUTOASIGNADO");

        return saved;
    }

    /**
     * Permite a cualquier resolutor rechazar una asignación pendiente (tomada o en pool de su competencia)
     * dejando registrado el motivo obligatorio y recalculando el estado global de la solicitud.
     */
    @org.springframework.transaction.annotation.Transactional
    public void rechazarAsignacion(Long solicitudId, String emailResolutor, String observaciones, Long requestedAssignmentId) {
        String motivo = observaciones != null ? observaciones.trim() : "";
        if (motivo.isEmpty()) {
            throw new IllegalArgumentException("Debe ingresar el motivo del rechazo.");
        }

        Solicitud solicitud = solicitudRepository.findById(solicitudId)
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));

        User resolutor = userRepository.findByEmail(emailResolutor)
                .orElseThrow(() -> new RuntimeException("Resolutor no encontrado"));

        final Long targetAssignmentId = requestedAssignmentId;
        SolicitudResolutorAssignment assignment = solicitud.getResolutorAssignments().stream()
                .filter(a -> !Boolean.TRUE.equals(a.getApproved())
                        && !Boolean.TRUE.equals(a.getRejected())
                        && a.getResolutor() != null
                        && a.getResolutor().getId().equals(resolutor.getId())
                        && (targetAssignmentId == null || targetAssignmentId.equals(a.getId())))
                .findFirst()
                .orElseGet(() -> solicitud.getResolutorAssignments().stream()
                        .filter(a -> !Boolean.TRUE.equals(a.getApproved())
                                && !Boolean.TRUE.equals(a.getRejected())
                                && a.getResolutor() == null
                                && tieneTipoResolucion(resolutor, a.getTipoResolucion())
                                && (targetAssignmentId == null || targetAssignmentId.equals(a.getId())))
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("Asignación pendiente no encontrada para este resolutor")));

        if (assignment.getResolutor() == null) {
            assignment.setResolutor(resolutor);
        }

        assignment.setApproved(false);
        assignment.setRejected(true);
        assignment.setObservaciones(motivo);

        // Registrar también el autor y motivo del rechazo en la observación general de la solicitud
        String nombreResolutor = (resolutor.getName() != null && !resolutor.getName().trim().isEmpty())
                ? resolutor.getName().trim()
                : resolutor.getEmail();
        String notaRechazo = "[Rechazado por " + nombreResolutor + " (" + assignment.getTipoResolucion() + "): " + motivo + "]";
        String obsActual = solicitud.getObservation() != null ? solicitud.getObservation().trim() : "";
        solicitud.setObservation(obsActual.isEmpty() ? notaRechazo : obsActual + "\n" + notaRechazo);

        String detalleHistorial = "RESOLUCIÓN RECHAZADA (" + assignment.getTipoResolucion() + "): " + motivo;
        logAssignmentChange(solicitud, resolutor, detalleHistorial);

        updateSolicitudStatus(solicitud);
        solicitudRepository.save(solicitud);
    }

    private void updateSolicitudStatus(Solicitud solicitud) {
        List<SolicitudResolutorAssignment> assignments = solicitud.getResolutorAssignments();
        if (assignments != null && !assignments.isEmpty()) {
            long approvedCount = assignments.stream().filter(a -> Boolean.TRUE.equals(a.getApproved())).count();
            long rejectedCount = assignments.stream().filter(a -> Boolean.TRUE.equals(a.getRejected())).count();
            long closedCount = approvedCount + rejectedCount;
            if (closedCount < assignments.size()) {
                solicitud.setStatus("en resolucion");
            } else if (rejectedCount == assignments.size()) {
                solicitud.setStatus("rechazada");
            } else {
                solicitud.setStatus("completadas");
            }
            return;
        }

        // Si no tiene asignaciones de resolutor, depende de si tiene responsable asignado.
        if (solicitud.getResponsable() == null) {
            solicitud.setStatus("pendiente");
        } else {
            solicitud.setStatus("en proceso");
        }
    }
}
