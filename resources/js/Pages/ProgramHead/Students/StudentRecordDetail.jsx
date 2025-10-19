import React from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import { ArrowLeft, FileText, GraduationCap, Stack } from "phosphor-react";

const formatScore = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—";

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

export default function StudentRecordDetail() {
  const {
    record = {},
    groups = [],
    activeEnrollmentId = null,
    student = null,
    history = [],
    activeSubjects = [],
  } = usePage().props;

  const hasAnySubjects = groups.some((group) =>
    group.semesters.some(
      (term) => Array.isArray(term.subjects) && term.subjects.length > 0
    )
  );

  const studentName = student
    ? `${student.lName || ""}, ${student.fName || ""} ${student.mName || ""}`
        .replace(/\s+/g, " ")
        .trim()
    : null;

  const historyExists = Array.isArray(history) && history.length > 0;
  const activeSubjectsExist = Array.isArray(activeSubjects) && activeSubjects.length > 0;

  return (
    <ProgramHeadLayout>
      <Head title={`Student Record · ${record.term_label || "Detail"}`} />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
              <FileText size={18} />
            </span>
            <div className="space-y-1">
              <div className="text-lg font-semibold text-slate-900">{record.term_label}</div>
              <div className="text-sm text-slate-600">
                {record.year_level || "Year Level"} · {record.semester || "Semester"} · {record.school_year || "School Year"}
              </div>
              {studentName && (
                <div className="text-sm text-slate-500">
                  {studentName} (ID: {student?.id_number || "—"})
                </div>
              )}
            </div>
          </div>

          <Link
            href={route("program-head.academic-records.index")}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-600 shadow-sm transition hover:text-indigo-500"
          >
            <ArrowLeft size={14} />
            Back to list
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 text-xs">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
            {history.length} enrollment{history.length === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
            {groups.reduce((count, group) => count + group.semesters.length, 0)} term view{groups.reduce((count, group) => count + group.semesters.length, 0) === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
            {activeSubjects.length} subject{activeSubjects.length === 1 ? "" : "s"} this term
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
            {activeSubjects.filter((subject) => subject.status?.toLowerCase() === "credited").length} credited subject{activeSubjects.filter((subject) => subject.status?.toLowerCase() === "credited").length === 1 ? "" : "s"}
          </span>
        </div>

        {historyExists && (
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2 text-slate-700">
                <Stack size={16} />
                <h2 className="text-sm font-semibold">Enrollment history</h2>
              </div>
              <span className="text-xs text-slate-400">Most recent first</span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm text-slate-700">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Term</th>
                    <th className="px-4 py-2">Year Level</th>
                    <th className="px-4 py-2">Course</th>
                    <th className="px-4 py-2 text-center">Average</th>
                    <th className="px-4 py-2 text-center">Remarks</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((entry) => (
                    <tr key={entry.id} className={entry.is_active ? "bg-indigo-50/60" : "bg-white"}>
                      <td className="px-4 py-2 font-medium text-slate-900">{entry.term_label}</td>
                      <td className="px-4 py-2">{entry.year_level || "—"}</td>
                      <td className="px-4 py-2">{entry.course?.code || "—"}</td>
                      <td className="px-4 py-2 text-center font-semibold text-slate-700">
                        {formatScore(entry.average)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${summaryChipTone(entry.remarks_summary)}`}>
                          {entry.remarks_summary || "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center text-xs font-semibold text-slate-600">
                        {entry.is_active ? "Current" : entry.status || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeSubjectsExist && (
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2 text-slate-700">
                <GraduationCap size={16} />
                <h2 className="text-sm font-semibold">Subjects this term</h2>
              </div>
              <span className="text-xs text-slate-400">From confirmed grades</span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm text-slate-700">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Subject</th>
                    <th className="px-4 py-2">Code</th>
                    <th className="px-4 py-2">Term</th>
                    <th className="px-4 py-2 text-center">Cumulative</th>
                    <th className="px-4 py-2 text-center">Remarks</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeSubjects.map((subject, index) => (
                    <tr key={`${subject.code}-${index}`}>
                      <td className="px-4 py-2 font-medium text-slate-900">{subject.title || "Untitled Subject"}</td>
                      <td className="px-4 py-2 text-slate-500">{subject.code || "—"}</td>
                      <td className="px-4 py-2 text-slate-500">
                        {subject.semester || "Semester"} · {subject.school_year || "School Year"}
                      </td>
                      <td className="px-4 py-2 text-center text-sm text-slate-500">
                        Mid {formatScore(subject.midterm)} · Final {formatScore(subject.final)}
                        <div className="text-sm font-semibold text-slate-700">
                          {(subject.midterm != null && subject.final != null)
                            ? formatScore((Number(subject.midterm) + Number(subject.final)) / 2)
                            : formatScore(subject.cumulative)}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {subject.midterm != null && subject.final != null ? (
                          <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${summaryChipTone(subject.remarks || "Pending")}`}>
                            {subject.remarks || "Pending"}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center text-xs font-semibold text-slate-600">
                        {subject.status ? subject.status.replace(/_/g, " ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!hasAnySubjects ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-8 py-16 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
              <GraduationCap size={24} />
            </span>
            <h2 className="text-base font-semibold text-slate-700">No subjects found</h2>
            <p className="max-w-xs text-sm text-slate-500">
              We couldn’t find any confirmed grades for this record yet. Please check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.year_level} className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-slate-700">
                  <div className="flex items-center gap-2">
                    <Stack size={16} />
                    <h3 className="text-sm font-semibold">{group.year_level}</h3>
                  </div>
                  <span className="text-xs text-slate-400">{group.semesters.length} term{group.semesters.length === 1 ? "" : "s"}</span>
                </header>

                <div className="divide-y divide-slate-100">
                  {group.semesters.map((term) => {
                    const isActive = Number(term.enrollment_id) === Number(activeEnrollmentId);
                    const subjects = Array.isArray(term.subjects) ? term.subjects : [];

                    return (
                      <div key={`${group.year_level}-${term.enrollment_id}`} className={isActive ? "bg-indigo-50/40" : "bg-white"}>
                        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-slate-900">{term.semester || "Semester"}</div>
                            <div className="text-sm text-slate-500">Average {formatScore(term.average)}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {term.remarks_summary && (
                              <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 font-semibold ${summaryChipTone(term.remarks_summary)}`}>
                                {term.remarks_summary}
                              </span>
                            )}
                            {isActive && (
                              <span className="inline-flex items-center justify-center rounded-full border border-indigo-200 px-3 py-1 font-semibold text-indigo-600">
                                Current term
                              </span>
                            )}
                          </div>
                        </div>

                        {subjects.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-slate-400">
                            No confirmed grades for this term yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto border-t border-slate-200">
                            <table className="w-full min-w-[520px] border-collapse text-sm text-slate-700">
                              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                                <tr>
                                  <th className="px-4 py-2">Subject</th>
                                  <th className="px-4 py-2 text-center">Cumulative</th>
                                  <th className="px-4 py-2 text-center">Remarks</th>
                                  <th className="px-4 py-2 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {subjects.map((subject, index) => (
                                  <tr key={`${subject.code}-${index}`}>
                                    <td className="px-4 py-2">
                                      <div className="text-sm font-semibold text-slate-900">{subject.title || "Untitled Subject"}</div>
                                      <div className="text-xs text-slate-500">{subject.code || "—"}</div>
                                    </td>
                                    <td className="px-4 py-2 text-center text-sm text-slate-500">
                                      Mid {formatScore(subject.midterm)} · Final {formatScore(subject.final)}
                                      <div className="text-sm font-semibold text-slate-700">
                                        {(subject.midterm != null && subject.final != null)
                                          ? formatScore((Number(subject.midterm) + Number(subject.final)) / 2)
                                          : formatScore(subject.cumulative)}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {subject.midterm != null && subject.final != null ? (
                                        <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${summaryChipTone(subject.remarks || "Pending")}`}>
                                          {subject.remarks || "Pending"}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-slate-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-center text-xs font-semibold text-slate-600">
                                      {subject.status ? subject.status.replace(/_/g, " ") : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
    </ProgramHeadLayout>
  );
}
