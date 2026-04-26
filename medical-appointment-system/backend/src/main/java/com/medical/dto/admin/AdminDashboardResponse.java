package com.medical.dto.admin;

public record AdminDashboardResponse(
        long totalUsers,
        long totalDoctors,
        long totalPatients,
        long totalAppointments,
        long scheduledAppointments,
        long completedAppointments
) {
}
