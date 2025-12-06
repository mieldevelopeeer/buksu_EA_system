import React from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import StudentLayout from "@/Layouts/StudentLayout";
import { ArrowLeft, FileText, GraduationCap, Layers } from "lucide-react";

const formatScore = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Check if it's a realistic grade (0-5 or 0-100 scale)
    if (value >= 0 && value <= 100) {
      return value.toFixed(2);
    }
  }
  return "—";
};

const formatTime = (time) => {
  if (!time) return "";
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number(hourStr);
  if (Number.isNaN(hour)) return time;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minuteStr ?? "00"} ${ampm}`;
};

const statusBadgeClass = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "enrolled") return "text-emerald-600";
  if (value === "reserved") return "text-amber-500";
  if (value === "dropped") return "text-rose-500";
  return "text-slate-500";
};

const isActiveSubject = (subject = {}) => {
  const status = String(subject.status || "").toLowerCase();
  return status !== "dropped";
};

const remarkTone = (remarks) => {
  const value = String(remarks || "").toLowerCase();
  if (value.includes("fail")) return "text-rose-600";
  if (value.includes("pass")) return "text-emerald-600";
  return "text-slate-500";
};

const summaryChipTone = (remarks) => {
  const value = String(remarks || "").toLowerCase();
  if (value.includes("fail")) {
    return "border border-rose-200 bg-rose-50 text-rose-600";
  }
  if (value.includes("pass")) {
    return "border border-emerald-200 bg-emerald-50 text-emerald-600";
  }
  return "border border-slate-200 bg-slate-50 text-slate-500";
};

export default function RecordDetail() {
  const {
    record = {},
    groups: rawGroups = [],
    activeEnrollmentId = null,
    subjects = [],
  } = usePage().props;

  const groups = Array.isArray(rawGroups) ? rawGroups : [];
  const enrolledSubjects = Array.isArray(subjects)
    ? subjects.filter((subject) => isActiveSubject(subject))
    : [];

  const hasHistoricalRecords = groups.some(
    (group) =>
      Array.isArray(group?.semesters) &&
      group.semesters.some((term) => Array.isArray(term.subjects) && term.subjects.length > 0)
  );
  const hasSubjects = enrolledSubjects.length > 0;
  const statusCounts = record.status_counts ?? {};

  return (
    <StudentLayout>
      <Head title={`Academic Record · ${record.term_label || "Detail"}`} />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{record.term_label}</h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                {(record.year_level || "Year Level") + " · "}
                {(record.semester || "Semester") + " · " + (record.school_year || "School Year")}
              </p>
            </div>
          </div>
          <Link
            href={route("students.academic-records")}
            className="inline-flex items-center gap-2 text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to records
          </Link>
        </div>

        <section className="mb-8 space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {["enrolled", "reserved", "dropped"].map((key) => (
              <div
                key={`status-${key}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{key}</p>
                <p className={`text-2xl font-semibold ${statusBadgeClass(key)}`}>
                  {statusCounts[key] ?? 0}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Enrolled Subjects</h2>
              <p className="text-xs text-slate-500">
                Detailed view of subjects included in this enrollment.
              </p>
            </div>
            {hasSubjects ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-[12px] text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Code</th>
                      <th className="px-3 py-2 text-left">Subject</th>
                      <th className="px-3 py-2 text-center">Units</th>
                      <th className="px-3 py-2 text-left">Schedule</th>
                      <th className="px-3 py-2 text-left">Room</th>
                      <th className="px-3 py-2 text-left">Faculty</th>
                      <th className="px-3 py-2 text-center">Cumulative</th>
                      <th className="px-3 py-2 text-center">Remarks</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enrolledSubjects.map((subject) => {
                      const schedule = subject.schedule;
                      const scheduleLabel = schedule
                        ? `${schedule.day ?? "TBA"} · ${
                            schedule.start_time ? `${formatTime(schedule.start_time)} – ${formatTime(schedule.end_time)}` : "TBA"
                          }`
                        : "Schedule not set";

                      return (
                        <tr key={`subject-${subject.id}`}>
                          <td className="px-3 py-2 font-semibold text-slate-900">{subject.code}</td>
                          <td className="px-3 py-2">{subject.title}</td>
                          <td className="px-3 py-2 text-center">{Number(subject.units ?? 0).toFixed(1)}</td>
                          <td className="px-3 py-2 text-sm text-slate-500">{scheduleLabel}</td>
                          <td className="px-3 py-2">{schedule?.room ?? "TBA"}</td>
                          <td className="px-3 py-2">{subject.faculty ?? "TBA"}</td>
                          <td className="px-3 py-2 text-center font-semibold text-slate-800">
                            {formatScore(subject.cumulative)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {typeof subject.cumulative === "number" && subject.remarks ? (
                              <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold ${summaryChipTone(subject.remarks)}`}>
                                {subject.remarks}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className={`px-3 py-2 text-center font-semibold ${statusBadgeClass(subject.status)}`}>
                            {subject.status || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No enrolled subjects recorded for this term yet.
              </div>
            )}
          </div>
        </section>

        {!hasHistoricalRecords ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-8 py-16 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
              <GraduationCap className="h-6 w-6" />
            </span>
            <h2 className="text-base font-semibold text-slate-700">No historical records found</h2>
            <p className="max-w-xs text-xs text-slate-500 sm:text-sm">
              Once grades for other terms are available, they will appear below for quick reference.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.year_level} className="space-y-4">
                <header className="flex items-center gap-2 text-slate-600">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                    <Layers className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{group.year_level}</h2>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {group.semesters.length} term{group.semesters.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </header>

                <div className="space-y-4">
                  {group.semesters.map((term) => {
                    const isActive = Number(term.enrollment_id) === Number(activeEnrollmentId);
                    const termSubjects = Array.isArray(term.subjects)
                      ? term.subjects.filter((subject) => isActiveSubject(subject))
                      : [];

                    return (
                      <div
                        key={`${group.year_level}-${term.enrollment_id}`}
                        className={`rounded-2xl border ${
                          isActive
                            ? "border-indigo-200 bg-white shadow-lg shadow-indigo-100"
                            : "border-slate-200 bg-white/90 shadow-sm"
                        }`}
                      >
                        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
                              {term.semester || "Semester"}
                            </h3>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                              {group.year_level}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:text-sm">
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                              Avg {formatScore(term.average)}
                            </span>
                            {term.remarks_summary && (
                              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm ${summaryChipTone(term.remarks_summary)}`}>
                                {term.remarks_summary}
                              </span>
                            )}
                            {isActive && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-600">
                                Current term
                              </span>
                            )}
                          </div>
                        </div>

                        {termSubjects.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-slate-400">
                            No confirmed grades for this term yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <div className="min-w-full align-middle">
                              <table className="w-full min-w-[620px] overflow-hidden rounded-2xl border border-slate-200 text-left text-[13px] text-slate-600 shadow-sm">
                                <thead className="bg-slate-100/80 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                  <tr>
                                    <th className="px-4 py-3 font-semibold">Subject</th>
                                    <th className="px-3 py-3 text-center font-semibold">Cumulative</th>
                                    <th className="px-3 py-3 text-center font-semibold">Remarks</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/70">
                                  {termSubjects.map((subject, index) => {
                                    const remarksLabel = subject.remarks || "Pending";
                                    const rowBase = index % 2 === 0 ? "bg-white" : "bg-slate-50/70";
                                    const rowClass = remarksLabel.toLowerCase().includes("fail")
                                      ? "bg-rose-50/60"
                                      : rowBase;

                                    return (
                                      <tr key={`${subject.code}-${index}`} className={`transition hover:bg-slate-50 ${rowClass}`}>
                                        <td className="px-4 py-3 align-top">
                                          <p className="text-sm font-semibold text-slate-900 sm:text-base">
                                            {subject.title || "Untitled Subject"}
                                          </p>
                                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                            {subject.code || "—"}
                                          </p>
                                        </td>
                                        <td className="px-3 py-3 text-center text-sm font-semibold text-slate-700 sm:text-base">
                                          {formatScore(subject.cumulative)}
                                        </td>
                                        <td className="px-3 py-3 text-center sm:text-base">
                                          <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold ${summaryChipTone(remarksLabel)}`}>
                                            {remarksLabel}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
