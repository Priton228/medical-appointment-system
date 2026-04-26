package com.medical.entity;

public enum AppointmentStatus {
    SCHEDULED,
    CONFIRMED,
    /** Запись перенесена на другой слот (время/врач) */
    RESCHEDULED,
    COMPLETED,
    CANCELLED,
    MISSED
}
