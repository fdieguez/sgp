package com.sgp.backend.repository;

import com.sgp.backend.entity.SheetsConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SheetsConfigRepository extends JpaRepository<SheetsConfig, Long> {
    List<SheetsConfig> findByStatus(String status);
}
