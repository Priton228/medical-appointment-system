package com.medical.controller;

import com.medical.dto.admin.AdminDashboardResponse;
import com.medical.dto.admin.UpdateUserRequest;
import com.medical.dto.admin.UpsertDoctorRequest;
import com.medical.dto.admin.UpsertSymptomRequest;
import com.medical.dto.admin.UserResponse;
import com.medical.dto.common.AppointmentResponse;
import com.medical.dto.common.DoctorResponse;
import com.medical.dto.common.SpecializationResponse;
import com.medical.dto.common.SlotResponse;
import com.medical.dto.common.SymptomResponse;
import com.medical.dto.doctor.RescheduleAppointmentRequest;
import com.medical.dto.doctor.UpdateAppointmentStatusRequest;
import com.medical.entity.Role;
import com.medical.service.AdminCabinetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ADMIN')")
public class AdminController {

    private final AdminCabinetService adminCabinetService;

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardResponse> getDashboard() {
        return ResponseEntity.ok(adminCabinetService.getDashboard());
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
}
