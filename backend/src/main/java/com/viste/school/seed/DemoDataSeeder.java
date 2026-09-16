package com.viste.school.seed;

import com.viste.school.domain.StaffEntity;
import com.viste.school.domain.StaffStatus;
import com.viste.school.domain.StudentEntity;
import com.viste.school.domain.StudentStatus;
import com.viste.school.domain.UserAccount;
import com.viste.school.domain.UserRole;
import com.viste.school.repository.StaffRepository;
import com.viste.school.repository.StudentRepository;
import com.viste.school.repository.UserAccountRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DemoDataSeeder implements CommandLineRunner {

  private final UserAccountRepository users;
  private final StaffRepository staff;
  private final StudentRepository students;
  private final PasswordEncoder passwordEncoder;

  public DemoDataSeeder(
      UserAccountRepository users,
      StaffRepository staff,
      StudentRepository students,
      PasswordEncoder passwordEncoder) {
    this.users = users;
    this.staff = staff;
    this.students = students;
    this.passwordEncoder = passwordEncoder;
  }

  @Override
  @Transactional
  public void run(String... args) {
    if (users.count() > 0) {
      return;
    }

    StaffEntity teacher = new StaffEntity();
    teacher.setId("st-1");
    teacher.setEmployeeNumber("EMP-1001");
    teacher.setFirstName("Daniel");
    teacher.setLastName("Mwangi");
    teacher.setEmail("teacher@viste.school");
    teacher.setPhone("+1 555 0101");
    teacher.setDepartment("Mathematics");
    teacher.setTitle("Senior Teacher");
    teacher.setStatus(StaffStatus.ACTIVE);
    teacher.setHireDate(LocalDate.of(2019, 8, 15));
    teacher.setSubjectIds(List.of("sub-math", "sub-cs"));
    teacher.setClassIds(List.of("cls-f3", "cls-f4"));
    staff.save(teacher);

    StaffEntity science = new StaffEntity();
    science.setId("st-3");
    science.setEmployeeNumber("EMP-1003");
    science.setFirstName("James");
    science.setLastName("Okafor");
    science.setEmail("j.okafor@viste.school");
    science.setPhone("+1 555 0103");
    science.setDepartment("Sciences");
    science.setTitle("Science Teacher");
    science.setStatus(StaffStatus.ACTIVE);
    science.setHireDate(LocalDate.of(2021, 3, 1));
    science.setSubjectIds(List.of("sub-sci"));
    science.setClassIds(List.of("cls-f1", "cls-f2"));
    staff.save(science);

    StudentEntity leo = new StudentEntity();
    leo.setId("stu-1");
    leo.setStudentNumber("VHS-2024-001");
    leo.setAdmissionNumber("ADM-24001");
    leo.setFirstName("Leo");
    leo.setLastName("Ndlovu");
    leo.setDateOfBirth(LocalDate.of(2010, 4, 12));
    leo.setGender("Male");
    leo.setEmail("student@viste.school");
    leo.setAddress("12 Cedar Avenue");
    leo.setAdmissionDate(LocalDate.of(2024, 1, 15));
    leo.setStatus(StudentStatus.ACTIVE);
    leo.setClassId("cls-f3");
    leo.setStreamId("str-3a");
    leo.setGuardianIds(List.of("g-1"));
    students.save(leo);

    students.save(student("stu-2", "VHS-2025-014", "ADM-25014", "Aisha", "Khan", "Female", "cls-f1", "str-1a"));

    users.save(
        account(
            "u-admin",
            "Caxton Nyathi",
            "admin@viste.school",
            UserRole.SCHOOL_ADMIN,
            "School Administrator",
            "Administration",
            "EMP-0001",
            null,
            null,
            null));
    users.save(
        account(
            "u-teacher",
            "Daniel Mwangi",
            "teacher@viste.school",
            UserRole.TEACHER,
            "Senior Teacher",
            "Mathematics",
            "EMP-1001",
            "st-1",
            null,
            null));
    users.save(
        account(
            "u-parent",
            "Grace Ndlovu",
            "parent@viste.school",
            UserRole.PARENT,
            "Parent / Guardian",
            null,
            null,
            null,
            null,
            "g-1"));
    users.save(
        account(
            "u-student",
            "Leo Ndlovu",
            "student@viste.school",
            UserRole.STUDENT,
            "Student",
            null,
            null,
            null,
            "stu-1",
            null));
  }

  private UserAccount account(
      String id,
      String name,
      String email,
      UserRole role,
      String title,
      String department,
      String employeeNumber,
      String staffId,
      String studentId,
      String guardianId) {
    UserAccount user = new UserAccount();
    user.setId(id);
    user.setName(name);
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode("demo1234"));
    user.setRole(role);
    user.setTitle(title);
    user.setDepartment(department);
    user.setEmployeeNumber(employeeNumber);
    user.setStaffId(staffId);
    user.setStudentId(studentId);
    user.setGuardianId(guardianId);
    user.setPhone("+1 555 0000");
    user.setPreferredLanguage("en");
    user.setTimezone("Africa/Harare");
    user.setEnabled(true);
    return user;
  }

  private StudentEntity student(
      String id,
      String studentNumber,
      String admissionNumber,
      String firstName,
      String lastName,
      String gender,
      String classId,
      String streamId) {
    StudentEntity s = new StudentEntity();
    s.setId(id);
    s.setStudentNumber(studentNumber);
    s.setAdmissionNumber(admissionNumber);
    s.setFirstName(firstName);
    s.setLastName(lastName);
    s.setDateOfBirth(LocalDate.of(2011, 1, 1));
    s.setGender(gender);
    s.setAddress("Campus residence");
    s.setAdmissionDate(LocalDate.of(2025, 1, 10));
    s.setStatus(StudentStatus.ACTIVE);
    s.setClassId(classId);
    s.setStreamId(streamId);
    s.setGuardianIds(List.of());
    return s;
  }
}
