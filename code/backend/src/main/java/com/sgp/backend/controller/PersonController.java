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

    @PostMapping
    public ResponseEntity<Person> createPerson(@RequestBody Person person) {
        return ResponseEntity.ok(personService.createPerson(person));
    }
}
