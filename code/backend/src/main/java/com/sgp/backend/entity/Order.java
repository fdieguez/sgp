package com.sgp.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private LocalDate entryDate;

    // "PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"
    @Column(nullable = false)
    private String status;

    // Origin: "WHATSAPP", "NOTE", "EMAIL", "SOCIAL_MEDIA"
    private String origin;

    @ManyToOne(optional = false)
    @JoinColumn(name = "person_id")
    private Person person;

    @ManyToOne
    @JoinColumn(name = "location_id")
    private Location location; // Specific location for the order (if different from person)

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    private List<Subsidy> subsidies;
}
