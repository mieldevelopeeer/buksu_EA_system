import React, { useMemo, useState, useEffect } from "react";
import { Head, Link, router } from "@inertiajs/react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  BookOpen,
  GraduationCap,
  FileText,
  Envelope,
  Phone,
  MapPin,
  X,
  IdentificationCard,
} from "phosphor-react";
import Swal from "sweetalert2";

const cardClass = "rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow";
const tabListClass = "flex flex-wrap gap-2 rounded-xl border border-slate-200/80 bg-white p-2 shadow-sm";
const tabButtonBase =
  "flex items-center gap-2 rounded-lg border px-3.5 py-1.75 text-[13px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300";
const tabButtonActive = "border-indigo-300 bg-indigo-50 text-indigo-700 shadow-md";
const tabButtonInactive = "border-transparent text-slate-600 hover:border-slate-300 hover:bg-slate-50";
const ACTIVE_TAB_STORAGE_KEY = "program_head_student_profile_active_tab";

const formatDate = (value, fallback = "N/A") => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value, fallback = "N/A") => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatTime = (time) => {
  if (!time) return "TBA";
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
};

const resolveSubjectInfo = (enrollmentSubject = {}) => {
  const curriculumSubject =
    enrollmentSubject.curriculumSubject ??
    enrollmentSubject.curriculum_subject ??
    enrollmentSubject.classSchedule?.curriculumSubject ??
    enrollmentSubject.class_schedule?.curriculum_subject ??
    null;

  const subjectRecord =
    curriculumSubject?.subject ??
    enrollmentSubject.subject ??
    enrollmentSubject.classSchedule?.subject ??
    enrollmentSubject.class_schedule?.subject ??
    {};

  return {
    code: subjectRecord.code ?? "—",
    title: subjectRecord.descriptive_title ?? subjectRecord.title ?? "—",
  };
};

const determineGradeTone = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "text-slate-500";
  }

  if (value <= 1.5) return "text-emerald-600 font-semibold";
  if (value <= 2.5) return "text-emerald-500";
  if (value <= 3.0) return "text-amber-600 font-semibold";
  if (value <= 4.0) return "text-orange-600";
  return "text-rose-600 font-semibold";
};

const determineRemarkTone = (remarks) => {
  const normalized = (remarks || "").toString().toLowerCase();

  if (normalized.includes("pass")) {
    return "text-emerald-600 font-semibold";
  }

  if (normalized.includes("fail")) {
    return "text-rose-600 font-semibold";
  }

  if (normalized.includes("incomplete")) {
    return "text-amber-600 font-semibold";
  }

  return "text-slate-600";
};

const determineStatusBadgeTone = (status) => {
  const normalized = (status || "").toString().toLowerCase();

  if (normalized === "confirmed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-600";
  }

  if (normalized === "submitted") {
    return "border-indigo-200 bg-indigo-50 text-indigo-600";
  }

  if (normalized === "rejected" || normalized === "denied") {
    return "border-rose-200 bg-rose-50 text-rose-600";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
};

const formatGradeValue = (value) => {
  if (value === null || value === undefined) return "-";
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "") return "-";

  const num = Number(raw);
  if (!Number.isFinite(num)) return "-";
  const rounded = Math.round(num * 100) / 100;
  let str = rounded.toFixed(2);
  str = str.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  return str;
};

const parseGradeNumeric = (value) => {
  if (value === null || value === undefined) return null;
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "" || raw === "-" || raw === 0 || raw === "0") {
    return null;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return numeric;
};

const normalizeYearLevel = (value) => {
  if (value === null || value === undefined) return "";

  let workingValue = value;

  if (typeof workingValue === "object") {
    workingValue =
      workingValue.year_level ??
      workingValue.name ??
      workingValue.label ??
      workingValue.display_name ??
      workingValue.value ??
      "";
  }

  const trimmed = String(workingValue).trim();
  if (trimmed === "") return "";
  const normalized = trimmed.toLowerCase();
  switch (normalized) {
    case "1":
    case "first year":
    case "1st year":
      return "First Year";
    case "2":
    case "second year":
    case "2nd year":
      return "Second Year";
    case "3":
    case "third year":
    case "3rd year":
      return "Third Year";
    case "4":
    case "fourth year":
    case "4th year":
      return "Fourth Year";
    case "5":
    case "fifth year":
    case "5th year":
      return "Fifth Year";
    default:
      return trimmed;
  }
};

const formatStudentName = (user = {}) => {
  const last = user.lName ?? "";
  const first = user.fName ?? "";
  const middle = user.mName ?? "";
  const base = `${last}, ${first} ${middle}`.replace(/\s+/g, " ").trim();
  return base === "," ? "" : base;
};

export default function StudentProfile({
  student = {},
  studentDetails = null,
  enrollments = [],
  enrollmentSubjects = [],
  curriculumSubjects = [],
  grades = [],
  department = {},
  creditedSubjects = [],
}) {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") {
      return "account";
    }

    return window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) || "account";
  });
  const [unenrollingId, setUnenrollingId] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  const handleUnenroll = async (enrollmentId) => {
    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    if (!enrollment) return;

    const result = await Swal.fire({
      icon: "warning",
      title: "Unenroll student?",
      html: `
        <div class="text-left text-sm text-slate-600 space-y-2">
          <p>Are you sure you want to unenroll <strong>${formatStudentName(student)}</strong>?</p>
          <p class="text-xs text-slate-500">This will mark the student as unenrolled and drop all loaded subjects.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Unenroll Student",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "rounded-2xl text-sm",
        title: "text-base",
        confirmButton: "text-xs px-4 py-2",
        cancelButton: "text-xs px-4 py-2",
      },
    });

    if (result.isConfirmed) {
      setUnenrollingId(enrollmentId);
      router.post(
        route("program-head.students.unenroll", enrollmentId),
        {},
        {
          onSuccess: () => {
            Swal.fire({
              icon: "success",
              title: "Student Unenrolled",
              text: "The student has been successfully unenrolled.",
              confirmButtonText: "OK",
              customClass: {
                popup: "rounded-2xl text-sm",
              },
            });
            setUnenrollingId(null);
          },
          onError: (errors) => {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: "Failed to unenroll student. Please try again.",
              confirmButtonText: "OK",
              customClass: {
                popup: "rounded-2xl text-sm",
              },
            });
            setUnenrollingId(null);
          },
        }
      );
    }
  };

  const handleReenroll = async (enrollmentId) => {
    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    if (!enrollment) return;

    const result = await Swal.fire({
      icon: "question",
      title: "Re-enroll student?",
      html: `
        <div class="text-left text-sm text-slate-600 space-y-2">
          <p>Proceed to re-enroll <strong>${formatStudentName(student)}</strong>?</p>
          <p class="text-xs text-slate-500">This will restore the enrollment and previously dropped subjects.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Re-enroll Student",
      confirmButtonColor: "#16a34a",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "rounded-2xl text-sm",
        title: "text-base",
        confirmButton: "text-xs px-4 py-2",
        cancelButton: "text-xs px-4 py-2",
      },
    });

    if (result.isConfirmed) {
      router.post(
        route("program-head.students.reenroll", enrollmentId),
        {},
        {
          onSuccess: () => {
            Swal.fire({
              icon: "success",
              title: "Student Re-enrolled",
              text: "The student has been successfully re-enrolled.",
              confirmButtonText: "OK",
              customClass: {
                popup: "rounded-2xl text-sm",
              },
            });
          },
          onError: () => {
            Swal.fire({
              icon: "error",
              title: "Error",
              text: "Failed to re-enroll student. Please try again.",
              confirmButtonText: "OK",
              customClass: {
                popup: "rounded-2xl text-sm",
              },
            });
          },
        }
      );
    }
  };

  const renderAccount = () => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className={cardClass}>
        <div className="mb-5 flex items-center gap-3 pb-4 border-b border-slate-100">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <User size={20} weight="bold" />
          </span>
          <h2 className="text-lg font-bold text-slate-900">Account Information</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Student ID</dt>
            <dd className="text-[14px] font-semibold text-slate-900 break-words">{student.id_number || "—"}</dd>
          </div>
          <div className="space-y-1.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Full Name</dt>
            <dd className="text-[14px] font-semibold text-slate-900">
              {formatStudentName(student) || "—"}
            </dd>
          </div>
          <div className="space-y-1.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Email</dt>
            <dd className="flex items-center gap-2 text-[14px] font-medium text-slate-700">
              <Envelope size={16} className="text-slate-400 flex-shrink-0" />
              <span className="break-all">{student.email || "—"}</span>
            </dd>
          </div>
          <div className="space-y-1.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Contact Number</dt>
            <dd className="flex items-center gap-2 text-[14px] font-medium text-slate-700">
              <Phone size={16} className="text-slate-400 flex-shrink-0" />
              {student.contact_no || "—"}
            </dd>
          </div>
          <div className="space-y-1.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gender</dt>
            <dd className="text-[14px] font-medium text-slate-700">{student.gender || "—"}</dd>
          </div>
          <div className="space-y-1.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date of Birth</dt>
            <dd className="text-[14px] font-medium text-slate-700">
              {student.date_of_birth ? formatDate(student.date_of_birth) : studentDetails?.birth_date ? formatDate(studentDetails.birth_date) : "—"}
            </dd>
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Address</dt>
            <dd className="flex items-start gap-2 text-[14px] font-medium text-slate-700">
              <MapPin size={16} className="mt-0.5 text-slate-400 flex-shrink-0" />
              <span>{student.address || 
                (studentDetails?.current_address_street 
                  ? `${studentDetails.current_address_street}, ${studentDetails.current_address_barangay || ""}, ${studentDetails.current_address_municipality || ""}, ${studentDetails.current_address_province || ""}`.replace(/,\s*,/g, ",").replace(/^,\s*|,\s*$/g, "")
                  : "—")}</span>
            </dd>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderStudentInfo = () => {
    const resolvedDetails = studentDetails
      || student?.studentDetails
      || student?.student_details
      || {};

    if (Object.keys(resolvedDetails).length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cardClass}
        >
          <div className="text-center py-12">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
              <GraduationCap size={24} className="text-slate-400" />
            </div>
            <p className="text-[14px] font-semibold text-slate-600 mb-1">No student details found</p>
            <p className="text-[12px] text-slate-500">Student information has not been added to the system yet.</p>
          </div>
        </motion.div>
      );
    }

    const details = resolvedDetails;

    const formatAddress = (prefix) => {
      const street = details[`${prefix}_street`];
      const barangay = details[`${prefix}_barangay`];
      const municipality = details[`${prefix}_municipality`];
      const province = details[`${prefix}_province`];
      const parts = [street, barangay, municipality, province].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : "—";
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* General Information */}
        <div className={cardClass}>
          <div className="mb-5 flex items-center gap-3 pb-4 border-b border-slate-100">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <User size={20} weight="bold" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">General Information</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {[
              { label: "Campus", value: details.campus },
              { label: "Birth Date", value: details.birth_date ? formatDate(details.birth_date) : null },
              { label: "Place of Birth", value: details.place_of_birth },
              { label: "Height", value: details.height_ft ? `${details.height_ft} ft` : null },
              { label: "Weight", value: details.weight_kg ? `${details.weight_kg} kg` : null },
              { label: "Contact Number", value: details.contact_number },
              { label: "Email Address", value: details.email_address },
              { label: "Exam Result", value: details.exam_result },
              { label: "Admission Type", value: details.admission_type },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{item.label}</dt>
                <dd className="text-[14px] font-medium text-slate-700">{item.value || "—"}</dd>
              </div>
            ))}
            {/* Transfer & Student Status */}
            <div className="space-y-1.5">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500\">Transfer Status</dt>
              <dd>
                <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                  details.transfer_status === "None"
                    ? "border-slate-200 bg-slate-50 text-slate-600"
                    : details.transfer_status === "Transferred"
                    ? "border-blue-200 bg-blue-50 text-blue-600"
                    : details.transfer_status === "Unenrolled"
                    ? "border-red-200 bg-red-50 text-red-600"
                    : "border-yellow-200 bg-yellow-50 text-yellow-600"
                }`}>
                  {details.transfer_status || "None"}
                </span>
              </dd>
            </div>
            <div className="space-y-1.5">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500\">Student Status</dt>
              <dd>
                <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                  details.student_status === "Regular"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                    : "border-amber-200 bg-amber-50 text-amber-600"
                }`}>
                  {details.student_status || "Regular"}
                </span>
              </dd>
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className={cardClass}>
          <div className="mb-5 flex items-center gap-3 pb-4 border-b border-slate-100">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <MapPin size={20} weight="bold" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">Addresses</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Current Address</dt>
              <dd className="text-[14px] font-medium text-slate-700">{formatAddress("current_address")}</dd>
            </div>
            <div className="space-y-1.5">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Home Address</dt>
              <dd className="text-[14px] font-medium text-slate-700">{formatAddress("home_address")}</dd>
            </div>
          </div>
        </div>

        {/* Family Information */}
        <div className={cardClass}>
          <div className="mb-5 flex items-center gap-3 pb-4 border-b border-slate-100">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <User size={20} weight="bold" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">Family Information</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {/* Father */}
            <div>
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-3 pb-2 border-b border-slate-200">Father</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-500">Name</p>
                  <p className="text-[13px] font-semibold text-slate-700">{details.father_name || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-500">Contact</p>
                  <p className="text-[13px] font-semibold text-slate-700">{details.father_contact || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-500">Occupation</p>
                  <p className="text-[13px] font-semibold text-slate-700">{details.father_occupation || "—"}</p>
                </div>
              </div>
            </div>
            
            {/* Mother */}
            <div>
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-3 pb-2 border-b border-slate-200">Mother</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-500">Name</p>
                  <p className="text-[13px] font-semibold text-slate-700">{details.mother_maiden_name || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-500">Contact</p>
                  <p className="text-[13px] font-semibold text-slate-700">{details.mother_contact || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-500">Occupation</p>
                  <p className="text-[13px] font-semibold text-slate-700">{details.mother_occupation || "—"}</p>
                </div>
              </div>
            </div>

            {/* Guardian */}
            <div>
              <h3 className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-3 pb-2 border-b border-slate-200">Guardian</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-500">Name</p>
                  <p className="text-[13px] font-semibold text-slate-700">{details.guardian_name || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-500">Contact</p>
                  <p className="text-[13px] font-semibold text-slate-700">{details.guardian_contact || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-500">Occupation</p>
                  <p className="text-[13px] font-semibold text-slate-700">{details.guardian_occupation || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Educational Background */}
        <div className={cardClass}>
          <div className="mb-5 flex items-center gap-3 pb-4 border-b border-slate-100">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <GraduationCap size={20} weight="bold" />
            </span>
            <h2 className="text-lg font-bold text-slate-900">Educational Background</h2>
          </div>
          <div className="space-y-3">
            {details.elementary_school_name && (
              <div className="pb-3 border-b border-slate-100">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Elementary</dt>
                <dd className="text-[14px] font-semibold text-slate-700">
                  {details.elementary_school_name}
                  {details.elementary_school_year_graduated && <span className="text-[12px] text-slate-500 ml-2">({details.elementary_school_year_graduated})</span>}
                </dd>
              </div>
            )}
            {details.junior_high_school_name && (
              <div className="pb-3 border-b border-slate-100">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Junior High School</dt>
                <dd className="text-[14px] font-semibold text-slate-700">
                  {details.junior_high_school_name}
                  {details.junior_high_school_year_graduated && <span className="text-[12px] text-slate-500 ml-2">({details.junior_high_school_year_graduated})</span>}
                </dd>
              </div>
            )}
            {details.senior_high_school_name && (
              <div className="pb-3 border-b border-slate-100">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Senior High School</dt>
                <dd className="text-[14px] font-semibold text-slate-700">
                  {details.senior_high_school_name}
                  {details.senior_high_school_year_graduated && <span className="text-[12px] text-slate-500 ml-2">({details.senior_high_school_year_graduated})</span>}
                </dd>
              </div>
            )}
            {details.college_name && (
              <div className="pb-3 border-b border-slate-100">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">College</dt>
                <dd className="text-[14px] font-semibold text-slate-700">
                  {details.college_name}
                  {details.college_year_graduated && <span className="text-[12px] text-slate-500 ml-2">({details.college_year_graduated})</span>}
                </dd>
              </div>
            )}
            {details.last_school_attended && (
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Last School Attended</dt>
                <dd className="text-[14px] font-semibold text-slate-700">
                  {details.last_school_name || details.last_school_attended}
                  {details.last_school_year_graduated && <span className="text-[12px] text-slate-500 ml-2">({details.last_school_year_graduated})</span>}
                </dd>
              </div>
            )}
            {!details.elementary_school_name && !details.junior_high_school_name && !details.senior_high_school_name && !details.college_name && !details.last_school_attended && (
              <p className="text-[13px] text-slate-500 text-center py-6">No educational background information available.</p>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderEnrollments = () => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {enrollments.length > 0 ? (
        enrollments.map((enrollment) => {
          const yearLevel = normalizeYearLevel(
            enrollment.yearLevel?.year_level ??
              enrollment.year_level?.year_level ??
              enrollment.year_level
          );
          const courseLabel = `${enrollment.course?.code || "Program TBA"}${enrollment.major?.code ? ` · ${enrollment.major.code}` : ""}`;

          return (
            <div key={enrollment.id} className={cardClass}>
              <div className="mb-5 flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <GraduationCap size={20} weight="bold" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Enrollment Record</h3>
                    <p className="text-[11px] text-slate-500">ID: {enrollment.id}</p>
                  </div>
                </div>
                {enrollment.status === "enrolled" ? (
                  <button
                    onClick={() => handleUnenroll(enrollment.id)}
                    disabled={unenrollingId === enrollment.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <X size={14} />
                    {unenrollingId === enrollment.id ? "Unenrolling..." : "Unenroll"}
                  </button>
                ) : enrollment.status === "unenrolled" ? (
                  <button
                    onClick={() => handleReenroll(enrollment.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-600 transition hover:bg-emerald-100"
                  >
                    <span className="text-[13px]">↺</span>
                    Re-enroll
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Program", value: courseLabel },
                  { label: "Year Level", value: yearLevel || "—" },
                  { label: "Section", value: enrollment.section?.section || "Unassigned" },
                  { label: "Semester", value: enrollment.semester?.semester || "—" },
                  { label: "School Year", value: enrollment.schoolYear?.school_year || "—" },
                  { label: "Student Type", value: enrollment.student_type || "—" },
                  { label: "Enrolled At", value: enrollment.enrolled_at ? formatDate(enrollment.enrolled_at) : "—" },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{item.label}</dt>
                    <dd className="text-[13px] font-medium text-slate-700">{item.value}</dd>
                  </div>
                ))}
              </div>

              {/* Status */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Status</p>
                <span
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-bold ${
                    enrollment.status === "enrolled"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                      : enrollment.status === "pending"
                      ? "border-yellow-200 bg-yellow-50 text-yellow-600"
                      : enrollment.status === "unenrolled"
                      ? "border-rose-200 bg-rose-50 text-rose-600"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {enrollment.status || "Unknown"}
                </span>
                {enrollment.status === "unenrolled" && (
                  <div className="text-[11px] text-slate-500 mt-2">
                    <p>
                      Unenrolled on <strong>{formatDateTime(enrollment.unenrolled_at)}</strong>
                    </p>
                    {enrollment.unenrolledBy && (
                      <p>
                        Processed by {enrollment.unenrolledBy.fName} {enrollment.unenrolledBy.lName}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className={`${cardClass} text-center`}>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
            <GraduationCap size={24} className="text-slate-400" />
          </div>
          <p className="text-[14px] font-semibold text-slate-600">No enrollment records found</p>
        </div>
      )}
    </motion.div>
  );

  const creditedSubjectRows = useMemo(() => {
    if (!Array.isArray(creditedSubjects)) return [];

    return creditedSubjects
      .map((subject) => ({
        id: subject.id,
        code: subject.code || "—",
        title: subject.title || "—",
        units: subject.credited_units ?? subject.units ?? "—",
        remarks: subject.remarks || "Credited",
        yearLevel: normalizeYearLevel(
          subject.year_level ?? subject.yearLevel ?? subject.year_level_id ?? null
        ),
        semester: subject.semester || null,
        updatedAt: subject.updated_at || null,
      }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [creditedSubjects]);

  const renderSubjects = () => {
    const enrolledSubjects = enrollmentSubjects.filter((s) => s.status !== "dropped") || [];

    const groupLabel = (subject) => {
      const rawYearLevel =
        subject.yearLevel ??
        subject.year_level ??
        subject.curriculumSubject?.yearLevel ??
        subject.curriculumSubject?.year_level ??
        subject.curriculum_subject?.yearLevel ??
        subject.curriculum_subject?.year_level ??
        subject.year_level_id ??
        subject.yearLevel_id ??
        null;

      const year = normalizeYearLevel(rawYearLevel);
      return year || "Uncategorized";
    };

    // Group by year level, then by semester
    const groupedByYearAndSemester = enrolledSubjects.reduce((acc, subject) => {
      const yearLabel = groupLabel(subject);
      
      // Get semester from enrollment first (most reliable source), then curriculum subject
      const semesterLabel = 
        subject.enrollment?.semester?.semester || 
        subject.enrollment?.semester ||
        subject.semester?.semester || 
        subject.semester || 
        subject.curriculumSubject?.semester?.semester ||
        "Semester TBA";
      
      if (!acc[yearLabel]) acc[yearLabel] = {};
      if (!acc[yearLabel][semesterLabel]) acc[yearLabel][semesterLabel] = [];
      
      acc[yearLabel][semesterLabel].push(subject);
      return acc;
    }, {});

    const hasEnrolled = enrolledSubjects.length > 0;
    const hasCredited = creditedSubjectRows.length > 0;

    if (!hasEnrolled && !hasCredited) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${cardClass} text-center`}
        >
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
            <BookOpen size={24} className="text-slate-400" />
          </div>
          <p className="text-[14px] font-semibold text-slate-600">No subject information available</p>
        </motion.div>
      );
    }

    const formatUnits = (lec, lab) => {
      const lecVal = Number(lec) || 0;
      const labVal = Number(lab) || 0;
      return labVal > 0 ? `${lecVal}/${labVal}` : `${lecVal}`;
    };

    const buildScheduleSummary = (schedule) => {
      if (!schedule) return "TBA";
      if (schedule.schedule_day && schedule.start_time && schedule.end_time) {
        return `${schedule.schedule_day} • ${formatTime(schedule.start_time)} – ${formatTime(schedule.end_time)}`;
      }
      return schedule.schedule_day || "TBA";
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {hasEnrolled && (
          <>
            {/* Group by year level */}
            {Object.entries(groupedByYearAndSemester)
              .sort((a, b) => {
                const order = { "First Year": 1, "Second Year": 2, "Third Year": 3, "Fourth Year": 4, "Fifth Year": 5 };
                return (order[a[0]] || 999) - (order[b[0]] || 999);
              })
              .map(([yearLabel, semesters]) => (
                <div key={`year-${yearLabel}`} className="space-y-3">
                  {/* Year Level Header */}
                  <div className="px-4 py-2.5 bg-blue-50 rounded-md border border-blue-200">
                    <h3 className="text-sm font-bold text-blue-900">{yearLabel}</h3>
                  </div>

                  {/* Group by semester within each year */}
                  {Object.entries(semesters).map(([semesterLabel, subjects]) => (
                    <div key={`semester-${yearLabel}-${semesterLabel}`} className="space-y-2">
                      <div className="px-3 py-1.5 bg-blue-100 rounded-md">
                        <h4 className="text-[12px] font-semibold text-blue-700">{semesterLabel}</h4>
                      </div>

                      <div className="overflow-hidden rounded-lg border border-blue-200">
                        <table className="w-full border-collapse text-[13px] text-slate-700">
                          <thead className="bg-blue-50 text-[10px] uppercase tracking-[0.18em] text-blue-600 border-b border-blue-200">
                            <tr>
                              <th className="px-3.5 py-2.5 text-left font-semibold bg-blue-100 text-slate-900">Code</th>
                              <th className="px-3.5 py-2.5 text-left font-semibold bg-blue-100 text-slate-900">Subject</th>
                              <th className="px-3.5 py-2.5 text-center font-semibold bg-blue-100 text-slate-900">Units</th>
                              <th className="px-3.5 py-2.5 text-left font-semibold bg-blue-100 text-slate-900">Schedule</th>
                              <th className="px-3.5 py-2.5 text-left font-semibold bg-blue-100 text-slate-900">Faculty</th>
                              <th className="px-3.5 py-2.5 text-left font-semibold bg-blue-100 text-slate-900">Room</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-blue-100">
                            {subjects.map((subject) => {
                              const curriculumSubject = subject.curriculumSubject || subject.curriculum_subject || {};
                              const subjectInfo = curriculumSubject.subject || subject.subject || {};
                              const schedule = subject.classSchedule || subject.class_schedule || {};
                              const faculty = schedule.faculty || schedule.faculty_member || {};
                              const classroom = schedule.classroom || schedule.room || {};

                              return (
                                <tr key={`enrolled-${subject.id}`} className="transition hover:bg-blue-50">
                                  <td className="px-3.5 py-2.5 text-[12px] font-bold text-blue-900">
                                    {subjectInfo.code || "—"}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-[12px] text-blue-700">
                                    {subjectInfo.descriptive_title || "—"}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-center text-[12px] font-medium text-blue-700">
                                    {formatUnits(curriculumSubject.lec_unit, curriculumSubject.lab_unit)}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-[12px] text-blue-700">{buildScheduleSummary(schedule)}</td>
                                  <td className="px-3.5 py-2.5 text-[12px] text-blue-700">
                                    {faculty.fName && faculty.lName ? `${faculty.fName} ${faculty.lName}` : "TBA"}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-[12px] text-blue-700">{classroom.room_number || "TBA"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </>
        )}

        {/* Credited Subjects Section */}
        {hasCredited && (
          <div className="mt-4 space-y-3">
            <div className="px-4 py-2.5 bg-blue-50 rounded-md border border-blue-200">
              <h3 className="text-sm font-bold text-blue-900">Credited Subjects</h3>
            </div>

            <div className="overflow-hidden rounded-lg border border-blue-200">
              <table className="w-full border-collapse text-[13px] text-slate-700">
                <thead className="bg-blue-50 text-[10px] uppercase tracking-[0.18em] text-blue-600 border-b border-blue-200">
                  <tr>
                    <th className="px-3.5 py-2.5 text-left font-semibold bg-blue-100 text-slate-900">Code</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold bg-blue-100 text-slate-900">Subject</th>
                    <th className="px-3.5 py-2.5 text-center font-semibold bg-blue-100 text-slate-900">Units</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold bg-blue-100 text-slate-900">Year • Semester</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold bg-blue-100 text-slate-900">Remarks</th>
                    <th className="px-3.5 py-2.5 text-left font-semibold bg-blue-100 text-slate-900">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {creditedSubjectRows.map((subject) => (
                    <tr key={`credited-row-${subject.id}`} className="transition hover:bg-blue-50">
                      <td className="px-3.5 py-2.5 text-[12px] font-bold text-blue-900">{subject.code}</td>
                      <td className="px-3.5 py-2.5 text-[12px] text-blue-700">{subject.title}</td>
                      <td className="px-3.5 py-2.5 text-center text-[12px] font-semibold text-blue-700">
                        {subject.units}
                      </td>
                      <td className="px-3.5 py-2.5 text-[12px] text-blue-600">
                        {subject.yearLevel || "—"} • {subject.semester || "—"}
                      </td>
                      <td className="px-3.5 py-2.5 text-[12px] text-blue-600">
                        {subject.remarks || "Credited"}
                      </td>
                      <td className="px-3.5 py-2.5 text-[12px] text-blue-600">
                        {subject.updatedAt ? formatDate(subject.updatedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderGrades = () => {
    const subjectsWithGrades = enrollmentSubjects.map((subject) => {
      const grade = grades.find(
        (g) => g.enrollment_id === subject.enrollment_id && g.class_schedule_id === subject.class_schedule_id
      );
      return { ...subject, grade };
    });

    const groupLabel = (subject) => {
      const rawYearLevel =
        subject.yearLevel ??
        subject.year_level ??
        subject.curriculumSubject?.yearLevel ??
        subject.curriculumSubject?.year_level ??
        subject.curriculum_subject?.yearLevel ??
        subject.curriculum_subject?.year_level ??
        subject.year_level_id ??
        subject.yearLevel_id ??
        null;

      const year = normalizeYearLevel(rawYearLevel);
      return year || "Uncategorized";
    };

    const groupedByYearAndSemester = subjectsWithGrades.reduce((acc, subject) => {
      const yearLabel = groupLabel(subject);
      // Get semester from enrollment first (most reliable source), then curriculum subject
      const semesterLabel = 
        subject.enrollment?.semester?.semester || 
        subject.enrollment?.semester ||
        subject.semester?.semester || 
        subject.semester || 
        subject.curriculumSubject?.semester?.semester ||
        "Semester TBA";
      
      if (!acc[yearLabel]) acc[yearLabel] = {};
      if (!acc[yearLabel][semesterLabel]) acc[yearLabel][semesterLabel] = [];
      acc[yearLabel][semesterLabel].push(subject);
      return acc;
    }, {});

    const yearOrder = ["First Year", "Second Year", "Third Year", "Fourth Year", "Fifth Year", "Uncategorized"];
    const sortedYears = Object.keys(groupedByYearAndSemester).sort((a, b) => {
      const indexA = yearOrder.indexOf(a);
      const indexB = yearOrder.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    return (
      <div className="space-y-6">
        {subjectsWithGrades.length > 0 ? (
          sortedYears.map((yearLabel) => (
            <motion.div
              key={`year-grade-${yearLabel}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="px-4 py-2.5 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-[12px] font-semibold uppercase tracking-[0.24em] text-blue-600">{yearLabel}</h4>
              </div>

              <div className="space-y-3 pl-2">
                {Object.entries(groupedByYearAndSemester[yearLabel]).map(([semesterLabel, items]) => (
                  <div key={`semester-grade-${yearLabel}-${semesterLabel}`} className="space-y-2">
                    <div className="px-3 py-1.5 bg-blue-100 rounded border border-blue-200">
                      <h5 className="text-[11px] font-semibold text-blue-600">{semesterLabel}</h5>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-blue-200">
                      <table className="w-full border border-blue-200 text-[13px] text-slate-700">
                        <thead className="bg-blue-50 text-[10px] uppercase tracking-[0.18em] text-blue-600">
                          <tr>
                            <th className="px-3.5 py-2 text-left bg-blue-100 text-slate-900">Subject Code</th>
                            <th className="px-3.5 py-2 text-left bg-blue-100 text-slate-900">Subject Title</th>
                            <th className="px-3.5 py-2 text-left bg-blue-100 text-slate-900">Midterm</th>
                            <th className="px-3.5 py-2 text-left bg-blue-100 text-slate-900">Final</th>
                            <th className="px-3.5 py-2 text-left bg-blue-100 text-slate-900">Final Grade</th>
                            <th className="px-3.5 py-2 text-left bg-blue-100 text-slate-900">Remarks</th>
                            <th className="px-3.5 py-2 text-left bg-blue-100 text-slate-900">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100/60">
                          {items.map((item) => {
                            const subjectInfo = resolveSubjectInfo(item);

                            const grade = item.grade || {};

                            const midtermNumeric = parseGradeNumeric(grade.midterm);
                            const finalNumeric = parseGradeNumeric(grade.final);
                            const hasMidterm = midtermNumeric !== null;
                            const hasFinal = finalNumeric !== null;
                            const computedAverage = hasMidterm && hasFinal ? (midtermNumeric + finalNumeric) / 2 : null;

                            const midterm = hasMidterm ? formatGradeValue(midtermNumeric) : "-";
                            const final = hasFinal ? formatGradeValue(finalNumeric) : "-";
                            const finalGrade = computedAverage !== null ? formatGradeValue(computedAverage) : "-";

                            const remarks =
                              hasMidterm && hasFinal
                                ? grade.remarks || (computedAverage !== null && computedAverage <= 3.0 ? "Passed" : "Failed")
                                : "-";

                            const gradeStatus = grade.final_status || grade.midterm_status || "draft";
                            const canShowStatus = hasMidterm && hasFinal;

                            return (
                              <tr key={item.id} className="transition hover:bg-blue-50/60">
                                <td className="px-3.5 py-2 text-[12px] font-semibold text-blue-700">
                                  {subjectInfo.code}
                                </td>
                                <td className="px-3.5 py-2 text-[12px] text-blue-700">
                                  {subjectInfo.title}
                                </td>
                                <td className={`px-3.5 py-2 text-[12px] text-center ${determineGradeTone(hasMidterm ? midtermNumeric : null)}`}>
                                  {midterm}
                                </td>
                                <td className={`px-3.5 py-2 text-[12px] text-center ${determineGradeTone(hasFinal ? finalNumeric : null)}`}>
                                  {final}
                                </td>
                                <td className={`px-3.5 py-2 text-[12px] font-semibold text-center ${determineGradeTone(computedAverage)}`}>
                                  {finalGrade}
                                </td>
                                <td
                                  className={`px-3.5 py-2 text-[12px] text-center ${
                                    remarks === "-" ? "text-blue-300" : determineRemarkTone(remarks)
                                  }`}
                                >
                                  {remarks}
                                </td>
                                <td className="px-3.5 py-2">
                                  {canShowStatus ? (
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${determineStatusBadgeTone(
                                          gradeStatus
                                      )}`}
                                    >
                                      {gradeStatus.charAt(0).toUpperCase() + gradeStatus.slice(1)}
                                    </span>
                                  ) : (
                                    <span className="text-[12px] text-blue-300">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))
        ) : (
          <div className={`${cardClass} text-center`}>
            <p className="text-[13px] text-slate-500">No grades available.</p>
          </div>
        )}
      </div>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "account":
        return renderAccount();
      case "student-info":
        return renderStudentInfo();
      case "enrollments":
        return renderEnrollments();
      case "subjects":
        return renderSubjects();
      case "grades":
        return renderGrades();
      default:
        return renderAccount();
    }
  };

  return (
    <ProgramHeadLayout>
      <Head title={`Student Profile - ${formatStudentName(student)}`} />

      <div className="px-4 py-5 md:px-6 md:py-6 space-y-4">
        {/* Hero Section */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="relative px-6 py-6 md:px-8 md:py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link
                  href={route("program-head.students.list")}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-600 transition hover:bg-slate-100"
                >
                  <ArrowLeft size={20} />
                </Link>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                    {formatStudentName(student) || "Student Profile"}
                  </h1>
                  <p className="text-slate-600 text-[13px] mt-1">
                    {student.id_number || "ID not available"} • {department?.name || "Department"}
                  </p>
                </div>
              </div>

              {/* Profile Picture in Hero */}
              {student.profile_picture && (
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg border border-slate-200 shadow-md overflow-hidden bg-slate-50">
                    <img
                      src={student.profile_picture.startsWith('http') ? student.profile_picture : `/storage/${student.profile_picture}`}
                      alt={formatStudentName(student)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm sticky top-4 z-40"
        >
          {[
            { key: "account", label: "Account", icon: User },
            { key: "student-info", label: "Student Info", icon: IdentificationCard },
            { key: "enrollments", label: "Enrollments", icon: GraduationCap },
            { key: "subjects", label: "Subjects", icon: BookOpen },
            { key: "grades", label: "Grades", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            return (
              <motion.button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 rounded-md border px-3.5 py-1.75 text-[13px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
                  isActive
                    ? "border-slate-300 bg-slate-50 text-slate-900 shadow-sm"
                    : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {renderActiveTab()}
      </div>
    </ProgramHeadLayout>
  );
}

