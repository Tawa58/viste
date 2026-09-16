package com.viste.school.dto;

import java.util.Map;

public record ProfileUpdateRequest(
    String name,
    String email,
    String phone,
    String title,
    String department,
    String employeeNumber,
    String bio,
    String preferredLanguage,
    String timezone,
    String avatarUrl,
    Map<String, Boolean> notificationPrefs
) {}
