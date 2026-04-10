package com.sgp.backend.service;

import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.entity.Person;
import com.sgp.backend.entity.Location;
import com.sgp.backend.entity.Responsable;
import com.sgp.backend.entity.User;
import com.sgp.backend.repository.SolicitudRepository;
import com.sgp.backend.repository.PersonRepository;
import com.sgp.backend.repository.LocationRepository;
import com.sgp.backend.repository.ResponsableRepository;
import com.sgp.backend.repository.UserRepository;
import com.sgp.backend.repository.AsignacionHistorialRepository;
import com.sgp.backend.repository.ResolutorConfigRepository;
import com.sgp.backend.entity.AsignacionHistorial;
import com.sgp.backend.entity.SolicitudResolutorAssignment;
import com.sgp.backend.repository.SolicitudResolutorAssignmentRepository;
import com.sgp.backend.dto.ResolutorAssignmentDTO;
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
    private final ResponsableRepository responsableRepository;
    private final UserRepository userRepository;
    private final AsignacionHistorialRepository asignacionHistorialRepository;
    private final ResolutorConfigRepository resolutorConfigRepository;

    public List<Solicitud> getAllSolicitudes(String status, String search) {
        org.springframework.data.jpa.domain.Specification<Solicitud> spec = org.springframework.data.jpa.domain.Specification
                .where(null);

        if (status != null && !status.isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }

        if (search != null && !search.isEmpty()) {
            String likePattern = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("description")), likePattern),
                    cb.like(cb.lower(root.get("person").get("name")), likePattern)));
        }

        // Apply Role Based Filtering
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            String email = auth.getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                if (user.getRole().equals("OPERADOR")) {
                    spec = spec.and((root, query, cb) -> cb.equal(root.get("createdBy"), user));
                } else if (user.getRole().equals("RESPONSABLE")) {
                    Responsable resp = responsableRepository.findByUserId(user.getId()).orElse(null);
                    if (resp != null) {
                        spec = spec.and((root, query, cb) -> cb.equal(root.get("responsable"), resp));
                    } else {
                        // Responsable profile not found, hide all
                        spec = spec.and((root, query, cb) -> cb.disjunction());
                    }
                } else if (user.getRole().equals("RESOLUTOR")) {
                    spec = spec.and((root, query, cb) -> {
                        Subquery<Long> subquery = query.subquery(Long.class);
                        Root<SolicitudResolutorAssignment> assignmentRoot = subquery.from(SolicitudResolutorAssignment.class);
                        subquery.select(assignmentRoot.get("solicitud").get("id"))
                                .where(cb.equal(assignmentRoot.get("resolutor"), user));
                        
                        return cb.or(
                            cb.equal(root.get("resolutor"), user),
                            cb.in(root.get("id")).value(subquery)
                        );
                    });
                }
                // DISTRIBUIDOR and ADMINISTRADOR see everything (no additional predicates).
            }
        }

        return solicitudRepository.findAll(spec);
    }

    public List<Solicitud> getSolicitudesByConfig(Long configId) {
        return solicitudRepository.findBySheetsConfigId(configId);
    }

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
            solicitud.setStatus("PENDING");
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

        if (saved.getResponsable() != null) {
            logAssignmentChange(saved, saved.getResponsable(), "ASSIGNED");
        }

        return saved;
    }

    public Solicitud updateSolicitud(Long id, Solicitud solicitudPayload) {
        Solicitud existing = solicitudRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitud not found"));

        Responsable oldResponsable = existing.getResponsable();

        // 1. Handle Person
        if (solicitudPayload.getPerson() != null) {
            Person p = solicitudPayload.getPerson();
            if (p.getId() == null) {
                final Person personToSave = p;
                p = personRepository.findByName(p.getName())
                        .orElseGet(() -> {
                            if (personToSave.getType() == null) {
                                personToSave.getType();
                                personToSave.setType("INDIVIDUAL");
                            }
                            return personRepository.save(personToSave);
                        });
            } else {
                p = personRepository.findById(p.getId()).orElse(p);
                p.setName(solicitudPayload.getPerson().getName());
                p.setPhone(solicitudPayload.getPerson().getPhone());
                p = personRepository.save(p);
            }
            existing.setPerson(p);
        }

        // 2. Handle Location (using location fields from frontend)
        if (solicitudPayload.getLocationName() != null && !solicitudPayload.getLocationName().trim().isEmpty()) {
            final String cityName = solicitudPayload.getLocationName().trim();
            final String inputBarrio = (solicitudPayload.getBarrio() != null && !solicitudPayload.getBarrio().trim().isEmpty()) ? solicitudPayload.getBarrio().trim() : null;

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
                existing.setLocation(neighborhood);
            } else {
                existing.setLocation(cityLocation);
            }
        } else if (solicitudPayload.getLocation() != null) {
            // Fallback for older approach
            Location l = solicitudPayload.getLocation();
            if (l.getId() == null && l.getName() != null) {
                final Location locationToSave = l;
                l = locationRepository.findFirstByName(l.getName())
                        .orElseGet(() -> {
                            locationToSave.setType("CITY"); // Default for manual
                            return locationRepository.save(locationToSave);
                        });
            }
            existing.setLocation(l);
        }

        // Update primitive fields
        existing.setDescription(solicitudPayload.getDescription());
        existing.setStatus(solicitudPayload.getStatus());
        existing.setOrigin(solicitudPayload.getOrigin());
        existing.setZone(solicitudPayload.getZone());
        existing.setContactDate(solicitudPayload.getContactDate());
        existing.setResolutionDate(solicitudPayload.getResolutionDate());
        existing.setObservation(solicitudPayload.getObservation());
        existing.setResolution(solicitudPayload.getResolution());
        existing.setDetail(solicitudPayload.getDetail());
        existing.setFirstContactControl(solicitudPayload.getFirstContactControl());

        if (existing instanceof com.sgp.backend.entity.Subsidio
                && solicitudPayload instanceof com.sgp.backend.entity.Subsidio) {
            ((com.sgp.backend.entity.Subsidio) existing)
                    .setAmount(((com.sgp.backend.entity.Subsidio) solicitudPayload).getAmount());
            ((com.sgp.backend.entity.Subsidio) existing)
                    .setGrantDate(((com.sgp.backend.entity.Subsidio) solicitudPayload).getGrantDate());
        }

        if (solicitudPayload.getEntryDate() != null) {
            existing.setEntryDate(solicitudPayload.getEntryDate());
        }

        // Handle Resolutor Suggestion Workflow (It assigns the Solicitud to the Resolutor user seamlessly without removing the original Responsable)
        String newSuggestedType = solicitudPayload.getSuggestedResolutionType();
        
        // If a new suggested resolution type is set
        if (newSuggestedType != null && !newSuggestedType.trim().isEmpty() && 
            !newSuggestedType.equals(existing.getSuggestedResolutionType())) {
            
            existing.setSuggestedResolutionType(newSuggestedType);
            existing.setResolutionApproved(false); // reset approval state on new derivation
            
            // Auto assign to the corresponding Resolutor
            java.util.Optional<com.sgp.backend.entity.ResolutorConfig> configOpt = resolutorConfigRepository.findByTipoResolucionIgnoreCase(newSuggestedType);
            if (configOpt.isPresent() && configOpt.get().getResolutor() != null) {
                existing.setResolutor(configOpt.get().getResolutor());
            }
        } else if (solicitudPayload.getResolutionApproved() != null) {
            existing.setResolutionApproved(solicitudPayload.getResolutionApproved());
            // Optionally, if approved by a resolutor, they could reset the derivacion or notify someone, but setting the flag is enough for the UI to represent the "devolution".
        }

        // Resolutors cannot override the primary Responsable, so only perform responsible override logic normally if not AutoAssigned.
        // Also frontend payload from a Resolutor might miss the responsable fields, so only apply updates if explicitly sent.
        if (solicitudPayload.getResponsable() != null && solicitudPayload.getResponsable().getId() != null) {
            responsableRepository.findById(solicitudPayload.getResponsable().getId())
                    .ifPresent(existing::setResponsable);
        } else if (solicitudPayload.getResponsable() == null) {
            // we only unassign if they explicitly send `{ responsable: null }`. 
            // the frontend should be careful not to wipe out existing state if sending partial updates
            existing.setResponsable(null);
        }

        Solicitud saved = solicitudRepository.save(existing);

        // Process assignments if present (Sync the collection)
        processAssignments(saved, solicitudPayload.getAssignments());

        Responsable newResponsable = saved.getResponsable();
        if (oldResponsable == null && newResponsable != null) {
            logAssignmentChange(saved, newResponsable, "ASSIGNED");
        } else if (oldResponsable != null && newResponsable == null) {
            logAssignmentChange(saved, oldResponsable, "UNASSIGNED");
        } else if (oldResponsable != null && newResponsable != null && !oldResponsable.getId().equals(newResponsable.getId())) {
            logAssignmentChange(saved, newResponsable, "REASSIGNED");
        }

        return saved;
    }

    private void logAssignmentChange(Solicitud solicitud, Responsable responsable, String actionType) {
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
}
