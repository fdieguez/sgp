package com.sgp.backend.controller;

import com.sgp.backend.entity.User;
import com.sgp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller para manejar la compatibilidad con el endpoint de Responsables
 * tras la unificación de identidad en la entidad User.
 */
@RestController
@RequestMapping("/api/responsables")
@RequiredArgsConstructor
public class ResponsableController {

    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<User>> getResponsables() {
        List<User> allUsers = userRepository.findAll();
        List<User> responsables = allUsers.stream()
                .filter(u -> u.isActivo())
                .filter(u -> u.getRole() != null && (u.getRole().contains("RESPONSABLE") || u.getRole().contains("RESOLUTOR")))
                .collect(java.util.stream.Collectors.toList());
        
        // Quitamos las contraseñas por seguridad
        responsables.forEach(u -> u.setPassword(null));
        
        return ResponseEntity.ok(responsables);
    }
}
