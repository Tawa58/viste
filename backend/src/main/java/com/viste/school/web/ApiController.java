package com.viste.school.web;

import com.viste.school.dto.DashboardStatsDto;
import com.viste.school.dto.StaffDto;
import com.viste.school.dto.StudentDto;
import com.viste.school.service.SchoolDataService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ApiController {

  private final SchoolDataService data;

  public ApiController(SchoolDataService data) {
    this.data = data;
  }

  @GetMapping("/students")
  public List<StudentDto> students() {
    return data.listStudents();
  }

  @GetMapping("/students/{id}")
  public StudentDto student(@PathVariable String id) {
    return data.getStudent(id);
  }

  @GetMapping("/staff")
  public List<StaffDto> staff() {
    return data.listStaff();
  }

  @GetMapping("/staff/{id}")
  public StaffDto staffMember(@PathVariable String id) {
    return data.getStaff(id);
  }

  @PostMapping("/staff")
  public StaffDto createStaff(@RequestBody StaffDto body) {
    return data.createStaff(body);
  }

  @PatchMapping("/staff/{id}/photo")
  public StaffDto updatePhoto(@PathVariable String id, @RequestBody Map<String, String> body) {
    return data.updateStaffPhoto(id, body.get("photoUrl"));
  }

  @GetMapping("/dashboard/stats")
  public DashboardStatsDto stats() {
    return data.stats();
  }

  @GetMapping("/dashboard/enrollment")
  public List<Map<String, Object>> enrollment() {
    return data.enrollmentTrend();
  }

  @GetMapping("/dashboard/attendance-overview")
  public List<Map<String, Object>> attendanceOverview() {
    return data.attendanceOverview();
  }

  @GetMapping("/dashboard/fee-collection")
  public List<Map<String, Object>> feeCollection() {
    return data.feeCollection();
  }

  @GetMapping("/dashboard/performance")
  public List<Map<String, Object>> performance() {
    return data.performance();
  }

  @GetMapping("/dashboard/recent-payments")
  public List<Map<String, Object>> recentPayments() {
    return data.recentPayments();
  }

  @GetMapping("/dashboard/recent-activities")
  public List<Map<String, Object>> recentActivities() {
    return data.recentActivities();
  }

  @GetMapping("/catalog/years")
  public List<Map<String, Object>> years() {
    return data.years();
  }

  @GetMapping("/catalog/terms")
  public List<Map<String, Object>> terms() {
    return data.terms();
  }

  @GetMapping("/catalog/classes")
  public List<Map<String, Object>> classes() {
    return data.classes();
  }

  @GetMapping("/catalog/streams")
  public List<Map<String, Object>> streams() {
    return data.streams();
  }

  @GetMapping("/catalog/subjects")
  public List<Map<String, Object>> subjects() {
    return data.subjects();
  }

  @GetMapping("/catalog/announcements")
  public List<Map<String, Object>> announcements() {
    return data.announcements();
  }

  @GetMapping("/catalog/guardians")
  public List<Map<String, Object>> guardians() {
    return List.of();
  }

  @GetMapping("/catalog/guardians/{id}")
  public Map<String, Object> guardian(@PathVariable String id) {
    return Map.of("id", id);
  }

  @GetMapping("/catalog/attendance")
  public List<Map<String, Object>> attendance() {
    return List.of();
  }

  @GetMapping("/catalog/examinations")
  public List<Map<String, Object>> examinations() {
    return List.of();
  }

  @GetMapping("/catalog/assessments")
  public List<Map<String, Object>> assessments() {
    return List.of();
  }

  @GetMapping("/catalog/marks")
  public List<Map<String, Object>> marks() {
    return List.of();
  }

  @GetMapping("/catalog/fee-structures")
  public List<Map<String, Object>> feeStructures() {
    return List.of();
  }

  @GetMapping("/catalog/invoices")
  public List<Map<String, Object>> invoices() {
    return List.of();
  }

  @GetMapping("/catalog/payments")
  public List<Map<String, Object>> payments() {
    return data.recentPayments();
  }

  @GetMapping("/catalog/books")
  public List<Map<String, Object>> books() {
    return List.of();
  }

  @GetMapping("/catalog/loans")
  public List<Map<String, Object>> loans() {
    return List.of();
  }

  @GetMapping("/catalog/inventory")
  public List<Map<String, Object>> inventory() {
    return List.of();
  }

  @GetMapping("/catalog/transport")
  public List<Map<String, Object>> transport() {
    return List.of();
  }

  @GetMapping("/catalog/users")
  public List<Map<String, Object>> users() {
    return List.of();
  }

  @GetMapping("/catalog/role-permissions")
  public List<Map<String, Object>> rolePermissions() {
    return List.of();
  }

  @GetMapping("/catalog/permissions")
  public List<String> permissions() {
    return List.of(
        "students.view",
        "attendance.record",
        "results.enter",
        "fees.view",
        "system.settings");
  }

  @GetMapping("/catalog/audit-logs")
  public List<Map<String, Object>> auditLogs() {
    return List.of();
  }

  @GetMapping("/catalog/result-portals")
  public List<Map<String, Object>> resultPortals() {
    return List.of();
  }
}
