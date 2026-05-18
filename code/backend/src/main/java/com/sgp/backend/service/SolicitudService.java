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
import lombok.RequiredArgsConstructor;
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

        // Apply Role Based Filtering
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String email = auth.getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                String userRole = user.getRole();
                // Si es ADMIN, tiene acceso completo a todas las solicitudes sin filtrado
                if (userRole != null && !userRole.contains("ADMIN")) {
                    spec = spec.and((root, query, cb) -> {
                        query.distinct(true);
                        jakarta.persistence.criteria.Join<Solicitud, SolicitudResolutorAssignment> assignments = root.join("resolutorAssignments", jakarta.persistence.criteria.JoinType.LEFT);
                        
                        List<jakarta.persistence.criteria.Predicate> orPredicates = new java.util.ArrayList<>();
                        
                        if (userRole.contains("OPERADOR")) {
                            orPredicates.add(cb.equal(root.get("createdBy"), user));
                        }
                        if (userRole.contains("DISTRIBUIDOR")) {
                            // El distribuidor solo ve solicitudes sin responsable asignado
                            orPredicates.add(cb.isNull(root.get("responsable")));
                        }
                        if (userRole.contains("RESPONSABLE")) {
                            orPredicates.add(cb.equal(root.get("responsable"), user));
                        }
                        if (userRole.contains("RESOLUTOR")) {
                            jakarta.persistence.criteria.Predicate isLegacyResolutor = cb.and(
                                cb.equal(root.get("resolutor").get("id"), user.getId()),
                                cb.notEqual(root.get("status"), "completadas")
                            );
                            jakarta.persistence.criteria.Predicate isAssignedResolutor = cb.equal(assignments.get("resolutor").get("id"), user.getId());
                            
                            orPredicates.add(cb.or(isLegacyResolutor, isAssignedResolutor));
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
        // 1. Handle Person
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

        // 2. Handle Location (using locationName and barrio from frontend payload)
        if (solicitud.getLocationName() != null && !solicitud.getLocationName().trim().isEmpty()) {
            final String cityName = solicitud.getLocationName().trim();
            final String inputBarrio = (solicitud.getBarrio() != null && !solicitud.getBarrio().trim().isEmpty()) ? solicitud.getBarrio().trim() : null;

            // Find or create City
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
                // Find or create Neighborhood
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
            // Fallback for older approach
            Location l = solicitud.getLocation();
            if (l.getId() == null && l.getName() != null) {
                final Location locationToSave = l;
                l = locationRepository.findFirstByName(l.getName())
                        .orElseGet(() -> {
                            locationToSave.setType("CITY"); // Default for manual
                            return locationRepository.save(locationToSave);
                        });
            }
            solicitud.setLocation(l);
        }

        // 3. Defaults
        if (solicitud.getStatus() == null) {
            solicitud.setStatus("pendiente");
        }
        if (solicitud.getEntryDate() == null) {
            solicitud.setEntryDate(java.time.LocalDate.now());
        }

        // Set creation tracking
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            userRepository.findByEmail(auth.getName()).ifPresent(solicitud::setCreatedBy);
        }

        Solicitud saved = solicitudRepository.save(solicitud);

        // Process assignments if present
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

        // 1. Actualizar beneficiario
        if (dto.getPerson() != null) {
            Person p;
            if (dto.getPerson().getId() != null) {
                // Persona existente: actualizar sus campos
                p = personRepository.findById(dto.getPerson().getId()).orElse(new Person());
                p.setName(dto.getPerson().getName());
                p.setPhone(dto.getPerson().getPhone());
                p = personRepository.save(p);
            } else {
                // Persona nueva: buscar por nombre o crear
                final String nombre = dto.getPerson().getName();
                final String telefono = dto.getPerson().getPhone();
                p = personRepository.findByName(nombre).orElseGet(() -> {
                    Person nueva = new Person();
                    nueva.setName(nombre);
                    nueva.setPhone(telefono);
                    nueva.setType("INDIVIDUAL");
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
        if (existing instanceof com.sgp.backend.entity.Subsidio subsidioExistente) {
            if (dto.getAmount() != null) {
                subsidioExistente.setAmount(dto.getAmount());
            }
            if (dto.getGrantDate() != null) {
                subsidioExistente.setGrantDate(dto.getGrantDate());
            }
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

        // 8. Recalcular estado automático
        updateSolicitudStatus(saved);
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
                username = user.getEmail(); // Or user.getName() if it exists? Email is safer.
            }
        }

        AsignacionHistorial history = AsignacionHistorial.builder()
                .solicitud(solicitud)
                .responsable(responsable) // Even for UNASSIGNED, records who was unassigned
                .actionType(actionType)
                .assignedByUsername(username)
                .actionDate(LocalDateTime.now())
                .build();
        
        asignacionHistorialRepository.save(history);
    }

    private void processAssignments(Solicitud solicitud, List<ResolutorAssignmentDTO> dtos) {
        if (dtos == null) return;
        
        // Clear existing assignments if any (Sync logic)
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
        }
        solicitudRepository.save(solicitud);
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
    public void aprobarAsignacion(Long solicitudId, String emailResolutor, String observaciones) {
        Solicitud solicitud = solicitudRepository.findById(solicitudId)
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));

        User resolutor = userRepository.findByEmail(emailResolutor)
                .orElseThrow(() -> new RuntimeException("Resolutor no encontrado"));

        // Buscar la asignación específica para este resolutor en esta solicitud
        SolicitudResolutorAssignment assignment = solicitud.getResolutorAssignments().stream()
                .filter(a -> a.getResolutor().getId().equals(resolutor.getId()) && !a.getApproved())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Asignación pendiente no encontrada para este resolutor"));

        assignment.setApproved(true);
        assignment.setObservaciones(observaciones);
        
        // Registrar en historial
        logAssignmentChange(solicitud, resolutor, "RESOLUCIÓN APROBADA: " + observaciones);

        // Recalcular estado de la solicitud
        updateSolicitudStatus(solicitud);
        
        solicitudRepository.save(solicitud);
    }

    private void updateSolicitudStatus(Solicitud solicitud) {
        String currentStatus = solicitud.getStatus();
        
        // If already completed or rejected, we don't auto-move unless explicitly changed? 
        // But the user wants auto-transition.
        
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
