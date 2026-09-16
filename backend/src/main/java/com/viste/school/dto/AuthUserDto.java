package com.viste.school.dto;

import com.viste.school.domain.UserRole;
import java.util.Map;

public record AuthUserDto(
    String id,
    String name,
    String email,
    UserRole role,
    String avatarUrl,
    String phone,
    String title,
    String department,
    String employeeNumber,
    String staffId,
    String studentId,
    String guardianId,
    String bio,
    String preferredLanguage,
    String timezone,
    Map<String, Boolean> notificationPrefs
) {}
