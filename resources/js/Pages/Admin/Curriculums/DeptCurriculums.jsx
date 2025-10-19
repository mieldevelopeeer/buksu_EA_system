import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/Layouts/AdminLayout"; // ✅ Changed Layout
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, FilePdf, FileXls, SpinnerGap } from "phosphor-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function DeptCurriculums({ curriculum, curriculumSubjects }) {
  const [isLoading, setIsLoading] = useState(true);
  const [logoCache, setLogoCache] = useState({});
  const [isExporting, setIsExporting] = useState(false);

  const groupedData = useMemo(() => {
    const data = {};
    (curriculumSubjects || []).forEach((subj) => {
      const year = subj.year_level?.year_level || "N/A";
      const sem = subj.semester?.semester || "N/A";

      if (!data[year]) data[year] = {};
      if (!data[year][sem]) data[year][sem] = [];
      data[year][sem].push(subj);
    });
    return data;
  }, [curriculumSubjects]);

  const yearPriority = ["first", "second", "third", "fourth", "fifth"];
  const semesterPriority = [
    "first",
    "second",
    "third",
    "fourth",
    "summer",
    "midyear",
  ];

  const getRank = (label = "", priority = []) => {
    const normalized = label.toLowerCase();
    const index = priority.findIndex((token) => normalized.includes(token));
    return index === -1 ? priority.length : index;
  };

  const sortedYears = useMemo(() => {
    return Object.keys(groupedData).sort((a, b) => {
      const diff = getRank(a, yearPriority) - getRank(b, yearPriority);
      return diff !== 0 ? diff : a.localeCompare(b);
    });
  }, [groupedData]);

  const getSortedSemesters = (semesters = {}) =>
    Object.keys(semesters).sort((a, b) => {
      const diff = getRank(a, semesterPriority) - getRank(b, semesterPriority);
      return diff !== 0 ? diff : a.localeCompare(b);
    });

  const fetchImageAsset = async (path) => {
    if (typeof window === "undefined") return null;

    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to fetch asset: ${path}`);
    }

    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const ensureLogoData = async (path) => {
    if (logoCache[path]) return logoCache[path];
    try {
      const dataUrl = await fetchImageAsset(path);
      if (!dataUrl) return null;

      const metadata = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        };
        img.onerror = reject;
        img.src = dataUrl;
      });

      setLogoCache((prev) => ({ ...prev, [path]: metadata }));
      return metadata;
    } catch (error) {
      console.error(`Failed to load logo for export: ${path}`, error);
      return null;
    }
  };

  const formatPrerequisites = (list = []) =>
    Array.isArray(list) && list.length
      ? list
          .map((pre) => pre?.code)
          .filter(Boolean)
          .join(", ")
      : "-";

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, [curriculum, curriculumSubjects]);

  useEffect(() => {
    let isMounted = true;
    const preload = async () => {
      try {
        await Promise.all([
          ensureLogoData("/images/buksu_logo.png"),
          ensureLogoData("/images/cob-logo.png"),
        ]);
      } catch (error) {
        if (isMounted) {
          console.error("Logo preload failed", error);
        }
      }
    };
    preload();
    return () => {
      isMounted = false;
    };
  }, []);

  // 🔹 Export PDF
  const exportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 12;
      const contentWidth = pageWidth - marginX * 2;
      const mainLogo = await ensureLogoData("/images/buksu_logo.png");

      const placeLogo = (logo, x, y, targetWidth = 20) => {
        if (!logo) return;
        const aspect = logo.width && logo.height ? logo.height / logo.width : 1;
        const width = targetWidth;
        const height = width * aspect;
        doc.addImage(logo.dataUrl, "PNG", x, y, width, height, undefined, "FAST");
      };

      let headerStartY = 22;
      if (mainLogo) {
        const targetWidth = 20;
        placeLogo(mainLogo, pageWidth / 2 - targetWidth / 2, 12, targetWidth);
        headerStartY = 38;
      }

      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.text("BUKIDNON STATE UNIVERSITY", pageWidth / 2, headerStartY, {
        align: "center",
      });

      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.text("Malaybalay City, Bukidnon 8700", pageWidth / 2, headerStartY + 5, {
        align: "center",
      });
      doc.text(
        "Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717; www.buksu.edu.ph",
        pageWidth / 2,
        headerStartY + 10,
        { align: "center" }
      );

      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.text("Prospectus for Student Evaluation", pageWidth / 2, headerStartY + 18, {
        align: "center",
      });

      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.text(
        `${curriculum.course?.name || ""} ${
          curriculum.major ? `- Major in ${curriculum.major.name}` : ""
        }`,
        pageWidth / 2,
        headerStartY + 23,
        { align: "center" }
      );

      doc.setFontSize(8);
      doc.text("Reference: CMO 17 s. 2017", pageWidth / 2, headerStartY + 28, {
        align: "center",
      });

      doc.setFontSize(8);
      doc.text("Student No.: ________________________", marginX, headerStartY + 35);
      doc.text("Student Name: ______________________", pageWidth / 2 + 10, headerStartY + 35);

      let currentY = headerStartY + 42;

      sortedYears.forEach((year) => {
        doc.setFont("times", "bold");
        doc.setFontSize(9);
        doc.text(year.toUpperCase(), marginX, currentY);
        currentY += 3;

        const semesters = getSortedSemesters(groupedData[year]);

        semesters.forEach((semester) => {
          const subjects = groupedData[year][semester] || [];
          if (!subjects.length) return;

          doc.setFont("times", "bold");
          doc.setFontSize(8);
          doc.text(semester.toUpperCase(), marginX, currentY);
          currentY += 3;

          const tableHead = [["Subject Code", "Descriptive Title", "Units", "Pre-Req"]];

          const tableBody = subjects.map((subject) => [
            subject?.subject?.code || "",
            subject?.subject?.descriptive_title || "",
            (subject?.lec_unit || 0) + (subject?.lab_unit || 0),
            formatPrerequisites(subject?.prerequisites),
          ]);

          const totalUnits = subjects.reduce(
            (sum, subject) => sum + (subject?.lec_unit || 0) + (subject?.lab_unit || 0),
            0
          );

          tableBody.push([
            "",
            "Total Credits",
            { content: totalUnits || "", styles: { fontStyle: "bold" } },
            "",
          ]);

          autoTable(doc, {
            startY: currentY,
            margin: { left: marginX, right: marginX },
            head: tableHead,
            body: tableBody,
            theme: "grid",
            styles: {
              fontSize: 7,
              cellPadding: 0.9,
              halign: "center",
              valign: "middle",
            },
            headStyles: {
              fillColor: [215, 223, 236],
              textColor: 0,
              fontStyle: "bold",
            },
            alternateRowStyles: { fillColor: [244, 248, 252] },
            columnStyles: {
              0: { cellWidth: 32, halign: "left" },
              1: { cellWidth: 92, halign: "left" },
              2: { cellWidth: 16 },
              3: { cellWidth: 38, halign: "left" },
            },
            tableWidth: contentWidth,
          });

          currentY = doc.lastAutoTable.finalY + 6;

          if (currentY > pageHeight - 40) {
            doc.addPage();
            currentY = 20;
          }
        });

        currentY += 3;
        if (currentY > pageHeight - 40) {
          doc.addPage();
          currentY = 20;
        }
      });

      const footerY = Math.max(currentY + 6, pageHeight - 30);
      doc.setFontSize(7);
      doc.text(
        "Name and Signature of Evaluator: ________________________________",
        marginX,
        footerY
      );
      doc.text(
        "Name and Signature of Student: _________________________________",
        marginX,
        footerY + 6
      );

      doc.save("Curriculum.pdf");
    } catch (error) {
      console.error("Failed to generate PDF", error);
    } finally {
      setIsExporting(false);
    }
  };

  // 🔹 Export to Excel
  const exportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const sheetData = [];

      sheetData.push(["BUKIDNON STATE UNIVERSITY"]);
      sheetData.push(["Malaybalay City, Bukidnon 8700"]);
      sheetData.push(["Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717; www.buksu.edu.ph"]);
      sheetData.push([]);
      sheetData.push(["Prospectus for Student Evaluation"]);
      sheetData.push([
        `${curriculum.course?.name || ""} ${
          curriculum.major ? `- Major in ${curriculum.major.name}` : ""
        }`,
      ]);
      sheetData.push(["Reference: CMO 17 s. 2017"]);
      sheetData.push([]);
      sheetData.push(["Student No.", "", "", "", "", "", "Student Name."]);
      sheetData.push([]);

      sortedYears.forEach((year) => {
        sheetData.push([year.toUpperCase()]);
        const semesters = getSortedSemesters(groupedData[year]);

        for (let index = 0; index < semesters.length; index += 2) {
          const leftSem = semesters[index];
          const rightSem = semesters[index + 1];
          const leftSubjects = groupedData[year][leftSem] || [];
          const rightSubjects = rightSem ? groupedData[year][rightSem] || [] : [];
          const maxRows = Math.max(leftSubjects.length, rightSubjects.length, 1);

          sheetData.push([
            leftSem ? leftSem.toUpperCase() : "",
            "",
            "",
            "",
            "",
            "",
            rightSem ? rightSem.toUpperCase() : "",
            "",
            "",
            "",
            "",
          ]);

          sheetData.push([
            "Grade",
            "Subject Code",
            "Descriptive Title",
            "Units",
            "Pre-Req",
            "",
            "Grade",
            "Subject Code",
            "Descriptive Title",
            "Units",
            "Pre-Req",
          ]);

          for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
            const left = leftSubjects[rowIndex];
            const right = rightSubjects[rowIndex];

            sheetData.push([
              "",
              left?.subject?.code || "",
              left?.subject?.descriptive_title || "",
              left ? (left.lec_unit || 0) + (left.lab_unit || 0) : "",
              left ? formatPrerequisites(left.prerequisites) : "",
              "",
              "",
              right?.subject?.code || "",
              right?.subject?.descriptive_title || "",
              right ? (right.lec_unit || 0) + (right.lab_unit || 0) : "",
              right ? formatPrerequisites(right.prerequisites) : "",
            ]);
          }

          sheetData.push([
            "",
            "",
            "Total Credits",
            leftSubjects.reduce(
              (sum, subj) => sum + (subj.lec_unit || 0) + (subj.lab_unit || 0),
              0
            ) || "",
            "",
            "",
            "",
            "Total Credits",
            rightSubjects.reduce(
              (sum, subj) => sum + (subj.lec_unit || 0) + (subj.lab_unit || 0),
              0
            ) || "",
            "",
            "",
          ]);

          sheetData.push([]);
        }

        sheetData.push([]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 48 },
        { wch: 8 },
        { wch: 24 },
        { wch: 3 },
        { wch: 6 },
        { wch: 14 },
        { wch: 48 },
        { wch: 8 },
        { wch: 24 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Curriculum");
      XLSX.writeFile(workbook, "Curriculum.xlsx");
    } catch (error) {
      console.error("Failed to generate Excel file", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminLayout>
      <Head title={`Curriculum - ${curriculum.course?.code}`} />

      <div className="p-6 font-sans text-gray-800 min-h-[70vh]">
        {/* 🔹 Back Button */}
        <div className="mb-4">
          <Link
            href={route("admin.curricula.index")}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft size={16} weight="bold" /> Back
          </Link>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-blue-600">
            <SpinnerGap size={40} weight="bold" className="animate-spin" />
            <span className="text-sm font-medium">Loading curriculum...</span>
          </div>
        ) : (
          <>
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
                  disabled={isExporting}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-white text-xs font-medium rounded-md shadow-sm transition ${
                    isExporting
                      ? "bg-red-500/40 cursor-not-allowed"
                      : "bg-red-500/80 hover:bg-red-500"
                  }`}
                >
                  <FilePdf size={16} weight="bold" />
                  {isExporting ? "Exporting..." : "PDF"}
                </button>
                <button
                  onClick={exportExcel}
                  disabled={isExporting}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-white text-xs font-medium rounded-md shadow-sm transition ${
                    isExporting
                      ? "bg-emerald-500/40 cursor-not-allowed"
                      : "bg-emerald-500/80 hover:bg-emerald-500"
                  }`}
                >
                  <FileXls size={16} weight="bold" />
                  {isExporting ? "Exporting..." : "Excel"}
                </button>
              </div>
            </div>

            {/* Curriculum Body */}
            <div className="space-y-6">
              {sortedYears.map((year) => (
                <div key={year}>
                  <h2 className="text-base font-semibold text-blue-700 mb-3">{year}</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getSortedSemesters(groupedData[year]).map((sem) => (
                      <div
                        key={sem}
                        className="border rounded-md shadow bg-white overflow-hidden"
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
          </>
        )}
      </div>
    </AdminLayout>
  );
}
