import React, { useEffect, useState } from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Head, router } from "@inertiajs/react";
import { GraduationCap, ArrowRight, ArrowUpRight } from "phosphor-react";

const YEAR_TEMPLATES = [
  { key: "first", label: "First Year" },
  { key: "second", label: "Second Year" },
  { key: "third", label: "Third Year" },
  { key: "fourth", label: "Fourth Year" },
];

const normalizeYearLabel = (label = "") => {
  const lower = label.toLowerCase();
  if (lower.includes("first") || lower.includes("1st")) return "first";
  if (lower.includes("second") || lower.includes("2nd")) return "second";
  if (lower.includes("third") || lower.includes("3rd")) return "third";
  if (lower.includes("fourth") || lower.includes("4th")) return "fourth";
  return null;
};

const mapYearsToTemplate = (years = []) => {
  const lookup = years.reduce((acc, year) => {
    const normalized = normalizeYearLabel(year.label);
    if (normalized && !acc[normalized]) {
      acc[normalized] = year;
    }
    return acc;
  }, {});

  return YEAR_TEMPLATES.map((template) => ({
    key: template.key,
    label: template.label,
    year: lookup[template.key] || null,
  }));
};

export default function StudentGrades({ user, courses = [], activeSemester = null }) {
  const [collapsedCourses, setCollapsedCourses] = useState({});
  const [collapsedYears, setCollapsedYears] = useState({});
  const hasActiveSemester = Boolean(activeSemester?.id);

  // Hydrate collapse state from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("registrar_student_grades_collapsed");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          setCollapsedCourses(parsed);
        }
      }
    } catch (error) {
      console.warn("[StudentGrades] Failed to parse collapsed state", error);
    }
  }, []);

  // Hydrate year collapse state
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("registrar_student_grades_year_collapsed");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          setCollapsedYears(parsed);
        }
      }
    } catch (error) {
      console.warn("[StudentGrades] Failed to parse year collapse state", error);
    }
  }, []);

  // Persist collapse state whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("registrar_student_grades_collapsed", JSON.stringify(collapsedCourses));
  }, [collapsedCourses]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("registrar_student_grades_year_collapsed", JSON.stringify(collapsedYears));
  }, [collapsedYears]);

  const guardActiveSemester = () => {
    if (hasActiveSemester) return true;
    window.alert("No active semester is enabled. Please activate a semester in Registrar → Semester before reviewing grades.");
    return false;
  };

  const openYear = (course, year) => {
    if (!guardActiveSemester()) return;
    const params = { course: course.course_id, year: year.year_id };
    if (course.major_id) params.major_id = course.major_id;
    router.visit(route("registrar.student.grades.course.year", params));
  };

  const openSection = (course, year, section) => {
    if (!guardActiveSemester()) return;
    const params = {
      course: course.course_id,
      year: year.year_id,
      section: section.section_id,
    };
    if (course.major_id) params.major_id = course.major_id;
    router.visit(route("registrar.student.grades.course.year.section", params));
  };

  const toggleCourse = (key) => {
    setCollapsedCourses((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleYear = (key) => {
    setCollapsedYears((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <RegistrarLayout user={user}>
      <Head title="Student Grades" />
      <div className="mx-auto w-full max-w-5xl px-4 py-5 space-y-5 font-sans text-slate-700">
        <div className="flex flex-col gap-2 border-b border-slate-200/70 pb-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
              <GraduationCap size={20} />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900">Student Grades</h1>
              <p className="text-[11px] text-slate-500">Navigate by course → year → section.</p>
            </div>
          </div>
          {activeSemester ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-[11px] text-slate-500 shadow-sm">
              <span className="font-semibold text-slate-700">Active Semester:</span> {activeSemester.semester}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-1 text-[11px] font-semibold text-amber-700 shadow-sm">
              ⚠️ No active semester. Please enable one to review grades.
            </div>
          )}
        </div>

        {!hasActiveSemester && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
            Grade review routes are disabled while no semester is active. Go to Registrar → Semester and toggle a semester on before proceeding.
          </div>
        )}

        {courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center text-sm text-slate-400">
            No submitted grades for the active semester yet.
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => {
              const templateYears = mapYearsToTemplate(course.years);
              return (
              <div
                key={`${course.course_id}-${course.major_id ?? "none"}`}
                className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Course</p>
                    <h2 className="text-lg font-semibold text-slate-900">{course.course_code}</h2>
                    <p className="text-[12px] text-slate-500">{course.course_name}</p>
                    {course.major_name && (
                      <p className="text-[10px] text-amber-600">Major · {course.major_name}</p>
                    )}
                  </div>
                  <div className="ml-auto text-right text-[11px] text-slate-500">
                    <p>{course.year_count} years · {course.section_count} sections</p>
                    <p>{course.student_count} students</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCourse(`${course.course_id}-${course.major_id ?? "none"}`)}
                    className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[10px] font-medium text-slate-600 hover:border-slate-300"
                  >
                    {collapsedCourses[`${course.course_id}-${course.major_id ?? "none"}`] ? "Expand" : "Collapse"}
                    <ArrowRight
                      size={12}
                      className={`transition ${collapsedCourses[`${course.course_id}-${course.major_id ?? "none"}`] ? "rotate-90" : ""}`}
                    />
                  </button>
                </div>

                {!collapsedCourses[`${course.course_id}-${course.major_id ?? "none"}`] && (
                  <div className="mt-3 space-y-3">
                    {templateYears.map(({ key, label, year }) => {
                      const yearToggleKey = `${course.course_id}-${course.major_id ?? "none"}-${key}`;
                      const isYearCollapsed = collapsedYears[yearToggleKey];
                      return (
                      <div
                        key={`${course.course_id}-${key}`}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.35em] text-slate-400">Year Level</p>
                            <h3 className="text-sm font-semibold text-slate-900">{year?.label || label}</h3>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {year ? (
                                <>
                                  {year.section_count} sections · {year.student_count} students
                                </>
                              ) : (
                                "No submissions yet"
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleYear(yearToggleKey)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[10px] font-medium text-slate-600 hover:border-slate-300"
                            >
                              {isYearCollapsed ? "Expand" : "Collapse"}
                              <ArrowRight size={12} className={`transition ${isYearCollapsed ? "rotate-90" : ""}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => year && openYear(course, year)}
                              disabled={!year}
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold shadow-sm ${
                                year
                                  ? "border border-sky-200 bg-white text-sky-600 hover:border-sky-300"
                                  : "border border-slate-200 bg-white text-slate-400 cursor-not-allowed"
                              }`}
                            >
                              View Year <ArrowUpRight size={14} />
                            </button>
                          </div>
                        </div>

                        {!isYearCollapsed && year?.sections?.length ? (
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            {year.sections.map((section) => (
                              <button
                                key={`${section.section_id}`}
                                type="button"
                                onClick={() => openSection(course, year, section)}
                                className="flex flex-col rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-[9px] uppercase tracking-[0.3em] text-slate-400">Section</p>
                                    <p className="text-sm font-semibold text-slate-900">{section.section}</p>
                                  </div>
                                  <ArrowRight size={14} className="text-slate-400" />
                                </div>
                                <p className="mt-2 text-[11px] text-slate-500">{section.subject_count} subjects · {section.student_count} students</p>
                              </button>
                            ))}
                          </div>
                        ) : !isYearCollapsed ? (
                          <p className="mt-3 rounded-xl border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400">
                            {year ? "No sections available for this year yet." : "Awaiting grade submissions for this year."}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}
