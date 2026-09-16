package com.viste.school.service;

import com.viste.school.domain.StaffEntity;
import com.viste.school.domain.StudentEntity;
import com.viste.school.domain.UserAccount;
import com.viste.school.dto.AuthUserDto;
import com.viste.school.dto.StaffDto;
import com.viste.school.dto.StudentDto;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class Mappers {

  private Mappers() {}

  public static AuthUserDto toAuthUser(UserAccount user) {
    Map<String, Boolean> prefs = new HashMap<>();
    prefs.put("email", user.isNotifyEmail());
    prefs.put("sms", user.isNotifySms());
    prefs.put("inApp", user.isNotifyInApp());
    return new AuthUserDto(
        user.getId(),
        user.getName(),
        user.getEmail(),
        user.getRole(),
        user.getAvatarUrl(),
        user.getPhone(),
        user.getTitle(),
        user.getDepartment(),
        user.getEmployeeNumber(),
        user.getStaffId(),
        user.getStudentId(),
        user.getGuardianId(),
        user.getBio(),
        user.getPreferredLanguage(),
        user.getTimezone(),
        prefs);
  }

  public static StudentDto toStudent(StudentEntity s) {
    return new StudentDto(
        s.getId(),
        s.getStudentNumber(),
        s.getAdmissionNumber(),
        s.getFirstName(),
        s.getMiddleName(),
        s.getLastName(),
        s.getDateOfBirth() == null ? null : s.getDateOfBirth().toString(),
        s.getGender(),
        s.getEmail(),
        s.getPhone(),
        s.getAddress(),
        s.getAdmissionDate() == null ? null : s.getAdmissionDate().toString(),
        s.getStatus(),
        s.getClassId(),
        s.getStreamId(),
        List.copyOf(s.getGuardianIds()));
  }

  public static StaffDto toStaff(StaffEntity s) {
    return new StaffDto(
        s.getId(),
        s.getEmployeeNumber(),
        s.getFirstName(),
        s.getLastName(),
        s.getEmail(),
        s.getPhone(),
        s.getDepartment(),
        s.getTitle(),
        s.getStatus(),
        List.copyOf(s.getSubjectIds()),
        List.copyOf(s.getClassIds()),
        s.getHireDate() == null ? null : s.getHireDate().toString(),
        s.getPhotoUrl());
  }
}
