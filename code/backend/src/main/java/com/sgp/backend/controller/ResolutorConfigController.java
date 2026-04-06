package com.sgp.backend.controller;

import com.sgp.backend.entity.ResolutorConfig;
import com.sgp.backend.repository.ResolutorConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/resolutor-configs")
@RequiredArgsConstructor
public class ResolutorConfigController {

    private final ResolutorConfigRepository repository;

    @GetMapping
    public ResponseEntity<List<ResolutorConfig>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }
}
