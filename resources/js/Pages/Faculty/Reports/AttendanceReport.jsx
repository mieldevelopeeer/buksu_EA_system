import React, { useMemo, useState } from "react";
import { Head } from "@inertiajs/react";
import FacultyLayout from "@/Layouts/FacultyLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const formatNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "0";

const loadLogoImage = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/images/buksu_logo.png";
  });

const formatDateLabel = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

function Chip({ label, tone }) {
  const toneMap = {
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    rose: "bg-rose-50 text-rose-700 border border-rose-200",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    sky: "bg-sky-50 text-sky-700 border border-sky-200",
  };

  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneMap[tone] || "bg-slate-50 text-slate-600 border border-slate-200"}`}>{label}</span>;
}
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTimeLabel = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatClock = (value) => {
  if (!value) return null;
  const normalized = value.toString();
  if (/am|pm/i.test(normalized)) {
    return normalized;
  }
  const parts = normalized.split(":");
  const hour = Number(parts[0]);
  if (Number.isNaN(hour)) return normalized;
  const minute = Number(parts[1] ?? 0);
  if (Number.isNaN(minute)) return normalized;
  const reference = new Date();
  reference.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(reference);
};

const formatTimeRange = (start, end) => {
  const startLabel = formatClock(start);
  const endLabel = formatClock(end);
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  return startLabel || endLabel || "";
};

const buildScheduleMeta = (schedule) => {
  if (!schedule) return null;
  const subject = schedule.curriculum_subject?.subject ?? schedule.subject ?? {};
  const course = schedule.curriculum_subject?.course ?? schedule.course ?? {};
  const section = schedule.section ?? {};

  const subjectName =
    subject.descriptive_title || subject.title || schedule.subject_title || "Unnamed Subject";
  const subjectCode = subject.code || schedule.subject_code || "";
  const sectionLabel = section.section || schedule.section_name || "Section";
  const courseLabel = course.code || course.name || "Course";
  const meetingDay = schedule.schedule_day || schedule.day || "Schedule";
  const meetingTime =
    schedule.formatted_time || formatTimeRange(schedule.start_time, schedule.end_time) || "";
  const scheduleLabel = meetingTime ? `${meetingDay} • ${meetingTime}` : meetingDay;

  return {
    id: schedule.id,
    subjectName,
    subjectCode,
    sectionLabel,
    courseLabel,
    meetingDay,
    meetingTime,
    scheduleLabel,
    facultyName: schedule.faculty_name || schedule.instructor_name || null,
  };
};

export default function FacultyAttendanceReport({
  schedules = [],
  attendanceSummaries = [],
  activeSemester = null,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const scheduleIndex = useMemo(() => {
    const map = new Map();
    if (Array.isArray(schedules)) {
      schedules.forEach((schedule) => {
        const meta = buildScheduleMeta(schedule);
        if (meta?.id) {
          map.set(meta.id, meta);
        }
      });
    }
    return map;
  }, [schedules]);

  const combinedSummaries = useMemo(() => {
    if (!Array.isArray(attendanceSummaries)) return [];

    return attendanceSummaries
      .map((summary) => {
        const schedule = scheduleIndex.get(summary.class_schedule_id);
        if (!schedule) return null;

        const totals = {
          present: summary.totals?.present ?? 0,
          absent: summary.totals?.absent ?? 0,
          late: summary.totals?.late ?? 0,
          excused: summary.totals?.excused ?? 0,
        };

        const sessions = (summary.sessions ?? []).map((session, index) => {
          const rawDate = session.date || session.attendance_date || session.recorded_at || session.dateKey;
          return {
            id: `${summary.class_schedule_id}-${session.dateKey || index}`,
            rawDate,
            dateLabel: formatDateLabel(rawDate),
            recordedLabel: formatDateTimeLabel(session.recorded_at || rawDate),
            present: session.present ?? 0,
            absent: session.absent ?? 0,
            late: session.late ?? 0,
            excused: session.excused ?? 0,
          };
        });

        return {
          schedule,
          totals,
          sessions,
        };
      })
      .filter(Boolean);
  }, [attendanceSummaries, scheduleIndex]);

  const sectionOptions = useMemo(() => {
    const set = new Set(["all"]);
    scheduleIndex.forEach(({ sectionLabel }) => {
      if (sectionLabel) set.add(sectionLabel);
    });
    return Array.from(set);
  }, [scheduleIndex]);

  const subjectOptions = useMemo(() => {
    const set = new Set(["all"]);
    scheduleIndex.forEach(({ subjectName, subjectCode }) => {
      const label = subjectCode ? `${subjectCode} • ${subjectName}` : subjectName;
      if (label) set.add(label);
    });
    return Array.from(set);
  }, [scheduleIndex]);

  const dayOptions = useMemo(() => {
    const set = new Set(["all"]);
    scheduleIndex.forEach(({ meetingDay }) => {
      if (meetingDay) set.add(meetingDay);
    });
    return Array.from(set);
  }, [scheduleIndex]);

  const filteredSummaries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return combinedSummaries.filter(({ schedule }) => {
      if (!schedule) return false;
      const matchesSection = sectionFilter === "all" || schedule.sectionLabel === sectionFilter;
      const subjectLabel = schedule.subjectCode ? `${schedule.subjectCode} • ${schedule.subjectName}` : schedule.subjectName;
      const matchesSubject = subjectFilter === "all" || subjectLabel === subjectFilter;
      const matchesDay = dayFilter === "all" || schedule.meetingDay === dayFilter;
      if (!matchesSection || !matchesDay || !matchesSubject) return false;

      if (!term) return true;
      const haystack = [
        schedule.subjectName,
        schedule.subjectCode,
        schedule.sectionLabel,
        schedule.courseLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [combinedSummaries, searchTerm, sectionFilter, dayFilter]);

  const sessionRows = useMemo(() => {
    const rows = [];
    filteredSummaries.forEach(({ schedule, sessions }) => {
      sessions.forEach((session) => {
        rows.push({
          id: session.id,
          scheduleId: schedule.id,
          sectionLabel: schedule.sectionLabel,
          subjectDisplay: `${schedule.subjectCode ? `${schedule.subjectCode} • ` : ""}${schedule.subjectName}`,
          courseLabel: schedule.courseLabel,
          scheduleLabel: schedule.scheduleLabel,
          ...session,
        });
      });
    });

    const filteredRows = statusFilter === "all"
      ? rows
      : rows.filter((row) => {
          const target = statusFilter.toLowerCase();
          const lookup = {
            present: row.present,
            absent: row.absent,
            late: row.late,
            excused: row.excused,
          };
          return (lookup[target] ?? 0) > 0;
        });

    return filteredRows.sort((a, b) => {
      const dateA = new Date(a.rawDate || 0).getTime();
      const dateB = new Date(b.rawDate || 0).getTime();
      return dateB - dateA;
    });
  }, [filteredSummaries, statusFilter]);

  const aggregateTotals = useMemo(() => {
    return filteredSummaries.reduce(
      (acc, entry) => {
        acc.present += entry.totals.present;
        acc.absent += entry.totals.absent;
        acc.late += entry.totals.late;
        acc.excused += entry.totals.excused;
        return acc;
      },
      { present: 0, absent: 0, late: 0, excused: 0 }
    );
  }, [filteredSummaries]);

  const exportRows = useMemo(
    () =>
      sessionRows.map((row) => ({
        Section: row.sectionLabel,
        Subject: row.subjectDisplay,
        Date: row.dateLabel,
        Schedule: row.scheduleLabel,
        Present: row.present,
        Absent: row.absent,
        Late: row.late,
        Excused: row.excused,
      })),
    [sessionRows]
  );

  const templateMeta = useMemo(() => {
    const fallbackSchedule = schedules?.[0];
    const instructor =
      filteredSummaries[0]?.schedule?.facultyName ||
      fallbackSchedule?.faculty_name ||
      fallbackSchedule?.instructor_name ||
      "Faculty";

    return {
      campus: activeSemester?.campus || "ALUBIJID",
      semester: activeSemester?.semester || "—",
      schoolYear: activeSemester?.school_year || "—",
      instructor,
      preparedRole: "Faculty",
      date: new Date().toLocaleDateString(),
    };
  }, [activeSemester, schedules, filteredSummaries]);

  const handleExportPDF = () => {
    if (!exportRows.length) return;

    const generate = async () => {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 18;
      let cursorY = 16;

      const logo = await loadLogoImage();
      if (logo) {
        doc.addImage(logo, "PNG", marginX - 6, cursorY - 6, 18, 18);
      }

      doc.setFont("Times", "Bold");
      doc.setFontSize(12);
      doc.text("BUKIDNON STATE UNIVERSITY", pageWidth / 2, cursorY, { align: "center" });
      doc.setFont("Times", "Normal");
      doc.setFontSize(9);
      doc.text("Malaybalay City, Bukidnon 8700", pageWidth / 2, cursorY + 5, { align: "center" });
      doc.text("Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph", pageWidth / 2, cursorY + 9, {
        align: "center",
      });

      doc.setFont("Times", "Bold");
      doc.setFontSize(11);
      doc.text("FACULTY ATTENDANCE REPORT", pageWidth / 2, cursorY + 18, { align: "center" });
      doc.setFont("Times", "Normal");
      doc.text(
        `CAMPUS: ${templateMeta.campus}    Semester: ${templateMeta.semester}    S.Y.: ${templateMeta.schoolYear}`,
        pageWidth / 2,
        cursorY + 24,
        { align: "center" }
      );

      doc.text(`Instructor : ${templateMeta.instructor}`, marginX, cursorY + 34);
      doc.text(`Generated : ${templateMeta.date}`, pageWidth - marginX, cursorY + 34, { align: "right" });

      const tableStartY = cursorY + 42;
      autoTable(doc, {
        startY: tableStartY,
        head: [["SECTION", "SUBJECT", "DATE", "SCHEDULE", "PRESENT", "ABSENT", "LATE", "EXCUSED"]],
        body: exportRows.map((row) => [
          row.Section,
          row.Subject,
          row.Date,
          row.Schedule,
          row.Present,
          row.Absent,
          row.Late,
          row.Excused,
        ]),
        styles: { fontSize: 8.5, font: "Times", cellPadding: 2.2 },
        headStyles: { fontStyle: "bold", fillColor: [240, 240, 240], textColor: 20 },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 58 },
          2: { cellWidth: 28 },
          3: { cellWidth: 42 },
        },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        bodyStyles: { textColor: 35 },
      });

      const signatureY = doc.lastAutoTable.finalY + 12;
      doc.setFont("Times", "Normal");
      doc.text("Prepared by:", marginX, signatureY);
      doc.setFont("Times", "Bold");
      doc.text(templateMeta.instructor, marginX, signatureY + 5);
      doc.setFont("Times", "Normal");
      doc.text(templateMeta.preparedRole, marginX, signatureY + 9);
      doc.setFontSize(7);
      doc.text("(signature over printed name)", marginX, signatureY + 13);

      const pdfDate = templateMeta.date.replace(/\//g, "-");
      doc.save(`Faculty Attendance Report - ${pdfDate}.pdf`);
    };

    generate();
  };

  const handleExportExcel = () => {
    if (!exportRows.length) return;

    const metadataRows = [
      ["BUKIDNON STATE UNIVERSITY"],
      ["Malaybalay City, Bukidnon 8700"],
      ["Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph"],
      ["FACULTY ATTENDANCE REPORT"],
      [`CAMPUS: ${templateMeta.campus}    Semester: ${templateMeta.semester}    S.Y.: ${templateMeta.schoolYear}`],
      ["Instructor", templateMeta.instructor],
      ["Generated", templateMeta.date],
      [],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(metadataRows);
    XLSX.utils.sheet_add_json(worksheet, exportRows, {
      origin: XLSX.utils.encode_cell({ r: metadataRows.length, c: 0 }),
      skipHeader: false,
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    const excelDate = templateMeta.date.replace(/\//g, "-");
    XLSX.writeFile(workbook, `Faculty Attendance Report - ${excelDate}.xlsx`);
  };

  const totalSessions = sessionRows.length;
  const distinctSections = new Set(sessionRows.map((row) => row.sectionLabel)).size;
  const latestSessionLabel = sessionRows[0]?.dateLabel || "—";
  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "present", label: "Present Logged" },
    { value: "absent", label: "Absent Logged" },
    { value: "late", label: "Late Logged" },
    { value: "excused", label: "Excused Logged" },
  ];

  const scheduleSessions = useMemo(() => {
    return filteredSummaries.map(({ schedule, sessions }) => ({
      schedule,
      sessions: sessions.filter((session) => {
        if (statusFilter === "all") return true;
        const lookup = {
          present: session.present,
          absent: session.absent,
          late: session.late,
          excused: session.excused,
        };
        return (lookup[statusFilter] ?? 0) > 0;
      }),
    }));
  }, [filteredSummaries, statusFilter]);

  return (
    <FacultyLayout>
      <Head title="Attendance Reports" />
      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 text-[13px] text-slate-600">
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Attendance Reports</p>
            <h1 className="text-xl font-semibold text-slate-900">Class Session Overview</h1>
            <p className="text-[12px] text-slate-500">Monitor the attendance sessions you have submitted across assigned sections.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={!exportRows.length}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!exportRows.length}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export Excel
            </button>
          </div>
        </section>

        {activeSemester && (
          <section className="grid gap-2 rounded-2xl border border-slate-200/60 bg-slate-50 px-5 py-4 text-[12px] text-slate-600 sm:grid-cols-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Campus</span>
              <p className="text-sm font-semibold text-slate-800">{templateMeta.campus}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Semester</span>
              <p className="text-sm font-semibold text-slate-800">{templateMeta.semester}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">S.Y.</span>
              <p className="text-sm font-semibold text-slate-800">{templateMeta.schoolYear}</p>
            </div>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <SummaryTile label="Sessions Logged" value={formatNumber(totalSessions)} accent="from-sky-50 via-white to-sky-100/70" />
          <SummaryTile label="Distinct Sections" value={formatNumber(distinctSections)} accent="from-emerald-50 via-white to-emerald-100/70" />
          <SummaryTile label="Latest Session" value={latestSessionLabel} accent="from-amber-50 via-white to-amber-100/70" />
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search subject, course, or section"
                className="w-full rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 shadow-sm focus:border-sky-300 focus:outline-none sm:w-64"
              />
              <select
                value={sectionFilter}
                onChange={(event) => setSectionFilter(event.target.value)}
                className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
              >
                {sectionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All Sections" : option}
                  </option>
                ))}
              </select>
              <select
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
              >
                {subjectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All Subjects" : option}
                  </option>
                ))}
              </select>
              <select
                value={dayFilter}
                onChange={(event) => setDayFilter(event.target.value)}
                className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
              >
                {dayOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All Days" : option}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-slate-400">
              {filteredSummaries.length} schedule{filteredSummaries.length === 1 ? "" : "s"}
            </div>
          </div>
        </section>

        {scheduleSessions.length > 0 && (
          <section className="space-y-3">
            {scheduleSessions.map(({ schedule, sessions }) => (
              <article key={`session-card-${schedule.id}`} className="rounded-xl border border-slate-200/70 bg-white px-4 py-4 shadow-sm">
                <header className="flex flex-col gap-1">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {schedule.subjectCode ? `${schedule.subjectCode} · ` : ""}
                    {schedule.subjectName}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {schedule.courseLabel} • {schedule.sectionLabel}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-600">{schedule.scheduleLabel}</p>
                </header>
                <div className="mt-3 grid gap-2 text-[11px] text-slate-600 sm:grid-cols-4">
                  <MetricPill label="Present" value={schedule.id ? aggregateTotals.present : 0} tone="emerald" />
                  <MetricPill label="Absent" value={schedule.id ? aggregateTotals.absent : 0} tone="rose" />
                  <MetricPill label="Late" value={schedule.id ? aggregateTotals.late : 0} tone="amber" />
                  <MetricPill label="Excused" value={schedule.id ? aggregateTotals.excused : 0} tone="sky" />
                </div>
                <div className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                  {sessions.length > 0 ? (
                    sessions.map((session) => (
                      <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-[11px]">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{session.dateLabel}</p>
                          <p className="text-[10px] text-slate-400">Recorded {session.recordedLabel}</p>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[11px]">
                          <Chip tone="emerald" label={`P ${formatNumber(session.present)}`} />
                          <Chip tone="rose" label={`A ${formatNumber(session.absent)}`} />
                          <Chip tone="amber" label={`L ${formatNumber(session.late)}`} />
                          <Chip tone="sky" label={`E ${formatNumber(session.excused)}`} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-slate-400">No sessions match the selected status.</p>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}

        {filteredSummaries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[12px] text-slate-500">
            No attendance summaries match your current filters.
          </div>
        ) : (
          <section className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredSummaries.map(({ schedule, totals }) => (
                <article key={schedule.id} className="rounded-xl border border-slate-200/70 bg-white px-4 py-4 shadow-sm">
                  <header className="flex flex-col gap-1">
                    <h2 className="text-sm font-semibold text-slate-900">
                      {schedule.subjectCode ? `${schedule.subjectCode} · ` : ""}
                      {schedule.subjectName}
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {schedule.courseLabel} • {schedule.sectionLabel}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-600">{schedule.scheduleLabel}</p>
                  </header>
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    <MetricPill label="Present" value={totals.present} tone="emerald" />
                    <MetricPill label="Absent" value={totals.absent} tone="rose" />
                    <MetricPill label="Late" value={totals.late} tone="amber" />
                    <MetricPill label="Excused" value={totals.excused} tone="sky" />
                  </div>
                </article>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
              <h3 className="text-[11px] font-semibold text-slate-700">Session Details</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-[12px] text-slate-600">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-3 py-1.5 text-left">Section</th>
                      <th className="px-3 py-1.5 text-left">Subject</th>
                      <th className="px-3 py-1.5 text-left">Date</th>
                      <th className="px-3 py-1.5 text-left">Schedule</th>
                      <th className="px-3 py-1.5 text-center">Present</th>
                      <th className="px-3 py-1.5 text-center">Absent</th>
                      <th className="px-3 py-1.5 text-center">Late</th>
                      <th className="px-3 py-1.5 text-center">Excused</th>
                      <th className="px-3 py-1.5 text-left">Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionRows.length > 0 ? (
                      sessionRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-medium text-slate-800">{row.sectionLabel}</td>
                          <td className="px-3 py-1.5">
                            <div className="font-medium text-slate-800">{row.subjectDisplay}</div>
                            <div className="text-[10px] text-slate-400">{row.courseLabel}</div>
                          </td>
                          <td className="px-3 py-1.5">{row.dateLabel}</td>
                          <td className="px-3 py-1.5 text-[11px] text-slate-500">{row.scheduleLabel}</td>
                          <td className="px-3 py-1.5 text-center font-semibold text-emerald-600">{row.present}</td>
                          <td className="px-3 py-1.5 text-center font-semibold text-rose-600">{row.absent}</td>
                          <td className="px-3 py-1.5 text-center font-semibold text-amber-600">{row.late}</td>
                          <td className="px-3 py-1.5 text-center font-semibold text-sky-600">{row.excused}</td>
                          <td className="px-3 py-1.5 text-[11px] text-slate-500">{row.recordedLabel}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-3 py-6 text-center text-[12px] text-slate-400">
                          No sessions available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </FacultyLayout>
  );
}

function SummaryTile({ label, value, accent }) {
  return (
    <div className={`rounded-2xl border border-slate-200/70 bg-gradient-to-br px-4 py-3 shadow-sm ${accent}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500/80">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MetricPill({ label, value, tone }) {
  const toneMap = {
    emerald: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200/70 bg-rose-50 text-rose-700",
    amber: "border-amber-200/70 bg-amber-50 text-amber-700",
    sky: "border-sky-200/70 bg-sky-50 text-sky-700",
  };

  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${toneMap[tone] || "border-slate-200/70 bg-slate-50 text-slate-600"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{formatNumber(value)}</p>
    </div>
  );
}

