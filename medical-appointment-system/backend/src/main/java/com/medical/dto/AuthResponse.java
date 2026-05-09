package com.medical.dto;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        Long expiresIn,
        String role,
        Long userId,
        String username,
        String fullName
) {
}
