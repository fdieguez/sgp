package com.sgp.backend.controller;

import com.sgp.backend.entity.Responsable;
import com.sgp.backend.entity.User;
import com.sgp.backend.repository.ResponsableRepository;
import com.sgp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/responsables")
@RequiredArgsConstructor
public class ResponsableController {

    private final ResponsableRepository responsableRepository;
    private final UserRepository userRepository;

    @GetMapping
    public List<Responsable> getAll() {
        return responsableRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Responsable responsable,
            @RequestParam(defaultValue = "false") boolean forceOverride) {
        try {
            if (responsable.getUser() != null && responsable.getUser().getId() != null) {
                Long userId = responsable.getUser().getId();
                Optional<Responsable> existingUserResp = responsableRepository.findByUserId(userId);

                if (existingUserResp.isPresent()) {
                    Responsable other = existingUserResp.get();
                    if (!forceOverride) {
                        return ResponseEntity.status(HttpStatus.CONFLICT).body("ALREADY_ASSIGNED:" + other.getName());
                    } else {
                        other.setUser(null);
                        responsableRepository.save(other);
                    }
                }

                User user = userRepository.findById(userId).orElse(null);
                responsable.setUser(user);
            }
            return ResponseEntity.ok(responsableRepository.saveAndFlush(responsable));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest()
                    .body("Error: El usuario ya está asignado a otro Responsable o ocurrió un fallo de integridad.");
        } catch (Exception e) {
            if (e.getCause() instanceof org.hibernate.exception.ConstraintViolationException) {
                return ResponseEntity.badRequest()
                        .body("Error de Base de Datos: El usuario seleccionado ya fue asignado previamente a otro Responsable.");
            }
            throw e;
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Responsable responsable,
            @RequestParam(defaultValue = "false") boolean forceOverride) {
        try {
            Responsable existing = responsableRepository.findById(id).orElseThrow();
            existing.setName(responsable.getName());
            existing.setEmail(responsable.getEmail());
            existing.setPhone(responsable.getPhone());
            existing.setZone(responsable.getZone());

            if (responsable.getUser() != null && responsable.getUser().getId() != null) {
                Long incomingUserId = responsable.getUser().getId();
                Optional<Responsable> existingUserResp = responsableRepository.findByUserId(incomingUserId);

                if (existingUserResp.isPresent() && !existingUserResp.get().getId().equals(id)) {
                    Responsable other = existingUserResp.get();
                    if (!forceOverride) {
                        return ResponseEntity.status(HttpStatus.CONFLICT).body("ALREADY_ASSIGNED:" + other.getName());
                    } else {
                        other.setUser(null);
                        responsableRepository.save(other);
                    }
                }

                User user = userRepository.findById(incomingUserId).orElse(null);
                existing.setUser(user);
            } else {
                existing.setUser(null);
            }

            return ResponseEntity.ok(responsableRepository.saveAndFlush(existing));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest()
                    .body("Error: El usuario ya está asignado a otro Responsable o ocurrió un fallo de integridad.");
        } catch (Exception e) {
            if (e.getCause() instanceof org.hibernate.exception.ConstraintViolationException) {
                return ResponseEntity.badRequest()
                        .body("Error de Base de Datos: El usuario seleccionado ya fue asignado previamente a otro Responsable.");
            }
            throw e;
        }
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        responsableRepository.deleteById(id);
    }
}
