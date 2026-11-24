package com.sgp.backend.controller;

import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.entity.TicketSeguimiento;
import com.sgp.backend.entity.User;
import com.sgp.backend.repository.SolicitudRepository;
import com.sgp.backend.repository.TicketSeguimientoRepository;
import com.sgp.backend.repository.UserRepository;
import com.sgp.backend.service.NotificacionService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/solicitudes/{solicitudId}/seguimiento")
@RequiredArgsConstructor
public class TicketSeguimientoController {

    private final TicketSeguimientoRepository ticketSeguimientoRepository;
    private final SolicitudRepository solicitudRepository;
    private final UserRepository userRepository;
    private final NotificacionService notificacionService;

    @GetMapping
    public ResponseEntity<List<TicketSeguimiento>> getSeguimientos(@PathVariable Long solicitudId) {
        if (!solicitudRepository.existsById(solicitudId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ticketSeguimientoRepository.findBySolicitudIdOrderByFechaDesc(solicitudId));
    }

    @PostMapping
    public ResponseEntity<TicketSeguimiento> createSeguimiento(@PathVariable Long solicitudId,
            @RequestBody CreateSeguimientoRequest request) {
        Solicitud solicitud = solicitudRepository.findById(solicitudId).orElse(null);
        if (solicitud == null) {
            return ResponseEntity.notFound().build();
        }
        if (request == null || request.getMensaje() == null || request.getMensaje().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUserEmail = authentication != null ? authentication.getName() : "Sistema";

        TicketSeguimiento seguimiento = TicketSeguimiento.builder()
                .solicitud(solicitud)
                .fecha(LocalDateTime.now())
                // Se fuerza estrictamente la identidad del usuario autenticado para evitar falsificación de autoría
                .autor(currentUserEmail)
                .mensaje(request.getMensaje())
                .build();

        TicketSeguimiento saved = ticketSeguimientoRepository.save(seguimiento);

        // Procesar menciones (@) y generar notificaciones in-app si existe un autor válido
        userRepository.findByEmail(currentUserEmail).ifPresent(autorUser ->
                notificacionService.procesarMencionesYNotificar(
                        solicitud,
                        autorUser,
                        saved.getMensaje(),
                        request.getMentionedUserIds()
                )
        );

        return ResponseEntity.ok(saved);
    }

    @Data
    public static class CreateSeguimientoRequest {
        private String mensaje;
        private List<Long> mentionedUserIds;
    }
}
