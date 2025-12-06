import React, { useMemo, useState } from "react";
import { Head, Link } from "@inertiajs/react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import {
  ArrowLeft,
  UserCircle,
  IdentificationCard,
  Briefcase,
  Envelope,
  Phone,
  MapPin,
  UsersFour,
  BookOpen,
  CalendarBlank,
  Clock,
  Buildings,
} from "phosphor-react";

const tabButtonBase =
  "flex items-center gap-2 rounded-xl border px-3.5 py-1.75 text-[13px] font-medium text-slate-500 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200";
const tabButtonActive = "border-blue-200 bg-blue-50/80 text-blue-700 shadow-sm";
const tabButtonInactive = "border-transparent hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700";
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const dayAliasMap = {
  mon: "Monday",
  monday: "Monday",
  tue: "Tuesday",
  tues: "Tuesday",
  tuesday: "Tuesday",
  wed: "Wednesday",
  weds: "Wednesday",
  wednesday: "Wednesday",
  thu: "Thursday",
  thur: "Thursday",
  thurs: "Thursday",
  thursday: "Thursday",
  fri: "Friday",
  friday: "Friday",
  sat: "Saturday",
  saturday: "Saturday",
  sun: "Sunday",
  sunday: "Sunday",
};

const formatTime = (value) => {
  if (!value) return "TBA";
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
};

const formatUnits = (load) => {
  const lec = load?.curriculum_subject?.lec_unit ?? 0;
  const lab = load?.curriculum_subject?.lab_unit ?? 0;
  if (lab > 0) {
    return `${lec}/${lab}`;
  }
  return `${lec}`;
};

const getSubjectLabel = (load) => {
  return (
    load?.curriculum_subject?.subject?.code || load?.curriculum_subject?.subject?.descriptive_title || "Subject"
  );
};

const normalizeDayLabel = (value) => {
  if (!value) return null;
  const cleaned = value.trim().toLowerCase();
  if (dayAliasMap[cleaned]) {
    return dayAliasMap[cleaned];
  }
  const directMatch = daysOfWeek.find((day) => day.toLowerCase() === cleaned);
  if (directMatch) return directMatch;
  if (!value.trim()) return null;
  return value.trim().charAt(0).toUpperCase() + value.trim().slice(1);
};

const timeToMinutes = (value) => {
  if (!value) return 0;
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return 0;
  return hour * 60 + minute;
};

export default function FacultyProfile({
  faculty = {},
  teachingSchedules = [],
  loadSummary = {},
  activeSemester = null,
  backUrl,
}) {
  const [activeTab, setActiveTab] = useState("profile");

  const loads = useMemo(() => faculty?.facultyLoads ?? [], [faculty?.facultyLoads]);

  const profilePhoto = useMemo(() => {
    const raw = faculty?.profile_picture;
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return raw;
    return `/storage/${raw}`;
  }, [faculty?.profile_picture]);

  const timetable = useMemo(() => {
    if (!Array.isArray(teachingSchedules) || teachingSchedules.length === 0) {
      return { rows: [], hasData: false };
    }

    const sanitizedSchedules = teachingSchedules
      .map((sched) => ({
        ...sched,
        normalizedDay: normalizeDayLabel(sched.day),
      }))
      .filter((sched) => sched.normalizedDay && sched.start_time);

    if (!sanitizedSchedules.length) {
      return { rows: [], hasData: false, columns: daysOfWeek };
    }

    const uniqueNormalizedDays = Array.from(
      new Set(sanitizedSchedules.map((sched) => sched.normalizedDay).filter(Boolean))
    );

    const columns = daysOfWeek.slice();
    uniqueNormalizedDays.forEach((day) => {
      if (day && !columns.includes(day)) {
        columns.push(day);
      }
    });

    const uniqueStartTimes = Array.from(
      new Set(sanitizedSchedules.map((sched) => sched.start_time))
    ).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));

    const matrix = uniqueStartTimes.map((time) => ({
      rawTime: time,
      timeLabel: formatTime(time),
      dayEntries: Object.fromEntries(columns.map((day) => [day, []])),
    }));

    const indexLookup = new Map(uniqueStartTimes.map((time, index) => [time, index]));

    sanitizedSchedules.forEach((sched) => {
      const rowIndex = indexLookup.get(sched.start_time);
      if (rowIndex === undefined) return;
      const columnKey = columns.includes(sched.normalizedDay) ? sched.normalizedDay : columns[0];
      matrix[rowIndex].dayEntries[columnKey]?.push(sched);
    });

    matrix.forEach((row) => {
      columns.forEach((day) => {
        row.dayEntries[day].sort(
          (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
        );
      });
    });

    return { rows: matrix, hasData: true, columns };
  }, [teachingSchedules]);

  const scheduleLookup = useMemo(() => {
    if (!Array.isArray(teachingSchedules)) return new Map();
    const map = new Map();
    teachingSchedules.forEach((sched) => {
      if (!sched?.curriculum_subject_id) return;
      if (!map.has(sched.curriculum_subject_id)) {
        map.set(sched.curriculum_subject_id, {
          schedules: [],
          totalStudents: 0,
        });
      }
      const entry = map.get(sched.curriculum_subject_id);
      entry.schedules.push(sched);
      entry.totalStudents += Number(sched?.enrolled_students) || 0;
    });
    return map;
  }, [teachingSchedules]);

  const totalEnrolledFromSchedules = useMemo(() => {
    let total = 0;
    scheduleLookup.forEach((entry) => {
      total += entry.totalStudents;
    });
    return total;
  }, [scheduleLookup]);

  const fallbackStudentCount = useMemo(
    () => loads.reduce((sum, l) => sum + (Number(l.student_count) || 0), 0),
    [loads]
  );

  const resolvedSummary = {
    subjects: loadSummary?.subjects ?? loads.length,
    total_units: loadSummary?.total_units ?? loads.reduce((sum, l) => sum + (Number(l.total_units) || 0), 0),
    official_load: loadSummary?.official_load ?? loads.reduce((sum, l) => sum + (Number(l.official_load) || 0), 0),
    student_count:
      scheduleLookup.size > 0
        ? totalEnrolledFromSchedules
        : loadSummary?.student_count ?? fallbackStudentCount,
  };

  const profileDetails = [
    {
      label: "Employee ID",
      value: faculty.id_number || "—",
      icon: IdentificationCard,
    },
    {
      label: "Department",
      value: faculty.department?.name || "—",
      icon: Buildings,
    },
    {
      label: "Profession",
      value: faculty.profession || "—",
      icon: Briefcase,
    },
    {
      label: "Email",
      value: faculty.email || "—",
      icon: Envelope,
    },
    {
      label: "Contact",
      value: faculty.contact || "—",
      icon: Phone,
    },
    {
      label: "Address",
      value: faculty.address || "—",
      icon: MapPin,
    },
  ];

  const renderProfileTab = () => (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          {profileDetails.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Icon size={16} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                  <p className="text-[13px] font-medium text-slate-800">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CalendarBlank size={18} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800">Teaching Schedule</h2>
        </div>
        {!timetable.hasData ? (
          <p className="text-[13px] text-slate-500">No schedule published for the active term.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-slate-100 text-[12px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">Time</th>
                  {timetable.columns.map((day) => (
                    <th key={day} className="px-3 py-2 text-left text-[11px] uppercase tracking-wide">
                      {day.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timetable.rows.map((row) => (
                  <tr key={row.rawTime} className="border-t border-slate-100">
                    <td className="bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-600">
                      {row.timeLabel}
                    </td>
                    {timetable.columns.map((day) => (
                      <td key={`${row.rawTime}-${day}`} className="px-3 py-2 align-top">
                        {row.dayEntries[day].length === 0 ? (
                          <span className="block text-[11px] text-slate-300">—</span>
                        ) : (
                          <div className="space-y-2">
                            {row.dayEntries[day].map((slot) => (
                              <div
                                key={slot.id}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                                style={{ borderLeft: `4px solid ${slot.color || "#2563eb"}` }}
                              >
                                <p className="text-[12px] font-semibold text-slate-800">
                                  {slot.subject?.code || slot.subject?.descriptive_title || "Subject"}
                                </p>
                                <p className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <Clock size={12} />
                                  {`${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Section: {slot.section?.name || "TBA"}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Room: {slot.room?.room_number || "TBA"}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );

  const renderLoadTab = () => (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {loads.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-slate-500">
          No faculty load records for the selected term.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12px]">
            <thead className="bg-blue-50 text-blue-700 text-[11px] uppercase tracking-wide">
              <tr>
                <th className="px-2 py-1.5 text-left">Subject</th>
                <th className="px-2 py-1.5 text-left">Course</th>
                <th className="px-2 py-1.5 text-left">Official Units</th>
                <th className="px-2 py-1.5 text-left">Total Units</th>
                <th className="px-2 py-1.5 text-left">Paying Extra</th>
                <th className="px-2 py-1.5 text-left">Section</th>
                <th className="px-2 py-1.5 text-left">Day</th>
                <th className="px-2 py-1.5 text-left">Time</th>
                <th className="px-2 py-1.5 text-left">Enrolled Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loads.map((load) => (
                <tr key={load.id} className="text-slate-700">
                  <td className="px-2 py-1.5">
                    <p className="font-semibold text-[12px]">{getSubjectLabel(load)}</p>
                    <p className="text-[10px] text-slate-500">
                      {load.curriculum_subject?.subject?.descriptive_title || "—"}
                    </p>
                  </td>
                  <td className="px-2 py-1.5 text-[12px]">
                    {load.course?.code || load.course?.name || "—"}
                  </td>
                  <td className="px-2 py-1.5 text-[12px] font-semibold text-slate-800">
                    {load.official_load ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-[12px]">{load.total_units ?? formatUnits(load)}</td>
                  <td className="px-2 py-1.5 text-[12px] text-rose-600">
                    {Math.max(0, (load.total_units ?? 0) - (load.official_load ?? 0))}
                  </td>
                  {(() => {
                    const relatedEntry = scheduleLookup.get(load.curriculum_subject_id);
                    const primarySchedule = relatedEntry?.schedules?.[0] ?? null;
                    const dayLabel = primarySchedule?.day || "—";
                    const timeLabel = primarySchedule
                      ? `${formatTime(primarySchedule.start_time)} - ${formatTime(primarySchedule.end_time)}`
                      : "—";
                    const sectionLabel = primarySchedule?.section?.name || "—";
                    const students = relatedEntry
                      ? relatedEntry.totalStudents
                      : load.student_count ?? "—";
                    return (
                      <>
                        <td className="px-2 py-1.5 text-[12px]">{sectionLabel}</td>
                        <td className="px-2 py-1.5 text-[12px]">{dayLabel}</td>
                        <td className="px-2 py-1.5 text-[12px]">{timeLabel}</td>
                        <td className="px-2 py-1.5 text-[12px] font-semibold text-slate-900">{students}</td>
                      </>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderActiveTab = () => {
    if (activeTab === "profile") {
      return renderProfileTab();
    }
    return renderLoadTab();
  };

  return (
    <ProgramHeadLayout>
      <Head title={`Faculty Profile - ${faculty.fName || "Faculty"}`} />
      <div className="px-4 py-5 md:px-6 md:py-6 space-y-4">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={backUrl || route("program-head.faculties.index")}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {`${faculty.fName || ""} ${faculty.lName || ""}`.trim() || "Faculty Profile"}
              </h1>
              <p className="text-[12px] text-slate-500">
                {faculty.profession || "Faculty"} • {faculty.department?.name || "Department"}
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt={`${faculty.fName} ${faculty.lName}`}
                className="h-16 w-16 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-2xl font-semibold text-blue-600">
                {(faculty.fName?.[0] || "F") + (faculty.lName?.[0] || "P")}
              </span>
            )}
            <div className="flex flex-wrap gap-4 text-[12px] font-medium text-slate-600">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-slate-400">Status</span>
                <span className={`mt-1 inline-flex w-fit items-center gap-2 rounded-full px-3 py-0.5 text-[11px] font-semibold ${
                  faculty.status === "active"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  <UsersFour size={14} />
                  {faculty.status || "Inactive"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-slate-400">Active Semester</span>
                <span className="mt-1 text-[13px] text-slate-800">
                  {activeSemester?.semester || "Not set"}
                </span>
              </div>
            </div>
            <div className="ml-auto grid grid-cols-2 gap-3 text-center text-[12px] text-slate-600 sm:grid-cols-4">
              {[
                { label: "Subjects", value: resolvedSummary.subjects },
                { label: "Total Units", value: resolvedSummary.total_units },
                { label: "Official Load", value: resolvedSummary.official_load },
                { label: "Students", value: resolvedSummary.student_count },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{stat.label}</p>
                  <p className="text-lg font-semibold text-slate-900">{stat.value ?? 0}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm">
          {[
            { key: "profile", label: "Profile", icon: UserCircle },
            { key: "load", label: "Teaching Load", icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`${tabButtonBase} ${isActive ? tabButtonActive : tabButtonInactive}`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {renderActiveTab()}
      </div>
    </ProgramHeadLayout>
  );
}
