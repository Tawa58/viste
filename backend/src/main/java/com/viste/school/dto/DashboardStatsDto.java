package com.viste.school.dto;

public record DashboardStatsDto(
    long totalStudents,
    long totalTeachers,
    int todayAttendancePct,
    double outstandingFees,
    double feesCollected,
    int pendingResults
) {}
