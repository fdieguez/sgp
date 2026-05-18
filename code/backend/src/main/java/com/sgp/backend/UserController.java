package com.sgp.backend;

import com.sgp.backend.entity.User;
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
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String password = request.get("password");
            String role = request.get("role");
            String firstName = request.get("firstName");
            String lastName = request.get("lastName");
            String phone = request.get("phone");
            String zone = request.get("zone");
            String dni = request.get("dni");

            if (email == null || password == null) {
                return ResponseEntity.badRequest().body("Email and password are required");
            }

            User user = userService.createUser(email, password, role, firstName, lastName, phone, zone, dni);
            user.setPassword(null); // Don't return password
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            String password = request.get("password");
            String role = request.get("role");
            String firstName = request.get("firstName");
            String lastName = request.get("lastName");
            String phone = request.get("phone");
            String zone = request.get("zone");
            String dni = request.get("dni");

            User user = userService.updateUser(id, email, password, role, firstName, lastName, phone, zone, dni);
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
