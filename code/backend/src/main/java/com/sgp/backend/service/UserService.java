package com.sgp.backend.service;

import com.sgp.backend.entity.User;
import com.sgp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.sgp.backend.repository.TipoResolucionRepository tipoResolucionRepository;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public User createUser(String email, String password, String role, String firstName, String lastName, String phone, String zone, String dni) {
        return createUser(email, password, role, firstName, lastName, phone, zone, dni, null);
    }

    public User createUser(String email, String password, String role, String firstName, String lastName, String phone, String zone, String dni, List<Number> tipoResolucionIds) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }

        if (phone == null || phone.trim().isEmpty()) {
            throw new IllegalArgumentException("El teléfono es obligatorio");
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role != null ? role.toUpperCase() : "OPERADOR");
        user.setFirstName(firstName != null ? firstName : "");
        user.setLastName(lastName != null ? lastName : "");
        user.setPhone(phone);
        user.setZone(zone);
        user.setDni(dni);

        if (tipoResolucionIds != null) {
            java.util.Set<com.sgp.backend.entity.TipoResolucion> tipos = new java.util.HashSet<>();
            for (Number tid : tipoResolucionIds) {
                tipoResolucionRepository.findById(tid.longValue()).ifPresent(tipos::add);
            }
            user.setTiposResolucion(tipos);
        }

        return userRepository.save(user);
    }

    public User updateUser(Long id, String email, String password, String role, String firstName, String lastName, String phone, String zone, String dni) {
        return updateUser(id, email, password, role, firstName, lastName, phone, zone, dni, null);
    }

    public User updateUser(Long id, String email, String password, String role, String firstName, String lastName, String phone, String zone, String dni, List<Number> tipoResolucionIds) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (email != null && !email.equals(user.getEmail())) {
            if (userRepository.findByEmail(email).isPresent()) {
                throw new IllegalArgumentException("Email already in use by another user");
            }
            user.setEmail(email);
        }

        if (password != null && !password.trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(password));
        }

        if (role != null) {
            user.setRole(role.toUpperCase());
        }

        if (firstName != null) user.setFirstName(firstName);
        if (lastName != null) user.setLastName(lastName);
        if (phone != null) {
            if (phone.trim().isEmpty()) {
                throw new IllegalArgumentException("El teléfono es obligatorio");
            }
            user.setPhone(phone);
        }
        if (zone != null) user.setZone(zone);
        if (dni != null) user.setDni(dni);

        if (tipoResolucionIds != null) {
            java.util.Set<com.sgp.backend.entity.TipoResolucion> tipos = new java.util.HashSet<>();
            for (Number tid : tipoResolucionIds) {
                tipoResolucionRepository.findById(tid.longValue()).ifPresent(tipos::add);
            }
            user.setTiposResolucion(tipos);
        }

        return userRepository.save(user);
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new IllegalArgumentException("User not found");
        }
        userRepository.deleteById(id);
    }
}
