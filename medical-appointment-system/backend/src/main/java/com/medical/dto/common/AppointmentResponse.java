package com.medical.dto.common;

import com.medical.entity.AppointmentStatus;

import java.time.LocalDate;
import java.time.LocalTime;

public record AppointmentResponse(
        Long id,
        Long patientId,
        String patientName,
        Long doctorId,
        String doctorName,
        LocalDate date,
        LocalTime startTime,
        LocalTime endTime,
        AppointmentStatus status,
        String symptomsDescription,
        String doctorNotes,
        String diagnosis,
        String treatmentRecommendations) {
}
