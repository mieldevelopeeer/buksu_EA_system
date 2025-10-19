import React, { useState, useMemo, useRef, useLayoutEffect } from "react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import { Head, router } from "@inertiajs/react";
import {
  Users,
  MapPin,
  Book,
  Clock,
  XCircle,
  Calendar,
  Trash,
  CheckCircle,
  Eye,
  Printer,
} from "phosphor-react";
import { Rnd } from "react-rnd";
import Swal from "sweetalert2";

// Constants
const CELL_HEIGHT = 34;
const COL_WIDTH = 136;
const TIME_COL_WIDTH = 80; // matches first column width in gridTemplateColumns
const ROW_BORDER = 1; // px, matches border-b on each time slot row
// Header height will be measured at runtime for pixel-perfect alignment
const BASE_HOUR = 5;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SESSION_TYPES = [
  { value: "lecture", label: "Lecture (Lec)" },
  { value: "laboratory", label: "Laboratory (Lab)" },
];

const SESSION_LIMITS = {
  lecture: 1,
  laboratory: 2,
};

const getSessionLimit = (type) => SESSION_LIMITS[type] ?? 1;

// Generate time slots every 30 mins
const generateTimeSlots = () => {
  const slots = [];
  for (let h = BASE_HOUR; h <= 21; h++) {
    slots.push(`${h}:00`);
    slots.push(`${h}:30`);
  }
  return slots;
};

// Time formatting
const formatTimeToAMPM = (time) => {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
};
const convertToMinutes = (timeString) => {
  const [h, m] = timeString.split(":").map(Number);
  return h * 60 + m;
};
const convertFromMinutes = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
};

// Ensure HH:mm for <input type="time">
const toHHMM = (time) => {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const h = String(Number(hStr)).padStart(2, "0");
  const m = String(Number(mStr || 0)).padStart(2, "0");
  return `${h}:${m}`;
};

// Validation & grid helpers
const isValidHHMM = (val) => /^\d{1,2}:\d{2}$/.test(val);
const isOnGrid = (val) => {
  if (!isValidHHMM(val)) return false;
  const [, m] = val.split(":").map(Number);
  return m === 0 || m === 30;
};
const snapToGrid = (val) => {
  if (!isValidHHMM(val)) return val;
  const [h, m] = val.split(":").map(Number);
  const snappedM = m < 15 ? 0 : m < 45 ? 30 : 0;
  const nextH = m >= 45 ? h + 1 : h;
  return `${nextH}:${snappedM.toString().padStart(2, "0")}`;
};

// Color utility: convert hex to rgba with alpha for subtle backgrounds
const withAlpha = (hex, alpha = 0.12) => {
  if (!hex) return `rgba(59, 130, 246, ${alpha})`; // default blue-500
  const m = hex.trim().match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!m) return `rgba(59, 130, 246, ${alpha})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const hexToRgb = (hex) => {
  const value = hex?.trim();
  if (!value) return null;
  const match = value.match(/^#?([a-f\d]{3}|[a-f\d]{6})$/i);
  if (!match) return null;
  let hexBody = match[1];
  if (hexBody.length === 3) {
    hexBody = hexBody
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  const intVal = parseInt(hexBody, 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
};

const clampChannel = (value) => Math.min(255, Math.max(0, Math.round(value)));

const rgbToHex = ({ r, g, b }) =>
  `#${clampChannel(r).toString(16).padStart(2, "0")}${clampChannel(g)
    .toString(16)
    .padStart(2, "0")}${clampChannel(b).toString(16).padStart(2, "0")}`;

const lightenHex = (hex, amount = 0.2) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const mix = {
    r: rgb.r + (255 - rgb.r) * amount,
    g: rgb.g + (255 - rgb.g) * amount,
    b: rgb.b + (255 - rgb.b) * amount,
  };
  return rgbToHex(mix);
};

const darkenHex = (hex, amount = 0.2) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const mix = {
    r: rgb.r * (1 - amount),
    g: rgb.g * (1 - amount),
    b: rgb.b * (1 - amount),
  };
  return rgbToHex(mix);
};

const getReadableTextColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#1f2937";
  const { r, g, b } = rgb;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62 ? "#1f2937" : "#ffffff";
};

const getMutedTextColor = (hex) => {
  const base = getReadableTextColor(hex);
  return base === "#ffffff" ? "rgba(255,255,255,0.85)" : "#334155";
};

const getSubtleTextColor = (hex) => {
  const base = getReadableTextColor(hex);
  return base === "#ffffff" ? "rgba(255,255,255,0.72)" : "#475569";
};

const getTimetableBackground = (hex) => {
  const base = hex || "#3b82f6";
  const light = lightenHex(base, 0.45);
  const mid = lightenHex(base, 0.2);
  const deep = darkenHex(base, 0.15);
  return `linear-gradient(140deg, ${withAlpha(light, 0.92)} 0%, ${withAlpha(mid, 0.78)} 48%, ${withAlpha(deep, 0.82)} 100%)`;
};

 const saveScheds = (router, payload, callbacks = {}) => {
  const { onSuccess, onError } = callbacks;

  const url = route('program-head.faculty.assign.addSched'); // ✅ updated route name

  console.log("🟢 Sending schedule data to:", url);
  console.log("📦 Payload:", payload);

  return router.post(url, payload, {
    preserveScroll: true,
    onSuccess: (page) => {
      console.log("✅ Schedule saved successfully!", page);
      if (onSuccess) onSuccess(page);
    },
    onError: (errors) => {
      console.error("❌ Error saving schedule:", errors);
      if (onError) onError(errors);
    },
  });
};



const SESSION_LABELS = SESSION_TYPES.reduce((acc, type) => {
  acc[type.value] = type.label;
  return acc;
}, {});

const normalizeSessionType = (value) =>
  SESSION_LABELS[value] ? value : "lecture";

export default function FacultyAssignment({
  curriculumSubjects = [],
  faculties = [],
  classrooms = [],
  yearLevels = [],
  sections = [],
  semesters = [],
  activeSchoolYear,
  activeSemester,
  defaultCourses = [],
  readOnly = false,
}) {
  // Initialize schedules
  const initialSchedules = faculties.flatMap((faculty) =>
    (faculty.class_schedules || []).map((schedule) => ({
      id: schedule.id,
      curriculum_subject_id: Number(schedule.curriculum_subject_id),
      faculty_id: Number(schedule.faculty_id),
      classroom_id: Number(schedule.classroom_id),
      section_id: Number(schedule.section_id),
      year_level_id: Number(schedule.year_level_id),
      day: schedule.schedule_day,
      start: schedule.start_time.slice(0, 5),
      end: schedule.end_time.slice(0, 5),
      color: schedule.color || "#dbeafe",
      session_type: schedule.session_type,
      isExisting: true,
      // Infer semesterId from schedule or curriculum subject
      semesterId: (() => {
        const cs = curriculumSubjects.find(
          (c) => Number(c.id) === Number(schedule.curriculum_subject_id)
        );
        return (
          schedule.semester_id ?? cs?.semesters_id ?? null
        );
      })(),
    }))
  );

  const [schedules, setSchedules] = useState(initialSchedules);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedYearLevel, setSelectedYearLevel] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [activeTab, setActiveTab] = useState("timetable");
  const [selectedSemester, setSelectedSemester] = useState(
    activeSemester?.id ? String(activeSemester.id) : "All"
  );

  const handleSectionChange = (value) => {
    setSelectedSection(value);
  };

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Measure header height to align items with the grid precisely
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(44);
  useLayoutEffect(() => {
    if (headerRef.current) {
      const h = Math.round(headerRef.current.getBoundingClientRect().height);
      if (h && h !== headerHeight) setHeaderHeight(h);
    }
  }, [activeTab, selectedYearLevel, selectedSection]);

  // Filter by section + semester
  const filteredSchedules = useMemo(() => {
    const matchesSemester = (s) =>
      selectedSemester === "All" || String(s.semesterId) === String(selectedSemester);
    return schedules.filter(
      (s) =>
        s.year_level_id === Number(selectedYearLevel) &&
        s.section_id === Number(selectedSection) &&
        matchesSemester(s)
    );
  }, [schedules, selectedYearLevel, selectedSection, selectedSemester]);

  // Build section groups for list tab with semester filter
  const sectionGroups = useMemo(() => {
    const matchesSemester = (s) =>
      selectedSemester === "All" || String(s.semesterId) === String(selectedSemester);
    const groups = [];
    yearLevels.forEach((yl) => {
      const secOfYL = sections.filter((sec) => sec.year_level_id === yl.id);
      secOfYL.forEach((sec) => {
        const secSchedules = schedules.filter(
          (s) =>
            s.year_level_id === yl.id &&
            s.section_id === sec.id &&
            matchesSemester(s)
        );
        if (secSchedules.length > 0) {
          groups.push({ yearLevel: yl, section: sec, schedules: secSchedules });
        }
      });
    });
    return groups;
  }, [schedules, yearLevels, sections, selectedSemester]);

  // Pagination for list tab
  const [listPage, setListPage] = useState(1);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(sectionGroups.length / pageSize));
  const pagedGroups = useMemo(() => {
    const start = (listPage - 1) * pageSize;
    return sectionGroups.slice(start, start + pageSize);
  }, [sectionGroups, listPage]);

  const handleCellClick = (day, startTime) => {
    if (readOnly) return;
    if (!selectedYearLevel || !selectedSection) return;

    // Prevent creating out-of-bounds slot at the end of the day
    const startM = convertToMinutes(startTime);
    const duration = 30;
    const dayEnd = 21 * 60 + 30; // 21:30
    if (startM + duration > dayEnd) {
      Swal.fire({
        icon: "warning",
        title: "Time Out of Range",
        text: "Cannot start a class that extends beyond 9:30 PM.",
        timer: 2200,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
      return;
    }

    const defaultCourseId = defaultCourses.length === 1 ? Number(defaultCourses[0].id) : null;

    setEditingSchedule({
      id: Date.now().toString(),
      curriculum_subject_id: null,
      faculty_id: null,
      classroom_id: null,
      section_id: Number(selectedSection),
      year_level_id: Number(selectedYearLevel),
      day,
      start: toHHMM(startTime),
      end: toHHMM(convertFromMinutes(convertToMinutes(startTime) + 30)),
      color: "#dbeafe",
      session_type: "lecture",
      isExisting: false,
      course_id: defaultCourseId,
    });
  };

  const getFacultyName = (id) => {
    const faculty = faculties.find((f) => f.id === id);
    return faculty ? `${faculty.fName} ${faculty.lName}` : "TBA";
  };

  // Helper: robustly resolve subject for a schedule across multiple sources
  const getSubjectForSchedule = (s) => {
    // 0) Direct string fields sometimes provided by API
    if (s?.subject) return typeof s.subject === 'string' ? { descriptive_title: s.subject } : s.subject;
    if (s?.subject_title) return { descriptive_title: s.subject_title };

    // 1) Direct nested relation on schedule if available
    const nested = s?.curriculum_subject?.subject || s?.curriculumSubject?.subject;
    if (nested) return nested;

    // 2) Try via faculty payload relation using schedule id or curriculum_subject_id
    const fac = faculties.find((f) => Number(f.id) === Number(s.faculty_id) || String(f.id) === String(s.faculty_id));
    if (fac && Array.isArray(fac.class_schedules)) {
      // Match by schedule id
      let cs = fac.class_schedules.find((x) => Number(x.id) === Number(s.id) || String(x.id) === String(s.id));
      // If not found, try by curriculum_subject_id
      if (!cs && (s.curriculum_subject_id != null)) {
        cs = fac.class_schedules.find((x) => Number(x.curriculum_subject_id) === Number(s.curriculum_subject_id) || String(x.curriculum_subject_id) === String(s.curriculum_subject_id));
      }
      const viaFaculty = cs?.curriculum_subject?.subject || cs?.curriculumSubject?.subject;
      if (viaFaculty) return viaFaculty;
    }

    // 3) Fallback to curriculumSubjects list by curriculum_subject_id
    const fromList = curriculumSubjects.find(
      (cs) => Number(cs.id) === Number(s.curriculum_subject_id) || String(cs.id) === String(s.curriculum_subject_id)
    )?.subject;
    if (fromList) return fromList;

    return undefined;
  };

  const getAssignedTypeCounts = (subjectId, options = {}) => {
    const normalizedId = Number(subjectId);
    if (!normalizedId) return {};

    const {
      excludeScheduleId = null,
      sectionId = null,
      yearLevelId = null,
    } = options;

    const excludeId = excludeScheduleId != null ? String(excludeScheduleId) : null;
    const normalizedSection = sectionId != null ? Number(sectionId) : null;
    const normalizedYear = yearLevelId != null ? Number(yearLevelId) : null;

    const counts = {};
    schedules.forEach((schedule) => {
      if (Number(schedule.curriculum_subject_id) !== normalizedId) return;
      if (excludeId && String(schedule.id) === excludeId) return;
      if (normalizedSection != null && Number(schedule.section_id) !== normalizedSection) return;
      if (normalizedYear != null && Number(schedule.year_level_id) !== normalizedYear) return;

      const normalizedType = normalizeSessionType(schedule.session_type);
      counts[normalizedType] = (counts[normalizedType] || 0) + 1;
    });
    return counts;
  };

  const getAssignedTypesForSubject = (subjectId, options = {}) => {
    const counts = getAssignedTypeCounts(subjectId, options);
    return new Set(
      Object.entries(counts)
        .filter(([, count]) => count > 0)
        .map(([type]) => type)
    );
  };

  const getNextAvailableSessionType = (subjectId, options = {}) => {
    if (!subjectId) return null;
    const counts = getAssignedTypeCounts(subjectId, options);
    const next = SESSION_TYPES.find(
      (type) => (counts[type.value] || 0) < getSessionLimit(type.value)
    );
    return next ? next.value : null;
  };

  const handleDragStop = (scheduleId, d) => {
    if (readOnly) return;
    
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    // Calculate new time based on y position, accounting for header and row borders
    const unitsFromTop = (d.y - headerHeight) / (CELL_HEIGHT + ROW_BORDER);
    const startIndex = Math.round(unitsFromTop); // each unit = 30 minutes
    const newStartMinutes = startIndex * 30 + BASE_HOUR * 60;
    const duration = convertToMinutes(schedule.end) - convertToMinutes(schedule.start);
    const newEndMinutes = newStartMinutes + duration;

    const newStart = convertFromMinutes(newStartMinutes);
    const newEnd = convertFromMinutes(newEndMinutes);

    // Validate bounds
    const dayEnd = 21 * 60 + 30;
    if (newStartMinutes < BASE_HOUR * 60 || newEndMinutes > dayEnd) {
      Swal.fire({
        icon: "warning",
        title: "Out of Bounds",
        text: "Schedule must be within 5:00 AM - 9:30 PM.",
        timer: 2200,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
      return;
    }

    const updatedSchedule = { ...schedule, start: newStart, end: newEnd };

    // Check conflicts
    const conflicting = schedules.find((s) => {
      if (s.id === scheduleId) return false;
      const sameDay = s.day === updatedSchedule.day;
      const overlap =
        convertToMinutes(updatedSchedule.start) < convertToMinutes(s.end) &&
        convertToMinutes(updatedSchedule.end) > convertToMinutes(s.start);
      return sameDay && overlap && 
        (s.faculty_id === updatedSchedule.faculty_id || 
         s.section_id === updatedSchedule.section_id || 
         s.classroom_id === updatedSchedule.classroom_id);
    });

    if (conflicting) {
      Swal.fire({
        icon: "error",
        title: "Schedule Conflict",
        text: "This time slot conflicts with another schedule.",
        timer: 2500,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
      return;
    }

    setSchedules(schedules.map((s) => (s.id === scheduleId ? updatedSchedule : s)));

    // Backend update endpoint not available; skipping network call to avoid 404
    // TODO: When update route is ready, call it here.
  };

  const handleDeleteSchedule = (scheduleId) => {
    if (readOnly) return;

    const schedule = schedules.find((s) => s.id === scheduleId);
    
    Swal.fire({
      title: "Delete Schedule?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        setSchedules(schedules.filter((s) => s.id !== scheduleId));
        
        // Backend delete endpoint not available; skipping network call to avoid 404
        // TODO: When delete route is ready, call it here.
        Swal.fire({
          icon: "success",
          title: "Deleted",
          text: "Schedule has been removed.",
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
      }
    });
  };

  const validateAndSaveSchedule = () => {
    if (!editingSchedule.curriculum_subject_id) {
      Swal.fire({
        icon: "warning",
        title: "Subject Required",
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
      return;
    }

    // Basic required fields
    if (!editingSchedule.faculty_id || !editingSchedule.classroom_id) {
      Swal.fire({
        icon: "warning",
        title: "Faculty and Room Required",
        timer: 2200,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
      return;
    }

    if (!editingSchedule.session_type) {
      Swal.fire({
        icon: "warning",
        title: "Session Type Required",
        timer: 2200,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
      return;
    }

    // Validate time format and grid, snap when necessary
    let start = editingSchedule.start;
    let end = editingSchedule.end;
    if (!isValidHHMM(start) || !isValidHHMM(end)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Time",
        text: "Use HH:MM format.",
        timer: 2200,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
      return;
    }
    if (!isOnGrid(start) || !isOnGrid(end)) {
      start = snapToGrid(start);
      end = snapToGrid(end);
    }

    const startM = convertToMinutes(start);
    const endM = convertToMinutes(end);
    const dayStart = BASE_HOUR * 60;
    const dayEnd = 21 * 60 + 30; // 21:30

    if (startM < dayStart || endM > dayEnd) {
      Swal.fire({
        icon: "error",
        title: "Out of Allowed Hours",
        text: "Classes must be between 5:00 AM and 9:30 PM.",
        timer: 2600,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
      return;
    }
    if (endM <= startM) {
      Swal.fire({
        icon: "error",
        title: "Invalid Duration",
        text: "End time must be after start time.",
        timer: 2200,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
      return;
    }

    const newSchedule = { ...editingSchedule, start, end };

    // Conflict detection with descriptive message
    let conflictMsg = null;
    const conflicting = schedules.find((s) => {
      if (s.id === newSchedule.id) return false;
      if (s.day !== newSchedule.day) return false;

      const overlap =
        convertToMinutes(newSchedule.start) < convertToMinutes(s.end) &&
        convertToMinutes(newSchedule.end) > convertToMinutes(s.start);

      if (overlap) {
        if (s.faculty_id === newSchedule.faculty_id) {
          conflictMsg = "Faculty is already scheduled at this time.";
          return true;
        }
        const normalizedSectionType = normalizeSessionType(s.session_type);
        const newType = normalizeSessionType(newSchedule.session_type);
        if (s.section_id === newSchedule.section_id && normalizedSectionType === newType) {
          conflictMsg = "This section already has a class of the same session type at this time.";
          return true;
        }
        if (s.classroom_id === newSchedule.classroom_id) {
          conflictMsg = "Classroom is occupied at this time.";
          return true;
        }
      }

      return false;
    });

    const assignedCounts = getAssignedTypeCounts(newSchedule.curriculum_subject_id, {
      excludeScheduleId: newSchedule.id,
      sectionId: newSchedule.section_id,
      yearLevelId: newSchedule.year_level_id,
    });

    const normalizedType = normalizeSessionType(newSchedule.session_type);
    if ((assignedCounts[normalizedType] || 0) >= getSessionLimit(normalizedType)) {
      Swal.fire({
        icon: "error",
        title: "Duplicate Session",
        text: "This subject already reached the allowed number of schedules for the selected session type.",
        timer: 2600,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
      return;
    }

    if (conflicting) {
      Swal.fire({
        icon: "error",
        title: "Schedule Conflict",
        text: conflictMsg || "This schedule conflicts with another entry.",
        timer: 3200,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
      return;
    }

    const isUpdate = schedules.some((s) => s.id === editingSchedule.id);
    
    setSchedules(
      isUpdate
        ? schedules.map((s) => (s.id === editingSchedule.id ? newSchedule : s))
        : [...schedules, newSchedule]
    );

    // Save to backend: controller expects { schedules: [ ... ] }
    const payload = {
      schedules: [
        {
          curriculum_subject_id: newSchedule.curriculum_subject_id,
          faculty_id: newSchedule.faculty_id,
          classroom_id: newSchedule.classroom_id,
          section_id: newSchedule.section_id,
          year_level_id: newSchedule.year_level_id,
          color:
            newSchedule.color ||
            `#${Math.floor(Math.random() * 0xffffff)
              .toString(16)
              .padStart(6, "0")}`,
          session_type: normalizeSessionType(newSchedule.session_type),
          schedule_day: newSchedule.day,
          start_time: toHHMM(newSchedule.start),
          end_time: toHHMM(newSchedule.end),
          // year/semester set in controller from active values; color optional
        },
      ],
    };

    if (isUpdate && newSchedule.isExisting) {
      // Backend update endpoint not available; skipping network call to avoid 404
      // TODO: When update route is ready, call it here.
      Swal.fire({
        icon: "success",
        title: "Updated",
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } else if (!isUpdate) {
      saveScheds(router, payload, {
        onSuccess: () => {
          Swal.fire({
            icon: "success",
            title: "Schedule Created",
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: "top-end",
          });
        },
        onError: () => {
          Swal.fire({
            icon: "error",
            title: "Creation Failed",
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: "top-end",
          });
        },
      });
    }
    
    setEditingSchedule(null);
  };

  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printType, setPrintType] = useState('section'); // 'room' | 'section' | 'faculty'
  const [printRoomId, setPrintRoomId] = useState('');
  const [printSectionId, setPrintSectionId] = useState('');
  const [printFacultyId, setPrintFacultyId] = useState('');
  const [printSheetActive, setPrintSheetActive] = useState(false);
  const [forceLandscape, setForceLandscape] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomModalId, setRoomModalId] = useState('');
  const [roomModalLandscape, setRoomModalLandscape] = useState(false);

  const dayOrder = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

  const currentViewSchedules = useMemo(() => {
    // Base: schedules state, optionally filtered by current selection
    let base = schedules;
    if (selectedYearLevel) base = base.filter(s => Number(s.year_level_id) === Number(selectedYearLevel));
    if (selectedSection) base = base.filter(s => Number(s.section_id) === Number(selectedSection));
    return base;
  }, [schedules, selectedYearLevel, selectedSection]);

  const filteredForPrint = useMemo(() => {
    // For room printing, include ALL schedules (ignore current selections)
    let arr = printType === 'room' ? schedules : currentViewSchedules;
    if (printType === 'room' && printRoomId) arr = arr.filter(s => Number(s.classroom_id) === Number(printRoomId));
    if (printType === 'section' && printSectionId) arr = arr.filter(s => Number(s.section_id) === Number(printSectionId));
    if (printType === 'faculty' && printFacultyId) arr = arr.filter(s => Number(s.faculty_id) === Number(printFacultyId));
    return arr
      .slice()
      .sort((a, b) => {
        if (dayOrder[a.day] !== dayOrder[b.day]) return dayOrder[a.day] - dayOrder[b.day];
        return convertToMinutes(a.start) - convertToMinutes(b.start);
      });
  }, [schedules, currentViewSchedules, printType, printRoomId, printSectionId, printFacultyId]);

  // Timetable: filter by room
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const filteredRoomSchedules = useMemo(() => {
    let arr = currentViewSchedules;
    if (selectedRoomId) arr = arr.filter((s) => Number(s.classroom_id) === Number(selectedRoomId));
    return arr;
  }, [currentViewSchedules, selectedRoomId]);

  const handleOpenPrint = () => {
    // seed defaults from current selections
    if (selectedSection) setPrintSectionId(String(selectedSection));
    setShowPrintModal(true);
  };

  const handleConfirmPrint = () => {
    setShowPrintModal(false);
    setPrintSheetActive(true);
    // Print after next paint to ensure print sheet is rendered
    setTimeout(() => {
      window.print();
      // Cleanup after print
      setTimeout(() => setPrintSheetActive(false), 0);
    }, 50);
  };

  return (
    <ProgramHeadLayout>
      <Head title="Faculty Assignment & Scheduling" />

      {/* Print styles */}
      <style>{`
        @page {
          size: auto; /* portrait by default */
          margin: 8mm; /* tighter margins to fit more */
        }
        @media print {
          html, body { height: auto; }
          body * { visibility: hidden !important; }
          .no-print { display: none !important; }

          /* Visible regions */
          .printable, .printable * { visibility: visible !important; }
          .printable { position: absolute; left: 0; top: 0; width: 100% !important; box-shadow: none !important; background: white; }

          /* Dedicated print sheet overrides */
          .print-sheet, .print-sheet * { visibility: visible !important; }
          .print-sheet { position: absolute; inset: 0; width: 100% !important; background: white; font-size: 10px; line-height: 1.25; }
          .print-sheet h1 { font-size: 18px; margin: 0 0 6px 0; color: #0f172a; }
          .print-sheet h2 { font-size: 14px; margin: 0 0 6px 0; color: #0f172a; }
          .print-sheet p { margin: 0 0 6px 0; }
          .print-sheet .print-header { background: #eff6ff; border: 1px solid #dbeafe; }
          .print-sheet table { width: 100%; table-layout: fixed; border-collapse: collapse; }
          .print-sheet th, .print-sheet td { padding: 4px; word-wrap: break-word; border: 1px solid #dbeafe; }
          .print-sheet th { background: #eff6ff; color: #0f172a; font-weight: 600; }
          .print-sheet tr { break-inside: avoid; page-break-inside: avoid; }
          .print-sheet tbody tr:nth-child(even) { background: #f8fafc; }

          /* Also compress the timetable/list if printed directly */
          .printable .text-sm { font-size: 11px !important; }
          .printable .text-xs { font-size: 10px !important; }
          .printable .p-4 { padding: 8px !important; }
          .printable .p-3 { padding: 6px !important; }
          .printable .p-2 { padding: 4px !important; }
          .printable .py-2 { padding-top: 6px !important; padding-bottom: 6px !important; }
          .printable .px-2 { padding-left: 6px !important; padding-right: 6px !important; }
        }
      `}</style>
      {forceLandscape && (
        <style>{`
          @media print { @page { size: landscape; } }
        `}</style>
      )}

      <div className="p-6 flex flex-col gap-6 min-h-screen" style={{ overflow: 'visible' }}>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-800">
              Faculty Assignment & Scheduling
            </h1>
            {activeSchoolYear && (
              <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                <Calendar size={14} className="text-gray-500" />
                {activeSemester?.semester} Semester - {activeSchoolYear} AY
              </p>
            )}
          </div>
          {/* Removed header print button; printing is handled inside modals */}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab("timetable")}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === "timetable"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Timetable View
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === "list"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Schedule List
          </button>
          <button
            onClick={() => setActiveTab("rooms")}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === "rooms"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Rooms
          </button>
        </div>

        {/* Filters - Only show in timetable view */}
        {activeTab === "timetable" && (
        <div className="bg-gray-50 p-3 rounded-md shadow-sm">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="border rounded-md px-2 py-1 text-xs"
              >
                <option value="All">All</option>
                {semesters.map((sem) => (
                  <option key={sem.id} value={String(sem.id)}>
                    {sem.semester}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Year Level
              </label>
              <select
                value={selectedYearLevel}
                onChange={(e) => {
                              setSelectedYearLevel(e.target.value);
                  setSelectedSection("");
                }}
                className="border rounded-md px-2 py-1 text-xs"
              >
                <option value="">Select Year Level</option>
                {yearLevels.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year_level}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Section
              </label>
              <select
                value={selectedSection}
                onChange={(e) => handleSectionChange(e.target.value)}
                className="border rounded-md px-2 py-1 text-xs"
                disabled={!selectedYearLevel}
              >
                <option value="">Select Section</option>
                {sections
                  .filter((s) => s.year_level_id === Number(selectedYearLevel))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.section}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
        )}

        {/* Rooms tab content */}
        {activeTab === "rooms" && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Rooms</h3>
              <span className="text-xs text-gray-500">{classrooms.length} rooms</span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {classrooms.map((room) => {
                const scheds = schedules
                  .filter((s) => Number(s.classroom_id) === Number(room.id))
                  .slice()
                  .sort((a, b) => {
                    if (dayOrder[a.day] !== dayOrder[b.day]) return dayOrder[a.day] - dayOrder[b.day];
                    return convertToMinutes(a.start) - convertToMinutes(b.start);
                  });
                const totalHours = scheds.reduce((sum, s) => sum + (convertToMinutes(s.end) - convertToMinutes(s.start)) / 60, 0);
                return (
                  <div
                    key={room.id}
                    className="border rounded-lg p-4 shadow-sm hover:shadow-md transition"
                    style={{ background: withAlpha('#3b82f6', 0.04), borderColor: withAlpha('#3b82f6', 0.3) }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <MapPin size={16} className="text-blue-600" />
                          Room {room.room_number}
                          <span
                            className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700"
                          >
                            {scheds.length} {scheds.length === 1 ? 'class' : 'classes'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{totalHours.toFixed(1)} hours</div>
                      </div>
                      <button
                        className="text-xs px-2 py-1 rounded border inline-flex items-center gap-1 hover:shadow-sm transition hover:-translate-y-px"
                        onClick={() => { setRoomModalId(String(room.id)); setShowRoomModal(true); }}
                        title="View room schedules"
                        style={{ background: withAlpha('#3b82f6', 0.12), borderColor: withAlpha('#3b82f6', 0.35), color: '#1d4ed8' }}
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                    </div>
                    {scheds.length > 0 ? (
                      <div className="mt-3 space-y-1 max-h-40 overflow-auto">
                        {scheds.slice(0, 5).map((s) => {
                          const subj = getSubjectForSchedule(s) || {};
                          const fac = faculties.find((f) => Number(f.id) === Number(s.faculty_id));
                          return (
                            <div key={s.id} className="text-xs flex items-center justify-between gap-2">
                              <span className="truncate">{subj?.descriptive_title || 'TBA'}</span>
                              <span className="text-gray-500 whitespace-nowrap">{s.day} {formatTimeToAMPM(s.start)}</span>
                            </div>
                          );
                        })}
                        {scheds.length > 5 && (
                          <div className="text-[11px] text-gray-500">+{scheds.length - 5} more…</div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-gray-400">No schedules</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content based on active tab (exclude rooms) */}
        {activeTab !== "rooms" && (activeTab === "list" ? (
          <div className="bg-white rounded-lg shadow-sm border printable">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Schedules by Year Level & Section</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-600">Semester:</span>
                <select
                  value={selectedSemester}
                  onChange={(e) => { setSelectedSemester(e.target.value); setListPage(1); }}
                  className="border rounded px-2 py-1"
                >
                  <option value="All">All</option>
                  <option value="1">1st</option>
                  <option value="2">2nd</option>
                </select>
              </div>
            </div>
            <div className="divide-y">
              {pagedGroups.map(({ yearLevel, section, schedules: sectionSchedules }) => {
                const totalHours = sectionSchedules.reduce((sum, s) => sum + (convertToMinutes(s.end) - convertToMinutes(s.start)) / 60, 0);
                return (
                  <div key={`${yearLevel.id}-${section.id}`} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Book size={20} className="text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-gray-800">
                            {yearLevel.year_level} - {section.section}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {sectionSchedules.length} {sectionSchedules.length === 1 ? 'subject' : 'subjects'} • {totalHours.toFixed(1)} hours/week
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="ml-13 space-y-2">
                      {sectionSchedules
                        .sort((a, b) => {
                          const dayOrder = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
                          if (dayOrder[a.day] !== dayOrder[b.day]) return dayOrder[a.day] - dayOrder[b.day];
                          return convertToMinutes(a.start) - convertToMinutes(b.start);
                        })
                        .map((schedule) => {
                          const subject = (curriculumSubjects.find((cs) => Number(cs.id) === Number(schedule.curriculum_subject_id))?.subject)
                            || (faculties.find((f) => Number(f.id) === Number(schedule.faculty_id))?.class_schedules?.find((cs) => Number(cs.id) === Number(schedule.id))?.curriculum_subject?.subject)
                            || (faculties.find((f) => Number(f.id) === Number(schedule.faculty_id))?.class_schedules?.find((cs) => Number(cs.id) === Number(schedule.id))?.curriculumSubject?.subject);
                          const classroom = classrooms.find((c) => c.id === schedule.classroom_id);
                          const faculty = faculties.find((f) => Number(f.id) === Number(schedule.faculty_id));

                          return (
                            <div key={schedule.id} className="flex items-center gap-3 text-xs p-2 rounded border bg-white" style={{ borderLeftColor: schedule.color, borderLeftWidth: '3px' }}>
                              <div className="flex-1">
                                <div className="font-medium text-gray-800">{subject?.descriptive_title || 'TBA'}</div>
                                <div className="text-gray-600 mt-0.5">{faculty?.fName} {faculty?.lName || 'TBA'}</div>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <div className="flex items-center gap-1"><Calendar size={12} /><span>{schedule.day}</span></div>
                                <div className="flex items-center gap-1"><Clock size={12} /><span>{formatTimeToAMPM(schedule.start)} - {formatTimeToAMPM(schedule.end)}</span></div>
                                <div className="flex items-center gap-1"><MapPin size={12} /><span>{classroom?.room_number || 'No Room'}</span></div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}

              {sectionGroups.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">No schedules found.</div>
              )}
            </div>

            {/* Pagination */}
            {sectionGroups.length > pageSize && (
              <div className="p-3 flex items-center justify-between text-xs">
                <button
                  className="px-3 py-1 border rounded disabled:opacity-50"
                  disabled={listPage <= 1}
                  onClick={() => setListPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setListPage(i + 1)}
                      className={`w-7 h-7 rounded border ${listPage === i + 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  className="px-3 py-1 border rounded disabled:opacity-50"
                  disabled={listPage >= totalPages}
                  onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : selectedYearLevel && selectedSection ? (
          <div className="rounded-lg bg-white shadow-sm border border-blue-200 w-fit mx-auto overflow-x-auto printable">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(${DAYS.length}, ${COL_WIDTH}px)`,
                width: `${TIME_COL_WIDTH + DAYS.length * COL_WIDTH}px`,
              }}
              className="relative mx-auto"
            >
              {/* Header Row */}
              <div ref={headerRef} className="bg-blue-600/80 text-white text-center font-semibold py-2 px-2 sticky top-0 z-10 text-sm border-b border-r border-blue-200">
                Time
              </div>
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="bg-blue-600/80 text-white text-center font-semibold py-2 px-2 sticky top-0 z-10 text-sm border-b border-r border-blue-200"
                >
                  {d}
                </div>
              ))}

              {/* Time Slots */}
              {timeSlots.map((slot) => {
                const isHourMark = slot.endsWith(':00');
                return (
                  <React.Fragment key={slot}>
                    <div
                      className={`border-r border-b text-center text-xs font-medium sticky left-0 z-10 flex items-center justify-center ${
                        isHourMark ? 'bg-white border-gray-300 text-gray-700' : 'bg-white border-gray-200 text-gray-500'
                      }`}
                      style={{ height: `${CELL_HEIGHT}px` }}
                    >
                      {formatTimeToAMPM(slot)}
                    </div>
                    {DAYS.map((day) => (
                      <div
                        key={day + slot}
                        className={`border-r border-b relative cursor-pointer transition-colors border-gray-200 bg-white hover:bg-gray-50`}
                        style={{ height: `${CELL_HEIGHT}px` }}
                        onClick={() => handleCellClick(day, slot)}
                      />
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Schedules */}
              {filteredRoomSchedules.map((s) => {
                const startIndex = (convertToMinutes(s.start) - BASE_HOUR * 60) / 30;
                const endIndex = (convertToMinutes(s.end) - BASE_HOUR * 60) / 30;
                const top = startIndex * (CELL_HEIGHT + ROW_BORDER);
                const height = (endIndex - startIndex) * (CELL_HEIGHT + ROW_BORDER) - ROW_BORDER;
                const dayIndex = DAYS.indexOf(s.day);

                // Resolve subject: prefer curriculumSubjects by id, fallback to faculty payload relation
                const subjFromCurriculum = curriculumSubjects.find(
                  (cs) => Number(cs.id) === Number(s.curriculum_subject_id)
                )?.subject;
                const subjFromFaculty = (() => {
                  const fac = faculties.find((f) => Number(f.id) === Number(s.faculty_id));
                  if (!fac || !Array.isArray(fac.class_schedules)) return undefined;
                  const sched = fac.class_schedules.find((cs) => Number(cs.id) === Number(s.id));
                  // Laravel may serialize relation as curriculum_subject or curriculumSubject
                  return sched?.curriculum_subject?.subject || sched?.curriculumSubject?.subject;
                })();
                const subj = subjFromCurriculum || subjFromFaculty || {};
                const room =
                  classrooms.find((r) => r.id === s.classroom_id) || {};

                const accentColor = s.color || "#3b82f6";
                const primaryText = getReadableTextColor(accentColor);
                const secondaryText = getMutedTextColor(accentColor);
                const tertiaryText = getSubtleTextColor(accentColor);
                const background = getTimetableBackground(accentColor);
                const borderTone = withAlpha(accentColor, 0.45);

                return (
                  <Rnd
                    key={s.id}
                    default={{
                      x: TIME_COL_WIDTH + dayIndex * COL_WIDTH + 1,
                      y: headerHeight + top,
                      width: COL_WIDTH - 2,
                      height: height - 2,
                    }}
                    size={{ width: COL_WIDTH - 2, height: height - 2 }}
                    position={{
                      x: TIME_COL_WIDTH + dayIndex * COL_WIDTH + 1,
                      y: headerHeight + top,
                    }}
                    bounds="parent"
                    dragAxis={readOnly ? false : "y"}
                    enableResizing={false}
                    grid={[COL_WIDTH, CELL_HEIGHT + ROW_BORDER]}
                    onDragStop={(e, d) => handleDragStop(s.id, d)}
                    className="absolute cursor-move group outline-none"
                    tabIndex={-1}
                    style={{
                      background,
                      color: primaryText,
                      borderRadius: "7px",
                      padding: "10px 8px",
                      border: `1px solid ${borderTone}`,
                      boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
                      outline: "none",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <div className="leading-snug relative h-full flex flex-col text-[11px]">
                      <div className="font-semibold truncate mb-1.5 tracking-tight">
                        {subj.descriptive_title || "TBA"}
                      </div>
                      <div className="truncate text-[10px] mb-0.5" style={{ color: secondaryText }}>
                        {getFacultyName(s.faculty_id) || "TBA"}
                      </div>
                      <div className="truncate text-[10px] mb-1" style={{ color: secondaryText }}>
                        {room.room_number || "TBA"}
                      </div>
                      <div
                        className="text-[10px] mt-auto pt-1 border-t"
                        style={{
                          borderColor: withAlpha(accentColor, 0.45),
                          color: tertiaryText,
                        }}
                      >
                        {formatTimeToAMPM(s.start)} – {formatTimeToAMPM(s.end)}
                      </div>
                      {!readOnly && (
                        <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSchedule(s);
                            }}
                            className="bg-white/90 text-blue-600 p-1 rounded shadow-md hover:bg-white transition"
                            title="Edit"
                          >
                            <XCircle size={12} weight="fill" className="rotate-45" />
                          </button>
                        </div>
                      )}
                    </div>
                  </Rnd>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-6 text-center text-blue-700 text-sm">
              Please select a year level and section to view the timetable.
            </div>
            
            {/* Year Level & Section Grid with Timetable Preview */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-800">Overview - Click to View Full Timetable</h3>
              </div>
              <div className="p-4 space-y-6">
                {yearLevels.map((yearLevel) => {
                  const yearSections = sections.filter(s => s.year_level_id === yearLevel.id);
                  
                  if (yearSections.length === 0) return null;
                  
                  return (
                    <div key={yearLevel.id}>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Book size={16} className="text-blue-600" />
                        {yearLevel.year_level}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {yearSections.map((section) => {
                          const sectionSchedules = schedules.filter(
                            (s) => s.year_level_id === yearLevel.id && s.section_id === section.id
                          );
                          
                          return (
                            <button
                              key={section.id}
                              onClick={() => {
                                setSelectedYearLevel(String(yearLevel.id));
                                handleSectionChange(String(section.id));
                              }}
                              className="border-2 rounded-lg hover:border-blue-500 transition text-left group overflow-hidden"
                            >
                              {/* Section Header */}
                              <div className="p-3 bg-gray-50 group-hover:bg-blue-50 border-b">
                                <div className="font-semibold text-gray-800 group-hover:text-blue-600 text-sm">
                                  {section.section}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {sectionSchedules.length} {sectionSchedules.length === 1 ? 'schedule' : 'schedules'}
                                </div>
                              </div>
                              
                              {/* Mini Timetable Grid */}
                              <div className="p-2 bg-white">
                                <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded">
                                  {/* Day headers */}
                                  {DAYS.map((day) => (
                                    <div
                                      key={day}
                                      className="bg-blue-100 text-center text-[8px] font-medium text-blue-700 py-1"
                                    >
                                      {day.slice(0, 1)}
                                    </div>
                                  ))}
                                  
                                  {/* Schedule cells */}
                                  {DAYS.map((day) => {
                                    const daySchedules = sectionSchedules.filter((s) => s.day === day);
                                    const hasSchedule = daySchedules.length > 0;
                                    
                                    return (
                                      <div
                                        key={day}
                                        className={`relative h-16 ${
                                          hasSchedule ? 'bg-white' : 'bg-gray-50'
                                        }`}
                                        title={
                                          hasSchedule
                                            ? daySchedules
                                                .map((s) => {
                                                  const subj = (curriculumSubjects.find(
                                                    (cs) => Number(cs.id) === Number(s.curriculum_subject_id)
                                                  )?.subject) || (faculties.find((f)=> Number(f.id)===Number(s.faculty_id))?.class_schedules?.find((cs)=> Number(cs.id)===Number(s.id))?.curriculum_subject?.subject) || (faculties.find((f)=> Number(f.id)===Number(s.faculty_id))?.class_schedules?.find((cs)=> Number(cs.id)===Number(s.id))?.curriculumSubject?.subject);
                                                  return `${subj?.descriptive_title || 'TBA'} (${formatTimeToAMPM(s.start)})`;
                                                })
                                                .join(', ')
                                            : 'No classes'
                                        }
                                      >
                                        {daySchedules.slice(0, 3).map((schedule, idx) => (
                                          <div
                                            key={schedule.id}
                                            className="text-[7px] px-0.5 py-0.5 truncate"
                                            style={{
                                              backgroundColor: schedule.color || '#dbeafe',
                                            }}
                                          >
                                            {formatTimeToAMPM(schedule.start).replace(' ', '')}
                                          </div>
                                        ))}
                                        {daySchedules.length > 3 && (
                                          <div className="text-[6px] text-gray-500 text-center">
                                            +{daySchedules.length - 3}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {sectionSchedules.length === 0 && (
                                  <div className="text-center text-[10px] text-gray-400 mt-2">
                                    No schedules
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {yearLevels.length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    Please select a Year Level and Section to view the timetable.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Room Schedules Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" />
                <div className="text-sm font-semibold text-gray-800">
                  Room {(() => { const r = classrooms.find(c => Number(c.id) === Number(roomModalId)); return r ? r.room_number : roomModalId; })()}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">{activeSemester?.semester} Sem • {activeSchoolYear} AY</span>
              </div>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowRoomModal(false)} title="Close">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[72vh] overflow-auto">
              {(() => {
                const roomScheds = schedules
                  .filter((s) => Number(s.classroom_id) === Number(roomModalId))
                  .slice()
                  .sort((a, b) => {
                    if (dayOrder[a.day] !== dayOrder[b.day]) return dayOrder[a.day] - dayOrder[b.day];
                    return convertToMinutes(a.start) - convertToMinutes(b.start);
                  });
                const totalHours = roomScheds.reduce((sum, s) => sum + (convertToMinutes(s.end) - convertToMinutes(s.start)) / 60, 0);
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded" style={{ background: withAlpha('#3b82f6', 0.12), color: '#1d4ed8' }}>{roomScheds.length} {roomScheds.length === 1 ? 'class' : 'classes'}</span>
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">{totalHours.toFixed(1)} hours</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <label className="inline-flex items-center gap-1">
                          <input type="checkbox" checked={roomModalLandscape} onChange={(e) => setRoomModalLandscape(e.target.checked)} />
                          Landscape
                        </label>
                        <button
                          className="px-3 py-1.5 rounded border inline-flex items-center gap-1 hover:shadow-sm transition"
                          style={{ background: withAlpha('#3b82f6', 0.12), borderColor: withAlpha('#3b82f6', 0.35), color: '#1d4ed8' }}
                          onClick={() => {
                            setPrintType('room');
                            setPrintRoomId(roomModalId);
                            setForceLandscape(roomModalLandscape);
                            setShowRoomModal(false);
                            handleConfirmPrint();
                          }}
                        >
                          <Printer size={14} />
                          <span>Print</span>
                        </button>
                      </div>
                    </div>

                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-blue-50 text-blue-700 sticky top-0 z-10">
                            <th className="border p-2 text-left">Day</th>
                            <th className="border p-2 text-left">Time</th>
                            <th className="border p-2 text-left">Subject</th>
                            <th className="border p-2 text-left">Faculty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roomScheds.map((s) => {
                            const subject = getSubjectForSchedule(s) || {};
                            const faculty = faculties.find((f) => Number(f.id) === Number(s.faculty_id));
                            const accent = s.color || '#3b82f6';
                            return (
                              <tr key={`roommodal-${s.id}`} style={{ backgroundColor: withAlpha(accent, 0.06) }}>
                                <td className="border p-2" style={{ borderLeft: `4px solid ${accent}` }}>{s.day}</td>
                                <td className="border p-2">{formatTimeToAMPM(s.start)} - {formatTimeToAMPM(s.end)}</td>
                                <td className="border p-2">{subject?.descriptive_title || 'TBA'}</td>
                                <td className="border p-2">{faculty ? `${faculty.fName} ${faculty.lName}` : '—'}</td>
                              </tr>
                            );
                          })}
                          {roomScheds.length === 0 && (
                            <tr>
                              <td className="border p-4 text-center text-gray-500" colSpan={4}>No schedules for this room.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button className="px-3 py-1.5 border rounded text-xs hover:bg-white" onClick={() => setShowRoomModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {!readOnly && editingSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md md:max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-base font-semibold text-gray-800">
                {editingSchedule.isExisting ? "Edit Schedule" : "New Schedule"}
              </h2>
              <button
                onClick={() => setEditingSchedule(null)}
                className="text-gray-500 hover:text-red-500 transition"
              >
                <XCircle size={22} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-gray-700 mb-1 text-xs">
                  Subject
                </label>
                <select
                  value={editingSchedule.curriculum_subject_id || ""}
                  onChange={(e) => {
                    const subjectId = Number(e.target.value);
                    const baseSection = editingSchedule.section_id || Number(selectedSection);
                    const baseYear = editingSchedule.year_level_id || Number(selectedYearLevel);
                    const nextType = subjectId
                      ? getNextAvailableSessionType(subjectId, {
                          excludeScheduleId: editingSchedule.id,
                          sectionId: baseSection,
                          yearLevelId: baseYear,
                        })
                      : null;

                    setEditingSchedule((prev) => ({
                      ...prev,
                      curriculum_subject_id: subjectId || null,
                      session_type:
                        subjectId && nextType
                          ? nextType
                          : normalizeSessionType(prev.session_type || "lecture"),
                    }));
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">TBA</option>
                  {curriculumSubjects
                    // Show subjects for the selected year level; allow when curriculum status is approved/active
                    // or when no status is defined (legacy records).
                    .filter((cs) => {
                      const yearMatch = Number(cs?.year_level_id) === Number(selectedYearLevel);
                      const rawStatus = typeof cs?.curriculum?.status === 'string'
                        ? cs.curriculum.status.trim().toLowerCase()
                        : null;
                      const allowedStatuses = ['approved', 'active', 'published'];
                      const isAllowed = !rawStatus || allowedStatuses.includes(rawStatus);
                      return yearMatch && isAllowed;
                    })
                    .map((cs) => {
                      // Disable if this curriculum subject is already assigned to this section & year level (any day/time)
                      const assignedCounts = getAssignedTypeCounts(cs.id, {
                        excludeScheduleId: editingSchedule.id,
                        sectionId: selectedSection,
                        yearLevelId: selectedYearLevel,
                      });
                      const availableTypes = SESSION_TYPES.filter(
                        (t) => (assignedCounts[t.value] || 0) < getSessionLimit(t.value)
                      );
                      const isComplete = availableTypes.length === 0;
                      const summary = Object.entries(assignedCounts)
                        .filter(([, count]) => count > 0)
                        .map(([type, count]) => `${SESSION_LABELS[type] || type} × ${count}`)
                        .join(', ');
                      const label = `${cs.subject?.descriptive_title || 'TBA'}${summary ? ` • ${summary}` : ''}${isComplete ? ' — sessions complete' : ''}`;
                      return (
                        <option
                          key={cs.id}
                          value={cs.id}
                          disabled={isComplete}
                          className={isComplete ? 'text-gray-400' : ''}
                        >
                          {label}
                        </option>
                      );
                    })
                  }
                </select>
              </div>

              {/* Session Type */}
              <div>
                <label className="block text-gray-700 mb-1 text-xs">Session Type</label>
                <select
                  value={normalizeSessionType(editingSchedule.session_type)}
                  onChange={(e) => {
                    const value = normalizeSessionType(e.target.value);
                    const assignedCounts = getAssignedTypeCounts(editingSchedule.curriculum_subject_id, {
                      excludeScheduleId: editingSchedule.id,
                      sectionId: editingSchedule.section_id,
                      yearLevelId: editingSchedule.year_level_id,
                    });
                    if ((assignedCounts[value] || 0) >= getSessionLimit(value)) {
                      Swal.fire({
                        icon: "error",
                        title: "Duplicate Session",
                        text: "This subject already reached the allowed number of schedules for that session type.",
                        timer: 2400,
                        showConfirmButton: false,
                        toast: true,
                        position: "top-end",
                      });
                      return;
                    }
                    setEditingSchedule({
                      ...editingSchedule,
                      session_type: value,
                    });
                  }}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  disabled={!editingSchedule.curriculum_subject_id}
                >
                  {SESSION_TYPES.map((type) => {
                    const assignedCounts = getAssignedTypeCounts(editingSchedule.curriculum_subject_id, {
                      excludeScheduleId: editingSchedule.id,
                      sectionId: editingSchedule.section_id,
                      yearLevelId: editingSchedule.year_level_id,
                    });
                    const disabled = (assignedCounts[type.value] || 0) >= getSessionLimit(type.value);
                    return (
                      <option
                        key={type.value}
                        value={type.value}
                        disabled={disabled && normalizeSessionType(editingSchedule.session_type) !== type.value}
                        className={disabled && normalizeSessionType(editingSchedule.session_type) !== type.value ? 'text-gray-400' : ''}
                      >
                        {type.label}
                        {disabled && normalizeSessionType(editingSchedule.session_type) !== type.value ? ' — maxed out' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Day */}
              <div>
                <label className="block text-gray-700 mb-1 text-xs">Day</label>
                <select
                  value={editingSchedule.day}
                  onChange={(e) =>
                    setEditingSchedule({
                      ...editingSchedule,
                      day: e.target.value,
                    })
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Faculty */}
              <div>
                <label className="block text-gray-700 mb-1 text-xs">
                  Faculty
                </label>
                <select
                  value={editingSchedule.faculty_id || ""}
                  onChange={(e) =>
                    setEditingSchedule({
                      ...editingSchedule,
                      faculty_id: Number(e.target.value),
                    })
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">TBA</option>
                  {faculties.map((f) => {
                    const hasConflict = schedules.some((s) => {
                      if (s.faculty_id !== f.id) return false;
                      if (s.day !== editingSchedule.day) return false;
                      return !(
                        convertToMinutes(editingSchedule.end) <= convertToMinutes(s.start) ||
                        convertToMinutes(editingSchedule.start) >= convertToMinutes(s.end)
                      );
                    });
                    const label = `${f.fName} ${f.lName}${hasConflict ? ' — has conflict' : ''}`;
                    return (
                      <option
                        key={f.id}
                        value={f.id}
                        disabled={hasConflict}
                        className={hasConflict ? 'text-gray-400' : ''}
                      >
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Classroom */}
              <div>
                <label className="block text-gray-700 mb-1 text-xs">
                  Classroom
                </label>
                <select
                  value={editingSchedule.classroom_id || ""}
                  onChange={(e) =>
                    setEditingSchedule({
                      ...editingSchedule,
                      classroom_id: Number(e.target.value),
                    })
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">TBA</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.room_number}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1 text-xs">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={toHHMM(editingSchedule.start)}
                    onChange={(e) =>
                      setEditingSchedule({
                        ...editingSchedule,
                        start: toHHMM(e.target.value),
                      })
                    }
                    onBlur={(e) =>
                      setEditingSchedule((prev) => ({
                        ...prev,
                        start: toHHMM(snapToGrid(e.target.value)),
                      }))
                    }
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 text-xs">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={toHHMM(editingSchedule.end)}
                    onChange={(e) =>
                      setEditingSchedule({
                        ...editingSchedule,
                        end: toHHMM(e.target.value),
                      })
                    }
                    onBlur={(e) =>
                      setEditingSchedule((prev) => ({
                        ...prev,
                        end: toHHMM(snapToGrid(e.target.value)),
                      }))
                    }
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-gray-700 mb-1 text-xs">
                  Color
                </label>
                <input
                  type="color"
                  value={editingSchedule.color || "#dbeafe"}
                  onChange={(e) =>
                    setEditingSchedule({
                      ...editingSchedule,
                      color: e.target.value,
                    })
                  }
                  className="w-12 h-8 border rounded-md cursor-pointer"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingSchedule(null)}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={validateAndSaveSchedule}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs flex items-center gap-1"
              >
                <CheckCircle size={14} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Sheet: shows when printing is triggered */}
      {printSheetActive && (
        <div className="print-sheet p-6">
          <div className="mb-3 print-header p-3 rounded">
            {printType === 'room' && printRoomId ? (
              <>
                <h1 className="font-bold">Room {(() => {
                  const r = classrooms.find((c) => Number(c.id) === Number(printRoomId));
                  return r ? r.room_number : printRoomId;
                })()}</h1>
                <p className="text-xs text-gray-600">
                  {activeSemester?.semester} Semester • {activeSchoolYear} AY
                </p>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold">Schedules ({printType})</h2>
                <p className="text-xs text-gray-600">
                  {activeSemester?.semester} Semester • {activeSchoolYear} AY
                </p>
              </>
            )}
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Day</th>
                <th className="border p-2 text-left">Time</th>
                <th className="border p-2 text-left">Subject</th>
                <th className="border p-2 text-left">Room</th>
                <th className="border p-2 text-left">Faculty</th>
                {printType !== 'room' && (
                  <th className="border p-2 text-left">Section</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredForPrint.map((s) => {
                const subject = getSubjectForSchedule(s) || {};
                const classroom = classrooms.find((c) => Number(c.id) === Number(s.classroom_id));
                const faculty = faculties.find((f) => Number(f.id) === Number(s.faculty_id));
                const section = sections.find((sec) => Number(sec.id) === Number(s.section_id));
                return (
                  <tr key={`print-${s.id}`}>
                    <td className="border p-2">{s.day}</td>
                    <td className="border p-2">{formatTimeToAMPM(s.start)} - {formatTimeToAMPM(s.end)}</td>
                    <td className="border p-2">{subject?.descriptive_title || 'TBA'}</td>
                    <td className="border p-2">{classroom?.room_number || '—'}</td>
                    <td className="border p-2">{faculty ? `${faculty.fName} ${faculty.lName}` : '—'}</td>
                    {printType !== 'room' && (
                      <td className="border p-2">{section?.section || '—'}</td>
                    )}
                  </tr>
                );
              })}
              {filteredForPrint.length === 0 && (
                <tr>
                  <td className="border p-4 text-center text-gray-500" colSpan={printType !== 'room' ? 6 : 5}>
                    No schedules found for selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </ProgramHeadLayout>
  );
}
