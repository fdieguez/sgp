package com.sgp.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "subsidies")
public class Subsidy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private BigDecimal amount; // 0 if material

    // "MONEY", "MATERIAL"
    @Column(nullable = false)
    private String type;

    // "HEALTH", "SPORTS", "EDUCATION", "SUBSISTENCE"
    private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    private LocalDate approvalDate;

    private LocalDate deliveryDate;

    // "PENDING", "APPROVED", "DELIVERED", "REJECTED"
    @Column(nullable = false)
    private String status;

    @ManyToOne(optional = false)
    @JoinColumn(name = "order_id")
    private Order order;
}
