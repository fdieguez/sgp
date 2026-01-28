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
