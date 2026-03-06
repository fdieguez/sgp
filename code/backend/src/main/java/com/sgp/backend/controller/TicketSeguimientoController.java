package com.sgp.backend.controller;

import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.entity.TicketSeguimiento;
import com.sgp.backend.repository.SolicitudRepository;
import com.sgp.backend.repository.TicketSeguimientoRepository;
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

    @GetMapping
    public ResponseEntity<List<TicketSeguimiento>> getSeguimientos(@PathVariable Long solicitudId) {
        if (!solicitudRepository.existsById(solicitudId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ticketSeguimientoRepository.findBySolicitudIdOrderByFechaDesc(solicitudId));
    }

    @PostMapping
    public ResponseEntity<TicketSeguimiento> createSeguimiento(@PathVariable Long solicitudId,
            @RequestBody TicketSeguimiento seguimiento) {
        Solicitud solicitud = solicitudRepository.findById(solicitudId).orElse(null);
        if (solicitud == null) {
            return ResponseEntity.notFound().build();
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUserEmail = authentication != null ? authentication.getName() : "Sistema";

        seguimiento.setSolicitud(solicitud);
        seguimiento.setFecha(LocalDateTime.now());

        // Use the explicitly provided author name if any, else use the authenticated
        // user's email
        if (seguimiento.getAutor() == null || seguimiento.getAutor().trim().isEmpty()) {
            seguimiento.setAutor(currentUserEmail);
        }

        TicketSeguimiento saved = ticketSeguimientoRepository.save(seguimiento);
        return ResponseEntity.ok(saved);
    }
}
