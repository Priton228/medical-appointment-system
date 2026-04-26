package com.medical.dto.doctor;

public record DoctorDashboardResponse(
        long appointmentsToday,
        long totalAppointments,
        long completedAppointments,
        long activeSlots
) {
}
