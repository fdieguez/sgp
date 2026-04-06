package com.sgp.backend.repository;

import com.sgp.backend.entity.ResolutorConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResolutorConfigRepository extends JpaRepository<ResolutorConfig, Long> {
    Optional<ResolutorConfig> findByTipoResolucionIgnoreCase(String tipoResolucion);
}
