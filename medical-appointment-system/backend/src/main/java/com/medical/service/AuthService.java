package com.medical.service;

import com.medical.config.JwtService;
import com.medical.dto.AuthResponse;
import com.medical.dto.LoginRequest;
import com.medical.dto.RegisterRequest;
import com.medical.entity.Doctor;
import com.medical.entity.PasswordResetCode;
import com.medical.entity.Patient;
import com.medical.entity.Role;
import com.medical.entity.User;
import com.medical.exception.BusinessException;
import com.medical.repository.DoctorRepository;
import com.medical.repository.PasswordResetCodeRepository;
import com.medical.repository.PatientRepository;
import com.medical.repository.UserRepository;
import com.medical.service.integration.EmailNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordResetCodeRepository passwordResetCodeRepository;
    private final EmailNotificationService emailNotificationService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    private String generateUsernameFromEmail(String email, String currentUsername) {
        if (email == null || email.isBlank()) return currentUsername;
        String base = email.split("@")[0].replaceAll("[^a-zA-Z0-9._-]", "");
        if (base.length() < 3) base = base + "user";
        if (base.length() > 50) base = base.substring(0, 50);
        return base;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, Role role) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new BusinessException("Passwords do not match", "PASSWORD_MISMATCH");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException("Пользователь с таким email уже зарегистрирован", "EMAIL_ALREADY_EXISTS");
        }

        // Generate username from email if not provided
        String username = (request.username() != null && !request.username().isBlank())
                ? request.username()
                : generateUsernameFromEmail(request.email(), "user");

        // Ensure uniqueness
        if (userRepository.existsByUsername(username)) {
            username = username + System.currentTimeMillis() % 1000;
        }

        User user = User.builder()
                .username(username)
                .email(request.email())
                .fullName(request.fullName())
                .phone(request.phone())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(role)
                .isBlocked(false)
                .build();

        user = userRepository.save(user);

        if (role == Role.PATIENT) {
            Patient patient = Patient.builder().user(user).build();
            patientRepository.save(patient);
        } else if (role == Role.DOCTOR) {
            Doctor doctor = Doctor.builder()
                    .user(user)
                    .description("Doctor profile")
                    .experienceYears(0)
                    .education("Not specified")
                    .build();
            doctorRepository.save(doctor);
        }

        HashMap<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("role", user.getRole().name());
        extraClaims.put("userId", user.getId());

        var principal = org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(user.getRole().name())
                .build();

        var accessToken = jwtService.generateAccessToken(extraClaims, principal);
        var refreshToken = jwtService.generateRefreshToken(principal);

        return buildAuthResponse(user, accessToken, refreshToken);
    }

    public AuthResponse registerAdmin(RegisterRequest request) {
        return register(request, Role.ADMIN);
    }

    public AuthResponse registerDoctor(RegisterRequest request) {
        return register(request, Role.DOCTOR);
    }

    public AuthResponse authenticate(LoginRequest request) {
        User resolvedUser = userRepository.findByUsername(request.username())
                .or(() -> userRepository.findByEmail(request.username()))
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        if (Boolean.TRUE.equals(resolvedUser.getIsBlocked())) {
            throw new BusinessException("Аккаунт заблокирован. Обратитесь к администратору.", "USER_BLOCKED");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(resolvedUser.getUsername(), request.password())
            );
        } catch (BadCredentialsException ex) {
            throw new BusinessException("Неверный пароль", "INVALID_PASSWORD");
        }

        User user = resolvedUser;

        HashMap<String, Object> authClaims = new HashMap<>();
        authClaims.put("role", user.getRole().name());
        authClaims.put("userId", user.getId());

        var principal = org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(user.getRole().name())
                .build();

        var accessToken = jwtService.generateAccessToken(authClaims, principal);
        var refreshToken = jwtService.generateRefreshToken(principal);

        return buildAuthResponse(user, accessToken, refreshToken);
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken) {
        return new AuthResponse(
                accessToken,
                refreshToken,
                "Bearer",
                1800L,
                user.getRole().name(),
                user.getId(),
                user.getUsername(),
                user.getFullName()
        );
    }

    @Transactional
    public void requestPasswordReset(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Пользователь с таким email не найден", "USER_NOT_FOUND"));

        // Проверка: не более 3 активных запросов за 15 минут
        long activeCodes = passwordResetCodeRepository.countByEmailAndUsedFalseAndExpiresAtAfter(email, LocalDateTime.now());
        if (activeCodes >= 3) {
            throw new BusinessException("Слишком много запросов. Попробуйте позже.", "TOO_MANY_REQUESTS");
        }

        // Генерация 6-значного кода
        String code = String.format("%06d", new Random().nextInt(1000000));

        PasswordResetCode resetCode = PasswordResetCode.builder()
                .email(email)
                .code(code)
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .used(false)
                .build();

        passwordResetCodeRepository.save(resetCode);

        emailNotificationService.sendEmail(
                email,
                "Код восстановления пароля",
                "Здравствуйте, " + user.getFullName() + "!\n\n" +
                "Ваш код для восстановления пароля: " + code + "\n\n" +
                "Код действителен в течение 15 минут.\n" +
                "Если вы не запрашивали восстановление пароля, проигнорируйте это письмо."
        );
    }

    @Transactional
    public void verifyResetCode(String email, String code) {
        PasswordResetCode resetCode = passwordResetCodeRepository
                .findByEmailAndCodeAndUsedFalse(email, code)
                .orElseThrow(() -> new BusinessException("Неверный или устаревший код", "INVALID_CODE"));

        if (resetCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Код истёк. Запросите новый.", "CODE_EXPIRED");
        }
    }

    @Transactional
    public void resetPassword(String email, String code, String newPassword, String confirmPassword) {
        if (!newPassword.equals(confirmPassword)) {
            throw new BusinessException("Пароли не совпадают", "PASSWORD_MISMATCH");
        }
        if (newPassword.length() < 6) {
            throw new BusinessException("Пароль должен быть не менее 6 символов", "PASSWORD_TOO_SHORT");
        }

        PasswordResetCode resetCode = passwordResetCodeRepository
                .findByEmailAndCodeAndUsedFalse(email, code)
                .orElseThrow(() -> new BusinessException("Неверный или устаревший код", "INVALID_CODE"));

        if (resetCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Код истёк. Запросите новый.", "CODE_EXPIRED");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Пользователь не найден", "USER_NOT_FOUND"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetCode.setUsed(true);
        passwordResetCodeRepository.save(resetCode);
    }
}
