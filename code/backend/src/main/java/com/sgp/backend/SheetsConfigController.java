package com.sgp.backend;

import com.sgp.backend.entity.SheetsConfig;
import com.sgp.backend.repository.SheetsConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class SheetsConfigController {

    private final SheetsConfigRepository repository;

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
}
