package com.sgp.backend.repository;

import com.sgp.backend.entity.Solicitud;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SolicitudRepository extends JpaRepository<Solicitud, Long>,
        org.springframework.data.jpa.repository.JpaSpecificationExecutor<Solicitud> {
    List<Solicitud> findByStatus(String status);

    List<Solicitud> findByPersonId(Long personId);

    List<Solicitud> findBySheetsConfigId(Long configId);

    long countByStatus(String status);

    @org.springframework.data.jpa.repository.Query("SELECT s.origin, COUNT(s) FROM Solicitud s GROUP BY s.origin")
    List<Object[]> countSolicitudesByOrigin();

    @org.springframework.data.jpa.repository.Query("SELECT SUM(s.amount) FROM Subsidio s WHERE s.status = :status")
    java.math.BigDecimal sumSubsidiosAmountByStatus(String status);
}
