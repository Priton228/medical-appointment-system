package com.medical.config;

import com.medical.entity.User;
import com.medical.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

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
        List<User> users = userRepository.findAll();

        Set<String> usedUsernames = new HashSet<>();
        for (User user : users) {
            if (user.getUsername() != null && !user.getUsername().isBlank()) {
                usedUsernames.add(user.getUsername().toLowerCase());
            }
        }

        int updatedCount = 0;
        for (User user : users) {
            boolean changed = false;

            if (SEED_USER_EMAILS.contains(user.getEmail())
                    && !passwordEncoder.matches(DEFAULT_SEED_PASSWORD, user.getPasswordHash())) {
                user.setPasswordHash(passwordEncoder.encode(DEFAULT_SEED_PASSWORD));
                changed = true;
            }

            if (user.getUsername() == null || user.getUsername().isBlank()) {
                user.setUsername(generateUsername(user.getEmail(), usedUsernames));
                usedUsernames.add(user.getUsername().toLowerCase());
                changed = true;
            }

            if (changed) {
                updatedCount++;
            }
        }

        if (updatedCount > 0) {
            userRepository.saveAll(users);
            log.info("Updated {} user profile(s): ensured password hashes for seed users and generated usernames", updatedCount);
        }
    }

    private String generateUsername(String email, Set<String> usedUsernames) {
        String base = (email == null || !email.contains("@")) ? "user" : email.substring(0, email.indexOf('@'));
        base = base.replaceAll("[^a-zA-Z0-9._-]", "");
        if (base.length() < 3) {
            base = "user" + base;
        }
        if (base.length() > 50) {
            base = base.substring(0, 50);
        }

        String candidate = base;
        int suffix = 1;
        while (usedUsernames.contains(candidate.toLowerCase())) {
            String suffixStr = "_" + suffix++;
            int allowedLength = Math.max(1, 50 - suffixStr.length());
            candidate = base.substring(0, Math.min(base.length(), allowedLength)) + suffixStr;
        }
        return candidate;
    }
}
