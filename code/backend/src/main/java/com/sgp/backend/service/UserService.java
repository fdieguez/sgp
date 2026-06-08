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
    private final jakarta.persistence.EntityManager entityManager;

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

        String finalRole = role != null ? role.toUpperCase() : "OPERADOR";
        if (finalRole.contains("RESPONSABLE")) {
            if (zone == null || zone.trim().isEmpty()) {
                throw new IllegalArgumentException("La zona es obligatoria para el rol Responsable");
            }
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(finalRole);
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

        if (user.getRole() != null && user.getRole().contains("RESPONSABLE")) {
            if (user.getZone() == null || user.getZone().trim().isEmpty()) {
                throw new IllegalArgumentException("La zona es obligatoria para el rol Responsable");
            }
        }

        if (tipoResolucionIds != null) {
            java.util.Set<com.sgp.backend.entity.TipoResolucion> tipos = new java.util.HashSet<>();
            for (Number tid : tipoResolucionIds) {
                tipoResolucionRepository.findById(tid.longValue()).ifPresent(tipos::add);
            }
            user.setTiposResolucion(tipos);
        }

        return userRepository.save(user);
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // 1. Validación de Resolutor por Defecto:
        // Si el usuario es resolutor por defecto en TipoResolucion, lanzar error (IllegalStateException).
        long countDefaultResolutor = entityManager.createQuery(
                "SELECT COUNT(tr) FROM TipoResolucion tr WHERE tr.resolutor.id = :id", Long.class)
                .setParameter("id", id)
                .getSingleResult();
        if (countDefaultResolutor > 0) {
            throw new IllegalStateException("No se puede eliminar al usuario. Está configurado como resolutor por defecto para algún tipo de resolución. Cambie esta configuración antes de continuar");
        }

        // 2. Verificación de Dependencias en tablas transaccionales:
        long countSolicitudes = entityManager.createQuery(
                "SELECT COUNT(s) FROM Solicitud s WHERE s.createdBy.id = :id OR s.responsable.id = :id OR s.resolutor.id = :id", Long.class)
                .setParameter("id", id)
                .getSingleResult();

        long countAssignments = entityManager.createQuery(
                "SELECT COUNT(sra) FROM SolicitudResolutorAssignment sra WHERE sra.resolutor.id = :id", Long.class)
                .setParameter("id", id)
                .getSingleResult();

        long countHistorial = entityManager.createQuery(
                "SELECT COUNT(ah) FROM AsignacionHistorial ah WHERE ah.responsable.id = :id", Long.class)
                .setParameter("id", id)
                .getSingleResult();

        long countAdjuntos = entityManager.createQuery(
                "SELECT COUNT(da) FROM DocumentoAdjunto da WHERE da.uploadedBy.id = :id", Long.class)
                .setParameter("id", id)
                .getSingleResult();

        boolean tieneDependencias = (countSolicitudes > 0 || countAssignments > 0 || countHistorial > 0 || countAdjuntos > 0);

        if (!tieneDependencias) {
            // Caso A (Sin dependencias): Borrado Físico
            // Limpiar la relación ManyToMany user_tipo_resolucion
            user.getTiposResolucion().clear();
            userRepository.save(user);

            userRepository.delete(user);
        } else {
            // Caso B (Con dependencias): Borrado Lógico
            // Si tiene solicitudes activas asignadas como responsable, setear responsable = null y registrar la desvinculación en AsignacionHistorial.
            List<com.sgp.backend.entity.Solicitud> solicitudesActivas = entityManager.createQuery(
                    "SELECT s FROM Solicitud s WHERE s.responsable.id = :id AND s.status NOT IN ('completadas', 'rechazada', 'cancelada')", com.sgp.backend.entity.Solicitud.class)
                    .setParameter("id", id)
                    .getResultList();

            String currentUser = "SISTEMA";
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
                currentUser = auth.getName();
            }

            for (com.sgp.backend.entity.Solicitud s : solicitudesActivas) {
                s.setResponsable(null);
                
                // Registrar desvinculación en historial
                com.sgp.backend.entity.AsignacionHistorial history = com.sgp.backend.entity.AsignacionHistorial.builder()
                        .solicitud(s)
                        .responsable(user)
                        .actionType("UNASSIGNED")
                        .assignedByUsername(currentUser)
                        .actionDate(java.time.LocalDateTime.now())
                        .build();
                entityManager.persist(history);
                entityManager.merge(s);
            }

            // Ejecutar borrado lógico
            user.setActivo(false);
            userRepository.save(user);
        }
    }
}
