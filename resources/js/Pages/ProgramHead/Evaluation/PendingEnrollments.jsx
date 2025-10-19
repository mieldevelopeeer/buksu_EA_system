import React, { useMemo } from "react";
import { Head, router } from "@inertiajs/react";
import dayjs from "dayjs";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import { UsersThree, FolderOpen, ArrowRight } from "phosphor-react";

export default function PendingEnrollments({ pendingEnrollments = [] }) {
  const processedEnrollments = useMemo(() => {
    const formatName = (rawName) => {
      if (!rawName) return "Unnamed Student";
      const parts = String(rawName).trim().split(/\s+/).filter(Boolean);
      if (parts.length <= 1) {
        return parts[0] || "Unnamed Student";
      }
      const [lastName, ...rest] = parts;
      return `${lastName}, ${rest.join(" ")}`.trim();
    };

    return pendingEnrollments
      .map((entry) => {
        const formattedName = formatName(entry.student_name);
        return {
          ...entry,
          formattedName,
        };
      })
      .sort((a, b) => a.formattedName.localeCompare(b.formattedName, undefined, { sensitivity: "base" }));
  }, [pendingEnrollments]);

  const totalPending = processedEnrollments.length;

  const handleSubjectLoading = (enrollmentId) => {
    if (!enrollmentId) return;
    router.visit(route("program-head.evaluation.subjectload", { id: enrollmentId }));
  };

  return (
    <ProgramHeadLayout>
      <Head title="Pending Subject Loading" />
      <div className="space-y-6">
        <header className="rounded-2xl border border-blue-100 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
                <UsersThree size={24} />
              </span>
              <div className="space-y-1">
                <h1 className="text-lg font-semibold text-slate-900">Pending Subject Loading</h1>
                <p className="text-xs text-slate-500">
                  Review enrollment applications awaiting subject loading. Click an entry to proceed with evaluation.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-right text-xs text-blue-700">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-500">Total Pending</p>
              <p className="mt-1 text-xl font-semibold">{totalPending}</p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {totalPending === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center text-xs text-slate-500">
              <FolderOpen size={40} className="text-slate-300" />
              <p>No pending enrollments found. Great job keeping things up to date!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Student No.</th>
                    <th className="px-4 py-3 text-left">Course</th>
                    <th className="px-4 py-3 text-left">Section</th>
                    <th className="px-4 py-3 text-left">Year</th>
                    <th className="px-4 py-3 text-left">Semester</th>
                    <th className="px-4 py-3 text-left">Submitted</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {processedEnrollments.map((entry) => (
                    <tr key={entry.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-xs text-slate-800">
                        {entry.formattedName || "Unnamed Student"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{entry.student_number || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{entry.course || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{entry.section || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{entry.year_level || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{entry.semester || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {entry.submitted_at ? dayjs(entry.submitted_at).format("MMM DD, YYYY hh:mm A") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSubjectLoading(entry.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-blue-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 transition hover:border-blue-600 hover:text-blue-700"
                        >
                          Load subjects
                          <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </ProgramHeadLayout>
  );
}
