package com.medical.service;

import com.medical.dto.admin.SystemStatusResponse;
import com.medical.repository.AppointmentRepository;
import com.medical.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SystemStatusServiceTest {

    @Mock
    private DataSource dataSource;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private CacheManager cacheManager;
    @Mock
    private Connection connection;
    @Mock
    private Cache cache;

    @InjectMocks
    private SystemStatusService systemStatusService;

    @BeforeEach
    void setUp() throws Exception {
        when(dataSource.getConnection()).thenReturn(connection);
    }

    @Test
    void getStatus_shouldReturnUp_whenAllOk() throws Exception {
        when(connection.isValid(2)).thenReturn(true);
        when(userRepository.count()).thenReturn(10L);
        when(appointmentRepository.count()).thenReturn(5L);

        SystemStatusResponse status = systemStatusService.getStatus();

        assertNotNull(status);
        assertEquals("UP", status.overallStatus());
        assertNotNull(status.components());
        assertFalse(status.components().isEmpty());
        assertTrue(status.components().stream()
                .anyMatch(c -> c.name().contains("PostgreSQL") && "UP".equals(c.status())));
        assertNotNull(status.jvm());
        assertTrue(status.uptimeMs() >= 0);
    }

    @Test
    void getStatus_shouldReturnDown_whenDatabaseFails() throws Exception {
        when(connection.isValid(2)).thenThrow(new RuntimeException("DB error"));

        SystemStatusResponse status = systemStatusService.getStatus();

        assertEquals("DOWN", status.overallStatus());
        assertTrue(status.components().stream()
                .anyMatch(c -> c.name().contains("PostgreSQL") && "DOWN".equals(c.status())));
    }

    @Test
    void getStatus_shouldReturnDegraded_whenRepositoryFails() throws Exception {
        when(connection.isValid(2)).thenReturn(true);
        when(userRepository.count()).thenThrow(new RuntimeException("Repo error"));
        when(appointmentRepository.count()).thenReturn(5L);

        SystemStatusResponse status = systemStatusService.getStatus();

        assertEquals("DEGRADED", status.overallStatus());
    }

    @Test
    void clearAllCaches_shouldClearAll() {
        when(cacheManager.getCacheNames()).thenReturn(List.of("users", "appointments"));
        when(cacheManager.getCache(anyString())).thenReturn(cache);

        String result = systemStatusService.clearAllCaches();

        assertEquals("All caches cleared successfully", result);
        verify(cache, times(2)).clear();
    }

    @Test
    void clearAllCaches_shouldReturnMessage_whenCacheManagerNull() {
        SystemStatusService service = new SystemStatusService(dataSource, userRepository, appointmentRepository, null);
        String result = service.clearAllCaches();
        assertEquals("CacheManager not available", result);
    }
}
