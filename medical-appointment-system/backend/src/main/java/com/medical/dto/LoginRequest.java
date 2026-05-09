package com.medical.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Login is required")
        @JsonAlias("email")
        String username,

        @NotBlank(message = "Password is required")
        String password
) {
}
