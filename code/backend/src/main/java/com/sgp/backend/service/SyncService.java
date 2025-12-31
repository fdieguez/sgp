package com.sgp.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sgp.backend.entity.Project;
import com.sgp.backend.entity.SheetsConfig;
import com.sgp.backend.repository.ProjectRepository;
import com.sgp.backend.repository.SheetsConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SyncService {

    private final GoogleSheetsService googleSheetsService;
    private final SheetsConfigRepository sheetsConfigRepository;
    private final ProjectRepository projectRepository;
    private final ObjectMapper objectMapper; // Spring Boot auto-configures this

    @Transactional
    public Project syncProject(Long sheetsConfigId) {
        // 1. Fetch Config
        SheetsConfig config = sheetsConfigRepository.findById(sheetsConfigId)
                .orElseThrow(() -> new RuntimeException("SheetsConfig not found with id: " + sheetsConfigId));

        try {
            // 2. Fetch Data from Google Sheets
            // Assuming range is NOT null, or we construct it via SheetName
            // If the SheetsConfig stores just "Sheet1", we might want to fetch everything
            // (e.g. "Sheet1!A:Z")
            // For now, let's assume we fetch a reasonable range or the whole sheet name.
            // But GoogleSheetsService.readSheet takes (id, range).
            // Let's assume config.getSheetName() acts as the range prefix.
            String range = "'" + config.getSheetName() + "'!A:Z"; // Quoted for safety with spaces
            List<List<Object>> rawData = googleSheetsService.readSheet(config.getSpreadsheetId(), range);

            // 3. Convert to JSON
            String jsonContent = objectMapper.writeValueAsString(rawData);

            // 4. Find or Create Project
            // Logic: Is there already a project for this config?
            // Since we have @ManyToOne, we need to query ProjectRepository by SheetsConfig
            Optional<Project> existingProject = projectRepository.findBySheetsConfig(config);

            Project project;
            if (existingProject.isPresent()) {
                project = existingProject.get();
                project.setDataJson(jsonContent);
                project.setLastUpdate(); // Trigger @PreUpdate manually if needed, or rely on entity lifecycle
                project.setUpdatedAt(LocalDateTime.now());
            } else {
                project = new Project();
                project.setName("Project from " + config.getSheetName()); // Default name
                project.setSheetsConfig(config);
                project.setDataJson(jsonContent);
                project.setCreatedAt(LocalDateTime.now());
                project.setUpdatedAt(LocalDateTime.now());
            }

            // 5. Save Project
            Project savedProject = projectRepository.save(project);

            // 6. Update Config Status
            config.setLastSync(LocalDateTime.now());
            config.setStatus("SUCCESS");
            sheetsConfigRepository.save(config);

            return savedProject;

        } catch (Exception e) {
            config.setStatus("ERROR: " + e.getMessage());
            sheetsConfigRepository.save(config);
            throw new RuntimeException("Failed to sync project: " + e.getMessage(), e);
        }
    }
}
