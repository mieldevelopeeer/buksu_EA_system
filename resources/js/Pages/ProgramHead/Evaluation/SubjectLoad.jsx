import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Head, router, Link, useForm, usePage } from "@inertiajs/react";
import { motion } from "framer-motion";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import { BookOpen, CheckSquare, Square, WarningCircle, PlusMinus, FileText, X, CheckCircle, DotsThreeOutlineVertical, ArrowLeft, UsersThree, Info } from "phosphor-react";
import Swal from "sweetalert2";
import axios from "axios";

const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "₱0.00";
  }

  return numeric.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
};

const formatCorTime = (time) => {
  if (!time) return "";

  const [hourStr, minuteStr] = String(time).split(":");
  if (hourStr === undefined || minuteStr === undefined) {
    return time;
  }

  let hour = Number.parseInt(hourStr, 10);
  if (!Number.isFinite(hour)) {
    return time;
  }

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;

  return `${hour}:${minuteStr} ${ampm}`;
};

const formatCorInstructor = (faculty) => {
  if (!faculty) {
    return "TBA";
  }

  const middleInitial = faculty.mName ? `${faculty.mName[0]}.` : "";
  return `${faculty.lName || ""}, ${faculty.fName || ""} ${middleInitial}`
    .replace(/\s+/g, " ")
    .trim();
};

const formatPersonName = (person) => {
  if (!person) {
    return "";
  }

  // Try direct full name properties first
  if (person.full_name && person.full_name.trim().length > 0) {
    return person.full_name.trim();
  }
  
  if (person.fullName && person.fullName.trim().length > 0) {
    return person.fullName.trim();
  }

  // Extract individual name parts with multiple naming conventions
  const firstName = person.fName || person.first_name || person.firstName || "";
  const middleName = person.mName || person.middle_name || person.middleName || "";
  const lastName = person.lName || person.last_name || person.lastName || "";

  // Build the middle initial
  const middleInitial = middleName ? `${middleName[0]}.` : "";
  
  // Compose full name: FirstName MiddleInitial LastName
  const composed = `${firstName} ${middleInitial} ${lastName}`
    .replace(/\s+/g, " ")
    .trim();

  if (composed.length > 0) {
    return composed;
  }

  // Fallback to generic display name
  if (person.name && person.name.trim().length > 0) {
    return person.name.trim();
  }

  return "";
};

const calculateCorTotalUnits = (record) => {
  if (!record?.enrollment_subjects) {
    return 0;
  }

  return record.enrollment_subjects.reduce((sum, entry) => {
    const curriculum = entry.class_schedule?.curriculum_subject;
    const lec = Number(curriculum?.lec_unit) || 0;
    const lab = Number(curriculum?.lab_unit) || 0;
    return sum + lec + lab;
  }, 0);
};

const tuitionPerUnit = 225;
const medicalAndDentalFee = 200;

const calculateCorAssessmentTotal = (record) => {
  if (!record) {
    return 0;
  }

  const units = calculateCorTotalUnits(record);
  return units * tuitionPerUnit + medicalAndDentalFee;
};

const DetailRow = ({ label, value }) => (
  <div className="flex flex-wrap items-center gap-2 text-slate-700">
    <span className="min-w-[90px] text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
      {label}
    </span>
    <span className="flex-1 text-[12px] font-medium text-slate-900">{value ?? "-"}</span>
  </div>
);

const SectionHeading = ({ title }) => (
  <h3 className="cor-section-heading text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
    {title}
  </h3>
);

const formatSchoolYearFromDates = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return null;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (!startYear || !endYear) {
    return null;
  }

  return startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`;
};

const corPrintStyles = `
  @page {
    size: A4;
    margin: 8mm;
  }
  @media print {
    html,
    body {
      background: white !important;
      padding: 0;
      margin: 0;
      height: auto;
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
    }
    body > :not(#cor-print-root) {
      display: none !important;
    }
    #cor-print-root {
      width: 100%;
      height: auto;
      display: flex;
      justify-content: center;
      padding: 0;
      margin: 0;
    }
    #cor-print-wrapper {
      position: relative;
      top: 0;
      left: auto;
      transform: none;
      width: 100%;
      max-width: calc(210mm - 16mm);
      height: auto !important;
      max-height: none !important;
      margin: -4mm 0 0;
      padding: 6mm;
      box-sizing: border-box;
      background: white;
      color: #0f172a;
      font-size: 10.2px;
      line-height: 1.32;
      box-shadow: none !important;
      overflow: visible !important;
      page-break-before: avoid;
      page-break-after: avoid;
    }
    #cor-print-wrapper h1,
    #cor-print-wrapper h2,
    #cor-print-wrapper h3,
    #cor-print-wrapper h4 {
      margin: 0;
      font-weight: 600;
      color: #0f172a;
    }
    #cor-print-wrapper h1 {
      font-size: 14px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    #cor-print-wrapper h2,
    #cor-print-wrapper h3 {
      font-size: 11.5px;
      letter-spacing: 0.02em;
    }
    #cor-print-wrapper table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.1px;
    }
    #cor-print-wrapper table th,
    #cor-print-wrapper table td {
      padding: 1.3mm 0.9mm;
    }
    #cor-print-wrapper table tr {
      page-break-inside: avoid;
    }
    #cor-print-wrapper .cor-info-grid {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4mm;
    }
    #cor-print-wrapper .cor-assessment-summary {
      display: grid !important;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
      gap: 4mm;
      align-items: start;
    }
    #cor-print-wrapper .cor-card {
      border: 0.2mm solid #d7dce3;
      border-radius: 3mm;
      padding: 3mm;
      background: #fff;
      box-shadow: none;
    }
    #cor-print-wrapper .cor-card + .cor-card {
      margin-top: 3mm;
    }
    #cor-print-wrapper .cor-card table thead {
      background: #eef2ff;
      color: #27303f;
      border-bottom: 0.2mm solid #c7d2fe;
    }
    #cor-print-wrapper .cor-card table th {
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    #cor-print-wrapper .cor-card table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    #cor-print-wrapper .cor-info-grid span:first-child,
    #cor-print-wrapper .cor-info-grid p span:first-child {
      font-weight: 600;
      color: #0f172a;
    }
    #cor-print-wrapper .cor-footer {
      margin-top: 3mm;
    }
    .print-hidden {
      display: none !important;
    }
  }
`;

export default function SubjectLoad({
  availableSubjects = [],
  enrollment = {},
  creditedSubjects = [],
  preselectedSubjects = [],
  creditCatalog = [],
  recommendedSubjects = [],
  attentionNeeded = [],
  academicSummary = {},
  loadWarning = null,
  loadError = null,
  evaluator = null,
}) {
  const { auth } = usePage();
  const corPrintRootRef = useRef(null);
  const [isCorPortalReady, setIsCorPortalReady] = useState(false);
  const authUser = auth?.user ?? null;
  
  // Determine if student is continuing (has previous enrollments)
  const isContinuingStudent = useMemo(() => {
    if (!enrollment?.student?.enrollments) return false;
    const currentEnrollmentId = enrollment?.id;
    const previousEnrollments = Array.isArray(enrollment.student.enrollments) 
      ? enrollment.student.enrollments.filter(e => e.id !== currentEnrollmentId)
      : [];
    return previousEnrollments.length > 0;
  }, [enrollment]);

  // Determine if student is irregular
  const isIrregularStudent = useMemo(() => {
    return enrollment?.student?.student_status === "Irregular" || 
           enrollment?.student?.student_detail?.student_status === "Irregular";
  }, [enrollment]);
  // Handle potential errors in preselectedSubjects
  const [selectedSubjects, setSelectedSubjects] = useState(() => {
    try {
      return Array.isArray(preselectedSubjects)
        ? preselectedSubjects.filter(Boolean)
        : [];
    } catch (error) {
      return [];
    }
  });
  const [subjectQuery, setSubjectQuery] = useState("");
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [showSubjectListModal, setShowSubjectListModal] = useState(false);
  const [showCorModal, setShowCorModal] = useState(false);
  const [curriculumYearFilter, setCurriculumYearFilter] = useState("All");
  const [curriculumSemesterFilter, setCurriculumSemesterFilter] = useState("All");
  const [manualSubjects, setManualSubjects] = useState([]);
  const [dismissedEligibleSubjects, setDismissedEligibleSubjects] = useState([]);
  const [gradesData, setGradesData] = useState({});
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesError, setGradesError] = useState("");
  const [tentativeSelections, setTentativeSelections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showOtherCurriculumModal, setShowOtherCurriculumModal] = useState(false);
  const [otherCurriculumResults, setOtherCurriculumResults] = useState([]);
  const [otherCurriculumCourses, setOtherCurriculumCourses] = useState([]);
  const [otherCurriculumCourseId, setOtherCurriculumCourseId] = useState('');
  const [otherCurriculumSearch, setOtherCurriculumSearch] = useState('');
  const [otherCurriculumLoading, setOtherCurriculumLoading] = useState(false);
  const [otherCurriculumError, setOtherCurriculumError] = useState('');
  const [showFullSubjectList, setShowFullSubjectList] = useState(false);
  const [subjectListSearch, setSubjectListSearch] = useState('');
  const otherCurriculumTableRows = useMemo(() => {
    if (!Array.isArray(otherCurriculumResults)) {
      return [];
    }

    const rows = [];
    otherCurriculumResults.forEach((curriculum) => {
      if (!Array.isArray(curriculum.subjects)) {
        return;
      }

      curriculum.subjects.forEach((subject) => {
        rows.push({
          key: `${curriculum.id}-${subject.curriculum_subject_id}`,
          curriculum,
          subject,
        });
      });
    });

    return rows;
  }, [otherCurriculumResults]);

  const corStudentRecord = useMemo(() => {
    if (!enrollment || Object.keys(enrollment).length === 0) {
      return null;
    }

    return {
      ...enrollment,
      enrollment_subjects: Array.isArray(enrollment?.enrollment_subjects)
        ? enrollment.enrollment_subjects
        : [],
    };
  }, [enrollment]);

  const corTotalUnits = useMemo(() => calculateCorTotalUnits(corStudentRecord), [corStudentRecord]);
  const corAssessmentTotal = useMemo(() => calculateCorAssessmentTotal(corStudentRecord), [corStudentRecord]);
  const corPreviousBalance = useMemo(() => Number(corStudentRecord?.previous_balance) || 0, [corStudentRecord]);
  const corCurrentReceivable = useMemo(
    () => corAssessmentTotal + corPreviousBalance,
    [corAssessmentTotal, corPreviousBalance]
  );
  const corEvaluatorName = useMemo(() => {
    // Priority 1: Use the authenticated user (current program head or faculty)
    if (authUser) {
      // Try the dedicated full_name attribute first
      let fullName = authUser.full_name || "";
      
      // Fallback to individual name parts
      if (!fullName || fullName.trim().length === 0) {
        const fName = authUser.fName || authUser.first_name || "";
        const mName = authUser.mName || authUser.middle_name || "";
        const lName = authUser.lName || authUser.last_name || "";
        const middleInitial = mName ? `${mName[0]}.` : "";
        fullName = `${fName} ${middleInitial} ${lName}`.replace(/\s+/g, " ").trim();
      }
      
      // Final fallback to generic name property
      if (!fullName || fullName.trim().length === 0) {
        fullName = authUser.name || "";
      }
      
      if (fullName && fullName.trim().length > 0) {
        return fullName.trim();
      }
    }

    // Priority 2: Check stored evaluator in enrollment (for historical records)
    // This handles the case where a different evaluator previously processed it
    const sources = [
      evaluator,
      corStudentRecord?.evaluator,
      corStudentRecord?.processed_by,
      enrollment?.evaluator,
      enrollment?.processed_by,
    ].filter(Boolean);

    for (const source of sources) {
      const formatted = formatPersonName(source);
      if (formatted && formatted.trim().length > 0) {
        return `${formatted.trim()} (Processed by)`;
      }
    }

    return "N/A";
  }, [authUser, corStudentRecord?.evaluator, corStudentRecord?.processed_by, evaluator, enrollment?.evaluator, enrollment?.processed_by]);

  const corPeriodLabel = useMemo(() => {
    const semesterLabel =
      corStudentRecord?.semester?.semester ||
      corStudentRecord?.semester_name ||
      enrollment?.semester?.semester ||
      enrollment?.semester_name ||
      "First Semester";

    const schoolYearCandidates = [
      {
        start: corStudentRecord?.school_year?.start_date,
        end: corStudentRecord?.school_year?.end_date,
      },
      {
        start: corStudentRecord?.school_year_start,
        end: corStudentRecord?.school_year_end,
      },
      {
        start: enrollment?.school_year?.start_date,
        end: enrollment?.school_year?.end_date,
      },
      {
        start: enrollment?.school_year_start,
        end: enrollment?.school_year_end,
      },
    ];

    let schoolYearValue = null;
    for (const candidate of schoolYearCandidates) {
      const computed = formatSchoolYearFromDates(candidate.start, candidate.end);
      if (computed) {
        schoolYearValue = computed;
        break;
      }
    }

    if (!schoolYearValue) {
      schoolYearValue =
        corStudentRecord?.school_year?.school_year ||
        corStudentRecord?.school_year_name ||
        enrollment?.school_year?.school_year ||
        enrollment?.school_year_name ||
        "2025-2026";
    }

    return `${semesterLabel}, ${schoolYearValue}`;
  }, [
    corStudentRecord?.semester?.semester,
    corStudentRecord?.semester_name,
    corStudentRecord?.school_year?.school_year,
    corStudentRecord?.school_year_name,
    corStudentRecord?.school_year?.start_date,
    corStudentRecord?.school_year?.end_date,
    corStudentRecord?.school_year_start,
    corStudentRecord?.school_year_end,
    enrollment?.semester?.semester,
    enrollment?.semester_name,
    enrollment?.school_year?.school_year,
    enrollment?.school_year_name,
    enrollment?.school_year?.start_date,
    enrollment?.school_year?.end_date,
    enrollment?.school_year_start,
    enrollment?.school_year_end,
  ]);

  useEffect(() => {
    if (!corStudentRecord && showCorModal) {
      setShowCorModal(false);
    }
  }, [corStudentRecord, showCorModal]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    let root = document.getElementById("cor-print-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "cor-print-root";
      document.body.appendChild(root);
    }

    corPrintRootRef.current = root;
    setIsCorPortalReady(true);

    return () => {
      if (root && root.childNodes.length === 0) {
        root.remove();
      }
    };
  }, []);

  const [submissionFeedback, setSubmissionFeedback] = useState({ success: null, error: null });

  const { data, setData, post, processing, errors, reset } = useForm({
    enrollment_id: enrollment?.id ?? null,
    class_schedule_ids: [],
  });

  const autoLoadSignatureRef = useRef("");
  const autoLoadToastShownRef = useRef(false);
  const autoLoadAttemptedRef = useRef(false);
  const eligibleAutoLoadSignatureRef = useRef("");

  const enrollmentSectionId = useMemo(() => Number(enrollment?.section_id) || null, [enrollment?.section_id]);

  const showToast = useCallback(
    (overrides = {}) => {
      Swal.fire({
        toast: true,
        position: "top-end",
        timer: 2500,
        timerProgressBar: true,
        showConfirmButton: false,
        ...overrides,
      });
    },
    []
  );

  const normalizeYearLevel = useCallback((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const lookup = new Map([
      ["1", "1"],
      ["1st", "1"],
      ["first year", "1"],
      ["second year", "2"],
      ["2", "2"],
      ["2nd", "2"],
      ["third year", "3"],
      ["3", "3"],
      ["3rd", "3"],
      ["fourth year", "4"],
      ["4", "4"],
      ["4th", "4"],
    ]);

    const raw = String(value).trim().toLowerCase();
    if (lookup.has(raw)) {
      return lookup.get(raw);
    }

    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      return String(numeric);
    }

    return raw;
  }, []);

  const formatUnitsLabel = useCallback((value) => {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      const formatted = Number.isInteger(numeric) ? numeric : Number(numeric.toFixed(1));
      return `${formatted} unit${numeric === 1 ? "" : "s"}`;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }

    return "0 units";
  }, []);

  const formatUnitValue = useCallback((value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return "0";
    }

    return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
  }, []);

  const normalizeSemesterLabel = useCallback((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const lookup = new Map([
      ["1", "1"],
      ["first", "1"],
      ["first semester", "1"],
      ["first sem", "1"],
      ["2", "2"],
      ["second", "2"],
      ["second semester", "2"],
      ["second sem", "2"],
      ["midyear", "midyear"],
      ["mid-year", "midyear"],
      ["summer", "midyear"],
    ]);

    const raw = String(value).trim().toLowerCase();
    if (lookup.has(raw)) {
      return lookup.get(raw);
    }

    const numeric = raw.match(/\d+/);
    if (numeric) {
      return numeric[0];
    }

    return raw;
  }, []);

  const enrollmentYearLevelCode = useMemo(() => {
    const value =
      enrollment?.year_level?.year_level ??
      enrollment?.year_level_name ??
      enrollment?.year_level ??
      null;

    return normalizeYearLevel(value);
  }, [enrollment?.year_level?.year_level, enrollment?.year_level_name, enrollment?.year_level, normalizeYearLevel]);

  const enrollmentSemesterCode = useMemo(() => {
    const value =
      enrollment?.semester?.semester ??
      enrollment?.semester_name ??
      null;

    return normalizeSemesterLabel(value);
  }, [enrollment?.semester?.semester, enrollment?.semester_name, normalizeSemesterLabel]);

  useEffect(() => {
    setData("enrollment_id", enrollment?.id ?? null);
  }, [enrollment?.id, setData]);

  useEffect(() => {
    if (!submissionFeedback?.success) return;
    showToast({ icon: "success", title: submissionFeedback.success });
    setSubmissionFeedback((prev) => ({ ...prev, success: null }));
  }, [submissionFeedback?.success, showToast]);

  useEffect(() => {
    if (!submissionFeedback?.error) return;
    showToast({ icon: "error", title: submissionFeedback.error });
    setSubmissionFeedback((prev) => ({ ...prev, error: null }));
  }, [submissionFeedback?.error, showToast]);

  useEffect(() => {
    if (!errors || Object.keys(errors).length === 0) {
      return;
    }

    const firstError = Object.values(errors)[0];
    if (firstError) {
      showToast({ icon: "error", title: firstError });
    }
  }, [errors, showToast]);

  const resolvedSectionLabel = useMemo(() => {
    if (!enrollment) return "";

    if (enrollment?.section) {
      if (typeof enrollment.section === "object") {
        return enrollment.section.name || enrollment.section.section || "";
      }

      if (typeof enrollment.section === "string") {
        return enrollment.section;
      }
    }

    if (enrollment?.section_name) {
      return enrollment.section_name;
    }

    if (enrollment?.section_id !== undefined && enrollment?.section_id !== null) {
      return `Section ${enrollment.section_id}`;
    }

    if (enrollment?.student?.section) {
      return enrollment.student.section.section || enrollment.student.section.name || "";
    }

    if (enrollment?.student?.section_id) {
      return `Section ${enrollment.student.section_id}`;
    }

    if (enrollment?.enrollment?.section) {
      return enrollment.enrollment.section.section || enrollment.enrollment.section.name || "";
    }

    const fallbackKey = Object.keys(enrollment || {}).find((key) =>
      key.toLowerCase().includes("section") && enrollment[key]
    );

    if (!fallbackKey) {
      return "";
    }

    const fallbackValue = enrollment[fallbackKey];
    if (typeof fallbackValue === "object") {
      return fallbackValue.section || fallbackValue.name || "";
    }

    return fallbackValue || "";
  }, [enrollment]);

  const studentMetaDetails = useMemo(() => {
    if (!enrollment?.student) {
      return "";
    }

    const baseLine = `ID: ${enrollment.student.id_number || 'N/A'} • ${enrollment.program?.name || 'N/A'} • ${enrollment.year_level?.year_level || 'N/A'}`;
    return resolvedSectionLabel ? `${baseLine} • Section: ${resolvedSectionLabel}` : baseLine;
  }, [enrollment, resolvedSectionLabel]);

  const studentShortName = useMemo(() => {
    if (enrollment?.student?.fName) return enrollment.student.fName;
    if (enrollment?.student?.lName) return enrollment.student.lName;
    return "the student";
  }, [enrollment?.student?.fName, enrollment?.student?.lName]);

  const programCourseLabel = useMemo(() => {
    const courseCandidates = [
      enrollment?.course,
      enrollment?.program,
      corStudentRecord?.course,
      corStudentRecord?.program,
    ].filter(Boolean);
    const course = courseCandidates[0] || {};
    const courseLabel =
      course?.code ||
      course?.course_code ||
      course?.name ||
      course?.course_name ||
      enrollment?.program_code ||
      enrollment?.program_name ||
      "-";

    const majorCandidates = [
      enrollment?.major,
      corStudentRecord?.major,
    ].filter(Boolean);
    const major = majorCandidates[0] || {};
    const majorLabel =
      major?.code ||
      major?.name ||
      enrollment?.major_code ||
      enrollment?.major_name ||
      "";

    return majorLabel ? `${courseLabel} ${majorLabel}`.trim() : courseLabel;
  }, [
    enrollment?.course,
    enrollment?.program,
    enrollment?.program_code,
    enrollment?.program_name,
    enrollment?.major,
    enrollment?.major_code,
    enrollment?.major_name,
    corStudentRecord?.course,
    corStudentRecord?.program,
    corStudentRecord?.major,
  ]);

  const corCourseMajorLabel = useMemo(() => {
    const courseCandidates = [
      corStudentRecord?.course,
      corStudentRecord?.program,
      enrollment?.course,
      enrollment?.program,
    ].filter(Boolean);
    const course = courseCandidates[0] || {};
    const courseLabel =
      course?.code ||
      course?.course_code ||
      course?.name ||
      course?.course_name ||
      enrollment?.program_code ||
      enrollment?.program_name ||
      "-";

    const majorCandidates = [
      corStudentRecord?.major,
      enrollment?.major,
    ].filter(Boolean);
    const major = majorCandidates[0] || {};
    const majorLabel =
      major?.code ||
      major?.name ||
      enrollment?.major_code ||
      enrollment?.major_name ||
      "";

    return majorLabel ? `${courseLabel} ${majorLabel}`.trim() : courseLabel;
  }, [
    corStudentRecord?.course,
    corStudentRecord?.program,
    corStudentRecord?.major,
    enrollment?.course,
    enrollment?.program,
    enrollment?.program_code,
    enrollment?.program_name,
    enrollment?.major,
    enrollment?.major_code,
    enrollment?.major_name,
  ]);

  const getCurriculumItemKey = useCallback((item) => {
    if (!item) return null;

    const subjectData = item.subject || item.subjectInfo || {};

    const normalizeValue = (value) => {
      if (value === null || value === undefined) {
        return null;
      }

      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return String(numeric);
      }

      return String(value).trim().toLowerCase();
    };

    const subjectId = normalizeValue(item.subject_id ?? item.curriculum_subject_id ?? subjectData.id);
    const code = normalizeValue(subjectData.code ?? subjectData.subject_code ?? item.code);
    const semester = normalizeValue(item.semesterName ?? item.semester ?? subjectData.semester);
    const fallbackId = normalizeValue(item.id ?? item.subjectCatalogId ?? item.curriculum_subject_id);

    if (subjectId) {
      return semester ? `subject:${subjectId}|semester:${semester}` : `subject:${subjectId}`;
    }

    if (code) {
      return semester ? `code:${code}|semester:${semester}` : `code:${code}`;
    }

    return fallbackId ? `id:${fallbackId}` : null;
  }, []);

  // Helper function to get a unique key for each subject
  const getSubjectKey = useCallback((subject) => {
    if (!subject) return 'unknown';
    
    // Try to get the most specific ID first
    if (subject.id) return `id:${subject.id}`;
    if (subject.subject_id) return `subject_id:${subject.subject_id}`;
    if (subject.curriculum_subject_id) return `curriculum_subject_id:${subject.curriculum_subject_id}`;
    
    // Fallback to code if no ID is available
    const code = subject.subject?.code || subject.code;
    if (code) return `code:${code}`;
    
    // Last resort - use a combination of available properties
    return `${subject.subject?.code || 'unknown'}-${subject.year_level_id || 0}-${subject.semesters_id || 0}`;
  }, []);

  const buildSubjectIdentifierSet = useCallback((subject) => {
    const identifiers = new Set();
    if (!subject) {
      return identifiers;
    }

    const push = (value) => {
      if (value === undefined || value === null) return;
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        identifiers.add(numeric);
      }
      identifiers.add(String(value));
    };

    push(subject.id);
    push(subject.subject_id);
    push(subject.curriculum_subject_id);
    push(subject.curriculumSubjectId);
    push(subject.subjectKey);

    const subjectCode = subject.subject?.code || subject.subject_code || subject.code;
    if (subjectCode) {
      identifiers.add(`code:${String(subjectCode).toLowerCase()}`);
    }

    const key = getSubjectKey(subject);
    if (key) {
      identifiers.add(key);
    }

    return identifiers;
  }, [getSubjectKey]);

  const normalizeIdentifier = useCallback((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "object") {
      const candidate =
        value.id ??
        value.subject_id ??
        value.subjectId ??
        value.schedule_id ??
        value.scheduleId ??
        value.class_schedule_id ??
        value.classScheduleId ??
        value.curriculum_subject_id ??
        value.curriculumSubjectId ??
        null;

      if (candidate === null || candidate === undefined) {
        return null;
      }

      const numericCandidate = Number(candidate);
      if (Number.isFinite(numericCandidate)) {
        return numericCandidate;
      }

      return String(candidate);
    }

    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }

    if (typeof value === "string" && value.trim().length === 0) {
      return null;
    }

    return String(value);
  }, []);

  const matchesEnrollmentSection = useCallback(
    (schedule) => {
      if (!schedule) return false;

      const scheduleSectionId = Number(
        schedule.section_id ??
          schedule.sectionId ??
          schedule.sectionID ??
          schedule.sectionID ??
          schedule.class_section_id ??
          schedule.classSectionId
      );

      if (
        Number.isFinite(enrollmentSectionId) &&
        Number.isFinite(scheduleSectionId) &&
        scheduleSectionId === enrollmentSectionId
      ) {
        return true;
      }

      if (!resolvedSectionLabel) {
        return false;
      }

      const scheduleLabel =
        schedule.section ||
        schedule.section_name ||
        schedule.sectionName ||
        schedule.sectionLabel ||
        null;

      if (!scheduleLabel) {
        return false;
      }

      return (
        String(scheduleLabel).trim().toLowerCase() ===
        String(resolvedSectionLabel).trim().toLowerCase()
      );
    },
    [enrollmentSectionId, resolvedSectionLabel]
  );

  // Toggle subject selection
  const toggleSubjectSelection = (subject) => {
    setTentativeSelections(prev => {
      const exists = prev.some(s => getSubjectKey(s) === getSubjectKey(subject));
      if (exists) {
        return prev.filter(s => getSubjectKey(s) !== getSubjectKey(subject));
      } else {
        return [...prev, subject];
      }
    });
  };

  // Confirm selection and add to selected subjects
  const confirmSelection = () => {
    setSelectedSubjects(prev => {
      // Filter out any duplicates
      const newSelections = tentativeSelections.filter(newSubj => 
        !prev.some(existing => getSubjectKey(existing) === getSubjectKey(newSubj))
      );
      return [...prev, ...newSelections];
    });
    setTentativeSelections([]);
  };

  // Remove a subject from selected list
  const removeSelectedSubject = (subjectToRemove) => {
    setSelectedSubjects(prev => 
      prev.filter(subj => getSubjectKey(subj) !== getSubjectKey(subjectToRemove))
    );
  };

  // Get filtered subjects based on active tab
  const getFilteredSubjects = useCallback(() => {
    try {
      if (Array.isArray(recommendedSubjects) && recommendedSubjects.length > 0) {
        return recommendedSubjects;
      }

      if (Array.isArray(creditCatalog) && creditCatalog.length > 0) {
        return creditCatalog;
      }

      if (Array.isArray(availableSubjects)) {
        return availableSubjects;
      }

      return [];
    } catch (error) {
      return [];
    }
  }, [recommendedSubjects, creditCatalog, availableSubjects]);

  // Get subjects from curriculum and check prerequisites
  const creditedSubjectSet = useMemo(() => {
    const set = new Set();
    (creditedSubjects || []).forEach((id) => {
      if (id === null || id === undefined) {
        return;
      }
      const numeric = Number(id);
      if (Number.isFinite(numeric)) {
        set.add(numeric);
      }
      set.add(String(id));
    });
    return set;
  }, [creditedSubjects]);

  const isSubjectCredited = useCallback(
    (value) => {
      if (value === null || value === undefined) {
        return false;
      }
      const numeric = Number(value);
      if (Number.isFinite(numeric) && creditedSubjectSet.has(numeric)) {
        return true;
      }
      return creditedSubjectSet.has(String(value));
    },
    [creditedSubjectSet]
  );

  const subjects = useMemo(() => {
    const subjectsToProcess = getFilteredSubjects();
    
    // For continuing students, include all previously enrolled subjects as completed
    const completedSubjects = (() => {
      const baseCompleted = Array.isArray(enrollment?.completed_subjects)
        ? [...enrollment.completed_subjects]
        : [];

      if (isContinuingStudent && enrollment?.student?.enrollments) {
        // Get all subjects from previous enrollments
        const previousEnrollments = enrollment.student.enrollments.filter(
          e => e.id !== enrollment.id && Array.isArray(e.enrollment_subjects)
        );
        
        previousEnrollments.forEach(enrollment => {
          enrollment.enrollment_subjects.forEach(subject => {
            // Only add if not already in completed subjects
            const exists = baseCompleted.some(
              s => s.subject_id === subject.subject_id || 
                   s.curriculum_subject_id === subject.curriculum_subject_id
            );
            if (!exists && subject.subject) {
              baseCompleted.push({
                ...subject,
                is_from_previous_enrollment: true
              });
            }
          });
        });
      }
      
      return baseCompleted;
    })();

    const pickUnitValue = (...sources) => {
      for (const source of sources) {
        if (source === null || source === undefined || source === "") {
          continue;
        }

        const numeric = Number(source);
        if (Number.isFinite(numeric) && numeric > 0) {
          return numeric;
        }
      }

      return 0;
    };

    const normalizeSubject = (subject, context = {}) => {
      if (!subject) return null;

      const subjectInfo = subject.subject || subject.subjectInfo || context.subject || {};
      const schedules = Array.isArray(subject.schedules)
        ? subject.schedules
        : Array.isArray(context.schedules)
          ? context.schedules
          : [];
      const prerequisites = Array.isArray(subject.prerequisites)
        ? subject.prerequisites
        : Array.isArray(context.prerequisites)
          ? context.prerequisites
          : [];
      let hasPrerequisites = prerequisites.length > 0;
      let prerequisitesMet = !hasPrerequisites; // Default to true if no prerequisites

      // Only check prerequisites if this is not from a previous enrollment
      if (hasPrerequisites && !subject.is_from_previous_enrollment) {
        prerequisitesMet = prerequisites.every((prereq) => {
          const prereqId = prereq?.subject_id ?? prereq?.subjectId ?? prereq?.id ?? prereq;
          if (!prereqId) {
            const code = prereq?.code ?? prereq?.subject?.code;
            return Boolean(code) && completedSubjects.some((entry) => {
              const completedCode = entry?.subject?.code ?? entry?.code;
              return String(completedCode).toLowerCase() === String(code).toLowerCase();
                return completedCode && String(completedCode).toLowerCase() === String(code).toLowerCase();
              });
            }
            return completedSubjects.some((entry) => {
              const completedId = entry?.subject_id ?? entry?.subjectId ?? entry?.id;
              return String(completedId) === String(prereqId);
            });
          });
      }

      const curriculumSubject =
        subject.curriculum_subject ||
        subject.curriculumSubject ||
        context.curriculum_subject ||
        context.curriculumSubject ||
        {};

      const lecUnit = pickUnitValue(
        subject.lec_unit,
        subject.lecUnit,
        subjectInfo.lec_unit,
        subjectInfo.lecUnits,
        curriculumSubject.lec_unit,
        curriculumSubject.lecUnits,
        curriculumSubject.lec
      );

      const labUnit = pickUnitValue(
        subject.lab_unit,
        subject.labUnit,
        subjectInfo.lab_unit,
        subjectInfo.labUnits,
        curriculumSubject.lab_unit,
        curriculumSubject.labUnits,
        curriculumSubject.lab
      );

      const normalized = {
        ...subject,
        subject: subjectInfo,
        year_level:
          subject.year_level ||
          context.year_level ||
          (context.yearLevelName ? { year_level: context.yearLevelName } : { year_level: "N/A" }),
        semester:
          subject.semester ||
          context.semester ||
          (context.semesterName ? { semester: context.semesterName } : { semester: "N/A" }),
        is_curriculum: context.isCurriculum ?? subject.is_curriculum ?? false,
        id:
          subject.id ??
          subject.subject_id ??
          subjectInfo?.id ??
          Math.random().toString(36).slice(2, 10),
        subject_id:
          subject.subject_id ??
          subjectInfo?.id ??
          context.subject_id ??
          null,
        lec_unit: lecUnit,
        lab_unit: labUnit,
        curriculum_subject: curriculumSubject,
        schedules,
        has_prerequisites: hasPrerequisites,
        prerequisites_met: prerequisitesMet,
        prerequisites,
        is_credited: isSubjectCredited(
          subject.curriculum_subject_id ?? subject.id ?? subject.subject_id ?? null
        ),
      };

      if (typeof normalized.hasAnySchedules === "undefined") {
        normalized.hasAnySchedules = schedules.length > 0;
      }

      if (typeof normalized.hasFailedPrerequisites === "undefined") {
        normalized.hasFailedPrerequisites = hasPrerequisites && !prerequisitesMet;
      }

      return normalized;
    };

    if (!Array.isArray(subjectsToProcess) || subjectsToProcess.length === 0) {
      if (Array.isArray(availableSubjects) && availableSubjects.length > 0) {
        return availableSubjects
          .map((subject) => normalizeSubject(subject, { isCurriculum: false }))
          .filter(Boolean);
      }
      return [];
    }

    const containsCurriculumGroups = subjectsToProcess.some((entry) => Array.isArray(entry?.subjects));

    if (containsCurriculumGroups) {
      const flattened = [];
      subjectsToProcess.forEach((group) => {
        const yearLevelName = group?.year_level_name || group?.label || group?.year_level || "Unknown";

        (group?.subjects || []).forEach((subject) => {
          const semesterObj = subject?.semester;
          const semesterName =
            (typeof semesterObj === "object" ? semesterObj?.semester : semesterObj) ||
            subject?.semesterName ||
            group?.semesterName ||
            "Unassigned Semester";

          const normalized = normalizeSubject(subject, {
            year_level: subject?.year_level,
            yearLevelName,
            semester:
              typeof semesterObj === "object"
                ? semesterObj
                : { semester: semesterName },
            semesterName,
            isCurriculum: true,
          });

          if (normalized) {
            flattened.push(normalized);
          }
        });
      });

      return flattened;
    }

    return subjectsToProcess.map((subject) => normalizeSubject(subject)).filter(Boolean);
  }, [availableSubjects, enrollment?.completed_subjects, getFilteredSubjects, isSubjectCredited]);

  const availableSubjectMap = useMemo(() => {
    const map = new Map();
    subjects.forEach((subject) => {
      const identifiers = new Set();
      const primaryId = Number(subject.id);
      if (Number.isFinite(primaryId)) identifiers.add(primaryId);
      if (subject.id) identifiers.add(String(subject.id));

      const relatedSubjectId = Number(subject.subject_id);
      if (Number.isFinite(relatedSubjectId)) identifiers.add(relatedSubjectId);
      if (subject.subject_id) identifiers.add(String(subject.subject_id));

      const nestedSubjectId = Number(subject?.subject?.id);
      if (Number.isFinite(nestedSubjectId)) identifiers.add(nestedSubjectId);
      if (subject?.subject?.id) identifiers.add(String(subject.subject?.id));

      const subjectCode = subject?.subject?.code;
      if (subjectCode) {
        identifiers.add(`code:${String(subjectCode).toLowerCase()}`);
      }

      identifiers.forEach((id) => {
        if (!map.has(id)) {
          map.set(id, subject);
        }
      });
    });
    return map;
  }, [subjects]);


  const subjectsByYearLevel = useMemo(() => {
    const labelMap = new Map([
      ["1", "First Year"],
      ["1st Year", "First Year"],
      ["First Year", "First Year"],
      ["2", "Second Year"],
      ["2nd Year", "Second Year"],
      ["Second Year", "Second Year"],
      ["3", "Third Year"],
      ["3rd Year", "Third Year"],
      ["Third Year", "Third Year"],
      ["4", "Fourth Year"],
      ["4th Year", "Fourth Year"],
      ["Fourth Year", "Fourth Year"],
    ]);

    const groups = new Map();

    subjects.forEach((subject) => {
      const raw = subject?.year_level?.year_level;
      const label = labelMap.get(String(raw).trim()) || "Unassigned Year Level";
      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label).push(subject);
    });

    const order = ["First Year", "Second Year", "Third Year", "Fourth Year", "Unassigned Year Level"];

    return Array.from(groups.entries())
      .map(([label, items]) => ({
        label,
        items: items.slice().sort((a, b) => {
          const codeA = a?.subject?.code || "";
          const codeB = b?.subject?.code || "";
          return codeA.localeCompare(codeB);
        }),
      }))
      .sort((a, b) => {
        const indexA = order.indexOf(a.label);
        const indexB = order.indexOf(b.label);
        return (indexA === -1 ? order.length : indexA) - (indexB === -1 ? order.length : indexB);
      });
  }, [subjects]);

  const curriculumCatalogGroups = useMemo(() => {
    if (Array.isArray(creditCatalog) && creditCatalog.length > 0) {
      const order = ["First Year", "Second Year", "Third Year", "Fourth Year", "Unassigned Year Level"];

      return creditCatalog
        .map((entry) => {
          const label = entry?.year_level_name || "Unassigned Year Level";
          const seen = new Set();
          const items = Array.isArray(entry?.subjects)
            ? entry.subjects.reduce((acc, subject) => {
                const subjectInfo = subject?.subject || {};
                const rawSemester = subject?.semester || null;
                const semesterId = subject?.semesters_id ?? (rawSemester && rawSemester.id) ?? null;
                let semesterName = "Unassigned Semester";

                if (rawSemester) {
                  if (typeof rawSemester === "object") {
                    semesterName = rawSemester.semester || "Unassigned Semester";
                  } else if (typeof rawSemester === "string") {
                    semesterName = rawSemester || "Unassigned Semester";
                  }
                }

                const normalizedId = Number(subject?.id) || subject?.id;
                const dedupeKey = getCurriculumItemKey({
                  id: normalizedId,
                  subject_id: subject?.subject_id,
                  subject: subjectInfo,
                  code: subjectInfo?.code,
                  descriptive_title: subjectInfo?.descriptive_title,
                  semesterName,
                });
                if (dedupeKey && seen.has(dedupeKey)) {
                  return acc;
                }
                if (dedupeKey) {
                  seen.add(dedupeKey);
                }

                acc.push({
                  id: normalizedId,
                  subject: subjectInfo,
                  subject_id: subject?.subject_id,
                  lec_unit: subject?.lec_unit,
                  lab_unit: subject?.lab_unit,
                  type: subject?.type,
                  semesterId,
                  semesterName,
                  prerequisiteCodes: Array.isArray(subject?.prerequisites)
                    ? subject.prerequisites.map((pre) => pre?.code || pre)
                    : Array.isArray(subject?.prerequisite_subject_codes)
                      ? subject.prerequisite_subject_codes
                      : [],
                });

                return acc;
              }, [])
            : [];

          return {
            label,
            items,
            sortKey: order.indexOf(label) === -1 ? order.length : order.indexOf(label),
          };
        })
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(({ sortKey, ...rest }) => rest);
    }

    return subjectsByYearLevel.map((group) => {
      const seen = new Set();
      return {
        label: group.label,
        items: group.items.reduce((acc, subject) => {
          const semesterObj = subject?.semester || null;
          const semesterName = semesterObj?.semester || subject?.sourceSemester || "Unassigned Semester";
          const normalizedId = Number(subject.id) || subject.id;
          const dedupeKey = getCurriculumItemKey({
            id: normalizedId,
            subject_id: subject?.subject_id,
            subject: subject?.subject,
            code: subject?.subject?.code,
            descriptive_title: subject?.subject?.descriptive_title,
            semesterName,
          });
          if (dedupeKey && seen.has(dedupeKey)) {
            return acc;
          }
          if (dedupeKey) {
            seen.add(dedupeKey);
          }

          const isCredited = isSubjectCredited(
            subject?.id ?? subject?.subject_id ?? subject?.curriculum_subject_id ?? null
          );

          acc.push({
            id: normalizedId,
            subject: subject?.subject,
            subject_id: subject?.subject_id,
            lec_unit: subject?.lec_unit,
            lab_unit: subject?.lab_unit,
            type: subject?.type,
            semesterId: semesterObj?.id || subject?.semesters_id || null,
            semesterName,
            prerequisiteCodes: Array.isArray(subject?.prerequisites)
              ? subject.prerequisites.map((pre) => pre?.code || pre)
              : Array.isArray(subject?.prerequisite_subject_codes)
                ? subject.prerequisite_subject_codes
                : Array.isArray(subject?.prerequisiteSubjectCodes)
                  ? subject.prerequisiteSubjectCodes
                  : [],
            is_credited: isCredited,
          });

          return acc;
        }, []),
      };
    });
  }, [creditCatalog, subjectsByYearLevel, isSubjectCredited]);

  const curriculumYearOptions = useMemo(() => {
    const labels = new Set();
    curriculumCatalogGroups.forEach((group) => {
      if (group.label) {
        labels.add(group.label);
      }
    });
    return ["All", ...Array.from(labels)];
  }, [curriculumCatalogGroups]);

  const curriculumSemesterOptions = useMemo(() => {
    const semesters = new Set();
    curriculumCatalogGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.semesterName) {
          semesters.add(item.semesterName);
        }
      });
    });

    const sortedSemesters = Array.from(semesters).sort((a, b) => a.localeCompare(b));
    return ["All", ...sortedSemesters];
  }, [curriculumCatalogGroups]);

  useEffect(() => {
    if (showCurriculumModal) {
      setCurriculumYearFilter("All");
      setCurriculumSemesterFilter("All");
    }
  }, [showCurriculumModal]);

  const getCurriculumGroupsByFilter = useCallback(
    (filter) => {
      if (filter === "All") {
        return curriculumCatalogGroups;
      }
      return curriculumCatalogGroups.filter(({ label }) => label === filter);
    },
    [curriculumCatalogGroups]
  );

  const filteredCurriculumGroups = useMemo(() => {
    return getCurriculumGroupsByFilter(curriculumYearFilter)
      .map((group) => {
        const items = curriculumSemesterFilter === "All"
          ? group.items
          : group.items.filter((item) => item.semesterName === curriculumSemesterFilter);

        const seenKeys = new Set();
        const dedupedItems = [];

        items.forEach((item) => {
          const key = getCurriculumItemKey(item);
          if (key && seenKeys.has(key)) {
            return;
          }

          if (key) {
            seenKeys.add(key);
          }

          dedupedItems.push(item);
        });

        return {
          label: group.label,
          items: dedupedItems,
        };
      });
  }, [curriculumYearFilter, curriculumSemesterFilter, curriculumCatalogGroups]);

  const { currentSubjects, retakeSubjects } = useMemo(() => {
    const current = [];
    const retake = [];
    
    // If no subjects, return empty arrays
    if (!subjects || subjects.length === 0) {
      return { currentSubjects: [], retakeSubjects: [] };
    }

    // Process all subjects regardless of semester or schedule
    subjects.forEach((subject) => {
      const isRetake = subject.isFailed || subject.isBacktrack;
      
      if (isRetake) {
        retake.push(subject);
      } else {
        current.push(subject);
      }
    });
    return {
      currentSubjects: current,
      retakeSubjects: retake,
    };
  }, [subjects]);

  const subjectsWithoutSchedules = useMemo(() =>
    currentSubjects.filter((subject) => {
      const scheduleList = Array.isArray(subject.schedules) ? subject.schedules : [];
      return scheduleList.length === 0;
    }).map((subject) => ({
      ...subject,
      scheduleIds: [subject.id],
    })),
  [currentSubjects]);

  const hasRetakeInventory = useMemo(
    () => retakeSubjects.length > 0,
    [retakeSubjects]
  );

  const selectionGuards = useMemo(() => {
    const blockedScheduleIds = new Set();
    const blockedSubjectIds = new Set();
    const selectableScheduleSet = new Set();

    subjects.forEach((subj) => {
      const scheduleIds = Array.isArray(subj.schedules)
        ? subj.schedules.map((sched) => sched.id)
        : [];
      const isRetakeSubject = Boolean(subj.isFailed) || Boolean(subj.isBacktrack);

      if (subj.hasFailedPrerequisites && !isRetakeSubject) {
        if (scheduleIds.length > 0) {
          scheduleIds.forEach((id) => blockedScheduleIds.add(id));
        } else {
          blockedScheduleIds.add(subj.id);
        }
        blockedSubjectIds.add(subj.id);
        return;
      }

      if (subj.is_credited) {
        if (scheduleIds.length > 0) {
          scheduleIds.forEach((id) => blockedScheduleIds.add(id));
        } else {
          const subjectIdentifier = subj.id ?? subj.curriculum_subject_id ?? subj.subject_id;
          if (subjectIdentifier !== undefined) {
            blockedScheduleIds.add(subjectIdentifier);
          }
        }
        const subjectIdentifier = subj.id ?? subj.curriculum_subject_id ?? subj.subject_id;
        if (subjectIdentifier !== undefined) {
          blockedSubjectIds.add(subjectIdentifier);
        }
        return;
      }

      if (scheduleIds.length > 0) {
        scheduleIds.forEach((id) => selectableScheduleSet.add(id));
      } else {
        selectableScheduleSet.add(subj.id);
      }
    });

    return {
      blockedScheduleIds,
      blockedSubjectIds,
      selectableScheduleIds: Array.from(selectableScheduleSet),
    };
  }, [subjects]);

  const { blockedScheduleIds, blockedSubjectIds, selectableScheduleIds } = selectionGuards;

  const dismissedEligibleSet = useMemo(() => {
    return new Set(dismissedEligibleSubjects.map((key) => String(key)));
  }, [dismissedEligibleSubjects]);

  const getEligibleItemKey = useCallback((item) => {
    if (!item) return null;
    return (
      item.curriculum_subject_id ??
      item.curriculumSubjectId ??
      item.subject_id ??
      item.subjectId ??
      item.code ??
      item.listKey ??
      null
    );
  }, []);

  useEffect(() => {
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return;
    }
    if (!selectedSubjects.length) {
      return;
    }

    const creditedIdentifiers = new Set();

    subjects.forEach((subject) => {
      if (!subject?.is_credited) {
        return;
      }

      const scheduleList = Array.isArray(subject.schedules) ? subject.schedules : [];
      if (scheduleList.length > 0) {
        scheduleList.forEach((schedule) => {
          const normalized = normalizeIdentifier(
            schedule?.id ??
              schedule?.class_schedule_id ??
              schedule?.schedule_id ??
              schedule?.classScheduleId ??
              schedule?.scheduleId ??
              null
          );
          if (normalized !== null) {
            creditedIdentifiers.add(String(normalized));
          }
        });
        return;
      }

      const fallbackId = normalizeIdentifier(
        subject.id ?? subject.curriculum_subject_id ?? subject.subject_id ?? null
      );
      if (fallbackId !== null) {
        creditedIdentifiers.add(String(fallbackId));
      }
    });

    if (!creditedIdentifiers.size) {
      return;
    }

    setSelectedSubjects((prev) => {
      let mutated = false;
      const next = prev.filter((entry) => {
        const normalized = normalizeIdentifier(entry);
        if (normalized === null) {
          mutated = true;
          return false;
        }
        if (creditedIdentifiers.has(String(normalized))) {
          mutated = true;
          return false;
        }
        return true;
      });
      return mutated ? next : prev;
    });
  }, [subjects, selectedSubjects, normalizeIdentifier]);

  const isIdentifierBlocked = useCallback((value) => {
    if (!blockedScheduleIds || blockedScheduleIds.size === 0) {
      return false;
    }

    if (blockedScheduleIds.has(value)) {
      return true;
    }

    const numeric = Number(value);
    if (Number.isFinite(numeric) && blockedScheduleIds.has(numeric)) {
      return true;
    }

    if (typeof value === "string") {
      return blockedScheduleIds.has(value.trim());
    }

    if (Number.isFinite(numeric)) {
      return blockedScheduleIds.has(String(numeric));
    }

    return false;
  }, [blockedScheduleIds]);

  const evaluateSubjectSchedules = useCallback(
    (subject) => {
      if (!subject) {
        return { scheduleIds: [], usedCrossSection: false, schedules: [] };
      }

      const scheduleList = Array.isArray(subject.schedules) ? subject.schedules : [];
      if (scheduleList.length === 0) {
        const fallbackId = normalizeIdentifier(subject.id ?? subject.subject_id ?? null);
        if (fallbackId === null || isIdentifierBlocked(fallbackId)) {
          return { scheduleIds: [], usedCrossSection: false, schedules: [] };
        }

        return {
          scheduleIds: [fallbackId],
          usedCrossSection: false,
          schedules: [],
        };
      }

      const preferredSchedules = scheduleList.filter((sched) => matchesEnrollmentSection(sched));
      const schedulesToUse = preferredSchedules.length > 0 ? preferredSchedules : scheduleList;
      const usedCrossSection = preferredSchedules.length === 0 && schedulesToUse.length > 0;

      const scheduleIds = [];
      schedulesToUse.forEach((sched) => {
        const normalized = normalizeIdentifier(
          sched?.id ??
            sched?.schedule_id ??
            sched?.scheduleId ??
            sched?.class_schedule_id ??
            sched?.classScheduleId ??
            sched?.scheduleId ??
            sched?.class_scheduleID ??
            null
        );

        if (normalized === null || isIdentifierBlocked(normalized)) {
          return;
        }

        scheduleIds.push(normalized);
      });

      return {
        scheduleIds,
        usedCrossSection,
        schedules: schedulesToUse,
      };
    },
    [isIdentifierBlocked, matchesEnrollmentSection, normalizeIdentifier]
  );

  const selectionPayload = useMemo(() => {
    const seen = new Set();
    const payload = [];

    const register = (value) => {
      const normalized = normalizeIdentifier(value);
      if (normalized === null) {
        return;
      }

      const key = String(normalized);
      if (seen.has(key)) {
        return;
      }
      seen.add(key);

      if (typeof normalized === "number") {
        payload.push(normalized);
        return;
      }

      const numeric = Number(normalized);
      payload.push(Number.isFinite(numeric) ? numeric : normalized);
    };

    selectedSubjects.forEach((entry) => {
      if (!entry) {
        return;
      }

      if (typeof entry === "object") {
        const schedules = Array.isArray(entry.schedules) ? entry.schedules : [];

        if (schedules.length === 0) {
          register(
            entry.class_schedule_id ??
              entry.schedule_id ??
              entry.classScheduleId ??
              entry.id ??
              entry.subject_id ??
              entry.curriculum_subject_id ??
              null
          );
          return;
        }

        schedules.forEach((schedule) => {
          register(
            schedule?.id ??
              schedule?.class_schedule_id ??
              schedule?.schedule_id ??
              schedule?.classScheduleId ??
              schedule?.scheduleId ??
              null
          );
        });
        return;
      }

      register(entry);
    });

    manualSubjects.forEach((subject) => {
      if (!subject) {
        return;
      }

      register(
        subject.class_schedule_id ??
          subject.schedule_id ??
          subject.classScheduleId ??
          subject.id ??
          subject.subject_id ??
          subject.curriculum_subject_id ??
          null
      );

      const schedules = Array.isArray(subject.schedules) ? subject.schedules : [];
      schedules.forEach((schedule) => {
        register(
          schedule?.id ??
            schedule?.class_schedule_id ??
            schedule?.schedule_id ??
            schedule?.classScheduleId ??
            schedule?.scheduleId ??
            null
        );
      });
    });

    return payload;
  }, [manualSubjects, normalizeIdentifier, selectedSubjects]);

  const selectedScheduleSet = useMemo(() => {
    const set = new Set();
    selectionPayload.forEach((value) => {
      if (value !== null && value !== undefined) {
        set.add(String(value));
      }
    });
    return set;
  }, [selectionPayload]);

  const isScheduleSelected = useCallback(
    (value) => {
      const normalized = normalizeIdentifier(value);
      if (normalized === null) {
        return false;
      }
      return selectedScheduleSet.has(String(normalized));
    },
    [normalizeIdentifier, selectedScheduleSet]
  );

  const subjectSelectionIndex = useMemo(() => {
    const map = new Map();

    const register = (value, subject, schedule = null) => {
      const normalized = normalizeIdentifier(value);
      if (normalized === null) {
        return;
      }
      const key = String(normalized);
      if (!map.has(key)) {
        map.set(key, { subject, schedule });
      }
    };

    const registerSubject = (subject) => {
      if (!subject) {
        return;
      }

      register(subject.id, subject);
      register(subject.subject_id, subject);
      register(subject.curriculum_subject_id, subject);
      register(subject.curriculumSubjectId, subject);
      register(subject.subjectKey, subject);

      const subjectCode = subject?.subject?.code ?? subject?.code;
      if (subjectCode) {
        register(`code:${String(subjectCode).toLowerCase()}`, subject);
      }

      const scheduleList = Array.isArray(subject.schedules) ? subject.schedules : [];
      scheduleList.forEach((schedule) => {
        register(
          schedule?.id ??
            schedule?.class_schedule_id ??
            schedule?.schedule_id ??
            schedule?.classScheduleId ??
            schedule?.scheduleId ??
            schedule?.class_scheduleID ??
            null,
          subject,
          schedule
        );
      });
    };

    subjects.forEach(registerSubject);
    manualSubjects.forEach(registerSubject);

    return map;
  }, [manualSubjects, normalizeIdentifier, subjects]);

  const curriculumSubjectLookup = useMemo(() => {
    const map = new Map();

    const coerceNumeric = (value) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const normalizeKey = (value) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      if (typeof value === "string") {
        const trimmed = value.trim().toLowerCase();
        return trimmed.length > 0 ? trimmed : null;
      }

      return String(value);
    };

    const addKey = (value, curriculumId) => {
      const numeric = coerceNumeric(value);
      if (numeric !== null) {
        const key = String(numeric);
        if (!map.has(key)) {
          map.set(key, numeric);
        }
      }

      const normalized = normalizeKey(value);
      if (normalized !== null && !map.has(normalized)) {
        map.set(normalized, curriculumId);
      }
    };

    const registerSubject = (subject) => {
      if (!subject) {
        return;
      }

      const candidates = [
        subject.curriculum_subject_id,
        subject.curriculumSubjectId,
        subject.subject?.curriculum_subject_id,
        subject.subject?.curriculumSubjectId,
        subject.subjectRef?.curriculum_subject_id,
        subject.subjectRef?.curriculumSubjectId,
        subject.subjectRef?.subject?.curriculum_subject_id,
        subject.subjectRef?.subject?.curriculumSubjectId,
      ];

      let curriculumId = null;
      for (const value of candidates) {
        const numeric = coerceNumeric(value);
        if (numeric !== null) {
          curriculumId = numeric;
          break;
        }
      }

      if (curriculumId === null) {
        return;
      }

      addKey(curriculumId, curriculumId);
      addKey(subject.curriculum_subject_id, curriculumId);
      addKey(subject.curriculumSubjectId, curriculumId);
      addKey(subject.id, curriculumId);
      addKey(subject.subject_id, curriculumId);
      addKey(subject.subjectKey, curriculumId);

      const subjectCodes = [
        subject.subject?.code,
        subject.subject_code,
        subject.code,
        subject.subjectRef?.subject?.code,
      ];
      subjectCodes.forEach((code) => {
        if (code) {
          addKey(`code:${String(code).toLowerCase()}`, curriculumId);
        }
      });

      const schedules = Array.isArray(subject.schedules) ? subject.schedules : [];
      schedules.forEach((schedule) => {
        const scheduleCurriculum = coerceNumeric(
          schedule?.curriculum_subject_id ??
            schedule?.curriculumSubjectId ??
            schedule?.curriculum_subject?.id ??
            schedule?.curriculumSubject?.id ??
            null
        );

        if (scheduleCurriculum === null) {
          return;
        }

        addKey(scheduleCurriculum, scheduleCurriculum);
        addKey(schedule?.id, scheduleCurriculum);
        addKey(schedule?.class_schedule_id, scheduleCurriculum);
      });
    };

    subjects.forEach(registerSubject);
    manualSubjects.forEach(registerSubject);

    if (Array.isArray(creditCatalog)) {
      creditCatalog.forEach((entry) => {
        const catalogSubjects = Array.isArray(entry?.subjects) ? entry.subjects : [];
        catalogSubjects.forEach(registerSubject);
      });
    }

    return map;
  }, [creditCatalog, manualSubjects, subjects]);

  const resolveCurriculumSubjectId = useCallback(
    (subject, schedule = null) => {
      const coerceNumeric = (value) => {
        if (value === null || value === undefined || value === "") {
          return null;
        }

        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : null;
      };

      const lookupValue = (value) => {
        if (value === null || value === undefined) {
          return null;
        }

        const numeric = coerceNumeric(value);
        if (numeric !== null && curriculumSubjectLookup.has(String(numeric))) {
          return curriculumSubjectLookup.get(String(numeric));
        }

        if (typeof value === "string") {
          const normalized = value.trim().toLowerCase();
          if (normalized.length > 0 && curriculumSubjectLookup.has(normalized)) {
            return curriculumSubjectLookup.get(normalized);
          }
        }

        const stringKey = String(value);
        if (curriculumSubjectLookup.has(stringKey)) {
          return curriculumSubjectLookup.get(stringKey);
        }

        return null;
      };

      const attemptCandidates = (candidates) => {
        for (const candidate of candidates) {
          const numeric = coerceNumeric(candidate);
          if (numeric !== null) {
            return numeric;
          }

          const mapped = lookupValue(candidate);
          if (mapped !== null) {
            return mapped;
          }
        }

        return null;
      };

      const subjectCandidates = [
        subject?.curriculum_subject_id,
        subject?.curriculumSubjectId,
        subject?.subject?.curriculum_subject_id,
        subject?.subject?.curriculumSubjectId,
        subject?.subjectRef?.curriculum_subject_id,
        subject?.subjectRef?.curriculumSubjectId,
        subject?.subjectRef?.subject?.curriculum_subject_id,
        subject?.subjectRef?.subject?.curriculumSubjectId,
        subject?.id,
        subject?.subject_id,
        subject?.subjectKey,
      ];

      const fromSubject = attemptCandidates(subjectCandidates);
      if (fromSubject !== null) {
        return fromSubject;
      }

      const subjectCodes = [
        subject?.subject?.code ? `code:${String(subject.subject.code).toLowerCase()}` : null,
        subject?.subject_code ? `code:${String(subject.subject_code).toLowerCase()}` : null,
        subject?.code ? `code:${String(subject.code).toLowerCase()}` : null,
        subject?.subjectRef?.subject?.code
          ? `code:${String(subject.subjectRef.subject.code).toLowerCase()}`
          : null,
      ];

      const fromCodes = attemptCandidates(subjectCodes);
      if (fromCodes !== null) {
        return fromCodes;
      }

      if (schedule) {
        const scheduleCandidates = [
          schedule.curriculum_subject_id,
          schedule.curriculumSubjectId,
          schedule.curriculum_subject?.id,
          schedule.curriculumSubject?.id,
          schedule.id,
          schedule.class_schedule_id,
        ];

        const fromSchedule = attemptCandidates(scheduleCandidates);
        if (fromSchedule !== null) {
          return fromSchedule;
        }
      }

      return null;
    },
    [curriculumSubjectLookup]
  );

  const selectedSubjectDetails = useMemo(() => {
    const details = [];
    const seen = new Set();

    const resolveUnits = (source) => {
      const primaryLec =
        source?.lec_unit ??
        source?.lecUnits ??
        source?.subject?.lec_unit ??
        source?.subject?.lecUnits ??
        source?.subject?.lec ??
        0;
      const primaryLab =
        source?.lab_unit ??
        source?.labUnits ??
        source?.subject?.lab_unit ??
        source?.subject?.labUnits ??
        source?.subject?.lab ??
        0;

      const summed = Number(primaryLec) + Number(primaryLab);
      if (Number.isFinite(summed) && summed > 0) {
        return summed;
      }

      const fallback =
        source?.units ??
        source?.total_units ??
        source?.totalUnits ??
        source?.subject?.units ??
        source?.subject?.total_units ??
        source?.subject?.totalUnits ??
        0;

      const parsedFallback = Number(fallback);
      return Number.isFinite(parsedFallback) ? parsedFallback : 0;
    };

    const pushDetail = (subject, schedule) => {
      if (!subject) {
        return;
      }

      const identifier =
        subject.curriculum_subject_id ??
        subject.curriculumSubjectId ??
        subject.subject_id ??
        subject.id ??
        subject.subjectKey ??
        subject.subject?.code ??
        `subject-${details.length}`;

      const key = String(identifier);
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      details.push({
        id: key,
        subject,
        schedule,
        units: resolveUnits(subject),
      });
    };

    selectionPayload.forEach((raw) => {
      const normalized = normalizeIdentifier(raw);
      if (normalized === null) {
        return;
      }

      const record = subjectSelectionIndex.get(String(normalized));
      if (!record) {
        return;
      }

      pushDetail(record.subject, record.schedule ?? null);
    });

    return details;
  }, [normalizeIdentifier, selectionPayload, subjectSelectionIndex]);

  const subjectLoadSubmissionPayload = useMemo(() => {
    const scheduleIds = [];
    const curriculumIds = [];
    const seenPairs = new Set();
    const missingSubjectRefs = new Set();
    const missingScheduleRefs = new Set();

    const coerceNumeric = (value) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    selectedSubjectDetails.forEach(({ subject }) => {
      if (!subject) {
        return;
      }

      const subjectSchedules = Array.isArray(subject.schedules) ? subject.schedules : [];
      const curriculumSubjectId = resolveCurriculumSubjectId(subject);

      const selectedSchedules = subjectSchedules.filter((schedule) => {
        const normalized = normalizeIdentifier(
          schedule?.id ??
            schedule?.class_schedule_id ??
            schedule?.schedule_id ??
            schedule?.classScheduleId ??
            schedule?.scheduleId ??
            null
        );

        if (normalized === null) {
          return false;
        }

        return selectedScheduleSet.has(String(normalized));
      });

      if (selectedSchedules.length === 0) {
        if (curriculumSubjectId === null) {
          const identifier =
            subject.subject?.code ??
            subject.subject_code ??
            subject.code ??
            subject.curriculum_subject_id ??
            subject.id ??
            JSON.stringify(subject);

          if (!missingSubjectRefs.has(identifier)) {
            console.warn("Skipping subject without curriculum reference", { subject });
            missingSubjectRefs.add(identifier);
          }
          return;
        }
        const pairKey = `null-${curriculumSubjectId ?? "null"}`;
        if (seenPairs.has(pairKey)) {
          return;
        }
        seenPairs.add(pairKey);
        scheduleIds.push(null);
        curriculumIds.push(curriculumSubjectId);
        return;
      }

      selectedSchedules.forEach((schedule) => {
        const normalized = normalizeIdentifier(
          schedule?.id ??
            schedule?.class_schedule_id ??
            schedule?.schedule_id ??
            schedule?.classScheduleId ??
            schedule?.scheduleId ??
            null
        );

        const numericScheduleId = coerceNumeric(normalized);
        const pairKey = `${numericScheduleId ?? "null"}-${curriculumSubjectId ?? "null"}`;

        if (seenPairs.has(pairKey)) {
          return;
        }

        const resolvedCurriculumId =
          resolveCurriculumSubjectId(subject, schedule) ?? curriculumSubjectId;

        if (resolvedCurriculumId === null) {
          const identifier = schedule?.id ?? schedule?.class_schedule_id ?? JSON.stringify(schedule);
          if (!missingScheduleRefs.has(identifier)) {
            console.warn("Skipping schedule without curriculum reference", {
              subject,
              schedule,
            });
            missingScheduleRefs.add(identifier);
          }
          return;
        }

        seenPairs.add(pairKey);
        scheduleIds.push(numericScheduleId);
        curriculumIds.push(resolvedCurriculumId);
      });
    });

    return {
      scheduleIds,
      curriculumIds,
    };
  }, [normalizeIdentifier, resolveCurriculumSubjectId, selectedScheduleSet, selectedSubjectDetails]);

  useEffect(() => {
    console.groupCollapsed(
      `[SubjectLoad] Prepared submission payload for enrollment ${enrollment?.id ?? 'N/A'}`
    );
    console.log('Schedule IDs:', subjectLoadSubmissionPayload.scheduleIds);
    console.log('Curriculum subject IDs:', subjectLoadSubmissionPayload.curriculumIds);
    console.groupEnd();
  }, [subjectLoadSubmissionPayload, enrollment?.id]);

  const autoLoadPlan = useMemo(() => {
    if (
      !Array.isArray(subjects) ||
      subjects.length === 0 ||
      !Array.isArray(recommendedSubjects) ||
      recommendedSubjects.length === 0
    ) {
      return { scheduleIds: [], details: [] };
    }

    const recommendedIdentifiers = new Set();
    recommendedSubjects.forEach((entry) => {
      const identifiers = buildSubjectIdentifierSet(entry);
      identifiers.forEach((id) => {
        if (id === null || id === undefined) {
          return;
        }
        recommendedIdentifiers.add(String(id));
      });
    });

    if (recommendedIdentifiers.size === 0) {
      return { scheduleIds: [], details: [] };
    }

    const scheduleAccumulator = new Map();
    const detailAccumulator = [];

    subjects.forEach((subject) => {
      const identifiers = buildSubjectIdentifierSet(subject);
      const matchesRecommendation = Array.from(identifiers).some((id) =>
        recommendedIdentifiers.has(String(id))
      );

      if (!matchesRecommendation) {
        return;
      }

      if (isSubjectCredited(subject.id ?? subject.curriculum_subject_id ?? subject.subject_id)) {
        return;
      }

      if (subject.prerequisites_met === false) {
        return;
      }

      if (subject.hasFailedPrerequisites && !subject.isFailed && !subject.isBacktrack) {
        return;
      }

      const scheduleList = Array.isArray(subject.schedules) ? subject.schedules : [];
      if (scheduleList.length === 0) {
        return;
      }

      const preferredSchedules = scheduleList.filter((sched) => matchesEnrollmentSection(sched));
      const schedulesToUse = preferredSchedules.length > 0 ? preferredSchedules : scheduleList;

      const acceptedSchedules = [];

      schedulesToUse.forEach((sched) => {
        const rawId =
          sched?.id ??
          sched?.schedule_id ??
          sched?.class_schedule_id ??
          sched?.classScheduleId ??
          sched?.class_scheduleID ??
          sched?.scheduleId ??
          null;

        const normalizedId = normalizeIdentifier(rawId);
        if (normalizedId === null) {
          return;
        }

        if (isIdentifierBlocked(normalizedId)) {
          return;
        }

        const key = String(normalizedId);
        if (scheduleAccumulator.has(key)) {
          return;
        }

        scheduleAccumulator.set(key, normalizedId);
        acceptedSchedules.push({ normalizedId, schedule: sched });
      });

      if (acceptedSchedules.length > 0) {
        detailAccumulator.push({
          subjectCode: subject?.subject?.code || subject.code || "Subject",
          descriptiveTitle:
            subject?.subject?.descriptive_title || subject.descriptive_title || "",
          scheduleCount: acceptedSchedules.length,
          crossSectionFallback:
            preferredSchedules.length === 0 && subject.allowCrossSection === true,
        });
      }
    });

    return {
      scheduleIds: Array.from(scheduleAccumulator.values()),
      details: detailAccumulator,
    };
  }, [
    subjects,
    recommendedSubjects,
    creditedSubjects,
    buildSubjectIdentifierSet,
    matchesEnrollmentSection,
    normalizeIdentifier,
    isIdentifierBlocked,
  ]);

  const eligibleSubjectsForStudent = useMemo(() => {
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return [];
    }

    const drafted = [];

    subjects.forEach((subject) => {
      if (isSubjectCredited(subject.id ?? subject.curriculum_subject_id ?? subject.subject_id)) {
        return;
      }

      // For irregular students, relax prerequisite requirements
      if (!isIrregularStudent) {
        if (subject.prerequisites_met === false) {
          return;
        }

        if (subject.hasFailedPrerequisites && !subject.isFailed && !subject.isBacktrack) {
          return;
        }
      }

      const evaluation = evaluateSubjectSchedules(subject);
      if (!evaluation.scheduleIds.length) {
        return;
      }

      const yearLevelDisplay =
        subject?.year_level?.year_level ||
        subject?.sourceYearLevel ||
        enrollment?.year_level?.year_level ||
        "";

      drafted.push({
        code: subject?.subject?.code || subject.code || "",
        title: subject?.subject?.descriptive_title || subject.descriptive_title || "",
        units: (Number(subject.lec_unit) || 0) + (Number(subject.lab_unit) || 0),
        yearLevel: yearLevelDisplay,
        yearLevelCode: normalizeYearLevel(
          subject?.year_level?.year_level ??
            subject?.sourceYearLevel ??
            subject?.yearLevel ??
            yearLevelDisplay
        ),
        semester:
          subject?.semester?.semester ||
          subject?.sourceSemester ||
          enrollment?.semester?.semester ||
          "",
        crossSectionFallback: evaluation.usedCrossSection,
        scheduleIds: evaluation.scheduleIds,
        subjectRef: subject,
      });
    });

    return drafted.sort((a, b) => {
      const codeA = a.code || "";
      const codeB = b.code || "";
      return codeA.localeCompare(codeB);
    });
  }, [
    subjects,
    creditedSubjects,
    evaluateSubjectSchedules,
    enrollment?.year_level?.year_level,
    enrollment?.semester?.semester,
    normalizeYearLevel,
    isIrregularStudent,
  ]);

  const groupedEligibleSubjects = useMemo(() => {
    if (!eligibleSubjectsForStudent.length) {
      return [];
    }

    const semesterRank = new Map([
      ["1", 1],
      ["first", 1],
      ["first semester", 1],
      ["first sem", 1],
      ["2", 2],
      ["second", 2],
      ["second semester", 2],
      ["second sem", 2],
      ["midyear", 3],
      ["summer", 3],
    ]);

    const parseOrder = (label) => {
      if (!label) return Number.POSITIVE_INFINITY;
      const numericMatch = String(label).match(/\d+/);
      if (numericMatch) {
        return Number.parseInt(numericMatch[0], 10) || Number.POSITIVE_INFINITY;
      }
      return Number.POSITIVE_INFINITY;
    };

    const extractUnitValue = (...sources) => {
      let zeroFallback = null;

      for (const source of sources) {
        if (source === null || source === undefined || source === "") {
          continue;
        }

        const numeric = Number(source);
        if (Number.isFinite(numeric)) {
          if (numeric > 0) {
            return numeric;
          }
          if (zeroFallback === null) {
            zeroFallback = 0;
          }
          continue;
        }

        if (typeof source === "string") {
          const parsed = parseFloat(source);
          if (Number.isFinite(parsed)) {
            if (parsed > 0) {
              return parsed;
            }
            if (zeroFallback === null) {
              zeroFallback = 0;
            }
          }
        }
      }

      return zeroFallback ?? 0;
    };

    const resolveUnits = (entry, lecUnitValue, labUnitValue) => {
      const directUnits = Number(entry.units);
      if (Number.isFinite(directUnits) && directUnits > 0) {
        return directUnits;
      }

      if (lecUnitValue > 0 || labUnitValue > 0) {
        const summed = lecUnitValue + labUnitValue;
        if (Number.isFinite(summed) && summed > 0) {
          return summed;
        }
      }

      if (typeof entry.units === "string") {
        const parsed = parseFloat(entry.units);
        if (Number.isFinite(parsed) && parsed > 0) {
          return parsed;
        }
      }

      const subjectRef = entry.subjectRef ?? {};
      const lec = extractUnitValue(
        subjectRef.lec_unit,
        subjectRef.subject?.lec_unit,
        subjectRef.subject?.lecUnits,
        subjectRef.subject?.lec,
        entry.lec_unit,
        entry.lecUnit
      );
      const lab = extractUnitValue(
        subjectRef.lab_unit,
        subjectRef.subject?.lab_unit,
        subjectRef.subject?.labUnits,
        subjectRef.subject?.lab,
        entry.lab_unit,
        entry.labUnit
      );

      const summed = lec + lab;
      if (Number.isFinite(summed) && summed > 0) {
        return summed;
      }

      const fallback = Number(
        subjectRef.subject?.units ??
          subjectRef.units ??
          entry.subjectRef?.subject?.total_units ??
          entry.subjectRef?.total_units ??
          0
      );

      if (Number.isFinite(fallback) && fallback > 0) {
        return fallback;
      }

      return 0;
    };

    const groups = new Map();

    eligibleSubjectsForStudent.forEach((entry) => {
      const subjectRef = entry.subjectRef ?? {};
      const entryYearCode = entry.yearLevelCode ?? normalizeYearLevel(entry.yearLevel);
      const entrySemesterCode = normalizeSemesterLabel(
        entry.semester ??
          subjectRef?.semester?.semester ??
          subjectRef?.sourceSemester ??
          null
      );

      const matchesYear = !enrollmentYearLevelCode || entryYearCode === enrollmentYearLevelCode;
      const matchesSemester = !enrollmentSemesterCode || entrySemesterCode === enrollmentSemesterCode;
      const isRetake = Boolean(subjectRef.isFailed) || Boolean(subjectRef.isBacktrack);

      if (!matchesYear || !matchesSemester) {
        if (!isRetake) {
          return;
        }
      }

      const yearLabel = matchesYear
        ? entry.yearLevel || entryYearCode || "Year Level"
        : `${entry.yearLevel || entryYearCode || "Year Level"} • Retake`;

      const semesterLabel = matchesSemester
        ? entry.semester || "Semester"
        : `${entry.semester || "Semester"} • Retake`;

      if (!groups.has(yearLabel)) {
        groups.set(yearLabel, {
          yearLabel,
          order: parseOrder(yearLabel),
          semesters: new Map(),
        });
      }

      const group = groups.get(yearLabel);
      if (!group.semesters.has(semesterLabel)) {
        const normalizedKey = String(semesterLabel).trim().toLowerCase();
        const semesterOrder = semesterRank.get(normalizedKey) ?? parseOrder(semesterLabel);
        group.semesters.set(semesterLabel, {
          label: semesterLabel,
          order: semesterOrder,
          subjects: [],
          totalUnits: 0,
        });
      }

      const semesterEntry = group.semesters.get(semesterLabel);

      const normalizedScheduleIds = Array.isArray(entry.scheduleIds)
        ? entry.scheduleIds
            .map((id) => normalizeIdentifier(id))
            .filter((id) => id !== null && !isIdentifierBlocked(id))
        : [];

      let lecUnitValue = extractUnitValue(
        entry.lec_unit,
        entry.lecUnit,
        subjectRef.lec_unit,
        subjectRef.subject?.lec_unit,
        subjectRef.subject?.lecUnits,
        subjectRef.subject?.lec,
        subjectRef.curriculum_subject?.lec_unit,
        subjectRef.curriculumSubject?.lec_unit,
        subjectRef.curriculumSubject?.lecUnits,
        subjectRef.curriculumSubject?.lec
      );

      let labUnitValue = extractUnitValue(
        entry.lab_unit,
        entry.labUnit,
        subjectRef.lab_unit,
        subjectRef.subject?.lab_unit,
        subjectRef.subject?.labUnits,
        subjectRef.subject?.lab,
        subjectRef.curriculum_subject?.lab_unit,
        subjectRef.curriculumSubject?.lab_unit,
        subjectRef.curriculumSubject?.labUnits,
        subjectRef.curriculumSubject?.lab
      );

      const units = resolveUnits(entry, lecUnitValue, labUnitValue);

      if ((lecUnitValue <= 0 && labUnitValue <= 0) && units > 0) {
        lecUnitValue = units;
        labUnitValue = 0;
      }

      semesterEntry.subjects.push({
        code: entry.code || subjectRef?.subject?.code || "—",
        title: entry.title || subjectRef?.subject?.descriptive_title || "Untitled Subject",
        units,
        scheduleIds: normalizedScheduleIds,
        rawScheduleIds: entry.scheduleIds || [],
        isRetake,
        yearLabel,
        semesterLabel,
        lecUnit: lecUnitValue,
        labUnit: labUnitValue,
      });

      semesterEntry.totalUnits += units;
    });

    return Array.from(groups.values())
      .sort((a, b) => a.order - b.order || a.yearLabel.localeCompare(b.yearLabel))
      .map((group) => {
        const semesters = Array.from(group.semesters.values()).sort(
          (a, b) => a.order - b.order || a.label.localeCompare(b.label)
        );

        return {
          yearLabel: group.yearLabel,
          semesters,
        };
      });
  }, [
    eligibleSubjectsForStudent,
    enrollmentYearLevelCode,
    enrollmentSemesterCode,
    isIdentifierBlocked,
    normalizeIdentifier,
    normalizeSemesterLabel,
    normalizeYearLevel,
  ]);

  const eligibleListItems = useMemo(() => {
    if (!groupedEligibleSubjects.length) {
      return [];
    }

    const flattened = groupedEligibleSubjects.flatMap((group) =>
      group.semesters.flatMap((semester) =>
        semester.subjects.map((subject) => ({
          ...subject,
          yearLabel: subject.yearLabel ?? group.yearLabel,
          semesterLabel: subject.semesterLabel ?? semester.label,
          listKey: `${group.yearLabel}-${semester.label}-${subject.code}`,
        }))
      )
    );

    if (!dismissedEligibleSet.size) {
      return flattened;
    }

    return flattened.filter((item) => {
      const key = getEligibleItemKey(item);
      if (key === null || key === undefined) {
        return true;
      }
      return !dismissedEligibleSet.has(String(key));
    });
  }, [groupedEligibleSubjects, dismissedEligibleSet, getEligibleItemKey]);

  // Combine eligible subjects with manually added subjects (from modals)
  const allAvailableListItems = useMemo(() => {
    const result = [...eligibleListItems];
    
    // Add manually selected subjects from other curricula or full list
    if (Array.isArray(manualSubjects) && manualSubjects.length > 0) {
      manualSubjects.forEach((manualSubject) => {
        // Check if this subject is already in the eligible list
        const alreadyExists = result.some(
          (item) =>
            (item.subject_id === manualSubject.subject_id ||
              item.curriculum_subject_id === manualSubject.curriculum_subject_id ||
              item.code === manualSubject.subject?.code)
        );
        
        if (!alreadyExists) {
          result.push({
            ...manualSubject,
            listKey: `manual-${manualSubject.id || manualSubject.curriculum_subject_id}`,
            code: manualSubject.subject?.code || manualSubject.code || "N/A",
            title: manualSubject.subject?.descriptive_title || manualSubject.title || "N/A",
            yearLabel: manualSubject.sourceYearLevel || manualSubject.year_level?.year_level || "N/A",
            semesterLabel: manualSubject.sourceSemester || manualSubject.semester?.semester || "N/A",
            units: (manualSubject.lec_unit || 0) + (manualSubject.lab_unit || 0),
            lecUnit: manualSubject.lec_unit || 0,
            labUnit: manualSubject.lab_unit || 0,
            scheduleIds: manualSubject.schedules?.map((s) => s.id) || [],
            isManual: true,
          });
        }
      });
    }
    
    return result;
  }, [eligibleListItems, manualSubjects]);

  const eligibleListSummary = useMemo(() => {
    if (!allAvailableListItems.length) {
      return { subjectCount: 0, totalUnits: 0 };
    }

    const totalUnits = allAvailableListItems.reduce(
      (sum, item) => sum + (Number.isFinite(Number(item.units)) ? Number(item.units) : 0),
      0
    );

    return {
      subjectCount: allAvailableListItems.length,
      totalUnits,
    };
  }, [allAvailableListItems]);

  const eligiblePreviewTotalUnits = useMemo(
    () => Number(eligibleListSummary?.totalUnits) || 0,
    [eligibleListSummary]
  );
  const eligiblePreviewAssessment = useMemo(
    () => eligiblePreviewTotalUnits * tuitionPerUnit + medicalAndDentalFee,
    [eligiblePreviewTotalUnits]
  );
  const eligiblePreviewCurrentReceivable = useMemo(
    () => eligiblePreviewAssessment + corPreviousBalance,
    [eligiblePreviewAssessment, corPreviousBalance]
  );

  const eligibleSubjectScheduleRows = useMemo(() => {
    if (!Array.isArray(eligibleListItems) || eligibleListItems.length === 0) {
      return [];
    }

    const rows = [];

    eligibleListItems.forEach((item) => {
      if (!item) {
        return;
      }

      const subjectRef = item.subjectRef || {};
      const scheduleList = Array.isArray(subjectRef.schedules) ? subjectRef.schedules : [];
      const scheduleMap = new Map();

      scheduleList.forEach((schedule) => {
        const rawId =
          schedule?.id ??
          schedule?.class_schedule_id ??
          schedule?.schedule_id ??
          schedule?.classScheduleId ??
          schedule?.scheduleId ??
          null;
        const normalized = normalizeIdentifier(rawId);
        if (normalized !== null) {
          scheduleMap.set(String(normalized), schedule);
        }
      });

      const normalizedIds = Array.isArray(item.scheduleIds)
        ? item.scheduleIds
            .map((id) => normalizeIdentifier(id))
            .filter((id) => id !== null)
        : [];

      if (normalizedIds.length === 0) {
        if (scheduleList.length === 0) {
          rows.push({ item, schedule: null, scheduleId: null });
          return;
        }

        scheduleList.forEach((schedule) => {
          const fallbackId =
            schedule?.id ??
            schedule?.class_schedule_id ??
            schedule?.schedule_id ??
            schedule?.classScheduleId ??
            schedule?.scheduleId ??
            null;
          const normalized = normalizeIdentifier(fallbackId);

          rows.push({
            item,
            schedule,
            scheduleId: normalized !== null ? String(normalized) : null,
          });
        });
        return;
      }

      normalizedIds.forEach((id) => {
        const key = String(id);
        rows.push({
          item,
          schedule: scheduleMap.get(key) || null,
          scheduleId: key,
        });
      });
    });

    return rows;
  }, [eligibleListItems, normalizeIdentifier]);

  const corPreviewSubjects = useMemo(() => {
    const enrollmentSubjects = corStudentRecord?.enrollment_subjects;

    if (Array.isArray(enrollmentSubjects) && enrollmentSubjects.length > 0) {
      return enrollmentSubjects
        .map((entry, index) => {
          const classSchedule = entry.class_schedule || entry.classSchedule || {};
          // Try multiple paths to get curriculum data
          const curriculumFromSchedule = classSchedule.curriculum_subject || classSchedule.curriculumSubject;
          const curriculumDirect = entry.curriculum_subject || entry.curriculumSubject;
          const curriculum = curriculumFromSchedule || curriculumDirect || {};
          
          // Try multiple paths to get subject data
          const subjectFromCurriculum = curriculum?.subject;
          const subjectDirect = entry.subject;
          const subject = subjectFromCurriculum || subjectDirect || {};
          
          const lec = Number(curriculum.lec_unit ?? entry.lec_unit ?? 0);
          const lab = Number(curriculum.lab_unit ?? entry.lab_unit ?? 0);
          const units = lec + lab;
          const day = classSchedule.schedule_day || entry.schedule_day || "TBA";
          const startTime = classSchedule.start_time || entry.start_time || null;
          const endTime = classSchedule.end_time || entry.end_time || null;
          const time = startTime && endTime ? `${formatCorTime(startTime)} – ${formatCorTime(endTime)}` : "TBA";
          const room = classSchedule.classroom?.room_number || classSchedule.room || entry.room || "TBA";
          const instructor = formatCorInstructor(classSchedule.faculty || entry.faculty);

          return {
            key: `enrolled-${subject.code || index}`,
            code: subject.code || "-",
            title: subject.descriptive_title || subject.name || "Untitled Subject",
            units,
            day,
            time,
            room,
            instructor,
          };
        })
        .filter(Boolean);
    }

    if (!eligibleSubjectScheduleRows.length) {
      return [];
    }

    return eligibleSubjectScheduleRows.map(({ item, schedule }, index) => {
      const normalizedSchedule = schedule || {};
      const curriculum =
        normalizedSchedule.curriculum_subject ||
        item.subjectRef?.curriculum_subject ||
        {};
      const subject = curriculum.subject || item.subjectRef?.subject || {};
      const lec = Number(curriculum.lec_unit || item.subjectRef?.lec_unit || 0);
      const lab = Number(curriculum.lab_unit || item.subjectRef?.lab_unit || 0);
      const units = lec + lab;
      const scheduleDay = normalizedSchedule.schedule_day || item.scheduleDay || "TBA";
      const startTime = normalizedSchedule.start_time || null;
      const endTime = normalizedSchedule.end_time || null;
      const scheduleTime = startTime && endTime ? `${formatCorTime(startTime)} – ${formatCorTime(endTime)}` : "TBA";
      const room =
        normalizedSchedule.classroom?.room_number ||
        normalizedSchedule.room ||
        item.room ||
        "TBA";
      const instructor = formatCorInstructor(normalizedSchedule.faculty || item.faculty);

      return {
        key: item.listKey || `eligible-${index}`,
        code: subject.code || item.code || "-",
        title: subject.descriptive_title || item.title || "-",
        units,
        day: scheduleDay,
        time: scheduleTime,
        room,
        instructor,
      };
    });
  }, [corStudentRecord?.enrollment_subjects, eligibleSubjectScheduleRows]);

  const corDisplayTotalUnits = useMemo(() => {
    return corTotalUnits > 0 ? corTotalUnits : eligiblePreviewTotalUnits;
  }, [corTotalUnits, eligiblePreviewTotalUnits]);

  const corDisplayAssessment = useMemo(() => {
    return corTotalUnits > 0 ? corAssessmentTotal : eligiblePreviewAssessment;
  }, [corTotalUnits, corAssessmentTotal, eligiblePreviewAssessment]);

  const corDisplayCurrentReceivable = useMemo(() => {
    return corTotalUnits > 0 ? corCurrentReceivable : eligiblePreviewCurrentReceivable;
  }, [corTotalUnits, corCurrentReceivable, eligiblePreviewCurrentReceivable]);

  useEffect(() => {
    if (!eligibleListItems.length) {
      return;
    }

    const normalizedSeeds = [];
    const seededSubjectKeys = new Set();

    eligibleListItems.forEach((item) => {
      const scheduleIds = Array.isArray(item.scheduleIds) ? item.scheduleIds : [];

      if (!scheduleIds.length) {
        return;
      }

      scheduleIds.forEach((value) => {
        const normalized = normalizeIdentifier(value);
        if (normalized === null || isIdentifierBlocked(normalized)) {
          return;
        }

        normalizedSeeds.push(normalized);
      });

      const subjectRef = item.subjectRef ?? null;
      const subjectKey =
        subjectRef?.curriculum_subject_id ??
        subjectRef?.curriculumSubjectId ??
        subjectRef?.id ??
        subjectRef?.subject_id ??
        item.code ??
        null;

      if (subjectKey !== null && subjectKey !== undefined) {
        seededSubjectKeys.add(String(subjectKey));
      }
    });

    if (!normalizedSeeds.length) {
      return;
    }

    const uniqueKeys = Array.from(new Set(normalizedSeeds.map((value) => String(value))));
    const signature = JSON.stringify(uniqueKeys.slice().sort());

    if (eligibleAutoLoadSignatureRef.current === signature) {
      return;
    }

    const uniqueSubjectCount = seededSubjectKeys.size || uniqueKeys.length;

    setSelectedSubjects((prev) => {
      const existingNormalized = new Set(prev.map((id) => String(id)));
      let changed = false;
      const next = [...prev];

      normalizedSeeds.forEach((seed) => {
        const key = String(seed);
        if (!existingNormalized.has(key)) {
          existingNormalized.add(key);
          next.push(seed);
          changed = true;
        }
      });

      if (changed) {
        const message = `Auto-added ${uniqueSubjectCount} eligible ${uniqueSubjectCount === 1 ? "subject" : "subjects"}.`;

        showToast({
          icon: "info",
          title: message,
        });

        return next;
      }

      return prev;
    });

    eligibleAutoLoadSignatureRef.current = signature;
  }, [eligibleListItems, normalizeIdentifier, isIdentifierBlocked, showToast]);

  const handleRemoveEligibleItem = useCallback(
    (item) => {
      const key = getEligibleItemKey(item);
      if (key === null || key === undefined) {
        return;
      }

      setDismissedEligibleSubjects((prev) => {
        const existing = prev.map((entry) => String(entry));
        if (existing.includes(String(key))) {
          return prev;
        }
        return [...prev, key];
      });

      const normalizedScheduleIds = (item.scheduleIds || [])
        .map((id) => normalizeIdentifier(id))
        .filter((id) => id !== null)
        .map((id) => String(id));

      if (normalizedScheduleIds.length) {
        setSelectedSubjects((prev) =>
          prev.filter((entry) => !normalizedScheduleIds.includes(String(entry)))
        );
      }

      showToast({
        icon: "info",
        title: `${item.code || "Subject"} removed from eligible list`,
      });
    },
    [getEligibleItemKey, normalizeIdentifier, showToast]
  );

  const handleRestoreEligibleItems = useCallback(() => {
    if (!dismissedEligibleSubjects.length) {
      return;
    }

    setDismissedEligibleSubjects([]);
    showToast({ icon: "info", title: "Restored removed subjects" });
  }, [dismissedEligibleSubjects.length, showToast]);

  const allSelectableSelected = useMemo(() => {
    if (selectableScheduleIds.length === 0) return false;
    if (selectedSubjects.length !== selectableScheduleIds.length) return false;
    return selectableScheduleIds.every((id) => selectedSubjects.includes(id));
  }, [selectableScheduleIds, selectedSubjects]);

  const normalizedMissingScheduleSubjects = useMemo(() =>
    subjectsWithoutSchedules.map((subject) => ({
      ...subject,
      selectionId: subject.curriculum_subject_id ?? subject.id,
    })),
  [subjectsWithoutSchedules]);

  const renderCurrentSubjectRows = (subjectList) => {
    const resolveYearLabel = (subject) =>
      subject?.year_level?.year_level ??
      subject?.sourceYearLevel ??
      subject?.yearLevel ??
      subject?.yearLevelName ??
      "-";

    const resolveSemesterLabel = (subject) =>
      subject?.semester?.semester ??
      subject?.semesterName ??
      subject?.sourceSemester ??
      subject?.semester_label ??
      "-";

    return subjectList.map((subj) => {
      const subjectKey = subj.id ?? subj.curriculum_subject_id ?? subj.subject_id;
      const isCredited = isSubjectCredited(subjectKey);
      const isSubjectBlocked = blockedSubjectIds.has(subj.id);
      const selectionId = subj.selectionId ?? subjectKey;
      const isSubjectSelected = selectedSubjects.includes(selectionId);
      const yearLabel = resolveYearLabel(subj) || "-";
      const semesterLabel = resolveSemesterLabel(subj) || "-";
      const lecUnits = Number(subj.lec_unit ?? subj.subject?.lec_unit ?? 0);
      const labUnits = Number(subj.lab_unit ?? subj.subject?.lab_unit ?? 0);
      const totalUnits = lecUnits + labUnits;

      return (
        <tr
          key={subjectKey}
          className={`border-b border-slate-100 ${
            isSubjectBlocked ? "cursor-not-allowed opacity-50" : "hover:bg-slate-50 cursor-pointer"
          } ${isCredited ? "opacity-60" : ""} ${isSubjectSelected ? "bg-sky-50/70" : ""}`}
          onClick={() => {
            if (!isSubjectBlocked && !isCredited) {
              toggleSubject(selectionId);
            }
          }}
        >
          <td className="px-3 py-2 text-center">
            {isSubjectBlocked ? (
              <Square size={16} className="text-slate-300 inline-block" />
            ) : isSubjectSelected ? (
              <CheckSquare size={16} className="text-sky-600 inline-block" />
            ) : (
              <Square size={16} className="text-slate-400 inline-block" />
            )}
          </td>
          <td className="px-3 py-2 font-semibold text-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span>{subj.subject?.code || "-"}</span>
              {subj.isBacktrack && (
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                  Retake
                </span>
              )}
              {subj.isFailed && (
                <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                  Needs Retake
                </span>
              )}
              {isCredited && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                  <CheckCircle size={11} /> Credited
                </span>
              )}
            </div>
          </td>
          <td className="px-3 py-2 text-slate-600">
            <div className="flex flex-col gap-1">
              <span className="font-medium text-slate-800">{subj.subject?.descriptive_title || "-"}</span>
              {subj.hasFailedPrerequisites && (
                <span className="text-[11px] text-amber-600">Prerequisite not met</span>
              )}
              {subj.reason === "no_schedule" && (
                <span className="text-[11px] text-slate-500">No schedule published yet</span>
              )}
            </div>
          </td>
          <td className="px-3 py-2 text-center text-slate-600">{yearLabel}</td>
          <td className="px-3 py-2 text-center text-slate-600">{semesterLabel}</td>
          <td className="px-3 py-2 text-center font-semibold text-slate-800">
            {formatUnitValue(totalUnits)}
          </td>
        </tr>
      );
    });
  };

  const renderRetakeRows = (subjectList) => {
    return subjectList.map((subj) => {
      const isCredited = isSubjectCredited(
        subj.id ?? subj.curriculum_subject_id ?? subj.subject_id
      );
      const scheduleList = Array.isArray(subj.schedules) ? subj.schedules : [];
      const noteMessages = [];
      const subjectScheduleIds = scheduleList.map((sched) => sched.id);
      const isSubjectSelected = subjectScheduleIds.length > 0
        ? subjectScheduleIds.every((id) => selectedSubjects.includes(id))
        : selectedSubjects.includes(subj.id);
      const isSubjectBlocked = blockedSubjectIds.has(subj.id);

      if (subj.allowCrossSection && scheduleList.length > 0) {
        noteMessages.push("Cross-section schedules available");
      }

      if (subj.hasFailedPrerequisites) {
        if (subj.isFailed || subj.isBacktrack) {
          noteMessages.push("Prerequisite previously failed — include prerequisite retake if needed");
        } else {
          noteMessages.push("Prerequisite failed — resolve before loading");
        }
      }

      if (subj.hasAnySchedules && scheduleList.length === 0) {
        noteMessages.push("No schedules for current section");
      }

      if (!subj.hasAnySchedules) {
        noteMessages.push("No schedules published yet");
      }

      if (subj.sourceYearLevel || subj.sourceSemester) {
        noteMessages.push(
          [`Originally offered in`, subj.sourceYearLevel || "previous year", subj.sourceSemester ? `• ${subj.sourceSemester}` : ""].filter(Boolean).join(" ")
        );
      }

      if (noteMessages.length === 0) {
        noteMessages.push("For retake prioritization");
      }

      if (scheduleList.length > 0) {
        return scheduleList.map((sched, idx) => {
          const rowSelected = selectedSubjects.includes(sched.id);
          const rowBlocked = isSubjectBlocked || blockedScheduleIds.has(sched.id);

          return (
            <tr
              key={`retake-${subj.id}-${sched.id}`}
              className={`transition ${rowBlocked ? "cursor-not-allowed opacity-60" : "hover:bg-rose-50 cursor-pointer"} ${rowSelected ? "bg-rose-50/80" : ""} ${isCredited ? "opacity-60" : ""}`}
              onClick={() => {
                if (!rowBlocked) {
                  toggleSubject(sched.id);
                }
              }}
            >
              {idx === 0 && (
                <>
                  <td
                    rowSpan={scheduleList.length}
                    className="border px-3.5 py-2 text-center"
                  >
                    {isSubjectBlocked ? (
                      <Square size={16} className="text-slate-300 inline-block" />
                    ) : isSubjectSelected ? (
                      <CheckSquare size={16} className="text-sky-600 inline-block" />
                    ) : (
                      <Square size={16} className="text-slate-400 inline-block" />
                    )}
                  </td>
                  <td rowSpan={scheduleList.length} className="border px-3.5 py-2 text-left font-medium text-slate-700">
                    {subj.subject?.code || "-"}
                  </td>
                  <td rowSpan={scheduleList.length} className="border px-3.5 py-2 text-left">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-slate-700">{subj.subject?.descriptive_title || "-"}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {subj.isFailed && (
                          <span className="inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                            Failed (3.0)
                          </span>
                        )}
                        {subj.isBacktrack && (
                          <span className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                            Backtrack
                          </span>
                        )}
                        {(subj.isFailed || subj.isBacktrack) && (
                          <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                            Retake
                          </span>
                        )}
                        {isCredited && (
                          <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                            Credited
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td
                    rowSpan={scheduleList.length}
                    className="border px-3.5 py-2 text-center"
                  >
                    {(subj.lec_unit || 0) + (subj.lab_unit || 0)}
                  </td>
                </>
              )}
              <td className="border px-3.5 py-2">{sched.schedule_day || "-"}</td>
              <td className="border px-3.5 py-2">
                {sched.section || sched.section_name || enrollment?.section?.section || enrollment?.section_name || "No section"}
              </td>
              <td className="border px-3.5 py-2">
                {formatTime(sched.start_time)} - {formatTime(sched.end_time)}
              </td>
              <td className="border px-3.5 py-2">{sched.classroom || "-"}</td>
              {idx === 0 && (
                <td rowSpan={scheduleList.length} className="border px-3.5 py-2 text-left text-slate-600">
                  {noteMessages.map((note, noteIdx) => (
                    <span key={noteIdx} className="block text-[11px] leading-relaxed">
                      {note}
                    </span>
                  ))}
                </td>
              )}
            </tr>
          );
        });
      }

      return (
        <tr
          key={`retake-${subj.id}`}
          className={`transition ${isSubjectBlocked ? "cursor-not-allowed opacity-60" : "hover:bg-rose-50 cursor-pointer"} ${isCredited ? "opacity-60" : ""}`}
          onClick={() => {
            if (!isSubjectBlocked) {
              toggleSubjectGroup(subj);
            }
          }}
        >
          <td className="border px-3.5 py-2 text-center">
            {isSubjectBlocked ? (
              <Square size={16} className="text-slate-300 inline-block" />
            ) : isSubjectSelected ? (
              <CheckSquare size={16} className="text-sky-600 inline-block" />
            ) : (
              <Square size={16} className="text-slate-400 inline-block" />
            )}
          </td>
          <td className="border px-3.5 py-2 text-left font-medium text-slate-700">
            {subj.subject?.code || "-"}
          </td>
          <td className="border px-3.5 py-2 text-left">
            <div className="flex flex-col gap-1">
              <span className="font-medium text-slate-700">{subj.subject?.descriptive_title || "-"}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {subj.isFailed && (
                  <span className="inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                    Failed (3.0)
                  </span>
                )}
                {subj.isBacktrack && (
                  <span className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                    Backtrack
                  </span>
                )}
                {isCredited && (
                  <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                    Credited
                  </span>
                )}
              </div>
            </div>
          </td>
          <td className="border px-3.5 py-2 text-center">
            {(subj.lec_unit || 0) + (subj.lab_unit || 0)}
          </td>
          <td className="border px-3.5 py-2 text-center text-slate-500" colSpan={4}>
            No schedules assigned
          </td>
          <td className="border px-3.5 py-2 text-left text-slate-600">
            {noteMessages.map((note, idx) => (
              <span key={idx} className="block text-[11px] leading-relaxed">
                {note}
              </span>
            ))}
          </td>
        </tr>
      );
    });
  };

  useEffect(() => {
    if (!preselectedSubjects?.length) return;

    const sanitized = preselectedSubjects.filter((id) => !isIdentifierBlocked(id));

    setSelectedSubjects((prev) => {
      const merged = Array.from(new Set([...prev, ...sanitized]));
      if (merged.length === prev.length && merged.every((id, index) => prev[index] === id)) {
        return prev;
      }
      return merged;
    });
  }, [preselectedSubjects, isIdentifierBlocked]);

  useEffect(() => {
    if (!blockedScheduleIds || blockedScheduleIds.size === 0) {
      return;
    }

    setSelectedSubjects((prev) => {
      let changed = false;
      const next = [];

      prev.forEach((entry) => {
        if (entry === null || entry === undefined) {
          return;
        }

        if (typeof entry === "object") {
          next.push(entry);
          return;
        }

        if (isIdentifierBlocked(entry)) {
          changed = true;
          return;
        }

        next.push(entry);
      });

      return changed ? next : prev;
    });
  }, [blockedScheduleIds, isIdentifierBlocked]);

  useEffect(() => {
    if (!Array.isArray(autoLoadPlan.scheduleIds) || autoLoadPlan.scheduleIds.length === 0) {
      return;
    }

    const normalizedPlanIds = autoLoadPlan.scheduleIds
      .map((entry) => normalizeIdentifier(entry))
      .filter((entry) => entry !== null);

    if (normalizedPlanIds.length === 0) {
      return;
    }

    const planSignature = JSON.stringify(
      normalizedPlanIds
        .map((value) => String(value))
        .sort()
    );

    if (autoLoadSignatureRef.current === planSignature) {
      return;
    }

    autoLoadToastShownRef.current = false;

    const existingKeys = new Set(
      selectedSubjects
        .map((entry) => normalizeIdentifier(entry))
        .filter((entry) => entry !== null)
        .map((entry) => String(entry))
    );

    const additions = normalizedPlanIds.filter((value) => {
      if (isIdentifierBlocked(value)) {
        return false;
      }

      const key = String(value);
      if (existingKeys.has(key)) {
        return false;
      }

      existingKeys.add(key);
      return true;
    });

    if (additions.length === 0) {
      autoLoadSignatureRef.current = planSignature;
      return;
    }

    setSelectedSubjects((prev) => [...prev, ...additions]);

    autoLoadSignatureRef.current = planSignature;

    if (!autoLoadToastShownRef.current && autoLoadPlan.details.length > 0) {
      const headlineSubjects = autoLoadPlan.details
        .slice(0, 3)
        .map((detail) => detail.subjectCode)
        .join(" • ");

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: `Auto-loaded ${additions.length} recommended ${additions.length === 1 ? "subject" : "subjects"}`,
        text: headlineSubjects ? `Highlighted: ${headlineSubjects}` : undefined,
        showConfirmButton: false,
        timer: 2800,
        timerProgressBar: true,
      });
      autoLoadToastShownRef.current = true;
    }
  }, [autoLoadPlan, normalizeIdentifier, isIdentifierBlocked, selectedSubjects]);

  const toggleSubject = useCallback((classScheduleId) => {
    if (blockedScheduleIds.has(classScheduleId)) {
      return;
    }

    setSelectedSubjects((prev) =>
      prev.includes(classScheduleId)
        ? prev.filter((id) => id !== classScheduleId)
        : [...prev, classScheduleId]
    );
  }, [blockedScheduleIds]);

  const registerManualSubject = useCallback((subject) => {
    if (!subject) return;

    setManualSubjects((prev) => {
      const normalizedId = Number(subject.id) || subject.id;
      if (!normalizedId) {
        return prev;
      }

      const subjectKey = getCurriculumItemKey({
        ...subject,
        id: normalizedId,
        subject_id: subject.subject_id,
        subject: subject.subject || subject.subjectInfo,
        semesterName: subject.sourceSemester ?? subject.semesterName,
      }) || `id:${normalizedId}`;

      const sanitized = {
        ...subject,
        id: normalizedId,
        subjectKey,
        sourceYearLevel: subject.sourceYearLevel ?? subject.source_year_level ?? null,
        sourceSemester: subject.sourceSemester ?? subject.source_semester ?? null,
        lec_unit: Number(subject.lec_unit) || 0,
        lab_unit: Number(subject.lab_unit) || 0,
        isManual: true,
      };

      const existsIndex = prev.findIndex((item) => item.subjectKey === subjectKey || (Number(item.id) || item.id) === normalizedId);
      if (existsIndex !== -1) {
        const updated = prev.slice();
        updated[existsIndex] = { ...updated[existsIndex], ...sanitized };
        return updated;
      }

      return [...prev, sanitized];
    });
  }, []);

  const logSubjectSchedules = useCallback((subject) => {
    if (!subject) {
      console.warn('[SubjectLoad] No subject provided when logging schedules.');
      return;
    }

    const curriculumId =
      subject.curriculum_subject_id ??
      subject.curriculumSubjectId ??
      subject.id ??
      subject.subject_id ??
      'unknown';

    const scheduleList = Array.isArray(subject.schedules) ? subject.schedules : [];

    console.groupCollapsed(
      `[SubjectLoad] Class schedules for curriculum_subject_id ${curriculumId}`
    );
    console.log('Subject details:', {
      curriculum_subject_id: subject.curriculum_subject_id ?? subject.curriculumSubjectId ?? null,
      subject_id: subject.subject_id ?? subject.subject?.id ?? null,
      code: subject.subject?.code ?? subject.code ?? 'N/A',
      descriptive_title: subject.subject?.descriptive_title ?? subject.descriptive_title ?? 'N/A',
    });

    if (scheduleList.length === 0) {
      console.warn('No class schedules attached to this subject.');
    } else {
      scheduleList.forEach((sched, index) => {
        console.log(`Schedule #${index + 1}`, {
          id: sched?.id ?? sched?.class_schedule_id ?? null,
          day: sched?.schedule_day ?? 'TBA',
          start_time: sched?.start_time ?? 'TBA',
          end_time: sched?.end_time ?? 'TBA',
          section: sched?.section ?? sched?.section_name ?? 'Unknown',
          room: sched?.classroom ?? sched?.room ?? 'Unassigned',
          instructor:
            sched?.faculty_name ??
            (sched?.faculty
              ? `${sched?.faculty?.fName ?? ''} ${sched?.faculty?.lName ?? ''}`.trim()
              : 'Unassigned'),
        });
      });
    }
    console.groupEnd();
  }, []);

  const toggleSubjectGroup = useCallback((subject) => {
    if (blockedSubjectIds.has(subject.id)) {
      return;
    }

    logSubjectSchedules(subject);

    const schedules = Array.isArray(subject?.schedules) ? subject.schedules : [];
    if (schedules.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No schedules available",
        text: "This subject does not have any schedules yet. Please add or check schedules first.",
        confirmButtonText: "OK",
      });
      return;
    }

    const subjectKey = subject?.subjectKey || subject?.id || subject?.subject_id;
    const existingIndex = selectedSubjects.findIndex((selected) => selected.subjectKey === subjectKey || selected.id === subject.id);

    if (existingIndex !== -1) {
      const updated = selectedSubjects.filter((_, index) => index !== existingIndex);
      setSelectedSubjects(updated);
      return;
    }

    const scheduleIds = schedules.map((sched) => sched.id);
    const allowedScheduleIds = scheduleIds.filter((id) => !blockedScheduleIds.has(id));

    setSelectedSubjects((prev) => {
      if (allowedScheduleIds.length > 0) {
        const fullySelected = allowedScheduleIds.every((id) => prev.includes(id));
        if (fullySelected) {
          return prev.filter((id) => !allowedScheduleIds.includes(id));
        }
        return Array.from(new Set([...prev, ...allowedScheduleIds]));
      }

      if (blockedSubjectIds.has(subject.id)) {
        return prev;
      }

      return prev.includes(subject.id)
        ? prev.filter((id) => id !== subject.id)
        : [...prev, subject.id];
    });
  }, [blockedScheduleIds, blockedSubjectIds, logSubjectSchedules]);

  const isSubjectFullySelected = useCallback(
    (subject) => {
      if (blockedSubjectIds.has(subject.id)) {
        return false;
      }

      const scheduleIds = Array.isArray(subject.schedules) ? subject.schedules.map((sched) => sched.id) : [];
      if (scheduleIds.length > 0) {
        return scheduleIds
          .filter((id) => !blockedScheduleIds.has(id))
          .every((id) => selectedSubjects.includes(id));
      }

      return selectedSubjects.includes(subject.id);
    },
    [blockedScheduleIds, blockedSubjectIds, selectedSubjects]
  );

  const toggleAllSubjects = useCallback(() => {
    if (allSelectableSelected) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(selectableScheduleIds);
    }
  }, [allSelectableSelected, selectableScheduleIds]);

  const renderPrerequisites = (prerequisites) => {
    if (!prerequisites || prerequisites.length === 0) return 'None';
    
    return (
      <div className="text-xs">
        {prerequisites.map((prereq, idx) => {
          const isCompleted = (enrollment.completed_subjects || []).some(
            s => s.subject_id === prereq.subject_id
          );
          return (
            <div key={idx} className={`flex items-center ${isCompleted ? 'text-green-600' : 'text-red-600'}`}>
              {isCompleted ? (
                <CheckSquare size={12} className="mr-1" />
              ) : (
                <WarningCircle size={12} className="mr-1" />
              )}
              {prereq.subject_code} - {prereq.subject_name}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSubjectRow = (subject) => {
    const isSelected = selectedSubjects.some(
      (s) => s.subject_id === subject.subject_id
    );

    const isDisabled =
      subject.is_credited ||
      subject.is_blocked ||
      (subject.has_prerequisites && !subject.prerequisites_met);

    const rowClass = isDisabled ? 'opacity-50' : '';
    const prereqStatus = subject.has_prerequisites 
      ? subject.prerequisites_met 
        ? 'text-green-600' 
        : 'text-red-600' 
      : '';

    return (
      <tr key={subject.id} className={`border-t border-slate-200 ${rowClass}`}>
        <td className="px-3 py-2 text-center">
          {isDisabled ? (
            <Square size={16} className="text-slate-300 inline-block" />
          ) : isSelected ? (
            <CheckSquare size={16} className="text-sky-600 inline-block" />
          ) : (
            <Square size={16} className="text-slate-400 inline-block" />
          )}
        </td>
        <td className="px-3 py-2 text-left font-medium text-slate-700">{subject.subject?.code || "-"}</td>
        <td className="px-3 py-2 text-left">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-slate-700">{subject.subject?.descriptive_title || "-"}</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {subject.isFailed && (
                <span className="inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                  Failed (3.0)
                </span>
              )}
              {subject.isBacktrack && (
                <span className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                  Backtrack
                </span>
              )}
              {isCredited && (
                <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                  Credited
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="px-3 py-2 text-center">{(subject.lec_unit || 0) + (subject.lab_unit || 0)}</td>
        <td className="px-3 py-2 text-left">
          <div className="font-medium">{subject.subject?.code}</div>
          {subject.has_prerequisites && (
            <div className="text-xs mt-1">
              <span className={subject.prerequisites_met ? 'text-green-600' : 'text-red-600'}>
                {subject.prerequisites_met ? 'Prerequisites met' : 'Missing prerequisites'}
              </span>
            </div>
          )}
        </td>
        <td className="px-3 py-2 text-left">
          <div>{subject.subject?.descriptive_title}</div>
          {subject.has_prerequisites && (
            <div className="mt-1">
              <div className="text-xs text-gray-500">Prerequisites:</div>
              {renderPrerequisites(subject.prerequisites)}
            </div>
          )}
        </td>
        <td className="px-3 py-2 text-center">{subject.semesterName || "-"}</td>
        <td className="px-3 py-2 text-left">
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => {
              if (!isDisabled) {
                const annotatedSubject = {
                  ...subject,
                  sourceYearLevel: subject.sourceYearLevel ?? subject.year_level,
                  sourceSemester: subject.sourceSemester ?? subject.semesterName,
                };

                if (!subjectRecord) {
                  registerManualSubject({
                    ...annotatedSubject,
                    lec_unit: annotatedSubject.lec_unit ?? subject.lec_unit ?? 0,
                    lab_unit: annotatedSubject.lab_unit ?? subject.lab_unit ?? 0,
                  });
                }

                toggleSubjectGroup(annotatedSubject);
              }
            }}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10.5px] font-medium transition ${
              isDisabled
                ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                : isSelected
                  ? "border border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:text-rose-700"
                  : "border border-sky-200 bg-sky-50 text-sky-600 hover:border-sky-300 hover:text-sky-700"
            }`}
          >
            {isDisabled
              ? "Unavailable"
              : isSelected
                ? "Remove from Subject Load"
                : "Add to Subject Load"}
          </button>
          {(subject.isFailed || subject.isBacktrack) && (
            <span className="mt-1 block text-[10px] font-semibold text-rose-600">
              Retake
            </span>
          )}
          {subject.has_prerequisites && !subject.prerequisites_met && (
            <span className="mt-1 block text-[10px] font-medium text-amber-600">
              Prerequisite failed — resolve before loading
            </span>
          )}
        </td>
      </tr>
    );
  };

  const totalUnits = useMemo(() => {
    return selectedSubjectDetails.reduce((sum, detail) => sum + detail.units, 0);
  }, [selectedSubjectDetails]);

  const curriculumTotalUnits = useMemo(() => {
    if (!Array.isArray(subjects) || subjects.length === 0) return 0;

    const subjectUnits = new Map();

    subjects.forEach((subj) => {
      if (subj.isManual) {
        return;
      }

      const subjectYear = normalizeYearLevel(
        subj?.year_level?.year_level ?? subj?.sourceYearLevel ?? subj?.yearLevel ?? null
      );

      const subjectSemester = normalizeSemesterLabel(
        subj?.semester?.semester ?? subj?.sourceSemester ?? subj?.semesterName ?? null
      );

      if (
        (enrollmentYearLevelCode && subjectYear && subjectYear !== enrollmentYearLevelCode) ||
        (enrollmentSemesterCode && subjectSemester && subjectSemester !== enrollmentSemesterCode)
      ) {
        return;
      }

      const identifier =
        subj.curriculum_subject_id ??
        subj.curriculumSubjectId ??
        subj.id ??
        subj.subject_id ??
        subj.subjectId ??
        subj?.subject?.id ??
        `${subjectYear || 'n/a'}-${subjectSemester || 'n/a'}-${subj?.subject?.code || Math.random()}`;

      if (subjectUnits.has(identifier)) {
        return;
      }

      const lecUnits = Number(subj.lec_unit) || 0;
      const labUnits = Number(subj.lab_unit) || 0;
      const totalUnits = lecUnits + labUnits;

      subjectUnits.set(identifier, totalUnits > 0 ? totalUnits : 0);
    });

    return Array.from(subjectUnits.values()).reduce((sum, units) => sum + units, 0);
  }, [subjects, normalizeYearLevel, normalizeSemesterLabel, enrollmentYearLevelCode, enrollmentSemesterCode]);

  const toNumberOrNull = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const formatGradeValue = (value) =>
    typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "-";

  const handleOpenCrediting = useCallback(() => {
    if (!enrollment?.id) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "Load enrollment details before crediting.",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
      return;
    }

    router.visit(route("program-head.enrollment.crediting", { id: enrollment.id }));
  }, [enrollment?.id]);

  useEffect(() => {
    if (!showActionMenu) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest?.('#subject-load-actions')) {
        setShowActionMenu(false);
      }
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [showActionMenu]);

  const handleSubjectLoad = useCallback(() => {
    if (subjectLoadSubmissionPayload.scheduleIds.length === 0) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "Please select at least one subject.",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
      return;
    }

    Swal.fire({
      title: "Loading subjects...",
      text: "Please wait while we save the selected subjects.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    console.info("Submitting subject load payload", {
      enrollmentId: enrollment?.id ?? null,
      scheduleIds: subjectLoadSubmissionPayload.scheduleIds,
      curriculumSubjectIds: subjectLoadSubmissionPayload.curriculumIds,
    });

    router.post(
      route("program-head.evaluation.subjectload.store"),
      {
        enrollment_id: enrollment?.id,
        class_schedule_ids: subjectLoadSubmissionPayload.scheduleIds,
        curriculum_subject_ids: subjectLoadSubmissionPayload.curriculumIds,
      },
      {
        onSuccess: () => {
          Swal.close();
          setSelectedSubjects([]);
          setManualSubjects([]);
          console.info("Subject load stored successfully.");
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Subjects loaded successfully!",
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
          });
          // Surface the COR preview for immediate printing once the load completes.
          setTimeout(() => {
            setShowCorModal(true);
          }, 250);
        },
        onError: (error) => {
          Swal.close();
          console.error("Subject load submission failed", {
            enrollmentId: enrollment?.id ?? null,
            scheduleIds: subjectLoadSubmissionPayload.scheduleIds,
            curriculumSubjectIds: subjectLoadSubmissionPayload.curriculumIds,
            error,
          });
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "error",
            title: "Failed to load subjects!",
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
          });
        },
      }
    );
  }, [subjectLoadSubmissionPayload, enrollment?.id]);

  const formatTime = useCallback((time) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  }, []);

  const handleCheckGrades = useCallback(async () => {
    if (!enrollment?.id) return;

    setGradesError("");
    setGradesData({});
    setShowGradesModal(true);
    setGradesLoading(true);

    try {
      const response = await axios.get(
        route("program-head.grades.index", { enrollment: enrollment.id })
      );

      if (response.data.success) {
        const grades = response.data.grades; // nested object

        // Ensure the structure is YearLevel -> Semester -> Subjects
        const nestedGrades = {};

        Object.entries(grades).forEach(([yearLevel, semesters]) => {
          nestedGrades[yearLevel] = {};

          Object.entries(semesters).forEach(([semester, subjectsList]) => {
            const normalized = Array.isArray(subjectsList)
              ? subjectsList.map((entry) => {
                  const midterm = toNumberOrNull(entry.midterm);
                  const final = toNumberOrNull(entry.final);
                  let gradeValue = toNumberOrNull(entry.grade);

                  if (gradeValue === null && midterm !== null && final !== null) {
                    gradeValue = Number(((midterm + final) / 2).toFixed(2));
                  }

                  return {
                    ...entry,
                    midterm,
                    final,
                    grade: gradeValue,
                    remarks: entry.remarks ?? entry.remark ?? null,
                  };
                })
              : [];

            nestedGrades[yearLevel][semester] = normalized;
          });
        });

        setGradesData(nestedGrades);
      } else {
        const message = response.data.message || "No grades found.";
        setGradesError(message);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "error",
          title: message,
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
      }
    } catch (error) {
      setGradesError("Failed to fetch grades.");
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "Failed to fetch grades!",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
    } finally {
      setGradesLoading(false);
    }
  }, [enrollment?.id]);

  const renderSelectedSubjects = () => (
    <div className="mb-6 bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-3">Added Subjects</h3>
      {selectedSubjects.length > 0 ? (
        <div className="space-y-2">
          {selectedSubjects.map((subject, index) => (
            <div key={`selected-${index}`} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <div>
                <span className="font-medium">{subject.subject?.code || 'N/A'}</span>
                <span className="text-gray-600 ml-2">{subject.subject?.descriptive_title || 'No title'}</span>
                <span className="ml-2 text-sm text-gray-500">
                  (Units: {subject.units || subject.subject?.units || 'N/A'})
                </span>
              </div>
              <button
                onClick={() => removeSelectedSubject(subject)}
                className="text-red-500 hover:text-red-700"
                title="Remove subject"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic">No subjects added yet. Add subjects from the list below.</p>
      )}
    </div>
  );

  const filteredSubjects = useMemo(() => {
    let filtered = subjectsWithoutSchedules;
    
    // Apply search filter if query exists
    if (subjectQuery.trim()) {
      const query = subjectQuery.toLowerCase();
      filtered = filtered.filter((subject) => {
        const code = subject.subject?.code?.toLowerCase() || "";
        const title = subject.subject?.descriptive_title?.toLowerCase() || "";
        return code.includes(query) || title.includes(query);
      });
    }
    
    // Sort by eligibility, then by year level, then by subject code
    return [...filtered].sort((a, b) => {
      // Sort by eligibility first (eligible subjects first)
      if (a.is_eligible !== b.is_eligible) {
        return a.is_eligible ? -1 : 1;
      }
      
      // Then by year level (lower first)
      const yearA = a.year_level_id || 0;
      const yearB = b.year_level_id || 0;
      if (yearA !== yearB) {
        return yearA - yearB;
      }
      
      // Then by subject code
      const codeA = a.subject?.code || '';
      const codeB = b.subject?.code || '';
      return codeA.localeCompare(codeB);
    });
  }, [subjectsWithoutSchedules, subjectQuery]);

  const isSubjectAlreadySelected = useCallback((subject) => {
    if (!subject) return false;
    const identifiers = buildSubjectIdentifierSet(subject);
    const scheduleIds = Array.isArray(subject.schedules) ? subject.schedules.map((sched) => sched.id) : [];

    return selectedSubjects.some((entry) => {
      if (entry === null || entry === undefined) {
        return false;
      }

      if (typeof entry === "object") {
        const entryIdentifiers = buildSubjectIdentifierSet(entry);
        for (const value of entryIdentifiers) {
          if (identifiers.has(value)) {
            return true;
          }
        }
        return false;
      }

      const numeric = Number(entry);
      if (Number.isFinite(numeric)) {
        if (identifiers.has(numeric)) {
          return true;
        }
        if (scheduleIds.some((id) => Number(id) === numeric)) {
          return true;
        }
      }

      const stringValue = String(entry);
      if (identifiers.has(stringValue)) {
        return true;
      }
      return scheduleIds.some((id) => String(id) === stringValue);
    });
  }, [buildSubjectIdentifierSet, selectedSubjects]);

  const isSubjectTentativelySelected = useCallback((subject) => {
    if (!subject) return false;
    const identifiers = buildSubjectIdentifierSet(subject);

    return tentativeSelections.some((entry) => {
      if (!entry) {
        return false;
      }

      const entryIdentifiers = buildSubjectIdentifierSet(entry);
      for (const value of entryIdentifiers) {
        if (identifiers.has(value)) {
          return true;
        }
      }
      return false;
    });
  }, [buildSubjectIdentifierSet, tentativeSelections]);

  const getEligibilityTooltip = (subject) => {
    if (subject.reason === 'already_passed') {
      return 'You have already passed this subject';
    } else if (subject.reason === 'prerequisites_not_met') {
      const missingPrereqs = subject.prerequisites
        ?.filter(p => !p.is_met)
        ?.map(p => p.subject?.code || 'N/A')
        .join(', ');
      return `Missing prerequisites: ${missingPrereqs || 'Unknown'}`;
    } else if (subject.reason === 'no_schedule') {
      return 'No available schedule for this subject';
    }
    return 'Not eligible for this subject';
  };

  const handleOpenOtherCurriculumModal = useCallback(() => {
    setOtherCurriculumError('');
    setOtherCurriculumSearch('');
    setOtherCurriculumResults([]);
    setOtherCurriculumCourseId('');
    setShowOtherCurriculumModal(true);
  }, []);

  useEffect(() => {
    if (!showOtherCurriculumModal) {
      return;
    }

    const fetchData = async () => {
      try {
        setOtherCurriculumLoading(true);
        const params = {};
        const trimmedSearch = otherCurriculumSearch.trim();
        if (trimmedSearch.length > 0) {
          params.search = trimmedSearch;
        }
        if (otherCurriculumCourseId) {
          params.course_id = otherCurriculumCourseId;
        }

        const response = await axios.get(route('program-head.curriculum.other.index'), { params });
        setOtherCurriculumResults(response.data?.curricula ?? []);
        setOtherCurriculumCourses(response.data?.courses ?? []);
        setOtherCurriculumError('');
      } catch (error) {
        console.error('Failed to fetch other curricula', error);
        setOtherCurriculumError('Failed to load other curricula. Please try again.');
      } finally {
        setOtherCurriculumLoading(false);
      }
    };

    fetchData();
  }, [otherCurriculumCourseId, otherCurriculumSearch, showOtherCurriculumModal]);

  const handleSelectExternalSubject = useCallback(
    (curriculum, subject) => {
      if (!subject) {
        return;
      }

      const manualPayload = {
        id: `external-${subject.curriculum_subject_id}`,
        curriculum_subject_id: subject.curriculum_subject_id,
        subject_id: subject.subject_id,
        subject: {
          code: subject.code,
          descriptive_title: subject.title,
        },
        lec_unit: subject.lec_unit ?? 0,
        lab_unit: subject.lab_unit ?? 0,
        year_level: { year_level: subject.year_level || 'N/A' },
        semester: { semester: subject.semester || 'N/A' },
        schedules: [],
        sourceYearLevel: subject.year_level,
        sourceSemester: subject.semester,
        course_name: curriculum.course_name,
        isManual: true,
      };

      registerManualSubject(manualPayload);
      toggleSubjectGroup(manualPayload);
      showToast({ icon: 'success', title: `${subject.code ?? subject.title ?? 'Subject'} added from other curriculum.` });
    },
    [registerManualSubject, toggleSubjectGroup, showToast]
  );

  return (
    <ProgramHeadLayout>
      <Head title="Subject Loading" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="mx-auto max-w-5xl space-y-5 px-4 py-5 md:space-y-6 md:px-5 md:py-8"
      >
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm md:px-6 md:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-600">
                  <BookOpen size={13} weight="duotone" /> Subject Loading
                </div>
              </div>
              <div>
                <h1 className="text-[1.5rem] font-semibold text-slate-900 md:text-[1.6rem]">
                  {enrollment?.student ? `${enrollment.student.lName}, ${enrollment.student.fName} ${enrollment.student.mName || ''}`.trim() : 'Subject Loading'}
                </h1>
                <p className="max-w-xl text-[12px] text-slate-500">
                  {enrollment?.student
                    ? `${studentMetaDetails} • Semi-automated recommendations ready—fine-tune before confirming.`
                    : 'Semi-automated subject recommendations are ready to review and finalize.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <div id="subject-load-actions" className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowActionMenu((prev) => !prev);
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                >
                  <DotsThreeOutlineVertical size={18} weight="bold" />
                </button>
                {showActionMenu && (
                  <div className="absolute right-0 z-20 mt-2 w-44 rounded-2xl border border-slate-200 bg-white py-1 text-[12px] font-medium text-slate-600 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionMenu(false);
                        handleOpenCrediting();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      Credit Subjects
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionMenu(false);
                        handleCheckGrades();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      View Grades
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(isIrregularStudent || loadWarning || loadError) && (
          <div className="mb-5 space-y-2">
            {isIrregularStudent && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-[12px] text-amber-700">
                <Info size={16} className="mt-0.5" />
                <span>This is an <strong>irregular student</strong>. Prerequisite requirements are relaxed for subject loading.</span>
              </div>
            )}
            {loadWarning && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-[12px] text-amber-700">
                <WarningCircle size={16} className="mt-0.5" />
                <span>{loadWarning}</span>
              </div>
            )}
            {loadError && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2.5 text-[12px] text-rose-700">
                <WarningCircle size={16} className="mt-0.5" />
                <span>{loadError}</span>
              </div>
            )}
          </div>
        )}

        {/* Student Info */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Student Snapshot
          </h2>
          <div className="mt-2 grid gap-2.5 text-[12px] text-slate-600 sm:grid-cols-2">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-800">Name:</span>
              <span>
                {enrollment?.student ? `${enrollment.student.lName}, ${enrollment.student.fName} ${enrollment.student.mName || ''}`.trim() : '-'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-800">ID Number:</span>
              <span>{enrollment?.student?.id_number || '-'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-800">Program:</span>
              <span>{programCourseLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-800">Year Level:</span>
              <span>{enrollment?.year_level?.year_level || enrollment?.year_level_name || '-'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-800">Section:</span>
              <span className="font-medium text-slate-800">
                {resolvedSectionLabel || 'Not assigned'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-800">Semester:</span>
              <span>{enrollment?.semester?.semester || enrollment?.semester_name || '-'}</span>
            </div>
            {isIrregularStudent && (
              <div className="col-span-2 flex items-center gap-1.5">
                <span className="font-medium text-slate-800">Status:</span>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
                  Irregular Student
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowSubjectListModal(true)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-slate-600 shadow-sm transition hover:border-sky-200 hover:text-sky-600"
            >
              <BookOpen size={14} weight="bold" /> View full subject list
            </button>
            <button
              type="button"
              onClick={handleOpenOtherCurriculumModal}
              className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-[12px] font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
            >
              <FileText size={14} weight="duotone" /> Search other curriculum
            </button>
          </div>
        </div>

        {allAvailableListItems.length > 0 && (
          <div className="mb-5 space-y-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  <CheckSquare size={14} weight="bold" /> Eligible now
                </span>
                <span className="text-[11.5px] text-emerald-700">
                  {`${eligibleListSummary.subjectCount} subject${eligibleListSummary.subjectCount === 1 ? " is" : "s are"} ready • ${formatUnitsLabel(eligibleListSummary.totalUnits)}`}
                </span>
                {dismissedEligibleSubjects.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreEligibleItems}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700"
                  >
                    Restore removed ({dismissedEligibleSubjects.length})
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">Subjects ready this term</h3>
                <span className="text-[11px] font-medium text-slate-500">
                  Tap a row to add or remove it from the student’s load
                </span>
              </div>
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200/80">
                <table className="min-w-full text-[11px] leading-snug text-slate-600">
                  <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-[0.12em]">
                    <tr>
                      <th className="px-2.5 py-1.5 text-center font-semibold w-12">Added</th>
                      <th className="px-2.5 py-1.5 text-left font-semibold">Code</th>
                      <th className="px-2.5 py-1.5 text-left font-semibold">Title</th>
                      <th className="px-2.5 py-1.5 text-left font-semibold">Year/Semester</th>
                      <th className="px-2.5 py-1.5 text-center font-semibold">Lec</th>
                      <th className="px-2.5 py-1.5 text-center font-semibold">Lab</th>
                      <th className="px-2.5 py-1.5 text-center font-semibold">Total</th>
                      <th className="px-2.5 py-1.5 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAvailableListItems.map((item) => {
                      const isCredited = isSubjectCredited(
                        item.subject_id ?? item.curriculum_subject_id ?? null
                      );
                      const isSelected = item.scheduleIds.some((id) => selectedScheduleSet.has(String(id)));
                      const isDisabled = item.scheduleIds.length === 0 || isCredited;
                      const lecValue = Number(item.lecUnit);
                      const labValue = Number(item.labUnit);
                      const hasLecUnits = Number.isFinite(lecValue) && lecValue > 0;
                      const hasLabUnits = Number.isFinite(labValue) && labValue > 0;

                      const handleRowClick = () => {
                        if (isDisabled) {
                          return;
                        }

                        item.scheduleIds.forEach((id) => {
                          const normalized = normalizeIdentifier(id);
                          if (normalized !== null) {
                            toggleSubject(normalized);
                          }
                        });
                      };

                      return (
                        <tr
                          key={item.listKey}
                          onClick={handleRowClick}
                          className={`border-t border-slate-100 transition ${
                            isDisabled
                              ? "cursor-not-allowed bg-slate-50/60 text-slate-400"
                              : isSelected
                                ? "cursor-pointer bg-emerald-50/80 text-slate-800"
                                : "cursor-pointer hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-2.5 py-1.5 text-center">
                            {isDisabled ? (
                              <Square size={14} className="text-slate-300 inline-block" />
                            ) : isSelected ? (
                              <CheckSquare size={14} className="text-emerald-500 inline-block" />
                            ) : (
                              <Square size={14} className="text-slate-400 inline-block" />
                            )}
                          </td>
                          <td className="px-2.5 py-1.5 font-semibold text-slate-800">
                            <div className="flex items-center gap-2">
                              <span>{item.code}</span>
                              {item.isManual && (
                                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                                  Manual
                                </span>
                              )}
                              {item.isRetake && (
                                <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                                  Retake
                                </span>
                              )}
                              {item.is_credited && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-[11px] font-semibold text-blue-600">
                                  <CheckCircle size={12} /> Credited
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2.5 py-1.5 text-slate-600">{item.title}</td>
                          <td className="px-2.5 py-1.5 text-slate-500">
                            <div className="flex flex-wrap items-center gap-1">
                              {item.yearLabel && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">
                                  {item.yearLabel}
                                </span>
                              )}
                              {item.semesterLabel && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">
                                  {item.semesterLabel}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2.5 py-1.5 text-center text-slate-700">
                            {formatUnitValue(hasLecUnits ? lecValue : 0)}
                          </td>
                          <td className="px-2.5 py-1.5 text-center text-slate-700">
                            {formatUnitValue(hasLabUnits ? labValue : 0)}
                          </td>
                          <td className="px-2.5 py-1.5 text-center font-semibold text-slate-800">
                            {formatUnitsLabel(item.units)}
                          </td>
                          <td className="px-2.5 py-1.5 text-center">
                            {isDisabled ? (
                              <span className="text-[11px] text-slate-400">
                                {isCredited ? "Credited" : "No schedule"}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRemoveEligibleItem(item);
                                }}
                                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 text-slate-600">
                      <td colSpan="7" className="px-2.5 py-1.5 text-right text-[10.5px] font-semibold">
                        Total: {formatUnitsLabel(eligibleListSummary.totalUnits)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Total Units & Action */}
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-500">
              {curriculumTotalUnits > 0
                ? `${formatUnitValue(totalUnits)}/${formatUnitValue(curriculumTotalUnits)}`
                : formatUnitValue(totalUnits)}
            </span>
            <div className="flex flex-col leading-tight">
              <span>Total credit units added</span>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${
              selectedSubjects.length > 0
                ? "bg-sky-600 hover:bg-sky-700"
                : "cursor-not-allowed bg-slate-300"
            }`}
            onClick={handleSubjectLoad}
            disabled={selectedSubjects.length === 0}
          >
            Load Added Subjects
          </motion.button>
        </div>

        {/* Full subject list modal */}
        {showSubjectListModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="relative flex h-[85vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Subjects ready this term</h2>
                  <p className="text-[12px] text-slate-500">
                    Review the full curriculum list. Tap a row to add or remove it from the load.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubjectListModal(false)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[12px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                >
                  Close
                </button>
              </div>

              <div className="flex flex-1 flex-col overflow-hidden px-5 py-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[11.5px] text-slate-500">
                    {`${eligibleListSummary.subjectCount} subject${eligibleListSummary.subjectCount === 1 ? "" : "s"} • ${formatUnitsLabel(eligibleListSummary.totalUnits)}`}
                  </div>
                  <div className="relative w-full sm:w-72">
                    <input
                      type="text"
                      value={subjectQuery}
                      onChange={(event) => setSubjectQuery(event.target.value)}
                      placeholder="Search by code or title"
                      className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-[11.5px] text-slate-600 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200">
                  <div className="h-full overflow-y-auto">
                    <table className="min-w-full border-collapse text-[11px] leading-snug text-slate-600">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] text-slate-500 uppercase tracking-[0.12em]">
                        <tr>
                          <th className="px-2.5 py-1.5 text-center font-semibold">Select</th>
                          <th className="px-2.5 py-1.5 text-left font-semibold">Code</th>
                          <th className="px-2.5 py-1.5 text-left font-semibold">Subject</th>
                          <th className="px-2.5 py-1.5 text-left font-semibold">Year</th>
                          <th className="px-2.5 py-1.5 text-left font-semibold">Semester</th>
                          <th className="px-2.5 py-1.5 text-left font-semibold">Units</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubjects.length === 0 && !loadError ? (
                          <tr>
                            <td colSpan="5" className="px-3 py-6 text-center">
                              <div className="mb-2 font-medium text-amber-600">
                                No subjects found in the curriculum
                              </div>
                              <div className="text-sm text-slate-500">
                                Semi-automated loading will populate once the curriculum for this program and year level is published.
                                Kindly verify the student's curriculum setup or refresh when schedules become available.
                              </div>
                            </td>
                          </tr>
                        ) : loadError ? (
                          <tr>
                            <td colSpan="5" className="px-3 py-6 text-center">
                              <div className="mb-2 font-medium text-rose-600">Error loading subjects</div>
                              <div className="mb-2 text-sm text-rose-500">
                                {typeof loadError === "object" ? JSON.stringify(loadError) : String(loadError)}
                              </div>
                              <button
                                onClick={() => window.location.reload()}
                                className="mt-2 rounded bg-rose-100 px-3 py-1 text-sm font-medium text-rose-700 transition hover:bg-rose-200"
                              >
                                Try Again
                              </button>
                            </td>
                          </tr>
                        ) : loadWarning ? (
                          <tr>
                            <td colSpan="5" className="px-3 py-6 text-center text-amber-600">
                              Warning: {loadWarning}
                            </td>
                          </tr>
                        ) : filteredSubjects.length > 0 ? (
                          renderCurrentSubjectRows(filteredSubjects)
                        ) : (
                          <tr>
                            <td colSpan="5" className="px-3 py-6 text-center text-slate-400">
                              {availableSubjects.length === 0
                                ? "No subjects found. The subject list is empty."
                                : "No subjects available for the current semester."}
                              <div className="mt-2 text-sm text-slate-500">
                                Try switching tabs, clearing the search filter, or refreshing once new schedules are published.
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <span className="text-[11px] font-semibold text-gray-700">
                      Overall Total Units:&nbsp;
                      <span className="inline-flex items-center rounded px-2 py-0.5 bg-slate-100 text-gray-900">
                        {corDisplayTotalUnits}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showOtherCurriculumModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-16"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-800">Search other curricula</h2>
                  <p className="text-[12px] text-slate-500">Browse approved curricula from other courses. Only subjects without prerequisites are listed.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOtherCurriculumModal(false)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[12px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                >
                  Close
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={otherCurriculumSearch}
                      onChange={(event) => setOtherCurriculumSearch(event.target.value)}
                      placeholder="Search curriculum or course"
                      className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] text-slate-600 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div className="w-full sm:w-64">
                    <select
                      value={otherCurriculumCourseId}
                      onChange={(event) => setOtherCurriculumCourseId(event.target.value)}
                      className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] text-slate-600 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">All courses</option>
                      {otherCurriculumCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.code ? `${course.code} • ${course.name}` : course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {otherCurriculumLoading && (
                    <span className="text-[12px] text-slate-500">Loading…</span>
                  )}
                </div>

                {otherCurriculumError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-[12px] text-rose-600">
                    {otherCurriculumError}
                  </div>
                )}

                <div className="max-h-[60vh] overflow-hidden rounded-2xl border border-slate-200">
                  <div className="max-h-[60vh] overflow-auto">
                    <table className="min-w-full border-collapse text-[11px] leading-snug text-slate-600">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                        <tr>
                          <th className="px-2.5 py-1.5 text-left font-semibold">Course</th>
                          <th className="px-2.5 py-1.5 text-left font-semibold">Curriculum</th>
                          <th className="px-2.5 py-1.5 text-left font-semibold">Code</th>
                          <th className="px-2.5 py-1.5 text-left font-semibold">Subject</th>
                          <th className="px-2.5 py-1.5 text-left font-semibold">Year/Sem</th>
                          <th className="px-2.5 py-1.5 text-left font-semibold">Units</th>
                          <th className="px-2.5 py-1.5 text-center font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {otherCurriculumTableRows.length === 0 && !otherCurriculumLoading ? (
                          <tr>
                            <td colSpan="7" className="px-3 py-6 text-center text-[12px] text-slate-500">
                              No subjects match your filters yet.
                            </td>
                          </tr>
                        ) : (
                          otherCurriculumTableRows.map(({ key, curriculum, subject }) => {
                            const unitTotal = Number(subject.lec_unit ?? 0) + Number(subject.lab_unit ?? 0);
                            return (
                              <tr key={key} className="border-t border-slate-100 text-[11px]">
                                <td className="px-2.5 py-1.5 font-medium text-slate-700">
                                  {curriculum.course_code ? `${curriculum.course_code} • ${curriculum.course_name}` : curriculum.course_name || 'N/A'}
                                </td>
                                <td className="px-2.5 py-1.5 text-slate-600">{curriculum.name}</td>
                                <td className="px-2.5 py-1.5 font-semibold text-slate-800">{subject.code || '---'}</td>
                                <td className="px-2.5 py-1.5 text-slate-600">{subject.title || 'Untitled'}</td>
                                <td className="px-2.5 py-1.5 text-slate-500">{subject.year_level || 'Year N/A'} • {subject.semester || 'Sem N/A'}</td>
                                <td className="px-2.5 py-1.5 text-center font-semibold text-slate-700">{unitTotal}</td>
                                <td className="px-2.5 py-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectExternalSubject(curriculum, subject)}
                                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                                  >
                                    Add
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* COR Preview Modal */}
        {showCorModal && corStudentRecord && isCorPortalReady &&
          createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-3 pt-4 overflow-y-auto"
            >
              <style>{corPrintStyles}</style>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                id="cor-print-wrapper"
                className="bg-white w-full max-w-[720px] rounded-lg p-6 relative my-4"
              >
                <button
                  type="button"
                  onClick={() => setShowCorModal(false)}
                  className="absolute top-3 right-3 text-gray-500 hover:text-red-600 transition print:hidden text-sm z-10"
                >
                  ✖
                </button>

                <div className="text-center mb-4 border-b pb-3 print:mt-0">
                  <img src="/images/buksu_logo.png" alt="BukSU Logo" className="mx-auto w-12 h-12 md:w-10 md:h-10 mb-1 print:w-14 print:h-14" />
                  <div className="text-center flex-1">
                    <h1 className="font-extrabold text-base text-gray-900 leading-tight">Bukidnon State University</h1>
                    <h2 className="text-xs font-medium text-gray-700">Alubijid Campus</h2>
                    <p className="text-[10px] text-gray-500">Poblacion, Alubijid, Misamis Oriental</p>
                    <h3 className="font-bold text-sm mt-1 underline decoration-indigo-600">
                      Certificate of Registration (COR)
                    </h3>
                  </div>
                </div>

                <div className="bg-white border rounded-lg shadow-sm p-3 mb-4 cor-card">
                  <div className="grid grid-cols-2 gap-4 text-xs cor-info-grid">
                    <div className="space-y-1.5">
                      <p className="flex">
                        <span className="font-semibold text-gray-600 w-20">Name:</span>
                        <span className="text-gray-800 truncate">
                          {`${corStudentRecord?.student?.lName || ""}, ${corStudentRecord?.student?.fName || ""} ${corStudentRecord?.student?.mName || ""}`.replace(/\s+/g, " ").trim() || "-"}
                        </span>
                      </p>
                      <p className="flex">
                        <span className="font-semibold text-gray-600 w-20">ID No:</span>
                        <span className="text-gray-800">{corStudentRecord?.student?.id_number || "-"}</span>
                      </p>
                      <p className="flex">
                        <span className="font-semibold text-gray-600 w-20">Course/Yr:</span>
                        <span className="text-gray-800">
                          {corStudentRecord?.course?.code || corStudentRecord?.program?.code || "-"}
                          {corStudentRecord?.major?.code ? ` - ${corStudentRecord.major.code}` : ""} {corStudentRecord?.year_level?.year_level || corStudentRecord?.year_level_name || ""}
                        </span>
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="flex">
                        <span className="font-semibold text-gray-600 w-20">Period:</span>
                        <span className="text-gray-800">{corPeriodLabel}</span>
                      </p>
                      <p className="flex">
                        <span className="font-semibold text-gray-600 w-20">Date:</span>
                        <span className="text-gray-800">
                          {corStudentRecord?.enrollment_date
                            ? new Date(corStudentRecord.enrollment_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                            : new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      </p>
                      <p className="flex">
                        <span className="font-semibold text-gray-600 w-20">Section:</span>
                        <span className="text-gray-800">{corStudentRecord?.section?.section || resolvedSectionLabel || "N/A"}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="cor-card mb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h4 className="text-xs font-semibold text-gray-700">Subjects</h4>
                    <p className="text-xs font-semibold text-gray-700">
                      Total Units: <span className="ml-1 font-bold">{corDisplayTotalUnits}</span>
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto text-[10px] border-t border-b border-gray-600">
                      <thead className="bg-indigo-50 text-gray-700 border-b border-gray-400">
                        <tr>
                          <th className="px-1 py-1 text-left w-16">Code</th>
                          <th className="px-1 py-1 text-left w-48">Descriptive Title</th>
                          <th className="px-1 py-1 text-center w-10">Units</th>
                          <th className="px-1 py-1 text-center w-14">Day</th>
                          <th className="px-1 py-1 text-center w-28">Time</th>
                          <th className="px-1 py-1 text-center w-16">Room</th>
                          <th className="px-1 py-1 text-center w-40">Instructor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {corPreviewSubjects.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="px-2 py-2 text-center text-gray-500">
                              No subjects found.
                            </td>
                          </tr>
                        ) : (
                          corPreviewSubjects.map((subject, idx) => (
                            <tr key={subject.key || idx} className="border-b border-gray-200">
                              <td className="px-1 py-1 text-center">{subject.code || "-"}</td>
                              <td className="px-1 py-1 break-words">{subject.title || "-"}</td>
                              <td className="px-1 py-1 text-center">{subject.units}</td>
                              <td className="px-1 py-1 text-center">{subject.day}</td>
                              <td className="px-1 py-1 text-center text-[9px]">{subject.time}</td>
                              <td className="px-1 py-1 text-center">{subject.room}</td>
                              <td className="px-1 py-1 text-center break-words">{subject.instructor}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="cor-assessment-summary gap-4 mb-4">
                  <div className="cor-card">
                    <h4 className="text-xs font-semibold mb-1 text-gray-700">Assessment</h4>
                    <table className="w-full text-[11px]">
                      <thead className="text-gray-600 border-b">
                        <tr>
                          <th className="px-2 py-1 text-left font-medium">Particulars</th>
                          <th className="px-2 py-1 text-center font-medium">Amount</th>
                          <th className="px-2 py-1 text-center font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-0.5">Tuition Fee ({corDisplayTotalUnits} × {formatCurrency(tuitionPerUnit)}/unit)</td>
                          <td className="px-2 py-0.5 text-center">{formatCurrency(corDisplayTotalUnits * tuitionPerUnit)}</td>
                          <td className="px-2 py-0.5 text-center">{formatCurrency(corDisplayTotalUnits * tuitionPerUnit)}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-0.5">Medical and Dental Fee</td>
                          <td className="px-2 py-0.5 text-center">{formatCurrency(medicalAndDentalFee)}</td>
                          <td className="px-2 py-0.5 text-center">{formatCurrency(medicalAndDentalFee)}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-2 py-0.5">Total Assessment</td>
                          <td></td>
                          <td className="px-2 py-0.5 text-center">{formatCurrency(corDisplayAssessment)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="cor-card">
                    <h4 className="text-xs font-semibold mb-1 text-gray-700">Summary</h4>
                    <table className="w-full text-[11px]">
                      <tbody>
                        <tr>
                          <td className="px-2 py-0.5 text-gray-700">Current Assessment</td>
                          <td className="px-2 py-0.5 text-right">{formatCurrency(corDisplayAssessment)}</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-0.5 text-gray-700">Previous Balance</td>
                          <td className="px-2 py-0.5 text-right">{formatCurrency(corPreviousBalance)}</td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td className="px-2 py-0.5">Current Receivable</td>
                          <td className="px-2 py-0.5 text-right">{formatCurrency(corDisplayCurrentReceivable)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-[11px] text-gray-600 space-y-2 cor-card cor-footer">
                  <div>
                    <p className="font-semibold text-gray-800">Evaluated by: {corEvaluatorName || "N/A"}</p>
                    <p>Program Head / Evaluator</p>
                  </div>
                  <p>Generated on {new Date().toLocaleDateString()}</p>
                  <p>Reference: ENR-{String(enrollment?.id || "0000").padStart(4, "0")}</p>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 print-hidden">
                  <div className="flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => setShowCorModal(false)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Close
                    </button>
                    
                    {/* Back to Enrollment button - shown for both Program Head and Faculty */}
                    <button
                      type="button"
                      onClick={() => router.visit(route('program-head.evaluation.enrollment'))}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                    >
                      <ArrowLeft size={12} weight="bold" /> Back to Enrollment
                    </button>

                    {/* Go to Enrolled Students - only for Program Head */}
                    {authUser?.role === 'program_head' && (
                      <button
                        type="button"
                        onClick={() => router.visit(route('program-head.students.enrolled'))}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
                      >
                        <UsersThree size={12} weight="bold" /> Go to Enrolled Students
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    title="Print COR"
                    onClick={() => window.print()}
                    className="bg-indigo-600 text-white w-11 h-11 rounded-full text-xs font-medium shadow hover:bg-indigo-700 transition inline-flex items-center justify-center"
                  >
                    <FileText size={18} />
                  </button>
                </div>
              </motion.div>
            </motion.div>,
            corPrintRootRef.current
          )}

        {/* Grades Modal */}
        {showGradesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start z-50 pt-20"
          >
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              className="bg-white rounded-lg shadow-lg p-4 max-w-2xl w-full max-h-[500px] flex flex-col overflow-hidden"
            >
              <h2 className="text-lg font-semibold mb-3 text-gray-800">
                Grades • {enrollment.first_name} {enrollment.last_name}
              </h2>

              <div className="overflow-y-auto flex-1">
                {gradesLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Fetching latest grades...
                  </div>
                ) : gradesError ? (
                  <div className="flex h-full items-center justify-center text-center text-sm text-red-500">
                    {gradesError}
                  </div>
                ) : Object.keys(gradesData).length > 0 ? (
                  Object.entries(gradesData).map(([yearLevel, semesters]) => (
                    <div key={yearLevel} className="mb-4">
                      <h3 className="text-sm font-bold text-gray-700 mb-1 border-b border-gray-200 pb-1">
                        {yearLevel}
                      </h3>

                      {Object.entries(semesters).map(([semester, subjects]) => (
                        <div key={semester} className="mb-3">
                          <h4 className="text-xs font-semibold text-gray-600 mb-1">{semester}</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border border-gray-200 rounded table-auto">
                              <thead className="bg-blue-50 text-gray-700 sticky top-0">
                                <tr>
                                  <th className="border px-2 py-1 text-left">Code</th>
                                  <th className="border px-2 py-1 text-left">Subject</th>
                                  <th className="border px-2 py-1 text-center">Final Grade</th>
                                  <th className="border px-2 py-1 text-left">Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.isArray(subjects) && subjects.length > 0 ? (
                                  subjects.map((g) => {
                                    const midtermVal = typeof g.midterm === "number" ? g.midterm : null;
                                    const finalVal = typeof g.final === "number" ? g.final : null;
                                    const computedAverage = midtermVal !== null && finalVal !== null
                                      ? (midtermVal + finalVal) / 2
                                      : typeof g.grade === "number"
                                        ? g.grade
                                        : null;
                                    const remarkLower = (g.remarks || "").toLowerCase();
                                    const isPassed = remarkLower.includes("pass");
                                    const isFailed = remarkLower.includes("fail");
                                    const gradeColorClass = isPassed
                                      ? "text-emerald-600"
                                      : isFailed
                                        ? "text-rose-600"
                                        : "text-gray-700";

                                    return (
                                      <tr key={`${g.enrollment_id}-${g.subject_id}`} className="hover:bg-gray-50">
                                        <td className="border px-2 py-1">{g.subject_code || "-"}</td>
                                        <td className="border px-2 py-1">{g.subject_title || "-"}</td>
                                        <td className={`border px-2 py-1 text-center font-semibold ${gradeColorClass}`}>{formatGradeValue(computedAverage)}</td>
                                        <td className={`border px-2 py-1 ${gradeColorClass}`}>{g.remarks || "-"}</td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan="4" className="border px-2 py-2 text-center text-gray-400">
                                      No subjects found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-10 text-sm">
                    No grades available
                  </div>
                )}
              </div>


              <div className="flex justify-end mt-3">
                <button
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm font-medium transition"
                  onClick={() => {
                    setShowGradesModal(false);
                    setGradesData({});
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </ProgramHeadLayout>
  );
}
