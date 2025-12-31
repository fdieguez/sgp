package com.sgp.backend.repository;

import com.sgp.backend.entity.Project;
import com.sgp.backend.entity.SheetsConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    Optional<Project> findBySheetsConfig(SheetsConfig sheetsConfig);
}
