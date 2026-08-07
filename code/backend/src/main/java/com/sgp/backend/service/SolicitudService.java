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
    private final ObjectMapper objectMapper;

    public org.springframework.data.domain.Page<Solicitud> getAllSolicitudes(String status, String search, Long responsableId, Long locationId, String origin, java.time.LocalDate dateFrom, java.time.LocalDate dateTo, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<Solicitud> spec = buildSpecification(status, search, responsableId, locationId, origin, dateFrom, dateTo);
        return solicitudRepository.findAll(spec, pageable);
    }

    public org.springframework.data.domain.Page<Solicitud> getSolicitudesByConfig(Long configId, String status, String search, Long responsableId, Long locationId, String origin, java.time.LocalDate dateFrom, java.time.LocalDate dateTo, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<Solicitud> baseSpec = org.springframework.data.jpa.domain.Specification
                .where((root, query, cb) -> cb.equal(root.get("sheetsConfig").get("id"), configId));
        org.springframework.data.jpa.domain.Specification<Solicitud> spec = baseSpec.and(buildSpecification(status, search, responsableId, locationId, origin, dateFrom, dateTo));
        return solicitudRepository.findAll(spec, pageable);
    }

    public java.util.Map<String, Object> getSolicitudStats(Long configId, String search, Long responsableId, Long locationId, String origin, java.time.LocalDate dateFrom, java.time.LocalDate dateTo) {
        org.springframework.data.jpa.domain.Specification<Solicitud> spec = org.springframework.data.jpa.domain.Specification.where(null);
        if (configId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("sheetsConfig").get("id"), configId));
        }
        spec = spec.and(buildSpecification(null, search, responsableId, locationId, origin, dateFrom, dateTo));
        
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

    private org.springframework.data.jpa.domain.Specification<Solicitud> buildSpecification(String status, String search, Long responsableId, Long locationId, String origin, java.time.LocalDate dateFrom, java.time.LocalDate dateTo) {
        org.springframework.data.jpa.domain.Specification<Solicitud> spec = org.springframework.data.jpa.domain.Specification.where(null);

        if (status != null && !status.isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }

        if (search != null && !search.isEmpty()) {
            String likePattern = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("description")), likePattern),
                    cb.like(cb.lower(root.get("person").get("name")), likePattern),
                    cb.like(cb.lower(root.get("id").as(String.class)), likePattern)));
        }

        if (responsableId != null) {
            if (responsableId == 0) {
                spec = spec.and((root, query, cb) -> cb.isNull(root.get("responsable")));
            } else {
                spec = spec.and((root, query, cb) -> cb.equal(root.get("responsable").get("id"), responsableId));
            }
        }

        if (locationId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("location").get("id"), locationId));
        }

        if (origin != null && !origin.isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("origin"), origin));
        }

        if (dateFrom != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("entryDate"), dateFrom));
        }

        if (dateTo != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("entryDate"), dateTo));
        }

        // Aplicar filtrado basado en roles
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String email = auth.getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                String userRole = user.getRole();
                // Si es ADMIN o DISTRIBUIDOR o AUDITOR, tiene acceso completo a todas las solicitudes sin filtrado
                if (userRole != null && !userRole.contains("ADMIN") && !userRole.contains("DISTRIBUIDOR") && !userRole.contains("AUDITOR")) {
                    spec = spec.and((root, query, cb) -> {
                        query.distinct(true);
                        jakarta.persistence.criteria.Join<Solicitud, SolicitudResolutorAssignment> assignments = root.join("resolutorAssignments", jakarta.persistence.criteria.JoinType.LEFT);
                        
                        List<jakarta.persistence.criteria.Predicate> orPredicates = new java.util.ArrayList<>();
                        
                        if (userRole.contains("OPERADOR")) {
                            orPredicates.add(cb.equal(root.get("createdBy"), user));
                        }
                        if (userRole.contains("RESPONSABLE")) {
                            orPredicates.add(cb.equal(root.get("responsable"), user));
                        }
                        if (userRole.contains("RESOLUTOR")) {
                            List<String> tiposAsignados = user.getTiposResolucion().stream()
                                    .map(com.sgp.backend.entity.TipoResolucion::getTipo)
                                    .collect(java.util.stream.Collectors.toList());
                            
                            if (tiposAsignados.isEmpty()) {
                                orPredicates.add(cb.disjunction());
                            } else {
                                jakarta.persistence.criteria.Predicate isAssignedAndCorrectType = cb.and(
                                    cb.equal(assignments.get("resolutor").get("id"), user.getId()),
                                    assignments.get("tipoResolucion").in(tiposAsignados)
                                );
                                
                                jakarta.persistence.criteria.Predicate isLegacyResolutor = cb.and(
                                    cb.equal(root.get("resolutor").get("id"), user.getId()),
                                    cb.notEqual(root.get("status"), "completadas"),
                                    root.get("suggestedResolutionType").in(tiposAsignados)
                                );
                                
                                orPredicates.add(cb.or(isLegacyResolutor, isAssignedAndCorrectType));
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

    @org.springframework.transaction.annotation.Transactional
    public Solicitud createSolicitud(Solicitud solicitud) {
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

        // 3. Valores predeterminados
        if (solicitud.getStatus() == null) {
            solicitud.setStatus("pendiente");
        }
        if (solicitud.getEntryDate() == null) {
            solicitud.setEntryDate(java.time.LocalDate.now());
        }

        // Establecer seguimiento de creación
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            userRepository.findByEmail(auth.getName()).ifPresent(solicitud::setCreatedBy);
        }

        Solicitud saved = solicitudRepository.save(solicitud);

        // Procesar asignaciones si están presentes
        processAssignments(saved, solicitud.getAssignments());

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

        // 1. Actualizar beneficiario
        if (dto.getPerson() != null) {
            Person p;
            if (dto.getPerson().getId() != null) {
                // Persona existente: actualizar sus campos
                p = personRepository.findById(dto.getPerson().getId()).orElse(new Person());
                p.setName(dto.getPerson().getName());
                p.setPhone(dto.getPerson().getPhone());
                p.setType(dto.getPerson().getType() != null ? dto.getPerson().getType() : p.getType());
                p.setSubType(dto.getPerson().getSubType());
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
                    return personRepository.save(nueva);
                });
            }
            existing.setPerson(p);
        }

        // 2. Actualizar ubicación usando los campos planos del DTO
        if (dto.getLocationName() != null && !dto.getLocationName().trim().isEmpty()) {
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

        // 3. Actualizar campos primitivos
        existing.setDescription(dto.getDescription());
        existing.setStatus(dto.getStatus());
        existing.setOrigin(dto.getOrigin());
        existing.setZone(dto.getZone());
        existing.setContactDate(dto.getContactDate());
        existing.setResolutionDate(dto.getResolutionDate());
        existing.setObservation(dto.getObservation());
        existing.setResolution(dto.getResolution());
        existing.setDetail(dto.getDetail());
        existing.setFirstContactControl(dto.getFirstContactControl());

        if (dto.getEntryDate() != null) {
            existing.setEntryDate(dto.getEntryDate());
        }

        // 4. Campos específicos de Subsidio
        if (dto.getAmount() != null) {
            existing.setAmount(dto.getAmount());
        }
        if (dto.getGrantDate() != null) {
            existing.setGrantDate(dto.getGrantDate());
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

        // 7. Sincronizar asignaciones de resolutores
        processAssignments(saved, dto.getAssignments());

        // 8. Recalcular estado automático (solo si no se cambió de forma manual en el DTO)
        boolean statusChangedManually = dto.getStatus() != null && !dto.getStatus().equalsIgnoreCase(oldStatus);
        if (!statusChangedManually) {
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

        AsignacionHistorial history = AsignacionHistorial.builder()
                .solicitud(solicitud)
                .responsable(responsable) // Incluso para UNASSIGNED, registra quién fue desasignado
                .actionType(actionType)
                .assignedByUsername(username)
                .actionDate(LocalDateTime.now())
                .build();
        
        asignacionHistorialRepository.save(history);
    }

    private void processAssignments(Solicitud solicitud, List<ResolutorAssignmentDTO> dtos) {
        if (dtos == null) return;
        
        // Limpiar asignaciones existentes si las hay (lógica de sincronización)
        solicitud.getResolutorAssignments().clear();
        
        for (ResolutorAssignmentDTO dto : dtos) {
            if (dto.getResolutorEmail() == null || dto.getTipoResolucion() == null) continue;
            
            User resolutor = userRepository.findByEmail(dto.getResolutorEmail()).orElse(null);
            if (resolutor != null) {
                SolicitudResolutorAssignment assignment = SolicitudResolutorAssignment.builder()
                        .solicitud(solicitud)
                        .resolutor(resolutor)
                        .tipoResolucion(dto.getTipoResolucion())
                        .detalle(dto.getDetalle())
                        .build();
                solicitud.getResolutorAssignments().add(assignment);
            }

            // Requisito R1: Procesar la asignación de tipo SUBSIDIO y extraer su monto desde el JSON de detalle
            if (dto.getTipoResolucion() != null && dto.getTipoResolucion().equalsIgnoreCase("SUBSIDIO")) {
                if (dto.getDetalle() != null && !dto.getDetalle().trim().isEmpty()) {
                    try {
                        JsonNode rootNode = objectMapper.readTree(dto.getDetalle());
                        JsonNode montoNode = null;
                        if (rootNode.has("Monto")) {
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

    @org.springframework.transaction.annotation.Transactional
    public void aprobarAsignacion(Long solicitudId, String emailResolutor, String observaciones, String asistencia, java.util.Map<String, String> calendarData) {
        Solicitud solicitud = solicitudRepository.findById(solicitudId)
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));

        User resolutor = userRepository.findByEmail(emailResolutor)
                .orElseThrow(() -> new RuntimeException("Resolutor no encontrado"));

        // Validar y registrar la asistencia de forma obligatoria si es de tipo AGENDA
        if ("AGENDA".equalsIgnoreCase(solicitud.getType())) {
            if (asistencia == null || asistencia.trim().isEmpty()) {
                throw new IllegalArgumentException("La selección de asistencia ('con asistencia' o 'sin asistencia') es obligatoria para solicitudes de tipo AGENDA.");
            }
            solicitud.setAsistencia(asistencia.trim());
        }

        // Buscar la asignación específica para este resolutor en esta solicitud
        SolicitudResolutorAssignment assignment = solicitud.getResolutorAssignments().stream()
                .filter(a -> a.getResolutor().getId().equals(resolutor.getId()) && !a.getApproved())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Asignación pendiente no encontrada para este resolutor"));

        assignment.setApproved(true);
        
        String eventInfo = "";
        if ("AGENDA".equalsIgnoreCase(assignment.getTipoResolucion()) && calendarData != null) {
            String date = calendarData.get("date");
            String time = calendarData.get("time");
            if (date != null && !date.trim().isEmpty()) {
                eventInfo = " (📅 Evento agendado para el día: " + date + (time != null && !time.trim().isEmpty() ? " a las " + time + " hs" : "") + ")";
            }
        }
        assignment.setObservaciones(observaciones + eventInfo);
        
        // Registrar en historial
        logAssignmentChange(solicitud, resolutor, "RESOLUCIÓN APROBADA: " + observaciones + (asistencia != null ? " | Asistencia: " + asistencia : ""));

        // Recalcular estado de la solicitud
        updateSolicitudStatus(solicitud);
        
        Solicitud saved = solicitudRepository.save(solicitud);

        // Disparar integraciones asíncronas externas tras aprobación exitosa.
        // Se evalúa el tipo de resolución de la asignación aprobada (assignment.getTipoResolucion()) en lugar del tipo de solicitud (saved.getType())
        // para ejecutar únicamente la integración correspondiente a esta asignación (Google Calendar para AGENDA, EmailService para SUBSIDIO).
        if ("AGENDA".equalsIgnoreCase(assignment.getTipoResolucion())) {
            if (calendarData != null && "true".equals(calendarData.get("createEvent"))) {
                String calendarId = calendarData.get("calendarId");
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
                String title = calendarData.get("title");
                String description = calendarData.get("description");
                String location = calendarData.get("location");
                String date = calendarData.get("date");
                String time = calendarData.get("time");
                
                googleCalendarService.createEvent(calendarId, title, description, location, date, time, saved.getId());
            }
        } else if ("SUBSIDIO".equalsIgnoreCase(assignment.getTipoResolucion())) {
            emailService.sendSubsidioApprovedEmail(resolutor.getEmail(), saved.getId());
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
                // Verificar si el usuario tiene rol RESOLUTOR
                if ("RESOLUTOR".equalsIgnoreCase(currentUser.getRole())) {
                    // Verificar si la colección de tipos de resolución del resolutor contiene la competencia 'SUBSIDIO'
                    boolean tieneSubsidio = currentUser.getTiposResolucion() != null && currentUser.getTiposResolucion().stream()
                            .anyMatch(tr -> tr.getTipo() != null && "SUBSIDIO".equalsIgnoreCase(tr.getTipo()));
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

    private void updateSolicitudStatus(Solicitud solicitud) {
        String currentStatus = solicitud.getStatus();
        
        // Si la solicitud no tiene responsable, vuelve a estado pendiente.
        
        if (solicitud.getResponsable() == null) {
            solicitud.setStatus("pendiente");
        } else {
            List<SolicitudResolutorAssignment> assignments = solicitud.getResolutorAssignments();
            if (assignments.isEmpty()) {
                solicitud.setStatus("en proceso");
            } else {
                long approvedCount = assignments.stream().filter(SolicitudResolutorAssignment::getApproved).count();
                if (approvedCount == assignments.size()) {
                    solicitud.setStatus("completadas");
                } else {
                    solicitud.setStatus("en resolucion");
                }
            }
        }
    }
}
