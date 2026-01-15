package com.sgp.backend.repository;

import com.sgp.backend.entity.Subsidy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SubsidyRepository extends JpaRepository<Subsidy, Long> {
    List<Subsidy> findByStatus(String status);

    List<Subsidy> findByOrderId(Long orderId);

    @org.springframework.data.jpa.repository.Query("SELECT SUM(s.amount) FROM Subsidy s WHERE s.status = :status")
    java.math.BigDecimal sumAmountByStatus(@org.springframework.data.repository.query.Param("status") String status);
}
