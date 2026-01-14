package com.sgp.backend.service;

import com.sgp.backend.entity.Person;
import com.sgp.backend.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PersonService {

    private final PersonRepository personRepository;

    public List<Person> getAllPersons() {
        return personRepository.findAll();
    }

    public List<Person> searchPersons(String query) {
        return personRepository.findByNameContainingIgnoreCase(query);
    }

    public Person createPerson(Person person) {
        return personRepository.save(person);
    }
}
