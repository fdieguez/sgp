package com.sgp.backend.service;

import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.entity.Person;
import com.sgp.backend.entity.Location;
import com.sgp.backend.entity.Responsable;
import com.sgp.backend.repository.SolicitudRepository;
import com.sgp.backend.repository.PersonRepository;
import com.sgp.backend.repository.LocationRepository;
import com.sgp.backend.repository.ResponsableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SolicitudService {

    private final SolicitudRepository solicitudRepository;
    private final PersonRepository personRepository;
    private final LocationRepository locationRepository;
    private final ResponsableRepository responsableRepository;

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
