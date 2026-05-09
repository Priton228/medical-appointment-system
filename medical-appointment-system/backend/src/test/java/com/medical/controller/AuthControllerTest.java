package com.medical.controller;

import com.medical.dto.*;
import com.medical.entity.Role;
import com.medical.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AuthService authService;

    private final AuthResponse mockResponse = new AuthResponse(
            "token123", "refresh123", "PATIENT", "Test User", null, "test@test.com", "+375291111111"
    );

    @Test
    void register_shouldReturnOk() throws Exception {
        when(authService.register(any(RegisterRequest.class), any(Role.class))).thenReturn(mockResponse);

        RegisterRequest request = new RegisterRequest(
                "Test User", "testuser", "test@test.com", "+375291111111", "password123", "password123"
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token123"))
                .andExpect(jsonPath("$.role").value("PATIENT"));
    }

    @Test
    void login_shouldReturnOk() throws Exception {
        when(authService.authenticate(any(LoginRequest.class))).thenReturn(mockResponse);

        LoginRequest request = new LoginRequest("testuser", "password123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token123"))
                .andExpect(jsonPath("$.fullName").value("Test User"));
    }

    @Test
    void forgotPassword_shouldReturnOk() throws Exception {
        PasswordResetRequest request = new PasswordResetRequest("test@test.com");

        mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Код отправлен на ваш email"));
    }

    @Test
    void verifyCode_shouldReturnOk() throws Exception {
        VerifyCodeRequest request = new VerifyCodeRequest("test@test.com", "123456");

        mockMvc.perform(post("/api/auth/verify-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Код подтверждён"));
    }

    @Test
    void resetPassword_shouldReturnOk() throws Exception {
        NewPasswordRequest request = new NewPasswordRequest("test@test.com", "123456", "newpass123", "newpass123");

        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Пароль успешно изменён"));
    }

    @Test
    void registerAdmin_shouldReturnOk() throws Exception {
        when(authService.registerAdmin(any(RegisterRequest.class))).thenReturn(mockResponse);

        RegisterRequest request = new RegisterRequest(
                "Admin User", "adminuser", "admin@test.com", "+375299999999", "adminpass", "adminpass"
        );

        mockMvc.perform(post("/api/auth/register/admin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token123"));
    }

    @Test
    void registerDoctor_shouldReturnOk() throws Exception {
        when(authService.registerDoctor(any(RegisterRequest.class))).thenReturn(mockResponse);

        RegisterRequest request = new RegisterRequest(
                "Doctor User", "docuser", "doc@test.com", "+375297777777", "docpass123", "docpass123"
        );

        mockMvc.perform(post("/api/auth/register/doctor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token123"));
    }
}
