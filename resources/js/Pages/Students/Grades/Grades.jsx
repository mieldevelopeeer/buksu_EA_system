import React, { useEffect, useMemo, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import StudentLayout from "@/Layouts/StudentLayout";
import { BookOpen, Calendar, Layers } from "lucide-react";

const gradeTone = (remarks) => {
  const value = String(remarks || "").toLowerCase();
  if (value === "passed") return "text-green-600";
  if (value === "failed") return "text-red-600";
  return "text-gray-500";
};

const formatScore = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Check if it's a realistic grade (0-5 or 0-100 scale)
    if (value >= 0 && value <= 100) {
      return value.toFixed(2);
    }
  }
  return "—";
};

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildTermKey = (entry = {}) => {
  const parts = [entry.school_year_start, entry.school_year_end, entry.semester_label || entry.school_year]
    .filter(Boolean)
    .map(String);
  return parts.length ? parts.join("|") : null;
};

export default function Grades() {
  const { grades = [] } = usePage().props;
  const today = useMemo(() => new Date(), []);

  const terms = useMemo(() => {
    const unique = new Map();
    grades.forEach((grade) => {
      const key = buildTermKey(grade);
      if (!key || unique.has(key)) return;
      unique.set(key, {
        key,
        label: grade.semester_label || "Semester",
        schoolYear: grade.school_year || "—",
        startDate: parseDate(grade.school_year_start),
        endDate: parseDate(grade.school_year_end),
      });
    });

    return Array.from(unique.values()).sort((a, b) => {
      const aTime = a.startDate ? a.startDate.getTime() : -Infinity;
      const bTime = b.startDate ? b.startDate.getTime() : -Infinity;
      return bTime - aTime;
    });
  }, [grades]);

  const defaultTermKey = useMemo(() => {
    if (!terms.length) return null;
    const current = terms.find((term) => term.startDate && term.endDate && term.startDate <= today && today <= term.endDate);
    return current?.key ?? terms[0].key;
  }, [terms, today]);

  const [activeTermKey, setActiveTermKey] = useState(defaultTermKey);

  useEffect(() => {
    setActiveTermKey(defaultTermKey);
  }, [defaultTermKey]);

  const activeTerm = useMemo(() => terms.find((term) => term.key === activeTermKey) ?? null, [terms, activeTermKey]);

  const filteredGrades = useMemo(() => {
    if (!activeTermKey) return grades;
    return grades.filter((grade) => buildTermKey(grade) === activeTermKey);
  }, [grades, activeTermKey]);

  return (
    <StudentLayout>
      <Head title="My Grades" />

      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="flex items-center gap-2 text-lg md:text-xl font-semibold text-gray-800">
            <BookOpen className="w-5 h-5 text-blue-600" />
            My Grades
          </h1>
        </div>

        {terms.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {terms.map((term) => (
              <button
                key={term.key}
                type="button"
                onClick={() => setActiveTermKey(term.key)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  activeTermKey === term.key
                    ? "border-blue-300 bg-blue-600 text-white shadow"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {term.label} · {term.schoolYear}
              </button>
            ))}
          </div>
        )}

        {activeTerm && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            <span>
              {activeTerm.label} · {activeTerm.schoolYear}
            </span>
            {activeTerm.startDate && activeTerm.endDate && (
              <span className="text-slate-400">
                ({activeTerm.startDate.toLocaleDateString()} – {activeTerm.endDate.toLocaleDateString()})
              </span>
            )}
          </div>
        )}

        {grades.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm p-4 rounded-md shadow-sm text-center">
            No grades available yet.
          </div>
        ) : filteredGrades.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 text-slate-500 text-sm p-4 rounded-md text-center">
            No grades recorded for the selected term yet.
          </div>
        ) : (
          <div className="overflow-x-auto bg-white shadow rounded-lg border border-gray-200">
            <table className="min-w-full text-[12px] md:text-sm text-gray-700">
              <thead className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 uppercase tracking-wider text-xs md:text-sm">
                <tr>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Subject</th>
                  <th className="px-3 py-2 text-left">Year / Term</th>
                  <th className="px-3 py-2 text-center">Midterm</th>
                  <th className="px-3 py-2 text-center">Final</th>
                  <th className="px-3 py-2 text-center">Cumulative</th>
                  <th className="px-3 py-2 text-center">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrades.map((g, index) => {
                  const cumulativeValue = (() => {
                    // If we have a cumulative value from backend, use it only if it's valid
                    if (typeof g.cumulative === "number" && Number.isFinite(g.cumulative) && 
                        g.cumulative >= 0 && g.cumulative <= 100) {
                      return g.cumulative;
                    }
                    // Only calculate average if BOTH midterm and final are valid and non-zero
                    if (typeof g.midterm === "number" && typeof g.final === "number" && 
                        Number.isFinite(g.midterm) && Number.isFinite(g.final) &&
                        g.midterm >= 0 && g.midterm <= 100 && 
                        g.final >= 0 && g.final <= 100 &&
                        g.midterm > 0 && g.final > 0) { // Ensure both are actually graded and not just default 0
                      return (g.midterm + g.final) / 2;
                    }
                    // If we have a valid grade value, use it
                    if (typeof g.grade === "number" && Number.isFinite(g.grade) &&
                        g.grade >= 0 && g.grade <= 100 &&
                        g.grade > 0) { // Ensure it's actually graded and not just default 0
                      return g.grade;
                    }
                    // Otherwise, return null - no grade available
                    return null;
                  })();
                  const bothSubmitted = typeof g.midterm === "number" && typeof g.final === "number" && 
                      Number.isFinite(g.midterm) && Number.isFinite(g.final) &&
                      g.midterm >= 0 && g.midterm <= 100 && 
                      g.final >= 0 && g.final <= 100 &&
                      g.midterm > 0 && g.final > 0; // Ensure both are actually graded
                  const derivedRemarks = (() => {
                    if (!bothSubmitted) return null;
                    if (typeof cumulativeValue === "number") {
                      return cumulativeValue <= 3 ? "Passed" : "Failed";
                    }
                    return null;
                  })();

                  const tone = gradeTone(derivedRemarks);

                  return (
                    <tr
                      key={index}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-gray-100 transition-colors`}
                    >
                      <td className="px-3 py-2 font-semibold text-gray-900">{g.code || "—"}</td>
                      <td className="px-3 py-2 text-gray-700">{g.title || "Untitled Subject"}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">
                        <div className="flex flex-col">
                          {g.year_level && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                              <Layers className="h-3 w-3" /> {g.year_level}
                            </span>
                          )}
                          <span className="text-[11px] uppercase tracking-wide text-gray-500">{g.semester_label || "Semester"}</span>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500">
                            <Calendar className="h-3.5 w-3.5 text-blue-500" />
                            <span>{g.school_year || "School Year"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">{formatScore(g.midterm)}</td>
                      <td className="px-3 py-2 text-center">{formatScore(g.final)}</td>
                      <td className={`px-3 py-2 text-center font-semibold ${tone}`}>
                        {formatScore(cumulativeValue)}
                      </td>
                      <td className={`px-3 py-2 text-center font-medium ${tone}`}>
                        {derivedRemarks ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
