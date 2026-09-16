package com.viste.school.service;

import com.viste.school.domain.StaffEntity;
import com.viste.school.domain.StaffStatus;
import com.viste.school.domain.StudentStatus;
import com.viste.school.dto.DashboardStatsDto;
import com.viste.school.dto.StaffDto;
import com.viste.school.dto.StudentDto;
import com.viste.school.repository.StaffRepository;
import com.viste.school.repository.StudentRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SchoolDataService {

  private final StudentRepository students;
  private final StaffRepository staff;

  public SchoolDataService(StudentRepository students, StaffRepository staff) {
    this.students = students;
    this.staff = staff;
  }

  public List<StudentDto> listStudents() {
    return students.findAll().stream().map(Mappers::toStudent).toList();
  }

  public StudentDto getStudent(String id) {
    return students
        .findById(id)
        .map(Mappers::toStudent)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));
  }

  public List<StaffDto> listStaff() {
    return staff.findAll().stream().map(Mappers::toStaff).toList();
  }

  public StaffDto getStaff(String id) {
    return staff
        .findById(id)
        .map(Mappers::toStaff)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Staff not found"));
  }

  @Transactional
  public StaffDto createStaff(StaffDto input) {
    StaffEntity entity = new StaffEntity();
    entity.setId("st-" + UUID.randomUUID().toString().substring(0, 8));
    entity.setEmployeeNumber(input.employeeNumber());
    entity.setFirstName(input.firstName());
    entity.setLastName(input.lastName());
    entity.setEmail(input.email().toLowerCase());
    entity.setPhone(input.phone());
    entity.setDepartment(input.department());
    entity.setTitle(input.title());
    entity.setStatus(input.status() == null ? StaffStatus.ACTIVE : input.status());
    entity.setHireDate(
        input.hireDate() == null || input.hireDate().isBlank()
            ? LocalDate.now()
            : LocalDate.parse(input.hireDate()));
    entity.setPhotoUrl(input.photoUrl());
    if (input.subjectIds() != null) {
      entity.setSubjectIds(input.subjectIds());
    }
    if (input.classIds() != null) {
      entity.setClassIds(input.classIds());
    }
    return Mappers.toStaff(staff.save(entity));
  }

  @Transactional
  public StaffDto updateStaffPhoto(String id, String photoUrl) {
    StaffEntity entity =
        staff
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Staff not found"));
    entity.setPhotoUrl(photoUrl == null || photoUrl.isBlank() ? null : photoUrl);
    return Mappers.toStaff(staff.save(entity));
  }

  public DashboardStatsDto stats() {
    long totalStudents =
        students.findAll().stream().filter(s -> s.getStatus() == StudentStatus.ACTIVE).count();
    long totalTeachers = staff.countByStatus(StaffStatus.ACTIVE);
    return new DashboardStatsDto(totalStudents, totalTeachers, 94, 11770, 9470, 2);
  }

  public List<Map<String, Object>> enrollmentTrend() {
    return List.of(
        Map.of("month", "Apr", "students", 620),
        Map.of("month", "May", "students", 635),
        Map.of("month", "Jun", "students", 648),
        Map.of("month", "Jul", "students", 655),
        Map.of("month", "Aug", "students", 662),
        Map.of("month", "Sep", "students", totalStudentsSafe()));
  }

  public List<Map<String, Object>> attendanceOverview() {
    return List.of(
        Map.of("name", "Present", "value", 88),
        Map.of("name", "Late", "value", 6),
        Map.of("name", "Absent", "value", 4),
        Map.of("name", "Excused", "value", 2));
  }

  public List<Map<String, Object>> feeCollection() {
    return List.of(
        Map.of("month", "Jun", "collected", 8200, "outstanding", 4100),
        Map.of("month", "Jul", "collected", 9100, "outstanding", 3600),
        Map.of("month", "Aug", "collected", 8800, "outstanding", 3900),
        Map.of("month", "Sep", "collected", 9470, "outstanding", 11770));
  }

  public List<Map<String, Object>> performance() {
    return List.of(
        Map.of("subject", "Math", "average", 78),
        Map.of("subject", "English", "average", 81),
        Map.of("subject", "Science", "average", 74),
        Map.of("subject", "History", "average", 69),
        Map.of("subject", "CS", "average", 85));
  }

  public List<Map<String, Object>> recentPayments() {
    return List.of(
        Map.of(
            "id",
            "pay-1",
            "receiptNumber",
            "RCPT-9044",
            "amount",
            1000,
            "method",
            "Card",
            "status",
            "CONFIRMED",
            "paidAt",
            "2026-02-02T14:05:00"),
        Map.of(
            "id",
            "pay-2",
            "receiptNumber",
            "RCPT-9031",
            "amount",
            450,
            "method",
            "Cash",
            "status",
            "CONFIRMED",
            "paidAt",
            "2026-01-28T10:12:00"));
  }

  public List<Map<String, Object>> recentActivities() {
    return List.of(
        Map.of(
            "id",
            "ra-1",
            "title",
            "Payment confirmed",
            "detail",
            "Leo Ndlovu · RCPT-9044 · $1,000",
            "at",
            "2026-02-02T14:05:00"),
        Map.of(
            "id",
            "ra-2",
            "title",
            "Attendance recorded",
            "detail",
            "Form 3A Mathematics · 32 students",
            "at",
            "2026-09-15T08:20:00"));
  }

  public List<Map<String, Object>> announcements() {
    return List.of(
        Map.of(
            "id",
            "an-1",
            "title",
            "Term 2 Parent Conference",
            "body",
            "Parent-teacher conferences will be held in the main hall from 9:00–15:00.",
            "status",
            "PUBLISHED",
            "publishedAt",
            "2026-09-10T09:00:00",
            "author",
            "Caxton Nyathi"),
        Map.of(
            "id",
            "an-2",
            "title",
            "Library Week",
            "body",
            "Join reading clubs and book fairs all week in the learning hub.",
            "status",
            "PUBLISHED",
            "publishedAt",
            "2026-09-08T11:00:00",
            "author",
            "Caxton Nyathi"));
  }

  public List<Map<String, Object>> years() {
    return List.of(
        Map.of(
            "id",
            "ay-2025",
            "name",
            "2025/2026",
            "startDate",
            "2025-09-01",
            "endDate",
            "2026-07-31",
            "isCurrent",
            true));
  }

  public List<Map<String, Object>> terms() {
    return List.of(
        Map.of(
            "id",
            "term-1",
            "academicYearId",
            "ay-2025",
            "name",
            "Term 1",
            "sequence",
            1,
            "startDate",
            "2025-09-01",
            "endDate",
            "2025-12-12"),
        Map.of(
            "id",
            "term-2",
            "academicYearId",
            "ay-2025",
            "name",
            "Term 2",
            "sequence",
            2,
            "startDate",
            "2026-01-12",
            "endDate",
            "2026-04-03"));
  }

  public List<Map<String, Object>> classes() {
    return List.of(
        Map.of(
            "id",
            "cls-f1",
            "name",
            "Form 1",
            "level",
            "Form 1",
            "academicYearId",
            "ay-2025",
            "classTeacherId",
            "st-3"),
        Map.of(
            "id",
            "cls-f3",
            "name",
            "Form 3",
            "level",
            "Form 3",
            "academicYearId",
            "ay-2025",
            "classTeacherId",
            "st-1"));
  }

  public List<Map<String, Object>> streams() {
    return List.of(
        Map.of("id", "str-3a", "name", "3A", "classId", "cls-f3"),
        Map.of("id", "str-1a", "name", "1A", "classId", "cls-f1"));
  }

  public List<Map<String, Object>> subjects() {
    return List.of(
        Map.of("id", "sub-math", "name", "Mathematics", "code", "MATH"),
        Map.of("id", "sub-eng", "name", "English", "code", "ENG"),
        Map.of("id", "sub-sci", "name", "Science", "code", "SCI"),
        Map.of("id", "sub-cs", "name", "Computer Science", "code", "CS"));
  }

  private int totalStudentsSafe() {
    return (int) students.count();
  }
}
