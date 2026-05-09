package com.medical.controller;

import com.medical.dto.*;
import com.medical.entity.Role;
import com.medical.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request, Role.PATIENT));
    }

    @PostMapping("/register/admin")
    public ResponseEntity<AuthResponse> registerAdmin(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.registerAdmin(request));
    }

    @PostMapping("/register/doctor")
    public ResponseEntity<AuthResponse> registerDoctor(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.registerDoctor(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> authenticate(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.authenticate(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> requestPasswordReset(@RequestBody PasswordResetRequest request) {
        authService.requestPasswordReset(request.email());
        return ResponseEntity.ok(java.util.Map.of("message", "Код отправлен на ваш email"));
    }

    @PostMapping("/verify-code")
    public ResponseEntity<?> verifyResetCode(@RequestBody VerifyCodeRequest request) {
        authService.verifyResetCode(request.email(), request.code());
        return ResponseEntity.ok(java.util.Map.of("message", "Код подтверждён"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody NewPasswordRequest request) {
        authService.resetPassword(request.email(), request.code(), request.newPassword(), request.confirmPassword());
        return ResponseEntity.ok(java.util.Map.of("message", "Пароль успешно изменён"));
    }
}