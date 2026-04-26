package com.medical.repository;

import com.medical.entity.Symptom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SymptomRepository extends JpaRepository<Symptom, Long> {
    boolean existsByNameIgnoreCase(String name);
    List<Symptom> findByNameContainingIgnoreCaseOrderByNameAsc(String query);
    List<Symptom> findAllByOrderByNameAsc();
}
