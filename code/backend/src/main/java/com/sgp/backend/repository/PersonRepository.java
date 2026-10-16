package com.sgp.backend.repository;

import com.sgp.backend.entity.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PersonRepository extends JpaRepository<Person, Long> {
    java.util.Optional<Person> findByName(String name);

    java.util.Optional<Person> findByDni(String dni);

    List<Person> findByNameContainingIgnoreCase(String name);

    List<Person> findByType(String type);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM Person p WHERE " +
            "LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(COALESCE(p.dni, '')) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Person> searchFlexible(@org.springframework.data.repository.query.Param("query") String query, org.springframework.data.domain.Pageable pageable);
}
