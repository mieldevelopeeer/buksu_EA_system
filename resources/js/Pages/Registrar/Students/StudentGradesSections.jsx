import React from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Head, router } from "@inertiajs/react";
import { ArrowLeft, UsersThree, SquaresFour, BookOpen, ArrowRight } from "phosphor-react";

export default function StudentGradesSections({
  user,
  course,
  year,
  sections = [],
  activeSemester = null,
}) {
  const hasActiveSemester = Boolean(activeSemester?.id);

  const guardActiveSemester = () => {
    if (hasActiveSemester) return true;
    window.alert("No active semester is enabled. Please activate one before reviewing grades.");
    return false;
  };

  const backToCourses = () => {
    if (!guardActiveSemester()) return;
    router.visit(route("registrar.student.grades"));
  };

  const openSection = (sectionId) => {
    if (!guardActiveSemester()) return;
    const params = { course: course.id, year: year.id, section: sectionId };
    if (course.major_id) params.major_id = course.major_id;
    router.visit(route("registrar.student.grades.course.year.section", params));
  };

  return (
    <RegistrarLayout user={user}>
      <Head title={`${course?.code ?? "Course"} • ${year?.label ?? "Year"}`} />
      <div className="mx-auto w-full max-w-5xl px-4 py-5 space-y-5 font-sans text-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={backToCourses}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{course?.code}</p>
              <h1 className="text-base font-semibold text-slate-900">{year?.label ?? "Year Level"}</h1>
              <p className="text-[12px] text-slate-500">{course?.name}</p>
            </div>
          </div>
          {activeSemester && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] text-slate-500 shadow-sm">
              <span className="font-semibold text-slate-700">Active Semester:</span> {activeSemester.semester}
            </div>
          )}
        </div>

        {sections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center text-sm text-slate-400">
            No submitted grades for this year level yet.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
            {sections.map((section, index) => (
              <button
                key={section.section_id}
                type="button"
                onClick={() => openSection(section.section_id)}
                className={`flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-slate-50 ${
                  index !== sections.length - 1 ? "border-b border-slate-100" : ""
                }`}
              >
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-sky-600">
                    {section.section.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Section</p>
                    <h2 className="text-sm font-semibold text-slate-900">{section.section}</h2>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/80 px-2 py-0.5">
                        <SquaresFour size={11} /> {section.subject_count} subjects
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/80 px-2 py-0.5">
                        <UsersThree size={11} /> {section.student_count} students
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/80 px-2 py-0.5">
                        <BookOpen size={11} /> Review
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} className="text-slate-300" />
              </button>
            ))}
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}
