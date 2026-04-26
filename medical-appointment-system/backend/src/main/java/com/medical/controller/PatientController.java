package com.medical.controller;

import com.medical.dto.common.AppointmentResponse;
import com.medical.dto.common.DoctorResponse;
import com.medical.dto.common.SlotResponse;
import com.medical.dto.common.SymptomResponse;
import com.medical.dto.patient.*;
import com.medical.service.PatientCabinetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/patient")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PATIENT')")
public class PatientController {

    private final PatientCabinetService patientCabinetService;

    @GetMapping("/dashboard")
    public ResponseEntity<PatientDashboardResponse> getDashboard(Authentication authentication) {
        return ResponseEntity.ok(patientCabinetService.getDashboard(authentication));
    }

    @GetMapping("/profile")
    public ResponseEntity<PatientProfileResponse> getProfile(Authentication authentication) {
        return ResponseEntity.ok(patientCabinetService.getProfile(authentication));
    }

    @PutMapping("/profile")
    public ResponseEntity<PatientProfileResponse> updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdatePatientProfileRequest request
    ) {
        return ResponseEntity.ok(patientCabinetService.updateProfile(authentication, request));
    }

    @GetMapping("/doctors")
    public ResponseEntity<List<DoctorResponse>> getDoctors(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Double minRating
    ) {
        return ResponseEntity.ok(patientCabinetService.getDoctors(search, minRating));
    }

    @GetMapping("/doctors/{doctorId}/slots")
    public ResponseEntity<List<SlotResponse>> getDoctorSlots(
            @PathVariable Long doctorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(patientCabinetService.getDoctorSlots(doctorId, date));
    }

    @PostMapping("/appointments")
    public ResponseEntity<AppointmentResponse> bookAppointment(
            Authentication authentication,
            @Valid @RequestBody BookAppointmentRequest request
    ) {
        return ResponseEntity.ok(patientCabinetService.bookAppointment(authentication, request));
    }

    @GetMapping("/appointments")
    public ResponseEntity<List<AppointmentResponse>> getAppointments(Authentication authentication) {
        return ResponseEntity.ok(patientCabinetService.getAppointments(authentication));
    }

    @PatchMapping("/appointments/{appointmentId}/cancel")
    public ResponseEntity<AppointmentResponse> cancelAppointment(Authentication authentication, @PathVariable Long appointmentId) {
        return ResponseEntity.ok(patientCabinetService.cancelAppointment(authentication, appointmentId));
    }

    @GetMapping("/medical-records")
    public ResponseEntity<List<MedicalRecordResponse>> getMedicalRecords(Authentication authentication) {
        return ResponseEntity.ok(patientCabinetService.getMedicalRecords(authentication));
    }

    @PatchMapping("/medical-records/{recordId}")
    public ResponseEntity<MedicalRecordResponse> updateMedicalRecord(
            Authentication authentication,
            @PathVariable Long recordId,
            @RequestBody UpdateMedicalRecordRequest request
    ) {
        return ResponseEntity.ok(patientCabinetService.updateMedicalRecord(authentication, recordId, request));
    }

    @GetMapping("/symptoms")
    public ResponseEntity<List<SymptomResponse>> getSymptoms(@RequestParam(required = false) String query) {
        return ResponseEntity.ok(patientCabinetService.getSymptoms(query));
    }

    @PostMapping("/recommendations")
    public ResponseEntity<SymptomRecommendationResponse> recommendDoctors(@Valid @RequestBody SymptomRecommendationRequest request) {
        return ResponseEntity.ok(patientCabinetService.recommendDoctors(request));
    }

    @GetMapping("/notifications")
    public ResponseEntity<List<PatientNotificationResponse>> getNotifications(Authentication authentication) {
        return ResponseEntity.ok(patientCabinetService.getNotifications(authentication));
    }

    @PatchMapping("/notifications/{notificationId}")
    public ResponseEntity<PatientNotificationResponse> markNotificationRead(
            Authentication authentication,
            @PathVariable Long notificationId,
            @RequestParam boolean read
    ) {
        return ResponseEntity.ok(patientCabinetService.markNotificationRead(authentication, notificationId, read));
    }

    @DeleteMapping("/notifications/{notificationId}")
    public ResponseEntity<Void> deleteNotification(Authentication authentication, @PathVariable Long notificationId) {
        patientCabinetService.deleteNotification(authentication, notificationId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/security/change-password")
    public ResponseEntity<Void> changePassword(Authentication authentication, @Valid @RequestBody ChangePasswordRequest request) {
        patientCabinetService.changePassword(authentication, request);
        return ResponseEntity.noContent().build();
    }
}
