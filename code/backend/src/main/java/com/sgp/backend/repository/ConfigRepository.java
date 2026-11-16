package com.sgp.backend.repository;

import com.sgp.backend.entity.Config;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio JPA para consultar y persistir la configuración y versión de base de datos.
 */
@Repository
public interface ConfigRepository extends JpaRepository<Config, Long> {

    /**
     * Obtiene el último registro de configuración cargado.
     *
     * @return Configuración más reciente si existe.
     */
    Optional<Config> findTopByOrderByIdDesc();
}
