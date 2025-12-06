import React from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Head, router } from "@inertiajs/react";
import { ArrowLeft, ArrowRight, StackSimple, SquaresFour, UsersThree } from "phosphor-react";

export default function StudentGradesCourse({ user, course, years = [], activeSemester = null }) {
  const backToCourses = () => router.visit(route("registrar.student.grades"));

  const openYear = (year) => {
    const params = { course: course.id, year: year.year_id };
    if (course.major_id) params.major_id = course.major_id;
    router.visit(route("registrar.student.grades.course.year", params));
  };

  return (
    <RegistrarLayout user={user}>
      <Head title={`${course?.code ?? "Course"} • Student Grades`} />
      <div className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6 font-sans text-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={backToCourses}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Course</p>
              <h1 className="text-lg font-semibold text-slate-900">{course?.code ?? "--"}</h1>
              <p className="text-sm text-slate-500">{course?.name ?? ""}</p>
              {course?.major_name && (
                <p className="text-xs font-semibold text-amber-600">Major • {course.major_name}</p>
              )}
            </div>
          </div>
          {activeSemester && (
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-[11px] text-slate-500 shadow-sm">
              <span className="font-semibold text-slate-700">Active Semester:</span> {activeSemester.semester}
            </div>
          )}
        </div>

        {years.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center text-sm text-slate-400">
            No submitted grades for this course yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {years.map((year) => (
              <div
                key={year.year_id ?? year.label}
                className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100/70 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Year level</p>
                  <h2 className="text-lg font-semibold text-slate-900">{year.label}</h2>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold">
                  <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-center">
                    <SquaresFour size={16} className="mx-auto mb-1 text-slate-400" />
                    <p className="text-slate-600">{year.section_count}</p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Sections</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-center">
                    <UsersThree size={16} className="mx-auto mb-1 text-slate-400" />
                    <p className="text-slate-600">{year.student_count}</p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Students</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-center">
                    <StackSimple size={16} className="mx-auto mb-1 text-slate-400" />
                    <p className="text-slate-600">{year.section_count > 0 ? Math.round(year.student_count / year.section_count) : 0}</p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Avg / Sec</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openYear(year)}
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700"
                >
                  View Sections <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}
