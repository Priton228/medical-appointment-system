package com.medical.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String subject;

        log.debug("JWT Filter: Processing {} {}", request.getMethod(), request.getRequestURI());
        log.debug("JWT Filter: Auth header present: {}", authHeader != null);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        try {
            subject = jwtService.extractUsername(jwt);
        } catch (Exception ex) {
            filterChain.doFilter(request, response);
            return;
        }

        if (subject != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(subject);
                log.debug("JWT Filter: Loaded user {} with authorities {}", subject, userDetails.getAuthorities());

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.debug("JWT Filter: Authentication set for user {} on {} {}", subject, request.getMethod(), request.getRequestURI());
                } else {
                    log.warn("JWT Filter: Invalid token for user {} on {} {}", subject, request.getMethod(), request.getRequestURI());
                }
            } catch (UsernameNotFoundException ex) {
                log.warn("JWT Filter: User not found: {}", subject);
            } catch (Exception ex) {
                log.error("JWT Filter: Unexpected error during authentication: {}", ex.getMessage(), ex);
            }
        } else if (subject == null) {
            log.warn("JWT Filter: No subject extracted from token on {} {}", request.getMethod(), request.getRequestURI());
        } else {
            log.debug("JWT Filter: Authentication already exists for {} {}", request.getMethod(), request.getRequestURI());
        }
        filterChain.doFilter(request, response);
    }
}
