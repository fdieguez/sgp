package com.sgp.backend.repository;

import com.sgp.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OrderRepository
        extends JpaRepository<Order, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<Order> {
    List<Order> findByStatus(String status);

    List<Order> findByPersonId(Long personId);

    long countByStatus(String status);

    @org.springframework.data.jpa.repository.Query("SELECT o.origin, COUNT(o) FROM Order o GROUP BY o.origin")
    List<Object[]> countOrdersByOrigin();
}
