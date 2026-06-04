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

    private final TipoResolucionRepository tipoResolucionRepository;
    private final AtributoResolucionRepository atributoRepository;
    private final jakarta.persistence.EntityManager entityManager;

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
                "matias.ippolito@gmail.com",
                "sabrivschmidt@gmail.com",
                "matias.ippolito.responsable@gmail.com",
                "barbarabrancatto@gmail.com",
                "matias.ippolito.resolutor@gmail.com",
                "barbarabrancatto.resolutor@gmail.com",
                "martinnocioni@gmail.com",
                "mvgonza79@gmail.com",
                "ealfaro.51@gmail.com"
            );

            try {
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

            // Sembrar Distribuidores
            createUserIfNotFound("matias.ippolito@gmail.com", "Matias_Dist_SGP_2026!", "DISTRIBUIDOR", "Matías", "Ippolito", LocalDate.of(1990, 1, 1), "3426148609", null, "28.925.931");
            createUserIfNotFound("sabrivschmidt@gmail.com", "Sabrina_SGP_2026$", "DISTRIBUIDOR", "Sabrina", "Schmidt", LocalDate.of(1990, 1, 1), "3424777085", null, "31.273.418");

            // Sembrar Responsables
            createUserIfNotFound("matias.ippolito.responsable@gmail.com", "Matias_Resp_SGP_2026!", "RESPONSABLE", "Matías", "Ippolito", LocalDate.of(1990, 1, 1), "3426148609", "Norte", "28.925.931");
            createUserIfNotFound("barbarabrancatto@gmail.com", "Barbara_Resp_SGP_2026!", "RESPONSABLE", "Barbara", "Brancatto", LocalDate.of(1990, 1, 1), "3424216840", "Sur", "26.972.841");

            // Sembrar Resolutores
            User resMatias = createUserIfNotFound("matias.ippolito.resolutor@gmail.com", "Matias_Res_SGP_2026!", "RESOLUTOR", "Matías", "Ippolito", LocalDate.of(1990, 1, 1), "3426148609", null, "28.925.931");
            User resBarbara = createUserIfNotFound("barbarabrancatto.resolutor@gmail.com", "Barbara_Res_SGP_2026!", "RESOLUTOR", "Barbara", "Brancatto", LocalDate.of(1990, 1, 1), "3424216840", null, "26.972.841");
            User resMartin = createUserIfNotFound("martinnocioni@gmail.com", "Martin_SGP_2026*", "RESOLUTOR", "Martín", "Nocioni", LocalDate.of(1990, 1, 1), "3426144703", null, "31.111.251");
            User resMaria = createUserIfNotFound("mvgonza79@gmail.com", "Maria_SGP_2026%", "RESOLUTOR", "María Veronica", "Gonzalez", LocalDate.of(1990, 1, 1), "3425119354", null, "27.620.830");
            User resEduardo = createUserIfNotFound("ealfaro.51@gmail.com", "Eduardo_SGP_2026^", "RESOLUTOR", "Eduardo", "Alfaro", LocalDate.of(1990, 1, 1), "3434404035", null, "32.831.230");

            // 2. Initialize Locations from dataset
            initializeLocations();

            // 3. Seed TipoResolucion y Atributos (Omitido)
            seedTiposYAtributos(null);

            // 4. Vincular Tipos de Resolución a Resolutores en la Base de Datos (ManyToMany)
            System.out.println("⏳ Vinculando tipos de resolución a perfiles de resolutores...");
            
            tipoResolucionRepository.findByTipoIgnoreCase("AGENDA").ifPresent(tr -> {
                tr.setResolutor(resMaria);
                tipoResolucionRepository.save(tr);
                
                resMaria.getTiposResolucion().clear();
                resMaria.getTiposResolucion().add(tr);
                userRepository.save(resMaria);
            });

            tipoResolucionRepository.findByTipoIgnoreCase("SUBSIDIO").ifPresent(tr -> {
                tr.setResolutor(resMartin);
                tipoResolucionRepository.save(tr);
                
                resMartin.getTiposResolucion().clear();
                resMartin.getTiposResolucion().add(tr);
                userRepository.save(resMartin);
            });

            tipoResolucionRepository.findByTipoIgnoreCase("DECLARACION DE INTERES").ifPresent(tr -> {
                tr.setResolutor(resEduardo);
                tipoResolucionRepository.save(tr);
                
                resEduardo.getTiposResolucion().clear();
                resEduardo.getTiposResolucion().add(tr);
                userRepository.save(resEduardo);
            });

            tipoResolucionRepository.findByTipoIgnoreCase("OTRA").ifPresent(tr -> {
                // Asignar Matías Ippolito como el resolutor por defecto de OTRA
                tr.setResolutor(resMatias);
                tipoResolucionRepository.save(tr);
                
                resMatias.getTiposResolucion().clear();
                resMatias.getTiposResolucion().add(tr);
                userRepository.save(resMatias);

                // Barbara también puede resolver OTRA
                resBarbara.getTiposResolucion().clear();
                resBarbara.getTiposResolucion().add(tr);
                userRepository.save(resBarbara);
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

            System.out.println("✅ DataInitializer finalizado exitosamente.");
        } catch (Exception e) {
            System.err.println("❌ Error crítico en inicialización de datos: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void initializeLocations() {
        if (locationRepository.count() > 0) {
            // Si ya hay localidades en la base de datos, aseguramos que las requeridas estén marcadas como visibles
            actualizarLocalidadesVisibles();
            return;
        }

        System.out.println("⏳ Cargando dataset de localidades de Santa Fe...");
        try (java.io.InputStream is = getClass().getResourceAsStream("/dataset/santa_fe_locations_dataset.txt");
             java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(is, java.nio.charset.StandardCharsets.UTF_8))) {

            String line;
            com.sgp.backend.entity.Location currentProvince = null;
            com.sgp.backend.entity.Location currentCity = null;
            int count = 0;

            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;

                String[] parts = line.split("\\|");
                if (parts.length != 2) continue;

                String type = parts[0];
                String name = parts[1];

                if ("PROVINCE".equals(type)) {
                    currentProvince = new com.sgp.backend.entity.Location();
                    currentProvince.setName(name);
                    currentProvince.setType("PROVINCE");
                    currentProvince = locationRepository.save(currentProvince);
                    count++;
                } else if ("CITY".equals(type) || "LOCALITY".equals(type)) {
                    currentCity = new com.sgp.backend.entity.Location();
                    currentCity.setName(name);
                    currentCity.setType("CITY");
                    currentCity.setParent(currentProvince);
                    currentCity = locationRepository.save(currentCity);
                    count++;
                } else if ("NEIGHBORHOOD".equals(type) && currentCity != null) {
                    com.sgp.backend.entity.Location neighborhood = new com.sgp.backend.entity.Location();
                    neighborhood.setName(name);
                    neighborhood.setType("NEIGHBORHOOD");
                    neighborhood.setParent(currentCity);
                    locationRepository.save(neighborhood);
                    count++;
                }
            }
            System.out.println("✅ Se inicializaron " + count + " registros de ubicación exitosamente.");

            // Aseguramos las localidades visibles para la interfaz en la base de datos recién creada
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

        // Definición de tipos básicos
        upsertTipoResolucion("AGENDA", resolutorDefault, List.of(
            new AtributoConfig(attrFecha, true, 1),
            new AtributoConfig(attrDecInteres, true, 2),
            new AtributoConfig(attrDatoObs, true, 3)
        ));

        upsertTipoResolucion("SUBSIDIO", resolutorDefault, List.of(
            new AtributoConfig(attrInstitucion, true, 1),
            new AtributoConfig(attrMonto, false, 2),
            new AtributoConfig(attrCBU, false, 3),
            new AtributoConfig(attrDatoObs, false, 4)
        ));

        upsertTipoResolucion("DECLARACION DE INTERES", resolutorDefault, List.of());

        System.out.println("✅ Seeding Formatos Dinámicos Nivel 2 Terminado.");
    }

    private void upsertTipoResolucion(String tipo, User resolutor, List<AtributoConfig> atributos) {
        TipoResolucion tr = tipoResolucionRepository.findByTipoIgnoreCase(tipo).orElse(new TipoResolucion());
        tr.setTipo(tipo);
        tr.setResolutor(resolutor);
        
        // Si es nuevo o queremos forzar atributos (simplificado: solo si es nuevo o no tiene)
        if (tr.getId() == null || tr.getAtributosConfig().isEmpty()) {
            if (tr.getAtributosConfig() == null) {
                tr.setAtributosConfig(new java.util.ArrayList<>());
            } else {
                tr.getAtributosConfig().clear();
            }
            
            for (AtributoConfig ac : atributos) {
                agregarAtributo(tr, ac.attr, ac.requerido, ac.orden);
            }
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
