import React from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import StudentLayout from "@/Layouts/StudentLayout";
import { ArrowLeft, FileText, GraduationCap, Layers } from "lucide-react";

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

export default function RecordDetail() {
  const {
    record = {},
    groups = [],
    activeEnrollmentId = null,
  } = usePage().props;

  const hasAnySubjects = groups.some((group) =>
    group.semesters.some((term) => Array.isArray(term.subjects) && term.subjects.length > 0)
  );

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

        {!hasAnySubjects ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-8 py-16 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
              <GraduationCap className="h-6 w-6" />
            </span>
            <h2 className="text-base font-semibold text-slate-700">No subjects found</h2>
            <p className="max-w-xs text-xs text-slate-500 sm:text-sm">
              We couldn’t find any confirmed grades for this record yet. Please check back later.
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
                    const subjects = Array.isArray(term.subjects) ? term.subjects : [];

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

                        {subjects.length === 0 ? (
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
                                  {subjects.map((subject, index) => {
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
