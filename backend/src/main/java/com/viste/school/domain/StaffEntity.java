package com.viste.school.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "staff_members")
public class StaffEntity {

  @Id
  private String id;

  @Column(nullable = false, unique = true)
  private String employeeNumber;

  @Column(nullable = false)
  private String firstName;

  @Column(nullable = false)
  private String lastName;

  @Column(nullable = false, unique = true)
  private String email;

  private String phone;
  private String department;
  private String title;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private StaffStatus status = StaffStatus.ACTIVE;

  private LocalDate hireDate;

  @Lob
  @Column(columnDefinition = "CLOB")
  private String photoUrl;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "staff_subjects", joinColumns = @JoinColumn(name = "staff_id"))
  @Column(name = "subject_id")
  private List<String> subjectIds = new ArrayList<>();

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "staff_classes", joinColumns = @JoinColumn(name = "staff_id"))
  @Column(name = "class_id")
  private List<String> classIds = new ArrayList<>();

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getEmployeeNumber() {
    return employeeNumber;
  }

  public void setEmployeeNumber(String employeeNumber) {
    this.employeeNumber = employeeNumber;
  }

  public String getFirstName() {
    return firstName;
  }

  public void setFirstName(String firstName) {
    this.firstName = firstName;
  }

  public String getLastName() {
    return lastName;
  }

  public void setLastName(String lastName) {
    this.lastName = lastName;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getDepartment() {
    return department;
  }

  public void setDepartment(String department) {
    this.department = department;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public StaffStatus getStatus() {
    return status;
  }

  public void setStatus(StaffStatus status) {
    this.status = status;
  }

  public LocalDate getHireDate() {
    return hireDate;
  }

  public void setHireDate(LocalDate hireDate) {
    this.hireDate = hireDate;
  }

  public String getPhotoUrl() {
    return photoUrl;
  }

  public void setPhotoUrl(String photoUrl) {
    this.photoUrl = photoUrl;
  }

  public List<String> getSubjectIds() {
    return subjectIds;
  }

  public void setSubjectIds(List<String> subjectIds) {
    this.subjectIds = subjectIds;
  }

  public List<String> getClassIds() {
    return classIds;
  }

  public void setClassIds(List<String> classIds) {
    this.classIds = classIds;
  }
}
