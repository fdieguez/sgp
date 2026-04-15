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

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final com.sgp.backend.repository.SheetsConfigRepository sheetsConfigRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.sgp.backend.repository.ResponsableRepository responsableRepository;
    private final com.sgp.backend.repository.LocationRepository locationRepository;
    private final com.sgp.backend.repository.SolicitudRepository solicitudRepository;
    private final com.sgp.backend.repository.AsignacionHistorialRepository asignacionHistorialRepository;

    private final TipoResolucionRepository tipoResolucionRepository;
    private final AtributoResolucionRepository atributoRepository;

    @Override
    public void run(String... args) throws Exception {
        solicitudRepository.findAll().forEach(s -> {
            s.setResponsable(null);
            solicitudRepository.save(s);
        });

        asignacionHistorialRepository.deleteAll();
        responsableRepository.deleteAll();

        // 1. Seed Users (5 Roles Test Users)
        createUserIfNotFound("admin@sgp.com", "SGP_StrongPass_2026!", "ADMINISTRADOR", "Admin", "Supremo", LocalDate.of(1990, 1, 1));
        createUserIfNotFound("operador@sgp.com", "SGP_StrongPass_2026!", "OPERADOR", "Juan", "Operador", LocalDate.of(1990, 1, 1));
        createUserIfNotFound("distribuidor@sgp.com", "SGP_StrongPass_2026!", "DISTRIBUIDOR", "Maria", "Distribuidora", LocalDate.of(1990, 1, 1));
        
        User jperez = createUserIfNotFound("jperez@sgp.com", "1234.5", "RESPONSABLE", "Juan", "Perez", LocalDate.of(1990, 1, 1));
        User pgrillo = createUserIfNotFound("pgrillo@sgp.com", "1234.5", "RESPONSABLE", "Pepe", "Grillo", LocalDate.of(1990, 1, 1));
        
        User resolutor = createUserIfNotFound("resolutor@sgp.com", "SGP_StrongPass_2026!", "RESOLUTOR", "Ana", "Resolutora", LocalDate.of(1990, 1, 1));

        createResponsableIfNotFound("Juan Perez", jperez, "Norte");
        createResponsableIfNotFound("Pepe Grillo", pgrillo, "Sur");

        // 2. Initialize Locations from dataset
        initializeLocations();

        // 3. Seed TipoResolucion and Atributos Globales
        seedTiposYAtributos(resolutor);
    }

    private void initializeLocations() {
        if (locationRepository.count() > 0) return;

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
        } catch (Exception e) {
            System.err.println("❌ Error al cargar las localidades: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private User createUserIfNotFound(String email, String password, String role, String firstName, String lastName, LocalDate birthDate) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(role);
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setBirthDate(birthDate);

            User savedUser = userRepository.save(user);
            System.out.println("✅ User created: " + email + " (" + role + ")");
            return savedUser;
        });
    }

    private void createResponsableIfNotFound(String name, User user, String zone) {
        if (responsableRepository.findAll().stream().noneMatch(r -> r.getName().equals(name))) {
            com.sgp.backend.entity.Responsable responsable = new com.sgp.backend.entity.Responsable();
            responsable.setName(name);
            responsable.setUser(user);
            responsable.setZone(zone);
            responsableRepository.save(responsable);
            System.out.println("✅ Responsable created: " + name + " (Zone: " + zone + ")");
        }
    }

    private void seedTiposYAtributos(User resolutorDefault) {
        if (tipoResolucionRepository.count() > 0) return;

        // Create Global Attributes
        AtributoResolucion attrDatoObs = obtenerOCrearAtributo("Detalle u observaciones", "TEXTAREA", null);
        AtributoResolucion attrFecha = obtenerOCrearAtributo("Fecha", "DATE", null);
        AtributoResolucion attrMonto = obtenerOCrearAtributo("Monto solicitado", "NUMBER", null);
        AtributoResolucion attrInstitucion = obtenerOCrearAtributo("Dato de la institución / solicitante", "TEXT", null);
        AtributoResolucion attrDecInteres = obtenerOCrearAtributo("Declaración Interés", "SELECT", "SI,NO");
        AtributoResolucion attrCBU = obtenerOCrearAtributo("Constancia de CBU (adjuntar pdf)", "FILE", null);

        // CREATE: AGENDA
        TipoResolucion agenda = new TipoResolucion();
        agenda.setTipo("AGENDA");
        agenda.setResolutor(resolutorDefault);
        agenda = tipoResolucionRepository.save(agenda);
        
        agregarAtributo(agenda, attrFecha, true, 1);
        agregarAtributo(agenda, attrDecInteres, true, 2);
        agregarAtributo(agenda, attrDatoObs, true, 3);
        tipoResolucionRepository.save(agenda);

        // CREATE: SUBSIDIO
        TipoResolucion subsidio = new TipoResolucion();
        subsidio.setTipo("SUBSIDIO");
        subsidio.setResolutor(resolutorDefault);
        subsidio = tipoResolucionRepository.save(subsidio);

        agregarAtributo(subsidio, attrInstitucion, true, 1);
        agregarAtributo(subsidio, attrMonto, false, 2);
        agregarAtributo(subsidio, attrCBU, false, 3);
        agregarAtributo(subsidio, attrDatoObs, false, 4);
        tipoResolucionRepository.save(subsidio);
        
        // ADD DUMMIES TO MATCH LIST
        TipoResolucion dummy1 = new TipoResolucion(); dummy1.setTipo("MATERIALES"); dummy1.setResolutor(resolutorDefault); tipoResolucionRepository.save(dummy1);
        TipoResolucion dummy2 = new TipoResolucion(); dummy2.setTipo("ASESORAMIENTO"); dummy2.setResolutor(resolutorDefault); tipoResolucionRepository.save(dummy2);
        TipoResolucion dummy3 = new TipoResolucion(); dummy3.setTipo("DECLARACION DE INTERES"); dummy3.setResolutor(resolutorDefault); tipoResolucionRepository.save(dummy3);

        System.out.println("✅ Seeding Formatos Dinámicos Nivel 2 Terminado.");
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
