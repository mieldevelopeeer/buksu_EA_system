// resources/js/Pages/Registrar/Students/StudentGradesList.jsx
import React, { useState } from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Head, Link } from "@inertiajs/react";
import { Eye, GraduationCap } from "lucide-react"; // subtle icons

export default function StudentGradesList({ students }) {
  const [search, setSearch] = useState("");

  const filteredStudents = students.filter((enrollment) => {
    const fullName = `${enrollment.student?.fName ?? ""} ${
      enrollment.student?.mName ?? ""
    } ${enrollment.student?.lName ?? ""}`.toLowerCase();
    return (
      fullName.includes(search.toLowerCase()) ||
      enrollment.student?.id_number?.toLowerCase().includes(search.toLowerCase()) ||
      enrollment.course?.code?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <RegistrarLayout>
      <Head title="Student Grades" />

      <div className="p-4 font-sans text-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            Student Grades
          </h1>
          <input
            type="text"
            placeholder="Search by name, ID, or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-2 py-1 text-xs border rounded-md shadow-sm bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 w-52"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white/70 backdrop-blur-md">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 text-gray-600 uppercase tracking-wide text-[11px]">
                <th className="px-3 py-1.5 text-left">#</th>
                <th className="px-3 py-1.5 text-left">ID</th>
                <th className="px-3 py-1.5 text-left">Name</th>
                <th className="px-3 py-1.5 text-left">Course</th>
                <th className="px-3 py-1.5 text-left">Year Level</th>
                <th className="px-3 py-1.5 text-left">Semester</th>
                <th className="px-3 py-1.5 text-left">School Year</th>
                <th className="px-3 py-1.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((enrollment, index) => (
                  <tr
                    key={enrollment.id}
                    className="hover:bg-indigo-50/40 transition text-gray-700"
                  >
                    <td className="px-3 py-1.5 text-gray-500">{index + 1}</td>
                    <td className="px-3 py-1.5 text-gray-600">
                      {enrollment.student?.id_number ?? "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      {enrollment.student?.fName} {" "}
                      {enrollment.student?.mName
                        ? enrollment.student.mName[0] + ". "
                        : ""}
                      {enrollment.student?.lName}
                    </td>
                    <td className="px-3 py-1.5">{enrollment.course?.code ?? "—"}</td>
                    <td className="px-3 py-1.5">
                      <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-indigo-100 text-indigo-700">
                        {enrollment.year_level?.year_level ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-purple-100 text-purple-700">
                        {enrollment.semester?.semester ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-blue-100 text-blue-700">
                        {enrollment.school_year_label ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <Link
                        href={route(
                          "registrar.students.grades",
                          enrollment.student?.id
                        )}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-indigo-600 border border-indigo-200 rounded-md bg-white/50 hover:bg-indigo-50 transition"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="text-center py-4 text-gray-400 italic text-xs"
                  >
                    No students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RegistrarLayout>
  );
}
