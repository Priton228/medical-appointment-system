package com.medical.config;

import com.medical.entity.User;
import com.medical.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class SeedUsersPasswordInitializer implements CommandLineRunner {

    private static final String DEFAULT_SEED_PASSWORD = "admin123";
    private static final List<String> SEED_USER_EMAILS = List.of(
            "admin@medical-system.com",
            "doctor.petrov@medical-system.com",
            "doctor.sidorova@medical-system.com",
            "doctor.ivanova@medical-system.com"
    );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        List<User> seedUsers = userRepository.findAllByEmailIn(SEED_USER_EMAILS);

        int updatedCount = 0;
        for (User user : seedUsers) {
            if (!passwordEncoder.matches(DEFAULT_SEED_PASSWORD, user.getPasswordHash())) {
                user.setPasswordHash(passwordEncoder.encode(DEFAULT_SEED_PASSWORD));
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            userRepository.saveAll(seedUsers);
            log.info("Updated password hash for {} seeded user(s)", updatedCount);
        }
    }
}
