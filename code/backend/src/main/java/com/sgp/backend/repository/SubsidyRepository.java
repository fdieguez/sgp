package com.sgp.backend.repository;

import com.sgp.backend.entity.Subsidy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SubsidyRepository extends JpaRepository<Subsidy, Long> {
    List<Subsidy> findByStatus(String status);

    List<Subsidy> findByOrderId(Long orderId);
}
