package com.sgp.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sgp.backend.entity.Project;
import com.sgp.backend.entity.SheetsConfig;
import com.sgp.backend.entity.Person;
import com.sgp.backend.entity.Location;
import com.sgp.backend.entity.Responsable;
import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.entity.Pedido;
import com.sgp.backend.entity.Subsidio;
import com.sgp.backend.repository.ProjectRepository;
import com.sgp.backend.repository.SheetsConfigRepository;
import com.sgp.backend.repository.SolicitudRepository;
import com.sgp.backend.repository.ResponsableRepository;
import com.sgp.backend.repository.PersonRepository;
import com.sgp.backend.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SyncService {

    private final GoogleSheetsService googleSheetsService;
    private final SheetsConfigRepository sheetsConfigRepository;
    private final ProjectRepository projectRepository;
    private final ObjectMapper objectMapper;

    // New Repositories
    private final com.sgp.backend.repository.SolicitudRepository solicitudRepository;
    private final com.sgp.backend.repository.ResponsableRepository responsableRepository;
    private final com.sgp.backend.repository.PersonRepository personRepository;
    private final com.sgp.backend.repository.LocationRepository locationRepository;

    // EntityManager for session management
    private final jakarta.persistence.EntityManager entityManager;

    @Transactional
    public Project syncProject(Long sheetsConfigId) {
        // ... (Keep existing logic until processRows call) ...
        log.info("Starting sync for SheetsConfig ID: {}", sheetsConfigId);

        // 1. Fetch Config
        SheetsConfig config = sheetsConfigRepository.findById(sheetsConfigId)
                .orElseThrow(() -> new RuntimeException("SheetsConfig not found with id: " + sheetsConfigId));

        log.info("Found Config: {} (SpreadsheetID: {})", config.getSheetName(), config.getSpreadsheetId());

        try {
            // 2. Fetch Data from Google Sheets
            String range = "'" + config.getSheetName() + "'!A:Z";
            log.info("Fetching data from Google Sheets with range: {}", range);

            List<List<Object>> rawData = googleSheetsService.readSheet(config.getSpreadsheetId(), range);
            log.info("Fetched {} rows from Google Sheets", rawData != null ? rawData.size() : 0);

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
                    log.info("Detected header at row index: {}", headerRowIndex);
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
                log.info("Updating existing Project ID: {}", project.getId());
                project.setDataJson(jsonContent);
                project.setLastUpdate();
                project.setUpdatedAt(LocalDateTime.now());
            } else {
                project = new Project();
                log.info("Creating new Project for Sheet: {}", config.getSheetName());
                project.setName("Proyectos de " + config.getSheetName());
                project.setSheetsConfig(config);
                project.setDataJson(jsonContent);
                project.setCreatedAt(LocalDateTime.now());
                project.setUpdatedAt(LocalDateTime.now());
            }
            Project savedProject = projectRepository.save(project);
            log.info("Project saved successfully. ID: {}", savedProject.getId());

            // 5. HYBRID SYNC: Parse rows to Entities
            if (rawData != null && rawData.size() > 1) { // Skip header
                log.info("Starting Hybrid Sync processing for {} rows...", rawData.size() - 1);
                List<List<Object>> dataRows = rawData.subList(1, rawData.size());
                processRows(dataRows, config);
            } else {
                log.warn("Not enough data rows to process hybrid sync (Size: {})",
                        rawData != null ? rawData.size() : "null");
            }

            // 6. Update Config Status
            config.setLastSync(LocalDateTime.now());
            config.setStatus("SUCCESS");
            sheetsConfigRepository.save(config);
            log.info("Sync completed successfully for Config ID: {}", config.getId());

            return savedProject;

        } catch (Exception e) {
            log.error("Sync FAILED for Config ID: {}", config.getId(), e);
            config.setStatus("ERROR: " + e.getMessage());
            sheetsConfigRepository.save(config);
            throw new RuntimeException("Failed to sync project: " + e.getMessage(), e);
        }
    }

    private void processRows(List<List<Object>> rows, SheetsConfig config) {
        int createdCount = 0;
        int errorCount = 0;

        for (List<Object> row : rows) {
            try {
                if (row.size() < 5)
                    continue; // Skip empty/invalid rows

                // Extract columns
                String orderNumber = getValue(row, 0); // Not used currently?
                String entryDateStr = getValue(row, 1);
                // Col 2 Mes skipped
                String origin = getValue(row, 3);
                String personName = getValue(row, 4);
                String localidad = getValue(row, 5);
                String barrio = getValue(row, 6);
                String phone = getValue(row, 7);
                String solicitudDesc = getValue(row, 8);
                // Col 9 ZONA skipped
                String responsableName = getValue(row, 11); // Changed index based on previous comments? Wait, map says
                                                            // 11 is RESPONSABLE. Correct.
                String contactDateStr = getValue(row, 12);
                String resolutionDateStr = getValue(row, 13);
                String resolucion = getValue(row, 14);
                String detalle = getValue(row, 15);
                String observacion = getValue(row, 16);
                String montoStr = getValue(row, 17);
                // Col 18 CONTROL skipped

                // Skip if no person name
                if (personName.isEmpty())
                    continue;

                // 1. Find or Create Location (CITY)
                com.sgp.backend.entity.Location cityLocation = null;
                if (!localidad.isEmpty()) {
                    cityLocation = findOrCreateCity(localidad);

                    // If barrio exists, create/find it as NEIGHBORHOOD
                    if (!barrio.isEmpty()) {
                        findOrCreateNeighborhood(barrio, cityLocation);
                    }
                }

                // 2. Find or Create Person
                com.sgp.backend.entity.Person person = findOrCreatePerson(personName, phone, barrio, cityLocation); // Barrio
                                                                                                                    // as
                                                                                                                    // address?

                // 3. Find or Create Responsable
                com.sgp.backend.entity.Responsable responsable = null;
                if (!responsableName.isEmpty()) {
                    responsable = findOrCreateResponsable(responsableName);
                }

                // 4. Parse Dates
                java.time.LocalDate entryDate = parseDate(entryDateStr);

                // 5. Check for duplicates
                String finalSolicitud = solicitudDesc;
                boolean exists = solicitudRepository.findByPersonId(person.getId()).stream()
                        .anyMatch(s -> s.getDescription() != null && s.getDescription().equals(finalSolicitud)
                                && s.getEntryDate().equals(entryDate));

                if (!exists) {
                    // Determine status
                    String status = "PENDING";
                    if (!resolucion.isEmpty()) {
                        if (resolucion.equalsIgnoreCase("COMPLETADO") || resolucion.equalsIgnoreCase("RESUELTO")
                                || resolucion.equalsIgnoreCase("FINALIZADO")) {
                            status = "COMPLETED";
                        } else if (resolucion.equalsIgnoreCase("EN PROCESO")
                                || resolucion.equalsIgnoreCase("EN PROGRESO")) {
                            status = "IN_PROGRESS";
                        } else if (resolucion.equalsIgnoreCase("RECHAZADO")) {
                            status = "REJECTED";
                        }
                    }

                    // Determine Type: Subsidio vs Pedido
                    java.math.BigDecimal amount = parseAmount(montoStr);
                    boolean isSubsidio = amount != null && amount.compareTo(java.math.BigDecimal.ZERO) > 0;

                    com.sgp.backend.entity.Solicitud newSolicitud;

                    if (isSubsidio) {
                        newSolicitud = com.sgp.backend.entity.Subsidio.builder()
                                .person(person)
                                .description(solicitudDesc) // + (detalle.isEmpty() ? "" : " - " + detalle) ?
                                .origin(origin.isEmpty() ? "IMPORTED" : origin.toUpperCase())
                                .entryDate(entryDate)
                                .status(status)
                                .location(cityLocation)
                                .responsable(responsable)
                                .sheetsConfig(config)
                                .amount(amount)
                                .grantDate(parseDate(resolutionDateStr)) // Assuming grant date is resolution date
                                .build();
                    } else {
                        newSolicitud = com.sgp.backend.entity.Pedido.builder()
                                .person(person)
                                .description(solicitudDesc)
                                .origin(origin.isEmpty() ? "IMPORTED" : origin.toUpperCase())
                                .entryDate(entryDate)
                                .status(status)
                                .location(cityLocation)
                                .responsable(responsable)
                                .sheetsConfig(config)
                                .build();
                    }

                    solicitudRepository.save(newSolicitud);
                    createdCount++;
                }

            } catch (Exception e) {
                errorCount++;
                log.error("Error processing row: {}", row, e);
                try {
                    entityManager.clear();
                } catch (Exception clearEx) {
                    log.warn("Could not clear EntityManager: {}", clearEx.getMessage());
                }
            }
        }
        log.info("Hybrid Sync finished. Created Solicitudes: {}, Row Errors: {}", createdCount, errorCount);
    }

    private com.sgp.backend.entity.Responsable findOrCreateResponsable(String name) {
        try {
            return responsableRepository.findByName(name)
                    .orElseGet(() -> responsableRepository.save(com.sgp.backend.entity.Responsable.builder()
                            .name(name)
                            .build()));
        } catch (Exception e) {
            log.error("Failed to find/create responsable: {}", name);
            return null;
        }
    }

    private java.math.BigDecimal parseAmount(String amountStr) {
        if (amountStr == null || amountStr.trim().isEmpty())
            return java.math.BigDecimal.ZERO;
        try {
            // Remove $ and spaces, replace comma with dot if needed?
            // Ideally localized parsing, but simple cleanup for now:
            String clean = amountStr.replace("$", "").replace(".", "").replace(",", ".").trim();
            // CAUTION: Removing all dots assuming they are thousand separators and comma is
            // decimal?
            // Or standard US format?
            // If "1.000,00" -> remove dot -> "1000,00" -> replace comma -> "1000.00" ->
            // Correct.
            // If "1000" -> "1000".
            // If "100,50" -> "100.50".
            return new java.math.BigDecimal(clean);
        } catch (Exception e) {
            return java.math.BigDecimal.ZERO;
        }
    }

    private String getValue(List<Object> row, int index) {
        if (index >= row.size() || row.get(index) == null)
            return "";
        return row.get(index).toString().trim();
    }

    private String truncateString(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        log.warn("Truncating value from {} to {} chars: {}", value.length(), maxLength,
                value.substring(0, Math.min(50, value.length())) + "...");
        return value.substring(0, maxLength);
    }

    private java.time.LocalDate parseDate(String dateStr) {
        try {
            if (dateStr == null || dateStr.isEmpty())
                return java.time.LocalDate.now();

            // Try DD/MM/YYYY format first (most common in Google Sheets for Spanish locale)
            if (dateStr.contains("/")) {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d/M/yyyy");
                return java.time.LocalDate.parse(dateStr, formatter);
            }

            // Try ISO format YYYY-MM-DD
            if (dateStr.contains("-")) {
                return java.time.LocalDate.parse(dateStr);
            }

            // If no separator, assume it's a number (Excel serial date)
            // For now, default to today
            log.warn("Unable to parse date: {}, using today", dateStr);
            return java.time.LocalDate.now();
        } catch (Exception e) {
            log.warn("Error parsing date '{}': {}, using today", dateStr, e.getMessage());
            return java.time.LocalDate.now();
        }
    }

    private com.sgp.backend.entity.Location findOrCreateCity(String cityName) {
        try {
            return locationRepository.findByType("CITY").stream()
                    .filter(loc -> loc.getName().equalsIgnoreCase(cityName))
                    .findFirst()
                    .orElseGet(() -> {
                        // log.info("Creating new City: {}", cityName);
                        com.sgp.backend.entity.Location newCity = com.sgp.backend.entity.Location.builder()
                                .name(cityName)
                                .type("CITY")
                                .build();
                        com.sgp.backend.entity.Location saved = locationRepository.save(newCity);
                        // log.info("City created with ID: {}", saved.getId());
                        return saved;
                    });
        } catch (Exception e) {
            log.error("FAILED to find/create city '{}'", cityName, e);
            throw e;
        }
    }

    private com.sgp.backend.entity.Location findOrCreateNeighborhood(String neighborhoodName,
            com.sgp.backend.entity.Location parentCity) {
        if (parentCity == null || parentCity.getId() == null) {
            log.warn("Cannot create neighborhood '{}': parent city is null or has no ID", neighborhoodName);
            return null;
        }

        try {
            return locationRepository.findByParent(parentCity).stream()
                    .filter(loc -> loc.getName().equalsIgnoreCase(neighborhoodName))
                    .findFirst()
                    .orElseGet(() -> {
                        // log.info("Creating new Neighborhood: {} under City: {}", neighborhoodName,
                        // parentCity.getName());
                        com.sgp.backend.entity.Location neighborhood = com.sgp.backend.entity.Location.builder()
                                .name(neighborhoodName)
                                .type("NEIGHBORHOOD")
                                .parent(parentCity)
                                .build();
                        com.sgp.backend.entity.Location saved = locationRepository.save(neighborhood);
                        // log.info("Neighborhood created with ID: {}", saved.getId());
                        return saved;
                    });
        } catch (Exception e) {
            log.error("FAILED to find/create neighborhood '{}' under city '{}'", neighborhoodName,
                    parentCity.getName(), e);
            throw e;
        }
    }

    private com.sgp.backend.entity.Person findOrCreatePerson(String name, String phone, String address,
            com.sgp.backend.entity.Location location) {
        try {
            // Try to find existing person by name
            List<com.sgp.backend.entity.Person> existingPersons = personRepository.findByNameContainingIgnoreCase(name);

            if (!existingPersons.isEmpty()) {
                // Person exists, update if needed
                com.sgp.backend.entity.Person person = existingPersons.get(0);
                // log.debug("Found existing Person: {} (ID: {})", name, person.getId());
                boolean updated = false;

                if ((person.getPhone() == null || person.getPhone().isEmpty()) && phone != null && !phone.isEmpty()) {
                    person.setPhone(phone);
                    updated = true;
                }
                if ((person.getAddress() == null || person.getAddress().isEmpty()) && address != null
                        && !address.isEmpty()) {
                    person.setAddress(address);
                    updated = true;
                }
                if (person.getLocation() == null && location != null) {
                    person.setLocation(location);
                    updated = true;
                }

                if (updated) {
                    // log.debug("Updating Person: {}", name);
                    return personRepository.save(person);
                }
                return person;
            }

            // Person doesn't exist, create new one
            // log.info("Creating new Person: {} (phone: {}, location: {})", name, phone,
            // location != null ? location.getName() : "none");

            // Truncate long values to prevent DB constraints violations
            String safeName = truncateString(name, 1000);
            String safePhone = phone != null && !phone.isEmpty() ? truncateString(phone, 200) : null;
            String safeAddress = address != null && !address.isEmpty() ? truncateString(address, 500) : null;

            com.sgp.backend.entity.Person newPerson = com.sgp.backend.entity.Person.builder()
                    .name(safeName)
                    .type("INDIVIDUAL")
                    .phone(safePhone)
                    .address(safeAddress)
                    .location(location)
                    .build();

            com.sgp.backend.entity.Person saved = personRepository.save(newPerson);
            // log.info("Person created with ID: {}", saved.getId());
            return saved;
        } catch (Exception e) {
            log.error("FAILED to find/create person '{}'", name, e);
            throw e;
        }
    }
}
