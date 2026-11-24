package com.sgp.backend.service;

import com.sgp.backend.dto.NotificacionResponse;
import com.sgp.backend.entity.Notificacion;
import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.entity.User;
import com.sgp.backend.repository.NotificacionRepository;
import com.sgp.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Servicio encargado de parsear menciones (@) en notas de seguimiento y gestionar notificaciones in-app.
 */
@Service
@RequiredArgsConstructor
public class NotificacionService {

    // Expresión regular definida en US-01 para detectar menciones con correo o alias
    private static final Pattern MENTION_PATTERN = Pattern.compile("@([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+|[a-zA-Z0-9._-]+)");

    private final NotificacionRepository notificacionRepository;
    private final UserRepository userRepository;

    /**
     * Analiza las menciones de una nota y genera notificaciones para cada usuario destinatario válido.
     * Evita duplicados por nota y omite auto-menciones.
     */
    @Transactional
    public void procesarMencionesYNotificar(Solicitud solicitud, User autor, String mensajeNota, List<Long> mentionedUserIds) {
        if (solicitud == null || autor == null) {
            return;
        }

        Map<Long, User> destinatarios = new LinkedHashMap<>();
        List<User> usuariosActivos = userRepository.findByActivoTrueOrderByFirstNameAscLastNameAsc();

        // 1. Resolver menciones enviadas explícitamente desde el autocompletado del frontend
        if (mentionedUserIds != null && !mentionedUserIds.isEmpty()) {
            Set<Long> requestedIds = new HashSet<>(mentionedUserIds);
            for (User u : usuariosActivos) {
                if (requestedIds.contains(u.getId())) {
                    destinatarios.put(u.getId(), u);
                }
            }
        }

        // 2. Fallback / complemento mediante regex sobre el texto de la nota
        if (mensajeNota != null && !mensajeNota.isBlank()) {
            Matcher matcher = MENTION_PATTERN.matcher(mensajeNota);
            while (matcher.find()) {
                String token = matcher.group(1).toLowerCase(Locale.ROOT);
                resolverUsuarioPorToken(token, usuariosActivos)
                        .ifPresent(u -> destinatarios.put(u.getId(), u));
            }
        }

        // Omitir auto-menciones
        destinatarios.remove(autor.getId());
        if (destinatarios.isEmpty()) {
            return;
        }

        String nombreAutor = construirNombreVisible(autor);
        String resumen = construirResumenMensaje(nombreAutor, solicitud.getId());
        LocalDateTime ahora = LocalDateTime.now();

        List<Notificacion> nuevas = new ArrayList<>();
        for (User destinatario : destinatarios.values()) {
            nuevas.add(Notificacion.builder()
                    .usuario(destinatario)
                    .solicitud(solicitud)
                    .autor(autor)
                    .mensaje(resumen)
                    .leida(false)
                    .fechaCreacion(ahora)
                    .build());
        }

        notificacionRepository.saveAll(nuevas);
    }

    /**
     * Lista las notificaciones del usuario autenticado con paginación y filtro opcional de no leídas.
     */
    @Transactional(readOnly = true)
    public Page<NotificacionResponse> listarNotificaciones(String userEmail, boolean unreadOnly, int page, int size) {
        User usuario = obtenerUsuarioPorEmail(userEmail);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Page<Notificacion> result = unreadOnly
                ? notificacionRepository.findByUsuarioIdAndLeidaFalseOrderByFechaCreacionDesc(usuario.getId(), pageable)
                : notificacionRepository.findByUsuarioIdOrderByFechaCreacionDesc(usuario.getId(), pageable);

        return result.map(this::toResponse);
    }

    /**
     * Devuelve el conteo ágil de notificaciones pendientes de lectura para el usuario.
     */
    @Transactional(readOnly = true)
    public long contarNoLeidas(String userEmail) {
        User usuario = obtenerUsuarioPorEmail(userEmail);
        return notificacionRepository.countByUsuarioIdAndLeidaFalse(usuario.getId());
    }

    /**
     * Marca una notificación puntual como leída verificando que pertenezca al usuario autenticado.
     */
    @Transactional
    public Optional<NotificacionResponse> marcarComoLeida(Long notificacionId, String userEmail) {
        User usuario = obtenerUsuarioPorEmail(userEmail);
        return notificacionRepository.findByIdAndUsuarioId(notificacionId, usuario.getId())
                .map(notif -> {
                    if (!notif.isLeida()) {
                        notif.setLeida(true);
                        notificacionRepository.save(notif);
                    }
                    return toResponse(notif);
                });
    }

    /**
     * Marca todas las notificaciones pendientes del usuario autenticado como leídas.
     */
    @Transactional
    public int marcarTodasComoLeidas(String userEmail) {
        User usuario = obtenerUsuarioPorEmail(userEmail);
        return notificacionRepository.marcarTodasComoLeidas(usuario.getId());
    }

    private Optional<User> resolverUsuarioPorToken(String tokenLower, List<User> usuariosActivos) {
        if (tokenLower.contains("@")) {
            return usuariosActivos.stream()
                    .filter(u -> u.getEmail() != null && u.getEmail().equalsIgnoreCase(tokenLower))
                    .findFirst();
        }

        // Si el token no tiene '@', buscar coincidencia única por prefijo de correo (ej. matias.ippolito)
        List<User> matches = usuariosActivos.stream()
                .filter(u -> {
                    if (u.getEmail() == null) return false;
                    int atIdx = u.getEmail().indexOf('@');
                    String prefix = atIdx > 0 ? u.getEmail().substring(0, atIdx) : u.getEmail();
                    return prefix.equalsIgnoreCase(tokenLower);
                })
                .toList();

        return matches.size() == 1 ? Optional.of(matches.get(0)) : Optional.empty();
    }

    private User obtenerUsuarioPorEmail(String userEmail) {
        return userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Usuario autenticado no encontrado: " + userEmail));
    }

    private String construirNombreVisible(User user) {
        String full = user.getName() != null ? user.getName().trim() : "";
        return full.isEmpty() ? user.getEmail() : full;
    }

    private String construirResumenMensaje(String nombreAutor, Long solicitudId) {
        String texto = "@" + nombreAutor + " te mencionó en la solicitud #" + solicitudId;
        return texto.length() > 255 ? texto.substring(0, 255) : texto;
    }

    private NotificacionResponse toResponse(Notificacion n) {
        return NotificacionResponse.builder()
                .id(n.getId())
                .solicitudId(n.getSolicitud().getId())
                .autorId(n.getAutor().getId())
                .autorNombre(construirNombreVisible(n.getAutor()))
                .autorEmail(n.getAutor().getEmail())
                .mensaje(n.getMensaje())
                .leida(n.isLeida())
                .fechaCreacion(n.getFechaCreacion())
                .build();
    }
}
