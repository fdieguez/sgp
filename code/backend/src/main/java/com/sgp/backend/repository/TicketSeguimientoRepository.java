package com.sgp.backend.repository;

import com.sgp.backend.entity.TicketSeguimiento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketSeguimientoRepository extends JpaRepository<TicketSeguimiento, Long> {
    List<TicketSeguimiento> findBySolicitudIdOrderByFechaDesc(Long solicitudId);
}
