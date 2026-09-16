package com.viste.school.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final SecretKey key;
  private final long expirationMs;

  public JwtService(
      @Value("${viste.jwt.secret}") String secret,
      @Value("${viste.jwt.expiration-ms}") long expirationMs) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expirationMs = expirationMs;
  }

  public String generateToken(AccountPrincipal principal) {
    Date now = new Date();
    Date exp = new Date(now.getTime() + expirationMs);
    return Jwts.builder()
        .subject(principal.getUsername())
        .claim("uid", principal.getAccount().getId())
        .claim("role", principal.getAccount().getRole().name())
        .issuedAt(now)
        .expiration(exp)
        .signWith(key)
        .compact();
  }

  public String extractUsername(String token) {
    return parse(token).getSubject();
  }

  public boolean isValid(String token, AccountPrincipal principal) {
    String username = extractUsername(token);
    return username.equalsIgnoreCase(principal.getUsername()) && !isExpired(token);
  }

  private boolean isExpired(String token) {
    return parse(token).getExpiration().before(new Date());
  }

  private Claims parse(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
  }
}
