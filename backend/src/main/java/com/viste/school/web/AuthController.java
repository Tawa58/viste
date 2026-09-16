package com.viste.school.web;

import com.viste.school.dto.AuthUserDto;
import com.viste.school.dto.LoginRequest;
import com.viste.school.dto.LoginResponse;
import com.viste.school.dto.ProfileUpdateRequest;
import com.viste.school.security.AccountPrincipal;
import com.viste.school.service.AuthAppService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AuthController {

  private final AuthAppService authAppService;

  public AuthController(AuthAppService authAppService) {
    this.authAppService = authAppService;
  }

  @GetMapping("/health")
  public Map<String, Object> health() {
    return Map.of("status", "UP", "service", "viste-school-api");
  }

  @PostMapping("/auth/login")
  public LoginResponse login(@Valid @RequestBody LoginRequest request) {
    return authAppService.login(request);
  }

  @PostMapping("/auth/logout")
  public ResponseEntity<Void> logout() {
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/auth/me")
  public AuthUserDto me(@AuthenticationPrincipal AccountPrincipal principal) {
    return com.viste.school.service.Mappers.toAuthUser(principal.getAccount());
  }

  @PatchMapping("/auth/profile")
  public AuthUserDto updateProfile(
      @AuthenticationPrincipal AccountPrincipal principal,
      @RequestBody ProfileUpdateRequest request) {
    return authAppService.updateProfile(principal.getAccount().getId(), request);
  }
}
