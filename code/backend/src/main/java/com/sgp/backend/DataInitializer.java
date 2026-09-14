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
                // 29 usuarios oficiales de la nómina
                "martinnocioni@gmail.com",
                "fy.vildoza@gmail.com",
                "adflucha@gmail.com",
                "carinacdevard@gmail.com",
                "diegopiedrabuena74@gmail.com",
                "ealfaro.51@gmail.com",
                "faculanfranchi@gmail.com",
                "celeste_solari19@hotmail.com",
                "analiamasutti@gmail.com",
                "sabrivschmidt@gmail.com",
                "hrdorigo@gmail.com",
                "florenciabarducco@gmail.com",
                "camilarodriguezdelcurto@gmail.com",
                "mveronicagonzalez79@gmail.com",
                "ayecollado89@gmail.com",
                "juanm.dieguez@gmail.com",
                "caraffamaxi@gmail.com",
                "matias.ippolito@gmail.com",
                "nacho.bonadeo@gmail.com",
                "victorhugogonzalez618@gmail.com",
                "axeldariomenor@gmail.com",
                "lea.aufranc@gmail.com",
                "javier.i.cuello@gmail.com",
                "lucianobaez0505@gmail.com",
                "ayelencdutruel@gmail.com",
                "erifigueroa1905@gmail.com",
                "machicotegaston@gmail.com",
                "milagrosscaceres@gmail.com",
                "barbarabrancatto@gmail.com",
                // 4 cuentas de sistema
                "admin@sgp.com",
                "auditor.sheets@gmail.com",
                "test.auditor@gmail.com",
                "resolutor@sgp.com"
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

                if (overwriteUsers) {
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
                } else {
                    System.out.println("ℹ️ sgp.seed.overwrite-users=false: Se omite la purga de usuarios existentes y conservación estricta.");
                }
            } catch (Exception e) {
                System.err.println("⚠️ Nota: Error parcial al purgar usuarios viejos: " + e.getMessage());
            }

            // Sembrar Cuentas de Sistema
            createUserIfNotFound("admin@sgp.com", "SGP_Admin_#2026_Prod_Secure_!", "ADMINISTRADOR", "Admin", "Supremo", LocalDate.of(1990, 1, 1), "3420000000", null, "12345678");
            User resDefault = createUserIfNotFound("resolutor@sgp.com", "Resolutor_SGP_2026!", "RESOLUTOR", "Resolutor", "Defecto", LocalDate.of(1990, 1, 1), "3420000000", null, "31222333");
            createUserIfNotFound("auditor.sheets@gmail.com", "Lector_SGP_2026#", "LECTOR", "Auditor", "Sheets", LocalDate.of(1990, 1, 1), "3420000000", null, "33444555");
            createUserIfNotFound("test.auditor@gmail.com", "Auditor_SGP_2026!", "AUDITOR", "Auditor", "Seguimiento", LocalDate.of(1990, 1, 1), "3424444444", null, "36666666");

            // Sembrar Usuarios de Nómina Oficial y Sistema (29 usuarios)
            User resMartin = createUserIfNotFound("martinnocioni@gmail.com", "Martin_SGP_2026*", "RESPONSABLE,RESOLUTOR", "Martin", "Nocioni", LocalDate.of(1990, 1, 1), "3426144703", null, "31111251");
            createUserIfNotFound("fy.vildoza@gmail.com", "Florencia$2026#Uw", "RESPONSABLE,DISTRIBUIDOR", "FLORENCIA", "VILDOZA", LocalDate.of(1990, 1, 1), "3425008539", null, "35448744");
            createUserIfNotFound("adflucha@gmail.com", "Alejandro#2026!Dt", "RESPONSABLE", "Alejandro", "Fluchá", LocalDate.of(1990, 1, 1), "3424766314", null, "37451391");
            createUserIfNotFound("carinacdevard@gmail.com", "Carina!2026!Qg", "RESPONSABLE", "Carina", "Devard", LocalDate.of(1990, 1, 1), "3425346032", null, "22861416");
            createUserIfNotFound("diegopiedrabuena74@gmail.com", "Diego#2026&Mn", "RESPONSABLE", "Diego", "Piedrabuena", LocalDate.of(1990, 1, 1), "3424460555", null, "23738440");
            User resEduardo = createUserIfNotFound("ealfaro.51@gmail.com", "Eduardo_SGP_2026^", "RESPONSABLE,RESOLUTOR", "Eduardo", "Alfaro", LocalDate.of(1990, 1, 1), "3434404035", null, "32831230");
            createUserIfNotFound("faculanfranchi@gmail.com", "Facu&2026&Ge", "RESPONSABLE", "Facu", "Lanfranchi", LocalDate.of(1990, 1, 1), "3425413301", null, "31419507");
            createUserIfNotFound("celeste_solari19@hotmail.com", "Celeste_SGP_2026#", "OPERADOR", "Maria Celeste", "Solari", LocalDate.of(1990, 1, 1), "3424760480", null, "30562372");
            createUserIfNotFound("analiamasutti@gmail.com", "Analia&2026&Xq", "RESPONSABLE", "Analia", "Masutti", LocalDate.of(1990, 1, 1), "3434608357", null, "33322523");
            createUserIfNotFound("sabrivschmidt@gmail.com", "Sabrina_SGP_2026$", "OPERADOR", "Sabrina", "Schmidt", LocalDate.of(1990, 1, 1), "3424777085", null, "31273418");
            createUserIfNotFound("hrdorigo@gmail.com", "Hernan&2026!Dz", "RESPONSABLE", "Hernán Rubens", "Dorigo", LocalDate.of(1990, 1, 1), "3424638141", null, "25402746");
            createUserIfNotFound("florenciabarducco@gmail.com", "Maria!2026#Tg", "RESPONSABLE", "María Florencia", "Barducco", LocalDate.of(1990, 1, 1), "3424497204", null, "33839349");
            createUserIfNotFound("camilarodriguezdelcurto@gmail.com", "China$2026!Fc", "RESPONSABLE", "China", "Rodriguez Del Curto", LocalDate.of(1990, 1, 1), "3425357954", null, "33891921");
            User resMaria = createUserIfNotFound("mveronicagonzalez79@gmail.com", "Maria_SGP_2026%", "RESPONSABLE,RESOLUTOR", "Verónica", "González", LocalDate.of(1990, 1, 1), "3425119354", null, "27620830");
            createUserIfNotFound("ayecollado89@gmail.com", "Ayelen$2026&Gj", "RESPONSABLE", "Ayelén", "Collado", LocalDate.of(1990, 1, 1), "3425430464", null, "34394418");
            createUserIfNotFound("juanm.dieguez@gmail.com", "Juan$2026@Gd", "AUDITOR", "Juan Manuel", "Dieguez", LocalDate.of(1990, 1, 1), "3424734898", null, "31058854");
            createUserIfNotFound("caraffamaxi@gmail.com", "Maxi!2026$Lh", "RESPONSABLE,DISTRIBUIDOR", "Maxi", "Caraffa", LocalDate.of(1990, 1, 1), "3425129767", null, "33568046");
            createUserIfNotFound("matias.ippolito@gmail.com", "Matias_Dist_SGP_2026!", "RESPONSABLE,DISTRIBUIDOR", "Matías", "Ippólito", LocalDate.of(1990, 1, 1), "3426148609", "NORTE", "28925931");
            createUserIfNotFound("nacho.bonadeo@gmail.com", "Juan@2026$Fa", "RESPONSABLE", "Juan", "Bonadeo", LocalDate.of(1990, 1, 1), "3424781312", "NOROESTE", "34301949");
            createUserIfNotFound("victorhugogonzalez618@gmail.com", "Victor@2026!Rk", "RESPONSABLE", "Victor Hugo", "Gonzalez", LocalDate.of(1990, 1, 1), "3424348588", "OESTE", "16203521");
            createUserIfNotFound("axeldariomenor@gmail.com", "Axel&2026!Gf", "RESPONSABLE", "Axel Dario", "Menor", LocalDate.of(1990, 1, 1), "3424297493", null, "21412093");
            createUserIfNotFound("lea.aufranc@gmail.com", "Leandro&2026&Kb", "RESPONSABLE", "Leandro", "Suarez Aufranc", LocalDate.of(1990, 1, 1), "3425009056", null, "35468210");
            createUserIfNotFound("javier.i.cuello@gmail.com", "Javier#2026&Tu", "RESPONSABLE", "Javier", "Cuello", LocalDate.of(1990, 1, 1), "3425289616", "SUROESTE", "29618855");
            createUserIfNotFound("lucianobaez0505@gmail.com", "Seba!2026#Bg", "RESPONSABLE", "Seba", "Baez", LocalDate.of(1990, 1, 1), "3424211791", "OESTE", "30501806");
            createUserIfNotFound("ayelencdutruel@gmail.com", "Ayelen&2026#Vh", "RESPONSABLE", "Ayelen", "Dutruel", LocalDate.of(1990, 1, 1), "3425211843", "COSTA", "34748919");
            createUserIfNotFound("erifigueroa1905@gmail.com", "Erica@2026!Jb", "RESPONSABLE", "Erica", "Figueroa", LocalDate.of(1990, 1, 1), "3424680912", null, "31873373");
            createUserIfNotFound("machicotegaston@gmail.com", "Gaston@2026$Lq", "RESPONSABLE", "Gastón", "Machicote", LocalDate.of(1990, 1, 1), "3425161923", "SUROESTE", "35448175");
            createUserIfNotFound("milagrosscaceres@gmail.com", "Milagros$2026#Hp", "RESPONSABLE", "Milagros", "Cáceres", LocalDate.of(1990, 1, 1), "3425139472", null, "40646661");
            createUserIfNotFound("barbarabrancatto@gmail.com", "Barbara_Resp_SGP_2026!", "RESPONSABLE", "Barbara", "Brancatto", LocalDate.of(1990, 1, 1), "3424216840", null, "26972841");

            // 2. Initialize Locations from dataset
            initializeLocations();

            // 3. Seed TipoResolucion y Atributos
            seedTiposYAtributos(resDefault);

            // 4. Vincular Tipos de Resolución a Resolutores en la Base de Datos (ManyToMany)
            System.out.println("⏳ Vinculando tipos de resolución a perfiles de resolutores...");
            
            // Primero limpiar las relaciones previas para estos usuarios específicos si overwriteUsers está activado
            if (overwriteUsers) {
                entityManager.createNativeQuery("DELETE FROM user_tipo_resolucion WHERE user_id IN (:ids)")
                             .setParameter("ids", List.of(resMaria.getId(), resMartin.getId(), resEduardo.getId(), resDefault.getId()))
                             .executeUpdate();
            }
            
            tipoResolucionRepository.findByTipoIgnoreCase("AGENDA").ifPresent(tr -> {
                if (overwriteUsers || tr.getResolutor() == null) {
                    tr.setResolutor(resMaria);
                    tipoResolucionRepository.save(tr);
                }
                
                Number count = (Number) entityManager.createNativeQuery(
                    "SELECT COUNT(*) FROM user_tipo_resolucion WHERE user_id = :userId AND tipo_resolucion_id = :tipoId")
                    .setParameter("userId", resMaria.getId())
                    .setParameter("tipoId", tr.getId())
                    .getSingleResult();
                if (count.intValue() == 0) {
                    entityManager.createNativeQuery("INSERT INTO user_tipo_resolucion (user_id, tipo_resolucion_id) VALUES (:userId, :tipoId)")
                                 .setParameter("userId", resMaria.getId())
                                 .setParameter("tipoId", tr.getId())
                                 .executeUpdate();
                }
            });

            tipoResolucionRepository.findByTipoIgnoreCase("SUBSIDIO").ifPresent(tr -> {
                if (overwriteUsers || tr.getResolutor() == null) {
                    tr.setResolutor(resMartin);
                    tipoResolucionRepository.save(tr);
                }
                
                Number count = (Number) entityManager.createNativeQuery(
                    "SELECT COUNT(*) FROM user_tipo_resolucion WHERE user_id = :userId AND tipo_resolucion_id = :tipoId")
                    .setParameter("userId", resMartin.getId())
                    .setParameter("tipoId", tr.getId())
                    .getSingleResult();
                if (count.intValue() == 0) {
                    entityManager.createNativeQuery("INSERT INTO user_tipo_resolucion (user_id, tipo_resolucion_id) VALUES (:userId, :tipoId)")
                                 .setParameter("userId", resMartin.getId())
                                 .setParameter("tipoId", tr.getId())
                                 .executeUpdate();
                }
            });

            tipoResolucionRepository.findByTipoIgnoreCase("DECLARACION DE INTERES").ifPresent(tr -> {
                if (overwriteUsers || tr.getResolutor() == null) {
                    tr.setResolutor(resEduardo);
                    tipoResolucionRepository.save(tr);
                }
                
                Number count = (Number) entityManager.createNativeQuery(
                    "SELECT COUNT(*) FROM user_tipo_resolucion WHERE user_id = :userId AND tipo_resolucion_id = :tipoId")
                    .setParameter("userId", resEduardo.getId())
                    .setParameter("tipoId", tr.getId())
                    .getSingleResult();
                if (count.intValue() == 0) {
                    entityManager.createNativeQuery("INSERT INTO user_tipo_resolucion (user_id, tipo_resolucion_id) VALUES (:userId, :tipoId)")
                                 .setParameter("userId", resEduardo.getId())
                                 .setParameter("tipoId", tr.getId())
                                 .executeUpdate();
                }
            });

            tipoResolucionRepository.findByTipoIgnoreCase("OTRA").ifPresent(tr -> {
                if (overwriteUsers || tr.getResolutor() == null) {
                    tr.setResolutor(resDefault);
                    tipoResolucionRepository.save(tr);
                }
                
                Number count = (Number) entityManager.createNativeQuery(
                    "SELECT COUNT(*) FROM user_tipo_resolucion WHERE user_id = :userId AND tipo_resolucion_id = :tipoId")
                    .setParameter("userId", resDefault.getId())
                    .setParameter("tipoId", tr.getId())
                    .getSingleResult();
                if (count.intValue() == 0) {
                    entityManager.createNativeQuery("INSERT INTO user_tipo_resolucion (user_id, tipo_resolucion_id) VALUES (:userId, :tipoId)")
                                 .setParameter("userId", resDefault.getId())
                                 .setParameter("tipoId", tr.getId())
                                 .executeUpdate();
                }
            });

            // Asignar zona por defecto de forma secuencial a los responsables que no tengan una asignada (solo si overwriteUsers está activado)
            if (overwriteUsers) {
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
            }

            List<com.sgp.backend.entity.Project> proyectosExistentes = projectRepository.findAll();
            boolean existeAgenda = proyectosExistentes.stream().anyMatch(p -> "Proyecto de Agenda E2E".equalsIgnoreCase(p.getName()));
            boolean existeSubsidio = proyectosExistentes.stream().anyMatch(p -> "Proyecto de Subsidio E2E".equalsIgnoreCase(p.getName()));

            if (!existeAgenda) {
                System.out.println("⏳ Sembrando proyecto de Agenda por defecto...");
                
                com.sgp.backend.entity.SheetsConfig sc1 = new com.sgp.backend.entity.SheetsConfig();
                sc1.setSpreadsheetId("spreadsheet-agenda-default-id");
                sc1.setSheetName("AGENDA");
                sc1.setCalendarId("mveronicagonzalez79@gmail.com");
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
                            sc.setCalendarId("mveronicagonzalez79@gmail.com");
                            sc.setStatus("ACTIVE");
                            sheetsConfigRepository.save(sc);
                            System.out.println("✅ Proyecto de Agenda existente restaurado con configuraciones por defecto.");
                        }
                    });
            }

            if (!existeSubsidio) {
                System.out.println("⏳ Sembrando proyecto de Subsidio por defecto...");
                
                com.sgp.backend.entity.SheetsConfig sc2 = new com.sgp.backend.entity.SheetsConfig();
                sc2.setSpreadsheetId("1jPw9ni4BW_bRfw_M9aja7jO5RGX5IFq8w43T3W0Xz6g");
                sc2.setSheetName("DESA");
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
                        if (sc != null && (sc.getSpreadsheetId() == null || sc.getSpreadsheetId().trim().isEmpty() || sc.getSpreadsheetId().startsWith("spreadsheet-"))) {
                            sc.setSpreadsheetId("1jPw9ni4BW_bRfw_M9aja7jO5RGX5IFq8w43T3W0Xz6g");
                            sc.setSheetName("DESA");
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

        // Atributos específicos de DECLARACION DE INTERES para la Etapa 11 (13 campos ordenados)
        AtributoResolucion attrNombreEvento = obtenerOCrearAtributo("Nombre completo del evento", "TEXT", null);
        AtributoResolucion attrActividadDec = obtenerOCrearAtributo("Actividad", "TEXT", null);
        AtributoResolucion attrInstitucionDec = obtenerOCrearAtributo("Institución a declarar", "TEXT", null);
        AtributoResolucion attrTipoDec = obtenerOCrearAtributo("Tipo", "SELECT", "cultural,educativo,científico,deportivo,social,otro");
        AtributoResolucion attrDescripcionDec = obtenerOCrearAtributo("Descripción", "TEXTAREA", null);
        AtributoResolucion attrLocalidadDec = obtenerOCrearAtributo("Localidad", "SELECT", null);
        AtributoResolucion attrDireccionDec = obtenerOCrearAtributo("Dirección", "TEXT", null);
        AtributoResolucion attrFundamentosDec = obtenerOCrearAtributo("Fundamentos", "TEXTAREA", null);
        AtributoResolucion attrFlyerNotaDec = obtenerOCrearAtributo("Flyer/nota", "FILE", null);

        upsertTipoResolucion("DECLARACION DE INTERES", resolutorDefault, List.of(
            new AtributoConfig(attrNombreEvento, true, 1),
            new AtributoConfig(attrActividadDec, true, 2),
            new AtributoConfig(attrInstitucionDec, true, 3),
            new AtributoConfig(attrTipoDec, true, 4),
            new AtributoConfig(attrDescripcionDec, true, 5),
            new AtributoConfig(attrLocalidadDec, true, 6),
            new AtributoConfig(attrFecha, true, 7),
            new AtributoConfig(attrHora, false, 8), // Opcional
            new AtributoConfig(attrDireccionDec, true, 9),
            new AtributoConfig(attrFundamentosDec, true, 10),
            new AtributoConfig(attrFlyerNotaDec, false, 11), // Opcional
            new AtributoConfig(attrDatoObs, false, 12), // Opcional
            new AtributoConfig(attrResponsable, true, 13)
        ));

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
        if (overwriteUsers || tr.getResolutor() == null) {
            tr.setResolutor(resolutor);
        }
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
