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
    private final ObjectMapper objectMapper;

    // New Repositories
    private final com.sgp.backend.repository.OrderRepository orderRepository;
    private final com.sgp.backend.repository.PersonRepository personRepository;

    @Transactional
    public Project syncProject(Long sheetsConfigId) {
        // 1. Fetch Config
        SheetsConfig config = sheetsConfigRepository.findById(sheetsConfigId)
                .orElseThrow(() -> new RuntimeException("SheetsConfig not found with id: " + sheetsConfigId));

        try {
            // 2. Fetch Data from Google Sheets
            String range = "'" + config.getSheetName() + "'!A:Z";
            List<List<Object>> rawData = googleSheetsService.readSheet(config.getSpreadsheetId(), range);

            // AUTO-DETECT HEADERS logic...
            int headerRowIndex = 0;
            if (rawData != null && !rawData.isEmpty()) {
                int maxNonEmptyCount = -1;
                int scanLimit = Math.min(rawData.size(), 10);

                for (int i = 0; i < scanLimit; i++) {
                    List<Object> row = rawData.get(i);
                    int count = 0;
                    if (row != null) {
                        for (Object cell : row) {
                            if (cell != null && !cell.toString().trim().isEmpty()) {
                                count++;
                            }
                        }
                    }
                    if (count > maxNonEmptyCount) {
                        maxNonEmptyCount = count;
                        headerRowIndex = i;
                    }
                }

                if (headerRowIndex > 0) {
                    rawData = new java.util.ArrayList<>(rawData.subList(headerRowIndex, rawData.size()));
                }
            }

            // 3. Convert to JSON (Keep existing logic for backup)
            String jsonContent = objectMapper.writeValueAsString(rawData);

            // 4. Find or Create Project
            Optional<Project> existingProject = projectRepository.findBySheetsConfig(config);
            Project project;
            if (existingProject.isPresent()) {
                project = existingProject.get();
                project.setDataJson(jsonContent);
                project.setLastUpdate();
                project.setUpdatedAt(LocalDateTime.now());
            } else {
                project = new Project();
                project.setName("Proyectos de " + config.getSheetName());
                project.setSheetsConfig(config);
                project.setDataJson(jsonContent);
                project.setCreatedAt(LocalDateTime.now());
                project.setUpdatedAt(LocalDateTime.now());
            }
            Project savedProject = projectRepository.save(project);

            // 5. HYBRID SYNC: Parse rows to Entities
            if (rawData != null && rawData.size() > 1) { // Skip header
                List<List<Object>> dataRows = rawData.subList(1, rawData.size());
                processRows(dataRows);
            }

            // 6. Update Config Status
            config.setLastSync(LocalDateTime.now());
            config.setStatus("SUCCESS");
            sheetsConfigRepository.save(config);

            return savedProject;

        } catch (Exception e) {
            e.printStackTrace(); // Log error
            config.setStatus("ERROR: " + e.getMessage());
            sheetsConfigRepository.save(config);
            throw new RuntimeException("Failed to sync project: " + e.getMessage(), e);
        }
    }

    private void processRows(List<List<Object>> rows) {
        // ASSUMPTION:
        // Col 0: Date
        // Col 1: Person Name
        // Col 2: Description
        // Col 3: Origin
        for (List<Object> row : rows) {
            try {
                if (row.size() < 2)
                    continue; // Skip empty/invalid rows

                String dateStr = getValue(row, 0);
                String personName = getValue(row, 1);
                String description = getValue(row, 2);
                String origin = getValue(row, 3);

                if (personName.isEmpty())
                    continue;

                // 1. Find or Create Person
                String finalName = personName; // Effective final for lambda
                com.sgp.backend.entity.Person person = personRepository.findByNameContainingIgnoreCase(personName)
                        .stream().findFirst() // Simple duplicate check
                        .orElseGet(() -> {
                            return personRepository.save(com.sgp.backend.entity.Person.builder()
                                    .name(finalName)
                                    .type("INDIVIDUAL") // Default
                                    .build());
                        });

                // 2. Create Order (Avoid duplicates usually by checking exact match of fields?)
                // For MVP: We will create a new order if description doesn't match last one for
                // this person.
                // A better approach for sync is checking if hash exists, but let's keep it
                // simple.
                // We check if this person has an order with same description on same day.

                java.time.LocalDate entryDate = parseDate(dateStr);

                boolean exists = orderRepository.findByPersonId(person.getId()).stream()
                        .anyMatch(o -> o.getDescription() != null && o.getDescription().equals(description)
                                && o.getEntryDate().equals(entryDate));

                if (!exists) {
                    com.sgp.backend.entity.Order order = com.sgp.backend.entity.Order.builder()
                            .person(person)
                            .description(description)
                            .origin(origin.isEmpty() ? "IMPORTED" : origin)
                            .entryDate(entryDate)
                            .status("PENDING")
                            .build();
                    orderRepository.save(order);
                }

            } catch (Exception e) {
                System.err.println("Error processing row: " + row + " -> " + e.getMessage());
            }
        }
    }

    private String getValue(List<Object> row, int index) {
        if (index >= row.size() || row.get(index) == null)
            return "";
        return row.get(index).toString().trim();
    }

    private java.time.LocalDate parseDate(String dateStr) {
        try {
            if (dateStr.isEmpty())
                return java.time.LocalDate.now();
            // Basic parsing, improve as needed (e.g. DD/MM/YYYY)
            // Google sheets often sends "DD/MM/YYYY" or "YYYY-MM-DD"
            return java.time.LocalDate.now(); // Placeholder for safer sync first
        } catch (Exception e) {
            return java.time.LocalDate.now();
        }
    }
}
