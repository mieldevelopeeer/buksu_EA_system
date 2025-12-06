import React, { useState, useEffect, useMemo } from "react";
import { Head, useForm, usePage, router } from "@inertiajs/react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  GraduationCap,
  IdentificationCard,
  ClipboardText,
  UserCircle,
  Sparkle,
  CalendarBlank,
} from "phosphor-react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import FacultyLayout from "@/Layouts/FacultyLayout";
import Swal from "sweetalert2";

export default function Enrollment({ layoutOverride = "program-head" }) {
  const {
    sections = [],
    yearLevels = [],
    semesters = [],
    courses = [],
    schoolYear = null,
    auth = {},
    activeEnrollmentPeriod = null,
    upcomingEnrollmentPeriod = null,
  } = usePage().props;

  const [studentFound, setStudentFound] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookupError, setLookupError] = useState("");

  const formatPeriodDate = (value, withTime = false) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    });
  };

  const formatPeriodRange = (period) => {
    if (!period) return "";
    const start = formatPeriodDate(period.start_date);
    const end = formatPeriodDate(period.end_date);
    return `${start} – ${end}`;
  };

  const enrollmentWindowOpen = Boolean(activeEnrollmentPeriod);
  const upcomingStartLabel = formatPeriodDate(upcomingEnrollmentPeriod?.start_date, true);
  const enrollmentStatusLabel = enrollmentWindowOpen ? "Enrollment window is open" : "Enrollment is closed";
  const enrollmentStatusDescription = enrollmentWindowOpen && activeEnrollmentPeriod?.end_date
    ? `Accepting submissions until ${formatPeriodDate(activeEnrollmentPeriod.end_date, true)}.`
    : "";
  const enrollmentLocked = !enrollmentWindowOpen;

  const form = useForm({
    id_number: "",
    first_name: "",
    last_name: "",
    middle_name: "",
    suffix: "",
    dob: "",
    gender: "",
    email: "",
    contact: "",
    address: "",
    type: "",
    program: "",
    year_level: "",
    semester: "",
    section: "",
    major: "",
  });

  const normalizeType = (value = "") => {
    const key = value.trim().toLowerCase();
    const map = {
      freshman: "freshman",
      freshmen: "freshman",
      transferee: "transferee",
      transferees: "transferee",
      shiftee: "shiftee",
      shiftees: "shiftee",
      returnee: "returnee",
      returnees: "returnee",
      old: "old",
      "old/continuing": "old",
    };

    return map[key] ?? key;
  };

  const activeTypeKey = normalizeType(form.data.type ?? "");

  const managedCourseIds = useMemo(() => {
    return [
      auth?.user?.program_head?.course_id,
      auth?.user?.program_head?.courses_id,
      auth?.user?.program_head?.courseId,
      auth?.user?.program_id,
      auth?.user?.course_id,
      auth?.user?.program?.id,
      auth?.user?.program?.course_id,
      auth?.user?.program?.courses_id,
    ]
      .filter((value) => value !== undefined && value !== null)
      .map((value) => value.toString());
  }, [auth]);

  const courseIsManaged = (courseId) => {
    if (!courseId) return false;
    if (managedCourseIds.length === 0) return true;
    return managedCourseIds.includes(courseId.toString());
  };

  const getSectionMetrics = (section) => {
    if (!section) {
      return {
        current: 0,
        limit: 0,
        vacancy: 0,
        capacityLabel: "0",
        statusLabel: "Closed",
      };
    }

    // If we have the active_enrollment_count from the backend, use it
    // Otherwise, calculate from the enrollments relationship
    const current = section.active_enrollment_count !== undefined 
      ? section.active_enrollment_count 
      : (section.enrollments?.length || 0);
      
    const limit = Number(section?.student_limit ?? section?.studentLimit ?? 0);
    const vacancy = limit > 0 ? Math.max(limit - current, 0) : null;
    const capacityLabel = limit > 0 ? `${current}/${limit}` : `${current} enrolled`;
    const statusLabel = section?.status ? "Open" : "Closed";

    return { 
      current, 
      limit, 
      vacancy, 
      capacityLabel, 
      statusLabel
    };
  };

  const filteredSections = useMemo(() => {
    const selectedYear = parseInt(form.data.year_level, 10);
    return sections.filter((sec) => {
      if (!sec?.status) return false;
      if (!selectedYear) return true;
      return Number(sec.year_level_id) === selectedYear;
    }).map(section => ({
      ...section,
      // Force a re-render when semester or school year changes
      _semester: form.data.semester,
      _schoolYear: form.data.school_year
    }));
  }, [sections, form.data.year_level, form.data.semester, form.data.school_year]);

  const selectedSection = useMemo(() => {
    if (!form.data.section) return null;
    return sections.find((sec) => Number(sec.id) === Number(form.data.section)) || null;
  }, [sections, form.data.section]);

  // Auto-fill existing student by ID
  const studentLookupRoute = layoutOverride === "faculty"
    ? "faculty.evaluation.checkStudent"
    : "program-head.enrollment.checkStudent";

  useEffect(() => {
    if (!form.data.id_number) {
      setStudentFound(false);
      setLookupError("");
      setLookupMessage("");
      return;
    }

    let isActive = true;
    setLookupError("");
    setLookupMessage("Checking student record...");

    const delay = setTimeout(() => {
      axios
        .post(route(studentLookupRoute), {
          id_number: form.data.id_number,
        })
        .then((res) => {
          if (!isActive) return;

          const exists = res?.data?.exists;
          const student = res?.data?.student;
          const hasShifteeHistory = Boolean(res?.data?.has_shiftee_history);
          const latestEnrollment = res?.data?.latest_enrollment;
          const activeEnrollmentBlocked = Boolean(res?.data?.active_enrollment_blocked);
          const activeEnrollmentMessage =
            res?.data?.active_enrollment_message ||
            "This Student is currently enrolled in this semester or other course.";

          if (!exists || !student) {
            setStudentFound(false);
            setLookupMessage("");
            setLookupError("Student record not found.");
            return;
          }

          if (activeEnrollmentBlocked) {
            setStudentFound(false);
            setLookupMessage("");
            setLookupError(activeEnrollmentMessage);
            return;
          }

          const latestCourseId = latestEnrollment?.course_id;
          const latestCourseLabel =
            latestEnrollment?.course_name || latestEnrollment?.course_code || "another course";
          const latestStatus = (latestEnrollment?.status || "").toString().toLowerCase();
          const isCurrentlyEnrolled = ["enrolled", "pending", "approved", "confirmed"].includes(latestStatus);
          const enrolledInOtherCourse = isCurrentlyEnrolled && !courseIsManaged(latestCourseId);

          if (enrolledInOtherCourse) {
            setStudentFound(false);
            setLookupMessage("");
            setLookupError(
              `Student is currently enrolled in ${latestCourseLabel}. Please coordinate with that program.`
            );
            return;
          }

          const roleCandidates = [];

          if (student?.user?.role?.name) roleCandidates.push(student.user.role.name);
          if (student?.user?.role?.description) roleCandidates.push(student.user.role.description);
          if (student?.user?.role?.slug) roleCandidates.push(student.user.role.slug);
          if (student?.user?.role?.type) roleCandidates.push(student.user.role.type);
          if (student?.user?.role) roleCandidates.push(student.user.role);
          if (student?.user?.role_name) roleCandidates.push(student.user.role_name);
          if (student?.user?.user_type) roleCandidates.push(student.user.user_type);
          if (student?.user?.role_id) roleCandidates.push(student.user.role_id);
          if (student?.role?.name) roleCandidates.push(student.role.name);
          if (student?.role?.description) roleCandidates.push(student.role.description);
          if (student?.role?.slug) roleCandidates.push(student.role.slug);
          if (student?.role) roleCandidates.push(student.role);
          if (student?.role_name) roleCandidates.push(student.role_name);
          if (student?.role_id) roleCandidates.push(student.role_id);
          if (Array.isArray(student?.user?.roles)) {
            student.user.roles.forEach((role) => {
              if (role?.name) roleCandidates.push(role.name);
              if (role?.description) roleCandidates.push(role.description);
            });
          }

          const isStudentRole = roleCandidates.some((role) => {
            if (role == null) return false;
            const value = role.toString().toLowerCase();
            return value.includes("student");
          });

          if (!isStudentRole) {
            setLookupMessage("Student role not detected; continuing with retrieved record.");
          }

          const normalizedToLabel = {
            freshman: "Freshman",
            transferee: "Transferee",
            shiftee: "Shiftee",
            returnee: "Returnee",
            old: "Old/Continuing",
            'old/continuing': "Old/Continuing",
            regular: "Old/Continuing",
            continuing: "Old/Continuing"
          };

          const enrollmentCount = Number(student?.enrollments_count ?? 0);
          const admissionTypeNormalized = normalizeType(student?.admission_type || "");
          const hasPastEnrollments = enrollmentCount > 0;
          
          // Get student type from the backend response, fallback to other sources
          const backendStudentType = student?.student_type || 
                                  student?.latest_student_type || 
                                  student?.type || 
                                  (hasPastEnrollments ? 'old/continuing' : 'freshman');
          
          let resolvedType;
          
          // First priority: Shiftee history overrides everything
          if (hasShifteeHistory) {
            resolvedType = "Shiftee";
          } 
          // Second priority: If student has past enrollments in any semester, classify as Old/Continuing
          // This handles the case where a Freshman from a past semester should now be Old/Continuing
          else if (hasPastEnrollments) {
            resolvedType = "Old/Continuing";
          }
          // Third priority: Explicit admission type from student details
          else if (admissionTypeNormalized && normalizedToLabel[admissionTypeNormalized]) {
            resolvedType = normalizedToLabel[admissionTypeNormalized];
          }
          // Fourth priority: Backend-determined student type
          else if (backendStudentType) {
            const normalizedBackendType = normalizeType(backendStudentType);
            resolvedType = normalizedToLabel[normalizedBackendType] || "Freshman";
          }
          // Fallback: Default to Freshman for new students
          else {
            resolvedType = "Freshman";
          }

          setStudentFound(true);
          setLookupError("");
          let message = "Student record retrieved.";
          if (hasShifteeHistory) {
            message = "Previous unenrolled subjects detected. Student categorized as Shiftee.";
          } else if (resolvedType === "Old/Continuing") {
            if (hasPastEnrollments) {
              message = "Continuing student identified. Previous enrollments from past semester found—now classified as Old/Continuing.";
            } else {
              message = "Continuing student identified. Previous enrollments found.";
            }
          } else if (resolvedType === "Freshman") {
            message = "New student record. No previous enrollments found.";
          }
          
          setLookupMessage(message);

          form.setData((prev) => {
            // Determine year level based on student type and enrollment history
            let resolvedYearLevelId = "";
            let updatedMessage = message;
            
            // Logic to determine year level
            if (hasPastEnrollments && student?.year_level_id && yearLevels.length > 0) {
              // Student has past enrollments - advance to next year level
              const studentCurrentYearLevel = Number(student.year_level_id);
              const currentYearIndex = yearLevels.findIndex(yl => Number(yl.id) === studentCurrentYearLevel);
              if (currentYearIndex !== -1 && currentYearIndex < yearLevels.length - 1) {
                resolvedYearLevelId = yearLevels[currentYearIndex + 1]?.id || studentCurrentYearLevel;
                updatedMessage += ` Year level automatically advanced to ${yearLevels[currentYearIndex + 1]?.year_level || "Next Year"}.`;
              } else {
                resolvedYearLevelId = student?.year_level_id;
              }
            } else if (resolvedType === "Freshman" && yearLevels.length > 0) {
              // New Freshman - set to First Year (first year level)
              const firstYearLevel = yearLevels.find(yl => yl.year_level?.toLowerCase().includes("first") || yl.year_level?.toLowerCase().includes("1st"));
              resolvedYearLevelId = firstYearLevel?.id || yearLevels[0]?.id || "";
              updatedMessage += ` Freshman automatically set to First Year.`;
            } else if (student?.year_level_id) {
              // Use student's current year level
              resolvedYearLevelId = student.year_level_id;
            }
            
            setLookupMessage(updatedMessage);

            return {
              ...prev,
              type: resolvedType,
              first_name: student?.fName || "",
              middle_name: student?.mName || "",
              last_name: student?.lName || "",
              suffix: student?.suffix || "",
              dob: student?.date_of_birth || "",
              gender: student?.gender ? student.gender.toLowerCase() : "",
              email: student?.email || "",
              contact: student?.contact_no || "",
              address: student?.address || "",
              program: student?.program_id || prev.program || "",
              year_level: resolvedYearLevelId,
              section: student?.section_id || prev.section || "",
              semester: prev.semester || semesters[0]?.id || "",
              major: student?.major_id || prev.major || "",
            };
          });
        })
        .catch(() => {
          if (!isActive) return;
          setStudentFound(false);
          setLookupMessage("");
          setLookupError("Unable to retrieve student information. Please try again.");
        });
    }, 600);

    return () => {
      isActive = false;
      clearTimeout(delay);
    };
  }, [form.data.id_number, studentLookupRoute, yearLevels, semesters]);

  // Filter requirements by type
  const activeStudentType = useMemo(() => form.data.type || "Not selected", [form.data.type]);


  // Auto-set default semester
  useEffect(() => {
    if (semesters.length > 0 && !form.data.semester) {
      form.setData("semester", semesters[0].id);
    }
  }, [semesters]);

  // Auto-select course tied to the logged-in program head
  useEffect(() => {
    if (studentFound) return;
    if (!Array.isArray(courses) || courses.length === 0) return;

    const matchingCourse = courses.find((course) => {
      const courseId = course?.id?.toString();
      return courseId && courseIsManaged(courseId);
    });

    const fallbackCourse = matchingCourse || courses[0];

    if (!fallbackCourse?.id) return;

    if (form.data.program?.toString() === fallbackCourse.id.toString()) return;

    form.setData((prev) => ({
      ...prev,
      program: fallbackCourse.id,
      major: "",
    }));
  }, [courses, studentFound, courseIsManaged]);

  const showRedirectToast = (destinationUrl) => {
    if (!destinationUrl) return;

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Enrollment submitted!",
      text: "Redirecting to Subject Load...",
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
      willClose: () => router.visit(destinationUrl),
    });
  };

  // File upload
  // Submit form
  const handleSubmit = (e) => {
    e.preventDefault();
    if (enrollmentLocked) {
      Swal.fire({
        icon: "warning",
        title: "Enrollment window is closed",
        text: "Please wait for the registrar to reopen the enrollment period before submitting.",
      });
      return;
    }
    const payload = { ...form.data };
    if (layoutOverride === "faculty") {
      payload.is_faculty_portal = true;
    }

    if (layoutOverride === "faculty") {
      window.dispatchEvent(new CustomEvent("faculty:pause-evaluation-access-poll"));
    }

    Swal.fire({
      title: "Saving student information...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    const submitRoute =
      layoutOverride === "faculty"
        ? route("faculty.evaluation.enrollment.submit")
        : route("program-head.enrollment.submit");

    router.post(submitRoute, payload, {
      onSuccess: (page) => {
        Swal.close();
        setStudentFound(false);
        form.reset();

        if (layoutOverride === "faculty") {
          window.dispatchEvent(new CustomEvent("faculty:resume-evaluation-access-poll"));
        }

        const redirectUrl =
          page?.props?.flash?.redirect_to_subject_load ||
          page?.props?.redirect_to_subject_load ||
          null;

        const createdEnrollmentId = page?.props?.enrollment_id || page?.props?.enrollment?.id || null;
        const fallbackFacultyRedirect =
          layoutOverride === "faculty" && createdEnrollmentId
            ? route("faculty.evaluation.subjectload", { id: createdEnrollmentId })
            : null;

        const destination = redirectUrl || fallbackFacultyRedirect;

        if (destination) {
          showRedirectToast(destination);
          return;
        }

        if (!page?.props?.enrollment_id && !page?.props?.enrollment?.id) {
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Enrollment submitted successfully!",
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
          });
        }
      },
      onError: (errors) => {
        console.error("[Enrollment] Submission failed", errors);
        Swal.close();

        if (layoutOverride === "faculty") {
          window.dispatchEvent(new CustomEvent("faculty:resume-evaluation-access-poll"));
        }

        if (errors && Object.keys(errors).length > 0) {
          const errorList = Object.values(errors)
            .flat()
            .map((err) => `<li>${err}</li>`)
            .join("");

          Swal.fire({
            icon: "error",
            title: "Validation Errors",
            html: `<ul style="text-align: left;">${errorList}</ul>`,
          });
        } else {
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "error",
            title: "Failed to submit enrollment!",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          });
        }
      },

    });
  };

  // Required fields
  const requiredFieldsByType = {
    Freshman: [
      "first_name", "last_name", "dob", "gender", "email", "contact", "address", "program", "year_level", "semester", "section",
    ],
    Transferee: [
      "id_number", "first_name", "last_name", "dob", "gender", "email", "program", "year_level", "section",
    ],
    Shiftee: ["id_number", "program", "year_level", "semester", "section"],
    Returnee: ["id_number", "program", "year_level", "section"],
    Old: ["id_number", "program", "semester", "section"],
  };

  const isRequired = (field) => {
    if (!activeTypeKey) return false;

    const matchedEntry = Object.entries(requiredFieldsByType).find(
      ([type]) => normalizeType(type) === activeTypeKey
    );

    return matchedEntry ? matchedEntry[1].includes(field) : false;
  };

  const LayoutComponent = layoutOverride === "faculty" ? FacultyLayout : ProgramHeadLayout;

  return (
    <LayoutComponent>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="min-h-[calc(100vh-4rem)] overflow-y-auto bg-gradient-to-br from-slate-100 via-slate-50 to-white"
      >
        <div className="mx-auto max-w-5xl px-4 py-6 md:py-8 space-y-6">
          <div className="rounded-2xl border border-slate-200/70 bg-white/95 shadow-[0_16px_32px_rgba(15,23,42,0.08)] ring-1 ring-white/60">
            <div className="flex flex-col gap-3 border-b border-slate-100/70 bg-slate-50/60 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-sky-50/80 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-sky-700">
                  <Sparkle size={11} /> BukSU College Enrollment
                </div>
                <h1 className="text-xl font-semibold text-slate-900 md:text-[1.6rem]">Student Enrollment Overview</h1>
                <p className="text-[12.5px] leading-relaxed text-slate-500">
                  Provide validated information for incoming or continuing students. Required fields are indicated with a
                  <span className="mx-1 font-semibold text-rose-500">*</span> symbol.
                </p>
              </div>

              {form.data.id_number && (
                <div
                  className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm ${
                    studentFound
                      ? "border border-emerald-200/80 bg-emerald-50/90 text-emerald-600"
                      : "border border-amber-200/80 bg-amber-50/90 text-amber-600"
                  }`}
                >
                  <UserCircle size={15} />
                  {studentFound ? "Existing student matched" : "New student record"}
                </div>
              )}
            </div>
            <div className="px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {/* School Year Info */}
                {schoolYear && (
                  <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50 to-indigo-100/50 px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Academic Year</p>
                    </div>
                    <p className="text-[15px] font-bold text-indigo-900">{schoolYear.school_year}</p>
                  </div>
                )}

                {/* Current Semester Info */}
                {activeEnrollmentPeriod ? (
                  <div className="rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50 to-sky-100/50 px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-sky-600"></div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">Current Semester</p>
                    </div>
                    <p className="text-[15px] font-bold text-sky-900">{activeEnrollmentPeriod.semester?.semester || "TBD"}</p>
                    <p className="text-[11px] text-sky-700 mt-1">{formatPeriodRange(activeEnrollmentPeriod)}</p>
                  </div>
                ) : null}
              </div>

              {!enrollmentWindowOpen && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 px-4 py-3 text-amber-800">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarBlank size={14} className="text-amber-600" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Enrollment Status</p>
                  </div>
                  <p className="text-[13px] font-semibold text-amber-900">{enrollmentStatusLabel}</p>
                </div>
              )}
            </div>
          </div>

          {enrollmentLocked ? (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-6 text-center text-[12.5px] text-amber-700">
              Enrollment is closed.
            </div>
          ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm md:p-6 space-y-6"
          >
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-sm font-semibold">0</span>
                <h2 className="text-[14px] font-semibold text-slate-800">Student Lookup</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-2.5">
                    <IdentificationCard size={14} className="text-indigo-600" /> Student ID
                    {isRequired("id_number") && <span className="text-rose-500 text-[12px]">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter or scan student ID"
                    value={form.data.id_number}
                    onChange={(e) => form.setData("id_number", e.target.value)}
                    className={`w-full rounded-lg border-2 px-4 py-2.5 text-[13px] font-medium transition duration-200 placeholder:text-slate-400 focus:outline-none ${
                      form.errors.id_number 
                        ? "border-rose-400 bg-rose-50/60 text-rose-900 focus:ring-2 focus:ring-rose-200 focus:border-rose-400" 
                        : "border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                    }`}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 mb-2.5">
                    <UserCircle size={14} className="text-indigo-600" /> Student Type
                    {isRequired("type") && <span className="text-rose-500 text-[12px]">*</span>}
                  </label>
                  <select
                    value={form.data.type || ''}
                    onChange={(e) => {
                      form.setData('type', e.target.value);
                      form.clearErrors('type');
                    }}
                    className={`w-full rounded-lg border-2 px-4 py-2.5 text-[13px] font-medium transition duration-200 focus:outline-none ${
                      form.errors.type 
                        ? "border-rose-400 bg-rose-50/60 text-rose-900 focus:ring-2 focus:ring-rose-200 focus:border-rose-400" 
                        : "border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                    }`}
                  >
                    <option value="" className="text-slate-500">-- Select Type --</option>
                    <option value="Freshman">Freshman</option>
                    <option value="Transferee">Transferee</option>
                    <option value="Shiftee">Shiftee</option>
                    <option value="Returnee">Returnee</option>
                    <option value="Old/Continuing">Old/Continuing</option>
                  </select>
                </div>
              </div>
              {lookupMessage && !form.errors.id_number && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                  <div className="h-5 w-5 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <p className="text-[12px] font-medium text-emerald-800">{lookupMessage}</p>
                </div>
              )}
              {(lookupError || form.errors.id_number) && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5">
                  <div className="h-5 w-5 rounded-full bg-rose-500 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <p className="text-[12px] font-medium text-rose-800">{form.errors.id_number || lookupError}</p>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-600 text-xs font-semibold">1</span>
                  <h2 className="text-[13.5px] font-semibold text-slate-800">Student Information</h2>
                </div>
                <span className="rounded-full bg-slate-100/90 px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-500">
                  Step 1 of 2
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="flex flex-col">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Full Name</p>
                  <p className="text-[13px] font-medium text-slate-800">
                    {`${form.data.last_name || '—'}, ${form.data.first_name || '—'} ${form.data.middle_name || ''} ${form.data.suffix || ''}`.replace(/\s+/g, ' ').trim()}
                  </p>
                </div>

                {/* Student ID */}
                <div className="flex flex-col">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Student ID</p>
                  <p className="text-[13px] font-medium text-slate-800">{form.data.id_number || '—'}</p>
                </div>

                {/* Date of Birth */}
                <div className="flex flex-col">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Date of Birth</p>
                  <p className="text-[13px] font-medium text-slate-800">
                    {form.data.dob ? new Date(form.data.dob).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : '—'}
                  </p>
                </div>

                {/* Gender */}
                <div className="flex flex-col">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Gender</p>
                  <p className="text-[13px] font-medium text-slate-800 capitalize">{form.data.gender || '—'}</p>
                </div>

                {/* Email */}
                <div className="flex flex-col">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Email</p>
                  <p className="text-[13px] font-medium text-slate-800">{form.data.email || '—'}</p>
                </div>

                {/* Contact */}
                <div className="flex flex-col">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Contact Number</p>
                  <p className="text-[13px] font-medium text-slate-800">{form.data.contact || '—'}</p>
                </div>

                {/* Address */}
                <div className="md:col-span-2 flex flex-col">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Address</p>
                  <p className="text-[13px] font-medium text-slate-800">{form.data.address || '—'}</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
                  <ClipboardText size={13} className="text-slate-500" /> Enrollment Details
                </h2>
                <span className="rounded-full bg-slate-100/90 px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-500">
                  Step 2 of 2
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-3.5">
                {/* Program / Course */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Program / Course
                    {isRequired("program") && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={form.data.program}
                    onChange={(e) => {
                      form.setData("program", e.target.value);
                      form.setData("major", "");
                    }}
                    className={`border rounded-md px-3 py-1.5 w-full text-[13px] ${isRequired("program") ? "border-red-400" : "border-slate-200/80"} focus:ring-1 focus:ring-sky-200 focus:outline-none transition-all`}
                    required
                  >
                    <option value="">-- Select Program --</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Major */}
                {(() => {
                  const selectedCourse = courses.find((c) => String(c.id) === String(form.data.program));
                  if (selectedCourse?.majors?.length > 0) {
                    return (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Major (if applicable)</label>
                        <select
                          value={form.data.major || ""}
                          onChange={(e) => form.setData("major", e.target.value)}
                          className="border rounded-md px-3 py-1.5 w-full text-[13px] border-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">-- Select Major --</option>
                          {selectedCourse.majors.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  return <div className="hidden md:block" />;
                })()}

                {/* Year Level */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Year Level
                    {isRequired("year_level") && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={form.data.year_level}
                    onChange={(e) => {
                      form.setData("year_level", e.target.value);
                      form.setData("section", "");
                    }}
                    className={`border rounded-md px-3 py-1.5 w-full text-[13px] ${isRequired("year_level") ? "border-red-400" : "border-slate-200"} focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                  >
                    <option value="">-- Select Year Level --</option>
                    {yearLevels.map((yl) => (
                      <option key={yl.id} value={yl.id}>
                        {yl.year_level}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
                    Semester
                    {isRequired("semester") && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={form.data.semester}
                    onChange={(e) => form.setData("semester", e.target.value)}
                    disabled
                    className={`border rounded-md px-3 py-1.75 w-full text-[13px] bg-gray-100 text-gray-500 ${isRequired("semester") ? "border-red-400 bg-rose-50/60" : "border-slate-200/80"}`}
                  >
                    <option value="">-- Select Semester --</option>
                    {semesters.map((sem) => (
                      <option key={sem.id} value={sem.id}>
                        {sem.semester}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
                    Section to be Enrolled
                    {isRequired("section") && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={form.data.section}
                    onChange={(e) => form.setData("section", e.target.value)}
                    className={`border rounded-md px-3 py-1.75 w-full text-[13px] ${isRequired("section") ? "border-red-400 bg-rose-50/40" : "border-slate-200/80 bg-white"} focus:ring-2 focus:ring-sky-200 focus:outline-none transition-all`}
                  >
                    <option value="">-- Select Section --</option>
                    {filteredSections.map((sec) => {
                      const { capacityLabel, statusLabel } = getSectionMetrics(sec);
                      return (
                        <option key={sec.id} value={sec.id}>
                          {sec.section} — {capacityLabel} ({statusLabel})
                        </option>
                      );
                    })}
                  </select>
                  {selectedSection && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                        Capacity: {getSectionMetrics(selectedSection).capacityLabel}
                      </span>
                      {selectedSection?.student_limit ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600">
                          Vacancy: {getSectionMetrics(selectedSection).vacancy ?? "Unlimited"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500">
                          No limit set
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                          selectedSection.status ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        }`}
                      >
                        Status: {getSectionMetrics(selectedSection).statusLabel}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="flex flex-col items-center justify-between gap-2.5 border-t border-slate-100 pt-3 text-center md:flex-row md:text-left">
              <p className="text-[11px] text-slate-500">
                Review the information before submitting. You can update any field above before finalizing the enrollment.
                </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-[12.5px] font-semibold uppercase tracking-wide text-white shadow-[0_12px_24px_rgba(14,165,233,0.25)] transition hover:bg-sky-700"
              >
                <Sparkle size={16} weight="fill" /> Submit Enrollment
              </motion.button>
            </div>
          </form>
          )}
        </div>
      </motion.div>
    </LayoutComponent>
  );
}
