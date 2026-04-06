package com.sgp.backend.repository;

import com.sgp.backend.entity.DocumentoAdjunto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentoAdjuntoRepository extends JpaRepository<DocumentoAdjunto, Long> {
    List<DocumentoAdjunto> findBySolicitudIdOrderByUploadedAtDesc(Long solicitudId);
}
