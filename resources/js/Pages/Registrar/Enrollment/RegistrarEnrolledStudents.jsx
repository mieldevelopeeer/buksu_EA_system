import React, { useEffect, useState, useMemo } from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Head } from "@inertiajs/react";
import { Users, Loader2, Search } from "lucide-react";

export default function RegistrarEnrolledStudents({
  enrolledStudents = [],
  registrar,
}) {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Unique Year Levels
  const yearLevels = useMemo(
    () =>
      Array.from(
        new Set(
          enrolledStudents.map((s) => s.yearLevel?.year_level).filter(Boolean)
        )
      ),
    [enrolledStudents]
  );

  // Unique Sections
  const sections = useMemo(
    () =>
      Array.from(
        new Set(enrolledStudents.map((s) => s.section?.section).filter(Boolean))
      ),
    [enrolledStudents]
  );

  // Unique Semesters
  const semesters = useMemo(
    () =>
      Array.from(
        new Set(enrolledStudents.map((s) => s.semester?.semester).filter(Boolean))
      ),
    [enrolledStudents]
  );

  // Search + Filters
  const filteredStudents = useMemo(() => {
    return enrolledStudents.filter((enrollment) => {
      const fullName = `${enrollment.user?.fName || ""} ${enrollment.user?.mName || ""} ${enrollment.user?.lName || ""}`.toLowerCase();
      const idNumber = enrollment.user?.id_number?.toLowerCase() || "";

      const matchesSearch =
        fullName.includes(search.toLowerCase()) ||
        idNumber.includes(search.toLowerCase());

     const matchesYear =
  yearFilter === "all" ||
  enrollment.yearLevel?.year_level === yearFilter;


      const matchesSection =
        sectionFilter === "all" ||
        enrollment.section?.section === sectionFilter;

      const matchesSemester =
        semesterFilter === "all" ||
        enrollment.semester?.semester === semesterFilter;

      return matchesSearch && matchesYear && matchesSection && matchesSemester;
    });
  }, [enrolledStudents, search, yearFilter, sectionFilter, semesterFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, yearFilter, sectionFilter, semesterFilter]);

  return (
    <RegistrarLayout>
      <Head title="Registrar | Enrolled Students" />

<div className="p-4 space-y-4 text-xs">
  {/* Header & Filters */}
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
    <h1 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
      <Users size={16} className="text-indigo-600" /> Enrolled Students
    </h1>

    {/* Filter Bar */}
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2 text-gray-400" size={12} />
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-6 pr-2 py-1 border border-gray-300 rounded-md text-xs w-40 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
        />
      </div>

      {/* Year Filter */}
      <select
        value={yearFilter}
        onChange={(e) => setYearFilter(e.target.value)}
        className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="all">All Years</option>
        {yearLevels.map((yl) => (
          <option key={yl} value={yl}>
            {yl}
          </option>
        ))}
      </select>

      {/* Section Filter */}
      <select
        value={sectionFilter}
        onChange={(e) => setSectionFilter(e.target.value)}
        className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="all">All Sections</option>
        {sections.map((sec) => (
          <option key={sec} value={sec}>
            {sec}
          </option>
        ))}
      </select>

      {/* Semester Filter */}
      <select
        value={semesterFilter}
        onChange={(e) => setSemesterFilter(e.target.value)}
        className="border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="all">All Semesters</option>
        {semesters.map((sem) => (
          <option key={sem} value={sem}>
            {sem}
          </option>
        ))}
      </select>

      {/* Reset Filters */}
      <button
        onClick={() => {
          setSearch("");
          setYearFilter("all");
          setSectionFilter("all");
          setSemesterFilter("all");
        }}
        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition"
      >
        Reset
      </button>
    </div>
  </div>
{/* Loading */}
{loading && (
  <div className="flex items-center justify-center py-3 text-gray-500 text-[11px]">
    <Loader2 className="animate-spin mr-1" size={12} />
    <span>Loading...</span>
  </div>
)}

{/* Table */}
{filteredStudents.length === 0 ? (
  <p className="text-gray-400 text-center py-4 italic text-[11px]">
    No students found.
  </p>
) : (
  <>
    <div className="overflow-x-auto bg-white shadow-sm rounded-lg border border-gray-200">
      <table className="w-full text-[12px] text-gray-700 border-collapse">
        {/* Table Head */}
        <thead className="bg-indigo-50 sticky top-0 z-10 shadow-sm text-[11px] text-gray-600 uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2 text-left font-medium">#</th>
            <th className="px-3 py-2 text-left font-medium">ID</th>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">Year</th>
            <th className="px-3 py-2 text-left font-medium">Semester</th>
            <th className="px-3 py-2 text-left font-medium">Section</th>
            <th className="px-3 py-2 text-center font-medium">Action</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-gray-100">
          {paginatedStudents.map((enrollment, index) => (
            <tr
              key={enrollment.id}
              className="hover:bg-indigo-50/40 transition"
            >
              <td className="px-3 py-2 text-gray-500">
                {(currentPage - 1) * itemsPerPage + index + 1}
              </td>
              <td className="px-3 py-2">{enrollment.user?.id_number}</td>
              <td className="px-3 py-2 text-gray-800 font-medium">
                {enrollment.user?.lName}, {enrollment.user?.fName}{" "}
                {enrollment.user?.mName || ""}
              </td>
              <td className="px-3 py-2">
                {enrollment.year_level?.year_level ?? "N/A"}
              </td>
              <td className="px-3 py-2">
                {enrollment.semester?.semester || "N/A"}
              </td>
              <td className="px-3 py-2">
                {enrollment.section?.section || "N/A"}
              </td>
              <td className="px-3 py-2 text-center">
                <button
                  onClick={() => setSelectedStudent(enrollment)}
                  className="px-2.5 py-1 text-[11px] rounded-full font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition"
                >
                  COR
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>


      {/* Pagination */}
      <div className="flex flex-wrap justify-center items-center gap-1 mt-4 text-xs text-gray-700">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => prev - 1)}
          className="px-2 py-1 border rounded bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Prev
        </button>

        {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-2 py-1 border rounded transition ${
              currentPage === page
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 hover:bg-indigo-50"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((prev) => prev + 1)}
          className="px-2 py-1 border rounded bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Next
        </button>
      </div>
    </>
  )}
</div>


       {/* ✅ COR Modal */}
         {selectedStudent && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
             <div
               className="bg-white w-full max-w-[720px] h-[90vh] shadow-xl rounded-lg p-6 relative overflow-y-auto 
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
                   className="mx-auto w-12 h-12 md:w-10 md:h-10 mb-1 print:w-14 print:h-14"
                 />
                 <div className="text-center flex-1">
                   <h1 className="font-extrabold text-base text-gray-900 leading-tight">
                     Bukidnon State University
                   </h1>
                   <h2 className="text-xs font-medium text-gray-700">Alubijid Campus</h2>
                   <p className="text-[10px] text-gray-500">
                     Poblacion, Alubijid, Misamis Oriental
                   </p>
   
   
                   <h3 className="font-bold text-sm mt-1 underline decoration-indigo-600">
                     Certificate of Registration (COR)
                   </h3>
                 </div>
               </div>
   
               {/* Student Info */}
               <div className="bg-white border rounded-lg shadow-sm p-3 mb-4">
                 <div className="grid grid-cols-2 gap-4 text-xs">
                   {/* Left Column */}
                   <div className="space-y-1.5">
                     <p className="flex">
                       <span className="font-semibold text-gray-600 w-20">Name:</span>
                       <span className="text-gray-800 truncate">
                         {selectedStudent.user?.lName}, {selectedStudent.user?.fName}{" "}
                         {selectedStudent.user?.mName}
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
                         {selectedStudent.enrolled_at
                           ? new Date(selectedStudent.enrolled_at).toLocaleDateString("en-US", {
                               year: "numeric",
                               month: "short",
                               day: "numeric",
                             })
                           : new Date().toLocaleDateString("en-US", {
                               year: "numeric",
                               month: "short",
                               day: "numeric",
                             })}
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
               <h4 className="text-xs font-semibold mb-1 text-gray-700">Subjects</h4>
              <table className="w-full table-auto text-[10px] mb-4 border-t border-b border-gray-600">
  <thead className="bg-indigo-50 text-gray-700 border-b border-gray-400">
    <tr>
      <th className="px-1 py-1 text-left w-16">Code</th>
      <th className="px-1 py-1 text-left w-44">Descriptive Title</th>
      <th className="px-1 py-1 text-center w-10">Units</th>
      <th className="px-1 py-1 text-center w-14">Day</th>
      <th className="px-1 py-1 text-center w-24">Time</th>
      <th className="px-1 py-1 text-center w-16">Room</th>
      <th className="px-1 py-1 text-center w-40">Instructor</th>
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

        const formatTime = (time) => {
          if (!time) return "";
          const [hourStr, minuteStr] = time.split(":");
          let hour = parseInt(hourStr, 10);
          const ampm = hour >= 12 ? "PM" : "AM";
          hour = hour % 12 || 12;
          return `${hour}:${minuteStr} ${ampm}`;
        };

        const scheduleTime =
          startTime && endTime ? `${formatTime(startTime)} – ${formatTime(endTime)}` : "TBA";

        const room = subj.class_schedule?.classroom?.room_number || "TBA";

        const instructor = subj.class_schedule?.faculty
          ? `${subj.class_schedule.faculty.lName}, ${subj.class_schedule.faculty.fName}`
          : "TBA";

        return (
          <tr key={idx} className="border-b border-gray-200">
            <td className="px-1 py-1 text-center">{subject.code || "-"}</td>
            <td className="px-1 py-1 break-words">{subject.descriptive_title || "-"}</td>
            <td className="px-1 py-1 text-center">{units}</td>
            <td className="px-1 py-1 text-center">{scheduleDay}</td>
            <td className="px-1 py-1 text-center text-[9px]">{scheduleTime}</td>
            <td className="px-1 py-1 text-center">{room}</td>
            <td className="px-1 py-1 text-center break-words">{instructor}</td>
          </tr>
        );
      });
    })()}
  </tbody>
</table>

   
               {/* Totals */}
               <div className="flex justify-end text-xs mb-6">
                 <p className="font-semibold text-gray-700">
                   Total Units:{" "}
                   <span className="ml-2 font-bold">
                     {(() => {
                       const totalUnits =
                         selectedStudent?.enrollment_subjects?.reduce((sum, subj) => {
                           const curriculum = subj.class_schedule?.curriculum_subject;
                           const lec = curriculum?.lec_unit || 0;
                           const lab = curriculum?.lab_unit || 0;
                           return sum + lec + lab;
                         }, 0) || 0;
   
                       return totalUnits;
                     })()}
                   </span>
                 </p>
               </div>
   
   
               {/* Assessment Table */}
               <h4 className="text-xs font-semibold mb-1 text-gray-700">Assessment</h4>
               <table className="w-full text-[11px] mb-4">
                 <thead className="text-gray-600 border-b">
                   <tr>
                     <th className="px-2 py-1 text-left font-medium">Particulars</th>
                     <th className="px-2 py-1 text-center font-medium">Amount</th>
                     <th className="px-2 py-1 text-center font-medium">Total</th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr>
                     <td className="px-2 py-0.5">Tuition Fee (24 x 225/unit)</td>
                     <td className="px-2 py-0.5 text-center">5,400.00</td>
                     <td className="px-2 py-0.5 text-center">5,400.00</td>
                   </tr>
                   <tr>
                     <td className="px-2 py-0.5">Medical and Dental Fee</td>
                     <td className="px-2 py-0.5 text-center">200.00</td>
                     <td className="px-2 py-0.5 text-center">200.00</td>
                   </tr>
                   <tr className="bg-gray-50 font-semibold">
                     <td className="px-2 py-0.5">Total Assessment</td>
                     <td></td>
                     <td className="px-2 py-0.5 text-center">6,700.00</td>
                   </tr>
                 </tbody>
               </table>
   
               {/* Summary */}
               <h4 className="text-xs font-semibold mb-1 text-gray-700">Summary</h4>
               <table className="w-full text-[11px] mb-6">
                 <tbody>
                   <tr>
                     <td className="px-2 py-0.5 text-gray-700">Current Assessment</td>
                     <td className="px-2 py-0.5 text-right">6,700.00</td>
                   </tr>
                   <tr>
                     <td className="px-2 py-0.5 text-gray-700">Previous Balance</td>
                     <td className="px-2 py-0.5 text-right">7,932.73</td>
                   </tr>
                   <tr className="bg-gray-50 font-semibold">
                     <td className="px-2 py-0.5">Current Receivable</td>
                     <td className="px-2 py-0.5 text-right">14,632.73</td>
                   </tr>
                 </tbody>
               </table>
   
               
   
               {/* Print Button */}
               <div className="mt-6 text-center print:hidden">
                 <button
                   onClick={() => window.print()}
                   className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-xs font-medium shadow hover:bg-indigo-700 transition"
                 >
                   Print COR
                 </button>
               </div>
             </div>
           </div>
      )}
    </RegistrarLayout>
  );
}
