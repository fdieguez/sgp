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

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public User createUser(String email, String password, String role) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role != null ? role.toUpperCase() : "USER");

        return userRepository.save(user);
    }

    public User updateUser(Long id, String email, String password, String role) {
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

        return userRepository.save(user);
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new IllegalArgumentException("User not found");
        }
        userRepository.deleteById(id);
    }
}
