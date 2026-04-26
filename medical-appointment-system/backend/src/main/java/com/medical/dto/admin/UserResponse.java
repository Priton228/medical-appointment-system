package com.medical.dto.admin;

import com.medical.entity.Role;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        Role role,
        Boolean isBlocked
) {
}
