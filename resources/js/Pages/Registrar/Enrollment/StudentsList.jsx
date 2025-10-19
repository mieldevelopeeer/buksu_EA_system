import React, { useState } from "react";
import { Head } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { FileText, FileSpreadsheet, Search } from "lucide-react";
    
export default function StudentsList({ students }) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10; // number of students per page

  const filteredStudents = students.filter((student) =>
    `${student.fName} ${student.mName} ${student.lName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Pagination calculations
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Export to PDF (professional style)
  const exportPDF = () => {
    const doc = new jsPDF();
    const title = "Students List";
    const tableColumn = ["#", "ID Number", "Name", "Gender", "Contact", "Email"];
    const tableRows = filteredStudents.map((student, index) => [
      index + 1,
      student.id_number,
      `${student.lName}, ${student.fName} ${student.mName}`,
      student.gender,
      student.contact_no || "-",
      student.email || "N/A",
    ]);

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      theme: "grid",
      headStyles: {
        fillColor: [30, 144, 255],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: { 0: { halign: "center" }, 3: { halign: "center" } },
      margin: { left: 10, right: 10 },
    });

    doc.save("students_list.pdf");
  };

  // Export to Excel
  const exportExcel = () => {
    const wsData = [
      ["#", "ID Number", "Name", "Gender", "Contact", "Email"],
      ...filteredStudents.map((student, index) => [
        index + 1,
        student.id_number,
        `${student.lName}, ${student.fName} ${student.mName}`,
        student.gender,
        student.contact_no || "-",
        student.email || "N/A",
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Make header bold
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
      if (cell) cell.s = { font: { bold: true } };
    }

    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "students_list.xlsx");
  };

  return (
    <RegistrarLayout>
      <Head title="Students List" />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 font-sans text-xs md:text-sm text-slate-700 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-sm font-semibold text-slate-800">Students</h1>
            <p className="text-[11px] text-slate-500">Manage enrollees, search, and export records.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative w-full sm:w-64">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-600 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportPDF}
                className="flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-medium text-rose-600 transition hover:bg-rose-100"
              >
                <FileText size={14} />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                onClick={exportExcel}
                className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-100"
              >
                <FileSpreadsheet size={14} />
                <span className="hidden sm:inline">Excel</span>
              </button>
            </div>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <p className="py-16 text-center text-sm italic text-slate-400">No students found.</p>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-[11px] md:text-[12px]">
                  <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="px-3.5 py-2 text-slate-600">#</th>
                      <th className="px-3.5 py-2 text-slate-600">ID Number</th>
                      <th className="px-3.5 py-2 text-slate-600">Name</th>
                      <th className="px-3.5 py-2 text-slate-600">Gender</th>
                      <th className="px-3.5 py-2 text-slate-600">Contact</th>
                      <th className="px-3.5 py-2 text-slate-600">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {currentStudents.map((student, index) => (
                      <tr key={student.id} className="transition hover:bg-slate-50">
                        <td className="px-3.5 py-2 font-medium text-slate-700">{indexOfFirstStudent + index + 1}</td>
                        <td className="px-3.5 py-2">{student.id_number}</td>
                        <td className="px-3.5 py-2 text-slate-800">{`${student.lName}, ${student.fName} ${student.mName}`}</td>
                        <td className="px-3.5 py-2">{student.gender}</td>
                        <td className="px-3.5 py-2">{student.contact_no || "-"}</td>
                        <td className="px-3.5 py-2">{student.email || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 flex justify-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                <button
                  key={number}
                  onClick={() => paginate(number)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-medium transition ${
                    currentPage === number
                      ? "bg-sky-500 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {number}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </RegistrarLayout>
  );
}
