package com.sgp.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "sheets_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SheetsConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String spreadsheetId; // The ID from the Google Sheet URL

    @Column(nullable = false)
    private String sheetName; // The specific tab name (e.g., "Sheet1")

    @Column(nullable = false)
    private Integer syncFrequencyMinutes = 60; // Default: every hour

    private LocalDateTime lastSync;

    private String status; // e.g., "ACTIVE", "ERROR", "SYNCING"
}
