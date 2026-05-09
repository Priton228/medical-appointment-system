package com.medical.dto.common;

import com.medical.entity.AppointmentStatus;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record AppointmentResponse(
        Long id,
        Long slotId,
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
        String treatmentRecommendations,
        List<SymptomResponse> reportedSymptoms) {

    public AppointmentResponse {
        reportedSymptoms = reportedSymptoms == null ? List.of() : List.copyOf(reportedSymptoms);
    }
}
