package com.medical.config;

import com.medical.exception.BusinessException;
import com.medical.service.SystemStatusService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> handleBusinessException(BusinessException ex) {
        log.error("Business Exception: {} - {}", ex.getErrorCode(), ex.getMessage());
        SystemStatusService.recordEvent("WARN", "BusinessError", ex.getErrorCode() + ": " + ex.getMessage());
        Map<String, Object> error = new HashMap<>();
        error.put("error", "Business Error");
        error.put("code", ex.getErrorCode());
        error.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        log.error("Access Denied: {}", ex.getMessage());
        log.error("Current user: {}", auth != null ? auth.getName() : "anonymous");
        log.error("Authorities: {}", auth != null ? auth.getAuthorities() : "none");

        Map<String, Object> error = new HashMap<>();
        error.put("error", "Access Denied");
        error.put("message", "You don't have permission to perform this action: " + ex.getMessage());
        error.put("currentUser", auth != null ? auth.getName() : "anonymous");
        error.put("authorities", auth != null ? auth.getAuthorities().toString() : "none");

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex) {
        log.error("Authentication failed: {}", ex.getMessage());
        Map<String, Object> error = new HashMap<>();
        error.put("error", "Authentication Failed");
        error.put("code", "INVALID_PASSWORD");
        error.put("message", "Неверный пароль. Пожалуйста, проверьте правильность введённых данных.");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleUserNotFound(UsernameNotFoundException ex) {
        log.error("User not found: {}", ex.getMessage());
        Map<String, Object> error = new HashMap<>();
        error.put("error", "Authentication Failed");
        error.put("code", "USER_NOT_FOUND");
        error.put("message", "Пользователь с таким email/логином не найден.");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(LockedException.class)
    public ResponseEntity<Map<String, Object>> handleLockedException(LockedException ex) {
        log.error("Account locked: {}", ex.getMessage());
        Map<String, Object> error = new HashMap<>();
        error.put("error", "Account Locked");
        error.put("code", "USER_BLOCKED");
        error.put("message", "Аккаунт заблокирован. Обратитесь к администратору.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralException(Exception ex) {
        log.error("Unexpected error", ex);
        SystemStatusService.recordEvent("ERROR", ex.getClass().getSimpleName(),
                ex.getMessage() != null ? ex.getMessage() : "Неизвестная ошибка");
        Map<String, Object> error = new HashMap<>();
        error.put("error", "Internal Server Error");
        error.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
