package com.sgp.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "persons")
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 1000)
    private String name; // Name or Institution Name (up to 1000 chars for long institution descriptions)

    // "INDIVIDUAL", "INSTITUTION", "GOVERNMENT"
    @Column(nullable = false)
    private String type;

    private String dni; // Optional for institutions

    private String phone;

    private String email;

    private String address;

    @ManyToOne
    @JoinColumn(name = "location_id")
    private Location location;
}
