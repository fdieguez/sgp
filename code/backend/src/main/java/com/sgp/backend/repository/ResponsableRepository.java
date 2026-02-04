package com.sgp.backend.repository;

import com.sgp.backend.entity.Responsable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ResponsableRepository extends JpaRepository<Responsable, Long> {
    Optional<Responsable> findByName(String name);
}
