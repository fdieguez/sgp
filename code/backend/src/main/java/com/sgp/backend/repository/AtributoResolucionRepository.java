package com.sgp.backend.repository;

import com.sgp.backend.entity.AtributoResolucion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AtributoResolucionRepository extends JpaRepository<AtributoResolucion, Long> {
    List<AtributoResolucion> findByActivoTrue();
}
