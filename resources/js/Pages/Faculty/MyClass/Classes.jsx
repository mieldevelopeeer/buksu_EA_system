import React, { useMemo, useEffect, useState } from "react";
import FacultyLayout from "@/Layouts/FacultyLayout";
import { Head, usePage } from "@inertiajs/react";
import { Calendar, Clock, Book, Table } from "phosphor-react";

export default function Classes({ user }) {
  const { schedules = [] } = usePage().props;
  const [activeTab, setActiveTab] = useState("classes");
  const [openSection, setOpenSection] = useState(null);
  const cardPalettes = [
    {
      accent: "#2563eb",
      badgeClass: "bg-sky-100 text-sky-600",
      iconClass: "text-sky-500",
    },
    {
      accent: "#0d9488",
      badgeClass: "bg-teal-100 text-teal-600",
      iconClass: "text-teal-500",
    },
    {
      accent: "#7c3aed",
      badgeClass: "bg-violet-100 text-violet-600",
      iconClass: "text-violet-500",
    },
  ];
  useEffect(() => {
    console.log("Raw schedules from backend:", schedules);
  }, [schedules]);

  const to12HourRange = (start, end) => {
    const format = (time) => {
      if (!time) return "";
      const [h, m] = time.split(":").map(Number);
      const period = h >= 12 ? "PM" : "AM";
      const hour = ((h + 11) % 12) + 1;
      return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
    };
    return `${format(start)} – ${format(end)}`;
  };

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

  // Group schedules by section
  const groupedSchedules = useMemo(() => {
    const sections = {};

    schedules.forEach((sched) => {
      const sectionObj = sched.section;
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
      const label = resolveSectionLabel(sectionObj, courseFallback, majorFallback);
      const sectionKey = sectionObj?.id ?? label ?? "No Section";
      if (!sections[sectionKey]) {
        sections[sectionKey] = {
          id: sectionKey,
          label,
          schedules: [],
          schoolYear: null,
          semester: null,
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

      sections[sectionKey].schedules.push({
        day: sched.schedule_day,
        startMinutes: (() => {
          const [h, m] = (sched.start_time || "0:0").split(":").map(Number);
          return h * 60 + m;
        })(),
        time: to12HourRange(sched.start_time, sched.end_time),
        subject: sched.curriculum_subject?.subject?.descriptive_title || "N/A",
        room: sched.classroom?.room_number || "N/A",
      });
    });

    return Object.values(sections).map((sectionEntry) => ({
      id: sectionEntry.id,
      label: sectionEntry.label,
      schoolYear: sectionEntry.schoolYear,
      semester: sectionEntry.semester,
      schedules: sectionEntry.schedules.sort((a, b) => {
        const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const dayA = dayOrder.indexOf(a.day);
        const dayB = dayOrder.indexOf(b.day);
        if (dayA !== dayB) return dayA - dayB;
        return (a.startMinutes ?? 0) - (b.startMinutes ?? 0);
      }),
    }));
  }, [schedules]);

  // Timetable by day
  const timetable = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const data = {};
    days.forEach((day) => (data[day] = []));

    schedules.forEach((sched) => {
      data[sched.schedule_day]?.push({
        subject: sched.curriculum_subject?.subject?.descriptive_title || "N/A",
        time: to12HourRange(sched.start_time, sched.end_time),
        section: sched.section?.section || "N/A",
        room: sched.classroom?.room_number || "N/A",
        startMinutes: (() => {
          const [h, m] = (sched.start_time || "0:0").split(":").map(Number);
          return h * 60 + m;
        })(),
      });
    });

    days.forEach((day) => {
      data[day].sort((a, b) => (a.startMinutes ?? 0) - (b.startMinutes ?? 0));
    });

    return data;
  }, [schedules]);

  return (
    <FacultyLayout user={user}>
      <Head title="My Classes" />

      <div className="bg-gradient-to-br from-slate-100 via-white to-slate-100 min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
          {/* Header */}
          <div className="rounded-3xl bg-white/95 px-5 py-6 shadow-md ring-1 ring-slate-100 backdrop-blur-sm sm:flex sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg">
                <Calendar size={20} weight="fill" />
              </div>
              <div className="space-y-1">
                <h1 className="text-[1.35rem] font-semibold text-slate-900 leading-tight">
                  My Classes
                </h1>
                <p className="text-xs text-slate-500">
                  Overview of your sections, sessions, and weekly timetable.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-1 text-right text-xs text-slate-500 sm:mt-0">
              <span className="font-medium text-slate-700">{user?.name}</span>
              <span>
                {groupedSchedules.length || 0} section
                {groupedSchedules.length === 1 ? "" : "s"} active
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            {[
              { key: "classes", label: "Classes", icon: Book },
              { key: "timetable", label: "Timetable", icon: Table },
            ].map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 transition ${
                    isActive
                      ? "border-sky-500 bg-sky-500/10 text-sky-600 shadow-sm"
                      : "border-transparent bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={14} />
                  <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
                </button>
              );
            })}
          </div>
          {/* Classes Tab */}
          {activeTab === "classes" && (
            <div className="mt-6 space-y-4">
              {groupedSchedules.length > 0 ? (
                groupedSchedules.map((classItem, idx) => {
                  const palette = cardPalettes[idx % cardPalettes.length];
                  const infoParts = [];
                  if (classItem.schoolYear) {
                    const normalized = classItem.schoolYear.toUpperCase().startsWith("SY")
                      ? classItem.schoolYear
                      : `SY ${classItem.schoolYear}`;
                    infoParts.push(normalized);
                  }
                  if (classItem.semester) {
                    infoParts.push(classItem.semester);
                  }
                  return (
                    <div
                      key={idx}
                      className="rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >
                      <button
                        onClick={() =>
                          setOpenSection((prev) =>
                            prev === classItem.id ? null : classItem.id
                          )
                        }
                        className="flex w-full items-center justify-between gap-4 rounded-t-3xl px-4 py-4 text-left transition hover:bg-slate-50"
                        style={{ borderLeft: `4px solid ${palette.accent}`, boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" }}
                      >
                        <div>
                          <h2 className="text-base font-semibold text-slate-800">
                            {classItem.label}
                          </h2>
                          {infoParts.length > 0 && (
                            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                              {infoParts.join(" • ")}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-slate-400">
                            {classItem.schedules.length} class
                            {classItem.schedules.length === 1 ? "" : "es"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-[12px] text-slate-400">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${palette.badgeClass}`}
                          >
                            <Clock size={12} />
                            Schedules
                          </span>
                          <span
                            className={`text-slate-400 transition ${
                              openSection === classItem.id ? "rotate-180" : ""
                            }`}
                          >
                            ▾
                          </span>
                        </div>
                      </button>

                      {openSection === classItem.id && (
                        <ul className="space-y-1.5 px-4 py-3">
                          {classItem.schedules.map((sched, i) => (
                            <li
                              key={i}
                              className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-[11px] text-slate-600"
                            >
                              <div className="flex items-center justify-between gap-2 text-[12px] font-medium text-slate-700">
                                <span className="flex items-center gap-1">
                                  <Book size={12} className={palette.iconClass} />
                                  {sched.subject}
                                </span>
                                <span className="rounded-full border border-slate-200/60 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                  {sched.day}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  {sched.time}
                                </span>
                                <span>•</span>
                                <span>Room {sched.room}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white/90 px-6 py-10 text-center text-sm text-slate-500">
                  You have no scheduled classes at the moment.
                </div>
              )}
            </div>
          )}

          {/* Timetable Tab */}
          {activeTab === "timetable" && (
            <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-100">
              <div className="overflow-x-auto">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-slate-100/90 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-[0.25em] text-[10px]">Day</th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-[0.25em] text-[10px]">Time</th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-[0.25em] text-[10px]">Subject</th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-[0.25em] text-[10px]">Section</th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-[0.25em] text-[10px]">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(timetable).map((day, idx) =>
                      timetable[day].length > 0 ? (
                        timetable[day].map((sched, i) => (
                          <tr
                            key={`${idx}-${i}`}
                            className="border-t border-slate-100 bg-white text-slate-600 transition hover:bg-slate-50"
                          >
                            <td className="px-4 py-2.5 font-semibold text-slate-700">{day}</td>
                            <td className="px-4 py-2.5 text-slate-500">{sched.time}</td>
                            <td className="px-4 py-2.5 text-slate-700">{sched.subject}</td>
                            <td className="px-4 py-2.5 text-slate-500">{sched.section}</td>
                            <td className="px-4 py-2.5 text-slate-500">{sched.room}</td>
                          </tr>
                        ))
                      ) : (
                        <tr key={idx} className="border-t border-slate-100 bg-slate-50 text-slate-400">
                          <td className="px-4 py-3 font-semibold text-slate-600">{day}</td>
                          <td className="px-4 py-3" colSpan={4}>
                            No classes scheduled
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </FacultyLayout>
  );
}
