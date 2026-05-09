package com.medical.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "slots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Slot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "is_booked", nullable = false)
    @Builder.Default
    private Boolean isBooked = false;

    @Column(name = "is_blocked", nullable = false)
    @Builder.Default
    private Boolean isBlocked = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booked_by_patient_id")
    private Patient bookedByPatient;

    @Column(name = "booked_at")
    private LocalDateTime bookedAt;
}
