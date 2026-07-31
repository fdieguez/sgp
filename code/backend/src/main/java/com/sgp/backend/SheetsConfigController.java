package com.sgp.backend;

import com.sgp.backend.entity.SheetsConfig;
import com.sgp.backend.repository.SheetsConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.sgp.backend.repository.ProjectRepository;
import com.sgp.backend.repository.UserRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class SheetsConfigController {

    private final SheetsConfigRepository repository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @GetMapping
    public List<SheetsConfig> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SheetsConfig> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<SheetsConfig> update(
            @PathVariable Long id,
            @RequestBody SheetsConfig configDetails,
            @AuthenticationPrincipal UserDetails currentUserDetails) {
        return repository.findById(id).map(config -> {
            // Buscar el usuario en la base de datos a partir del correo electrónico de autenticación
            com.sgp.backend.entity.User user = userRepository.findByEmail(currentUserDetails.getUsername())
                    .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + currentUserDetails.getUsername()));

            // Si el rol es RESOLUTOR, validar de forma segura la especificidad asociada (excluyendo accesos cruzados entre Agenda y Subsidios)
            if ("RESOLUTOR".equalsIgnoreCase(user.getRole())) {
                com.sgp.backend.entity.Project project = projectRepository.findBySheetsConfig(config).orElse(null);
                String tipoProyecto = (project != null) ? project.getName() : config.getSheetName();
                
                boolean esDeAgenda = tipoProyecto != null && tipoProyecto.toUpperCase().contains("AGENDA");
                
                if (esDeAgenda) {
                    // Si la configuración es de Agenda, el resolutor debe tener asignado el tipo AGENDA
                    boolean tieneAgenda = user.getTiposResolucion().stream()
                            .anyMatch(tr -> tr.getTipo() != null && tr.getTipo().toUpperCase().contains("AGENDA"));
                    if (!tieneAgenda) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<SheetsConfig>build();
                    }
                } else {
                    // Si la configuración es de Subsidio u otra pestaña mutable, el resolutor debe tener asignado el tipo SUBSIDIO
                    boolean tieneSubsidio = user.getTiposResolucion().stream()
                            .anyMatch(tr -> tr.getTipo() != null && tr.getTipo().toUpperCase().contains("SUBSIDIO"));
                    if (!tieneSubsidio) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<SheetsConfig>build();
                    }
                }
            }

            // Si se cumplen los permisos, se actualiza el spreadsheetId y el calendarId
            config.setSpreadsheetId(configDetails.getSpreadsheetId());
            config.setCalendarId(configDetails.getCalendarId());

            // Los campos de configuración avanzada (frecuencia, ventana de días) sólo son modificables por administradores
            if (!"RESOLUTOR".equalsIgnoreCase(user.getRole())) {
                config.setSheetName(configDetails.getSheetName());
                config.setSyncFrequencyMinutes(configDetails.getSyncFrequencyMinutes());
                config.setSyncWindowDays(configDetails.getSyncWindowDays());
            } else {
                // El Resolutor de Subsidio también está autorizado a modificar el sheetName (Nombre de la Hoja)
                config.setSheetName(configDetails.getSheetName());
            }

            SheetsConfig updated = repository.save(config);
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public SheetsConfig create(@RequestBody SheetsConfig config) {
        // Validar si ya existe una configuración con el mismo spreadsheetId o sheetName para evitar duplicaciones
        List<SheetsConfig> allConfigs = repository.findAll();
        for (SheetsConfig sc : allConfigs) {
            boolean mismoId = sc.getSpreadsheetId() != null && sc.getSpreadsheetId().equalsIgnoreCase(config.getSpreadsheetId());
            boolean mismoName = sc.getSheetName() != null && sc.getSheetName().equalsIgnoreCase(config.getSheetName());
            if (mismoId || mismoName) {
                // Si ya existe, retornamos el registro existente en lugar de duplicarlo
                return sc;
            }
        }

        // Defaults
        if (config.getSyncFrequencyMinutes() == null) {
            config.setSyncFrequencyMinutes(60);
        }
        config.setStatus("ACTIVE");
        return repository.save(config);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return repository.findById(id).map(config -> {
            projectRepository.findBySheetsConfig(config).ifPresent(projectRepository::delete);
            repository.delete(config);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
