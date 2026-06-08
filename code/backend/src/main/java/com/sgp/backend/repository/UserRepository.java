package com.sgp.backend.repository;

import com.sgp.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    java.util.List<User> findByRole(String role);
    java.util.List<User> findByRoleIn(java.util.List<String> roles);
    java.util.List<User> findByRoleInAndActivoTrue(java.util.List<String> roles);
}
