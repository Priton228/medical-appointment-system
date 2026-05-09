package com.medical.service.mapping;

import com.medical.dto.common.AppointmentResponse;
import com.medical.dto.common.SymptomResponse;
import com.medical.entity.Appointment;
import com.medical.entity.Symptom;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

@Component
public class AppointmentMapper {

    public AppointmentResponse toResponse(Appointment appointment) {
        List<SymptomResponse> reportedSymptoms = List.of();
        if (appointment.getReportedSymptoms() != null && !appointment.getReportedSymptoms().isEmpty()) {
            reportedSymptoms = appointment.getReportedSymptoms().stream()
                    .map(this::toSymptomResponse)
                    .sorted(Comparator.comparing(SymptomResponse::name))
                    .toList();
        }
        return new AppointmentResponse(
                appointment.getId(),
                appointment.getSlot().getId(),
                appointment.getPatient().getId(),
                appointment.getPatient().getUser().getFullName(),
                appointment.getDoctor().getId(),
                appointment.getDoctor().getUser().getFullName(),
                appointment.getSlot().getDate(),
                appointment.getSlot().getStartTime(),
                appointment.getSlot().getEndTime(),
                appointment.getStatus(),
                appointment.getSymptomsDescription(),
                appointment.getDoctorNotes(),
                appointment.getDiagnosis(),
                appointment.getTreatmentRecommendations(),
                reportedSymptoms
        );
    }

    private SymptomResponse toSymptomResponse(Symptom s) {
        return new SymptomResponse(
                s.getId(),
                s.getName(),
                s.getDescription(),
                s.getIsUrgent()
        );
    }
}
