package com.sgp.backend.repository;

import com.sgp.backend.entity.SolicitudResolutorAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SolicitudResolutorAssignmentRepository extends JpaRepository<SolicitudResolutorAssignment, Long> {
    List<SolicitudResolutorAssignment> findBySolicitudId(Long solicitudId);
    List<SolicitudResolutorAssignment> findByResolutorId(Long resolutorId);
}
