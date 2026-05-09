package com.medical.repository;

import com.medical.entity.User;
import com.medical.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    List<User> findAllByEmailIn(List<String> emails);
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);
    long countByRole(Role role);
    List<User> findAllByRole(Role role);
}
