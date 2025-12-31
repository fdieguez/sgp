package com.sgp.backend;

import com.sgp.backend.entity.Project;
import com.sgp.backend.service.SyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
public class SyncController {

    private final SyncService syncService;

    @PostMapping("/{configId}")
    public ResponseEntity<?> syncProject(@PathVariable Long configId) {
        try {
            Project project = syncService.syncProject(configId);
            return ResponseEntity.ok(project);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Sync failed: " + e.getMessage());
        }
    }
}
