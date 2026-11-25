package com.sgp.backend;

import com.sgp.backend.entity.User;
import com.sgp.backend.service.EmailService;
import com.sgp.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import com.sgp.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final UserRepository userRepository;
    private final EmailService emailService;

    // Catálogo base oficial de zonas territoriales/ejes para el ABM de usuarios
    private static final List<String> DEFAULT_ZONES = List.of(
            "ARROYO LEYES", "CENTRO", "COSTA", "CULTURA", "DEPORTIVO", "EDUCACION",
            "ESTE", "GENERAL", "JUVENTUDES", "MONTE VERA", "NORESTE", "NOROESTE",
            "NORTE", "OESTE", "PRIMER CORDON", "RECREO", "RESTO DEPTO", "RINCON",
            "SANTO TOME", "SAUCE VIEJO", "SUR", "SUROESTE"
    );

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String email = auth.getName();
        return userRepository.findByEmail(email).map(user -> {
            user.setPassword(null);
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("user", user);

            return ResponseEntity.ok((Object) response);
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Lista usuarios activos con datos mínimos no sensibles para el autocompletado de menciones (@).
     * Accesible para cualquier usuario autenticado.
     */
    @GetMapping("/mentionable")
    public ResponseEntity<List<Map<String, Object>>> getMentionableUsers() {
        List<Map<String, Object>> result = userRepository.findByActivoTrueOrderByFirstNameAscLastNameAsc()
                .stream()
                .map(u -> {
                    String email = u.getEmail() != null ? u.getEmail() : "";
                    int atIdx = email.indexOf('@');
                    String handle = atIdx > 0 ? email.substring(0, atIdx) : email;
                    Map<String, Object> dto = new java.util.HashMap<>();
                    dto.put("id", u.getId());
                    dto.put("email", email);
                    dto.put("firstName", u.getFirstName());
                    dto.put("lastName", u.getLastName());
                    dto.put("fullName", u.getName().trim());
                    dto.put("role", u.getRole());
                    dto.put("handle", handle);
                    return dto;
                })
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * Devuelve el catálogo ordenado y sin duplicados de zonas territoriales disponibles
     * combinando el catálogo oficial base con las zonas asignadas actualmente a usuarios.
     */
    @GetMapping("/zones")
    public ResponseEntity<List<String>> getAvailableZones() {
        java.util.Set<String> zones = new java.util.TreeSet<>(DEFAULT_ZONES);
        for (User u : userRepository.findAll()) {
            if (u.getZone() != null && !u.getZone().isBlank()) {
                for (String z : u.getZone().split(",")) {
                    String clean = z.trim().toUpperCase();
                    if (!clean.isEmpty()) {
                        zones.add(clean);
                    }
                }
            }
        }
        return ResponseEntity.ok(new java.util.ArrayList<>(zones));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        // Remove passwords from response
        users.forEach(u -> u.setPassword(null));
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userService.getUserById(id)
                .map(user -> {
                    user.setPassword(null); // Don't expose password
                    return ResponseEntity.ok(user);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> createUser(@RequestBody java.util.Map<String, Object> request) {
        try {
            String email = (String) request.get("email");
            String password = (String) request.get("password");
            String role = (String) request.get("role");
            String firstName = (String) request.get("firstName");
            String lastName = (String) request.get("lastName");
            String phone = (String) request.get("phone");
            String zone = (String) request.get("zone");
            String dni = (String) request.get("dni");
            List<Number> tipoResolucionIds = (List<Number>) request.get("tipoResolucionIds");
            boolean sendWelcomeEmail = Boolean.TRUE.equals(request.get("sendWelcomeEmail"));

            if (email == null || password == null) {
                return ResponseEntity.badRequest().body("Email and password are required");
            }

            User user = userService.createUser(email, password, role, firstName, lastName, phone, zone, dni, tipoResolucionIds);
            if (sendWelcomeEmail) {
                emailService.sendUserCredentialsEmail(
                        user.getName(),
                        user.getEmail(),
                        password,
                        user.getRole(),
                        user.getZone()
                );
            }
            user.setPassword(null); // Don't return password
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody java.util.Map<String, Object> request) {
        try {
            String email = (String) request.get("email");
            String password = (String) request.get("password");
            String role = (String) request.get("role");
            String firstName = (String) request.get("firstName");
            String lastName = (String) request.get("lastName");
            String phone = (String) request.get("phone");
            String zone = (String) request.get("zone");
            String dni = (String) request.get("dni");
            List<Number> tipoResolucionIds = (List<Number>) request.get("tipoResolucionIds");

            User user = userService.updateUser(id, email, password, role, firstName, lastName, phone, zone, dni, tipoResolucionIds);
            user.setPassword(null);
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok("User deleted successfully");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
