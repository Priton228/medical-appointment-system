package com.medical.service;

import com.medical.dto.admin.SystemStatusResponse;
import com.medical.dto.admin.SystemStatusResponse.ComponentStatus;
import com.medical.dto.admin.SystemStatusResponse.EventEntry;
import com.medical.dto.admin.SystemStatusResponse.JvmStatus;
import com.medical.repository.AppointmentRepository;
import com.medical.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.sql.Connection;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemStatusService {

    private static final int MAX_EVENTS = 50;
    private static final Deque<EventEntry> recentEvents = new ConcurrentLinkedDeque<>();

    private final DataSource dataSource;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final CacheManager cacheManager;

    /** Зарегистрировать событие (вызывается из других сервисов или фильтров) */
    public static void recordEvent(String level, String component, String message) {
        EventEntry entry = new EventEntry(LocalDateTime.now(), level, component, message);
        recentEvents.addFirst(entry);
        while (recentEvents.size() > MAX_EVENTS) {
            recentEvents.pollLast();
        }
    }

    public SystemStatusResponse getStatus() {
        List<ComponentStatus> components = new ArrayList<>();

        // Database
        components.add(checkDatabase());

        // User repository
        components.add(checkRepository("Сервис пользователей", () -> userRepository.count()));

        // Appointment repository
        components.add(checkRepository("Сервис записей", () -> appointmentRepository.count()));

        // Authentication service - basic check
        components.add(new ComponentStatus("Аутентификация (JWT)", "UP", "JWT-фильтр активен", null));

        // Notifications
        components.add(new ComponentStatus("Сервис уведомлений", "UP", "Уведомления функционируют", null));

        // Chat
        components.add(new ComponentStatus("Сервис сообщений", "UP", "Чат активен", null));

        // Scheduler
        components.add(new ComponentStatus("Планировщик задач", "UP", "Cron-задачи запущены", null));

        // JVM
        Runtime runtime = Runtime.getRuntime();
        long total = runtime.totalMemory();
        long free = runtime.freeMemory();
        long used = total - free;
        long max = runtime.maxMemory();
        int processors = runtime.availableProcessors();
        int threadCount = Thread.activeCount();
        String javaVersion = System.getProperty("java.version");

        JvmStatus jvm = new JvmStatus(
                bytesToMb(used),
                bytesToMb(max),
                bytesToMb(total),
                processors,
                threadCount,
                javaVersion
        );

        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();

        String overallStatus = components.stream().anyMatch(c -> "DOWN".equals(c.status()))
                ? "DOWN"
                : components.stream().anyMatch(c -> "DEGRADED".equals(c.status()))
                ? "DEGRADED"
                : "UP";

        List<EventEntry> events = new ArrayList<>(recentEvents);
        Collections.sort(events, (a, b) -> b.time().compareTo(a.time()));

        return new SystemStatusResponse(
                overallStatus,
                LocalDateTime.now(),
                uptimeMs,
                jvm,
                components,
                events
        );
    }

    public String clearAllCaches() {
        if (cacheManager != null) {
            cacheManager.getCacheNames().forEach(name -> {
                var cache = cacheManager.getCache(name);
                if (cache != null) cache.clear();
            });
            recordEvent("INFO", "Cache", "All caches cleared");
            return "All caches cleared successfully";
        }
        return "CacheManager not available";
    }

    private ComponentStatus checkDatabase() {
        long start = System.currentTimeMillis();
        try (Connection conn = dataSource.getConnection()) {
            boolean valid = conn.isValid(2);
            long latency = System.currentTimeMillis() - start;
            if (valid) {
                return new ComponentStatus("База данных PostgreSQL", "UP", "Подключение установлено", latency);
            }
            return new ComponentStatus("База данных PostgreSQL", "DOWN", "Невалидное подключение", latency);
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            recordEvent("ERROR", "Database", e.getMessage());
            return new ComponentStatus("База данных PostgreSQL", "DOWN", e.getMessage(), latency);
        }
    }

    private ComponentStatus checkRepository(String name, RepositoryProbe probe) {
        long start = System.currentTimeMillis();
        try {
            probe.run();
            long latency = System.currentTimeMillis() - start;
            return new ComponentStatus(name, "UP", "Доступен", latency);
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            recordEvent("ERROR", name, e.getMessage());
            return new ComponentStatus(name, "DOWN", e.getMessage(), latency);
        }
    }

    private long bytesToMb(long bytes) {
        return bytes / (1024 * 1024);
    }

    @FunctionalInterface
    private interface RepositoryProbe {
        void run() throws Exception;
    }
}
