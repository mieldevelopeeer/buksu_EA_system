import React, { useMemo } from "react";
import FacultyLayout from "@/Layouts/FacultyLayout";
import { Head, router } from "@inertiajs/react";
import { Users, ClipboardCheck, ArrowRight } from "lucide-react";

export default function StudentAttendance({ sections = [], students = [] }) {
  const sectionsWithCounts = useMemo(() => {
    if (!Array.isArray(sections)) return [];

    return sections.map((section) => {
      const { course_alias, major_alias } = section;
      const aliasPart = [course_alias, major_alias].filter(Boolean).join(" ");
      const composedLabel = aliasPart
        ? [aliasPart, section.section].filter(Boolean).join(" - ")
        : section.section;

      const studentCount = students.filter(
        (student) => student.section_id === section.id
      ).length;

      return {
        ...section,
        displayName: composedLabel || section.section,
        studentCount,
      };
    });
  }, [sections, students]);

  const handleNavigate = (sectionId) => {
    if (!sectionId) return;

    router.visit(route("faculty.attendance.records", sectionId));
  };

  return (
    <FacultyLayout>
      <Head title="Student Attendance" />
      <div className="space-y-6 p-5">
        <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-100 px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4 text-slate-700">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <ClipboardCheck size={24} />
              </span>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Attendance sections
                </h1>
                <p className="text-sm text-slate-500">
                  Organize daily check-ins by selecting a class card below.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-center text-sm text-slate-600">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Total sections
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-700">
                  {sectionsWithCounts.length}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200/60 bg-white px-6 py-6 shadow-sm">
          {sectionsWithCounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-9 text-center text-sm text-slate-500">
              No sections available at the moment.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {sectionsWithCounts.map((section, index) => {
                const palette = [
                  {
                    surface: "bg-gradient-to-br from-emerald-50 via-emerald-100/80 to-white",
                    badgeBorder: "border-emerald-400",
                    badgeText: "text-emerald-700",
                    tag: "text-emerald-600",
                    hover: "hover:border-emerald-400 hover:shadow-[0_20px_40px_-18px_rgba(16,185,129,0.55)] hover:ring-2 hover:ring-emerald-200/60",
                    icon: "bg-emerald-500/90 text-white",
                  },
                  {
                    surface: "bg-gradient-to-br from-sky-50 via-sky-100/80 to-white",
                    badgeBorder: "border-sky-400",
                    badgeText: "text-sky-700",
                    tag: "text-sky-600",
                    hover: "hover:border-sky-400 hover:shadow-[0_20px_40px_-18px_rgba(14,165,233,0.55)] hover:ring-2 hover:ring-sky-200/60",
                    icon: "bg-sky-500/90 text-white",
                  },
                  {
                    surface: "bg-gradient-to-br from-amber-50 via-amber-100/80 to-white",
                    badgeBorder: "border-amber-400",
                    badgeText: "text-amber-700",
                    tag: "text-amber-600",
                    hover: "hover:border-amber-400 hover:shadow-[0_20px_40px_-18px_rgba(245,158,11,0.55)] hover:ring-2 hover:ring-amber-200/60",
                    icon: "bg-amber-500/90 text-white",
                  },
                ][index % 3];

                return (
                  <button
                    key={section.id}
                    onClick={() => handleNavigate(section.id)}
                    className={`group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 text-left shadow-sm transition hover:-translate-y-0.5 ${palette.surface} ${palette.hover}`}
                  >
                    <div className="flex w-full items-center justify-between px-4 pt-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-[11px] font-medium shadow-sm transition ${palette.badgeBorder} ${palette.badgeText}`}
                      >
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${palette.icon}`}>
                          {section.displayName?.charAt(0) || section.section?.charAt(0) || "S"}
                        </span>
                        {section.displayName || section.section || "Section"}
                      </span>
                      <ArrowRight size={18} className="text-slate-300 transition group-hover:text-slate-500" />
                    </div>

                    <div className="px-4 pb-4 pt-3">
                      <p className="text-base font-semibold text-slate-800">
                        {section.section || "Unnamed Section"}
                      </p>
                      <p className={`mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 ${palette.tag}`}>
                        {section.studentCount}
                        {section.studentCount === 1 ? " student" : " students"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </FacultyLayout>
  );
}
