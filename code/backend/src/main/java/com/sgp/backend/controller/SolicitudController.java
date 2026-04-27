package com.sgp.backend.controller;

import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.service.SolicitudService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.sgp.backend.dto.SolicitudUpdateDTO;

import java.util.List;

@RestController
@RequestMapping("/api/solicitudes")
@RequiredArgsConstructor
public class SolicitudController {

    private final SolicitudService solicitudService;
    private final com.sgp.backend.repository.AsignacionHistorialRepository asignacionHistorialRepository;

    @GetMapping
    public List<Solicitud> getAllSolicitudes(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return solicitudService.getAllSolicitudes(status, search);
    }

    @GetMapping("/config/{configId}")
    public List<Solicitud> getSolicitudesByConfig(@PathVariable Long configId) {
        return solicitudService.getSolicitudesByConfig(configId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Solicitud> getSolicitudById(@PathVariable Long id) {
        return ResponseEntity.ok(solicitudService.getSolicitudById(id));
    }

    @PostMapping
    public ResponseEntity<Solicitud> createSolicitud(@RequestBody Solicitud solicitud) {
        return ResponseEntity.ok(solicitudService.createSolicitud(solicitud));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Solicitud> updateStatus(@PathVariable Long id, @RequestBody String status) {
        return ResponseEntity.ok(solicitudService.updateStatus(id, status));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Solicitud> updateSolicitud(@PathVariable Long id, @RequestBody SolicitudUpdateDTO solicitudDTO) {
        return ResponseEntity.ok(solicitudService.updateSolicitud(id, solicitudDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSolicitud(@PathVariable Long id) {
        solicitudService.deleteSolicitud(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/historial")
    public ResponseEntity<List<com.sgp.backend.entity.AsignacionHistorial>> getHistorial(@PathVariable Long id) {
        return ResponseEntity.ok(asignacionHistorialRepository.findBySolicitudIdOrderByActionDateDesc(id));
    }

    @PostMapping("/{id}/aprobar")
    public ResponseEntity<Void> aprobarSolicitud(@PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        String observaciones = body.getOrDefault("observaciones", "");
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        solicitudService.aprobarAsignacion(id, auth.getName(), observaciones);
        return ResponseEntity.ok().build();
    }
}
