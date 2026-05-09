package com.medical.dto.admin;

import java.util.List;
import java.util.Map;

public record StatisticsResponse(
    KpiStatistics kpis,
    List<MonthlyAppointments> monthlyAppointments,
    List<StatusDistribution> statusDistribution,
    List<Integer> weeklyTrend,
    List<SpecializationStats> specializations,
    List<TopDoctor> topDoctors
) {
    public record KpiStatistics(
        long totalAppointments,
        long totalPatients,
        double averageRating,
        long todayAppointments,
        long freeSlotsToday
    ) {}

    public record MonthlyAppointments(
        String month,
        long completed,
        long cancelled,
        long scheduled
    ) {}

    public record StatusDistribution(
        String status,
        long count,
        int percent,
        String color,
        String darkColor
    ) {}

    public record SpecializationStats(
        String name,
        long count,
        String color
    ) {}

    public record TopDoctor(
        String name,
        double rating,
        long appointments
    ) {}
}
