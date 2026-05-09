package com.medical.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpsertDoctorRequest(
        @NotBlank(message = "Full name is required")
        @Size(min = 3, max = 100, message = "Full name must be from 3 to 100 characters")
        String fullName,
        @Pattern(regexp = "^[a-zA-Z0-9._-]{3,50}$", message = "Username must contain 3-50 latin characters, digits, dot, underscore or dash")
        String username,
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,
        @NotBlank(message = "Phone is required")
        String phone,
        Long specializationId,
        String description,
        @Min(value = 0, message = "Experience cannot be negative")
        Integer experienceYears,
        String education
) {
}
