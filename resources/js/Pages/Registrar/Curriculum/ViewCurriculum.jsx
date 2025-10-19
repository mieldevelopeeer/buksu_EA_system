  // resources/js/Pages/Registrar/Curriculums/CurriculumPage.jsx
  import React from "react";
  import RegistrarLayout from "@/Layouts/RegistrarLayout";
  import { Head, Link } from "@inertiajs/react"; // ✅ Import Link
  import jsPDF from "jspdf";
  import autoTable from "jspdf-autotable";
  import * as XLSX from "xlsx";

  export default function ViewCurriculum({ curriculum, curriculumSubjects }) {
    // 🔹 Group subjects by Year Level then Semester
    const groupedData = {};
    curriculumSubjects.forEach((subj) => {
      const year = subj.year_level?.year_level || "N/A";
      const sem = subj.semester?.semester || "N/A";

      if (!groupedData[year]) groupedData[year] = {};
      if (!groupedData[year][sem]) groupedData[year][sem] = [];
      groupedData[year][sem].push(subj);
    });

    const exportPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text("BUKIDNON STATE UNIVERSITY", pageWidth / 2, 20, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text("Malaybalay City, Bukidnon 8700", pageWidth / 2, 26, { align: "center" });
    doc.text(
      "Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717; www.buksu.edu.ph",
      pageWidth / 2,
      31,
      { align: "center" }
    );

    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.text("Prospectus for Student Evaluation", pageWidth / 2, 40, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text(
      `${curriculum.course?.name || ""} ${curriculum.major ? `- Major in ${curriculum.major.name}` : ""}`,
      pageWidth / 2,
      46,
      { align: "center" }
    );

    // Column layout: left/right
    const years = ["First Year", "Second Year"];
    const colX = [15, pageWidth / 2 + 5]; // left/right columns
    const startY = 55;
    const yPositions = [startY, startY];

    years.forEach((year, colIdx) => {
      if (!groupedData[year]) return;

      // Year heading
      doc.setFont("times", "bold");
      doc.setFontSize(8);
      doc.setTextColor(0, 51, 153);
      doc.text(year.toUpperCase(), colX[colIdx] + 42, yPositions[colIdx] - 5, { align: "center" });
      doc.setTextColor(0, 0, 0);

      const semesters = Object.keys(groupedData[year]).sort();

      semesters.forEach((sem) => {
        const subjects = groupedData[year][sem];
        if (!subjects || subjects.length === 0) return;

        const rows = subjects.map((s) => [
          s.subject?.code || "-",
          s.subject?.descriptive_title || "-",
          (s.lec_unit || 0) + (s.lab_unit || 0),
          s.prerequisites?.length > 0
            ? s.prerequisites.map((p) => p?.code || "-").join(", ")
            : "-",
        ]);

        // Total row
        const totalUnits = subjects.reduce(
          (acc, s) => acc + ((s.lec_unit || 0) + (s.lab_unit || 0)),
          0
        );
        rows.push(["", "TOTAL", totalUnits, ""]);

        // Semester title
        doc.setFont("times", "italic");
        doc.setFontSize(7);
        doc.text(sem, colX[colIdx] + 42, yPositions[colIdx] - 2, { align: "center" });

        autoTable(doc, {
          startY: yPositions[colIdx],
          head: [["Code", "Title", "Units", "Pre-Req"]],
          body: rows,
          theme: "grid",
          styles: { fontSize: 6, halign: "center", valign: "middle" },
          headStyles: { fillColor: [0, 51, 153], textColor: 255 },
          margin: { left: colX[colIdx] },
          columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 35 },
            2: { cellWidth: 10 },
            3: { cellWidth: 20 },
          },
          tableWidth: 85,
        });

        yPositions[colIdx] = doc.lastAutoTable.finalY + 5;
      });
    });

    // Signatures
    const sigY = Math.max(yPositions[0], yPositions[1]) + 5;
    doc.setFontSize(7);
    doc.text("Evaluator Signature", 35, sigY);
    doc.text("Student Signature", pageWidth - 65, sigY);

    doc.save("Curriculum.pdf");
  };

    // 🔹 Export to Excel
    const exportExcel = () => {
      const data = [];

      Object.keys(groupedData).forEach((year) => {
        Object.keys(groupedData[year]).forEach((sem) => {
          groupedData[year][sem].forEach((s) => {
            data.push({
              Year: year,
              Semester: sem,
              Code: s.subject?.code,
              Title: s.subject?.descriptive_title,
              Units: s.lec_unit + s.lab_unit,
              "Pre-Req":
                s.prerequisites.length > 0
                  ? s.prerequisites.map((pre) => pre.code).join(", ")
                  : "-",
            });
          });
        });
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Curriculum");
      XLSX.writeFile(wb, "Curriculum.xlsx");
    };

    return (
      <RegistrarLayout>
        <Head title={`Curriculum - ${curriculum.course?.code}`} />

        <div className="p-6 font-sans text-gray-800">
          {/* 🔹 Back Button */}
          <div className="mb-4">
            <Link
              href={route("registrar.curriculum.index")} // ✅ Change route as needed
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back
            </Link>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-lg font-bold text-blue-800 uppercase tracking-wide">
                Prospectus for Student Evaluation
              </h1>
              <p className="text-sm text-gray-600">
                {curriculum.course?.name}{" "}
                {curriculum.major ? `- Major in ${curriculum.major.name}` : ""}
              </p>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-3 mt-4 md:mt-0">
              <button
                onClick={exportPDF}
                className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition"
              >
                Export PDF
              </button>
              <button
                onClick={exportExcel}
                className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition"
              >
                Export Excel
              </button>
            </div>
          </div>

          {/* Curriculum Body */}
          <div className="space-y-6">
            {Object.keys(groupedData).map((year) => (
              <div key={year}>
                <h2 className="text-base font-semibold text-blue-700 mb-3">
                  {year}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(groupedData[year]).map((sem) => (
                    <div
                      key={sem}
                      className="border rounded-md shadow-sm bg-white overflow-hidden"
                    >
                      <div className="bg-blue-50 text-center py-1.5 text-sm font-medium text-blue-700">
                        {sem}
                      </div>
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-gray-700">
                            <th className="border px-2 py-1 w-20">Code</th>
                            <th className="border px-2 py-1">Descriptive Title</th>
                            <th className="border px-2 py-1 w-12">Units</th>
                            <th className="border px-2 py-1 w-28">Pre-Req</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedData[year][sem].map((subj) => (
                            <tr key={subj.id} className="hover:bg-gray-50">
                              <td className="border px-2 py-1">{subj.subject?.code}</td>
                              <td className="border px-2 py-1 truncate">
                                {subj.subject?.descriptive_title}
                              </td>
                              <td className="border px-2 py-1 text-center">
                                {subj.lec_unit + subj.lab_unit}
                              </td>
                              <td className="border px-2 py-1">
                                {subj.prerequisites.length > 0
                                  ? subj.prerequisites.map((pre) => pre.code).join(", ")
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="px-3 py-1.5 text-right text-xs bg-gray-50 font-medium">
                        Total Units:{" "}
                        {groupedData[year][sem].reduce(
                          (sum, subj) => sum + (subj.lec_unit + subj.lab_unit),
                          0
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </RegistrarLayout>
    );
  }
