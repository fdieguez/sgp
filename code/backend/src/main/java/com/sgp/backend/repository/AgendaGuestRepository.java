package com.sgp.backend.repository;

import com.sgp.backend.entity.AgendaGuest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * Repositorio JPA para la administración de invitados frecuentes de Google Calendar.
 */
@Repository
public interface AgendaGuestRepository extends JpaRepository<AgendaGuest, Long> {

    List<AgendaGuest> findBySheetsConfigIdOrderByCreatedAtAsc(Long sheetsConfigId);

    void deleteBySheetsConfigIdAndId(Long sheetsConfigId, Long id);
}
