package com.sgp.backend.controller;

import com.sgp.backend.entity.Solicitud;
import com.sgp.backend.service.SolicitudService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.sgp.backend.dto.SolicitudUpdateDTO;
import org.springframework.format.annotation.DateTimeFormat;

import java.util.List;

@RestController
@RequestMapping("/api/solicitudes")
@RequiredArgsConstructor
public class SolicitudController {

    private final SolicitudService solicitudService;
    private final com.sgp.backend.repository.AsignacionHistorialRepository asignacionHistorialRepository;

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<Solicitud>> getAllSolicitudes(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long responsableId,
            @RequestParam(required = false) Long locationId,
            @RequestParam(required = false) String origin,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id,desc") String sort) {
        
        String[] sortParams = sort.split(",");
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by(
                sortParams.length > 1 && sortParams[1].equalsIgnoreCase("asc") ? org.springframework.data.domain.Sort.Direction.ASC : org.springframework.data.domain.Sort.Direction.DESC,
                sortParams[0]
        ));
        
        return ResponseEntity.ok(solicitudService.getAllSolicitudes(status, search, responsableId, locationId, origin, dateFrom, dateTo, pageable));
    }

    @GetMapping("/config/{configId}")
    public ResponseEntity<org.springframework.data.domain.Page<Solicitud>> getSolicitudesByConfig(
            @PathVariable Long configId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long responsableId,
            @RequestParam(required = false) Long locationId,
            @RequestParam(required = false) String origin,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id,desc") String sort) {
        
        String[] sortParams = sort.split(",");
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by(
                sortParams.length > 1 && sortParams[1].equalsIgnoreCase("asc") ? org.springframework.data.domain.Sort.Direction.ASC : org.springframework.data.domain.Sort.Direction.DESC,
                sortParams[0]
        ));
        
        return ResponseEntity.ok(solicitudService.getSolicitudesByConfig(configId, status, search, responsableId, locationId, origin, dateFrom, dateTo, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Solicitud> getSolicitudById(@PathVariable Long id) {
        return ResponseEntity.ok(solicitudService.getSolicitudById(id));
    }

    @PostMapping("/bulk-assign")
    public ResponseEntity<Void> bulkAssign(@RequestBody java.util.Map<String, Object> payload) {
        List<Number> idsParam = (List<Number>) payload.get("ids");
        List<Long> ids = idsParam.stream().map(Number::longValue).collect(java.util.stream.Collectors.toList());
        Long responsableId = ((Number) payload.get("responsableId")).longValue();
        solicitudService.bulkAssign(ids, responsableId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<Void> bulkDelete(@RequestBody java.util.Map<String, Object> payload) {
        List<Number> idsParam = (List<Number>) payload.get("ids");
        List<Long> ids = idsParam.stream().map(Number::longValue).collect(java.util.stream.Collectors.toList());
        solicitudService.bulkDelete(ids);
        return ResponseEntity.ok().build();
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

    @GetMapping("/stats")
    public ResponseEntity<java.util.Map<String, Object>> getSolicitudStats(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long responsableId,
            @RequestParam(required = false) Long locationId,
            @RequestParam(required = false) String origin,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate dateTo) {
        return ResponseEntity.ok(solicitudService.getSolicitudStats(null, search, responsableId, locationId, origin, dateFrom, dateTo));
    }

    @GetMapping("/config/{configId}/stats")
    public ResponseEntity<java.util.Map<String, Object>> getSolicitudStatsByConfig(
            @PathVariable Long configId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long responsableId,
            @RequestParam(required = false) Long locationId,
            @RequestParam(required = false) String origin,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate dateTo) {
        return ResponseEntity.ok(solicitudService.getSolicitudStats(configId, search, responsableId, locationId, origin, dateFrom, dateTo));
    }
}
