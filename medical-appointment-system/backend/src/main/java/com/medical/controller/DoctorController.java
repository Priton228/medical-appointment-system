package com.medical.controller;

import com.medical.dto.common.AppointmentResponse;
import com.medical.dto.common.SlotResponse;
import com.medical.dto.doctor.DoctorDashboardResponse;
import com.medical.dto.doctor.RescheduleAppointmentRequest;
import com.medical.dto.doctor.UpdateAppointmentStatusRequest;
import com.medical.dto.doctor.UpsertSlotRequest;
import com.medical.service.DoctorCabinetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctor")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('DOCTOR')")
public class DoctorController {

    private final DoctorCabinetService doctorCabinetService;

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
}
