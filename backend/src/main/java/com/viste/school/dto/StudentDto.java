package com.viste.school.dto;

import com.viste.school.domain.StudentStatus;
import java.util.List;

public record StudentDto(
    String id,
    String studentNumber,
    String admissionNumber,
    String firstName,
    String middleName,
    String lastName,
    String dateOfBirth,
    String gender,
    String email,
    String phone,
    String address,
    String admissionDate,
    StudentStatus status,
    String classId,
    String streamId,
    List<String> guardianIds
) {}
