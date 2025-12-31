package com.sgp.backend;

import com.sgp.backend.entity.User;
import com.sgp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final com.sgp.backend.repository.SheetsConfigRepository sheetsConfigRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // 1. Seed Admin User
        if (userRepository.findByEmail("admin@sgp.com").isEmpty()) {
            User admin = new User();
            admin.setEmail("admin@sgp.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("ADMIN");
            userRepository.save(admin);
            System.out.println("✅ ADMIN user created: admin@sgp.com / admin123");
        }

        // 2. Seed Test Sheets Configuration
        if (sheetsConfigRepository.count() == 0) {
            com.sgp.backend.entity.SheetsConfig config = new com.sgp.backend.entity.SheetsConfig();
            config.setSpreadsheetId("1wbFbc2CAX4w_NcXpWRYFJ8HGNJ0IxImRwyovwz35dq4");
            config.setSheetName("Hoja 1");
            config.setSyncFrequencyMinutes(60);
            config.setStatus("PENDING");
            sheetsConfigRepository.save(config);
            System.out.println("✅ Test Sheet Config created automatically");
        }
    }
}
