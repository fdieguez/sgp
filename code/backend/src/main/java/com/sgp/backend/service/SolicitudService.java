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
import lombok.RequiredArgsConstructor;
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
        if (auth != null && auth.isAuthenticated()
                && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_USER"))) {
            String email = auth.getName();
            User user = userRepository.findByEmail(email).orElse(null);
            if (user != null) {
                Responsable resp = responsableRepository.findByUserId(user.getId()).orElse(null);
                if (resp != null) {
                    final String zoneStr = resp.getZone();
                    final Responsable responsableCriteria = resp;

                    org.springframework.data.jpa.domain.Specification<Solicitud> roleSpec = (root, query, cb) -> {
                        System.out.println("USER ROLE MATCHED: " + email + ", zone: " + zoneStr + ", RespId: "
                                + responsableCriteria.getId());
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
                    // If user is USER but has no Responsable profile, hide
                    spec = spec.and((root, query, cb) -> cb.disjunction());
                }
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

        // 2. Handle Location
        if (solicitud.getLocation() != null) {
            Location l = solicitud.getLocation();
            if (l.getId() == null && l.getName() != null) {
                final Location locationToSave = l;
                l = locationRepository.findByName(l.getName())
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

        return solicitudRepository.save(solicitud);
    }

    public Solicitud updateSolicitud(Long id, Solicitud solicitudPayload) {
        Solicitud existing = solicitudRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitud not found"));

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
        // Note: The frontend sends locationName and barrio in the payload, but we need
        // to map it if we are manually constructing it, or if it sends full location
        // object
        if (solicitudPayload.getLocation() != null) {
            Location l = solicitudPayload.getLocation();
            if (l.getId() == null && l.getName() != null) {
                final Location locationToSave = l;
                l = locationRepository.findByName(l.getName())
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

        if (solicitudPayload.getResponsable() != null && solicitudPayload.getResponsable().getId() != null) {
            responsableRepository.findById(solicitudPayload.getResponsable().getId())
                    .ifPresent(existing::setResponsable);
        } else {
            existing.setResponsable(null);
        }

        return solicitudRepository.save(existing);
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
