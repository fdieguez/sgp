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
public class SheetsConfigController {

    private final SheetsConfigRepository repository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final com.sgp.backend.service.GoogleCalendarService googleCalendarService;
    private final com.sgp.backend.repository.AgendaGuestRepository agendaGuestRepository;

    public SheetsConfigController(
            SheetsConfigRepository repository,
            ProjectRepository projectRepository,
            UserRepository userRepository,
            com.sgp.backend.service.GoogleCalendarService googleCalendarService,
            com.sgp.backend.repository.AgendaGuestRepository agendaGuestRepository) {
        this.repository = repository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.googleCalendarService = googleCalendarService;
        this.agendaGuestRepository = agendaGuestRepository;
    }

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

            String activeRole = com.sgp.backend.security.SecurityUtils.getActiveRole(user);
            // Si el rol es RESOLUTOR, validar de forma segura la especificidad asociada (excluyendo accesos cruzados entre Agenda y Subsidios)
            if ("RESOLUTOR".equalsIgnoreCase(activeRole)) {
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
            if (!"RESOLUTOR".equalsIgnoreCase(activeRole)) {
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

    @PostMapping("/{id}/check-calendar")
    public ResponseEntity<?> checkCalendarAccess(@PathVariable Long id) {
        return repository.findById(id).map(config -> {
            String calendarId = config.getCalendarId();
            if (calendarId == null || calendarId.trim().isEmpty()) {
                return ResponseEntity.ok(java.util.Map.of("active", false, "error", "El ID de Google Calendar se encuentra vacío."));
            }
            try {
                googleCalendarService.checkAccess(calendarId);
                return ResponseEntity.ok(java.util.Map.of("active", true));
            } catch (Exception e) {
                // Capturar errores de autenticación o calendarios no compartidos
                String msg = e.getMessage() != null ? e.getMessage() : "Error desconocido al validar acceso.";
                String lowerMsg = msg.toLowerCase();
                if (lowerMsg.contains("403") || lowerMsg.contains("forbidden") || lowerMsg.contains("404") || lowerMsg.contains("not found") || lowerMsg.contains("permission")) {
                    msg = "No compartido o inexistente. Asegúrate de compartir el calendario con la Cuenta de Servicio del sistema con permisos de edición ('Realizar cambios en eventos').";
                }
                return ResponseEntity.ok(java.util.Map.of("active", false, "error", msg));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Obtiene la lista de invitados frecuentes configurados para una Agenda específica (CDU-14).
     */
    @GetMapping("/{id}/guests")
    public ResponseEntity<List<com.sgp.backend.entity.AgendaGuest>> getGuests(@PathVariable Long id) {
        return ResponseEntity.ok(agendaGuestRepository.findBySheetsConfigIdOrderByCreatedAtAsc(id));
    }

    /**
     * Agrega un nuevo invitado frecuente a la configuración de Agenda (CDU-14).
     */
    @PostMapping("/{id}/guests")
    public ResponseEntity<com.sgp.backend.entity.AgendaGuest> addGuest(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        return repository.findById(id).map(config -> {
            String name = body.get("name");
            String email = body.get("email");
            if (name == null || name.trim().isEmpty() || email == null || email.trim().isEmpty()) {
                throw new IllegalArgumentException("El nombre y el correo electrónico del invitado son obligatorios.");
            }
            com.sgp.backend.entity.AgendaGuest guest = com.sgp.backend.entity.AgendaGuest.builder()
                    .sheetsConfig(config)
                    .name(name.trim())
                    .email(email.trim().toLowerCase())
                    .createdAt(java.time.LocalDateTime.now())
                    .build();
            return ResponseEntity.ok(agendaGuestRepository.save(guest));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Elimina un invitado frecuente por su identificador único (CDU-14).
     */
    @DeleteMapping("/{id}/guests/{guestId}")
    public ResponseEntity<Void> deleteGuest(@PathVariable Long id, @PathVariable Long guestId) {
        if (agendaGuestRepository.existsById(guestId)) {
            agendaGuestRepository.deleteById(guestId);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Retorna los invitados frecuentes de la configuración activa de Agenda (CDU-15).
     */
    @GetMapping("/agenda/guests")
    public ResponseEntity<List<com.sgp.backend.entity.AgendaGuest>> getAgendaDefaultGuests() {
        List<SheetsConfig> configs = repository.findAll();
        for (SheetsConfig c : configs) {
            com.sgp.backend.entity.Project project = projectRepository.findBySheetsConfig(c).orElse(null);
            String name = (project != null) ? project.getName() : c.getSheetName();
            if (name != null && name.toUpperCase().contains("AGENDA")) {
                return ResponseEntity.ok(agendaGuestRepository.findBySheetsConfigIdOrderByCreatedAtAsc(c.getId()));
            }
        }
        if (!configs.isEmpty()) {
            return ResponseEntity.ok(agendaGuestRepository.findBySheetsConfigIdOrderByCreatedAtAsc(configs.get(0).getId()));
        }
        return ResponseEntity.ok(java.util.Collections.emptyList());
    }
}

