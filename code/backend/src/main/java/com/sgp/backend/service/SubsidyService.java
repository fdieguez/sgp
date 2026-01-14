package com.sgp.backend.service;

import com.sgp.backend.entity.Subsidy;
import com.sgp.backend.entity.Order;
import com.sgp.backend.repository.SubsidyRepository;
import com.sgp.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubsidyService {

    private final SubsidyRepository subsidyRepository;
    private final OrderRepository orderRepository;

    public List<Subsidy> getAllSubsidies() {
        return subsidyRepository.findAll();
    }

    public Subsidy createSubsidy(Long orderId, Subsidy subsidy) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        subsidy.setOrder(order);
        return subsidyRepository.save(subsidy);
    }
}
