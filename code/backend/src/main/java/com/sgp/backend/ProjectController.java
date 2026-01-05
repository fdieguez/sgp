package com.sgp.backend;

import com.sgp.backend.entity.Project;
import com.sgp.backend.entity.SheetsConfig;
import com.sgp.backend.repository.ProjectRepository;
import com.sgp.backend.repository.SheetsConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final SheetsConfigRepository sheetsConfigRepository;

    @GetMapping
    public List<Project> getAll() {
        return projectRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getById(@PathVariable Long id) {
        return projectRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-config/{configId}")
    public ResponseEntity<Project> getByConfigId(@PathVariable Long configId) {
        return sheetsConfigRepository.findById(configId)
                .flatMap(projectRepository::findBySheetsConfig)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
