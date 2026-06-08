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
        if (!userRepository.existsById(id)) {
            throw new IllegalArgumentException("User not found");
        }

        // 1. Desvincular en tipo_resolucion (default_resolutor_id)
        entityManager.createQuery("UPDATE TipoResolucion tr SET tr.resolutor = null WHERE tr.resolutor.id = :id")
                     .setParameter("id", id).executeUpdate();

        // 2. Eliminar de solicitud_resolutor_assignment
        entityManager.createQuery("DELETE FROM SolicitudResolutorAssignment sra WHERE sra.resolutor.id = :id")
                     .setParameter("id", id).executeUpdate();

        // 3. Desvincular en solicitudes (createdBy, resolutor, responsable)
        entityManager.createQuery("UPDATE Solicitud s SET s.createdBy = null WHERE s.createdBy.id = :id")
                     .setParameter("id", id).executeUpdate();
        entityManager.createQuery("UPDATE Solicitud s SET s.resolutor = null WHERE s.resolutor.id = :id")
                     .setParameter("id", id).executeUpdate();
        entityManager.createQuery("UPDATE Solicitud s SET s.responsable = null WHERE s.responsable.id = :id")
                     .setParameter("id", id).executeUpdate();

        // 4. Desvincular en asignacion_historial
        entityManager.createQuery("UPDATE AsignacionHistorial ah SET ah.responsable = null WHERE ah.responsable.id = :id")
                     .setParameter("id", id).executeUpdate();

        // 5. Desvincular de user_tipo_resolucion (limpiar relación ManyToMany)
        User user = userRepository.findById(id).orElseThrow();
        user.getTiposResolucion().clear();
        userRepository.save(user);

        // 6. Eliminar el usuario
        userRepository.delete(user);
    }
}
