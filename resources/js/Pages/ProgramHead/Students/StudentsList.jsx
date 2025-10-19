import React, { useEffect, useMemo, useState } from "react";
import { Head } from "@inertiajs/react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import { motion } from "framer-motion";
import { Users, MagnifyingGlass } from "phosphor-react";

const normalizeYearLevel = (value) => {
  if (!value) return "";

  const trimmed = String(value).trim();
  if (trimmed === "") return "";

  const normalized = trimmed.toLowerCase();

  switch (normalized) {
    case "1":
    case "first year":
    case "1st year":
      return "First Year";
    case "2":
    case "second year":
    case "2nd year":
      return "Second Year";
    case "3":
    case "third year":
    case "3rd year":
      return "Third Year";
    case "4":
    case "fourth year":
    case "4th year":
      return "Fourth Year";
    case "5":
    case "fifth year":
    case "5th year":
      return "Fifth Year";
    default:
      return trimmed;
  }
};

const formatStudentName = (user = {}) => {
  const last = user.lName ?? "";
  const first = user.fName ?? "";
  const middle = user.mName ?? "";

  const base = `${last}, ${first} ${middle}`
    .replace(/\s+/g, " ")
    .replace(/,\s*$/, ",")
    .trim();

  return base === "," ? "" : base;
};

export default function StudentsList({ enrollments = [], students = [], department }) {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const records = useMemo(() => {
    if (Array.isArray(enrollments) && enrollments.length > 0) {
      return enrollments;
    }

    if (Array.isArray(students) && students.length > 0) {
      return students.map((student) => ({
        id: student.id,
        student,
        user: student,
        yearLevel: student.yearLevel ?? null,
        year_level: student.year_level
          ? { year_level: student.year_level }
          : student.yearLevel
          ? { year_level: student.yearLevel }
          : null,
      }));
    }

    return [];
  }, [enrollments, students]);

  const yearOptions = useMemo(() => {
    const unique = new Set(
      records
        .map((enrollment) =>
          normalizeYearLevel(
            enrollment.yearLevel?.year_level ??
              enrollment.year_level?.year_level ??
              enrollment.year_level
          )
        )
        .filter((value) => value !== "")
    );

    return ["all", ...Array.from(unique)];
  }, [records]);

  // Filter students
  const filteredStudents = useMemo(() => {
    const byFilters = records.filter((enrollment) => {
      const student = enrollment.student ?? enrollment.user ?? {};
      const fullName = formatStudentName(student).toLowerCase();
      const matchesSearch =
        fullName.includes(search.toLowerCase()) ||
        (student.id_number ?? "").toLowerCase().includes(search.toLowerCase());

      const yearLabel = normalizeYearLevel(
        enrollment.yearLevel?.year_level ??
          enrollment.year_level?.year_level ??
          enrollment.year_level
      );

      const matchesYear = yearFilter === "all" || yearLabel === yearFilter;

      return matchesSearch && matchesYear;
    });

    return byFilters.sort((a, b) => {
      const studentA = a.student ?? a.user ?? {};
      const studentB = b.student ?? b.user ?? {};
      const nameA = formatStudentName(studentA).toLowerCase();
      const nameB = formatStudentName(studentB).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [records, search, yearFilter]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, yearFilter]);

  return (
    <ProgramHeadLayout>
      <Head title="Student Directory" />

      <div className="px-4 py-5 md:px-5 md:py-6 space-y-4">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
              <Users size={18} />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {department?.name ? `${department.name} Student Directory` : "Student Directory"}
              </h1>
              <p className="text-[12px] text-slate-500">
                Browse active enrollees filtered by year level within your program.
              </p>
            </div>
          </div>

          <div className="rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm">
            {filteredStudents.length} students
          </div>
        </header>

        <section className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm space-y-3">
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:w-64">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-2.5 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by name or ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[13px] text-slate-700 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring focus:ring-indigo-100"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <label className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-slate-600">
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Year Level
                </span>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="bg-transparent text-[12px] text-slate-700 focus:outline-none"
                >
                  {yearOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All Years" : option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden rounded-lg border border-slate-200"
          >
            <table className="w-full border-collapse text-[13px] text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-3.5 py-2 text-left">Student ID</th>
                  <th className="px-3.5 py-2 text-left">Student Name</th>
                  <th className="px-3.5 py-2 text-left">Program</th>
                  <th className="px-3.5 py-2 text-left">Year</th>
                  <th className="px-3.5 py-2 text-left">Section</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/90">
                {paginatedStudents.length > 0 ? (
                  paginatedStudents.map((enrollment) => {
                    const student = enrollment.student ?? enrollment.user ?? {};
                    const yearLevel = normalizeYearLevel(
                      enrollment.yearLevel?.year_level ??
                        enrollment.year_level?.year_level ??
                        enrollment.year_level
                    );
                    const courseLabel = `${enrollment.course?.code || "Program TBA"}${enrollment.major?.code ? ` · ${enrollment.major.code}` : ""}`;

                    return (
                      <tr key={enrollment.id} className="transition hover:bg-slate-50/60">
                        <td className="px-3.5 py-1.75 text-[12px] font-semibold text-slate-700">
                          {student.id_number || "—"}
                        </td>
                        <td className="px-3.5 py-1.75">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-semibold text-slate-900">
                              {formatStudentName(student) || "Unnamed"}
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                              {student.email || "No email"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3.5 py-1.75 text-[12px] text-slate-700">{courseLabel}</td>
                        <td className="px-3.5 py-1.75">
                          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.25 text-[10px] font-semibold text-indigo-600">
                            {yearLevel || "Not assigned"}
                          </span>
                        </td>
                        <td className="px-3.5 py-1.75 text-[12px] text-slate-700">{enrollment.section?.section || "Unassigned"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3.5 py-7 text-center text-[12px] text-slate-400">
                      No students found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </motion.div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-[11px] text-slate-500">
            <span>
              Showing
              <span className="mx-1 font-semibold text-slate-700">
                {filteredStudents.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
              </span>
              to
              <span className="mx-1 font-semibold text-slate-700">
                {Math.min(currentPage * itemsPerPage, filteredStudents.length)}
              </span>
              of
              <span className="ml-1 font-semibold text-slate-700">{filteredStudents.length}</span>
              students
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-6 w-6 rounded-md border text-[10px] font-semibold transition ${
                    currentPage === page
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </ProgramHeadLayout>
  );
}
