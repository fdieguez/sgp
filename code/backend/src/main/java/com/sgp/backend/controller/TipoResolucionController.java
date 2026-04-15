package com.sgp.backend.controller;

import com.sgp.backend.entity.TipoResolucion;
import com.sgp.backend.entity.TipoResolucionAtributo;
import com.sgp.backend.repository.TipoResolucionRepository;
import com.sgp.backend.repository.UserRepository;
import com.sgp.backend.repository.AtributoResolucionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/tipos-resolucion")
@RequiredArgsConstructor
public class TipoResolucionController {

    private final TipoResolucionRepository repository;
    private final UserRepository userRepository;
    private final AtributoResolucionRepository atributoRepository;

    @GetMapping
    public ResponseEntity<List<TipoResolucion>> getAll() {
        return ResponseEntity.ok(repository.findByActivoTrue());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<TipoResolucion> create(@RequestBody TipoResolucion dto) {
        dto.setActivo(true);
        if (dto.getResolutor() != null && dto.getResolutor().getId() != null) {
            userRepository.findById(dto.getResolutor().getId()).ifPresent(dto::setResolutor);
        } else {
            dto.setResolutor(null);
        }

        if (dto.getAtributosConfig() != null) {
            for (TipoResolucionAtributo attr : dto.getAtributosConfig()) {
                attr.setTipoResolucion(dto);
                if (attr.getAtributo() != null && attr.getAtributo().getId() != null) {
                    atributoRepository.findById(attr.getAtributo().getId()).ifPresent(attr::setAtributo);
                }
            }
        } else {
            dto.setAtributosConfig(new ArrayList<>());
        }

        return ResponseEntity.ok(repository.save(dto));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<TipoResolucion> update(@PathVariable Long id, @RequestBody TipoResolucion dto) {
        return repository.findById(id).map(existing -> {
            existing.setTipo(dto.getTipo());
            
            if (dto.getResolutor() != null && dto.getResolutor().getId() != null) {
                userRepository.findById(dto.getResolutor().getId()).ifPresent(existing::setResolutor);
            } else {
                existing.setResolutor(null);
            }

            existing.getAtributosConfig().clear();
            if (dto.getAtributosConfig() != null) {
                for (TipoResolucionAtributo attr : dto.getAtributosConfig()) {
                    attr.setTipoResolucion(existing);
                    if (attr.getAtributo() != null && attr.getAtributo().getId() != null) {
                        atributoRepository.findById(attr.getAtributo().getId()).ifPresent(attr::setAtributo);
                    }
                    existing.getAtributosConfig().add(attr);
                }
            }

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
