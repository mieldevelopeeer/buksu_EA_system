import React from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Head, router } from "@inertiajs/react";
import { ArrowLeft, ArrowRight, UsersThree, SquaresFour, BookOpen } from "phosphor-react";

export default function StudentGradesSectionSubjects({
  user,
  course,
  year,
  section,
  subjects = [],
  activeSemester = null,
}) {
  const hasActiveSemester = Boolean(activeSemester?.id);

  const guardActiveSemester = () => {
    if (hasActiveSemester) return true;
    window.alert("No active semester is enabled. Please activate one before reviewing grades.");
    return false;
  };

  const backToSections = () => {
    if (!guardActiveSemester()) return;
    const params = { course: course.id, year: year.id };
    if (course.major_id) params.major_id = course.major_id;
    router.visit(route("registrar.student.grades.course.year", params));
  };

  const reviewSubject = (subjectId) => {
    if (!guardActiveSemester()) return;
    const params = {
      course: course.id,
      year: year.id,
      section: section.id,
      subject: subjectId,
    };
    if (course.major_id) params.major_id = course.major_id;
    router.visit(route("registrar.student.grades.course.year.section.subject", params));
  };

  return (
    <RegistrarLayout user={user}>
      <Head title={`${section?.name ?? "Section"} • Subjects`} />
      <div className="mx-auto w-full max-w-4xl px-4 py-5 space-y-5 font-sans text-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={backToSections}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{course?.code}</p>
              <h1 className="text-base font-semibold text-slate-900">{section?.name}</h1>
              <p className="text-[12px] text-slate-500">{year?.label}</p>
            </div>
          </div>
          {activeSemester ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] text-slate-500 shadow-sm">
              <span className="font-semibold text-slate-700">Active Semester:</span> {activeSemester.semester}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-700 shadow-sm">
              ⚠️ No active semester. Please enable one to review grades.
            </div>
          )}
        </div>

        {!hasActiveSemester && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
            Grade review routes are disabled while no semester is active. Go to Registrar → Semester and toggle a semester on before proceeding.
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 text-[11px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-[10px]">
              <SquaresFour size={12} className="text-slate-400" /> {section?.subject_count ?? 0} subjects
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-[10px]">
              <UsersThree size={12} className="text-slate-400" /> {section?.student_count ?? 0} students
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-[10px]">
              <BookOpen size={12} className="text-slate-400" /> Ready for review
            </span>
          </div>
        </div>

        {subjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center text-sm text-slate-400">
            No submitted subjects for this section yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {subjects.map((subject) => (
              <div
                key={subject.class_schedule_id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Subject</p>
                    <h2 className="text-sm font-semibold text-slate-900">{subject.subject}</h2>
                    <p className="text-[12px] text-slate-500">Faculty • {subject.faculty}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => reviewSubject(subject.class_schedule_id)}
                    className="inline-flex items-center gap-1 rounded-full border border-sky-200 px-3 py-1 text-[11px] font-semibold text-sky-600 transition hover:border-sky-300"
                  >
                    Review <ArrowRight size={13} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/70 px-2 py-0.5">
                    <UsersThree size={11} /> {subject.student_count} students
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}
