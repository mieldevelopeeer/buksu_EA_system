import React, { useEffect, useMemo, useState } from "react";
import FacultyLayout from "@/Layouts/FacultyLayout";
import { Head, usePage, router } from "@inertiajs/react";
import { Calendar, Clock, Book, Table, ArrowRight } from "phosphor-react";

// Utility functions
const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const normalizeDay = (rawDay) => {
  if (!rawDay) return null;
  const trimmed = String(rawDay).trim();
  if (!trimmed) return null;
  const shortMatch = dayOrder.find((day) => day.toLowerCase() === trimmed.toLowerCase());
  if (shortMatch) return shortMatch;
  const needle = trimmed.slice(0, 3).toLowerCase();
  return dayOrder.find((day) => day.toLowerCase().startsWith(needle)) || trimmed;
};

const getInitials = (label = "") => {
  if (!label) return "?";
  const parts = String(label).trim().split(" ");
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Utility functions
const to12HourRange = (start, end) => {
  if (!start && !end) return "TBA";
  const format = (time) => {
    if (!time) return "";
    const [h, m] = String(time).split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return "";
    const period = h >= 12 ? "PM" : "AM";
    const hour = ((h + 11) % 12) + 1;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
  };
  const startTime = format(start);
  const endTime = format(end);
  return startTime && endTime ? `${startTime} – ${endTime}` : startTime || endTime || "TBA";
};

const resolveSubjectTitle = (sched) => {
  if (typeof sched === 'string') return sched;
  
  return (
    sched.subject ||
    sched.curriculum_subject?.subject?.descriptive_title ||
    sched.curriculum_subject?.subject?.title ||
    sched.curriculum_subject?.subject?.name ||
    sched.curriculum_subject?.subject_title ||
    sched.subject_title ||
    sched.subject?.descriptive_title ||
    sched.subject?.title ||
    "Subject"
  );
};

const resolveRoomLabel = (sched) => {
  if (!sched) return "Room TBA";
  return sched.classroom?.room_number || sched.room || sched.location || "Room TBA";
};

const buildCourseFallback = (sched) => {
  if (!sched) return null;
  return (
    sched.courseName ||
    sched.course_name ||
    sched.curriculum_subject?.course?.code ||
    sched.curriculum_subject?.course?.course_code ||
    sched.curriculum_subject?.course?.abbr ||
    sched.curriculum_subject?.course?.short_name ||
    sched.curriculum_subject?.course?.name ||
    sched.course?.name ||
    sched.course?.code
  );
};

const buildMajorFallback = (sched) => {
  if (!sched) return null;
  return (
    sched.majorName ||
    sched.major_name ||
    sched.curriculum_subject?.curricula?.major?.code ||
    sched.curriculum_subject?.curricula?.major?.abbr ||
    sched.curriculum_subject?.curricula?.major?.short_name ||
    sched.curriculum_subject?.curricula?.major?.name ||
    sched.major?.name ||
    sched.major?.code
  );
};

// Main component
export default function Classes({ user }) {
  const { schedules = [], sections = [], sectionSummaries = [], activeSemester = null, semesters = [], schoolYears = [] } = usePage().props;
  const [activeTab, setActiveTab] = useState("classes");
  const [selectedSemester, setSelectedSemester] = useState(activeSemester?.id || 'all');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState(activeSemester?.school_year_id || 'all');

  // Filter schedules and sections based on selected semester/school year
  const filteredSchedules = useMemo(() => {
    return schedules.filter(sched => {
      const matchSemester = selectedSemester === 'all' || sched.semester_id === selectedSemester;
      const matchSchoolYear = selectedSchoolYear === 'all' || sched.school_year_id === selectedSchoolYear;
      return matchSemester && matchSchoolYear;
    });
  }, [schedules, selectedSemester, selectedSchoolYear]);

  const filteredSectionSummaries = useMemo(() => {
    return sectionSummaries.map(section => ({
      ...section,
      schedules: section.schedules.filter(sched => {
        // Filter schedules within each section
        const fullSched = schedules.find(s => s.id === sched.id);
        if (!fullSched) return true; // Keep if we can't find it
        const matchSemester = selectedSemester === 'all' || fullSched.semester_id === selectedSemester;
        const matchSchoolYear = selectedSchoolYear === 'all' || fullSched.school_year_id === selectedSchoolYear;
        return matchSemester && matchSchoolYear;
      })
    })).filter(section => section.schedules.length > 0); // Only show sections with schedules
  }, [sectionSummaries, schedules, selectedSemester, selectedSchoolYear]);

  // Handle semester/school year change - reload data from backend
  const handleFilterChange = (semesterId, schoolYearId) => {
    setSelectedSemester(semesterId);
    setSelectedSchoolYear(schoolYearId);
    // Reload the page with filters to get fresh data from backend
    router.get(route('faculty.classes'), {
      semester_id: semesterId === 'all' ? null : semesterId,
      school_year_id: schoolYearId === 'all' ? null : schoolYearId
    }, {
      preserveState: true,
      preserveScroll: true
    });
  };

  // Debug logging
  useEffect(() => {
    console.log("[Classes] sections", sections);
    console.log("[Classes] sectionSummaries", sectionSummaries);
    console.log("[Classes] schedules", schedules);
    console.log("[Classes] activeSemester", activeSemester);
  }, [sections, sectionSummaries, schedules, activeSemester]);

  // UI constants
  const cardPalettes = [
    {
      accent: "#2563eb",
      accentSoft: "#93c5fd",
      badgeClass: "bg-sky-100 text-sky-600",
      iconClass: "text-sky-500",
    },
    {
      accent: "#1d4ed8",
      accentSoft: "#a5b4fc",
      badgeClass: "bg-indigo-100 text-indigo-600",
      iconClass: "text-indigo-500",
    },
    {
      accent: "#0ea5e9",
      accentSoft: "#7dd3fc",
      badgeClass: "bg-sky-50 text-sky-500",
      iconClass: "text-sky-400",
    },
  ];

  const eventPalettes = [
    "bg-sky-100 text-sky-700 border-sky-200",
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-indigo-100 text-indigo-700 border-indigo-200",
    "bg-cyan-100 text-cyan-700 border-cyan-200",
  ];

  const timetableCategories = [
    { label: "Lecture", color: "bg-sky-400" },
    { label: "Laboratory", color: "bg-emerald-400" },
    { label: "Consultation", color: "bg-amber-400" },
    { label: "Others", color: "bg-violet-400" },
  ];

  const extractSchoolYear = (sched) => {
    const candidates = [
      sched.school_year?.school_year,
      sched.school_year?.name,
      sched.school_year,
      sched.schoolYear?.school_year,
      sched.schoolYear?.name,
      sched.schoolYear,
    ];

    const value = candidates.find(
      (entry) => typeof entry === "string" && entry.trim().length > 0
    );

    return value ? value.trim() : null;
  };

  const extractSemester = (sched) => {
    const candidates = [
      sched.semester?.semester,
      sched.semester?.name,
      sched.semester,
    ];

    const value = candidates.find(
      (entry) => typeof entry === "string" && entry.trim().length > 0
    );

    return value ? value.trim() : null;
  };

  const resolveSectionLabel = (section, fallbackCourseCode, fallbackMajorCode) => {
    const fallbackCourse =
      typeof fallbackCourseCode === "string"
        ? fallbackCourseCode.trim()
        : undefined;
    const fallbackMajor =
      typeof fallbackMajorCode === "string"
        ? fallbackMajorCode.trim()
        : undefined;

    if (!section) {
      if (fallbackCourse || fallbackMajor) {
        const formattedCourse =
          typeof fallbackCourse === "string"
            ? fallbackCourse.toUpperCase()
            : fallbackCourse;
        const formattedMajor =
          typeof fallbackMajor === "string"
            ? fallbackMajor.toUpperCase()
            : fallbackMajor;
        const courseWithMajor = formattedMajor
          ? `${formattedCourse} ${formattedMajor}`.trim()
          : formattedCourse;
        if (courseWithMajor) {
          return courseWithMajor;
        }
      }
      return "No Section";
    }

    const programCode =
      fallbackCourse ||
      section.course?.code ||
      section.course?.course_code ||
      section.program?.code ||
      section.program?.abbr ||
      section.program?.short_name ||
      section.program?.name ||
      section.course?.name;
    const majorCode =
      fallbackMajor ||
      section.major?.code ||
      section.major?.abbr ||
      section.major?.short_name ||
      section.major?.name;
    const sectionName = section.section || section.name;
    const formattedCourse =
      typeof programCode === "string" ? programCode.toUpperCase() : programCode;
    const formattedMajor =
      typeof majorCode === "string" ? majorCode.toUpperCase() : majorCode;
    const primaryLabel = [formattedCourse, formattedMajor]
      .filter(Boolean)
      .join(" ");
    const parts = [primaryLabel || formattedCourse, sectionName].filter(Boolean);
    return parts.length > 0 ? parts.join(" - ") : "No Section";
  };

  // Group schedules by section (prefer hydrated sections, then summaries, fallback to raw schedules)
  const groupedSchedules = useMemo(() => {
    try {
      if (Array.isArray(sections) && sections.length > 0) {
        return sections.map((section) => {
          console.log('Processing section:', section.id, section.section);
          console.log('Section class_schedules:', section.class_schedules);
          
          const scheduleItems = (section.class_schedules || []).map((sched) => {
            const normalizedDay = normalizeDay(sched.schedule_day) ?? dayOrder[0];
            const startMinutes = (() => {
              const [h, m] = (sched.start_time || "0:0").split(":").map(Number);
              return h * 60 + m;
            })();
            
            // Get subject details with proper fallbacks
            const subject = sched.curriculumSubject?.subject || sched.subject || {};
            const subjectTitle = subject?.descriptive_title || 
                              subject?.title || 
                              sched.curriculumSubject?.subject_title || 
                              'Subject';
            const subjectCode = subject?.subject_code || 
                             sched.curriculumSubject?.code || 
                             sched.code ||
                             '';
            
            console.log('Schedule item:', {
              id: sched.id,
              subject,
              curriculumSubject: sched.curriculumSubject,
              title: subjectTitle,
              code: subjectCode,
              room: sched.classroom?.room_number || sched.room || 'TBA'
            });
            
            return {
              id: sched.id,
              day: normalizedDay,
              startMinutes,
              time: to12HourRange(sched.start_time, sched.end_time),
              start_time: sched.start_time,
              end_time: sched.end_time,
              subject: subjectTitle,
              code: subjectCode,
              room: sched.classroom?.room_number || sched.room || 'TBA',
              classroom: sched.classroom,
              curriculum_subject_id: sched.curriculum_subject_id,
              subject_id: subject?.id
            };
          });

          // Sort schedule items by day and time
          scheduleItems.sort((a, b) => {
            const dayA = dayOrder.indexOf(a.day);
            const dayB = dayOrder.indexOf(b.day);
            if (dayA !== dayB) return dayA - dayB;
            return (a.startMinutes ?? 0) - (b.startMinutes ?? 0);
          });

          // Count unique subjects based on curriculum_subject_id or subject_id
          const subjectCount = new Set(
            section.class_schedules
              .map(s => s.curriculum_subject_id || s.subject?.id || s.id)
              .filter(Boolean)
          ).size;

          // Build section label
          const labelParts = [
            section.course_alias || section.courseName || section.course?.name,
            section.major_alias || section.majorName || section.major?.name,
            section.section
          ].filter(Boolean);
          
          const fallbackLabel = section.section || section.sectionName || section.name || "Section";
          const label = labelParts.length > 0 ? labelParts.join(" • ") : fallbackLabel;
          
          console.log(`Section ${section.id} (${section.section}):`, {
            subjectCount,
            totalSchedules: scheduleItems.length,
            scheduleItems
          });

          return {
            id: section.id ?? fallbackLabel,
            label,
            schoolYear: section.schoolYear || section.school_year || null,
            semester: section.semester || null,
            courseName: section.courseName || section.course_alias || section.course?.name,
            majorName: section.majorName || section.major_alias || section.major?.name,
            sectionName: section.section || section.sectionName || section.name,
            subjectCount,
            schedules: scheduleItems,
          };
      });
    }

    // Fallback to sectionSummaries if no sections with class_schedules
    if (Array.isArray(sectionSummaries) && sectionSummaries.length > 0) {
      console.log('Using sectionSummaries as fallback');
      return sectionSummaries.map((section) => {
        const subjectKeySet = new Set();
        const schedulesList = (section.schedules || []).map((sched) => {
          const normalizedDay = normalizeDay(sched.day) ?? normalizeDay(sched.schedule_day) ?? dayOrder[0];
          const startMinutes = (() => {
            const [h, m] = (sched.start_time || "0:0").split(":").map(Number);
            return h * 60 + m;
          })();
          
          // Use subject code as key if available, otherwise use a combination of subject and time
          const subjectKey = sched.code || sched.id || `${sched.subject}-${sched.start_time}-${sched.end_time}`;
          if (subjectKey) {
            subjectKeySet.add(subjectKey.toString());
          }
          
          console.log('Section summary schedule:', {
            id: sched.id,
            subject: sched.subject,
            code: sched.code,
            room: sched.room,
            day: normalizedDay,
            time: sched.time || to12HourRange(sched.start_time, sched.end_time)
          });
          
          return {
            id: sched.id,
            day: normalizedDay,
            startMinutes,
            start_time: sched.start_time,
            end_time: sched.end_time,
            time: sched.time || to12HourRange(sched.start_time, sched.end_time),
            subject: sched.subject || 'Subject',
            code: sched.code || '',
            room: sched.room || 'Room TBA',
            subjectKey
          };
        });

        // Sort the schedules
        schedulesList.sort((a, b) => {
          const dayA = dayOrder.indexOf(a.day);
          const dayB = dayOrder.indexOf(b.day);
          if (dayA !== dayB) return dayA - dayB;
          return (a.startMinutes ?? 0) - (b.startMinutes ?? 0);
        });

        // Build section label
        const fallbackLabel = section.sectionName || section.section || "Section";
        const labelParts = [
          section.courseName || section.course?.name,
          section.majorName || section.major?.name,
          section.sectionName || section.section
        ].filter(Boolean);
        
        const label = labelParts.length > 0 ? labelParts.join(" • ") : fallbackLabel;
        
        console.log(`Section Summary ${section.id}:`, {
          label,
          subjectCount: subjectKeySet.size,
          totalSchedules: schedulesList.length,
          schedules: schedulesList
        });

        return {
          id: section.id ?? fallbackLabel,
          label,
          schoolYear: section.schoolYear,
          semester: section.semester,
          courseName: section.courseName || section.course?.name,
          majorName: section.majorName || section.major?.name,
          sectionName: section.sectionName || section.section,
          subjectCount: subjectKeySet.size || schedulesList.length,
          schedules: schedulesList,
        };
      });
    }

    const sectionsMap = {};

    (schedules || []).forEach((sched) => {
      const sectionObj = sched.section;
      const normalizedDay = normalizeDay(sched.schedule_day) ?? dayOrder[0];
      const courseFallback = buildCourseFallback(sched);
      const majorFallback = buildMajorFallback(sched);
      const label = resolveSectionLabel(sectionObj, courseFallback, majorFallback);
      const sectionKey = sectionObj?.id ?? label ?? "No Section";
      const courseName =
        sectionObj?.course?.name ||
        sectionObj?.course?.code ||
        courseFallback ||
        "Course";
      const majorName =
        sectionObj?.major?.name ||
        sectionObj?.major?.code ||
        majorFallback ||
        null;
      const sectionName = sectionObj?.section || sectionObj?.name || label;

      if (!sections[sectionKey]) {
        sections[sectionKey] = {
          id: sectionKey,
          label,
          schedules: [],
          schoolYear: null,
          semester: null,
          courseName,
          majorName,
          sectionName,
          subjectKeys: new Set(),
        };
      }

      const schoolYear = extractSchoolYear(sched);
      const semester = extractSemester(sched);

      if (schoolYear && !sections[sectionKey].schoolYear) {
        sections[sectionKey].schoolYear = schoolYear;
      }

      if (semester && !sections[sectionKey].semester) {
        sections[sectionKey].semester = semester;
      }

      const subjectKeyCandidates = [
        sched.curriculum_subject?.id,
        sched.curriculum_subject_id,
        sched.subject?.id,
        sched.subject_id,
        resolveSubjectTitle(sched),
      ];
      const subjectKey = subjectKeyCandidates.find((key) => {
        if (key === null || key === undefined) return false;
        const asString = key.toString().trim();
        return asString.length > 0;
      });
      if (subjectKey) {
        sections[sectionKey].subjectKeys.add(subjectKey.toString());
      }

      sections[sectionKey].schedules.push({
        day: normalizedDay,
        startMinutes: (() => {
          const [h, m] = (sched.start_time || "0:0").split(":").map(Number);
          return h * 60 + m;
        })(),
        time: to12HourRange(sched.start_time, sched.end_time),
        subject: resolveSubjectTitle(sched),
        room: resolveRoomLabel(sched),
      });
    });

    return Object.values(sectionsMap).map((sectionEntry) => ({
      id: sectionEntry.id,
      label: sectionEntry.label,
      schoolYear: sectionEntry.schoolYear,
      semester: sectionEntry.semester,
      courseName: sectionEntry.courseName,
      majorName: sectionEntry.majorName,
      sectionName: sectionEntry.sectionName,
      subjectCount: sectionEntry.subjectKeys?.size || sectionEntry.schedules?.length || 0,
      schedules: (sectionEntry.schedules || []).sort((a, b) => {
        const dayA = dayOrder.indexOf(a.day);
        const dayB = dayOrder.indexOf(b.day);
        if (dayA !== dayB) return dayA - dayB;
        return (a.startMinutes ?? 0) - (b.startMinutes ?? 0);
      }),
    }));
    } catch (error) {
      console.error('Error processing schedules:', error);
      return [];
    }
  }, [sections, sectionSummaries, schedules]);

  // Timetable by day (use filtered schedules)
  const timetable = useMemo(() => {
    const data = {};
    dayOrder.forEach((day) => (data[day] = []));

    filteredSchedules.forEach((sched) => {
      const normalizedDay = normalizeDay(sched.schedule_day);
      if (!normalizedDay || !data[normalizedDay]) {
        return;
      }
      const startMinutes = (() => {
        const [h, m] = (sched.start_time || "0:0").split(":").map(Number);
        return h * 60 + m;
      })();
      const endMinutes = (() => {
        const [h, m] = (sched.end_time || "0:0").split(":").map(Number);
        return h * 60 + m;
      })();
      const courseFallback = buildCourseFallback(sched);
      const majorFallback = buildMajorFallback(sched);
      data[normalizedDay].push({
        day: normalizedDay,
        subject: resolveSubjectTitle(sched),
        time:
          sched.start_time && sched.end_time
            ? to12HourRange(sched.start_time, sched.end_time)
            : "Schedule TBA",
        section: resolveSectionLabel(sched.section, courseFallback, majorFallback),
        room: resolveRoomLabel(sched),
        startMinutes,
        endMinutes,
      });
    });

    dayOrder.forEach((day) => {
      data[day].sort((a, b) => (a.startMinutes ?? 0) - (b.startMinutes ?? 0));
    });

    return data;
  }, [filteredSchedules]);

  const scheduleBounds = useMemo(() => {
    let minStart = Infinity;
    let maxEnd = -Infinity;

    filteredSchedules.forEach((sched) => {
      const [sh, sm] = (sched.start_time || "07:00").split(":").map(Number);
      const [eh, em] = (sched.end_time || "08:00").split(":").map(Number);
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      if (start < minStart) minStart = start;
      if (end > maxEnd) maxEnd = end;
    });

    if (!Number.isFinite(minStart) || !Number.isFinite(maxEnd)) {
      minStart = 7 * 60;
      maxEnd = 17 * 60;
    }

    minStart = Math.max(6 * 60, Math.floor(minStart / 60) * 60);
    maxEnd = Math.min(21 * 60, Math.ceil(maxEnd / 60) * 60);

    if (maxEnd - minStart < 3 * 60) {
      maxEnd = minStart + 3 * 60;
    }

    return { start: minStart, end: maxEnd };
  }, [filteredSchedules]);

  const hourSlots = useMemo(() => {
    const slots = [];
    for (let minutes = scheduleBounds.start; minutes <= scheduleBounds.end; minutes += 60) {
      slots.push(minutes);
    }
    return slots;
  }, [scheduleBounds]);

  const HOUR_BLOCK_HEIGHT = 52;
  const timelineHeight = hourSlots.length * HOUR_BLOCK_HEIGHT;

  const weekRangeLabel = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    const day = today.getDay();
    const diffToMonday = (day + 6) % 7; // converts Sunday=0 to 6
    start.setDate(today.getDate() - diffToMonday);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const format = (date) =>
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

    return `${format(start)} - ${format(end)}`;
  }, []);

  const formatHourLabel = (minutes) => {
    const hour = Math.floor(minutes / 60);
    const period = hour >= 12 ? "pm" : "am";
    const display = ((hour + 11) % 12) + 1;
    return `${display.toString().padStart(2, "0")} ${period}`;
  };

  const summaryStats = useMemo(() => {
    const roomSet = new Set();
    const sectionSet = new Set();

    schedules.forEach((sched) => {
      if (sched.classroom?.room_number) {
        roomSet.add(sched.classroom.room_number);
      }
      const courseFallback =
        sched.curriculum_subject?.course?.code ||
        sched.curriculum_subject?.course?.course_code ||
        sched.curriculum_subject?.course?.abbr ||
        sched.curriculum_subject?.course?.short_name ||
        sched.curriculum_subject?.course?.name;
      const majorFallback =
        sched.curriculum_subject?.curricula?.major?.code ||
        sched.curriculum_subject?.curricula?.major?.abbr ||
        sched.curriculum_subject?.curricula?.major?.short_name ||
        sched.curriculum_subject?.curricula?.major?.name;
      const label = resolveSectionLabel(sched.section, courseFallback, majorFallback);
      if (label) {
        sectionSet.add(label);
      }
    });

    return [
      {
        label: "Active sections",
        value: sectionSet.size || "—",
        hint: "Synced from registrar",
      },
      {
        label: "Scheduled meetings",
        value: schedules.length || "—",
        hint: "Across all sections",
      },
      {
        label: "Rooms in use",
        value: roomSet.size || "—",
        hint: "Campus wide",
      },
    ];
  }, [schedules]);

  return (
    <FacultyLayout user={user}>
      <Head title="My Classes" />

      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-10">
          {/* Header */}
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
                  <Calendar size={18} weight="fill" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-500">
                    Faculty Workspace
                  </p>
                  <h1 className="text-xl font-semibold text-slate-900">
                    <span className="text-sky-600">My</span> Classes
                  </h1>
                  <p className="text-[12px] text-slate-500">
                    Sections, meetings, and timetable snapshots in one place.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs text-slate-600">
                <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-slate-400">Instructor</p>
                <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                <p className="text-[11px] text-slate-500">
                  {groupedSchedules.length || 0} active section{groupedSchedules.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {summaryStats.map((stat, idx) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700"
                >
                  <p className="text-[8px] font-semibold uppercase tracking-[0.4em] text-slate-400">
                    {stat.label}
                  </p>
                  <p className="text-lg font-semibold text-slate-900">{stat.value}</p>
                  <p className="text-[10px] text-slate-500">{stat.hint}</p>
                  <div className="mt-2 h-1 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-sky-300"
                      style={{ width: `${((idx + 1) / (summaryStats.length + 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Active Semester & Filters */}
            <div className="mt-4 space-y-3">
              {/* Active Semester Display */}
              {activeSemester && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} weight="fill" className="text-blue-600" />
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-blue-600">
                        Active Period
                      </p>
                      <p className="text-sm font-semibold text-blue-900">
                        {activeSemester.semester} • {activeSemester.school_year}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Semester & School Year Filters */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Filter Classes
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-1">
                      Semester
                    </label>
                    <select
                      value={selectedSemester}
                      onChange={(e) => handleFilterChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value), selectedSchoolYear)}
                      className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                    >
                      <option value="all">All Semesters</option>
                      {semesters && [...new Map(semesters.map(sem => [sem.semester, sem])).values()].map((sem) => (
                        <option key={sem.id} value={sem.id}>
                          {sem.semester}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-1">
                      School Year
                    </label>
                    <select
                      value={selectedSchoolYear}
                      onChange={(e) => handleFilterChange(selectedSemester, e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                      className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                    >
                      <option value="all">All School Years</option>
                      {schoolYears && [...new Map(schoolYears.map(sy => [sy.school_year, sy])).values()].map((sy) => (
                        <option key={sy.id} value={sy.id}>
                          {sy.school_year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            {[
              { key: "classes", label: "Classes", icon: Book },
              { key: "timetable", label: "Timetable", icon: Table },
            ].map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 transition ${
                    isActive
                      ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-500 hover:border-sky-100"
                  }`}
                >
                  <Icon size={13} />
                  <span className="text-[10px] font-semibold tracking-[0.3em] uppercase">{label}</span>
                </button>
              );
            })}
          </div>
          {/* Classes Tab */}
          {activeTab === "classes" && (
            <div className="mt-5">
              {groupedSchedules.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {groupedSchedules.map((classItem, idx) => {
                    const palette = cardPalettes[idx % cardPalettes.length];
                    const infoParts = [];
                    if (classItem.schoolYear) {
                      const normalized = classItem.schoolYear
                        .toUpperCase()
                        .startsWith("SY")
                        ? classItem.schoolYear
                        : `SY ${classItem.schoolYear}`;
                      infoParts.push(normalized);
                    }
                    if (classItem.semester) {
                      infoParts.push(classItem.semester);
                    }
                    const upcoming = classItem.schedules.length > 0 
                      ? classItem.schedules[0] 
                      : null;
                    return (
                      <div
                        key={classItem.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.visit(`/faculty/classes/${classItem.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.visit(`/faculty/classes/${classItem.id}`);
                          }
                        }}
                        className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
                      >
                        <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-4 text-left">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.3em] text-slate-400">
                              <Book size={12} weight="bold" className="text-sky-600" /> Section
                            </span>
                            <span className="text-[11px] font-semibold text-slate-600">
                              {classItem.sectionName || "TBA"}
                            </span>
                          </div>
                          <h2 className="text-lg font-semibold text-slate-900">{classItem.label}</h2>
                          <p className="text-[11px] text-slate-500">
                            {infoParts.length > 0 ? infoParts.join(" • ") : "Schedule overview"}
                          </p>
                          <div className="flex flex-col gap-1 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                            {classItem.semester && (
                              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1">
                                <span className="font-medium text-slate-500">Semester</span>
                                <span className="font-semibold text-blue-700">{classItem.semester}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-500">Subjects</span>
                              <span className="font-semibold text-slate-800">{classItem.subjectCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-500">Total Meetings</span>
                              <span className="font-semibold text-slate-800">{classItem.schedules.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-500">Next</span>
                              <span className="font-semibold text-slate-800">
                                {upcoming ? `${upcoming.day} ${upcoming.time}` : "TBA"}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                router.visit(`/faculty/classes/${classItem.id}`);
                              }}
                              className="rounded-lg border border-sky-200 px-3 py-1.5 font-semibold text-sky-700 transition hover:border-sky-400"
                            >
                              Open Schedule
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                router.visit(`/faculty/classes/${classItem.id}`);
                              }}
                              className="rounded-lg border border-transparent px-3 py-1.5 font-semibold text-slate-500 hover:text-slate-700"
                            >
                              Section Details
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-sky-200 bg-white/95 px-5 py-16 text-center text-sm text-slate-500 shadow-inner">
                  You have no scheduled classes at the moment.
                </div>
              )}
            </div>
          )}
{/* Timetable Tab */}
{activeTab === "timetable" && (
  <div className="mt-5">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
            Week View
          </p>
          <p className="text-[14px] font-bold text-slate-800">{weekRangeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-sky-200 px-3 py-1 text-[11px] font-semibold text-sky-600 transition hover:border-sky-300 hover:bg-sky-50"
          >
            Today
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[960px]">
          {/* Day headers with color */}
          <div className="flex">
            <div className="w-16" />
            <div className="grid flex-1 grid-cols-7 gap-0 text-[11px] font-semibold text-white rounded-t-xl overflow-hidden">
              {dayOrder.map((day, idx) => {
                const dayColors = [
                  "bg-indigo-500",
                  "bg-green-500",
                  "bg-yellow-500",
                  "bg-pink-500",
                  "bg-purple-500",
                  "bg-red-500",
                  "bg-teal-500",
                ];
                return (
                  <div
                    key={`header-${day}`}
                    className={`${dayColors[idx % dayColors.length]} text-center px-2 py-1`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex">
            {/* Hour labels */}
            <div className="w-16 pr-3 text-right text-[10px] text-slate-400">
              {hourSlots.map((slot) => (
                <div key={`slot-${slot}`} className="h-[52px]">
                  {formatHourLabel(slot)}
                </div>
              ))}
            </div>

            {/* Timeline grid */}
            <div className="relative flex-1" style={{ height: timelineHeight }}>
              {/* Horizontal grid lines */}
              {hourSlots.map((slot, idx) => (
                <div
                  key={`line-${slot}`}
                  className="absolute inset-x-0 border-t border-slate-200"
                  style={{ top: idx * HOUR_BLOCK_HEIGHT }}
                />
              ))}

              {/* Day columns */}
              <div className="absolute inset-0 grid grid-cols-7">
                {dayOrder.map((day, dayIdx) => {
                  const entries = timetable[day] || [];
                  return (
                    <div
                      key={`col-${day}`}
                      className="relative border-l border-slate-100 first:border-l-0"
                    >
                      {entries.length === 0 && (
                        <p className="m-2 text-[9px] text-slate-300 italic">No events</p>
                      )}
                      {entries.map((event, eventIdx) => {
                        const topOffset =
                          ((event.startMinutes - scheduleBounds.start) / 60) *
                          HOUR_BLOCK_HEIGHT;
                        const durationMinutes = Math.max(
                          event.endMinutes - event.startMinutes,
                          45
                        );
                        const height = (durationMinutes / 60) * HOUR_BLOCK_HEIGHT - 6;

                        const pastelColors = [
                          "bg-indigo-50",
                          "bg-green-50",
                          "bg-yellow-50",
                          "bg-pink-50",
                          "bg-purple-50",
                          "bg-red-50",
                          "bg-teal-50",
                        ];
                        const palette =
                          pastelColors[(dayIdx + eventIdx) % pastelColors.length];

                        return (
                          <div
                            key={`${day}-${eventIdx}-${event.startMinutes}`}
                            className={`group absolute left-1 right-1 flex flex-col overflow-hidden rounded-xl border border-slate-200 ${palette} text-left shadow-sm transition transform hover:-translate-y-1 hover:shadow-lg`}
                            style={{ top: topOffset, height: Math.max(height, 40) }}
                          >
                            {/* Card header */}
                            <div className="relative flex items-center justify-between border-b border-slate-200 px-2 py-1">
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-slate-500">
                                Subject
                              </span>
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-700">
                                {getInitials(event.subject || "?")}
                              </span>
                            </div>

                            {/* Card body */}
                            <div className="flex-1 px-2 py-1">
                              <h4 className="text-[11px] font-semibold text-slate-900 group-hover:text-slate-800 line-clamp-1">
                                {event.subject || "Untitled"}
                                {event.code && (
                                  <span className="ml-1 text-[8px] font-normal text-slate-500">
                                    ({event.code})
                                  </span>
                                )}
                              </h4>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[8px] uppercase tracking-[0.05em] text-slate-400">
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-white/70 px-1.5 py-0.5 text-slate-600 ring-1 ring-slate-200">
                                  <Clock size={8} weight="bold" />
                                  {event.time || "TBA"}
                                </span>
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-white/70 px-1.5 py-0.5 text-slate-600 ring-1 ring-slate-200">
                                  {event.day || "Schedule"}
                                </span>
                              </div>
                            </div>

                            {/* Card footer */}
                            <div className="flex items-center justify-between border-t border-slate-200 bg-white/50 px-2 py-1 text-[9px] text-slate-600">
                              <span>Room {event.room || "TBA"}</span>
                              <span className="inline-flex items-center gap-0.5 text-slate-800 font-medium">
                                Open →
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )}

        </div>
      </div>
    </FacultyLayout>
  );
}
