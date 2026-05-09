package com.medical.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "appointments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "slot_id", nullable = false, unique = true)
    private Slot slot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AppointmentStatus status = AppointmentStatus.SCHEDULED;

    @Column(name = "symptoms_description", length = 1000)
    private String symptomsDescription;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "appointment_reported_symptoms",
            joinColumns = @JoinColumn(name = "appointment_id"),
            inverseJoinColumns = @JoinColumn(name = "symptom_id")
    )
    @Builder.Default
    private Set<Symptom> reportedSymptoms = new HashSet<>();

    /** Показания / объективный статус (заполняет врач при завершении приёма) */
    @Column(name = "doctor_notes", length = 2000)
    private String doctorNotes;

    @Column(length = 1000)
    private String diagnosis;

    @Column(name = "treatment_recommendations", length = 2000)
    private String treatmentRecommendations;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Column(name = "cancelled_by")
    private String cancelledBy;

    private Integer rating;

    @Column(length = 500)
    private String review;

    @Column(name = "calendar_event_id")
    private String calendarEventId;

    @Column(name = "reminder_sent_at")
    private LocalDateTime reminderSentAt;
}
