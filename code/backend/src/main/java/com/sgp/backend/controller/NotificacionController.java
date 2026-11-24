package com.sgp.backend.controller;

import com.sgp.backend.dto.NotificacionResponse;
import com.sgp.backend.service.NotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controlador REST para consultar y gestionar notificaciones in-app del usuario autenticado.
 */
@RestController
@RequestMapping("/api/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionService notificacionService;

    @GetMapping
    public ResponseEntity<Page<NotificacionResponse>> getNotificaciones(
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String email = getCurrentUserEmail();
        return ResponseEntity.ok(notificacionService.listarNotificaciones(email, unreadOnly, page, size));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        String email = getCurrentUserEmail();
        long count = notificacionService.contarNoLeidas(email);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        String email = getCurrentUserEmail();
        return notificacionService.marcarComoLeida(id, email)
                .<ResponseEntity<?>>map(notif -> ResponseEntity.ok(Map.of(
                        "notificacion", notif,
                        "unreadCount", notificacionService.contarNoLeidas(email)
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead() {
        String email = getCurrentUserEmail();
        int updated = notificacionService.marcarTodasComoLeidas(email);
        return ResponseEntity.ok(Map.of(
                "updated", updated,
                "unreadCount", 0L
        ));
    }

    private String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication.getName();
    }
}
