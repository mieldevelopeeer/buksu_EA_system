import React, { useEffect, useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import { motion } from "framer-motion";
import { Users, MagnifyingGlass, SortAscending, User } from "phosphor-react";

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
  const [sortOrder, setSortOrder] = useState("asc"); // asc or desc
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Remove duplicate students - keep only unique student IDs
  const records = useMemo(() => {
    const sourceData = Array.isArray(enrollments) && enrollments.length > 0 ? enrollments : 
                       Array.isArray(students) && students.length > 0 ? students.map((student) => ({
                         id: student.id,
                         student,
                         user: student,
                         yearLevel: student.yearLevel ?? null,
                         year_level: student.year_level
                           ? { year_level: student.year_level }
                           : student.yearLevel
                           ? { year_level: student.yearLevel }
                           : null,
                       })) : [];

    // Create a Map to track unique students by student_id
    const uniqueStudents = new Map();
    sourceData.forEach((enrollment) => {
      const studentId = enrollment.student?.id || enrollment.student_id || enrollment.id;
      if (studentId && !uniqueStudents.has(studentId)) {
        uniqueStudents.set(studentId, enrollment);
      }
    });

    return Array.from(uniqueStudents.values());
  }, [enrollments, students]);

  const yearOptions = useMemo(() => {
    const unique = new Set(
      records
        .map((enrollment) =>
          normalizeYearLevel(
            enrollment.student?.yearLevel?.year_level ??
              enrollment.yearLevel?.year_level ??
              enrollment.year_level?.year_level ??
              enrollment.year_level
          )
        )
        .filter((value) => value !== "")
    );

    return ["all", ...Array.from(unique).sort()];
  }, [records]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    const byFilters = records.filter((enrollment) => {
      const student = enrollment.student ?? enrollment.user ?? {};
      const fullName = formatStudentName(student).toLowerCase();
      const matchesSearch =
        fullName.includes(search.toLowerCase()) ||
        (student.id_number ?? "").toLowerCase().includes(search.toLowerCase());

      const yearLabel = normalizeYearLevel(
        enrollment.student?.yearLevel?.year_level ??
          enrollment.yearLevel?.year_level ??
          enrollment.year_level?.year_level ??
          enrollment.year_level
      );

      const matchesYear = yearFilter === "all" || yearLabel === yearFilter;

      return matchesSearch && matchesYear;
    });

    // Sort A-Z or Z-A
    return byFilters.sort((a, b) => {
      const studentA = a.student ?? a.user ?? {};
      const studentB = b.student ?? b.user ?? {};
      const nameA = formatStudentName(studentA).toLowerCase();
      const nameB = formatStudentName(studentB).toLowerCase();
      
      const comparison = nameA.localeCompare(nameB);
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [records, search, yearFilter, sortOrder]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, yearFilter, sortOrder]);

  return (
    <ProgramHeadLayout>
      <Head title="Student Directory" />

      <div className="px-4 py-5 md:px-6 md:py-6 space-y-4">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <Users size={22} weight="bold" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {department?.name ? `${department.name} Students` : "Student Directory"}
              </h1>
              <p className="text-[12px] text-slate-500">
                Browse and manage student profiles
              </p>
            </div>
          </div>

          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-[13px] font-semibold text-indigo-700"
          >
            {filteredStudents.length} {filteredStudents.length === 1 ? "student" : "students"}
          </motion.div>
        </header>

        {/* Controls */}
        <section className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 md:max-w-sm">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by name or ID number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-[13px] text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All Years" : option}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                title={`Sort ${sortOrder === "asc" ? "Z-A" : "A-Z"}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <SortAscending size={14} weight={sortOrder === "asc" ? "bold" : "regular"} />
                <span>{sortOrder === "asc" ? "A-Z" : "Z-A"}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Grid */}
        {paginatedStudents.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {paginatedStudents.map((enrollment, idx) => {
              const student = enrollment.student ?? enrollment.user ?? {};
              const yearLevel = normalizeYearLevel(
                enrollment.student?.yearLevel?.year_level ??
                  enrollment.yearLevel?.year_level ??
                  enrollment.year_level?.year_level ??
                  enrollment.year_level
              );
              const courseLabel = `${enrollment.course?.code || "—"}`;
              const studentId = student.id || enrollment.student_id;
              
              // Get profile picture from user relationship or direct property
              const rawProfilePic = student.profile_picture || student.user?.profile_picture;
              const profilePicture = rawProfilePic && !rawProfilePic.startsWith('http')
                ? `/storage/${rawProfilePic}`
                : rawProfilePic;

              return (
                <motion.div
                  key={`${studentId}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => {
                    if (studentId) {
                      router.visit(route('program-head.students.profile', studentId));
                    }
                  }}
                  className="group cursor-pointer rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-lg hover:border-indigo-300 overflow-hidden"
                >
                  {/* Profile Picture */}
                  <div className="relative h-40 bg-gradient-to-br from-indigo-100 to-slate-100 overflow-hidden">
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt={formatStudentName(student)}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 via-slate-100 to-slate-200">
                        <User size={48} className="text-slate-300" weight="light" />
                      </div>
                    )}
                    {/* Year Badge */}
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center rounded-full border border-white bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md">
                        {yearLevel || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-3 space-y-2">
                    {/* Name */}
                    <div>
                      <h3 className="text-[13px] font-bold text-slate-900 line-clamp-2">
                        {formatStudentName(student) || "Unnamed"}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {student.id_number || "ID—"}
                      </p>
                    </div>

                    {/* Program and Email */}
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-slate-700">
                        {courseLabel}
                        {enrollment.major?.code && ` · ${enrollment.major.code}`}
                      </p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">
                        {student.email || "—"}
                      </p>
                    </div>

                    {/* Section */}
                    {enrollment.section?.section && (
                      <div className="pt-1 border-t border-slate-100">
                        <p className="text-[10px] text-slate-600">
                          <span className="font-semibold">Section:</span> {enrollment.section.section}
                        </p>
                      </div>
                    )}

                    {/* View Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (studentId) {
                          router.visit(route('program-head.students.profile', studentId));
                        }
                      }}
                      className="w-full mt-2 rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-[11px] font-semibold transition hover:bg-indigo-700 active:scale-95"
                    >
                      View Profile
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white p-12"
          >
            <Users size={40} className="text-slate-300" />
            <div className="text-center">
              <h3 className="text-[14px] font-semibold text-slate-700 mb-1">
                No students found
              </h3>
              <p className="text-[12px] text-slate-500">
                Try adjusting your search filters or year level selection
              </p>
            </div>
          </motion.div>
        )}

        {/* Pagination */}
        {filteredStudents.length > 0 && (
          <div className="flex flex-col gap-3 items-center justify-between border-t border-slate-200 pt-4 md:flex-row">
            <span className="text-[12px] text-slate-600">
              Showing
              <span className="mx-1.5 font-semibold text-slate-900">
                {filteredStudents.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
              </span>
              to
              <span className="mx-1.5 font-semibold text-slate-900">
                {Math.min(currentPage * itemsPerPage, filteredStudents.length)}
              </span>
              of
              <span className="ml-1.5 font-semibold text-slate-900">{filteredStudents.length}</span>
              {filteredStudents.length === 1 ? "student" : "students"}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Prev
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-8 h-8 rounded-lg border text-[11px] font-semibold transition ${
                    currentPage === page
                      ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </ProgramHeadLayout>
  );
}
