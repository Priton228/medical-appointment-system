package com.medical.dto.admin;

import java.time.LocalDateTime;
import java.util.List;

public record SystemStatusResponse(
        String overallStatus,
        LocalDateTime checkedAt,
        long uptimeMs,
        JvmStatus jvm,
        List<ComponentStatus> components,
        List<EventEntry> recentEvents
) {
    public record JvmStatus(
            long usedMemoryMb,
            long maxMemoryMb,
            long totalMemoryMb,
            int availableProcessors,
            int activeThreads,
            String javaVersion
    ) {}

    public record ComponentStatus(
            String name,
            String status,
            String message,
            Long latencyMs
    ) {}

    public record EventEntry(
            LocalDateTime time,
            String level,
            String component,
            String message
    ) {}
}
