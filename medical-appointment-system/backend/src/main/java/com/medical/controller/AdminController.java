package com.medical.controller;

import com.medical.dto.admin.AdminDashboardResponse;
import com.medical.dto.admin.AdminProfileResponse;
import com.medical.dto.admin.StatisticsResponse;
import com.medical.dto.admin.SystemStatusResponse;
import com.medical.dto.admin.UpdateAdminProfileRequest;
import com.medical.dto.admin.UpdateUserRequest;
import com.medical.dto.admin.UpsertDoctorRequest;
import com.medical.dto.admin.UpsertSpecializationRequest;
import com.medical.dto.admin.UpsertSymptomRequest;
import com.medical.dto.admin.UserResponse;
import com.medical.dto.common.SpecializationDetailResponse;
import com.medical.dto.common.AppointmentResponse;
import com.medical.dto.common.DoctorResponse;
import com.medical.dto.common.RescheduleRequestResponse;
import com.medical.dto.common.SpecializationResponse;
import com.medical.dto.common.SlotResponse;
import com.medical.dto.common.SymptomResponse;
import com.medical.dto.doctor.RescheduleAppointmentRequest;
import com.medical.dto.doctor.UpdateAppointmentStatusRequest;
import com.medical.dto.doctor.UpsertSlotRequest;
import com.medical.dto.patient.ReviewResponse;
import com.medical.entity.Role;
import com.medical.entity.User;
import com.medical.exception.BusinessException;
import com.medical.repository.UserRepository;
import com.medical.service.AdminCabinetService;
import com.medical.service.ReviewService;
import com.medical.service.SystemStatusService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminController {

    private final AdminCabinetService adminCabinetService;
    private final ReviewService reviewService;
    private final UserRepository userRepository;
    private final SystemStatusService systemStatusService;

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardResponse> getDashboard() {
        return ResponseEntity.ok(adminCabinetService.getDashboard());
    }

    @GetMapping("/statistics")
    public ResponseEntity<StatisticsResponse> getStatistics() {
        return ResponseEntity.ok(adminCabinetService.getStatistics());
    }

    @GetMapping("/doctors")
    public ResponseEntity<List<DoctorResponse>> getDoctors() {
        return ResponseEntity.ok(adminCabinetService.getDoctors());
    }

    @GetMapping("/specializations")
    public ResponseEntity<List<SpecializationResponse>> getSpecializations() {
        return ResponseEntity.ok(adminCabinetService.getSpecializations());
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role
    ) {
        return ResponseEntity.ok(adminCabinetService.getUsers(search, role));
    }

    @PutMapping("/users/{userId}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long userId, @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(adminCabinetService.updateUser(userId, request));
    }

    @PatchMapping("/users/{userId}/block")
    public ResponseEntity<UserResponse> setUserBlocked(@PathVariable Long userId, @RequestParam boolean blocked) {
        return ResponseEntity.ok(adminCabinetService.setUserBlocked(userId, blocked));
    }

    @PostMapping("/users/{userId}/avatar")
    public ResponseEntity<UserResponse> updateUserAvatar(@PathVariable Long userId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminCabinetService.updateUserAvatar(userId, body.get("avatarUrl")));
    }

    @GetMapping("/patients")
    public ResponseEntity<List<Map<String, Object>>> getAllPatients() {
        return ResponseEntity.ok(adminCabinetService.getAllPatients());
    }

    @GetMapping("/patients/{patientId}")
    public ResponseEntity<Map<String, Object>> getPatientById(@PathVariable Long patientId) {
        return ResponseEntity.ok(adminCabinetService.getPatientById(patientId));
    }

    @GetMapping("/patients/{patientId}/appointments")
    public ResponseEntity<List<AppointmentResponse>> getPatientAppointments(@PathVariable Long patientId) {
        return ResponseEntity.ok(adminCabinetService.getPatientAppointments(patientId));
    }

    @GetMapping("/patients/{patientId}/records")
    public ResponseEntity<List<Map<String, Object>>> getPatientMedicalRecords(@PathVariable Long patientId) {
        return ResponseEntity.ok(adminCabinetService.getPatientMedicalRecords(patientId));
    }

    @PostMapping("/doctors")
    public ResponseEntity<DoctorResponse> createDoctor(@Valid @RequestBody UpsertDoctorRequest request) {
        return ResponseEntity.ok(adminCabinetService.createDoctor(request));
    }

    @PutMapping("/doctors/{doctorId}")
    public ResponseEntity<DoctorResponse> updateDoctor(@PathVariable Long doctorId, @Valid @RequestBody UpsertDoctorRequest request) {
        return ResponseEntity.ok(adminCabinetService.updateDoctor(doctorId, request));
    }

    @DeleteMapping("/doctors/{doctorId}")
    public ResponseEntity<Void> deleteDoctor(@PathVariable Long doctorId) {
        adminCabinetService.deleteDoctor(doctorId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/symptoms")
    public ResponseEntity<List<SymptomResponse>> getSymptoms(@RequestParam(required = false) String query) {
        return ResponseEntity.ok(adminCabinetService.getSymptoms(query));
    }

    @PostMapping("/symptoms")
    public ResponseEntity<SymptomResponse> createSymptom(@Valid @RequestBody UpsertSymptomRequest request) {
        return ResponseEntity.ok(adminCabinetService.createSymptom(request));
    }

    @PutMapping("/symptoms/{symptomId}")
    public ResponseEntity<SymptomResponse> updateSymptom(
            @PathVariable Long symptomId,
            @Valid @RequestBody UpsertSymptomRequest request
    ) {
        return ResponseEntity.ok(adminCabinetService.updateSymptom(symptomId, request));
    }

    @DeleteMapping("/symptoms/{symptomId}")
    public ResponseEntity<Void> deleteSymptom(@PathVariable Long symptomId) {
        adminCabinetService.deleteSymptom(symptomId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/doctors/{doctorId}/schedule")
    public ResponseEntity<List<SlotResponse>> getDoctorSchedule(@PathVariable Long doctorId) {
        return ResponseEntity.ok(adminCabinetService.getDoctorSchedule(doctorId));
    }

    @GetMapping("/appointments")
    public ResponseEntity<List<AppointmentResponse>> getAllAppointments() {
        return ResponseEntity.ok(adminCabinetService.getAllAppointments());
    }

    @PatchMapping("/appointments/{appointmentId}/status")
    public ResponseEntity<AppointmentResponse> updateAppointmentStatus(
            @PathVariable Long appointmentId,
            @Valid @RequestBody UpdateAppointmentStatusRequest request
    ) {
        return ResponseEntity.ok(adminCabinetService.updateAppointmentStatus(appointmentId, request));
    }

    @PatchMapping("/appointments/{appointmentId}/reschedule")
    public ResponseEntity<AppointmentResponse> rescheduleAppointment(
            @PathVariable Long appointmentId,
            @Valid @RequestBody RescheduleAppointmentRequest request
    ) {
        return ResponseEntity.ok(adminCabinetService.rescheduleAppointment(appointmentId, request));
    }

    @GetMapping("/specializations/{id}")
    public ResponseEntity<SpecializationDetailResponse> getSpecializationDetail(@PathVariable Long id) {
        return ResponseEntity.ok(adminCabinetService.getSpecializationDetail(id));
    }

    @PostMapping("/specializations")
    public ResponseEntity<SpecializationDetailResponse> createSpecialization(
            @Valid @RequestBody UpsertSpecializationRequest request
    ) {
        return ResponseEntity.ok(adminCabinetService.createSpecialization(request));
    }

    @PutMapping("/specializations/{id}")
    public ResponseEntity<SpecializationDetailResponse> updateSpecialization(
            @PathVariable Long id,
            @Valid @RequestBody UpsertSpecializationRequest request
    ) {
        return ResponseEntity.ok(adminCabinetService.updateSpecialization(id, request));
    }

    @DeleteMapping("/specializations/{id}")
    public ResponseEntity<Void> deleteSpecialization(@PathVariable Long id) {
        adminCabinetService.deleteSpecialization(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/reviews")
    public ResponseEntity<List<ReviewResponse>> getAllReviews() {
        return ResponseEntity.ok(reviewService.getAllReviews());
    }

    @GetMapping("/appointments/{appointmentId}/review")
    public ResponseEntity<ReviewResponse> getReviewByAppointment(@PathVariable Long appointmentId) {
        ReviewResponse review = reviewService.getReviewByAppointmentId(appointmentId);
        return ResponseEntity.ok(review);
    }

    // Reschedule request endpoints
    @GetMapping("/reschedule-requests")
    public ResponseEntity<List<RescheduleRequestResponse>> getRescheduleRequests(
            @RequestParam(required = false, defaultValue = "all") String filter
    ) {
        if ("pending".equalsIgnoreCase(filter)) {
            return ResponseEntity.ok(adminCabinetService.getPendingRescheduleRequests());
        }
        return ResponseEntity.ok(adminCabinetService.getAllRescheduleRequests());
    }

    @PostMapping("/reschedule-requests/{requestId}/approve")
    public ResponseEntity<RescheduleRequestResponse> approveRescheduleRequest(
            @PathVariable Long requestId,
            Authentication authentication
    ) {
        Long adminUserId = resolveCurrentAdminUserId(authentication);
        return ResponseEntity.ok(adminCabinetService.approveRescheduleRequest(requestId, adminUserId));
    }

    @PostMapping("/reschedule-requests/{requestId}/reject")
    public ResponseEntity<RescheduleRequestResponse> rejectRescheduleRequest(
            @PathVariable Long requestId,
            Authentication authentication,
            @RequestParam(required = false) String comment
    ) {
        Long adminUserId = resolveCurrentAdminUserId(authentication);
        return ResponseEntity.ok(adminCabinetService.rejectRescheduleRequest(requestId, adminUserId, comment));
    }

    private Long resolveCurrentAdminUserId(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        if (principal instanceof User user) {
            return user.getId();
        }
        if (principal instanceof UserDetails userDetails) {
            return userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND"))
                    .getId();
        }
        throw new BusinessException("Invalid authentication", "INVALID_AUTH");
    }

    // Admin slot management endpoints
    @PostMapping("/doctors/{doctorId}/slots")
    public ResponseEntity<SlotResponse> createSlotForDoctor(
            @PathVariable Long doctorId,
            @Valid @RequestBody UpsertSlotRequest request
    ) {
        return ResponseEntity.ok(adminCabinetService.createSlotForDoctor(doctorId, request));
    }

    @PutMapping("/slots/{slotId}")
    public ResponseEntity<SlotResponse> updateSlot(
            @PathVariable Long slotId,
            @Valid @RequestBody UpsertSlotRequest request
    ) {
        return ResponseEntity.ok(adminCabinetService.updateSlot(slotId, request));
    }

    @DeleteMapping("/slots/{slotId}")
    public ResponseEntity<Void> deleteSlot(@PathVariable Long slotId) {
        adminCabinetService.deleteSlot(slotId);
        return ResponseEntity.noContent().build();
    }

    // ===== System status =====
    @GetMapping("/system/status")
    public ResponseEntity<SystemStatusResponse> getSystemStatus() {
        return ResponseEntity.ok(systemStatusService.getStatus());
    }

    // ===== Admin profile =====
    @GetMapping("/profile")
    public ResponseEntity<AdminProfileResponse> getProfile(Authentication authentication) {
        return ResponseEntity.ok(adminCabinetService.getAdminProfile(authentication));
    }

    @PutMapping("/profile")
    public ResponseEntity<AdminProfileResponse> updateProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateAdminProfileRequest request
    ) {
        return ResponseEntity.ok(adminCabinetService.updateAdminProfile(authentication, request));
    }

    @PostMapping("/profile/avatar")
    public ResponseEntity<AdminProfileResponse> uploadAvatar(
            Authentication authentication,
            @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(adminCabinetService.uploadAdminAvatar(authentication, body.get("avatarUrl")));
    }

    @PostMapping("/security/change-password")
    public ResponseEntity<Void> changePassword(
            Authentication authentication,
            @RequestBody Map<String, String> body
    ) {
        adminCabinetService.changeAdminPassword(
                authentication,
                body.get("currentPassword"),
                body.get("newPassword")
        );
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/system/clear-cache")
    public ResponseEntity<String> clearCache() {
        return ResponseEntity.ok(systemStatusService.clearAllCaches());
    }
}
