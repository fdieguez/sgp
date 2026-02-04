package com.sgp.backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@SuperBuilder
@NoArgsConstructor
// @AllArgsConstructor // Lombok bug with SuperBuilder and NoArgs
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "pedidos")
public class Pedido extends Solicitud {
    // Specific fields for Pedido can be added here
    // e.g., String priority;
}
