import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const formatNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "0";

const formatAverage = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—";

export default function GradeReport({ summary = {}, recent = [] }) {
  const [remarksFilter, setRemarksFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const remarkEntries = useMemo(() => Object.entries(summary.by_remarks || {}), [summary]);
  const topSubjects = summary.top_subjects || [];

  const remarkOptions = useMemo(
    () => [
      "all",
      ...remarkEntries
        .map(([remarks]) => remarks)
        .filter((value) => value !== undefined && value !== null),
    ],
    [remarkEntries]
  );

  const subjectOptions = useMemo(
    () => [
      "all",
      ...topSubjects.map((row) => row.subject).filter(Boolean),
    ],
    [topSubjects]
  );

  const filteredRemarkEntries = useMemo(() => {
    if (remarksFilter === "all") return remarkEntries;
    return remarkEntries.filter(([remarks]) => remarks === remarksFilter);
  }, [remarkEntries, remarksFilter]);

  const filteredSubjects = useMemo(() => {
    if (subjectFilter === "all") return topSubjects;
    return topSubjects.filter((row) => row.subject === subjectFilter);
  }, [topSubjects, subjectFilter]);

  const filteredRecent = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return recent.filter((row) => {
      const matchesRemarks =
        remarksFilter === "all" || (row.remarks || "").toLowerCase() === remarksFilter.toLowerCase();
      const matchesSubject =
        subjectFilter === "all" || (row.subject || "").toLowerCase() === subjectFilter.toLowerCase();
      const matchesTerm =
        term === "" ||
        (row.student || "").toLowerCase().includes(term) ||
        (row.student_id || "").toLowerCase().includes(term) ||
        (row.course || "").toLowerCase().includes(term) ||
        (row.subject || "").toLowerCase().includes(term);

      return matchesRemarks && matchesSubject && matchesTerm;
    });
  }, [recent, remarksFilter, subjectFilter, searchTerm]);

  const totalFiltered = useMemo(() => {
    if (remarksFilter === "all") return summary.total ?? remarkEntries.reduce((acc, [, total]) => acc + (Number(total) || 0), 0);
    return filteredRemarkEntries.reduce((acc, [, total]) => acc + (Number(total) || 0), 0);
  }, [summary, remarkEntries, filteredRemarkEntries, remarksFilter]);

  const exportRows = useMemo(() => filteredRecent.map((row) => ({
    Student: row.student || "Unnamed",
    ID: row.student_id || "—",
    Subject: row.subject || "—",
    Course: row.course || "—",
    Grade: row.grade ?? "—",
    Remarks: row.remarks || "—",
    Updated: row.updated_at || "—",
  })), [filteredRecent]);

  const handleExportPDF = () => {
    if (!exportRows.length) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    doc.text("Grade Report", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Student", "ID", "Subject", "Course", "Grade", "Remarks", "Updated"]],
      body: exportRows.map((row) => [row.Student, row.ID, row.Subject, row.Course, row.Grade, row.Remarks, row.Updated]),
      styles: { fontSize: 9 },
    });
    doc.save("program-head-grade-report.pdf");
  };

  const handleExportExcel = () => {
    if (!exportRows.length) return;

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Grades");
    XLSX.writeFile(workbook, "program-head-grade-report.xlsx");
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 text-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-900">Grade Insights</h2>
          <p className="text-[11px] text-slate-500">
            Snapshot of grade submissions and statuses across faculty loads.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-600 transition hover:bg-rose-100"
            disabled={!exportRows.length}
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-100"
            disabled={!exportRows.length}
          >
            Export Excel
          </button>
        </div>
      </header>

      <section className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Total Records</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(totalFiltered)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Average Grade</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatAverage(summary.average)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Unique Subjects</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(topSubjects.length)}</p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-[11px] font-semibold text-slate-700">Filters</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by student, ID, subject, or course"
              className="w-full rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 shadow-sm focus:border-sky-300 focus:outline-none focus:ring focus:ring-sky-100 sm:w-64"
            />
            <select
              value={remarksFilter}
              onChange={(event) => setRemarksFilter(event.target.value)}
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
            >
              {remarkOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Remarks" : option}
                </option>
              ))}
            </select>
            <select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
            >
              {subjectOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Subjects" : option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="text-[11px] font-semibold text-slate-700">By Remarks</h3>
          <div className="mt-2 space-y-2">
            {filteredRemarkEntries.length > 0 ? (
              filteredRemarkEntries.map(([remarks, total]) => (
                <div key={remarks || "unspecified"} className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-600">
                  <span className="capitalize">{remarks || "Unspecified"}</span>
                  <span className="font-semibold text-slate-800">{formatNumber(total)}</span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-400">No remarks data.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="text-[11px] font-semibold text-slate-700">Top Subjects</h3>
          <div className="mt-2 space-y-2">
            {filteredSubjects.length > 0 ? (
              filteredSubjects.map((row, index) => (
                <div key={`${row.subject}-${index}`} className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-600">
                  <span>{row.subject || "Unnamed Subject"}</span>
                  <span className="font-semibold text-slate-800">{formatNumber(row.total)}</span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-400">No subject distribution available.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <h3 className="text-[11px] font-semibold text-slate-700">Recent Grade Activity</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[12px] text-slate-600">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-3 py-1.5 text-left">Student</th>
                <th className="px-3 py-1.5 text-left">Subject</th>
                <th className="px-3 py-1.5 text-left">Course</th>
                <th className="px-3 py-1.5 text-left">Grade</th>
                <th className="px-3 py-1.5 text-left">Remarks</th>
                <th className="px-3 py-1.5 text-right">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecent.length > 0 ? (
                filteredRecent.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-medium text-slate-800">
                      <div>{row.student || "Unnamed"}</div>
                      <div className="text-[10px] text-slate-400">ID: {row.student_id || "—"}</div>
                    </td>
                    <td className="px-3 py-1.5">{row.subject || "—"}</td>
                    <td className="px-3 py-1.5">{row.course || "—"}</td>
                    <td className="px-3 py-1.5">{row.grade ?? "—"}</td>
                    <td className="px-3 py-1.5 capitalize">{row.remarks || "—"}</td>
                    <td className="px-3 py-1.5 text-right text-[11px] text-slate-500">{row.updated_at || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[12px] text-slate-400">
                    No recent grade activity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
