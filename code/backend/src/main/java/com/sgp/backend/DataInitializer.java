package com.sgp.backend;

import com.sgp.backend.entity.User;
import com.sgp.backend.entity.AtributoResolucion;
import com.sgp.backend.entity.TipoResolucion;
import com.sgp.backend.entity.TipoResolucionAtributo;
import com.sgp.backend.repository.UserRepository;
import com.sgp.backend.repository.AtributoResolucionRepository;
import com.sgp.backend.repository.TipoResolucionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final com.sgp.backend.repository.SheetsConfigRepository sheetsConfigRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.sgp.backend.repository.LocationRepository locationRepository;
    private final com.sgp.backend.repository.SolicitudRepository solicitudRepository;
    private final com.sgp.backend.repository.AsignacionHistorialRepository asignacionHistorialRepository;
    private final com.sgp.backend.repository.ProjectRepository projectRepository;
    private final com.sgp.backend.repository.PersonRepository personRepository;

    private final TipoResolucionRepository tipoResolucionRepository;
    private final AtributoResolucionRepository atributoRepository;
    private final jakarta.persistence.EntityManager entityManager;

    @org.springframework.beans.factory.annotation.Value("${sgp.seed.overwrite-users:true}")
    private boolean overwriteUsers;

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void run(String... args) throws Exception {
        System.out.println("🚀 Iniciando DataInitializer...");

        // Limpieza de esquemas antiguos (Remanentes de Stage 2) - Removido por incompatibilidad de sintaxis en MySQL y errores de rollback-only.


        // Migración de Estados: Normalización a español
        try {
            System.out.println("⏳ Ejecutando migración de estados...");
            solicitudRepository.findAll().forEach(s -> {
                boolean updated = false;
                if ("PENDING".equals(s.getStatus())) { s.setStatus("pendiente"); updated = true; }
                else if ("IN_PROGRESS".equals(s.getStatus())) { s.setStatus("en proceso"); updated = true; }
                else if ("COMPLETED".equals(s.getStatus()) || "COMPLETADAS".equals(s.getStatus())) { s.setStatus("completadas"); updated = true; }
                else if ("REJECTED".equals(s.getStatus())) { s.setStatus("rechazada"); updated = true; }

                if (updated) {
                    solicitudRepository.save(s);
                }
            });
            System.out.println("✅ Migración de estados terminada.");
        } catch (Exception e) {
            System.err.println("❌ Error en migración de estados: " + e.getMessage());
        }

        // 1. Seed Users (5 Roles Test Users)
        try {
            System.out.println("⏳ Sembrando usuarios iniciales y limpiando anteriores...");
            
            List<String> keepEmails = List.of(
                "admin@sgp.com",
                "celestesolari19@gmail.com",
                "matias.ippolito.gmail.com", // Distribuidor corregido en DB
                "matias.ippolito@gmail.com",
                "sabrivschmidt@gmail.com",
                "barbarabrancatto@gmail.com",
                "martinnocioni@gmail.com",
                "mvgonza79@gmail.com",
                "ealfaro.51@gmail.com",
                "auditor.sheets@gmail.com"
            );

            try {
                // Eliminar duplicados de SheetsConfig conservando el primero y reasignando relaciones
                List<com.sgp.backend.entity.SheetsConfig> configs = sheetsConfigRepository.findAll();
                java.util.Map<String, com.sgp.backend.entity.SheetsConfig> uniqueConfigs = new java.util.HashMap<>();
                for (com.sgp.backend.entity.SheetsConfig sc : configs) {
                    String key = (sc.getSpreadsheetId() != null ? sc.getSpreadsheetId().trim().toLowerCase() : "") 
                            + "|" + (sc.getSheetName() != null ? sc.getSheetName().trim().toLowerCase() : "");
                    if (uniqueConfigs.containsKey(key)) {
                        com.sgp.backend.entity.SheetsConfig original = uniqueConfigs.get(key);
                        System.out.println("🗑️ Reasignando solicitudes y eliminando planilla duplicada ID: " + sc.getId() + " -> Original ID: " + original.getId());
                        
                        // Reasignar solicitudes
                        entityManager.createNativeQuery("UPDATE solicitudes SET sheets_config_id = :originalId WHERE sheets_config_id = :duplicateId")
                                     .setParameter("originalId", original.getId())
                                     .setParameter("duplicateId", sc.getId())
                                     .executeUpdate();
                        
                        // Eliminar proyecto duplicado si existe
                        projectRepository.findBySheetsConfig(sc).ifPresent(projectRepository::delete);
                        sheetsConfigRepository.delete(sc);
                    } else {
                        uniqueConfigs.put(key, sc);
                    }
                }

                // Eliminar relaciones de historial y asignaciones de resolutores anteriores
                entityManager.createNativeQuery("DELETE FROM asignacion_historial WHERE responsable_user_id NOT IN (SELECT id FROM users WHERE email IN (:emails))")
                             .setParameter("emails", keepEmails).executeUpdate();
                entityManager.createNativeQuery("DELETE FROM solicitud_resolutor_assignment WHERE resolutor_id NOT IN (SELECT id FROM users WHERE email IN (:emails))")
                             .setParameter("emails", keepEmails).executeUpdate();
                entityManager.createNativeQuery("UPDATE tipo_resolucion SET default_resolutor_id = NULL WHERE default_resolutor_id NOT IN (SELECT id FROM users WHERE email IN (:emails))")
                             .setParameter("emails", keepEmails).executeUpdate();
                entityManager.createNativeQuery("UPDATE solicitudes SET responsable_id = NULL WHERE responsable_id NOT IN (SELECT id FROM users WHERE email IN (:emails))")
                             .setParameter("emails", keepEmails).executeUpdate();
                entityManager.createNativeQuery("UPDATE solicitudes SET resolutor_asignado_id = NULL WHERE resolutor_asignado_id NOT IN (SELECT id FROM users WHERE email IN (:emails))")
                             .setParameter("emails", keepEmails).executeUpdate();
                entityManager.createNativeQuery("UPDATE solicitudes SET created_by_id = NULL WHERE created_by_id NOT IN (SELECT id FROM users WHERE email IN (:emails))")
                             .setParameter("emails", keepEmails).executeUpdate();
                entityManager.createNativeQuery("UPDATE documento_adjunto SET uploaded_by_id = NULL WHERE uploaded_by_id NOT IN (SELECT id FROM users WHERE email IN (:emails))")
                             .setParameter("emails", keepEmails).executeUpdate();
                
                // Limpiar tabla intermedia de relaciones de resolutores anteriores
                entityManager.createNativeQuery("DELETE FROM user_tipo_resolucion WHERE user_id NOT IN (SELECT id FROM users WHERE email IN (:emails))")
                             .setParameter("emails", keepEmails).executeUpdate();

                // Limpiar configuración de resolutor y definiciones de campos para evitar fallos de integridad referencial si las tablas existen
                try {
                    Number countDef = (Number) entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM information_schema.tables WHERE UPPER(table_name) = 'RESOLUCION_CAMPO_DEFINICION'"
                    ).getSingleResult();
                    if (countDef != null && countDef.intValue() > 0) {
                        entityManager.createNativeQuery("DELETE FROM resolucion_campo_definicion WHERE resolutor_config_id IN (SELECT id FROM resolutor_config WHERE user_id NOT IN (SELECT id FROM users WHERE email IN (:emails)))")
                                     .setParameter("emails", keepEmails).executeUpdate();
                    }
                    
                    Number countConfig = (Number) entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM information_schema.tables WHERE UPPER(table_name) = 'RESOLUTOR_CONFIG'"
                    ).getSingleResult();
                    if (countConfig != null && countConfig.intValue() > 0) {
                        entityManager.createNativeQuery("DELETE FROM resolutor_config WHERE user_id NOT IN (SELECT id FROM users WHERE email IN (:emails))")
                                     .setParameter("emails", keepEmails).executeUpdate();
                    }
                } catch (Exception e) {
                    System.err.println("⚠️ Nota: Error al limpiar tablas obsoletas de configuraciones: " + e.getMessage());
                }

                // Eliminar los usuarios obsoletos
                int deletedOld = entityManager.createNativeQuery("DELETE FROM users WHERE email NOT IN (:emails)")
                                              .setParameter("emails", keepEmails).executeUpdate();
                if (deletedOld > 0) System.out.println("🗑️ Usuarios antiguos eliminados: " + deletedOld);
            } catch (Exception e) {
                System.err.println("⚠️ Nota: Error parcial al purgar usuarios viejos: " + e.getMessage());
            }

            // Sembrar Administrador Supremo
            createUserIfNotFound("admin@sgp.com", "SGP_Admin_#2026_Prod_Secure_!", "ADMINISTRADOR", "Admin", "Supremo", LocalDate.of(1990, 1, 1), "3420000000", null, "12.345.678");

            // Sembrar Operador
            createUserIfNotFound("celestesolari19@gmail.com", "Celeste_SGP_2026#", "OPERADOR", "Celeste", "Solari", LocalDate.of(1990, 1, 1), "3424760480", null, "30.562.372");

            // Sembrar Distribuidores y Responsables combinados
            createUserIfNotFound("matias.ippolito@gmail.com", "Matias_Dist_SGP_2026!", "DISTRIBUIDOR,RESPONSABLE", "Matías", "Ippolito", LocalDate.of(1990, 1, 1), "3426148609", "Norte", "28.925.931");
            createUserIfNotFound("sabrivschmidt@gmail.com", "Sabrina_SGP_2026$", "DISTRIBUIDOR", "Sabrina", "Schmidt", LocalDate.of(1990, 1, 1), "3424777085", null, "31.273.418");
            createUserIfNotFound("barbarabrancatto@gmail.com", "Barbara_Resp_SGP_2026!", "RESPONSABLE", "Barbara", "Brancatto", LocalDate.of(1990, 1, 1), "3424216840", "Sur", "26.972.841");
 
            // Sembrar Resolutores
            User resMartin = createUserIfNotFound("martinnocioni@gmail.com", "Martin_SGP_2026*", "RESOLUTOR,OPERADOR", "Martín", "Nocioni", LocalDate.of(1990, 1, 1), "3426144703", null, "31.111.251");
            User resMaria = createUserIfNotFound("mvgonza79@gmail.com", "Maria_SGP_2026%", "RESOLUTOR", "María Veronica", "Gonzalez", LocalDate.of(1990, 1, 1), "3425119354", null, "27.620.830");
            User resEduardo = createUserIfNotFound("ealfaro.51@gmail.com", "Eduardo_SGP_2026^", "RESOLUTOR", "Eduardo", "Alfaro", LocalDate.of(1990, 1, 1), "3434404035", null, "32.831.230");
            User resDefault = createUserIfNotFound("resolutor@sgp.com", "Resolutor_SGP_2026!", "RESOLUTOR", "Resolutor", "Defecto", LocalDate.of(1990, 1, 1), "3420000000", null, "31.222.333");
 
            // Sembrar Lector de Planillas
            createUserIfNotFound("auditor.sheets@gmail.com", "Lector_SGP_2026#", "LECTOR", "Auditor", "Sheets", LocalDate.of(1990, 1, 1), "3420000000", null, "33.444.555");

            // Sembrar Usuario Auditor de Prueba (Etapa 10)
            createUserIfNotFound("test.auditor@gmail.com", "Auditor_SGP_2026!", "AUDITOR", "Auditor", "Seguimiento", LocalDate.of(1990, 1, 1), "3424444444", null, "36.666.666");

            // 2. Initialize Locations from dataset
            initializeLocations();

            // 3. Seed TipoResolucion y Atributos (Omitido)
            seedTiposYAtributos(resDefault);

            // 4. Vincular Tipos de Resolución a Resolutores en la Base de Datos (ManyToMany)
            System.out.println("⏳ Vinculando tipos de resolución a perfiles de resolutores...");
            
            // Primero limpiar las relaciones previas para estos usuarios específicos
            entityManager.createNativeQuery("DELETE FROM user_tipo_resolucion WHERE user_id IN (:ids)")
                         .setParameter("ids", List.of(resMaria.getId(), resMartin.getId(), resEduardo.getId(), resDefault.getId()))
                         .executeUpdate();
            
            tipoResolucionRepository.findByTipoIgnoreCase("AGENDA").ifPresent(tr -> {
                tr.setResolutor(resMaria);
                tipoResolucionRepository.save(tr);
                
                entityManager.createNativeQuery("INSERT INTO user_tipo_resolucion (user_id, tipo_resolucion_id) VALUES (:userId, :tipoId)")
                             .setParameter("userId", resMaria.getId())
                             .setParameter("tipoId", tr.getId())
                             .executeUpdate();
            });
 
            tipoResolucionRepository.findByTipoIgnoreCase("SUBSIDIO").ifPresent(tr -> {
                tr.setResolutor(resMartin);
                tipoResolucionRepository.save(tr);
                
                entityManager.createNativeQuery("INSERT INTO user_tipo_resolucion (user_id, tipo_resolucion_id) VALUES (:userId, :tipoId)")
                             .setParameter("userId", resMartin.getId())
                             .setParameter("tipoId", tr.getId())
                             .executeUpdate();
            });
 
            tipoResolucionRepository.findByTipoIgnoreCase("DECLARACION DE INTERES").ifPresent(tr -> {
                tr.setResolutor(resEduardo);
                tipoResolucionRepository.save(tr);
                
                entityManager.createNativeQuery("INSERT INTO user_tipo_resolucion (user_id, tipo_resolucion_id) VALUES (:userId, :tipoId)")
                             .setParameter("userId", resEduardo.getId())
                             .setParameter("tipoId", tr.getId())
                             .executeUpdate();
            });

            tipoResolucionRepository.findByTipoIgnoreCase("OTRA").ifPresent(tr -> {
                tr.setResolutor(resDefault);
                tipoResolucionRepository.save(tr);
                
                entityManager.createNativeQuery("INSERT INTO user_tipo_resolucion (user_id, tipo_resolucion_id) VALUES (:userId, :tipoId)")
                             .setParameter("userId", resDefault.getId())
                             .setParameter("tipoId", tr.getId())
                             .executeUpdate();
            });

            // Asignar zona por defecto de forma secuencial a los responsables que no tengan una asignada
            List<User> todosLosUsuarios = userRepository.findAll();
            int contadorZona = 1;
            for (User u : todosLosUsuarios) {
                if (u.getRole() != null && u.getRole().contains("RESPONSABLE")) {
                    if (u.getZone() == null || u.getZone().trim().isEmpty()) {
                        String zonaAutomatica = "zona" + contadorZona;
                        u.setZone(zonaAutomatica);
                        userRepository.save(u);
                        System.out.println("⚠️ Responsable sin zona detectado: " + u.getEmail() + ". Asignada zona automatica: " + zonaAutomatica);
                        contadorZona++;
                    }
                }
            }

            List<com.sgp.backend.entity.Project> proyectosExistentes = projectRepository.findAll();
            boolean existeAgenda = proyectosExistentes.stream().anyMatch(p -> "Proyecto de Agenda E2E".equalsIgnoreCase(p.getName()));
            boolean existeSubsidio = proyectosExistentes.stream().anyMatch(p -> "Proyecto de Subsidio E2E".equalsIgnoreCase(p.getName()));

            if (!existeAgenda) {
                System.out.println("⏳ Sembrando proyecto de Agenda por defecto...");
                
                com.sgp.backend.entity.SheetsConfig sc1 = new com.sgp.backend.entity.SheetsConfig();
                sc1.setSpreadsheetId("spreadsheet-agenda-default-id");
                sc1.setSheetName("AGENDA");
                sc1.setCalendarId("mvgonza79@gmail.com");
                sc1.setStatus("ACTIVE");
                sc1 = sheetsConfigRepository.save(sc1);
                
                com.sgp.backend.entity.Project p1 = new com.sgp.backend.entity.Project();
                p1.setName("Proyecto de Agenda E2E");
                p1.setSheetsConfig(sc1);
                p1.setDataJson("{}");
                projectRepository.save(p1);
                System.out.println("✅ Proyecto de Agenda sembrado correctamente.");
            } else {
                proyectosExistentes.stream()
                    .filter(p -> "Proyecto de Agenda E2E".equalsIgnoreCase(p.getName()))
                    .findFirst()
                    .ifPresent(p -> {
                        com.sgp.backend.entity.SheetsConfig sc = p.getSheetsConfig();
                        if (sc != null && (sc.getSpreadsheetId() == null || sc.getSpreadsheetId().trim().isEmpty() || sc.getCalendarId() == null || sc.getCalendarId().trim().isEmpty())) {
                            sc.setSpreadsheetId("spreadsheet-agenda-default-id");
                            sc.setSheetName("AGENDA");
                            sc.setCalendarId("mvgonza79@gmail.com");
                            sc.setStatus("ACTIVE");
                            sheetsConfigRepository.save(sc);
                            System.out.println("✅ Proyecto de Agenda existente restaurado con configuraciones por defecto.");
                        }
                    });
            }

            if (!existeSubsidio) {
                System.out.println("⏳ Sembrando proyecto de Subsidio por defecto...");
                
                com.sgp.backend.entity.SheetsConfig sc2 = new com.sgp.backend.entity.SheetsConfig();
                sc2.setSpreadsheetId("spreadsheet-subsidio-default-id");
                sc2.setSheetName("Solicitudes Subsidios");
                sc2.setStatus("ACTIVE");
                sc2 = sheetsConfigRepository.save(sc2);
                
                com.sgp.backend.entity.Project p2 = new com.sgp.backend.entity.Project();
                p2.setName("Proyecto de Subsidio E2E");
                p2.setSheetsConfig(sc2);
                p2.setDataJson("{}");
                projectRepository.save(p2);
                System.out.println("✅ Proyecto de Subsidio sembrado correctamente.");
            } else {
                proyectosExistentes.stream()
                    .filter(p -> "Proyecto de Subsidio E2E".equalsIgnoreCase(p.getName()))
                    .findFirst()
                    .ifPresent(p -> {
                        com.sgp.backend.entity.SheetsConfig sc = p.getSheetsConfig();
                        if (sc != null && (sc.getSpreadsheetId() == null || sc.getSpreadsheetId().trim().isEmpty())) {
                            sc.setSpreadsheetId("spreadsheet-subsidio-default-id");
                            sc.setSheetName("Solicitudes Subsidios");
                            sc.setStatus("ACTIVE");
                            sheetsConfigRepository.save(sc);
                            System.out.println("✅ Proyecto de Subsidio existente restaurado con configuraciones por defecto.");
                        }
                    });
            }

            // La siembra automática de solicitudes y beneficiarios de ejemplo ha sido removida para que producción permanezca limpio.

            System.out.println("✅ DataInitializer finalizado exitosamente.");
        } catch (Exception e) {
            System.err.println("❌ Error crítico en inicialización de datos: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void initializeLocations() {
        System.out.println("⏳ Sincronizando dataset de localidades y vecinales de Santa Fe de forma incremental...");
        try (java.io.InputStream is = getClass().getResourceAsStream("/dataset/santa_fe_locations_dataset.txt");
             java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(is, java.nio.charset.StandardCharsets.UTF_8))) {

            String line;
            com.sgp.backend.entity.Location currentProvince = null;
            com.sgp.backend.entity.Location currentCity = null;
            int count = 0;

            // Cargar o recuperar provincias de la base de datos
            List<com.sgp.backend.entity.Location> allLocations = locationRepository.findAll();

            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;

                String[] parts = line.split("\\|");
                if (parts.length != 2) continue;

                String type = parts[0];
                String name = parts[1];

                if ("PROVINCE".equals(type)) {
                    final String provName = name;
                    currentProvince = allLocations.stream()
                        .filter(l -> "PROVINCE".equals(l.getType()) && provName.equalsIgnoreCase(l.getName()))
                        .findFirst()
                        .orElseGet(() -> {
                            var p = new com.sgp.backend.entity.Location();
                            p.setName(provName);
                            p.setType("PROVINCE");
                            p.setShowInUi(false);
                            var saved = locationRepository.save(p);
                            allLocations.add(saved);
                            return saved;
                        });
                } else if ("CITY".equals(type) || "LOCALITY".equals(type)) {
                    final String cityName = name;
                    final com.sgp.backend.entity.Location parentProv = currentProvince;
                    currentCity = allLocations.stream()
                        .filter(l -> ("CITY".equals(l.getType()) || "LOCALITY".equals(l.getType())) && cityName.equalsIgnoreCase(l.getName()))
                        .findFirst()
                        .orElseGet(() -> {
                            var c = new com.sgp.backend.entity.Location();
                            c.setName(cityName);
                            c.setType("CITY"); // normalizado
                            c.setParent(parentProv);
                            c.setShowInUi(false);
                            var saved = locationRepository.save(c);
                            allLocations.add(saved);
                            return saved;
                        });
                } else if ("NEIGHBORHOOD".equals(type) && currentCity != null) {
                    final String neighName = name;
                    final com.sgp.backend.entity.Location parentCity = currentCity;
                    boolean exists = allLocations.stream()
                        .anyMatch(l -> "NEIGHBORHOOD".equals(l.getType()) && neighName.equalsIgnoreCase(l.getName()) && l.getParent() != null && l.getParent().getId().equals(parentCity.getId()));
                    if (!exists) {
                        com.sgp.backend.entity.Location neighborhood = new com.sgp.backend.entity.Location();
                        neighborhood.setName(neighName);
                        neighborhood.setType("NEIGHBORHOOD");
                        neighborhood.setParent(parentCity);
                        neighborhood.setShowInUi(false);
                        var saved = locationRepository.save(neighborhood);
                        allLocations.add(saved);
                        count++;
                    }
                }
            }
            if (count > 0) {
                System.out.println("✅ Se agregaron " + count + " nuevas vecinales oficiales al catálogo.");
            }

            // Aseguramos las localidades visibles para la interfaz
            actualizarLocalidadesVisibles();
        } catch (Exception e) {
            System.err.println("❌ Error al cargar las localidades: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void actualizarLocalidadesVisibles() {
        // Lista de localidades que deben estar visibles en la UI para la Etapa 6.1
        List<String> visibleNames = List.of(
            "Santa Fe", "Laguna Paiva", "Recreo", "San José del Rincón", "Santo Tomé",
            "Arroyo Aguiar", "Arroyo Leyes", "Cabal", "Campo Andino", "Candioti",
            "Emilia", "Llambi Campbell", "Monte Vera", "Nelson", "Sauce Viejo", "Otra"
        );
        for (String name : visibleNames) {
            com.sgp.backend.entity.Location loc = locationRepository.findFirstByNameAndType(name, "CITY")
                .orElseGet(() -> {
                    com.sgp.backend.entity.Location newLoc = new com.sgp.backend.entity.Location();
                    newLoc.setName(name);
                    newLoc.setType("CITY");
                    // Buscar la provincia de Santa Fe para asociarla como padre
                    locationRepository.findFirstByNameAndType("Santa Fe", "PROVINCE")
                        .ifPresent(newLoc::setParent);
                    System.out.println("➕ Localidad faltante creada en BD: " + name);
                    return newLoc;
                });

            if (!Boolean.TRUE.equals(loc.getShowInUi())) {
                loc.setShowInUi(true);
                locationRepository.save(loc);
                System.out.println("✅ Localidad marcada como visible en UI (DataInitializer): " + name);
            }
        }
    }

    private User createUserIfNotFound(String email, String password, String role, String firstName, String lastName, LocalDate birthDate, String phone, String zone, String dni) {
        User user = userRepository.findByEmail(email).orElse(null);
        boolean isNew = false;

        if (user == null) {
            user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(password));
            isNew = true;
        } else {
            // Si el usuario existe y no está configurado para sobrescribirse, omitimos los cambios
            if (!overwriteUsers) {
                System.out.println("ℹ️ User already exists, skipping overwrite (sgp.seed.overwrite-users=false): " + email);
                return user;
            }

            // Solo actualizamos la contraseña si el plain text definido en el código
            // no coincide con el hash actual (útil para resetear desde el código si se olvida)
            if (!passwordEncoder.matches(password, user.getPassword())) {
                user.setPassword(passwordEncoder.encode(password));
                System.out.println("🔄 Password reset for user: " + email);
            }
        }

        user.setRole(role);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setBirthDate(birthDate);
        user.setPhone(phone);
        user.setZone(zone);
        user.setDni(dni);
        
        User savedUser = userRepository.save(user);
        System.out.println((isNew ? "✅ User created: " : "✅ User updated: ") + email + " (" + role + ")");
        return savedUser;
    }

    private void seedTiposYAtributos(User resolutorDefault) {
        // Limpieza de tipos vacíos
        tipoResolucionRepository.findAll().forEach(t -> {
            if (t.getTipo() == null || t.getTipo().trim().isEmpty()) {
                tipoResolucionRepository.delete(t);
            }
        });

        // Seed Global Attributes
        AtributoResolucion attrDatoObs = obtenerOCrearAtributo("Observaciones", "TEXTAREA", null);
        AtributoResolucion attrFecha = obtenerOCrearAtributo("Fecha", "DATE", null);
        AtributoResolucion attrMonto = obtenerOCrearAtributo("Monto", "NUMBER", null);
        AtributoResolucion attrInstitucion = obtenerOCrearAtributo("Nombre de institución", "TEXT", null);
        AtributoResolucion attrDecInteres = obtenerOCrearAtributo("Declaración de interés", "SELECT", "si,no");
        AtributoResolucion attrCBU = obtenerOCrearAtributo("Constancia de CBU", "FILE", null);

        // Atributos específicos de SUBSIDIO (Etapa 8 y depuración Etapa 11)
        AtributoResolucion attrTipoPedido = obtenerOCrearAtributo("Tipo de pedido", "SELECT", "Personal,Institucional en dinero,Institucional en especie");
        AtributoResolucion attrNombreApellido = obtenerOCrearAtributo("Nombre y apellido", "TEXT", null);
        AtributoResolucion attrDni = obtenerOCrearAtributo("DNI", "TEXT", null);
        AtributoResolucion attrTelefono = obtenerOCrearAtributo("Teléfono", "TEXT", null);
        AtributoResolucion attrCompania = obtenerOCrearAtributo("Compañía", "TEXT", null);
        AtributoResolucion attrDireccionDni = obtenerOCrearAtributo("Dirección de DNI", "TEXT", null);
        AtributoResolucion attrDniFrente = obtenerOCrearAtributo("DNI frente", "FILE", null);
        AtributoResolucion attrDniDorso = obtenerOCrearAtributo("DNI dorso", "FILE", null);
        AtributoResolucion attrDireccionInst = obtenerOCrearAtributo("Dirección de institución", "TEXT", null);
        AtributoResolucion attrLocalidad = obtenerOCrearAtributo("Localidad", "TEXT", null);
        AtributoResolucion attrResp1Nombre = obtenerOCrearAtributo("Responsable 1: Nombre", "TEXT", null);
        AtributoResolucion attrResp1Dni = obtenerOCrearAtributo("Responsable 1: DNI", "TEXT", null);
        AtributoResolucion attrResp1Cargo = obtenerOCrearAtributo("Responsable 1: Cargo", "TEXT", null);
        AtributoResolucion attrResp2Nombre = obtenerOCrearAtributo("Responsable 2: Nombre", "TEXT", null);
        AtributoResolucion attrResp2Dni = obtenerOCrearAtributo("Responsable 2: DNI", "TEXT", null);
        AtributoResolucion attrResp2Cargo = obtenerOCrearAtributo("Responsable 2: Cargo", "TEXT", null);
        AtributoResolucion attrNotaPedido = obtenerOCrearAtributo("Nota de pedido", "FILE", null);

        // Atributos específicos de AGENDA para la Etapa 11 (13 campos ordenados)
        AtributoResolucion attrTipoActividad = obtenerOCrearAtributo("Tipo de actividad", "SELECT", "Reunión,Evento,Acto,Recorrido gestión,Recorrido territorial,Visita,Otro");
        AtributoResolucion attrOrganizadaNosotros = obtenerOCrearAtributo("Organizada por nosotros?", "SELECT", "si,no");
        AtributoResolucion attrDescTemario = obtenerOCrearAtributo("Descripción/temario", "TEXTAREA", null);
        AtributoResolucion attrAsistentes = obtenerOCrearAtributo("Asistentes", "TEXT", null);
        AtributoResolucion attrAporte = obtenerOCrearAtributo("Aporte?", "SELECT", "si,no");
        AtributoResolucion attrDescMonto = obtenerOCrearAtributo("Descripción/monto", "TEXT", null);
        AtributoResolucion attrDia = obtenerOCrearAtributo("Día", "DATE", null);
        AtributoResolucion attrHora = obtenerOCrearAtributo("Hora", "TIME", null);
        AtributoResolucion attrLugarLocalidad = obtenerOCrearAtributo("Lugar - Localidad", "SELECT", null);
        AtributoResolucion attrLugarBarrio = obtenerOCrearAtributo("Lugar - Barrio", "SELECT", null);
        AtributoResolucion attrResponsable = obtenerOCrearAtributo("Responsable", "TEXT", null);
        AtributoResolucion attrObservacion = obtenerOCrearAtributo("Observación", "TEXTAREA", null);

        // Definición de tipo AGENDA (Etapa 11)
        upsertTipoResolucion("AGENDA", resolutorDefault, List.of(
            new AtributoConfig(attrTipoActividad, true, 1),
            new AtributoConfig(attrOrganizadaNosotros, true, 2),
            new AtributoConfig(attrDescTemario, true, 3),
            new AtributoConfig(attrAsistentes, true, 4),
            new AtributoConfig(attrDecInteres, true, 5),
            new AtributoConfig(attrAporte, true, 6),
            new AtributoConfig(attrDescMonto, false, 7), // Condicional a Aporte? === 'si'
            new AtributoConfig(attrDia, true, 8),
            new AtributoConfig(attrHora, true, 9),
            new AtributoConfig(attrLugarLocalidad, true, 10),
            new AtributoConfig(attrLugarBarrio, true, 11),
            new AtributoConfig(attrResponsable, true, 12),
            new AtributoConfig(attrObservacion, true, 13)
        ));

        upsertTipoResolucion("SUBSIDIO", resolutorDefault, List.of(
            new AtributoConfig(attrTipoPedido, false, 1),
            new AtributoConfig(attrNombreApellido, false, 2),
            new AtributoConfig(attrDni, false, 3),
            new AtributoConfig(attrTelefono, false, 4),
            new AtributoConfig(attrCompania, false, 5),
            new AtributoConfig(attrDireccionDni, false, 6),
            new AtributoConfig(attrDniFrente, false, 7),
            new AtributoConfig(attrDniDorso, false, 8),
            new AtributoConfig(attrCBU, false, 9),
            new AtributoConfig(attrInstitucion, false, 10),
            new AtributoConfig(attrDireccionInst, false, 11),
            new AtributoConfig(attrLocalidad, false, 12),
            new AtributoConfig(attrResp1Nombre, false, 13),
            new AtributoConfig(attrResp1Dni, false, 14),
            new AtributoConfig(attrResp1Cargo, false, 15),
            new AtributoConfig(attrResp2Nombre, false, 16),
            new AtributoConfig(attrResp2Dni, false, 17),
            new AtributoConfig(attrResp2Cargo, false, 18),
            new AtributoConfig(attrNotaPedido, false, 19),
            new AtributoConfig(attrMonto, false, 20),
            new AtributoConfig(attrDatoObs, false, 21)
        ));

        upsertTipoResolucion("DECLARACION DE INTERES", resolutorDefault, List.of());

        AtributoResolucion attrDescCorta = obtenerOCrearAtributo("Descripción corta", "TEXT", null);
        AtributoResolucion attrDetalleResolucion = obtenerOCrearAtributo("Detalle de resolución", "TEXTAREA", null);
        AtributoResolucion attrAdjuntosAdicionales = obtenerOCrearAtributo("Adjuntos adicionales", "FILE", null);

        upsertTipoResolucion("OTRA", resolutorDefault, List.of(
            new AtributoConfig(attrDescCorta, true, 1),
            new AtributoConfig(attrDetalleResolucion, true, 2),
            new AtributoConfig(attrAdjuntosAdicionales, false, 3)
        ));

        System.out.println("✅ Seeding Formatos Dinámicos Nivel 2 Terminado.");
    }

    private void upsertTipoResolucion(String tipo, User resolutor, List<AtributoConfig> atributos) {
        TipoResolucion tr = tipoResolucionRepository.findByTipoIgnoreCase(tipo).orElse(new TipoResolucion());
        tr.setTipo(tipo);
        tr.setResolutor(resolutor);
        tr.setActivo(true);
        
        // Forzar siempre la actualización y orden de los atributos para garantizar la consistencia en el entorno local de pruebas
        if (tr.getAtributosConfig() == null) {
            tr.setAtributosConfig(new java.util.ArrayList<>());
        } else {
            tr.getAtributosConfig().clear();
        }
        
        for (AtributoConfig ac : atributos) {
            agregarAtributo(tr, ac.attr, ac.requerido, ac.orden);
        }
        tipoResolucionRepository.save(tr);
    }

    @lombok.AllArgsConstructor
    private static class AtributoConfig {
        AtributoResolucion attr;
        boolean requerido;
        int orden;
    }


    private AtributoResolucion obtenerOCrearAtributo(String nombre, String tipoDato, String opciones) {
        return atributoRepository.findAll().stream()
                .filter(a -> a.getNombre().equals(nombre))
                .findFirst()
                .map(a -> {
                    if (!tipoDato.equals(a.getTipoDato()) || 
                        (opciones != null && !opciones.equals(a.getOpciones()))) {
                        a.setTipoDato(tipoDato);
                        a.setOpciones(opciones);
                        return atributoRepository.save(a);
                    }
                    return a;
                })
                .orElseGet(() -> {
                    AtributoResolucion attr = new AtributoResolucion();
                    attr.setNombre(nombre);
                    attr.setTipoDato(tipoDato);
                    attr.setOpciones(opciones);
                    attr.setActivo(true);
                    return atributoRepository.save(attr);
                });
    }

    private void agregarAtributo(TipoResolucion tipo, AtributoResolucion attr, boolean requerido, int orden) {
        TipoResolucionAtributo link = new TipoResolucionAtributo();
        link.setTipoResolucion(tipo);
        link.setAtributo(attr);
        link.setRequerido(requerido);
        link.setOrden(orden);
        tipo.getAtributosConfig().add(link);
    }
}
