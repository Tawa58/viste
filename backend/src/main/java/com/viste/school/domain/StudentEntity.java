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
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "students")
public class StudentEntity {

  @Id
  private String id;

  @Column(nullable = false, unique = true)
  private String studentNumber;

  @Column(nullable = false, unique = true)
  private String admissionNumber;

  @Column(nullable = false)
  private String firstName;

  private String middleName;

  @Column(nullable = false)
  private String lastName;

  private LocalDate dateOfBirth;
  private String gender;
  private String email;
  private String phone;

  @Column(nullable = false)
  private String address;

  private LocalDate admissionDate;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private StudentStatus status = StudentStatus.ACTIVE;

  private String classId;
  private String streamId;

  @ElementCollection(fetch = FetchType.EAGER)
  @CollectionTable(name = "student_guardians", joinColumns = @JoinColumn(name = "student_id"))
  @Column(name = "guardian_id")
  private List<String> guardianIds = new ArrayList<>();

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getStudentNumber() {
    return studentNumber;
  }

  public void setStudentNumber(String studentNumber) {
    this.studentNumber = studentNumber;
  }

  public String getAdmissionNumber() {
    return admissionNumber;
  }

  public void setAdmissionNumber(String admissionNumber) {
    this.admissionNumber = admissionNumber;
  }

  public String getFirstName() {
    return firstName;
  }

  public void setFirstName(String firstName) {
    this.firstName = firstName;
  }

  public String getMiddleName() {
    return middleName;
  }

  public void setMiddleName(String middleName) {
    this.middleName = middleName;
  }

  public String getLastName() {
    return lastName;
  }

  public void setLastName(String lastName) {
    this.lastName = lastName;
  }

  public LocalDate getDateOfBirth() {
    return dateOfBirth;
  }

  public void setDateOfBirth(LocalDate dateOfBirth) {
    this.dateOfBirth = dateOfBirth;
  }

  public String getGender() {
    return gender;
  }

  public void setGender(String gender) {
    this.gender = gender;
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

  public String getAddress() {
    return address;
  }

  public void setAddress(String address) {
    this.address = address;
  }

  public LocalDate getAdmissionDate() {
    return admissionDate;
  }

  public void setAdmissionDate(LocalDate admissionDate) {
    this.admissionDate = admissionDate;
  }

  public StudentStatus getStatus() {
    return status;
  }

  public void setStatus(StudentStatus status) {
    this.status = status;
  }

  public String getClassId() {
    return classId;
  }

  public void setClassId(String classId) {
    this.classId = classId;
  }

  public String getStreamId() {
    return streamId;
  }

  public void setStreamId(String streamId) {
    this.streamId = streamId;
  }

  public List<String> getGuardianIds() {
    return guardianIds;
  }

  public void setGuardianIds(List<String> guardianIds) {
    this.guardianIds = guardianIds;
  }
}
