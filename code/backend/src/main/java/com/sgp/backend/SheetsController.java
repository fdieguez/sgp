package com.sgp.backend;

import com.sgp.backend.service.GoogleSheetsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/sheets")
public class SheetsController {

    @Autowired
    private GoogleSheetsService sheetsService;

    @GetMapping("/test")
    public List<List<Object>> testRead(
            @RequestParam String id,
            @RequestParam(defaultValue = "Sheet1!A1:E10") String range) throws IOException {

        return sheetsService.readSheet(id, range);
    }
}
