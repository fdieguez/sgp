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

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed Users
        createUserIfNotFound("francisco@sgp.com", "SGP_StrongPass_2026!", "ADMIN", "Francisco", "Admin",
                LocalDate.of(1990, 1, 1));
        createUserIfNotFound("juanmanuel@sgp.com", "SGP_StrongPass_2026!", "ADMIN", "Juan Manuel", "Admin",
                LocalDate.of(1990, 1, 1));
        createUserIfNotFound("user1@sgp.com", "User_Pass_2026!", "USER", "Usuario", "Uno", null);
        createUserIfNotFound("user2@sgp.com", "User_Pass_2026!", "USER", "Usuario", "Dos", null);

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

    private void createUserIfNotFound(String email, String password, String role, String firstName, String lastName,
            LocalDate birthDate) {
        if (userRepository.findByEmail(email).isEmpty()) {
            User user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(role);
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setBirthDate(birthDate);

            userRepository.save(user);
            System.out.println("✅ User created: " + email + " (" + role + ")");
        }
    }
}
