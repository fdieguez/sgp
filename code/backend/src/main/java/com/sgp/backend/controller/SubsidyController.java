package com.sgp.backend.controller;

import com.sgp.backend.entity.Subsidy;
import com.sgp.backend.service.SubsidyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/subsidies")
@RequiredArgsConstructor
public class SubsidyController {

    private final SubsidyService subsidyService;

    @GetMapping
    public List<Subsidy> getAllSubsidies() {
        return subsidyService.getAllSubsidies();
    }

    @PostMapping("/order/{orderId}")
    public ResponseEntity<Subsidy> createSubsidy(@PathVariable Long orderId, @RequestBody Subsidy subsidy) {
        return ResponseEntity.ok(subsidyService.createSubsidy(orderId, subsidy));
    }
}
