import React, { useMemo } from "react";
import { Head, router } from "@inertiajs/react";
import FacultyLayout from "@/Layouts/FacultyLayout";
import { UsersThree, ClipboardText, ArrowsClockwise, ArrowRight } from "phosphor-react";

const formatName = (rawName) => {
  if (!rawName) return "Unnamed Student";
  const parts = String(rawName)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length <= 1) {
    return parts[0] || "Unnamed Student";
  }

  const [last, ...rest] = parts;
  return `${last}, ${rest.join(" ")}`.trim();
};

export default function EnrollmentAssessment({
  pendingAssessments = [],
  enrolledAssessments = [],
  courses = [],
  filters = {},
}) {
  const pendingCount = pendingAssessments.length;
  const enrolledCount = enrolledAssessments.length;

  const sortedPending = useMemo(() => {
    return [...pendingAssessments].sort((a, b) => {
      return formatName(a.student_name).localeCompare(formatName(b.student_name));
    });
  }, [pendingAssessments]);

  const sortedEnrolled = useMemo(() => {
    return [...enrolledAssessments].sort((a, b) => {
      return formatName(a.student_name).localeCompare(formatName(b.student_name));
    });
  }, [enrolledAssessments]);

  const handleCourseFilter = (event) => {
    const value = event.target.value;
    const routeParams = value ? { course: value } : {};

    router.visit(route("faculty.evaluation.enrollment"), {
      method: "get",
      data: routeParams,
      preserveState: true,
      preserveScroll: true,
    });
  };

  const handleSubjectLoading = (enrollmentId) => {
    if (!enrollmentId) return;
    router.visit(route("faculty.evaluation.subjectload", { id: enrollmentId }));
  };

  return (
    <FacultyLayout>
      <Head title="Enrollment Assessment" />
      <div className="space-y-6 p-4 md:p-6">
        <header className="rounded-2xl border border-blue-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
                <ClipboardText size={24} />
              </span>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Enrollment Assessment</h1>
                <p className="text-xs text-slate-500">
                  Monitor pending requests and track students who already completed subject loading.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-600">
              <StatPill label="Pending" value={pendingCount} />
              <StatPill label="Enrolled" value={enrolledCount} />
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Pending enrollment requests</h2>
              <p className="text-xs text-slate-500">Select an entry to proceed with subject evaluation and COR printing.</p>
            </div>
            <div className="flex flex-col gap-2 text-xs text-slate-600 md:flex-row md:items-center">
              <label className="flex flex-col text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Course filter
                <select
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={filters.course ?? ""}
                  onChange={handleCourseFilter}
                >
                  <option value="">All authorized courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code ?? course.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => router.reload({ only: ["pendingAssessments", "stats"] })}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <ArrowsClockwise size={14} /> Refresh
              </button>
            </div>
          </header>

          {sortedPending.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-xs text-slate-500">
              <UsersThree size={36} className="text-slate-300" />
              <p>No pending enrollments found for your assigned courses.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Student No.</th>
                    <th className="px-4 py-3 text-left">Course</th>
                    <th className="px-4 py-3 text-left">Year</th>
                    <th className="px-4 py-3 text-left">Semester</th>
                    <th className="px-4 py-3 text-left">Submitted</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedPending.map((entry) => (
                    <tr key={entry.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {formatName(entry.student_name)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{entry.student_number ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.course ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.year_level ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.semester ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {entry.submitted_at ? new Date(entry.submitted_at).toLocaleString("en-PH") : "—"}
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

        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recently evaluated students</h2>
              <p className="text-xs text-slate-500">
                Keep track of students who completed loading. You can reopen their subject load if needed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.reload({ only: ["enrolledAssessments"] })}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <ArrowsClockwise size={14} /> Refresh
            </button>
          </header>

          {sortedEnrolled.length === 0 ? (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-xs text-slate-500">
              <UsersThree size={36} className="text-slate-300" />
              <p>No enrolled records yet. They will appear here after subject loading.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Student No.</th>
                    <th className="px-4 py-3 text-left">Course</th>
                    <th className="px-4 py-3 text-left">Year</th>
                    <th className="px-4 py-3 text-left">Section</th>
                    <th className="px-4 py-3 text-left">Updated</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedEnrolled.map((entry) => (
                    <tr key={entry.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{formatName(entry.student_name)}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.student_number ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.course ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.year_level ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.section ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {entry.updated_at ? new Date(entry.updated_at).toLocaleString("en-PH") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSubjectLoading(entry.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-400"
                        >
                          View load
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
    </FacultyLayout>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value ?? 0}</p>
    </div>
  );
}
