package com.sgp.backend;

import com.sgp.backend.entity.User;
import com.sgp.backend.repository.UserRepository;
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
    private final com.sgp.backend.repository.ResolutorConfigRepository resolutorConfigRepository;
    private final com.sgp.backend.repository.SolicitudRepository solicitudRepository;
    private final com.sgp.backend.repository.AsignacionHistorialRepository asignacionHistorialRepository;

    @Override
    public void run(String... args) throws Exception {
        // 1. Remove assigned responsables from previous Solicitudes to free up FK constraints
        solicitudRepository.findAll().forEach(s -> {
            s.setResponsable(null);
            solicitudRepository.save(s);
        });

        // 2. Clear assignment histories, as they also hold FK to responsables
        asignacionHistorialRepository.deleteAll();

        // 3. Now we can safely remove previous test responsables
        responsableRepository.deleteAll();

        // 1. Seed Users (5 Roles Test Users)
        createUserIfNotFound("admin@sgp.com", "SGP_StrongPass_2026!", "ADMINISTRADOR", "Admin", "Supremo", LocalDate.of(1990, 1, 1));
        createUserIfNotFound("operador@sgp.com", "SGP_StrongPass_2026!", "OPERADOR", "Juan", "Operador", LocalDate.of(1990, 1, 1));
        createUserIfNotFound("distribuidor@sgp.com", "SGP_StrongPass_2026!", "DISTRIBUIDOR", "Maria", "Distribuidora", LocalDate.of(1990, 1, 1));
        
        // Exact Responsables from client constraints
        User jperez = createUserIfNotFound("jperez@sgp.com", "1234.5", "RESPONSABLE", "Juan", "Perez", LocalDate.of(1990, 1, 1));
        User pgrillo = createUserIfNotFound("pgrillo@sgp.com", "1234.5", "RESPONSABLE", "Pepe", "Grillo", LocalDate.of(1990, 1, 1));
        
        User resolutor = createUserIfNotFound("resolutor@sgp.com", "SGP_StrongPass_2026!", "RESOLUTOR", "Ana", "Resolutora", LocalDate.of(1990, 1, 1));

        // Seed Responsable profiles
        createResponsableIfNotFound("Juan Perez", jperez, "Norte");
        createResponsableIfNotFound("Pepe Grillo", pgrillo, "Sur");

        // Seed ResolutorConfig (required to suggest and auto-route resolutions)
        createResolutorConfigIfNotFound("SUBSIDIO", resolutor);
        createResolutorConfigIfNotFound("MATERIALES", resolutor);
        createResolutorConfigIfNotFound("ASESORAMIENTO", resolutor);

        // 2. Initialize Locations from dataset
        initializeLocations();

        // 3. Seed Test Sheets Configuration (DISABLED to prevent data pollution)
        /*
         * if (sheetsConfigRepository.count() == 0) {
         * com.sgp.backend.entity.SheetsConfig config = new
         * com.sgp.backend.entity.SheetsConfig();
         * config.setSpreadsheetId("1wbFbc2CAX4w_NcXpWRYFJ8HGNJ0IxImRwyovwz35dq4");
         * config.setSheetName("Hoja 1");
         * config.setSyncFrequencyMinutes(60);
         * config.setStatus("PENDING");
         * sheetsConfigRepository.save(config);
         * System.out.println("✅ Test Sheet Config created automatically");
         * }
         */
    }

    private void initializeLocations() {
        if (locationRepository.count() > 0) {
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
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }

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

    private User createUserIfNotFound(String email, String password, String role, String firstName, String lastName,
            LocalDate birthDate) {
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

    private void createResolutorConfigIfNotFound(String tipoResolucion, User resolutor) {
        if (resolutorConfigRepository.findByTipoResolucionIgnoreCase(tipoResolucion).isEmpty()) {
            com.sgp.backend.entity.ResolutorConfig config = new com.sgp.backend.entity.ResolutorConfig();
            config.setTipoResolucion(tipoResolucion);
            config.setResolutor(resolutor);
            resolutorConfigRepository.save(config);
            System.out.println("✅ ResolutorConfig created: " + tipoResolucion + " -> " + resolutor.getEmail());
        }
    }
}
