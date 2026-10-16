package com.sgp.backend.service;

import com.sgp.backend.dto.PersonSummaryDTO;
import com.sgp.backend.entity.Person;
import com.sgp.backend.repository.PersonRepository;
import com.sgp.backend.repository.SolicitudRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Servicio encargado de la gestión de personas, búsqueda flexible tolerante y análisis 360° de solicitudes.
 */
@Service
@RequiredArgsConstructor
public class PersonService {

    private final PersonRepository personRepository;
    private final SolicitudRepository solicitudRepository;

    public List<Person> getAllPersons() {
        return personRepository.findAll();
    }

    public List<Person> searchPersons(String query) {
        return personRepository.findByNameContainingIgnoreCase(query);
    }

    public Person createPerson(Person person) {
        return personRepository.save(person);
    }

    /**
     * Búsqueda multi-columna (Nombre, Apellido, DNI) tolerante a mayúsculas y acentos con límite configurable (CDU-06).
     * Devuelve DTOs con el resumen contextual 360° precalculado (CDU-07).
     */
    @Transactional(readOnly = true)
    public List<PersonSummaryDTO> searchPersonsFlexible(String query, int limit) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }
        int effectiveLimit = (limit > 0 && limit <= 50) ? limit : 10;
        List<Person> persons = personRepository.searchFlexible(query.trim(), PageRequest.of(0, effectiveLimit));

        return persons.stream()
                .map(this::mapToSummaryDTO)
                .collect(Collectors.toList());
    }

    /**
     * Retorna las estadísticas e historial de solicitudes registradas para una persona específica (CDU-07).
     */
    @Transactional(readOnly = true)
    public PersonSummaryDTO getPersonStats(Long personId) {
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new RuntimeException("Persona no encontrada con ID: " + personId));
        return mapToSummaryDTO(person);
    }

    /**
     * Busca una persona por DNI para prevención de inconsistencias y duplicados (CDU-08).
     */
    @Transactional(readOnly = true)
    public Optional<PersonSummaryDTO> findByDni(String dni) {
        if (dni == null || dni.trim().isEmpty()) {
            return Optional.empty();
        }
        return personRepository.findByDni(dni.trim())
                .map(this::mapToSummaryDTO);
    }

    /**
     * Mapea la entidad Person y calcula sus métricas agregadas 360° en un solo paso.
     */
    private PersonSummaryDTO mapToSummaryDTO(Person person) {
        List<Object[]> statusCounts = solicitudRepository.countSolicitudesByPersonGroupByStatus(person.getId());

        long total = 0;
        long pendientes = 0;
        long enProceso = 0;
        long enResolucion = 0;
        long completadas = 0;
        long rechazadas = 0;
        long consideracion = 0;

        for (Object[] row : statusCounts) {
            String status = row[0] != null ? row[0].toString().toLowerCase() : "";
            long count = ((Number) row[1]).longValue();
            total += count;

            switch (status) {
                case "pendiente":
                    pendientes += count;
                    break;
                case "en proceso":
                    enProceso += count;
                    break;
                case "en resolucion":
                case "en resolución":
                    enResolucion += count;
                    break;
                case "completadas":
                case "completada":
                    completadas += count;
                    break;
                case "rechazada":
                case "cancelada":
                    rechazadas += count;
                    break;
                case "consideracion":
                case "consideración":
                    consideracion += count;
                    break;
                default:
                    break;
            }
        }

        String locationName = null;
        Long locationId = null;
        if (person.getLocation() != null) {
            locationId = person.getLocation().getId();
            locationName = person.getLocation().getName();
        }

        return PersonSummaryDTO.builder()
                .id(person.getId())
                .name(person.getName())
                .type(person.getType())
                .subType(person.getSubType())
                .dni(person.getDni())
                .phone(person.getPhone())
                .email(person.getEmail())
                .address(person.getAddress())
                .locationId(locationId)
                .locationName(locationName)
                .totalSolicitudes(total)
                .pendientes(pendientes)
                .enProceso(enProceso)
                .enResolucion(enResolucion)
                .completadas(completadas)
                .rechazadas(rechazadas)
                .consideracion(consideracion)
                .build();
    }
}
