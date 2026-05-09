package com.medical.repository;

import com.medical.entity.Appointment;
import com.medical.entity.Doctor;
import com.medical.entity.RescheduleRequest;
import com.medical.entity.RescheduleRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RescheduleRequestRepository extends JpaRepository<RescheduleRequest, Long> {

    List<RescheduleRequest> findByStatusOrderByCreatedAtDesc(RescheduleRequestStatus status);

    List<RescheduleRequest> findByRequestedByDoctorOrderByCreatedAtDesc(Doctor doctor);

    List<RescheduleRequest> findByAppointmentOrderByCreatedAtDesc(Appointment appointment);

    Optional<RescheduleRequest> findByAppointmentAndStatus(Appointment appointment, RescheduleRequestStatus status);

    long countByStatus(RescheduleRequestStatus status);

    @Query("SELECT r FROM RescheduleRequest r JOIN FETCH r.appointment a JOIN FETCH a.patient p JOIN FETCH p.user JOIN FETCH a.doctor d JOIN FETCH d.user JOIN FETCH r.requestedByDoctor rd JOIN FETCH rd.user WHERE r.id = :id")
    Optional<RescheduleRequest> findByIdWithAppointment(@Param("id") Long id);
}
