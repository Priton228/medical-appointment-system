package com.medical.controller;

import com.medical.dto.common.AppointmentResponse;
import com.medical.dto.common.RescheduleRequestResponse;
import com.medical.dto.common.SlotResponse;
import com.medical.dto.doctor.DoctorDashboardResponse;
import com.medical.dto.doctor.RescheduleAppointmentRequest;
import com.medical.dto.doctor.UpdateAppointmentStatusRequest;
import com.medical.dto.doctor.UpsertSlotRequest;
import com.medical.dto.patient.ReviewResponse;
import com.medical.service.DoctorCabinetService;
import com.medical.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/doctor")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('DOCTOR')")
public class DoctorController {

    private final DoctorCabinetService doctorCabinetService;
    private final ReviewService reviewService;

    @GetMapping("/dashboard")
    public ResponseEntity<DoctorDashboardResponse> getDashboard(Authentication authentication) {
        return ResponseEntity.ok(doctorCabinetService.getDashboard(authentication));
    }

    @GetMapping("/appointments/today")
    public ResponseEntity<List<AppointmentResponse>> getTodayAppointments(Authentication authentication) {
        return ResponseEntity.ok(doctorCabinetService.getTodayAppointments(authentication));
    }

    @GetMapping("/appointments")
    public ResponseEntity<List<AppointmentResponse>> getAllAppointments(Authentication authentication) {
        return ResponseEntity.ok(doctorCabinetService.getAllAppointments(authentication));
    }

    @PatchMapping("/appointments/{appointmentId}/status")
    public ResponseEntity<AppointmentResponse> updateAppointmentStatus(
            Authentication authentication,
            @PathVariable Long appointmentId,
            @Valid @RequestBody UpdateAppointmentStatusRequest request
    ) {
        return ResponseEntity.ok(doctorCabinetService.updateAppointmentStatus(authentication, appointmentId, request));
    }

    @PatchMapping("/appointments/{appointmentId}/reschedule")
    public ResponseEntity<AppointmentResponse> rescheduleAppointment(
            Authentication authentication,
            @PathVariable Long appointmentId,
            @Valid @RequestBody RescheduleAppointmentRequest request
    ) {
        return ResponseEntity.ok(doctorCabinetService.rescheduleAppointment(authentication, appointmentId, request));
    }

    @PostMapping("/appointments/{appointmentId}/reschedule-request")
    public ResponseEntity<RescheduleRequestResponse> createRescheduleRequest(
            Authentication authentication,
            @PathVariable Long appointmentId,
            @RequestParam Long newSlotId
    ) {
        return ResponseEntity.ok(doctorCabinetService.createRescheduleRequest(authentication, appointmentId, newSlotId));
    }

    @GetMapping("/reschedule-requests")
    public ResponseEntity<List<RescheduleRequestResponse>> getRescheduleRequests(Authentication authentication) {
        return ResponseEntity.ok(doctorCabinetService.getRescheduleRequests(authentication));
    }

    @PatchMapping("/appointments/{appointmentId}/complete")
    public ResponseEntity<AppointmentResponse> completeAppointment(
            Authentication authentication,
            @PathVariable Long appointmentId,
            @RequestBody Map<String, String> request
    ) {
        return ResponseEntity.ok(doctorCabinetService.completeAppointment(authentication, appointmentId, request));
    }

    @GetMapping("/slots")
    public ResponseEntity<List<SlotResponse>> getSlots(Authentication authentication) {
        return ResponseEntity.ok(doctorCabinetService.getSlots(authentication));
    }

    @PostMapping("/slots")
    public ResponseEntity<SlotResponse> createSlot(Authentication authentication, @Valid @RequestBody UpsertSlotRequest request) {
        return ResponseEntity.ok(doctorCabinetService.createSlot(authentication, request));
    }

    @PutMapping("/slots/{slotId}")
    public ResponseEntity<SlotResponse> updateSlot(
            Authentication authentication,
            @PathVariable Long slotId,
            @Valid @RequestBody UpsertSlotRequest request
    ) {
        return ResponseEntity.ok(doctorCabinetService.updateSlot(authentication, slotId, request));
    }

    @DeleteMapping("/slots/{slotId}")
    public ResponseEntity<Void> deleteSlot(Authentication authentication, @PathVariable Long slotId) {
        doctorCabinetService.deleteSlot(authentication, slotId);
        return ResponseEntity.noContent().build();
    }

    // Profile endpoints
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication authentication) {
        return ResponseEntity.ok(doctorCabinetService.getProfile(authentication));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(Authentication authentication, @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(doctorCabinetService.updateProfile(authentication, request));
    }

    @PostMapping("/profile/avatar")
    public ResponseEntity<?> uploadAvatar(
            Authentication authentication,
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(doctorCabinetService.uploadAvatar(authentication, request.get("avatarUrl")));
    }

    // Security endpoints
    @PostMapping("/security/change-password")
    public ResponseEntity<Void> changePassword(Authentication authentication, @RequestBody Map<String, String> request) {
        doctorCabinetService.changePassword(authentication, request.get("currentPassword"), request.get("newPassword"));
        return ResponseEntity.ok().build();
    }

    // Notifications endpoints
    @GetMapping("/notifications")
    public ResponseEntity<List<Map<String, Object>>> getNotifications(Authentication authentication) {
        return ResponseEntity.ok(doctorCabinetService.getNotifications(authentication));
    }

    @PatchMapping("/notifications/{notificationId}")
    public ResponseEntity<?> setNotificationRead(
            Authentication authentication,
            @PathVariable Long notificationId,
            @RequestParam boolean read) {
        return ResponseEntity.ok(doctorCabinetService.setNotificationRead(authentication, notificationId, read));
    }

    @DeleteMapping("/notifications/{notificationId}")
    public ResponseEntity<Void> deleteNotification(Authentication authentication, @PathVariable Long notificationId) {
        doctorCabinetService.deleteNotification(authentication, notificationId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/reviews")
    public ResponseEntity<List<ReviewResponse>> getMyReviews(Authentication authentication) {
        Long doctorId = doctorCabinetService.getDoctorId(authentication);
        return ResponseEntity.ok(reviewService.getReviewsByDoctorId(doctorId));
    }

    // Patient endpoints
    @GetMapping("/patients")
    public ResponseEntity<List<Map<String, Object>>> getMyPatients(Authentication authentication) {
        return ResponseEntity.ok(doctorCabinetService.getMyPatients(authentication));
    }

    @GetMapping("/patients/{patientId}")
    public ResponseEntity<Map<String, Object>> getPatientById(
            Authentication authentication,
            @PathVariable Long patientId) {
        return ResponseEntity.ok(doctorCabinetService.getPatientById(authentication, patientId));
    }

    @GetMapping("/patients/{patientId}/appointments")
    public ResponseEntity<List<AppointmentResponse>> getPatientAppointments(
            Authentication authentication,
            @PathVariable Long patientId) {
        return ResponseEntity.ok(doctorCabinetService.getPatientAppointments(authentication, patientId));
    }

    @GetMapping("/patients/{patientId}/records")
    public ResponseEntity<List<Map<String, Object>>> getPatientMedicalRecords(
            Authentication authentication,
            @PathVariable Long patientId) {
        return ResponseEntity.ok(doctorCabinetService.getPatientMedicalRecords(authentication, patientId));
    }
}
