package com.sgp.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sgp.backend.entity.Project;
import com.sgp.backend.entity.SheetsConfig;
import com.sgp.backend.entity.Person;
import com.sgp.backend.entity.Location;
import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.entity.SolicitudResolutorAssignment;
import com.sgp.backend.entity.AsignacionHistorial;
import com.sgp.backend.repository.ProjectRepository;
import com.sgp.backend.repository.SheetsConfigRepository;
import com.sgp.backend.repository.SolicitudRepository;
import com.sgp.backend.repository.UserRepository;
import com.sgp.backend.repository.PersonRepository;
import com.sgp.backend.repository.LocationRepository;
import com.sgp.backend.repository.AsignacionHistorialRepository;
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
    private final com.sgp.backend.repository.UserRepository userRepository;
    private final com.sgp.backend.repository.PersonRepository personRepository;
    private final com.sgp.backend.repository.LocationRepository locationRepository;
    private final AsignacionHistorialRepository asignacionHistorialRepository;

    // EntityManager for session management
    private final jakarta.persistence.EntityManager entityManager;

    private final EmailService emailService;

    // URL del frontend para armar los links seguros de descarga de adjuntos
    @org.springframework.beans.factory.annotation.Value("${sgp.frontend.url:http://localhost:5173}")
    private String sgpFrontendUrl;

    @Transactional
    public Project syncProject(Long sheetsConfigId, boolean fullSync) {
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
                log.info("Starting Hybrid Sync processing for {} rows... (Full Sync: {})", rawData.size() - 1,
                        fullSync);
                List<List<Object>> dataRows = rawData.subList(1, rawData.size());
                processRows(dataRows, config, fullSync);
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

    private void processRows(List<List<Object>> rows, SheetsConfig config, boolean fullSync) {
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
                String zone = getValue(row, 9);
                // Col 10?
                String responsableName = getValue(row, 11);
                String contactDateStr = getValue(row, 12);
                String resolutionDateStr = getValue(row, 13);
                String resolucion = getValue(row, 14);
                String detalle = getValue(row, 15);
                String observacion = getValue(row, 16);
                String montoStr = getValue(row, 17);
                String controlStr = getValue(row, 18); // Control 1er Contacto

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
                com.sgp.backend.entity.Person person = findOrCreatePerson(personName, phone, barrio, cityLocation);

                // 3. Find or Create Responsable
                com.sgp.backend.entity.User responsable = null;
                if (!responsableName.isEmpty()) {
                    responsable = findOrCreateResponsable(responsableName);
                }

                // 4. Parse Dates & Booleans
                java.time.LocalDate entryDate = parseDate(entryDateStr);
                boolean isFirstContactOk = controlStr.equalsIgnoreCase("SI") || controlStr.equalsIgnoreCase("YES")
                        || controlStr.equalsIgnoreCase("OK");

                // Filter by Time Window if NOT Full Sync
                if (!fullSync && config.getSyncWindowDays() != null && config.getSyncWindowDays() > 0) {
                    java.time.LocalDate cutoffDate = java.time.LocalDate.now().minusDays(config.getSyncWindowDays());
                    if (entryDate.isBefore(cutoffDate)) {
                        continue; // Skip old rows in incremental sync
                    }
                }

                // 5. Check for duplicates
                String finalSolicitud = solicitudDesc;
                boolean exists = solicitudRepository.findByPersonId(person.getId()).stream()
                        .anyMatch(s -> s.getDescription() != null && s.getDescription().equals(finalSolicitud)
                                && s.getEntryDate().equals(entryDate));

                if (!exists) {
                    // Determine status
                    String status = "pendiente";
                    if (!resolucion.isEmpty()) {
                        if (resolucion.equalsIgnoreCase("COMPLETADO") || resolucion.equalsIgnoreCase("RESUELTO")
                                || resolucion.equalsIgnoreCase("FINALIZADO")
                                || resolucion.equalsIgnoreCase("ENTREGADO")
                                || resolucion.equalsIgnoreCase("COMPLETADAS")) {
                            status = "completadas";
                        } else if (resolucion.equalsIgnoreCase("EN PROCESO")
                                || resolucion.equalsIgnoreCase("EN PROGRESO")) {
                            status = "en proceso";
                        } else if (resolucion.equalsIgnoreCase("RECHAZADO")
                                || resolucion.equalsIgnoreCase("CANCELADO")) {
                            status = "rechazada";
                        }
                    }

                    // Determine Type: Subsidio vs Pedido
                    java.math.BigDecimal amount = parseAmount(montoStr);
                    boolean isSubsidio = amount != null && amount.compareTo(java.math.BigDecimal.ZERO) > 0;

                    com.sgp.backend.entity.Solicitud newSolicitud = com.sgp.backend.entity.Solicitud.builder()
                            .type(isSubsidio ? "SUBSIDIO" : "PEDIDO")
                            .person(person)
                            .description(solicitudDesc)
                            .origin(origin.isEmpty() ? "IMPORTED" : origin.toUpperCase())
                            .entryDate(entryDate)
                            .status(status)
                            .location(cityLocation)
                            .responsable(responsable)
                            .sheetsConfig(config)
                            .zone(zone)
                            .contactDate(parseDate(contactDateStr))
                            .resolutionDate(parseDate(resolutionDateStr))
                            .resolution(resolucion)
                            .detail(detalle)
                            .observation(observacion)
                            .firstContactControl(isFirstContactOk)
                            .amount(isSubsidio ? amount : null)
                            .grantDate(isSubsidio ? parseDate(resolutionDateStr) : null)
                            .build();

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

    private com.sgp.backend.entity.User findOrCreateResponsable(String name) {
        try {
            return userRepository.findByEmail(name.replaceAll("\\s+", "").toLowerCase() + "@sync.local")
                    .orElseGet(() -> {
                        com.sgp.backend.entity.User u = new com.sgp.backend.entity.User();
                        u.setFirstName(name);
                        u.setLastName("");
                        u.setEmail(name.replaceAll("\\s+", "").toLowerCase() + "@sync.local");
                        u.setPassword(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("1234.5"));
                        u.setRole("RESPONSABLE");
                        return userRepository.save(u);
                    });
        } catch (Exception e) {
            log.error("Failed to find/create responsable user: {}", name);
            return null;
        }
    }

    private java.math.BigDecimal parseAmount(String amountStr) {
        if (amountStr == null || amountStr.trim().isEmpty())
            return null;
        try {
            // Remove $ and spaces, replace comma with dot if needed
            String clean = amountStr.replace("$", "").replace(".", "").replace(",", ".").trim();
            return new java.math.BigDecimal(clean);
        } catch (Exception e) {
            return null;
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

    /* ── Métodos para Planilla de Salida (Etapa 8) ───────────────────── */

    /**
     * Busca las solicitudes de Subsidio en estado 'CONSIDERACION' y las escribe en la planilla de Google Sheets.
     * Si se pasa una lista de IDs no vacía, realiza una exportación selectiva agregando las filas al final de la planilla.
     * Genera links seguros para los adjuntos apuntando al frontend.
     */
    @Transactional
    public int exportarPlanillaSalida(String spreadsheetId, List<Long> ids) throws Exception {
        SheetsConfig config = sheetsConfigRepository.findBySpreadsheetId(spreadsheetId)
                .stream()
                .filter(c -> c.getSheetName() != null && 
                             !c.getSheetName().toUpperCase().contains("AGENDA") && 
                             !c.getSheetName().toUpperCase().contains("DECLARACION") && 
                             !c.getSheetName().toUpperCase().contains("DECLARACIÓN"))
                .findFirst()
                .orElseGet(() -> sheetsConfigRepository.findBySpreadsheetId(spreadsheetId)
                        .stream().findFirst()
                        .orElseThrow(() -> new RuntimeException("No se encontró la configuración para el spreadsheetId: " + spreadsheetId)));
        String sheetName = config.getSheetName();

        boolean isSelective = ids != null && !ids.isEmpty();
        log.info("Iniciando exportación de solicitudes en CONSIDERACION a la planilla de salida (selectiva: {}): {}", isSelective, spreadsheetId);
        
        List<Solicitud> solicitudes = solicitudRepository.findAll().stream()
                .filter(s -> isSelective ? ids.contains(s.getId()) : "CONSIDERACION".equalsIgnoreCase(s.getStatus()))
                .toList();

        if (solicitudes.isEmpty()) {
            log.info("No hay solicitudes en estado CONSIDERACION para exportar.");
            return 0;
        }

        // 1. Leer las primeras dos filas de cabecera de la hoja
        List<List<Object>> headers = null;
        try {
            headers = googleSheetsService.readSheet(spreadsheetId, "'" + sheetName + "'!A1:AD2");
        } catch (Exception e) {
            log.warn("Error leyendo cabeceras de Google Sheets, se asume planilla vacía", e);
        }

        boolean needsHeader = (headers == null || headers.isEmpty() || headers.get(0).isEmpty());

        if (needsHeader) {
            headers = new java.util.ArrayList<>();
            headers.add(List.of(
                "Responsable", "Localidad", "Barrio", "ZONA", "Como llega", "Solicitante", "TIPO DE PEDIDO", "Descripción", "Monto en dinero", "id", "APELLIDO Y NOMBRE", "", "", "", "OBSERVACIONES", "Nombre", "Dirección", "Nombre y Cargo Responsable", "DNI RESPONSABLE"
            ));
            headers.add(List.of(
                "", "", "", "", "", "", "", "", "", "", "APELLIDO Y NOMBRE", "DNI", "Telefono", "Empresa", "OBSERVACIONES", "Nombre", "Dirección", "Nombre y Cargo Responsable", "DNI RESPONSABLE"
            ));
            googleSheetsService.writeSheet(spreadsheetId, "'" + sheetName + "'!A1:S2", headers);
        }

        int maxCols = Math.max(headers.get(0).size(), headers.size() > 1 ? headers.get(1).size() : 0);
        java.util.Map<String, Integer> columnMapping = getColumnMapping(headers.get(0), headers.size() > 1 ? headers.get(1) : null);

        if (!columnMapping.containsKey("id")) {
            throw new IllegalArgumentException("La planilla no contiene la columna obligatoria 'IDENTIFICACIÓN' o 'IDENTIFICADOR' al principio. Por favor, agregue esta columna en la planilla para mapear el ID.");
        }

        List<List<Object>> dataRows = new java.util.ArrayList<>();

        for (Solicitud s : solicitudes) {
            java.util.Map<String, Object> detalleMap = getSubsidioDetalle(s);

            String localidadName = "";
            String barrioName = "";
            if (s.getLocation() != null) {
                if ("NEIGHBORHOOD".equalsIgnoreCase(s.getLocation().getType())) {
                    barrioName = s.getLocation().getName();
                    localidadName = s.getLocation().getParent() != null ? s.getLocation().getParent().getName() : "";
                } else {
                    localidadName = s.getLocation().getName();
                }
            }

            // Crear fila de tamaño maxCols rellena de cadenas vacías
            List<Object> rowValues = new java.util.ArrayList<>(java.util.Collections.nCopies(maxCols, ""));

            // Mapear cada valor a su columna correspondiente si está en el mapa
            setRowVal(rowValues, columnMapping, "id", s.getId().toString());
            setRowVal(rowValues, columnMapping, "fecha_ingreso", s.getEntryDate() != null ? s.getEntryDate().toString() : "");
            setRowVal(rowValues, columnMapping, "origen", s.getOrigin() != null ? s.getOrigin() : "");
            setRowVal(rowValues, columnMapping, "responsable", s.getResponsable() != null ? s.getResponsable().getFirstName() + " " + s.getResponsable().getLastName() : "");
            setRowVal(rowValues, columnMapping, "solicitante_nombre", s.getPerson() != null ? s.getPerson().getName() : "");
            setRowVal(rowValues, columnMapping, "localidad", localidadName);
            setRowVal(rowValues, columnMapping, "barrio", barrioName);
            setRowVal(rowValues, columnMapping, "descripcion", s.getDescription() != null ? s.getDescription() : "");
            setRowVal(rowValues, columnMapping, "monto_solicitado", s.getAmount() != null ? s.getAmount().toString() : "0");
            setRowVal(rowValues, columnMapping, "fecha_otorgamiento", s.getGrantDate() != null ? s.getGrantDate().toString() : "");
            setRowVal(rowValues, columnMapping, "por_donde", s.getPorDonde() != null ? s.getPorDonde() : "");

            // Atributos de resolución dinámicos
            setRowVal(rowValues, columnMapping, "tipo_pedido", getFieldValue(detalleMap, "Tipo de pedido"));
            setRowVal(rowValues, columnMapping, "pers_nombre", getFieldValue(detalleMap, "Nombre y apellido"));
            setRowVal(rowValues, columnMapping, "pers_dni", getFieldValue(detalleMap, "DNI"));
            setRowVal(rowValues, columnMapping, "pers_direccion", getFieldValue(detalleMap, "Dirección de DNI"));
            setRowVal(rowValues, columnMapping, "pers_dni_frente", buildAttachmentLink(detalleMap.get("DNI frente")));
            setRowVal(rowValues, columnMapping, "pers_dni_dorso", buildAttachmentLink(detalleMap.get("DNI dorso")));
            setRowVal(rowValues, columnMapping, "pers_cbu", buildAttachmentLink(detalleMap.get("Constancia de CBU")));

            setRowVal(rowValues, columnMapping, "inst_nombre", getFieldValue(detalleMap, "Nombre de institución"));
            setRowVal(rowValues, columnMapping, "inst_direccion", getFieldValue(detalleMap, "Dirección de institución"));
            setRowVal(rowValues, columnMapping, "inst_localidad", getFieldValue(detalleMap, "Localidad"));
            setRowVal(rowValues, columnMapping, "inst_resp1_nombre", getFieldValue(detalleMap, "Responsable 1: Nombre"));
            setRowVal(rowValues, columnMapping, "inst_resp1_dni", getFieldValue(detalleMap, "Responsable 1: DNI"));
            setRowVal(rowValues, columnMapping, "inst_resp1_cargo", getFieldValue(detalleMap, "Responsable 1: Cargo"));
            setRowVal(rowValues, columnMapping, "inst_resp2_nombre", getFieldValue(detalleMap, "Responsable 2: Nombre"));
            setRowVal(rowValues, columnMapping, "inst_resp2_dni", getFieldValue(detalleMap, "Responsable 2: DNI"));
            setRowVal(rowValues, columnMapping, "inst_resp2_cargo", getFieldValue(detalleMap, "Responsable 2: Cargo"));
            setRowVal(rowValues, columnMapping, "inst_nota_pedido", buildAttachmentLink(detalleMap.get("Nota de pedido")));

            dataRows.add(rowValues);
        }

        // Buscar filas existentes en Google Sheets para posicionamiento exacto
        List<List<Object>> existingSheetData = null;
        try {
            existingSheetData = googleSheetsService.readSheet(spreadsheetId, "'" + sheetName + "'!A1:AD300");
        } catch (Exception e) {
            log.warn("No se pudo leer el contenido previo para posicionamiento exacto", e);
        }

        int idColumnIdx = columnMapping.getOrDefault("id", 0);

        for (int i = 0; i < solicitudes.size(); i++) {
            Solicitud s = solicitudes.get(i);
            List<Object> row = dataRows.get(i);

            int targetRow = -1;
            if (existingSheetData != null) {
                // 1. Buscar si el ID ya existe en la planilla para actualizar esa fila
                for (int r = 2; r < existingSheetData.size(); r++) {
                    List<Object> currRow = existingSheetData.get(r);
                    if (currRow.size() > idColumnIdx) {
                        String cellVal = String.valueOf(currRow.get(idColumnIdx)).trim();
                        if (s.getId().toString().equals(cellVal)) {
                            targetRow = r + 1; // Fila 1-based
                            break;
                        }
                    }
                }

                // 2. Si no existe, buscar la primera fila donde la columna A (IDENTIFICADOR) esté vacía
                if (targetRow == -1) {
                    for (int r = 2; r < existingSheetData.size(); r++) {
                        List<Object> currRow = existingSheetData.get(r);
                        if (currRow.isEmpty() || currRow.size() <= idColumnIdx || currRow.get(idColumnIdx) == null || currRow.get(idColumnIdx).toString().trim().isEmpty()) {
                            targetRow = r + 1;
                            break;
                        }
                    }
                }
            }

            if (targetRow == -1) {
                targetRow = (existingSheetData != null ? existingSheetData.size() + 1 : 3);
            }

            // Escribir en la fila objetivo exacta
            String singleRange = "'" + sheetName + "'!A" + targetRow + ":AD" + targetRow;
            googleSheetsService.writeSheet(spreadsheetId, singleRange, List.of(row));

            if (existingSheetData != null) {
                while (existingSheetData.size() < targetRow) {
                    existingSheetData.add(new java.util.ArrayList<>());
                }
                existingSheetData.set(targetRow - 1, row);
            }
        }
        log.info("Exportación de planilla de salida completada. Se procesaron {} solicitudes.", solicitudes.size());



        return solicitudes.size();
    }

    private void setRowVal(List<Object> row, java.util.Map<String, Integer> map, String key, String val) {
        if (map.containsKey(key)) {
            int idx = map.get(key);
            if (idx >= 0 && idx < row.size()) {
                row.set(idx, val);
            }
        }
    }

    /**
     * Importa las respuestas desde la planilla de salida, actualiza el campo 'porDonde'
     * y sincroniza las diferencias detectadas en montos, fechas y atributos de Subsidio.
     * Si se pasa una lista de IDs no vacía, solo procesa las filas cuyos IDs estén en la lista.
     */
    @Transactional
    public int importarPlanillaSalida(String spreadsheetId, List<Long> ids) throws Exception {
        SheetsConfig config = sheetsConfigRepository.findBySpreadsheetId(spreadsheetId)
                .stream()
                .filter(c -> c.getSheetName() != null && 
                             !c.getSheetName().toUpperCase().contains("AGENDA") && 
                             !c.getSheetName().toUpperCase().contains("DECLARACION") && 
                             !c.getSheetName().toUpperCase().contains("DECLARACIÓN"))
                .findFirst()
                .orElseGet(() -> sheetsConfigRepository.findBySpreadsheetId(spreadsheetId)
                        .stream().findFirst()
                        .orElseThrow(() -> new RuntimeException("No se encontró la configuración para el spreadsheetId: " + spreadsheetId)));
        String sheetName = config.getSheetName();

        log.info("Iniciando importación desde la planilla de salida (selectiva: {}): {}", ids != null && !ids.isEmpty(), spreadsheetId);
        String range = "'" + sheetName + "'!A:AD";
        List<List<Object>> rawData = googleSheetsService.readSheet(spreadsheetId, range);

        if (rawData == null || rawData.size() <= 2) {
            log.info("No hay datos en la planilla para importar (mínimo 2 filas de cabecera y 1 de datos).");
            return 0;
        }

        // Obtener el mapeo de columnas dinámico
        java.util.Map<String, Integer> columnMapping = getColumnMapping(rawData.get(0), rawData.get(1));

        if (!columnMapping.containsKey("id")) {
            throw new IllegalArgumentException("La planilla no contiene la columna obligatoria 'IDENTIFICACIÓN' o 'IDENTIFICADOR'. Por favor, verifique que la cabecera exista.");
        }

        int updatedCount = 0;
        
        // Empezar desde la tercera fila (índice 2) para saltar las dos filas de encabezado
        for (int i = 2; i < rawData.size(); i++) {
            List<Object> row = rawData.get(i);
            if (row.isEmpty()) continue;

            Integer idColIndex = columnMapping.get("id");
            if (idColIndex == null) idColIndex = 0;

            String idStr = getValue(row, idColIndex);
            if (idStr.isEmpty()) continue;

            Long id;
            try {
                id = Long.parseLong(idStr);
            } catch (NumberFormatException e) {
                log.warn("Fila {} con ID inválido: {}. Omitiendo.", i + 1, idStr);
                continue;
            }

            if (ids != null && !ids.isEmpty() && !ids.contains(id)) {
                continue;
            }

            Optional<Solicitud> optSolicitud = solicitudRepository.findById(id);
            if (optSolicitud.isEmpty()) {
                log.warn("Solicitud con ID {} no encontrada en el SGP. Omitiendo.", id);
                continue;
            }

            Solicitud solicitud = optSolicitud.get();
            if (!"consideracion".equalsIgnoreCase(solicitud.getStatus())) {
                log.info("Solicitud con ID {} no está en estado CONSIDERACION (actual: {}). Omitiendo importación.", id, solicitud.getStatus());
                continue;
            }

            boolean isModified = false;

            // 0. Sincronizar descripción (description)
            if (columnMapping.containsKey("descripcion")) {
                int descCol = columnMapping.get("descripcion");
                String descVal = getValue(row, descCol);
                if (!descVal.isEmpty() && !descVal.equals(solicitud.getDescription() != null ? solicitud.getDescription() : "")) {
                    solicitud.setDescription(descVal);
                    logAssignmentChange(solicitud, null, "Descripción actualizada desde planilla externa a: " + descVal);
                    isModified = true;
                }
            }

            // 1. Sincronizar campo 'POR DONDE?'
            if (columnMapping.containsKey("por_donde")) {
                int porDondeCol = columnMapping.get("por_donde");
                String porDondeVal = getValue(row, porDondeCol);
                if (!porDondeVal.equals(solicitud.getPorDonde() != null ? solicitud.getPorDonde() : "")) {
                    solicitud.setPorDonde(porDondeVal);
                    logAssignmentChange(solicitud, null, "Campo POR DONDE actualizado desde planilla externa a: " + porDondeVal);
                    isModified = true;
                }
            }

            // 2. Si es de tipo Subsidio, sincronizar diferencias e importar estado por importe
            if ("SUBSIDIO".equalsIgnoreCase(solicitud.getType()) || "PEDIDO".equalsIgnoreCase(solicitud.getType())) {
                // Sincronizar Monto
                if (columnMapping.containsKey("monto_solicitado")) {
                    String montoStr = getValue(row, columnMapping.get("monto_solicitado"));
                    java.math.BigDecimal amountFromSheet = parseAmount(montoStr);

                    if (amountFromSheet == null) {
                        // POSTERGADO / PENDIENTE (celda vacía o valor no parseable) -> queda en consideración
                        if (!"consideracion".equalsIgnoreCase(solicitud.getStatus())) {
                            solicitud.setStatus("consideracion");
                            isModified = true;
                        }
                        SolicitudResolutorAssignment assignment = solicitud.getResolutorAssignments().stream()
                                .filter(a -> "SUBSIDIO".equalsIgnoreCase(a.getTipoResolucion()))
                                .findFirst()
                                .orElse(null);
                        if (assignment != null && (assignment.getApproved() == null || assignment.getApproved())) {
                            assignment.setApproved(false);
                            isModified = true;
                            logAssignmentChange(solicitud, null, "Resolución revertida a PENDIENTE por importación de planilla (Importe vacío)");
                        }
                    } else {
                        // Sincronizar el monto numérico
                        java.math.BigDecimal currentAmount = solicitud.getAmount() != null ? solicitud.getAmount() : java.math.BigDecimal.ZERO;
                        if (amountFromSheet.compareTo(currentAmount) != 0) {
                            solicitud.setAmount(amountFromSheet);
                            logAssignmentChange(solicitud, null, "Monto actualizado desde planilla externa a: " + amountFromSheet);
                            isModified = true;
                        }

                        SolicitudResolutorAssignment assignment = solicitud.getResolutorAssignments().stream()
                                .filter(a -> "SUBSIDIO".equalsIgnoreCase(a.getTipoResolucion()))
                                .findFirst()
                                .orElse(null);

                        if (amountFromSheet.compareTo(java.math.BigDecimal.ZERO) > 0) {
                            // APROBADA (importe > 0)
                            if (!"completadas".equalsIgnoreCase(solicitud.getStatus())) {
                                solicitud.setStatus("completadas");
                                solicitud.setResolutionApproved(true);
                                isModified = true;
                                if (assignment != null) {
                                    assignment.setApproved(true);
                                    assignment.setObservaciones("Aprobado automáticamente por importación de planilla (Importe > 0)");
                                }
                                logAssignmentChange(solicitud, null, "Solicitud APROBADA por importación de planilla con monto: " + amountFromSheet);
                                // Disparar envío de correo
                                try {
                                    String resolutorEmail = (assignment != null && assignment.getResolutor() != null) 
                                            ? assignment.getResolutor().getEmail() 
                                            : "martinnocioni@gmail.com";
                                    emailService.sendSubsidioApprovedEmail(resolutorEmail, solicitud.getId());
                                } catch (Exception ex) {
                                    log.error("Error al enviar correo de subsidio aprobado en importación para solicitud #{}", solicitud.getId(), ex);
                                }
                            }
                        } else if (amountFromSheet.compareTo(java.math.BigDecimal.ZERO) == 0) {
                            // DESAPROBADA (importe == 0)
                            if (!"rechazada".equalsIgnoreCase(solicitud.getStatus())) {
                                solicitud.setStatus("rechazada");
                                solicitud.setResolutionApproved(false);
                                isModified = true;
                                if (assignment != null) {
                                    assignment.setApproved(true);
                                    assignment.setObservaciones("Desaprobado automáticamente por importación de planilla (Importe = 0)");
                                }
                                logAssignmentChange(solicitud, null, "Solicitud DESAPROBADA por importación de planilla (Importe = 0)");
                            }
                        } else {
                            // POSTERGADA / EN CONSIDERACIÓN (importe < 0)
                            if (!"consideracion".equalsIgnoreCase(solicitud.getStatus())) {
                                solicitud.setStatus("consideracion");
                                isModified = true;
                            }
                            if (assignment != null && (assignment.getApproved() == null || assignment.getApproved())) {
                                assignment.setApproved(false);
                                isModified = true;
                                logAssignmentChange(solicitud, null, "Resolución revertida a PENDIENTE por importación de planilla (Importe < 0)");
                            }
                        }
                    }
                }

                // Sincronizar Fecha de otorgamiento
                if (columnMapping.containsKey("fecha_otorgamiento")) {
                    String fechaOtorgamientoStr = getValue(row, columnMapping.get("fecha_otorgamiento"));
                    if (!fechaOtorgamientoStr.isEmpty()) {
                        java.time.LocalDate dateFromSheet = parseDate(fechaOtorgamientoStr);
                        if (dateFromSheet != null && !dateFromSheet.equals(solicitud.getGrantDate())) {
                            solicitud.setGrantDate(dateFromSheet);
                            logAssignmentChange(solicitud, null, "Fecha de otorgamiento actualizada desde planilla externa a: " + dateFromSheet);
                            isModified = true;
                        }
                    }
                }

                // Sincronizar atributos dinámicos
                SolicitudResolutorAssignment assignment = solicitud.getResolutorAssignments().stream()
                        .filter(a -> "SUBSIDIO".equalsIgnoreCase(a.getTipoResolucion()))
                        .findFirst()
                        .orElse(null);

                // Si no existe la asignación de resolutor de SUBSIDIO, la creamos en caliente
                if (assignment == null) {
                    assignment = SolicitudResolutorAssignment.builder()
                            .solicitud(solicitud)
                            .tipoResolucion("SUBSIDIO")
                            .approved(false)
                            .detalle("{}")
                            .build();
                    if (solicitud.getResolutorAssignments() == null) {
                        solicitud.setResolutorAssignments(new java.util.ArrayList<>());
                    }
                    solicitud.getResolutorAssignments().add(assignment);
                }

                java.util.Map<String, Object> detalleMap = new java.util.HashMap<>();
                String detalleJson = assignment.getDetalle();
                if (detalleJson != null && !detalleJson.trim().isEmpty()) {
                    try {
                        detalleMap = objectMapper.readValue(detalleJson, new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>() {});
                    } catch (Exception e) {
                        log.error("Error al deserializar detalle JSON para importación de la solicitud #{}", id, e);
                    }
                }

                boolean detailChanged = false;

                // Mapeo dinámico de campos
                java.util.Map<String, String> fieldKeys = new java.util.HashMap<>();
                fieldKeys.put("tipo_pedido", "Tipo de pedido");
                fieldKeys.put("pers_nombre", "Nombre y apellido");
                fieldKeys.put("pers_dni", "DNI");
                fieldKeys.put("pers_direccion", "Dirección de DNI");
                fieldKeys.put("pers_dni_frente", "DNI frente");
                fieldKeys.put("pers_dni_dorso", "DNI dorso");
                fieldKeys.put("pers_cbu", "Constancia de CBU");
                fieldKeys.put("inst_nombre", "Nombre de institución");
                fieldKeys.put("inst_direccion", "Dirección de institución");
                fieldKeys.put("inst_localidad", "Localidad");
                fieldKeys.put("inst_resp1_nombre", "Responsable 1: Nombre");
                fieldKeys.put("inst_resp1_dni", "Responsable 1: DNI");
                fieldKeys.put("inst_resp1_cargo", "Responsable 1: Cargo");
                fieldKeys.put("inst_resp2_nombre", "Responsable 2: Nombre");
                fieldKeys.put("inst_resp2_dni", "Responsable 2: DNI");
                fieldKeys.put("inst_resp2_cargo", "Responsable 2: Cargo");
                fieldKeys.put("inst_nota_pedido", "Nota de pedido");

                for (java.util.Map.Entry<String, String> entry : fieldKeys.entrySet()) {
                    String fieldMapKey = entry.getKey();
                    String detalleKey = entry.getValue();

                    if (columnMapping.containsKey(fieldMapKey)) {
                        int colIdx = columnMapping.get(fieldMapKey);
                        String sheetVal = getValue(row, colIdx);

                        if (detalleKey.equals("DNI frente") || detalleKey.equals("DNI dorso") || detalleKey.equals("Constancia de CBU") || detalleKey.equals("Nota de pedido")) {
                            sheetVal = extractIdFromLink(sheetVal);
                        }

                        String currentVal = detalleMap.get(detalleKey) != null ? detalleMap.get(detalleKey).toString().trim() : "";
                        if (!sheetVal.equals(currentVal)) {
                            detalleMap.put(detalleKey, sheetVal);
                            detailChanged = true;
                        }
                    }
                }

                if (detailChanged) {
                    assignment.setDetalle(objectMapper.writeValueAsString(detalleMap));
                    isModified = true;
                    logAssignmentChange(solicitud, null, "Atributos dinámicos de Subsidio actualizados desde la planilla de salida.");
                }
            }

            if (isModified) {
                solicitudRepository.save(solicitud);
                updatedCount++;
            }
        }

        log.info("Importación finalizada. Solicitudes modificadas en el sistema: {}", updatedCount);
        return updatedCount;
    }

    private java.util.Map<String, Integer> getColumnMapping(List<Object> h1, List<Object> h2) {
        java.util.Map<String, Integer> mapping = new java.util.HashMap<>();
        int size = Math.max(h1 != null ? h1.size() : 0, h2 != null ? h2.size() : 0);

        for (int j = 0; j < size; j++) {
            String val1 = getCleanHeaderVal(h1, j);
            String val2 = getCleanHeaderVal(h2, j);

            if ("id".equals(val1) || "id".equals(val2) || containsAny(val1, "identificador") || containsAny(val2, "identificador")) {
                mapping.put("id", j);
            }
            else if (containsAny(val1, "responsable") || containsAny(val2, "responsable")) {
                if (!containsAny(val1, "cargo", "dni") && !containsAny(val2, "cargo", "dni")) {
                    mapping.put("responsable", j);
                }
            }
            else if ("localidad".equals(val1) || "localidad".equals(val2)) {
                if (!mapping.containsKey("localidad")) {
                    mapping.put("localidad", j);
                } else {
                    mapping.put("inst_localidad", j);
                }
            }
            else if ("barrio".equals(val1) || "barrio".equals(val2)) {
                mapping.put("barrio", j);
            }
            else if ("zona".equals(val1) || "zona".equals(val2)) {
                mapping.put("zona", j);
            }
            else if (containsAny(val1, "como llega", "origen") || containsAny(val2, "como llega", "origen")) {
                mapping.put("origen", j);
            }
            else if ("solicitante".equals(val1) || "solicitante".equals(val2)) {
                mapping.put("solicitante_nombre", j);
            }
            else if (containsAny(val1, "tipo de pedido", "tipo_pedido") || containsAny(val2, "tipo de pedido", "tipo_pedido")) {
                mapping.put("tipo_pedido", j);
            }
            else if (containsAny(val1, "descripcion", "detalle") || containsAny(val2, "descripcion", "detalle")) {
                mapping.put("descripcion", j);
            }
            else if (containsAny(val1, "monto", "importe") || containsAny(val2, "monto", "importe")) {
                mapping.put("monto_solicitado", j);
            }
            else if (containsAny(val1, "fecha") || containsAny(val2, "fecha")) {
                if (containsAny(val1, "otorgamiento") || containsAny(val2, "otorgamiento")) {
                    mapping.put("fecha_otorgamiento", j);
                } else {
                    if (!mapping.containsKey("fecha_ingreso")) {
                        mapping.put("fecha_ingreso", j);
                    }
                }
            }
            else if (containsAny(val1, "por donde", "gm - mc") || containsAny(val2, "por donde", "gm - mc") || "gm - mc - senado".equals(val2)) {
                mapping.put("por_donde", j);
            }
            else if ("apellido y nombre".equals(val1) || "apellido y nombre".equals(val2)) {
                mapping.put("pers_nombre", j);
            }
            else if ("dni".equals(val1) || "dni".equals(val2)) {
                if (!containsAny(val1, "responsable") && !containsAny(val2, "responsable")) {
                    mapping.put("pers_dni", j);
                }
            }
            else if (containsAny(val1, "telefono") || containsAny(val2, "telefono")) {
                mapping.put("pers_telefono", j);
            }
            else if (containsAny(val1, "empresa", "compania") || containsAny(val2, "empresa", "compania")) {
                mapping.put("pers_compania", j);
            }
            else if (containsAny(val1, "direccion de dni", "direccion dni") || containsAny(val2, "direccion de dni", "direccion dni")) {
                mapping.put("pers_direccion", j);
            }
            else if (containsAny(val1, "dni frente") || containsAny(val2, "dni frente")) {
                mapping.put("pers_dni_frente", j);
            }
            else if (containsAny(val1, "dni dorso", "dni atras") || containsAny(val2, "dni dorso", "dni atras")) {
                mapping.put("pers_dni_dorso", j);
            }
            else if ("cbu".equals(val1) || "cbu".equals(val2) || containsAny(val1, "constancia de cbu") || containsAny(val2, "constancia de cbu")) {
                mapping.put("pers_cbu", j);
            }
            else if ("nombre".equals(val2) && j > 14) {
                mapping.put("inst_nombre", j);
            }
            else if (("direccion".equals(val2) || "dirección".equals(val2)) && j > 14) {
                mapping.put("inst_direccion", j);
            }
            else if (containsAny(val1, "responsable 1: nombre", "responsable1: nombre") || containsAny(val2, "responsable 1: nombre", "responsable1: nombre") || "nombre y cargo responsable".equals(val2)) {
                mapping.put("inst_resp1_nombre", j);
            }
            else if (containsAny(val1, "responsable 1: dni", "responsable1: dni") || containsAny(val2, "responsable 1: dni", "responsable1: dni") || "dni responsable".equals(val2)) {
                mapping.put("inst_resp1_dni", j);
            }
            else if (containsAny(val1, "responsable 1: cargo", "responsable1: cargo") || containsAny(val2, "responsable 1: cargo", "responsable1: cargo")) {
                mapping.put("inst_resp1_cargo", j);
            }
            else if (containsAny(val1, "responsable 2: nombre", "responsable2: nombre") || containsAny(val2, "responsable 2: nombre", "responsable2: nombre")) {
                mapping.put("inst_resp2_nombre", j);
            }
            else if (containsAny(val1, "responsable 2: dni", "responsable2: dni") || containsAny(val2, "responsable 2: dni", "responsable2: dni")) {
                mapping.put("inst_resp2_dni", j);
            }
            else if (containsAny(val1, "responsable 2: cargo", "responsable2: cargo") || containsAny(val2, "responsable 2: cargo", "responsable2: cargo")) {
                mapping.put("inst_resp2_cargo", j);
            }
            else if (containsAny(val1, "nota de pedido", "nota_pedido") || containsAny(val2, "nota de pedido", "nota_pedido")) {
                mapping.put("inst_nota_pedido", j);
            }
        }

        if (!mapping.containsKey("por_donde") && size > 9) {
            mapping.put("por_donde", 10);
        }

        return mapping;
    }

    private String getCleanHeaderVal(List<Object> row, int index) {
        if (row == null || index >= row.size() || row.get(index) == null) {
            return "";
        }
        String val = row.get(index).toString().trim().toLowerCase();
        val = val.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u");
        return val;
    }

    private boolean containsAny(String source, String... targets) {
        if (source == null || source.isEmpty()) return false;
        for (String target : targets) {
            if (source.contains(target.toLowerCase())) return true;
        }
        return false;
    }

    private java.util.Map<String, Object> getSubsidioDetalle(Solicitud solicitud) {
        if (solicitud.getResolutorAssignments() != null) {
            for (SolicitudResolutorAssignment assignment : solicitud.getResolutorAssignments()) {
                if ("SUBSIDIO".equalsIgnoreCase(assignment.getTipoResolucion())) {
                    String detalleJson = assignment.getDetalle();
                    if (detalleJson != null && !detalleJson.trim().isEmpty()) {
                        try {
                            return objectMapper.readValue(detalleJson, new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>() {});
                        } catch (Exception e) {
                            log.error("Error al parsear detalle de resolución SUBSIDIO de la solicitud #{}", solicitud.getId(), e);
                        }
                    }
                }
            }
        }
        return new java.util.HashMap<>();
    }

    private String getFieldValue(java.util.Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString().trim() : "";
    }

    private String buildAttachmentLink(Object val) {
        if (val == null) return "";
        String valStr = val.toString().trim();
        if (valStr.isEmpty() || valStr.equals("-")) return "";

        String frontendUrl = sgpFrontendUrl;
        try {
            // Intentar recuperar el origen dinámicamente de la petición HTTP actual
            org.springframework.web.context.request.RequestAttributes attrs = 
                org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attrs instanceof org.springframework.web.context.request.ServletRequestAttributes) {
                jakarta.servlet.http.HttpServletRequest request = 
                    ((org.springframework.web.context.request.ServletRequestAttributes) attrs).getRequest();
                String origin = request.getHeader("Origin");
                if (origin != null && !origin.trim().isEmpty()) {
                    frontendUrl = origin.trim();
                } else {
                    String referer = request.getHeader("Referer");
                    if (referer != null && !referer.trim().isEmpty()) {
                        java.net.URI uri = new java.net.URI(referer);
                        frontendUrl = uri.getScheme() + "://" + uri.getAuthority();
                    }
                }
            }
        } catch (Exception e) {
            log.debug("No se pudo obtener la URL de origen de la petición HTTP actual, usando fallback: {}", sgpFrontendUrl);
        }

        return frontendUrl + "/descargar-adjunto/" + valStr;
    }

    private String extractIdFromLink(String link) {
        if (link == null || link.trim().isEmpty()) return "";
        link = link.trim();
        if (link.contains("/descargar-adjunto/")) {
            return link.substring(link.lastIndexOf("/") + 1);
        }
        return link;
    }

    /**
     * Registra un evento de cambio o acción en la bitácora de la solicitud.
     */
    private void logAssignmentChange(Solicitud solicitud, com.sgp.backend.entity.User responsable, String actionType) {
        String username = "Sistema";
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            username = auth.getName();
        }

        AsignacionHistorial history = AsignacionHistorial.builder()
                .solicitud(solicitud)
                .responsable(responsable)
                .actionType(actionType)
                .assignedByUsername(username)
                .actionDate(LocalDateTime.now())
                .build();
        
        asignacionHistorialRepository.save(history);
    }
}
