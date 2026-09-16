package com.viste.school.service;

import com.viste.school.domain.StaffEntity;
import com.viste.school.domain.UserAccount;
import com.viste.school.dto.AuthUserDto;
import com.viste.school.dto.LoginRequest;
import com.viste.school.dto.LoginResponse;
import com.viste.school.dto.ProfileUpdateRequest;
import com.viste.school.repository.StaffRepository;
import com.viste.school.repository.UserAccountRepository;
import com.viste.school.security.AccountPrincipal;
import com.viste.school.security.JwtService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthAppService {

  private final AuthenticationManager authenticationManager;
  private final JwtService jwtService;
  private final UserAccountRepository users;
  private final StaffRepository staff;

  public AuthAppService(
      AuthenticationManager authenticationManager,
      JwtService jwtService,
      UserAccountRepository users,
      StaffRepository staff) {
    this.authenticationManager = authenticationManager;
    this.jwtService = jwtService;
    this.users = users;
    this.staff = staff;
  }

  public LoginResponse login(LoginRequest request) {
    Authentication auth =
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.email().trim().toLowerCase(), request.password()));
    AccountPrincipal principal = (AccountPrincipal) auth.getPrincipal();
    String token = jwtService.generateToken(principal);
    return LoginResponse.bearer(token, Mappers.toAuthUser(principal.getAccount()));
  }

  @Transactional
  public AuthUserDto updateProfile(String userId, ProfileUpdateRequest patch) {
    UserAccount user =
        users
            .findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

    if (patch.name() != null && !patch.name().isBlank()) {
      user.setName(patch.name().trim());
    }
    if (patch.email() != null && !patch.email().isBlank()) {
      user.setEmail(patch.email().trim().toLowerCase());
    }
    if (patch.phone() != null) {
      user.setPhone(blankToNull(patch.phone()));
    }
    if (patch.title() != null) {
      user.setTitle(blankToNull(patch.title()));
    }
    if (patch.department() != null) {
      user.setDepartment(blankToNull(patch.department()));
    }
    if (patch.employeeNumber() != null) {
      user.setEmployeeNumber(blankToNull(patch.employeeNumber()));
    }
    if (patch.bio() != null) {
      user.setBio(blankToNull(patch.bio()));
    }
    if (patch.preferredLanguage() != null) {
      user.setPreferredLanguage(patch.preferredLanguage());
    }
    if (patch.timezone() != null) {
      user.setTimezone(patch.timezone());
    }
    if (patch.avatarUrl() != null) {
      user.setAvatarUrl(blankToNull(patch.avatarUrl()));
    }
    if (patch.notificationPrefs() != null) {
      Map<String, Boolean> prefs = patch.notificationPrefs();
      if (prefs.containsKey("email")) {
        user.setNotifyEmail(Boolean.TRUE.equals(prefs.get("email")));
      }
      if (prefs.containsKey("sms")) {
        user.setNotifySms(Boolean.TRUE.equals(prefs.get("sms")));
      }
      if (prefs.containsKey("inApp")) {
        user.setNotifyInApp(Boolean.TRUE.equals(prefs.get("inApp")));
      }
    }

    if (user.getStaffId() != null) {
      staff
          .findById(user.getStaffId())
          .ifPresent(
              member -> syncStaff(member, user));
    }

    return Mappers.toAuthUser(users.save(user));
  }

  private void syncStaff(StaffEntity member, UserAccount user) {
    String[] parts = user.getName().trim().split("\\s+", 2);
    member.setFirstName(parts[0]);
    member.setLastName(parts.length > 1 ? parts[1] : member.getLastName());
    member.setEmail(user.getEmail());
    if (user.getPhone() != null) {
      member.setPhone(user.getPhone());
    }
    if (user.getTitle() != null) {
      member.setTitle(user.getTitle());
    }
    if (user.getDepartment() != null) {
      member.setDepartment(user.getDepartment());
    }
    if (user.getEmployeeNumber() != null) {
      member.setEmployeeNumber(user.getEmployeeNumber());
    }
    member.setPhotoUrl(user.getAvatarUrl());
    staff.save(member);
  }

  private static String blankToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
