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

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed Users
        createUserIfNotFound("francisco@sgp.com", "SGP_StrongPass_2026!", "ADMIN", "Francisco", "Admin",
                LocalDate.of(1990, 1, 1));
        createUserIfNotFound("juanmanuel@sgp.com", "SGP_StrongPass_2026!", "ADMIN", "Juan Manuel", "Admin",
                LocalDate.of(1990, 1, 1));
        User user1 = createUserIfNotFound("user1@sgp.com", "User_Pass_2026!", "USER", "Usuario", "Uno", null);
        User user2 = createUserIfNotFound("user2@sgp.com", "User_Pass_2026!", "USER", "Usuario", "Dos", null);

        // Seed Responsables for the tests users
        createResponsableIfNotFound("Usuario Uno", user1, "Norte");
        createResponsableIfNotFound("Usuario Dos", user2, "Sur");

        // 1.5 Repair test user roles if they were accidentally modified via UI
        userRepository.findByEmail("user1@sgp.com").ifPresent(u -> {
            if (!"USER".equals(u.getRole())) {
                u.setRole("USER");
                userRepository.save(u);
                System.out.println("🔧 Fixed user1@sgp.com role back to USER");
            }
        });
        userRepository.findByEmail("user2@sgp.com").ifPresent(u -> {
            if (!"USER".equals(u.getRole())) {
                u.setRole("USER");
                userRepository.save(u);
                System.out.println("🔧 Fixed user2@sgp.com role back to USER");
            }
        });

        // Remove old admin if exists
        // userRepository.findByEmail("admin@sgp.com").ifPresent(userRepository::delete);

        // 2. Seed Test Sheets Configuration (DISABLED to prevent data pollution)
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
}
