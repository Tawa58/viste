package com.viste.school.dto;

import com.viste.school.domain.StaffStatus;
import java.util.List;

public record StaffDto(
    String id,
    String employeeNumber,
    String firstName,
    String lastName,
    String email,
    String phone,
    String department,
    String title,
    StaffStatus status,
    List<String> subjectIds,
    List<String> classIds,
    String hireDate,
    String photoUrl
) {}
