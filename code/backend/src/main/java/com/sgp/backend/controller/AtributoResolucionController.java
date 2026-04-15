package com.sgp.backend.controller;

import com.sgp.backend.entity.AtributoResolucion;
import com.sgp.backend.repository.AtributoResolucionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/atributos-resolucion")
@RequiredArgsConstructor
public class AtributoResolucionController {

    private final AtributoResolucionRepository repository;

    @GetMapping
    public ResponseEntity<List<AtributoResolucion>> getAll() {
        return ResponseEntity.ok(repository.findByActivoTrue());
    }

    @PostMapping
    public ResponseEntity<AtributoResolucion> create(@RequestBody AtributoResolucion atributo) {
        atributo.setActivo(true);
        return ResponseEntity.ok(repository.save(atributo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AtributoResolucion> update(@PathVariable Long id, @RequestBody AtributoResolucion dto) {
        return repository.findById(id).map(existing -> {
            existing.setNombre(dto.getNombre());
            existing.setTipoDato(dto.getTipoDato());
            existing.setOpciones(dto.getOpciones());
            return ResponseEntity.ok(repository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> logicallyDelete(@PathVariable Long id) {
        return repository.findById(id).map(existing -> {
            existing.setActivo(false);
            repository.save(existing);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
