package com.sgp.backend.controller;

import com.sgp.backend.entity.Person;
import com.sgp.backend.service.PersonService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/persons")
@RequiredArgsConstructor
public class PersonController {

    private final PersonService personService;

    @GetMapping
    public List<Person> getAllPersons(@RequestParam(required = false) String search) {
        if (search != null && !search.isEmpty()) {
            return personService.searchPersons(search);
        }
        return personService.getAllPersons();
    }

    /**
     * Endpoint de búsqueda flexible multi-columna (nombre, apellido, DNI) tolerante a mayúsculas y acentos (CDU-06).
     * Incluye datos de vista 360° en la respuesta (CDU-07).
     */
    @GetMapping("/search")
    public ResponseEntity<List<com.sgp.backend.dto.PersonSummaryDTO>> searchPersons(
            @RequestParam(name = "q", defaultValue = "") String query,
            @RequestParam(name = "limit", defaultValue = "10") int limit) {
        return ResponseEntity.ok(personService.searchPersonsFlexible(query, limit));
    }

    /**
     * Endpoint para obtener el resumen contextual 360° del historial de un solicitante (CDU-07).
     */
    @GetMapping("/{id}/stats")
    public ResponseEntity<com.sgp.backend.dto.PersonSummaryDTO> getPersonStats(@PathVariable Long id) {
        return ResponseEntity.ok(personService.getPersonStats(id));
    }

    /**
     * Endpoint para consultar una persona por su número de DNI y detectar colisiones o reutilizar datos (CDU-08).
     */
    @GetMapping("/by-dni/{dni}")
    public ResponseEntity<com.sgp.backend.dto.PersonSummaryDTO> getPersonByDni(@PathVariable String dni) {
        return personService.findByDni(dni)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Person> createPerson(@RequestBody Person person) {
        return ResponseEntity.ok(personService.createPerson(person));
    }
}
