package com.sgp.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Comparator;

@Component
@Order(1) // Run before DataInitializer if possible
public class DatabaseMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseMigrationRunner.class);
    private final JdbcTemplate jdbcTemplate;

    public DatabaseMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("🔍 Escaneando directorio /boot en busca de scripts SQL...");
        
        File bootDir = new File("boot");
        File oldDir = new File("boot/old");
        
        if (!bootDir.exists()) {
            bootDir.mkdirs();
        }
        if (!oldDir.exists()) {
            oldDir.mkdirs();
        }

        File[] sqlFiles = bootDir.listFiles((dir, name) -> name.toLowerCase().endsWith(".sql"));
        
        if (sqlFiles == null || sqlFiles.length == 0) {
            log.info("✅ No se encontraron nuevos scripts SQL en /boot.");
            return;
        }

        // Ordenar alfabéticamente para ejecución determinista
        Arrays.sort(sqlFiles, Comparator.comparing(File::getName));

        for (File file : sqlFiles) {
            log.info("⚙️ Ejecutando script: {}", file.getName());
            try {
                String sql = new String(Files.readAllBytes(file.toPath()));
                
                // Dividir sentencias por ';' (esto es muy rudimentario, pero útil para scripts simples)
                String[] statements = sql.split(";");
                for (String statement : statements) {
                    if (statement.trim().isEmpty()) continue;
                    jdbcTemplate.execute(statement.trim());
                }
                
                log.info("✅ Script ejecutado correctamente: {}", file.getName());
                
                // Mover archivo a boot/old reemplazando si ya existe
                Path source = file.toPath();
                Path target = Paths.get(oldDir.getAbsolutePath(), file.getName());
                Files.move(source, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                log.info("📁 Movido a {}", target.toString());
                
            } catch (Exception e) {
                log.error("❌ Error ejecutando script {}: {}", file.getName(), e.getMessage());
                // Si falla uno, frenamos el proceso para no ejecutar dependientes
                throw e;
            }
        }
    }
}
