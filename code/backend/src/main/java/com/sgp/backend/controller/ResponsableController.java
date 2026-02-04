package com.sgp.backend.controller;

import com.sgp.backend.entity.Responsable;
import com.sgp.backend.repository.ResponsableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/responsables")
@RequiredArgsConstructor
public class ResponsableController {

    private final ResponsableRepository responsableRepository;

    @GetMapping
    public List<Responsable> getAll() {
        return responsableRepository.findAll();
    }
}
