package com.medical.service;

import com.medical.config.JwtService;
import com.medical.dto.AuthResponse;
import com.medical.dto.LoginRequest;
import com.medical.dto.RegisterRequest;
import com.medical.entity.Patient;
import com.medical.entity.Doctor;
import com.medical.entity.Role;
import com.medical.entity.User;
import com.medical.exception.BusinessException;
import com.medical.repository.DoctorRepository;
import com.medical.repository.PatientRepository;
import com.medical.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

@Transactional
public AuthResponse register(RegisterRequest request, Role role) {
    if (!request.password().equals(request.confirmPassword())) {
        throw new BusinessException("Пароли не совпадают", "PASSWORD_MISMATCH");
    }

    if (userRepository.existsByEmail(request.email())) {
        throw new BusinessException("Пользователь с таким email уже существует", "EMAIL_ALREADY_EXISTS");
    }

    User user = User.builder()
            .email(request.email())
            .fullName(request.fullName())
            .phone(request.phone())
            .passwordHash(passwordEncoder.encode(request.password()))
            .role(role)
            .isBlocked(false)
            .build();

    user = userRepository.save(user);

    if (role == Role.PATIENT) {
        Patient patient = Patient.builder()
                .user(user)
                .build();
        patientRepository.save(patient);
    } else if (role == Role.DOCTOR) {
        Doctor doctor = Doctor.builder()
                .user(user)
                .description("Профиль врача")
                .experienceYears(0)
                .education("Не указано")
                .build();
        doctorRepository.save(doctor);
    }

    HashMap<String, Object> extraClaims = new HashMap<>();
    extraClaims.put("role", user.getRole().name());
    extraClaims.put("userId", user.getId());

    var accessToken = jwtService.generateAccessToken(extraClaims, org.springframework.security.core.userdetails.User
            .withUsername(user.getEmail())
            .password(user.getPasswordHash())
            .authorities(user.getRole().name())
            .build());

    var refreshToken = jwtService.generateRefreshToken(org.springframework.security.core.userdetails.User
            .withUsername(user.getEmail())
            .password(user.getPasswordHash())
            .authorities(user.getRole().name())
            .build());

return new AuthResponse(
            accessToken,
            refreshToken,
            "Bearer",
            1800L,
            user.getRole().name(),
            user.getId(),
            user.getFullName()
    );
}

    public AuthResponse registerAdmin(RegisterRequest request) {
        return register(request, Role.ADMIN);
    }

    public AuthResponse registerDoctor(RegisterRequest request) {
        return register(request, Role.DOCTOR);
    }

    public AuthResponse authenticate(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),
                        request.password()
                )
        );

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new UsernameNotFoundException("Пользователь не найден"));

        HashMap<String, Object> authClaims = new HashMap<>();
        authClaims.put("role", user.getRole().name());
        authClaims.put("userId", user.getId());
        
        var accessToken = jwtService.generateAccessToken(authClaims, org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(user.getRole().name())
                .build());

        var refreshToken = jwtService.generateRefreshToken(org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(user.getRole().name())
                .build());

        return new AuthResponse(
                accessToken,
                refreshToken,
                "Bearer",
                1800L,
                user.getRole().name(),
                user.getId(),
                user.getFullName()
        );
    }
}