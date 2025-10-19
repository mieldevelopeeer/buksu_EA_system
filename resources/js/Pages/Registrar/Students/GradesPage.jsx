// resources/js/Pages/Registrar/Students/GradesPage.jsx
import React, { useEffect, useState } from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";

export default function GradesPage({
  student = {},
  course = {},
  yearLevel = {},
  section = {},
  semester = {},
  schoolYear = {},
  enrolledSubjects = [],
  creditedSubjects = [],
}) {
  const [loading, setLoading] = useState(true);

  const formatGradeValue = (value) => {
    if (value === null || value === undefined) return "-";
    const num = Number(value);
    if (Number.isNaN(num)) return "-";
    const rounded = Math.round(num * 100) / 100;
    let str = rounded.toFixed(2);
    if (/\.0[1-9]$/.test(str)) {
      str = str.replace(".0", ".");
    }
    str = str.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
    if (str.startsWith("0.")) {
      str = str.substring(1);
    }
    return str;
  };

  const formatStatusLabel = (status) => {
    if (!status) return "Draft";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusTone = (status) => {
    const normalized = (status || "draft").toLowerCase();
    if (normalized === "confirmed") return "text-emerald-600";
    if (normalized === "submitted") return "text-indigo-600";
    if (normalized === "rejected") return "text-rose-600";
    return "text-slate-500";
  };

  // Simulate loading after mount (for smoother UX)
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500); // half-second delay
    return () => clearTimeout(timer);
  }, []);

  // 🔹 Group subjects by Year Level → Semester
  const creditedBySubject = creditedSubjects.reduce((acc, item) => {
    const enrollmentSubjectId = item.enrollment_subject_id ?? item.enrollmentSubjectId;
    if (!enrollmentSubjectId) {
      return acc;
    }

    if (!acc[enrollmentSubjectId]) {
      acc[enrollmentSubjectId] = [];
    }

    acc[enrollmentSubjectId].push(item);
    return acc;
  }, {});

  const groupedSubjects = enrolledSubjects.reduce((acc, subj) => {
    const year = subj.class_schedule?.year_level?.year_level ?? "Unknown Year";
    const sem = subj.class_schedule?.semester?.semester ?? "Unknown Semester";

    if (!acc[year]) acc[year] = {};
    if (!acc[year][sem]) acc[year][sem] = [];
    const midterm = parseFloat(subj.grades?.midterm);
    const final = parseFloat(subj.grades?.final);
    const hasMidterm = !Number.isNaN(midterm);
    const hasFinal = !Number.isNaN(final);
    const numericFinalGrade = hasMidterm && hasFinal
      ? (midterm + final) / 2
      : null;

    const remarks = numericFinalGrade !== null
      ? numericFinalGrade <= 3.0
        ? "Passed"
        : "Failed"
      : subj.grades?.remarks ?? "Incomplete";

    const enrichedSubject = {
      ...subj,
      computedFinalGrade: numericFinalGrade !== null
        ? formatGradeValue(numericFinalGrade)
        : null,
      computedRemarks: remarks,
      creditedSubjects: creditedBySubject[subj.id] ?? [],
      grades: {
        ...subj.grades,
        midterm: hasMidterm ? formatGradeValue(midterm) : subj.grades?.midterm ?? "-",
        final: hasFinal ? formatGradeValue(final) : subj.grades?.final ?? "-",
      },
    };

    acc[year][sem].push(enrichedSubject);

    return acc;
  }, {});

  return (
    <RegistrarLayout>
      <Head title={`Grades - ${student?.fName ?? "Student"}`} />

      <div className="p-4 font-sans text-gray-800 text-xs">
        {/* Back Button */}
        <div className="mb-4">
          <Link
            href={route("registrar.students.grades.list")}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Students List
          </Link>
        </div>

        {loading ? (
          // 🔹 Loading Spinner
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-indigo-500" />
            <span className="text-xs">Loading grades...</span>
          </div>
        ) : (
          <>
            {/* Student Info */}
            <div className="mb-6 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-sm border">
              <h1 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                {student?.fName} {student?.mName} {student?.lName}
              </h1>
              <p className="text-[12px] text-gray-600 mt-1">
                {course?.code} - {course?.name} | {yearLevel?.year_level} |{" "}
                {section?.section}
              </p>
              <p className="text-[11px] text-gray-500">
                {semester?.semester} | SY {schoolYear?.school_year}
              </p>
            </div>

            {/* Grouped Grades */}
            {Object.keys(groupedSubjects).length > 0 ? (
              Object.entries(groupedSubjects).map(([year, semesters]) => (
                <div key={year} className="mb-8">
                  {/* Year Header */}
                  <h2 className="text-[14px] font-semibold text-gray-700 border-b pb-1 mb-3">
                    {year}
                  </h2>

                  {Object.entries(semesters).map(([sem, subjects]) => {
                    const hasCredited = subjects.some(
                      (subj) => (subj.creditedSubjects ?? []).length > 0
                    );

                    return (
                      <div
                        key={sem}
                        className="mb-6 bg-white/70 backdrop-blur-md rounded-lg shadow-sm border"
                      >
                      {/* Semester Header */}
                      <div className="px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                        <h3 className="text-[13px] font-medium text-gray-700 italic">
                          {sem}
                        </h3>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="bg-gray-100 text-blue-600 uppercase text-[11px] tracking-wide">
                              <th className="px-3 py-2 text-left">Code</th>
                              <th className="px-3 py-2 text-left">Subject</th>
                              <th className="px-3 py-2 text-center">Final Grade</th>
                              <th className="px-3 py-2 text-center">Remarks</th>
                              {hasCredited && (
                                <th className="px-3 py-2 text-center">Credited Subjects</th>
                              )}
                              <th className="px-3 py-2 text-center">Midterm Status</th>
                              <th className="px-3 py-2 text-center">Final Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {subjects.map((subj) => {
                              const subject =
                                subj.class_schedule?.curriculum_subject?.subject;
                              const finalGradeValue = subj.computedFinalGrade ?? "-";
                              const remarks = subj.computedRemarks ?? "-";
                              const midtermStatus = subj.grades?.midterm_status ?? "draft";
                              const finalStatus = subj.grades?.final_status ?? midtermStatus;
                              const isPassed = remarks === "Passed";
                              const isFailed = remarks === "Failed";
                              const gradeColorClass = isPassed
                                ? "text-green-600"
                                : isFailed
                                ? "text-red-600"
                                : "text-gray-600";
                              const credited = subj.creditedSubjects ?? [];

                              return (
                                <tr
                                  key={subj.id}
                                  className="hover:bg-indigo-50/40 transition"
                                >
                                  <td className="px-3 py-2 text-gray-700">
                                    {subject?.code ?? "-"}
                                  </td>
                                  <td className="px-3 py-2 text-gray-700">
                                    {subject?.descriptive_title ?? "-"}
                                  </td>
                                  <td className={`px-3 py-2 text-center font-semibold ${gradeColorClass}`}>
                                    {finalGradeValue}
                                  </td>
                                  <td className={`px-3 py-2 text-center font-medium ${gradeColorClass}`}>
                                    {remarks}
                                  </td>
                                  {hasCredited && (
                                    <td className="px-3 py-2 text-center text-[11px] text-gray-600">
                                      {credited.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                          {credited.map((item, idx) => (
                                            <span key={idx} className="block">
                                              {(item.subject?.code ?? "—")}
                                              {item.subject?.descriptive_title || item.subject?.name
                                                ? ` • ${item.subject?.descriptive_title ?? item.subject?.name}`
                                                : ""}
                                            </span>
                                          ))}
                                        </div>
                                      ) : null}
                                    </td>
                                  )}
                                  <td className={`px-3 py-2 text-center font-medium ${getStatusTone(midtermStatus)}`}>
                                    {formatStatusLabel(midtermStatus)}
                                  </td>
                                  <td className={`px-3 py-2 text-center font-medium ${getStatusTone(finalStatus)}`}>
                                    {formatStatusLabel(finalStatus)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {subjects.some((subj) => subj.creditedSubjects && subj.creditedSubjects.length > 0) && (
                        <div className="border-t border-gray-200 bg-yellow-50/60 px-4 py-3 text-[11px] text-yellow-800">
                          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-yellow-900">
                            Credited Subjects
                          </h4>
                          <div className="space-y-2">
                            {subjects.map((subj) => (
                              subj.creditedSubjects && subj.creditedSubjects.length > 0 && (
                                <div key={`credited-${subj.id}`} className="rounded-lg border border-yellow-200 bg-white/80 px-3 py-2">
                                  <p className="text-[11px] font-semibold text-slate-700">
                                    {subj.class_schedule?.curriculum_subject?.subject?.descriptive_title ?? "Subject"}
                                  </p>
                                  <ul className="mt-1 space-y-1 text-[11px] text-slate-600">
                                    {subj.creditedSubjects.map((credited, idx) => (
                                      <li key={idx} className="flex items-center justify-between">
                                        <span>
                                          {credited.subject?.code ?? "—"} • {credited.subject?.descriptive_title ?? credited.subject?.name ?? "Unnamed"}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          Units: {credited.units ?? credited.subject?.units ?? "N/A"}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-gray-400 italic text-xs">
                No subjects enrolled.
              </p>
            )}
          </>
        )}
      </div>
    </RegistrarLayout>
  );
}
