package com.medical.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component
@Slf4j
public class CustomAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException) throws IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        log.error("=".repeat(80));
        log.error("ACCESS DENIED: {} {}", request.getMethod(), request.getRequestURI());
        log.error("User: {}", auth != null ? auth.getName() : "anonymous");
        log.error("Authorities: {}", auth != null ? auth.getAuthorities() : "none");
        log.error("Error: {}", accessDeniedException.getMessage());
        log.error("=".repeat(80));

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        Map<String, Object> error = new HashMap<>();
        error.put("error", "Access Denied");
        error.put("message", accessDeniedException.getMessage());
        error.put("user", auth != null ? auth.getName() : "anonymous");
        error.put("authorities", auth != null ? auth.getAuthorities().toString() : "none");
        error.put("path", request.getRequestURI());
        error.put("method", request.getMethod());

        objectMapper.writeValue(response.getWriter(), error);
    }
}
