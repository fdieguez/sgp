package com.sgp.backend;

import com.sgp.backend.entity.SheetsConfig;
import com.sgp.backend.repository.SheetsConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.sgp.backend.repository.ProjectRepository;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class SheetsConfigController {

    private final SheetsConfigRepository repository;
    private final ProjectRepository projectRepository;

    @GetMapping
    public List<SheetsConfig> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SheetsConfig> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<SheetsConfig> update(@PathVariable Long id, @RequestBody SheetsConfig configDetails) {
        return repository.findById(id).map(config -> {
            config.setSpreadsheetId(configDetails.getSpreadsheetId());
            config.setSheetName(configDetails.getSheetName());
            config.setSyncFrequencyMinutes(configDetails.getSyncFrequencyMinutes());
            config.setSyncWindowDays(configDetails.getSyncWindowDays());
            // Don't update status manually via this endpoint usually, but maybe helpful?
            SheetsConfig updated = repository.save(config);
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public SheetsConfig create(@RequestBody SheetsConfig config) {
        // Defaults
        if (config.getSyncFrequencyMinutes() == null) {
            config.setSyncFrequencyMinutes(60);
        }
        config.setStatus("ACTIVE");
        return repository.save(config);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return repository.findById(id).map(config -> {
            projectRepository.findBySheetsConfig(config).ifPresent(projectRepository::delete);
            repository.delete(config);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
