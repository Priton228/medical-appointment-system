package com.medical.dto.patient;

import com.medical.dto.common.AppointmentResponse;

import java.util.List;

public record PatientDashboardResponse(
        long totalAppointments,
        long activeAppointments,
        long medicalRecords,
        List<AppointmentResponse> upcomingAppointments
) {
}
