import React, { useEffect, useState, useMemo } from "react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import { Head } from "@inertiajs/react";
import {
  Users,
  Loader2,
  Search,
  RefreshCcw,
  CalendarDays,
  Layers,
  CheckCircle,
  FileText,
} from "lucide-react";

const tuitionPerUnit = 225;
const medicalAndDentalFee = 200;

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const formatTime = (time) => {
  if (!time) return "";
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
};

const formatInstructorName = (faculty) => {
  if (!faculty) return "TBA";
  const middleInitial = faculty.mName ? `${faculty.mName[0]}.` : "";
  return `${faculty.lName || ""}, ${faculty.fName || ""} ${middleInitial}`
    .replace(/\s+/g, " ")
    .trim();
};

const calculateTotalUnits = (enrollment) => {
  if (!enrollment?.enrollment_subjects) return 0;
  return enrollment.enrollment_subjects.reduce((sum, subj) => {
    const curriculum = subj.class_schedule?.curriculum_subject;
    const lec = curriculum?.lec_unit || 0;
    const lab = curriculum?.lab_unit || 0;
    return sum + lec + lab;
  }, 0);
};

const calculateAssessmentTotal = (enrollment) => {
  const units = calculateTotalUnits(enrollment);
  return units * tuitionPerUnit + medicalAndDentalFee;
};

const formatCurrency = (value) => currencyFormatter.format(value || 0);

const normalizeYearLabel = (value) => {
  if (value === undefined || value === null) return "";

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

export default function EnrolledStudents({ enrolledStudents = [], evaluator }) {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ Unique Year Levels
  const yearLevels = useMemo(() => {
    const unique = new Set(
      enrolledStudents
        .map((s) =>
          normalizeYearLabel(
            s.yearLevel?.year_level ?? s.year_level?.year_level ?? s.year_level
          )
        )
        .filter((value) => value !== "")
    );

    return Array.from(unique).sort();
  }, [enrolledStudents]);

  // ✅ Unique Sections
  const sections = useMemo(
    () =>
      Array.from(
        new Set(enrolledStudents.map((s) => s.section?.section).filter(Boolean))
      ),
    [enrolledStudents]
  );

  const totalStudents = enrolledStudents.length;
  const totalSections = sections.length;
  const totalYearLevels = yearLevels.length;

  const summaryCards = [
    {
      icon: <Users size={16} className="text-indigo-500" />,
      label: "Total Enrolled",
      value: totalStudents,
    },
    {
      icon: <Layers size={16} className="text-emerald-500" />,
      label: "Active Sections",
      value: totalSections,
    },
    {
      icon: <CalendarDays size={16} className="text-slate-500" />,
      label: "Year Levels",
      value: totalYearLevels,
    },
  ];

  const resetFilters = () => {
    setSearch("");
    setYearFilter("all");
    setSectionFilter("all");
  };

  // ✅ Search + Filters
  const filteredStudents = useMemo(() => {
    return enrolledStudents.filter((enrollment) => {
      const fullName = `${enrollment.user?.fName || ""} ${enrollment.user?.mName || ""} ${enrollment.user?.lName || ""}`.toLowerCase();
      const idNumber = enrollment.user?.id_number?.toLowerCase() || "";

      const matchesSearch =
        fullName.includes(search.toLowerCase()) ||
        idNumber.includes(search.toLowerCase());

      const normalizedYear = normalizeYearLabel(
        enrollment.yearLevel?.year_level ??
          enrollment.year_level?.year_level ??
          enrollment.year_level
      );

      const matchesYear = yearFilter === "all" || normalizedYear === yearFilter;

      const matchesSection =
        sectionFilter === "all" ||
        enrollment.section?.section === sectionFilter;

      return matchesSearch && matchesYear && matchesSection;
    });
  }, [enrolledStudents, search, yearFilter, sectionFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  useEffect(() => {
    setCurrentPage(1); // Reset page when filters/search change
  }, [search, yearFilter, sectionFilter]);

  return (
    <ProgramHeadLayout>
      <Head title="Enrolled Students" />

      <div className="p-4 space-y-4">
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-base font-semibold flex items-center gap-2 text-gray-800">
            <Users size={16} className="text-indigo-600" /> Enrolled Students
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 text-gray-400" size={12} />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-6 pr-2 py-1.5 border border-gray-300 rounded-md text-xs w-48 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>

            {/* Year Filter */}
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Years</option>
              {yearLevels.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {/* Section Filter */}
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Sections</option>
              {sections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 transition hover:bg-gray-100"
            >
              <RefreshCcw size={12} /> Reset
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-2 sm:grid-cols-3">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm"
            >
              <div className="flex items-center gap-2 text-slate-600">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px]">
                  {card.icon}
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">{card.label}</p>
                  <p className="text-base font-semibold text-slate-800">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-6 text-gray-500 text-sm">
            <Loader2 className="animate-spin mr-2" size={16} />
            <span>Loading...</span>
          </div>
        )}

        {/* Table */}
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-slate-200 bg-white/80 py-10 text-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Users size={18} />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-slate-700">No enrolled students match your filters.</p>
              <p className="text-[11px] text-slate-400">Try adjusting search keywords or clearing filters.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-[13px] text-slate-700">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-2.5 py-1.5 text-left">#</th>
                    <th className="px-2.5 py-1.5 text-left">ID Number</th>
                    <th className="px-2.5 py-1.5 text-left">Student Name</th>
                    <th className="px-2.5 py-1.5 text-left">Program / Year</th>
                    <th className="px-2.5 py-1.5 text-left">Section</th>
                    <th className="px-2.5 py-1.5 text-left">Status</th>
                    <th className="px-2.5 py-1.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {paginatedStudents.map((enrollment, index) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const courseLabel = `${enrollment.course?.code || "—"}${enrollment.major?.code ? `-${enrollment.major.code}` : ""}`;
                    const yearLevel = enrollment.year_level?.year_level ?? enrollment.yearLevel?.year_level ?? "N/A";
                    const statusLabel = enrollment.status ? enrollment.status.replace(/_/g, " ") : "Enrolled";

                    return (
                      <tr
                        key={enrollment.id}
                        className="group transition hover:bg-slate-50/70"
                      >
                        <td className="px-2.5 py-1.5 text-[11px] text-slate-400">{rowNumber}</td>
                        <td className="px-2.5 py-1.5 text-[13px] font-semibold text-slate-700">{enrollment.user?.id_number || "—"}</td>
                        <td className="px-2.5 py-1.5">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-semibold text-slate-900">
                              {`${enrollment.user?.lName || ""}, ${enrollment.user?.fName || ""} ${enrollment.user?.mName || ""}`.replace(/\s+/g, " ").trim() || "Unnamed"}
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                              {enrollment.user?.email || "No email"}
                            </span>
                          </div>
                        </td>
                        <td className="px-2.5 py-1.5">
                          <div className="flex flex-col">
                            <span className="text-[13px] text-slate-800">{courseLabel || "Program TBA"}</span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                              {yearLevel}
                            </span>
                          </div>
                        </td>
                        <td className="px-2.5 py-1.5 text-[13px] text-slate-700">{enrollment.section?.section || "Unassigned"}</td>
                        <td className="px-2.5 py-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                            <CheckCircle size={11} /> {statusLabel}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(enrollment)}
                            className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-600 transition hover:bg-indigo-100"
                          >
                            <FileText size={11} /> View COR
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-2.5 py-2.5 text-[11px] text-slate-600">
              <p>
                Showing <span className="font-semibold text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span>
                –
                <span className="font-semibold text-slate-800">
                  {Math.min(currentPage * itemsPerPage, filteredStudents.length)}
                </span>
                of <span className="font-semibold text-slate-800">{filteredStudents.length}</span> students
              </p>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
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
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {/* ✅ COR Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div
            className="bg-white w-full max-w-[680px] h-[85vh] shadow-lg rounded-md p-5 relative overflow-y-auto 
              print:w-[210mm] print:h-[297mm] print:max-w-none print:rounded-none print:shadow-none 
              print:p-10 print:pt-14 print:pb-16 print:overflow-visible"
          >
            {/* Close button (hidden on print) */}
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-red-600 transition print:hidden text-sm"
            >
              ✖
            </button>

            <div className="text-center mb-4 border-b pb-3 mt-4 print:mt-8">
              <img
                src="/images/buksu_logo.png"
                alt="School Logo"
                className="mx-auto w-10 h-10 md:w-9 md:h-9 mb-1 print:w-14 print:h-14"
              />
              <div className="text-center flex-1">
                <h1 className="font-extrabold text-sm text-gray-900 leading-tight">
                  Bukidnon State University
                </h1>
                <h2 className="text-[11px] font-medium text-gray-700">Alubijid Campus</h2>
                <p className="text-[10px] text-gray-500">
                  Poblacion, Alubijid, Misamis Oriental
                </p>


                <h3 className="font-bold text-[13px] mt-1 underline decoration-indigo-600">
                  Certificate of Registration (COR)
                </h3>
              </div>
            </div>

            {/* Student Info */}
            <div className="bg-white border rounded-md shadow-sm p-3 mb-3">
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                {/* Left Column */}
                <div className="space-y-1.5">
                  <p className="flex">
                    <span className="font-semibold text-gray-600 w-20">Name:</span>
                    <span className="text-gray-800 truncate">
                      {`${selectedStudent.user?.lName || ""}, ${selectedStudent.user?.fName || ""} ${selectedStudent.user?.mName || ""}`.replace(/\s+/g, " ").trim()}
                    </span>
                  </p>
                  <p className="flex">
                    <span className="font-semibold text-gray-600 w-20">ID No:</span>
                    <span className="text-gray-800">{selectedStudent.user?.id_number}</span>
                  </p>
                  <p className="flex">
                    <span className="font-semibold text-gray-600 w-20">Course/Yr:</span>
                    <span className="text-gray-800">
                      {selectedStudent.course?.code || "-"}
                      {selectedStudent.major?.code ? ` - ${selectedStudent.major.code}` : ""}
                      {" "}
                      {selectedStudent.yearLevel?.year_level || ""}
                    </span>
                  </p>
                </div>

                {/* Right Column */}
                <div className="space-y-1.5">
                  <p className="flex">
                    <span className="font-semibold text-gray-600 w-20">Period:</span>
                    <span className="text-gray-800">
                      {selectedStudent.semester?.semester || "N/A"},{" "}
                      {selectedStudent.school_year?.school_year || "N/A"}
                    </span>
                  </p>
                  <p className="flex">
                    <span className="font-semibold text-gray-600 w-20">Date:</span>
                    <span className="text-gray-800">
                      {selectedStudent.enrollment_date
                        ? new Date(selectedStudent.enrollment_date).toLocaleDateString()
                        : new Date().toLocaleDateString()}
                    </span>
                  </p>
                  <p className="flex">
                    <span className="font-semibold text-gray-600 w-20">Section:</span>
                    <span className="text-gray-800">
                      {selectedStudent.section?.section || "N/A"}
                    </span>
                  </p>
                </div>
              </div>
            </div>


            {/* Subjects Table */}
            <h4 className="text-[11px] font-semibold mb-1 text-gray-700">Subjects</h4>
            <table className="w-full text-[10px] mb-4 border-t border-b border-gray-600">
              <thead className="bg-indigo-50 text-gray-700 border-b border-gray-400">
                <tr>
                  <th className="px-2 py-1 text-left">Code</th>
                  <th className="px-2 py-1 text-left">Descriptive Title</th>
                  <th className="px-2 py-1 text-center">Units</th>
                  <th className="px-2 py-1 text-center">Day</th>
                  <th className="px-2 py-1 text-center">Time</th>
                  <th className="px-2 py-1 text-center">Room</th>
                  <th className="px-2 py-1 text-center">Instructor</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const subjects = selectedStudent?.enrollment_subjects || [];

                  if (!subjects || subjects.length === 0) {
                    return (
                      <tr>
                        <td colSpan="7" className="px-2 py-2 text-center text-gray-500">
                          No subjects found.
                        </td>
                      </tr>
                    );
                  }

                  return subjects.map((subj, idx) => {
                    const curriculum = subj.class_schedule?.curriculum_subject;
                    const subject = curriculum?.subject;
                    if (!subject) return null;

                    const lec = curriculum?.lec_unit || 0;
                    const lab = curriculum?.lab_unit || 0;
                    const units = lec + lab;

                    const scheduleDay = subj.class_schedule?.schedule_day || "TBA";
                    const startTime = subj.class_schedule?.start_time || "";
                    const endTime = subj.class_schedule?.end_time || "";

                    const scheduleTime =
                      startTime && endTime ? `${formatTime(startTime)} – ${formatTime(endTime)}` : "";

                    const room = subj.class_schedule?.classroom?.room_number || "TBA";
                    const instructor = formatInstructorName(subj.class_schedule?.faculty);

                    return (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="px-2 py-1 text-center">{subject.code || "-"}</td>
                        <td className="px-2 py-1">{subject.descriptive_title || "-"}</td>
                        <td className="px-2 py-1 text-center">{units}</td>
                        <td className="px-2 py-1 text-center">{scheduleDay}</td>
                        <td className="px-2 py-1 text-center">{scheduleTime}</td>
                        <td className="px-2 py-1 text-center">{room}</td>
                        <td className="px-2 py-1 text-center">{instructor}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end text-[11px] mb-4">
              <p className="font-semibold text-gray-700">
                Total Units:{" "}
                <span className="ml-2 font-bold">
                  {calculateTotalUnits(selectedStudent)}
                </span>
              </p>
            </div>


            {/* Assessment Table */}
            <h4 className="text-[11px] font-semibold mb-1 text-gray-700">Assessment</h4>
            <table className="w-full text-[10px] mb-3">
              <thead className="text-gray-600 border-b">
                <tr>
                  <th className="px-2 py-1 text-left font-medium">Particulars</th>
                  <th className="px-2 py-1 text-center font-medium">Amount</th>
                  <th className="px-2 py-1 text-center font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-0.5">Tuition Fee ({calculateTotalUnits(selectedStudent)} x 225/unit)</td>
                  <td className="px-2 py-0.5 text-center">{formatCurrency(calculateTotalUnits(selectedStudent) * 225)}</td>
                  <td className="px-2 py-0.5 text-center">{formatCurrency(calculateTotalUnits(selectedStudent) * 225)}</td>
                </tr>
                <tr>
                  <td className="px-2 py-0.5">Medical and Dental Fee</td>
                  <td className="px-2 py-0.5 text-center">{formatCurrency(200)}</td>
                  <td className="px-2 py-0.5 text-center">{formatCurrency(200)}</td>
                </tr>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-2 py-0.5">Total Assessment</td>
                  <td></td>
                  <td className="px-2 py-0.5 text-center">{formatCurrency(calculateAssessmentTotal(selectedStudent))}</td>
                </tr>
              </tbody>
            </table>

            {/* Summary */}
            <h4 className="text-[11px] font-semibold mb-1 text-gray-700">Summary</h4>
            <table className="w-full text-[10px] mb-4">
              <tbody>
                <tr>
                  <td className="px-2 py-0.5 text-gray-700">Current Assessment</td>
                  <td className="px-2 py-0.5 text-right">{formatCurrency(calculateAssessmentTotal(selectedStudent))}</td>
                </tr>
                <tr>
                  <td className="px-2 py-0.5 text-gray-700">Previous Balance</td>
                  <td className="px-2 py-0.5 text-right">{formatCurrency(selectedStudent.previous_balance || 0)}</td>
                </tr>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-2 py-0.5">Current Receivable</td>
                  <td className="px-2 py-0.5 text-right">{formatCurrency(calculateAssessmentTotal(selectedStudent) + (selectedStudent.previous_balance || 0))}</td>
                </tr>
              </tbody>
            </table>

            {/* Footer */}
            <div className="mt-6 text-[11px] text-gray-700 text-center">
              <p className="flex items-center justify-center gap-2 font-bold text-green-700 text-[13px] tracking-wide">
                <CheckCircle size={16} className="text-green-700" />
                VALIDATED & ENROLLED
              </p>
              <p className="mt-3 italic">Processed by:</p>
              <p className="font-medium">
                {evaluator?.fName} {evaluator?.mName ? evaluator.mName[0] + "." : ""} {evaluator?.lName}
              </p>

            </div>

            {/* Print Button */}
            <div className="mt-4 text-center print:hidden">
              <button
                onClick={() => window.print()}
                className="bg-indigo-600 text-white px-5 py-1.5 rounded-md text-xs font-medium shadow hover:bg-indigo-700 transition"
              >
                Print COR
              </button>
            </div>
          </div>
        </div>
      )}
    </ProgramHeadLayout>
  );
}
