package com.medical.service.strategies;

import com.medical.entity.Specialization;
import com.medical.entity.Symptom;
import java.util.List;

public interface RecommendationStrategy {
    List<Specialization> recommendSpecializations(List<Symptom> symptoms);
    double calculateMatchScore(List<Symptom> symptoms, Specialization specialization);
}