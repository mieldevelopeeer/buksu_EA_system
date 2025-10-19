import React from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import StudentLayout from "@/Layouts/StudentLayout";
import { Folder, GraduationCap, Layers, Sparkles } from "lucide-react";

const statusTone = (summary) => {
  const value = String(summary || "").toLowerCase();
  if (value.includes("fail")) return "text-rose-600";
  if (value.includes("mixed")) return "text-amber-500";
  if (value.includes("pass")) return "text-emerald-600";
  return "text-slate-500";
};

const formatAverage = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—";

export default function AcademicRecord() {
  const { groups = [] } = usePage().props;

  return (
    <StudentLayout>
      <Head title="Academic Records" />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Folder className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Academic Records</h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                Review your historical grades by year level and semester.
              </p>
            </div>
          </div>
        </header>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-8 py-16 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
              <GraduationCap className="h-6 w-6" />
            </span>
            <h2 className="text-base font-semibold text-slate-700">No records yet</h2>
            <p className="max-w-xs text-xs text-slate-500 sm:text-sm">
              Once grades are confirmed each term, they will appear here grouped by academic year.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => {
              const label = group.year_level || "Year Level";

              return (
                <section key={label} className="space-y-4">
                  <header className="flex items-center gap-2 text-slate-600">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                      <Layers className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{label}</h2>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        {group.records.length} term{group.records.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </header>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.records.map((record) => {
                      const schoolYear = record.school_year || "School Year";

                      return (
                      <Link
                        key={record.enrollment_id}
                        href={route("students.academic-records.show", record.enrollment_id)}
                        className="block rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                      >
                        <div className="flex flex-col gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">{schoolYear}</h3>
                            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                              {record.subjects_count} subjects · Average {formatAverage(record.average)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500 sm:text-sm">
                            <div className={`font-semibold ${statusTone(record.remarks_summary)}`}>
                              {record.remarks_summary}
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500">
                              <Sparkles className="h-3.5 w-3.5" />
                              View Details
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
