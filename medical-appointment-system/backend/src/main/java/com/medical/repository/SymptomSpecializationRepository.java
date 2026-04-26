package com.medical.repository;

import com.medical.entity.SymptomSpecialization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SymptomSpecializationRepository extends JpaRepository<SymptomSpecialization, Long> {

    @Query("SELECT ss FROM SymptomSpecialization ss WHERE ss.symptom.id IN :symptomIds")
    List<SymptomSpecialization> findAllBySymptomIds(@Param("symptomIds") List<Long> symptomIds);
}