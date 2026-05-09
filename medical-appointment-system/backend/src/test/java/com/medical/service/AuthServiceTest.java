package com.medical.service;

import com.medical.config.JwtService;
import com.medical.dto.AuthResponse;
import com.medical.dto.LoginRequest;
import com.medical.dto.RegisterRequest;
import com.medical.entity.*;
import com.medical.exception.BusinessException;
import com.medical.repository.DoctorRepository;
import com.medical.repository.PasswordResetCodeRepository;
import com.medical.repository.PatientRepository;
import com.medical.repository.UserRepository;
import com.medical.service.integration.EmailNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private PasswordResetCodeRepository passwordResetCodeRepository;
    @Mock
    private EmailNotificationService emailNotificationService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest validRequest;
    private User savedUser;

    @BeforeEach
    void setUp() {
        validRequest = new RegisterRequest(
                "Иванов Иван",
                "ivanuser",
                "ivan@test.com",
                "+375291234567",
                "password123",
                "password123"
        );
        savedUser = User.builder()
                .id(1L)
                .username("ivan")
                .email("ivan@test.com")
                .fullName("Иванов Иван")
                .passwordHash("encoded")
                .role(Role.PATIENT)
                .isBlocked(false)
                .build();
    }

    @Test
    void register_shouldReturnAuthResponse_whenValidPatientRegistration() {
        when(userRepository.existsByEmail(validRequest.email())).thenReturn(false);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(validRequest.password())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateAccessToken(anyMap(), any())).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any())).thenReturn("refresh-token");

        AuthResponse response = authService.register(validRequest, Role.PATIENT);

        assertNotNull(response);
        assertEquals("access-token", response.accessToken());
        assertEquals("PATIENT", response.role());
        verify(patientRepository).save(any(Patient.class));
    }

    @Test
    void register_shouldThrowBusinessException_whenEmailAlreadyExists() {
        when(userRepository.existsByEmail(validRequest.email())).thenReturn(true);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> authService.register(validRequest, Role.PATIENT));

        assertEquals("EMAIL_ALREADY_EXISTS", ex.getErrorCode());
    }

    @Test
    void register_shouldThrowBusinessException_whenPasswordMismatch() {
        RegisterRequest badRequest = new RegisterRequest(
                "Иванов Иван", "ivanuser", "ivan@test.com", "+375291234567",
                "password123", "different"
        );

        BusinessException ex = assertThrows(BusinessException.class,
                () -> authService.register(badRequest, Role.PATIENT));

        assertEquals("PASSWORD_MISMATCH", ex.getErrorCode());
    }

    @Test
    void register_shouldCreateDoctor_whenRoleIsDoctor() {
        when(userRepository.existsByEmail(validRequest.email())).thenReturn(false);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateAccessToken(anyMap(), any())).thenReturn("token");
        when(jwtService.generateRefreshToken(any())).thenReturn("refresh");

        authService.register(validRequest, Role.DOCTOR);

        verify(doctorRepository).save(any(Doctor.class));
    }

    @Test
    void authenticate_shouldReturnAuthResponse_whenValidCredentials() {
        LoginRequest loginRequest = new LoginRequest("ivan", "password123");
        when(userRepository.findByUsername("ivan")).thenReturn(Optional.of(savedUser));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);
        when(jwtService.generateAccessToken(anyMap(), any())).thenReturn("access");
        when(jwtService.generateRefreshToken(any())).thenReturn("refresh");

        AuthResponse response = authService.authenticate(loginRequest);

        assertNotNull(response);
        assertEquals(1L, response.userId());
    }

    @Test
    void authenticate_shouldThrowBusinessException_whenUserBlocked() {
        LoginRequest loginRequest = new LoginRequest("ivan", "password123");
        User blockedUser = User.builder()
                .id(1L).username("ivan").isBlocked(true).role(Role.PATIENT).build();
        when(userRepository.findByUsername("ivan")).thenReturn(Optional.of(blockedUser));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> authService.authenticate(loginRequest));

        assertEquals("USER_BLOCKED", ex.getErrorCode());
    }

    @Test
    void authenticate_shouldThrowBusinessException_whenBadCredentials() {
        LoginRequest loginRequest = new LoginRequest("ivan", "wrong");
        when(userRepository.findByUsername("ivan")).thenReturn(Optional.of(savedUser));
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad creds"));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> authService.authenticate(loginRequest));

        assertEquals("INVALID_PASSWORD", ex.getErrorCode());
    }

    @Test
    void requestPasswordReset_shouldSendEmail_whenValidRequest() {
        when(userRepository.findByEmail("ivan@test.com")).thenReturn(Optional.of(savedUser));
        when(passwordResetCodeRepository.countByEmailAndUsedFalseAndExpiresAtAfter(
                eq("ivan@test.com"), any(LocalDateTime.class))).thenReturn(0L);
        when(passwordResetCodeRepository.save(any(PasswordResetCode.class))).thenAnswer(i -> i.getArgument(0));

        authService.requestPasswordReset("ivan@test.com");

        verify(emailNotificationService).sendEmail(eq("ivan@test.com"), eq("Код восстановления пароля"), contains("Ваш код"));
        verify(passwordResetCodeRepository).save(any(PasswordResetCode.class));
    }

    @Test
    void requestPasswordReset_shouldThrow_whenTooManyRequests() {
        when(userRepository.findByEmail("ivan@test.com")).thenReturn(Optional.of(savedUser));
        when(passwordResetCodeRepository.countByEmailAndUsedFalseAndExpiresAtAfter(
                anyString(), any(LocalDateTime.class))).thenReturn(3L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> authService.requestPasswordReset("ivan@test.com"));

        assertEquals("TOO_MANY_REQUESTS", ex.getErrorCode());
    }

    @Test
    void verifyResetCode_shouldPass_whenValidCode() {
        PasswordResetCode code = PasswordResetCode.builder()
                .email("ivan@test.com").code("123456").expiresAt(LocalDateTime.now().plusMinutes(10)).used(false).build();
        when(passwordResetCodeRepository.findByEmailAndCodeAndUsedFalse("ivan@test.com", "123456"))
                .thenReturn(Optional.of(code));

        assertDoesNotThrow(() -> authService.verifyResetCode("ivan@test.com", "123456"));
    }

    @Test
    void verifyResetCode_shouldThrow_whenCodeExpired() {
        PasswordResetCode code = PasswordResetCode.builder()
                .email("ivan@test.com").code("123456").expiresAt(LocalDateTime.now().minusMinutes(1)).used(false).build();
        when(passwordResetCodeRepository.findByEmailAndCodeAndUsedFalse("ivan@test.com", "123456"))
                .thenReturn(Optional.of(code));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> authService.verifyResetCode("ivan@test.com", "123456"));

        assertEquals("CODE_EXPIRED", ex.getErrorCode());
    }

    @Test
    void resetPassword_shouldUpdatePassword_whenValidCodeAndPasswords() {
        PasswordResetCode code = PasswordResetCode.builder()
                .id(1L).email("ivan@test.com").code("123456").expiresAt(LocalDateTime.now().plusMinutes(10)).used(false).build();
        when(passwordResetCodeRepository.findByEmailAndCodeAndUsedFalse("ivan@test.com", "123456"))
                .thenReturn(Optional.of(code));
        when(userRepository.findByEmail("ivan@test.com")).thenReturn(Optional.of(savedUser));
        when(passwordEncoder.encode("newPass123")).thenReturn("encodedNew");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(passwordResetCodeRepository.save(any(PasswordResetCode.class))).thenReturn(code);

        authService.resetPassword("ivan@test.com", "123456", "newPass123", "newPass123");

        verify(userRepository).save(argThat(u -> u.getPasswordHash().equals("encodedNew")));
        verify(passwordResetCodeRepository).save(argThat(PasswordResetCode::getUsed));
    }

    @Test
    void resetPassword_shouldThrow_whenPasswordsMismatch() {
        BusinessException ex = assertThrows(BusinessException.class,
                () -> authService.resetPassword("ivan@test.com", "123456", "pass1", "pass2"));

        assertEquals("PASSWORD_MISMATCH", ex.getErrorCode());
    }

    @Test
    void resetPassword_shouldThrow_whenPasswordTooShort() {
        BusinessException ex = assertThrows(BusinessException.class,
                () -> authService.resetPassword("ivan@test.com", "123456", "123", "123"));

        assertEquals("PASSWORD_TOO_SHORT", ex.getErrorCode());
    }
}
