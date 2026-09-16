package com.viste.school.security;

import com.viste.school.repository.UserAccountRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class AccountUserDetailsService implements UserDetailsService {

  private final UserAccountRepository users;

  public AccountUserDetailsService(UserAccountRepository users) {
    this.users = users;
  }

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    return users
        .findByEmailIgnoreCase(username)
        .map(AccountPrincipal::new)
        .orElseThrow(() -> new UsernameNotFoundException("User not found"));
  }
}
