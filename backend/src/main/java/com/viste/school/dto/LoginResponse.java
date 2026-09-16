package com.viste.school.dto;

public record LoginResponse(String accessToken, String tokenType, AuthUserDto user) {
  public static LoginResponse bearer(String token, AuthUserDto user) {
    return new LoginResponse(token, "Bearer", user);
  }
}
