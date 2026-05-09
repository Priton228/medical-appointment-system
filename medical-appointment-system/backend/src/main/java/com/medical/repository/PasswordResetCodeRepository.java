package com.medical.repository;

import com.medical.entity.PasswordResetCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetCodeRepository extends JpaRepository<PasswordResetCode, Long> {

    Optional<PasswordResetCode> findByEmailAndCodeAndUsedFalse(String email, String code);

    Optional<PasswordResetCode> findTopByEmailAndUsedFalseOrderByCreatedAtDesc(String email);

    long countByEmailAndUsedFalseAndExpiresAtAfter(String email, LocalDateTime expiresAt);

    void deleteByExpiresAtBefore(LocalDateTime expiresAt);
}
