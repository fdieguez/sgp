package com.sgp.backend.repository;

import com.sgp.backend.entity.AsignacionHistorial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AsignacionHistorialRepository extends JpaRepository<AsignacionHistorial, Long> {
    List<AsignacionHistorial> findBySolicitudIdOrderByActionDateDesc(Long solicitudId);
}
