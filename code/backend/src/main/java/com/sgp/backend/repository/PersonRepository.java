package com.sgp.backend.repository;

import com.sgp.backend.entity.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PersonRepository extends JpaRepository<Person, Long> {
    List<Person> findByNameContainingIgnoreCase(String name);

    List<Person> findByType(String type);
}
