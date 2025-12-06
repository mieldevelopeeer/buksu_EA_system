import React, { useEffect, useMemo, useState } from "react";
import { Head, Link, useForm, router } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import AddSubjectModal from "./components/AddSubjectModal";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CalendarClock,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  Image,
  GraduationCap,
  Layers,
  MapPin,
  User,
  Mail,
  Phone,
  VenetianMask,
  Pencil,
  Upload,
  Loader2,
  X,
  Eye,
  MinusCircle,
  Trash2,
  MoreVertical,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Search,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import Swal from "sweetalert2";

const cardClass = "rounded-lg border border-slate-200 bg-white p-4 shadow-sm";
const sectionTitleClass = "mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800";
const detailListClass =
  "divide-y divide-slate-100 text-[11px] leading-snug text-slate-600 [&>div>dd]:text-right [&>div>dd]:text-[11px] [&>div>dd]:text-slate-700";
const detailRowClass = "flex items-start justify-between gap-3 py-1.5 first:pt-0 last:pb-0";
const detailLabelClass = "flex items-center gap-1.5 font-medium text-slate-700";
const detailIconClass = "h-3.5 w-3.5 text-blue-500";
const emptyStateClass = "rounded-lg border border-dashed border-slate-200 bg-white py-7 text-center text-[11px] text-slate-500";
const metricCardClass = "rounded-lg border border-slate-200 bg-white p-4 shadow-sm";
const tableShellClass = "rounded-lg border border-slate-200 bg-white shadow-sm";
const tabListClass =
  "flex flex-wrap gap-1 rounded-full border border-slate-200/80 bg-white/80 p-1 shadow-lg shadow-slate-200/70 backdrop-blur";
const tabButtonBase =
  "inline-flex items-center gap-1.5 rounded-full border border-transparent px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const tabButtonActive =
  "border-blue-300 bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700 shadow-sm shadow-blue-100/70 hover:border-blue-400";
const tabButtonInactive = "hover:border-slate-200 hover:bg-white hover:text-blue-600";
const badgeClasses = {
  submitted: "inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-[11px] font-semibold text-emerald-600",
  pending: "inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-[11px] font-semibold text-slate-500",
};

const historyStatusTone = (status) => {
  const normalized = (status || "").toString().toLowerCase();

  if (normalized === "unenrolled") {
    return "border-rose-200 bg-rose-50 text-rose-600";
  }

  if (normalized === "enrolled") {
    return "border-emerald-200 bg-emerald-50 text-emerald-600";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
};

const ACTIVE_TAB_STORAGE_KEY = "student-record-active-tab";
const DEFAULT_DROP_WINDOW_DAYS = 3;

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

const hasRelativeInfo = (info) => !!info && (info.name || info.contact || info.occupation);

const renderRelativeCard = (title, info) => {
  if (!hasRelativeInfo(info)) return null;

  return (
    <div key={title} className={cardClass}>
      <h3 className={sectionTitleClass}>
        <User className="h-4 w-4 text-slate-500" /> {title}
      </h3>
      <dl className={detailListClass}>
        <div className={detailRowClass}>
          <dt className="font-medium">Name</dt>
          <dd className="text-right text-[11px]">{info.name ?? "—"}</dd>
        </div>
        <div className={detailRowClass}>
          <dt className="font-medium">Contact</dt>
          <dd className="text-right text-[11px]">{info.contact ?? "—"}</dd>
        </div>
        <div className={detailRowClass}>
          <dt className="font-medium">Occupation</dt>
          <dd className="text-right text-[11px]">{info.occupation ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
};

const formatAddress = (detail) => {
  if (!detail) return null;
  const { street, barangay, municipality, province } = detail;
  const parts = [street, barangay, municipality, province].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
};

const buildAddress = (details, prefix) => {
  if (!details) return null;
  return formatAddress({
    street: details[`${prefix}_street`],
    barangay: details[`${prefix}_barangay`],
    municipality: details[`${prefix}_municipality`],
    province: details[`${prefix}_province`],
  });
};

const buildParentInfo = (details, type) => {
  if (!details) return null;
  return {
    name: details[`${type}_name`] ?? null,
    contact: details[`${type}_contact`] ?? null,
    occupation: details[`${type}_occupation`] ?? null,
  };

};

const mapProofUrl = (path) => {
  if (!path) return null;
  return path.startsWith("http") ? path : `/storage/${path}`;
};

const normalizeRequirementCategory = (value) => {
  if (!value) return "general";
  const text = value.toString().trim();
  if (!text) return "general";
  return text.toLowerCase();
};

const formatRequirementCategoryLabel = (value) => {
  const text = value?.toString().trim();
  if (!text) return "General";
  return text
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const educationEntries = (details) => {
  if (!details) return [];
  const entries = [
    {
      label: "Last School Attended",
      name: details.last_school_attended ?? details.last_school_name,
      year: details.last_school_year_graduated,
    },
    {
      label: "College",
      name: details.college_name,
      year: details.college_year_graduated,
    },
    {
      label: "Senior High School",
      name: details.senior_high_school_name,
      year: details.senior_high_school_year_graduated,
    },
    {
      label: "Junior High School",
      name: details.junior_high_school_name,
      year: details.junior_high_school_year_graduated,
    },
    {
      label: "Elementary",
      name: details.elementary_school_name,
      year: details.elementary_school_year_graduated,
    },
  ];

  return entries.filter((entry) => entry.name || entry.year);
};

const formatTime = (time) => {
  if (!time) return "TBA";
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minuteStr} ${ampm}`;
};

const buildScheduleLabel = (schedule, scheduleId = null) => {
  if (schedule) {
    const day = schedule.schedule_day || "TBA";
    const start = formatTime(schedule.start_time);
    const end = formatTime(schedule.end_time);
    const room = schedule.classroom?.room_number || "TBA";
    return `${day} • ${start} – ${end} • Room ${room}`;
  }

  if (scheduleId) {
    return `Class schedule #${scheduleId}`;
  }

  return "Schedule not set";
};

const resolveCurriculumSubject = (enrolledSubject) => {
  if (!enrolledSubject) return null;
  return enrolledSubject.curriculum_subject ?? enrolledSubject.class_schedule?.curriculum_subject ?? null;
};

const normalizeSubject = (curriculumSubject) => {
  if (!curriculumSubject) {
    return {
      code: "",
      title: "",
      units: null,
    };
  }

  const lec = Number(curriculumSubject.lec_unit ?? 0);
  const lab = Number(curriculumSubject.lab_unit ?? 0);
  const units = lec + lab;
  const meta = curriculumSubject.subject ?? {};

  return {
    code: meta.code ?? "",
    title: meta.descriptive_title ?? "",
    units: Number.isFinite(units) ? units : null,
  };
};

const determineGradeTone = (value) => {
  if (value === null || value === undefined) {
    return "text-slate-500";
  }

  if (value <= 1.5) return "text-emerald-600 font-semibold";
  if (value <= 2.5) return "text-emerald-500";
  if (value <= 3.0) return "text-amber-600 font-semibold";
  if (value <= 4.0) return "text-orange-600";
  return "text-rose-600 font-semibold";
};

const determineStatusTone = (status) => {
  const normalized = (status || "").toString().toLowerCase();

  if (normalized === "confirmed") return "text-emerald-600 font-semibold";
  if (normalized === "submitted") return "text-amber-600 font-semibold";
  if (normalized === "rejected" || normalized === "denied") return "text-rose-600 font-semibold";
  return "text-slate-600";
};

const buildGrades = (subject) => {
  const grades = subject.grades ?? {};
  const toNumeric = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? null : numeric;
  };

  const formatValue = (value, fallbackRaw = "-") => {
    if (value === null || value === undefined) {
      if (fallbackRaw === null || fallbackRaw === undefined || fallbackRaw === "") {
        return "-";
      }
      return fallbackRaw;
    }

    const numeric = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(numeric)) {
      return value?.toString?.() ?? fallbackRaw ?? "-";
    }

    return (Math.round(numeric * 100) / 100).toString();
  };

  const normalizeStatus = (status) => {
    if (!status) return "Draft";
    const normalized = status.toString();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const midtermNumeric = toNumeric(grades.midterm);
  const finalNumeric = toNumeric(grades.final);
  const hasCompleteScores = midtermNumeric !== null && finalNumeric !== null;
  const cumulativeNumeric = hasCompleteScores
    ? Math.round(((midtermNumeric + finalNumeric) / 2) * 100) / 100
    : null;

  return {
    midterm: formatValue(midtermNumeric, grades.midterm),
    midtermNumeric,
    midtermStatus: normalizeStatus(grades.midterm_status),
    final: formatValue(finalNumeric, grades.final),
    finalNumeric,
    finalStatus: normalizeStatus(grades.final_status ?? grades.midterm_status),
    cumulative: formatValue(cumulativeNumeric),
    cumulativeNumeric,
    remarks: hasCompleteScores ? grades.remarks ?? "Completed" : "-",
    hasCompleteScores,
  };
};

const TAB_TRANSITION_STYLE_ID = "student-record-tab-transitions";
const TAB_TRANSITION_CSS = `
@keyframes studentRecordTabEnterLeft {
  0% { opacity: 0; transform: translateX(-20px); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes studentRecordTabEnterRight {
  0% { opacity: 0; transform: translateX(20px); }
  100% { opacity: 1; transform: translateX(0); }
}`;

const tabConfig = [
  { key: "overview", label: "Overview", icon: Eye },
  { key: "student-info", label: "Student Info", icon: User },
  { key: "enrollments", label: "Enrollments", icon: Layers },
  { key: "subjects", label: "Subjects", icon: BookOpen },
  { key: "history", label: "History", icon: Clock },
  { key: "grades", label: "Grades", icon: GraduationCap },
  { key: "requirements", label: "Requirements", icon: FileText },
  { key: "account", label: "Account", icon: ShieldCheck },
];

export default function StudentRecord({
  student,
  latestEnrollment = null,
  requirementOptions = [],
  dropWindowDays: dropWindowDaysProp = DEFAULT_DROP_WINDOW_DAYS,
  availableSubjects = [],
  creditedSubjects = [],
  unenrolledHistory = [],
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRequirementModalOpen, setRequirementModalOpen] = useState(false);
  const [tabRenderKey, setTabRenderKey] = useState(0);
  const [tabDirection, setTabDirection] = useState("right");
  const [proofPreview, setProofPreview] = useState(null);
  const [selectedRequirementGroup, setSelectedRequirementGroup] = useState("");
  const [requirementCategoryError, setRequirementCategoryError] = useState("");
  const [proofModalImage, setProofModalImage] = useState(null);
  const [existingRequirementProofs, setExistingRequirementProofs] = useState({});
  const [subjectMenuOpenId, setSubjectMenuOpenId] = useState(null);
  const [yearMenuOpenKey, setYearMenuOpenKey] = useState(null);
  const [activeDropYear, setActiveDropYear] = useState(null);
  const [dropListSearch, setDropListSearch] = useState("");
  const [isAddSubjectModalOpen, setAddSubjectModalOpen] = useState(false);
  const [addSubjectSearch, setAddSubjectSearch] = useState("");
  const [addSubjectSelection, setAddSubjectSelection] = useState({
    curriculumSubjectId: "",
    classScheduleId: "",
  });
  const [addSubjectContext, setAddSubjectContext] = useState({ yearLabel: null });

  const addSubjectForm = useForm({
    curriculum_subject_id: "",
    class_schedule_id: "",
  });

  const createAccountForm = useForm({});
  const sendEmailForm = useForm({});

  const isAddSubjectSubmitting = addSubjectForm.processing;

  const studentDetails = student?.student_details ?? null;
  const currentAddress = buildAddress(studentDetails, "current_address");
  const homeAddress = buildAddress(studentDetails, "home_address");
  const father = buildParentInfo(studentDetails, "father");
  const mother = buildParentInfo(studentDetails, "mother");
  const guardian = buildParentInfo(studentDetails, "guardian");
  const education = educationEntries(studentDetails);
  const relatives = [
    { title: "Father", info: father },
    { title: "Mother", info: mother },
    { title: "Guardian", info: guardian },
  ].filter(({ info }) => hasRelativeInfo(info));
  const relativeGridClass =
    relatives.length >= 3 ? "md:grid-cols-3" : relatives.length === 2 ? "md:grid-cols-2" : "md:grid-cols-1";

  const historyRecords = useMemo(() => {
    if (!Array.isArray(unenrolledHistory)) return [];
    return unenrolledHistory;
  }, [unenrolledHistory]);

  const sortedEnrollments = useMemo(() => {
    const list = Array.isArray(student?.enrollments) ? [...student.enrollments] : [];
    return list.sort((a, b) => {
      const aTime = a?.enrolled_at ? new Date(a.enrolled_at).getTime() : 0;
      const bTime = b?.enrolled_at ? new Date(b.enrolled_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [student?.enrollments]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTab = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (storedTab && tabConfig.some((tab) => tab.key === storedTab)) {
      setActiveTab(storedTab);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    setTabRenderKey((prev) => prev + 1);
  }, [activeTab]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(TAB_TRANSITION_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = TAB_TRANSITION_STYLE_ID;
    style.innerHTML = TAB_TRANSITION_CSS;
    document.head.appendChild(style);
  }, []);

  const activeEnrollment = latestEnrollment ?? sortedEnrollments[0] ?? null;
  const parsedDropWindow = Number.parseInt(dropWindowDaysProp, 10);
  const dropWindowDays = Number.isFinite(parsedDropWindow) && parsedDropWindow > 0 ? parsedDropWindow : DEFAULT_DROP_WINDOW_DAYS;

  const requirements = useMemo(() => student?.student_requirements ?? [], [student?.student_requirements]);
  const [requirementsPage, setRequirementsPage] = useState(1);
  const requirementsPageSize = 5;

  const requirementForm = useForm({
    student_id: student?.id ?? "",
    requirement_id: "",
    image: null,
    is_submitted: true,
  });

  const undoDropForm = useForm({});

  useEffect(() => {
    requirementForm.setData("student_id", student?.id ?? "");
  }, [student?.id]);

  const normalizedAddSubjectOptions = useMemo(() => {
    if (!Array.isArray(availableSubjects) || availableSubjects.length === 0) return [];

    const enrolledIds = new Set(
      (activeEnrollment?.enrollment_subjects ?? [])
        .map((subject) => Number(subject.curriculum_subject_id))
        .filter((id) => Number.isFinite(id)),
    );

    return availableSubjects.map((subject) => {
      const totalUnits = Number(subject.lec_unit ?? 0) + Number(subject.lab_unit ?? 0);
      const schedules = Array.isArray(subject.class_schedules) ? subject.class_schedules : [];
      const unmetPrerequisites = (subject.prerequisites ?? []).filter((item) => item?.met !== true);

      return {
        curriculumSubjectId: String(subject.id),
        code: subject.subject?.code ?? "—",
        title: subject.subject?.descriptive_title ?? subject.subject?.descriptiveTitle ?? "Untitled subject",
        units: Number.isFinite(totalUnits) ? totalUnits : null,
        yearLabel:
          subject.year_level?.year_level ??
          subject.yearLevel?.year_level ??
          subject.year_level ??
          subject.yearLevel ??
          "Year N/A",
        semesterLabel:
          subject.semester?.semester ?? subject.semesters?.semester ?? subject.semester ?? "Semester N/A",
        schedules: schedules.map((schedule) => ({
          id: schedule.id,
          label: buildScheduleLabel(schedule, schedule.id),
        })),
        prerequisitesMet: subject.prerequisites_met !== false && unmetPrerequisites.length === 0,
        hasPassed: subject.has_passed === true,
        unmetPrerequisites,
        isAlreadyEnrolled: enrolledIds.has(Number(subject.id)),
      };
    });
  }, [availableSubjects, activeEnrollment?.enrollment_subjects]);

  const scopedAddSubjectOptions = useMemo(() => {
    if (!addSubjectContext.yearLabel) return normalizedAddSubjectOptions;
    return normalizedAddSubjectOptions.filter((option) => option.yearLabel === addSubjectContext.yearLabel);
  }, [normalizedAddSubjectOptions, addSubjectContext.yearLabel]);

  const filteredAddSubjectOptions = useMemo(() => {
    if (!addSubjectSearch.trim()) return scopedAddSubjectOptions;
    const term = addSubjectSearch.trim().toLowerCase();
    return scopedAddSubjectOptions.filter((option) => {
      const code = option.code?.toLowerCase?.() ?? "";
      const title = option.title?.toLowerCase?.() ?? "";
      return code.includes(term) || title.includes(term);
    });
  }, [scopedAddSubjectOptions, addSubjectSearch]);

  const openAddSubjectModal = (yearLabel = null) => {
    if (!activeEnrollment?.id) {
      Swal.fire({
        icon: "info",
        title: "No enrollment selected",
        text: "Please choose an enrollment before managing subjects.",
        timer: 2400,
        showConfirmButton: false,
      });
      return;
    }

    setAddSubjectContext({ yearLabel });
    setAddSubjectSearch("");
    setAddSubjectSelection({ curriculumSubjectId: "", classScheduleId: "" });
    addSubjectForm.reset();
    setAddSubjectModalOpen(true);
  };

  const closeAddSubjectModal = () => {
    if (isAddSubjectSubmitting) return;
    setAddSubjectModalOpen(false);
    setAddSubjectSelection({ curriculumSubjectId: "", classScheduleId: "" });
    addSubjectForm.reset();
  };

  const handleCreateAccount = () => {
    if (!student?.id || createAccountForm.processing) return;
    if (student?.username) {
      Swal.fire({
        icon: "info",
        title: "Account already exists",
        text: `${student.fName ?? "Student"} already has login credentials.`,
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    Swal.fire({
      title: "Create Student Account?",
      text: "This will generate a username and send the credentials via email.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, create it",
    }).then((result) => {
      if (!result.isConfirmed) return;

      Swal.fire({
        title: "Creating account...",
        text: "Please wait while we prepare the credentials.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      createAccountForm.post(route("registrar.students.createAccount", student.id), {
        preserveScroll: true,
        onSuccess: () => {
          Swal.close();
          Swal.fire({
            icon: "success",
            title: "Account created",
            text: "Credentials were generated and emailed to the student.",
            confirmButtonColor: "#2563eb",
          });
        },
        onError: (errors) => {
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "Unable to create account",
            text: errors?.error ?? "Please try again or check the student's email.",
            confirmButtonColor: "#2563eb",
          });
        },
      });
    });
  };

  const handleSendCredentials = () => {
    if (!student?.id || sendEmailForm.processing) return;
    if (!student?.username) {
      Swal.fire({
        icon: "info",
        title: "No account to email",
        text: "Create the student account first before resending credentials.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    Swal.fire({
      title: "Resend Credentials?",
      text: `Send the login details to ${student.fName ?? "the student"}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, send it",
    }).then((result) => {
      if (!result.isConfirmed) return;

      Swal.fire({
        title: "Sending email...",
        text: "Please wait while we resend the credentials.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      sendEmailForm.post(route("registrar.students.sendEmail", student.id), {
        preserveScroll: true,
        onSuccess: () => {
          Swal.close();
          Swal.fire({
            icon: "success",
            title: "Email sent",
            text: "The credentials have been sent successfully.",
            confirmButtonColor: "#2563eb",
          });
        },
        onError: (errors) => {
          Swal.close();
          Swal.fire({
            icon: "error",
            title: "Failed to send email",
            text: errors?.error ?? "Please try again shortly.",
            confirmButtonColor: "#2563eb",
          });
        },
      });
    });
  };

  const handleAddSubjectSearchChange = (event) => {
    setAddSubjectSearch(event.target.value);
  };

  const handleAddSubjectOptionSelect = (optionId) => {
    const option = normalizedAddSubjectOptions.find((item) => String(item.curriculumSubjectId) === String(optionId));
    if (!option || option.isAlreadyEnrolled || option.hasPassed || option.prerequisitesMet === false) {
      return;
    }

    const firstScheduleId = option.schedules[0]?.id ? String(option.schedules[0].id) : "";

    setAddSubjectSelection({
      curriculumSubjectId: String(option.curriculumSubjectId),
      classScheduleId: firstScheduleId,
    });

    addSubjectForm.setData({
      curriculum_subject_id: String(option.curriculumSubjectId),
      class_schedule_id: firstScheduleId,
    });
    addSubjectForm.clearErrors();
  };

  const handleAddSubjectScheduleSelect = (scheduleId) => {
    const value = scheduleId ? String(scheduleId) : "";
    setAddSubjectSelection((prev) => ({ ...prev, classScheduleId: value }));
    addSubjectForm.setData("class_schedule_id", value);
    addSubjectForm.clearErrors("class_schedule_id");
  };

  const handleAddSubjectSubmit = (event) => {
    event.preventDefault();

    if (!addSubjectSelection.curriculumSubjectId) {
      addSubjectForm.setError("curriculum_subject_id", "Please select a subject to add.");
      return;
    }

    addSubjectForm.post(route("registrar.students.subjects.add", activeEnrollment.id), {
      preserveScroll: true,
      onSuccess: () => {
        setAddSubjectModalOpen(false);
        setAddSubjectSelection({ curriculumSubjectId: "", classScheduleId: "" });
        setAddSubjectSearch("");
        router.reload({ only: ["student", "latestEnrollment"] });
      },
      onError: (errors) => {
        if (errors?.curriculum_subject_id || errors?.class_schedule_id) {
          Swal.fire({
            icon: "error",
            title: "Unable to add subject",
            text: Object.values(errors)[0] ?? "Please review the selection and try again.",
            toast: true,
            position: "top-end",
            timer: 2600,
            showConfirmButton: false,
          });
        }
      },
    });
  };


  const applicableRequirements = useMemo(() => {
    if (!Array.isArray(requirementOptions) || requirementOptions.length === 0) {
      return [];
    }

    const admission = studentDetails?.admission_type
      ? studentDetails.admission_type.toString().trim().toLowerCase()
      : null;
    const status = studentDetails?.student_status
      ? studentDetails.student_status.toString().trim().toLowerCase()
      : null;

    return requirementOptions.filter((option) => {
      const category = option.required_for ? option.required_for.toString().trim().toLowerCase() : "";
      if (!category || category === "all") return true;
      if (admission && category === admission) return true;
      if (status && category === status) return true;
      return false;
    });
  }, [requirementOptions, studentDetails?.admission_type, studentDetails?.student_status]);
  const dropWindowInfo = useMemo(() => {
    if (!activeEnrollment?.enrolled_at) {
      return { isWithinWindow: true, deadline: null };
    }

    const enrolledAt = new Date(activeEnrollment.enrolled_at);
    if (Number.isNaN(enrolledAt.getTime())) {
      return { isWithinWindow: true, deadline: null };
    }

    const deadline = new Date(enrolledAt);
    deadline.setDate(deadline.getDate() + dropWindowDays);

    return {
      isWithinWindow: Date.now() <= deadline.getTime(),
      deadline,
    };
  }, [activeEnrollment?.enrolled_at, dropWindowDays]);

  const dropDeadlineLabel = dropWindowInfo.deadline ? formatDate(dropWindowInfo.deadline.toISOString()) : null;
  const isWithinDropWindow = dropWindowInfo.isWithinWindow;

  const handleSubjectMenuToggle = (subjectId) => {
    if (undoDropForm.processing) {
      return;
    }
    setYearMenuOpenKey(null);
    setSubjectMenuOpenId((prev) => (prev === subjectId ? null : subjectId));
  };

  const handleSubjectMenuClose = () => {
    setSubjectMenuOpenId(null);
  };

  const handleSubjectUndoDropClick = (subject) => {
    if (!subject) return;
    handleSubjectMenuClose();
    undoDropForm.post(route("registrar.students.subjects.undo-drop", subject.enrollmentSubjectId), {
      preserveScroll: true,
      onSuccess: () => {
        Swal.fire({
          icon: "success",
          title: "Subject restored",
          text: `${subject.code || "Subject"} has been reactivated.`,
          toast: true,
          position: "top-end",
          timer: 2400,
          showConfirmButton: false,
        });
        router.reload({ only: ["student", "latestEnrollment"] });
      },
      onError: () => {
        Swal.fire({
          icon: "error",
          title: "Unable to restore",
          text: "Please try again or contact support.",
          toast: true,
          position: "top-end",
          timer: 2600,
          showConfirmButton: false,
        });
      },
    });
  };

  const handleSubjectDropNavigate = (subject, yearLabel) => {
    handleSubjectMenuClose();

    if (!activeEnrollment?.id) {
      Swal.fire({
        icon: "info",
        title: "No enrollment selected",
        text: "Please choose an enrollment before managing subjects.",
        timer: 2400,
        showConfirmButton: false,
      });
      return;
    }

    const query = {
      subject_id: subject?.enrollmentSubjectId ?? subject?.id ?? null,
    };
    if (yearLabel) {
      query.year_label = yearLabel;
    }

    router.visit(route("registrar.students.subjects.drop.page", { enrollment: activeEnrollment.id }), {
      method: "get",
      data: query,
      preserveScroll: true,
    });
  };

  const handleYearMenuToggle = (yearKey) => {
    if (undoDropForm.processing) {
      return;
    }
    setSubjectMenuOpenId(null);
    setYearMenuOpenKey((prev) => (prev === yearKey ? null : yearKey));
  };

  const droppedSubjectsByYear = useMemo(() => {
    if (!activeEnrollment?.enrollment_subjects?.length) return {};

    return (activeEnrollment.enrollment_subjects ?? []).reduce((carry, enrolled) => {
      const status = enrolled.status?.toString().toLowerCase?.() ?? "enrolled";
      if (status !== "dropped") {
        return carry;
      }

      const curriculumSubject = resolveCurriculumSubject(enrolled);
      const yearLabel =
        enrolled.class_schedule?.year_level?.year_level ??
        curriculumSubject?.year_level?.year_level ??
        activeEnrollment.year_level?.year_level ??
        "Year N/A";
      const semesterLabel =
        enrolled.class_schedule?.semester?.semester ??
        curriculumSubject?.semester?.semester ??
        activeEnrollment.semester?.semester ??
        "Semester N/A";
      const dropMeta = enrolled.droppedBy ?? null;
      const dropNameParts = [dropMeta?.fName, dropMeta?.mName ? `${dropMeta.mName.charAt(0)}.` : null, dropMeta?.lName]
        .filter(Boolean);

      if (!carry[yearLabel]) {
        carry[yearLabel] = [];
      }

      carry[yearLabel].push({
        id: String(enrolled.id),
        code: curriculumSubject?.subject?.code ?? "—",
        title: curriculumSubject?.subject?.descriptive_title ?? "Untitled subject",
        units:
          Number(curriculumSubject?.lec_unit ?? 0) + Number(curriculumSubject?.lab_unit ?? 0) || null,
        scheduleLabel: buildScheduleLabel(enrolled.class_schedule, enrolled.class_schedule_id),
        semesterLabel,
        dropReason: enrolled.drop_reason ?? "No reason provided",
        droppedAtLabel: enrolled.dropped_at ? formatDate(enrolled.dropped_at) : null,
        droppedByName: dropNameParts.length ? dropNameParts.join(" ") : null,
      });

      return carry;
    }, {});
  }, [activeEnrollment]);

  const creditedSubjectGroups = useMemo(() => {
    if (!Array.isArray(creditedSubjects) || creditedSubjects.length === 0) {
      return [];
    }

    const buckets = {};
    creditedSubjects.forEach((subject) => {
      const yearLabel = subject.year_level || "Year N/A";
      const semesterLabel = subject.semester || "Semester N/A";

      if (!buckets[yearLabel]) {
        buckets[yearLabel] = {};
      }
      if (!buckets[yearLabel][semesterLabel]) {
        buckets[yearLabel][semesterLabel] = [];
      }

      buckets[yearLabel][semesterLabel].push(subject);
    });

    return Object.entries(buckets).map(([yearLabel, semesters]) => ({
      yearLabel,
      semesters: Object.entries(semesters).map(([semesterLabel, subjects]) => ({
        semesterLabel,
        subjects: subjects.sort((a, b) => (a.code || "").localeCompare(b.code || "")),
      })),
    }));
  }, [creditedSubjects]);

  const handleYearDropListClick = (yearLabel) => {
    handleYearMenuClose();

    if (!activeEnrollment?.id) {
      Swal.fire({
        icon: "info",
        title: "No enrollment selected",
        text: "Please choose an enrollment before managing subjects.",
        timer: 2400,
        showConfirmButton: false,
      });
      return;
    }

    setActiveDropYear((prev) => (prev === yearLabel ? null : yearLabel));
    setDropListSearch("");
  };

  const filteredDropListSubjects = useMemo(() => {
    if (!activeDropYear) return [];

    const subjects = droppedSubjectsByYear[activeDropYear] ?? [];
    if (!dropListSearch.trim()) {
      return subjects;
    }

    const term = dropListSearch.trim().toLowerCase();
    return subjects.filter((subject) => {
      const code = subject.code?.toLowerCase?.() ?? "";
      const title = subject.title?.toLowerCase?.() ?? "";
      return code.includes(term) || title.includes(term);
    });
  }, [activeDropYear, droppedSubjectsByYear, dropListSearch]);

  const handleDropListClose = () => {
    setActiveDropYear(null);
    setDropListSearch("");
  };

  const handleYearMenuClose = () => {
    setYearMenuOpenKey(null);
  };

  const handleYearManageClick = (yearLabel) => {
    handleYearMenuClose();

    if (!activeEnrollment?.id) {
      Swal.fire({
        icon: "info",
        title: "No enrollment selected",
        text: "Please choose an enrollment before managing subjects.",
        timer: 2400,
        showConfirmButton: false,
      });
      return;
    }

    const data = yearLabel ? { year_label: yearLabel } : {};

    router.visit(route("registrar.students.subjects.add.page", { enrollment: activeEnrollment.id }), {
      method: "get",
      data,
      preserveScroll: true,
    });
  };

  useEffect(() => {
    if (subjectMenuOpenId === null && yearMenuOpenKey === null) {
      return undefined;
    }

    const handleGlobalMouseDown = (event) => {
      if (
        !event.target.closest('[data-subject-action-menu]') &&
        !event.target.closest('[data-year-action-menu]')
      ) {
        setSubjectMenuOpenId(null);
        setYearMenuOpenKey(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSubjectMenuOpenId(null);
        setYearMenuOpenKey(null);
      }
    };

    window.addEventListener("mousedown", handleGlobalMouseDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handleGlobalMouseDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [subjectMenuOpenId, yearMenuOpenKey]);

  const requirementSubmissionMap = useMemo(() => {
    const map = new Map();
    requirements.forEach((item) => {
      map.set(Number(item.requirement_id), Boolean(item.is_submitted));
    });
    return map;
  }, [requirements]);

  const missingRequirements = useMemo(() => {
    if (!applicableRequirements.length) return [];
    return applicableRequirements.filter((option) => {
      const isSubmitted = requirementSubmissionMap.get(Number(option.id));
      return !isSubmitted;
    });
  }, [applicableRequirements, requirementSubmissionMap]);

  const selectableRequirementOptions = useMemo(() => {
    if (applicableRequirements.length) return applicableRequirements;
    return requirementOptions;
  }, [applicableRequirements, requirementOptions]);

  const requirementCategories = useMemo(() => {
    if (!selectableRequirementOptions.length) return [];
    const categories = new Map();
    selectableRequirementOptions.forEach((option) => {
      const normalized = normalizeRequirementCategory(option.required_for);
      if (!categories.has(normalized)) {
        categories.set(normalized, formatRequirementCategoryLabel(option.required_for));
      }
    });
    return Array.from(categories, ([value, label]) => ({ value, label }));
  }, [selectableRequirementOptions]);

  const filteredRequirementOptions = useMemo(() => {
    if (!selectedRequirementGroup) return [];
    return selectableRequirementOptions.filter((option) => {
      return normalizeRequirementCategory(option.required_for) === selectedRequirementGroup;
    });
  }, [selectableRequirementOptions, selectedRequirementGroup]);

  const requirementsSummary = useMemo(() => {
    const required = applicableRequirements.length;
    let submittedRequired = 0;

    applicableRequirements.forEach((option) => {
      if (requirementSubmissionMap.get(Number(option.id))) {
        submittedRequired += 1;
      }
    });

    const trackedSubmitted = requirements.filter((item) => Boolean(item.is_submitted)).length;

    return {
      required,
      submittedRequired,
      missing: Math.max(required - submittedRequired, 0),
      tracked: requirements.length,
      pendingTracked: Math.max(requirements.length - trackedSubmitted, 0),
    };
  }, [applicableRequirements, requirementSubmissionMap, requirements]);

  const handleRequirementSubmit = (event) => {
    event.preventDefault();
    if (!selectedRequirementGroup) {
      setRequirementCategoryError("Please choose a category first.");
      return;
    }
    if (!requirementForm.data.requirement_id) {
      requirementForm.setError("requirement_id", "Please select a requirement.");
      return;
    }

    requirementForm.post(route("registrar.submitted.requirements.store"), {
      preserveScroll: true,
      forceFormData: true,
      onSuccess: () => {
        requirementForm.reset("requirement_id", "image", "is_submitted");
        requirementForm.clearErrors();
        setRequirementModalOpen(false);
        setSelectedRequirementGroup("");
        setRequirementCategoryError("");
        setProofPreview(null);
        setProofModalImage(null);

        Swal.fire({
          icon: "success",
          title: "Requirement saved",
          text: "The proof has been logged successfully.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
      },
      onError: () => {
        Swal.fire({
          icon: "error",
          title: "Unable to save",
          text: "Please review the form and try again.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true,
        });
      },
    });
  };

  const handleRequirementSelect = (value) => {
    requirementForm.setData("requirement_id", value);
    requirementForm.clearErrors("requirement_id");
  };

  const handleRequirementCategoryChange = (event) => {
    const value = event.target.value;
    setSelectedRequirementGroup(value);
    setRequirementCategoryError("");
    if (!value) {
      requirementForm.setData("requirement_id", "");
      requirementForm.clearErrors("requirement_id");
      return;
    }

    const firstMatch = selectableRequirementOptions.find((option) => {
      return normalizeRequirementCategory(option.required_for) === value;
    });

    if (firstMatch) {
      requirementForm.setData("requirement_id", String(firstMatch.id));
    } else {
      requirementForm.setData("requirement_id", "");
    }
    requirementForm.clearErrors("requirement_id");
  };

  const handleRequirementFileChange = (event, requirementId = null) => {
    const file = event.target.files?.[0] ?? null;

    if (requirementId && file) {
      requirementForm.setData("requirement_id", requirementId);
      requirementForm.clearErrors("requirement_id");
    }

    requirementForm.setData("image", file);
    requirementForm.clearErrors("image");

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProofModalImage(null);
        setExistingRequirementProofs((prev) => {
          const next = { ...prev };
          if (requirementId) {
            next[requirementId] = {
              url: reader.result?.toString() ?? null,
              isTemporary: true,
            };
          }
          return next;
        });
      };
      reader.readAsDataURL(file);
    } else {
      setProofModalImage(null);
    }

    event.target.value = "";
  };

  const handleRequirementCheckboxChange = (event) => {
    requirementForm.setData("is_submitted", event.target.checked);
  };

  const buildRequirementProofMap = (records) => {
    const map = {};
    records.forEach((record) => {
      const url = mapProofUrl(record.image);
      if (url) {
        map[String(record.requirement_id)] = { url };
      }
    });
    return map;
  };

  const openRequirementModal = (options = {}) => {
    const { requirementId = "", category = "", proofUrl = null, isSubmitted = true } = options;

    requirementForm.reset("requirement_id", "image", "is_submitted");
    requirementForm.setData("is_submitted", isSubmitted);
    if (requirementId) {
      requirementForm.setData("requirement_id", requirementId);
    }
    requirementForm.clearErrors();
    setRequirementModalOpen(true);
    setSelectedRequirementGroup(category);
    setRequirementCategoryError("");
    setProofPreview(proofUrl);
    setProofModalImage(null);

    const proofMap = buildRequirementProofMap(requirements);
    if (requirementId && proofUrl) {
      proofMap[requirementId] = {
        url: proofUrl,
      };
    }
    setExistingRequirementProofs(proofMap);
  };

  const closeRequirementModal = () => {
    if (!isRequirementSubmitting) {
      setRequirementModalOpen(false);
      requirementForm.clearErrors();
      setSelectedRequirementGroup("");
      setRequirementCategoryError("");
      setProofPreview(null);
      setProofModalImage(null);
    }
  };

  const requirementFormData = requirementForm.data;
  const requirementFormErrors = requirementForm.errors;
  const isRequirementSubmitting = requirementForm.processing;
  const hasRequirementChoices = requirementCategories.length > 0;
  const hasVisibleRequirementChoices = filteredRequirementOptions.length > 0;
  const hasTrackedRequirements = requirements.length > 0;
  const requirementPageCount = Math.max(Math.ceil(requirements.length / requirementsPageSize), 1);
  const currentRequirementPage = Math.min(requirementsPage, requirementPageCount);
  const pagedRequirements = useMemo(() => {
    if (!requirements.length) return [];
    const start = (currentRequirementPage - 1) * requirementsPageSize;
    return requirements.slice(start, start + requirementsPageSize);
  }, [requirements, currentRequirementPage, requirementsPageSize]);

  const groupedSubjects = useMemo(() => {
    if (!activeEnrollment) return {};

    const buckets = {};

    (activeEnrollment.enrollment_subjects ?? []).forEach((enrolled) => {
      const schedule = enrolled.class_schedule;
      const curriculumSubject = resolveCurriculumSubject(enrolled);
      const normalized = normalizeSubject(curriculumSubject);
      const dropMeta = enrolled.droppedBy ?? null;
      const dropNameParts = [dropMeta?.fName, dropMeta?.mName ? `${dropMeta.mName.charAt(0)}.` : null, dropMeta?.lName]
        .filter(Boolean);
      const droppedByName = dropNameParts.length ? dropNameParts.join(" ") : null;
      const droppedAtLabel = enrolled.dropped_at ? formatDate(enrolled.dropped_at) : null;
      const rawStatus = typeof enrolled.status === "string" ? enrolled.status : "enrolled";
      const isDropped = rawStatus?.toLowerCase?.() === "dropped";

      if (isDropped) {
        return;
      }

      const yearLabel =
        schedule?.year_level?.year_level ??
        curriculumSubject?.year_level?.year_level ??
        activeEnrollment.year_level?.year_level ??
        "Year N/A";
      const semesterLabel =
        schedule?.semester?.semester ??
        curriculumSubject?.semester?.semester ??
        activeEnrollment.semester?.semester ??
        "Semester N/A";
      const yearKey = yearLabel || "Year N/A";
      const semKey = semesterLabel || "Semester N/A";

      if (!buckets[yearKey]) {
        buckets[yearKey] = {};
      }

      if (!buckets[yearKey][semKey]) {
        buckets[yearKey][semKey] = [];
      }

      buckets[yearKey][semKey].push({
        id: enrolled.id,
        enrollmentSubjectId: enrolled.id,
        curriculumSubjectId: enrolled.curriculum_subject_id,
        classScheduleId: enrolled.class_schedule_id,
        scheduleLabel: buildScheduleLabel(schedule, enrolled.class_schedule_id),
        faculty: schedule?.faculty
          ? `${schedule.faculty.lName}, ${schedule.faculty.fName}`
          : "Not assigned",
        status: rawStatus,
        dropReason: enrolled.drop_reason ?? null,
        droppedAt: enrolled.dropped_at ?? null,
        droppedAtLabel,
        droppedByName,
        ...normalized,
        grades: buildGrades(enrolled),
      });
    });

    return buckets;
  }, [activeEnrollment]);

  const renderOverview = () => (
    <div className="space-y-5">
      <section className={`${cardClass} flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
        <div className="flex items-center gap-4">
          {student.profile_picture ? (
            <img
              src={`/storage/${student.profile_picture}`}
              alt={`${student.fName} ${student.lName}`}
              className="h-16 w-16 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
              <User className="h-8 w-8 text-slate-400" />
            </div>
          )}
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {student.fName} {student.mName ?? ""} {student.lName} {student.suffix ?? ""}
            </h2>
            <p className="text-xs text-slate-500">{student.id_number ?? "Student ID unavailable"}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-600">
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                {(studentDetails?.student_status ?? "Status N/A").toString()}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-medium text-blue-600">
                <MapPin className="h-3 w-3 text-blue-500" />
                {(studentDetails?.campus ?? "Campus N/A").toString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-right text-[11px] text-slate-500">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-medium text-blue-600">
            <CalendarClock className="h-3.5 w-3.5 text-blue-500" />
            {activeEnrollment
              ? `${activeEnrollment.year_level?.year_level ?? "Year N/A"} • ${
                  activeEnrollment.semester?.semester ?? "Semester N/A"
                }`
              : "No enrollment data"}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-blue-600">
              {student.email ?? "Email N/A"}
            </span>
            <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-amber-600">
              {student.contact_no ?? "Contact N/A"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className={cardClass}>
          <h3 className={sectionTitleClass}>
            <BookOpen className="h-4 w-4 text-slate-500" /> Academic Snapshot
          </h3>
          <dl className={detailListClass}>
            <div className={detailRowClass}>
              <dt className="font-medium">Current Course</dt>
              <dd>{activeEnrollment?.course?.code ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Year Level</dt>
              <dd>{activeEnrollment?.year_level?.year_level ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Semester</dt>
              <dd>{activeEnrollment?.semester?.semester ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Section</dt>
              <dd>{activeEnrollment?.section?.section ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">School Year</dt>
              <dd>{activeEnrollment?.school_year?.school_year ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Enrollment Date</dt>
              <dd>{formatDate(activeEnrollment?.enrolled_at)}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Department ID</dt>
              <dd>{studentDetails?.department_id ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className={cardClass}>
          <h3 className={sectionTitleClass}>
            <User className="h-4 w-4 text-slate-500" /> Personal Snapshot
          </h3>
          <dl className={detailListClass}>
            <div className={detailRowClass}>
              <dt className={detailLabelClass}>
                <Mail className={detailIconClass} /> Email
              </dt>
              <dd>{student.email ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className={detailLabelClass}>
                <Phone className={detailIconClass} /> Contact
              </dt>
              <dd>{studentDetails?.contact_number ?? student.contact_no ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className={detailLabelClass}>
                <VenetianMask className={detailIconClass} /> Gender
              </dt>
              <dd>{student.gender ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className={detailLabelClass}>
                <MapPin className={detailIconClass} /> Address
              </dt>
              <dd>{currentAddress ?? student.address ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className={detailLabelClass}>
                <Layers className={detailIconClass} /> Student Status
              </dt>
              <dd>{studentDetails?.student_status ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className={detailLabelClass}>
                <Calendar className={detailIconClass} /> Campus
              </dt>
              <dd>{studentDetails?.campus ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );

  const renderStudentInfo = () => (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2">
        <div className={cardClass}>
          <h3 className={sectionTitleClass}>
            <User className="h-4 w-4 text-slate-500" /> Personal Background
          </h3>
          <dl className={detailListClass}>
            <div className={detailRowClass}>
              <dt className="font-medium">Primary Email</dt>
              <dd>{student.email ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Alternate Email</dt>
              <dd>{studentDetails?.email_address ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Primary Contact</dt>
              <dd>{student.contact_no ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Secondary Contact</dt>
              <dd>{studentDetails?.contact_number ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Birth Date</dt>
              <dd>{formatDate(studentDetails?.birth_date ?? student.date_of_birth)}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Birth Place</dt>
              <dd className="text-right text-[11px]">{studentDetails?.place_of_birth ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Gender</dt>
              <dd>{student.gender ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Height</dt>
              <dd>{studentDetails?.height_ft ? `${studentDetails.height_ft} ft` : "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Weight</dt>
              <dd>{studentDetails?.weight_kg ? `${studentDetails.weight_kg} kg` : "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Exam Result</dt>
              <dd>{studentDetails?.exam_result ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <div className={cardClass}>
          <h3 className={sectionTitleClass}>
            <MapPin className="h-4 w-4 text-slate-500" /> Addresses
          </h3>
          <dl className={detailListClass}>
            <div className={detailRowClass}>
              <dt className="font-medium">Current Address</dt>
              <dd className="text-right text-[11px]">{currentAddress ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Home Address</dt>
              <dd className="text-right text-[11px]">{homeAddress ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </section>

      {relatives.length > 0 && (
        <section className={`grid gap-4 ${relativeGridClass}`}>
          {relatives.map(({ title, info }) => renderRelativeCard(title, info))}
        </section>
      )}

      {education.length > 0 && (
        <section className={cardClass}>
          <h3 className={sectionTitleClass}>
            <GraduationCap className="h-4 w-4 text-slate-500" /> Educational Background
          </h3>
          <div className="space-y-3">
            {education.map((entry) => (
              <div key={entry.label} className="flex flex-col gap-1 rounded-lg border border-slate-100/80 bg-slate-50/80 px-3 py-2 text-[11px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{entry.label}</span>
                  <span className="text-slate-500">{entry.year ?? "Year N/A"}</span>
                </div>
                <span>{entry.name ?? "No record"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className={cardClass}>
          <h3 className={sectionTitleClass}>
            <Calendar className="h-4 w-4 text-slate-500" /> Enrollment Status
          </h3>
          <dl className={detailListClass}>
            <div className={detailRowClass}>
              <dt className="font-medium">Campus</dt>
              <dd>{studentDetails?.campus ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Admission Type</dt>
              <dd>{studentDetails?.admission_type ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Transfer Status</dt>
              <dd>{studentDetails?.transfer_status ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Student Status</dt>
              <dd>{studentDetails?.student_status ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Department ID</dt>
              <dd>{studentDetails?.department_id ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );

  const renderEnrollments = () => (
    <div className="space-y-4">
      {sortedEnrollments.length === 0 ? (
        <p className={emptyStateClass}>No enrollment history available.</p>
      ) : (
        sortedEnrollments.map((enrollment) => (
          <div key={enrollment.id} className={cardClass}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {enrollment.course?.code ?? "No course"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {enrollment.year_level?.year_level ?? "Year N/A"} • {enrollment.semester?.semester ?? "Semester N/A"}
                </p>
              </div>
              <div className="text-[11px] text-slate-500 text-right">
                <p>{enrollment.section?.section ?? "No section"}</p>
                <p>{formatDate(enrollment.enrolled_at)}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5">
                Status: {enrollment.status ?? "—"}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5">
                School Year: {enrollment.school_year?.school_year ?? "—"}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderSubjects = () => {
    const yearKeys = Object.keys(groupedSubjects);

    if (yearKeys.length === 0) {
      return <p className={emptyStateClass}>No subject records found.</p>;
    }

    return (
      <div className="space-y-4">
        {yearKeys.map((year) => {
          const semesters = groupedSubjects[year] || {};
          const semesterKeys = Object.keys(semesters);

          return (
            <div key={year} className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-600">
                <span>{year}</span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {activeEnrollment?.course?.code ?? "Course"}
                  </span>
                  <div className="relative" data-year-action-menu>
                    <button
                      type="button"
                      onClick={() => handleYearMenuToggle(year)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-1 text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2"
                      aria-label={`Actions for ${year}`}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>

                    {yearMenuOpenKey === year ? (
                      <div className="absolute right-0 top-8 z-30 w-44 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => handleYearManageClick(year)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[11px] font-bold text-slate-600">+</span>
                          Add/Drop subjects
                        </button>
                        <button
                          type="button"
                          onClick={() => handleYearDropListClick(year)}
                          className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View dropped subjects
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              {activeDropYear === year ? (
                <div className="rounded-lg border border-rose-200 bg-white px-4 py-4 text-[11px] text-slate-600 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-500">Dropped subjects</p>
                      <p className="mt-1 max-w-xl text-[10.5px] text-slate-500">
                        Viewing dropped records for <span className="font-semibold text-slate-700">{year}</span>.
                        {dropDeadlineLabel ? ` • Drop window until ${dropDeadlineLabel}` : ""} This list is read-only.
                      </p>
                    </div>

                    <div className="relative w-full max-w-xs" data-drop-search>
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={dropListSearch}
                        onChange={(event) => setDropListSearch(event.target.value)}
                        placeholder="Search code or title"
                        className="w-full rounded-full border border-slate-200 bg-white py-2 pl-8 pr-3 text-[10.5px] text-slate-700 placeholder:text-slate-400 focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-200"
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {filteredDropListSubjects.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[10.5px] text-slate-500">
                        <AlertCircle className="h-5 w-5 text-slate-400" />
                        <p>No dropped subjects recorded for this year.</p>
                        {dropListSearch ? <p className="text-[10px] text-slate-400">Try adjusting your search.</p> : null}
                      </div>
                    ) : (
                      <ul className="grid gap-3">
                        {filteredDropListSubjects.map((subject) => (
                          <li key={subject.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-semibold text-slate-800">{subject.code}</p>
                                <p className="text-[10.5px] text-slate-600">{subject.title}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                                <span className="rounded-full border border-slate-200 px-2 py-0.5">
                                  {subject.units ?? "—"} units
                                </span>
                                <span className="rounded-full border border-slate-200 px-2 py-0.5">
                                  {subject.semesterLabel}
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-500">{subject.scheduleLabel}</p>
                            <div className="mt-2 space-y-1 text-[10px] text-slate-500">
                              <p>
                                <span className="font-semibold text-slate-700">Reason:</span> {subject.dropReason ?? "No reason provided"}
                              </p>
                              {subject.droppedAtLabel ? (
                                <p>
                                  <span className="font-semibold text-slate-700">Dropped:</span> {subject.droppedAtLabel}
                                </p>
                              ) : null}
                              {subject.droppedByName ? (
                                <p>
                                  <span className="font-semibold text-slate-700">Processed by:</span> {subject.droppedByName}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex items-center justify-end border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={handleDropListClose}
                        className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-1.5 text-[10.5px] font-semibold text-slate-600 transition hover:bg-slate-100"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {semesterKeys.map((semester) => (
                <div key={`${year}-${semester}`} className={`${tableShellClass} overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-600">
                    <span>{semester}</span>
                    <span>{semesters[semester].length} subject{semesters[semester].length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-[11px] leading-tight text-slate-700">
                      <thead className="bg-slate-50 text-[10.5px] uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="px-3 py-1.5 text-slate-500">Code</th>
                          <th className="px-3 py-1.5 text-slate-500">Subject</th>
                          <th className="px-3 py-1.5 text-center text-slate-500">Units</th>
                          <th className="px-3 py-1.5 text-slate-500">Schedule</th>
                          <th className="px-3 py-1.5 text-slate-500">Faculty</th>
                          <th className="px-3 py-1.5 text-center text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[10.5px]">
                        {semesters[semester].map((subject) => (
                          <tr
                            key={subject.id}
                            className={`even:bg-white odd:bg-slate-50/60 hover:bg-slate-100 ${subject.status?.toLowerCase?.() === "dropped" ? "bg-rose-50/50 hover:bg-rose-100" : ""}`}
                          >
                            <td className="px-3 py-1.5 align-top font-semibold text-slate-800">{subject.code || "—"}</td>
                            <td className="px-3 py-1.5 align-top text-slate-700">
                              <div className="whitespace-pre-line break-words leading-snug">{subject.title || "—"}</div>
                            </td>
                            <td className="px-3 py-1.5 align-top text-center text-slate-600">
                              <span className="inline-flex min-w-[2.5rem] justify-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {subject.units ?? "—"}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 align-top text-slate-500">
                              {subject.scheduleLabel}
                              {subject.status?.toLowerCase?.() === "dropped" && subject.dropReason ? (
                                <div className="mt-1 text-[10px] text-rose-500">Reason: {subject.dropReason}</div>
                              ) : null}
                            </td>
                            <td className="px-3 py-1.5 align-top text-slate-500">{subject.faculty}</td>
                            <td className="px-3 py-1.5 align-top text-center">
                              <span
                                className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold ${
                                  subject.status?.toLowerCase?.() === "dropped"
                                    ? "border-rose-200 bg-rose-50 text-rose-600"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-600"
                                }`}
                              >
                                {(subject.status ?? "Enrolled").toString().replace(/^[a-z]/, (char) => char.toUpperCase())}
                              </span>
                              {subject.status?.toLowerCase?.() === "dropped" && (
                                <div className="mt-1 space-y-0.5 text-[10px] text-rose-500">
                                  {subject.droppedAtLabel ? <div>Dropped {subject.droppedAtLabel}</div> : null}
                                  {subject.droppedByName ? <div>By {subject.droppedByName}</div> : null}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderHistory = () => {
    if (historyRecords.length === 0) {
      return <p className={emptyStateClass}>No unenrolled enrollment history recorded.</p>;
    }

    return (
      <div className="space-y-4">
        {historyRecords.map((record) => (
          <div key={`history-${record.id}`} className={cardClass}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-slate-900">{record.term_label}</div>
                <div className="text-[11px] text-slate-500">
                  {record.course?.code || "Course N/A"} · {record.year_level || "Year N/A"}
                  {record.section ? ` · Section ${record.section}` : ""}
                </div>
                {record.enrolled_at && (
                  <div className="text-[10px] text-slate-400">
                    Enrolled on {formatDate(record.enrolled_at, "Date unknown")}
                  </div>
                )}
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold ${historyStatusTone(
                  record.status,
                )}`}
              >
                {record.status || "Status"}
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-[11px] text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2.5 py-2">Code</th>
                    <th className="px-2.5 py-2">Subject Title</th>
                    <th className="px-2.5 py-2">Drop Reason</th>
                    <th className="px-2.5 py-2">Dropped At</th>
                    <th className="px-2.5 py-2">Faculty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {record.subjects.map((subject, index) => (
                    <tr key={`history-subject-${record.id}-${subject.id ?? index}`} className="hover:bg-slate-50/80">
                      <td className="px-2.5 py-2 font-semibold text-slate-800">{subject.code}</td>
                      <td className="px-2.5 py-2 text-slate-600">{subject.title}</td>
                      <td className="px-2.5 py-2 text-slate-500">{subject.drop_reason || "—"}</td>
                      <td className="px-2.5 py-2 text-slate-500">
                        {subject.dropped_at ? formatDate(subject.dropped_at, "—") : "—"}
                      </td>
                      <td className="px-2.5 py-2 text-slate-500">
                        {subject.faculty ? `${subject.faculty.fName ?? ""} ${subject.faculty.lName ?? ""}`.trim() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };


  const renderRequirements = () => {
    return (
      <div className="space-y-4">
        <section className={`${cardClass} space-y-2`}>
          <h3 className="text-sm font-semibold text-slate-800">Requirement Summary</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-slate-600">
            <span>
              <span className="font-semibold text-slate-900">{requirementsSummary.required}</span> required
            </span>
            <span>
              <span className="font-semibold text-slate-900">{requirementsSummary.submittedRequired}</span> submitted
            </span>
            <span>
              <span className="font-semibold text-slate-900">{requirementsSummary.missing}</span> missing
            </span>
            <span>
              <span className="font-semibold text-slate-900">{requirementsSummary.tracked}</span> records tracked
            </span>
          </div>
          {missingRequirements.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
              <p className="font-semibold">Outstanding documents</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {missingRequirements.map((item) => (
                  <li key={`missing-${item.id}`}>
                    {item.name}
                    {item.required_for ? ` • ${item.required_for}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : hasRequirementChoices ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
              All applicable requirements are submitted.
            </p>
          ) : null}
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={openRequirementModal}
            disabled={!hasRequirementChoices}
            className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <Plus className="h-4 w-4" />
            Add student requirement
          </button>
        </div>

        <section className={`${cardClass} space-y-3`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Requirement Records</h3>
          </div>
          {hasTrackedRequirements ? (
            <ul className="space-y-3 text-xs text-slate-600">
              {pagedRequirements.map((item) => {
                const requirement = item.requirement ?? {};
                const isSubmitted = Boolean(item.is_submitted);
                const badgeClass = isSubmitted ? badgeClasses.submitted : badgeClasses.pending;
                const proofUrl = mapProofUrl(item.image);

                return (
                  <li
                    key={`req-${item.id}`}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-slate-800">
                        <FileText className="h-3.5 w-3.5 text-blue-500" />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{requirement.name ?? "Unnamed"}</span>
                          <span className="text-[11px] text-slate-500">
                            {requirement.required_for ? `For ${requirement.required_for}` : "No category"}
                          </span>
                        </div>
                      </div>
                      <span className={badgeClass}>{isSubmitted ? "Submitted" : "Pending"}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {isSubmitted
                          ? `Submitted ${formatDate(item.submitted_at)}`
                          : "Awaiting submission"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        Last updated {formatDate(item.updated_at)}
                      </span>
                    </div>

                    {proofUrl && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 overflow-hidden rounded-md border border-slate-200 bg-white">
                            <img
                              src={proofUrl}
                              alt={`${requirement.name ?? "Requirement"} proof`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col text-[11px] text-slate-500">
                            <span className="font-medium text-slate-700">Proof preview</span>
                            <span>{isSubmitted ? "Verified document" : "Uploaded for review"}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProofModalImage(proofUrl)}
                          className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View proof
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={emptyStateClass}>No requirements recorded for this student.</p>
          )}

          {hasTrackedRequirements ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              <span>
                Showing
                <span className="mx-1 font-semibold text-slate-800">
                  {requirements.length
                    ? `${(currentRequirementPage - 1) * requirementsPageSize + 1}-${Math.min(
                        currentRequirementPage * requirementsPageSize,
                        requirements.length,
                      )}`
                    : "0"}
                </span>
                of
                <span className="ml-1 font-semibold text-slate-800">{requirements.length}</span>
                records
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRequirementsPage((page) => Math.max(page - 1, 1))}
                  disabled={currentRequirementPage === 1}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700">
                  Page {currentRequirementPage} / {requirementPageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setRequirementsPage((page) => Math.min(page + 1, requirementPageCount))}
                  disabled={currentRequirementPage === requirementPageCount}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : null}
        </section>

        {isRequirementModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              <button
                type="button"
                onClick={closeRequirementModal}
                className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                disabled={isRequirementSubmitting}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex-1 overflow-y-auto pr-1">
                <div className="space-y-4 pr-6">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Log Requirement</h3>
                    <p className="text-[11px] text-slate-500">
                      Select the document, attach proof if available, then mark it as submitted.
                    </p>
                  </div>

                  {!hasRequirementChoices ? (
                    <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                      No applicable requirement definitions available.
                    </p>
                  ) : (
                    <form onSubmit={handleRequirementSubmit} className="space-y-3 pb-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Requirement category</label>
                        <select
                          value={selectedRequirementGroup}
                          onChange={handleRequirementCategoryChange}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                          disabled={isRequirementSubmitting || !requirementCategories.length}
                          required
                        >
                          <option value="">Select category</option>
                          {requirementCategories.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                        {requirementCategoryError && (
                          <p className="text-[11px] text-rose-500">{requirementCategoryError}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Requirement</label>
                        {!selectedRequirementGroup ? (
                          <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                            Select a category to view its available requirements.
                          </p>
                        ) : !hasVisibleRequirementChoices ? (
                          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-600">
                            No requirements defined for this category.
                          </p>
                        ) : (
                          <ul className="space-y-1 list-none p-0">
                            {filteredRequirementOptions.map((option) => {
                              const optionValue = String(option.id);
                              const isSelected = requirementFormData.requirement_id === optionValue;
                              const proofInfo = existingRequirementProofs[optionValue] ?? null;
                              const previewSource = proofInfo?.url ?? null;

                              return (
                                <li key={option.id}>
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleRequirementSelect(optionValue)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        handleRequirementSelect(optionValue);
                                      }
                                    }}
                                    className={`block rounded-md border px-3 py-2 text-xs transition ${
                                      isSelected
                                        ? "border-blue-300 bg-blue-50"
                                        : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                                        <Image className="h-3.5 w-3.5 text-blue-500" />
                                        {option.name}
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {!proofInfo && (
                                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600">
                                            <Upload className="h-3 w-3" />
                                            Browse
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(event) => handleRequirementFileChange(event, optionValue)}
                                              disabled={isRequirementSubmitting}
                                            />
                                          </label>
                                        )}
                                        {previewSource && (
                                          <label
                                            className="h-12 w-12 cursor-pointer overflow-hidden rounded-md border border-slate-200 bg-slate-50 transition hover:border-blue-200 focus-within:ring-2 focus-within:ring-blue-400"
                                            title="Change proof"
                                          >
                                            <img src={previewSource} alt={`${option.name} proof`} className="h-full w-full object-cover" />
                                            <span className="sr-only">Change proof</span>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              className="hidden"
                                              onChange={(event) => handleRequirementFileChange(event, optionValue)}
                                              disabled={isRequirementSubmitting}
                                            />
                                          </label>
                                        )}
                                        {previewSource && (
                                          <button
                                            type="button"
                                            onClick={() => setProofModalImage(previewSource)}
                                            className="group inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {requirementFormErrors.requirement_id && (
                          <p className="text-[11px] text-rose-500">{requirementFormErrors.requirement_id}</p>
                        )}
                        {requirementFormErrors.image && (
                          <p className="text-[11px] text-rose-500">{requirementFormErrors.image}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={closeRequirementModal}
                          className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                          disabled={isRequirementSubmitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isRequirementSubmitting}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                        >
                          {isRequirementSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                          Save requirement
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <AddSubjectModal
          isOpen={isAddSubjectModalOpen}
          onClose={closeAddSubjectModal}
          onSubmit={handleAddSubjectSubmit}
          search={addSubjectSearch}
          onSearchChange={handleAddSubjectSearchChange}
          enrollmentSummary={{
            course: activeEnrollment?.course?.code ?? "Course",
            year: activeEnrollment?.year_level?.year_level ?? "Year N/A",
            semester: activeEnrollment?.semester?.semester ?? "Semester N/A",
            yearLabel: addSubjectContext?.yearLabel ?? null,
          }}
          options={filteredAddSubjectOptions}
          selection={addSubjectSelection}
          onSelectOption={handleAddSubjectOptionSelect}
          onSelectSchedule={handleAddSubjectScheduleSelect}
          isSubmitting={isAddSubjectSubmitting}
        />


        {proofModalImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
            <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
              <button
                type="button"
                onClick={() => setProofModalImage(null)}
                className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center justify-center">
                <img
                  src={proofModalImage}
                  alt="Proof preview"
                  className="max-h-[70vh] w-full max-w-full rounded-lg object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGrades = () => {
    const yearKeys = Object.keys(groupedSubjects);

    if (yearKeys.length === 0) {
      return <p className={emptyStateClass}>No grade records found.</p>;
    }

    return (
      <div className="space-y-4">
        {yearKeys.map((year) => {
          const semesters = groupedSubjects[year] || {};
          const semesterKeys = Object.keys(semesters);

          return (
            <div key={year} className="space-y-3">
              <div className="rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-600">
                {year}
              </div>
              {semesterKeys.map((semester) => (
                <div key={`${year}-${semester}`} className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-1.75 text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
                    <span>{semester}</span>
                    <span>{semesters[semester].length} subject{semesters[semester].length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-[11px] text-slate-700">
                      <thead className="bg-slate-50 text-[10.5px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-2.5 py-2">Code</th>
                          <th className="px-2.5 py-2">Subject</th>
                          <th className="px-2.5 py-2 text-center">Midterm</th>
                          <th className="px-2.5 py-2 text-center">Final</th>
                          <th className="px-2.5 py-2 text-center">Cumulative</th>
                          <th className="px-2.5 py-2 text-center">Remarks</th>
                          <th className="px-2.5 py-2 text-center">Midterm Status</th>
                          <th className="px-2.5 py-2 text-center">Final Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {semesters[semester].map((subject) => (
                          <tr key={`grade-${subject.id}`} className="hover:bg-slate-50">
                            <td className="px-2.5 py-2 font-semibold text-slate-800">{subject.code}</td>
                            <td className="px-2.5 py-2 text-slate-700">{subject.title}</td>
                            <td className={`px-2.5 py-2 text-center ${determineGradeTone(subject.grades.midtermNumeric)}`}>
                              {subject.grades.midterm}
                            </td>
                            <td className={`px-2.5 py-2 text-center ${determineGradeTone(subject.grades.finalNumeric)}`}>
                              {subject.grades.final}
                            </td>
                            <td className={`px-2.5 py-2 text-center ${determineGradeTone(subject.grades.cumulativeNumeric)}`}>
                              {subject.grades.hasCompleteScores ? subject.grades.cumulative : "-"}
                            </td>
                            <td className="px-2.5 py-2 text-center text-slate-600">
                              {subject.grades.hasCompleteScores ? subject.grades.remarks : "-"}
                            </td>
                            <td className={`px-2.5 py-2 text-center ${determineStatusTone(subject.grades.midtermStatus)}`}>
                              {subject.grades.midtermStatus}
                            </td>
                            <td className={`px-2.5 py-2 text-center ${determineStatusTone(subject.grades.finalStatus)}`}>
                              {subject.grades.finalStatus}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderAccount = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className={cardClass}>
          <h3 className={sectionTitleClass}>
            <Mail className="h-4 w-4 text-slate-500" /> Account Details
          </h3>
          <dl className={detailListClass}>
            <div className={detailRowClass}>
              <dt className="font-medium">Username</dt>
              <dd>{student.username ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Email</dt>
              <dd>{student.email ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Contact Number</dt>
              <dd>{student.contact_no ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <div className={cardClass}>
          <h3 className={sectionTitleClass}>
            <VenetianMask className="h-4 w-4 text-slate-500" /> Additional Details
          </h3>
          <dl className={detailListClass}>
            <div className={detailRowClass}>
              <dt className="font-medium">ID Number</dt>
              <dd>{student.id_number ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Role</dt>
              <dd className="capitalize">{student.role ?? "—"}</dd>
            </div>
            <div className={detailRowClass}>
              <dt className="font-medium">Address</dt>
              <dd>{student.address ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className={cardClass}>
        <h3 className={sectionTitleClass}>
          <ShieldCheck className="h-4 w-4 text-slate-500" /> Account Actions
        </h3>
        <p className="text-[11px] text-slate-500">
          Accounts are created with a randomly generated password hashed via <span className="font-semibold">bcrypt</span> on the backend.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleCreateAccount}
            disabled={!student?.id || createAccountForm.processing}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {createAccountForm.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {student?.username ? "Account Exists" : "Create Account"}
          </button>

          <button
            type="button"
            onClick={handleSendCredentials}
            disabled={!student?.username || sendEmailForm.processing}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:text-indigo-400"
          >
            {sendEmailForm.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Resend Credentials
          </button>
        </div>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case "enrollments":
        return renderEnrollments();
      case "subjects":
        return renderSubjects();
      case "history":
        return renderHistory();
      case "grades":
        return renderGrades();
      case "requirements":
        return renderRequirements();
      case "account":
        return renderAccount();
      case "student-info":
        return renderStudentInfo();
      default:
        return renderOverview();
    }
  };

  const handleTabChange = (tabKey) => {
    if (tabKey === activeTab) return;
    const currentIndex = tabConfig.findIndex((tab) => tab.key === activeTab);
    const nextIndex = tabConfig.findIndex((tab) => tab.key === tabKey);
    setTabDirection(nextIndex > currentIndex ? "right" : "left");
    setActiveTab(tabKey);
  };

  return (
    <RegistrarLayout>
      <Head title={`Student Record - ${student?.fName ?? "Student"}`} />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-5 text-slate-700">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Link
            href={route("registrar.students.profile")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Student List
          </Link>
          <div className={tabListClass}>
            {tabConfig.map((tab) => {
              const isActive = tab.key === activeTab;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`${tabButtonBase} ${isActive ? tabButtonActive : tabButtonInactive}`}
                  aria-pressed={isActive}
                  aria-current={isActive ? "page" : undefined}
                >
                  {TabIcon ? <TabIcon className="h-3.5 w-3.5" /> : null}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative">
          <div
            key={tabRenderKey}
            className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl shadow-slate-200/70 transition-all duration-300 ease-out md:p-6"
            style={{
              animation:
                tabDirection === "right"
                  ? "studentRecordTabEnterRight 320ms ease"
                  : "studentRecordTabEnterLeft 320ms ease",
            }}
          >
            {renderActiveTab()}
          </div>
        </div>
      </div>
    </RegistrarLayout>
  );
}
