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

        // Limpieza de esquemas antiguos (Remanentes de Stage 2)
        try {
            entityManager.createNativeQuery("ALTER TABLE solicitudes DROP CONSTRAINT IF EXISTS FKEBLFBCPH338HYXL8QLN48EUOA").executeUpdate();
            entityManager.createNativeQuery("DROP TABLE IF EXISTS responsables CASCADE").executeUpdate();
            System.out.println("✅ Remanentes de esquema antiguo (Stage 2) eliminados exitosamente.");
        } catch (Exception e) {
            System.out.println("ℹ️ No se requirió limpieza de esquema antiguo o las tablas ya no existen.");
        }

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
            System.out.println("⏳ Sembrando usuarios iniciales...");
            // Admin con contraseña segura pero conocida por el sistema
            createUserIfNotFound("admin@sgp.com", "SGP_Admin_#2026_Prod_Secure_!", "ADMINISTRADOR", "Admin", "Supremo", LocalDate.of(1990, 1, 1), null, null);
            createUserIfNotFound("operador@sgp.com", "SGP_StrongPass_2026!", "OPERADOR", "Juan", "Operador", LocalDate.of(1990, 1, 1), null, null);
            createUserIfNotFound("distribuidor@sgp.com", "SGP_StrongPass_2026!", "DISTRIBUIDOR", "Maria", "Distribuidora", LocalDate.of(1990, 1, 1), null, null);

            createUserIfNotFound("jperez@sgp.com", "1234.5", "RESPONSABLE", "Juan", "Perez", LocalDate.of(1990, 1, 1), null, "Norte");
            createUserIfNotFound("pgrillo@sgp.com", "1234.5", "RESPONSABLE", "Pepe", "Grillo", LocalDate.of(1990, 1, 1), null, "Sur");

            User resolutor = createUserIfNotFound("resolutor@sgp.com", "SGP_StrongPass_2026!", "RESOLUTOR", "Ana", "Resolutora", LocalDate.of(1990, 1, 1), null, null);

            System.out.println("⏳ Limpiando datos basura (SQL Nativo)...");
            try {
                // 1. Eliminar relaciones que bloquean el borrado de usuarios
                entityManager.createNativeQuery("DELETE FROM asignacion_historial WHERE responsable_user_id IN (SELECT id FROM users WHERE last_name REGEXP '.*[0-9].*' OR email REGEXP '.*[0-9].*')").executeUpdate();
                entityManager.createNativeQuery("DELETE FROM solicitud_resolutor_assignment WHERE resolutor_id IN (SELECT id FROM users WHERE last_name REGEXP '.*[0-9].*' OR email REGEXP '.*[0-9].*')").executeUpdate();

                // Limpiar default_resolutor_id en tipo_resolucion
                entityManager.createNativeQuery("UPDATE tipo_resolucion SET default_resolutor_id = NULL WHERE default_resolutor_id IN (SELECT id FROM users WHERE last_name REGEXP '.*[0-9].*' OR email REGEXP '.*[0-9].*')").executeUpdate();

                // 2. Limpiar referencias en solicitudes y adjuntos (poner a null)
                entityManager.createNativeQuery("UPDATE solicitudes SET responsable_id = NULL WHERE responsable_id IN (SELECT id FROM users WHERE last_name REGEXP '.*[0-9].*' OR email REGEXP '.*[0-9].*')").executeUpdate();
                entityManager.createNativeQuery("UPDATE solicitudes SET resolutor_asignado_id = NULL WHERE resolutor_asignado_id IN (SELECT id FROM users WHERE last_name REGEXP '.*[0-9].*' OR email REGEXP '.*[0-9].*')").executeUpdate();
                entityManager.createNativeQuery("UPDATE solicitudes SET created_by_id = NULL WHERE created_by_id IN (SELECT id FROM users WHERE last_name REGEXP '.*[0-9].*' OR email REGEXP '.*[0-9].*')").executeUpdate();
                entityManager.createNativeQuery("UPDATE documento_adjunto SET uploaded_by_id = NULL WHERE uploaded_by_id IN (SELECT id FROM users WHERE last_name REGEXP '.*[0-9].*' OR email REGEXP '.*[0-9].*')").executeUpdate();

                // 3. Borrar usuarios basura
                int deletedUsers = entityManager.createNativeQuery("DELETE FROM users WHERE last_name REGEXP '.*[0-9].*' OR email REGEXP '.*[0-9].*'").executeUpdate();
                if (deletedUsers > 0) System.out.println("🗑️ Usuarios basura eliminados: " + deletedUsers);

                // 4. Limpiar Tipos y Atributos basura
                entityManager.createNativeQuery("DELETE FROM tipo_resolucion_atributo WHERE tipo_resolucion_id IN (SELECT id FROM tipo_resolucion WHERE tipo REGEXP '.*[0-9].*')").executeUpdate();
                entityManager.createNativeQuery("DELETE FROM tipo_resolucion_atributo WHERE atributo_resolucion_id IN (SELECT id FROM atributo_resolucion WHERE nombre REGEXP '.*[0-9].*')").executeUpdate();

                int deletedTypes = entityManager.createNativeQuery("DELETE FROM tipo_resolucion WHERE tipo REGEXP '.*[0-9].*'").executeUpdate();
                int deletedAttrs = entityManager.createNativeQuery("DELETE FROM atributo_resolucion WHERE nombre REGEXP '.*[0-9].*'").executeUpdate();

                if (deletedTypes > 0) System.out.println("🗑️ Tipos de resolución basura eliminados: " + deletedTypes);
                if (deletedAttrs > 0) System.out.println("🗑️ Atributos basura eliminados: " + deletedAttrs);

            } catch (Exception e) {
                System.err.println("⚠️ Nota: Error parcial en limpieza SQL (posiblemente ya limpio o restricciones remanentes): " + e.getMessage());
            }

            // 2. Initialize Locations from dataset
            initializeLocations();

            // 3. Seed TipoResolucion and Atributos Globales
            seedTiposYAtributos(resolutor);

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

    private User createUserIfNotFound(String email, String password, String role, String firstName, String lastName, LocalDate birthDate, String phone, String zone) {
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
        AtributoResolucion attrDatoObs = obtenerOCrearAtributo("Detalle u observaciones", "TEXTAREA", null);
        AtributoResolucion attrFecha = obtenerOCrearAtributo("Fecha", "DATE", null);
        AtributoResolucion attrMonto = obtenerOCrearAtributo("Monto solicitado", "NUMBER", null);
        AtributoResolucion attrInstitucion = obtenerOCrearAtributo("Dato de la institución / solicitante", "TEXT", null);
        AtributoResolucion attrDecInteres = obtenerOCrearAtributo("Declaración Interés", "SELECT", "SI,NO");
        AtributoResolucion attrCBU = obtenerOCrearAtributo("Constancia de CBU (adjuntar pdf)", "FILE", null);

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

        upsertTipoResolucion("MATERIALES", resolutorDefault, List.of());
        upsertTipoResolucion("ASESORAMIENTO", resolutorDefault, List.of());
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
