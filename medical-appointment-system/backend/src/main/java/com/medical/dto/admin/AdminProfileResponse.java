package com.medical.dto.admin;

import java.time.LocalDateTime;

public record AdminProfileResponse(
        Long id,
        String username,
        String email,
        String fullName,
        String phone,
        String avatarUrl,
        String role,
        LocalDateTime createdAt
) {}
