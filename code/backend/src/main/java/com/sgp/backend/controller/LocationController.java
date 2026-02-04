package com.sgp.backend.controller;

import com.sgp.backend.entity.Location;
import com.sgp.backend.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @GetMapping
    public List<Location> getAllLocations() {
        return locationService.getAllLocations();
    }

    @PostMapping
    public ResponseEntity<Location> createLocation(@RequestBody Location location) {
        return ResponseEntity.ok(locationService.createLocation(location));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLocation(@PathVariable Long id) {
        locationService.deleteLocation(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/cleanup")
    public ResponseEntity<String> cleanup() {
        int count = locationService.cleanupLocations();
        return ResponseEntity.ok("Se eliminaron " + count + " registros inválidos.");
    }
}
