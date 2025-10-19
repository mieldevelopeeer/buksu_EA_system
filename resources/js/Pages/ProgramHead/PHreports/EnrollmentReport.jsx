import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const formatNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "0";

const formatSummaryTotals = (entries) =>
  entries.reduce((acc, [, total]) => acc + (Number(total) || 0), 0);

export default function EnrollmentReport({ summary = {}, recent = [] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const statusOptions = useMemo(() => [
    "all",
    ...Object.keys(summary.by_status || {}).filter((value) => value !== null && value !== undefined),
  ], [summary]);

  const yearOptions = useMemo(() => [
    "all",
    ...summary.by_year?.map((row) => row.year_level).filter(Boolean) || [],
  ], [summary]);

  const filteredStatusEntries = useMemo(() => {
    const entries = Object.entries(summary.by_status || {});
    if (statusFilter === "all") return entries;
    return entries.filter(([status]) => status === statusFilter);
  }, [summary, statusFilter]);

  const filteredYearEntries = useMemo(() => {
    const entries = summary.by_year || [];
    if (yearFilter === "all") return entries;
    return entries.filter((row) => row.year_level === yearFilter);
  }, [summary, yearFilter]);

  const filteredRecent = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return recent.filter((row) => {
      const matchesStatus = statusFilter === "all" || (row.status || "").toLowerCase() === statusFilter.toLowerCase();
      const matchesYear = yearFilter === "all" || row.year_level === yearFilter;
      const matchesTerm =
        term === "" ||
        (row.student_name || "").toLowerCase().includes(term) ||
        (row.student_id || "").toLowerCase().includes(term) ||
        (row.program || "").toLowerCase().includes(term);

      return matchesStatus && matchesYear && matchesTerm;
    });
  }, [recent, statusFilter, yearFilter, searchTerm]);

  const totalFiltered = useMemo(() => {
    if (statusFilter === "all") return summary.total ?? formatSummaryTotals(filteredStatusEntries);
    return formatSummaryTotals(filteredStatusEntries);
  }, [summary, filteredStatusEntries, statusFilter]);

  const exportRows = useMemo(() => filteredRecent.map((row) => ({
    Student: row.student_name || "Unnamed",
    ID: row.student_id || "—",
    Program: row.program || "—",
    Year: row.year_level || "—",
    Status: row.status || "—",
    Recorded: row.recorded_at || "—",
  })), [filteredRecent]);

  const handleExportPDF = () => {
    if (!exportRows.length) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    doc.text("Enrollment Report", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Student", "ID", "Program", "Year", "Status", "Recorded"]],
      body: exportRows.map((row) => [row.Student, row.ID, row.Program, row.Year, row.Status, row.Recorded]),
      styles: { fontSize: 9 },
    });
    doc.save("program-head-enrollment-report.pdf");
  };

  const handleExportExcel = () => {
    if (!exportRows.length) return;

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Enrollments");
    XLSX.writeFile(workbook, "program-head-enrollment-report.xlsx");
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 text-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-900">Enrollment Overview</h2>
          <p className="text-[11px] text-slate-500">Totals aggregated across programs within your department.</p>
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
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Total Enrollments</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(totalFiltered)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Active Programs</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(summary.programs)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Year Levels</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(filteredYearEntries.length || summary.by_year?.length || 0)}</p>
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
              placeholder="Search by name, ID, or program"
              className="w-full rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 shadow-sm focus:border-sky-300 focus:outline-none focus:ring focus:ring-sky-100 sm:w-56"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Status" : option}
                </option>
              ))}
            </select>
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
            >
              {yearOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Years" : option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="text-[11px] font-semibold text-slate-700">By Status</h3>
          <div className="mt-2 space-y-2">
            {filteredStatusEntries.length > 0 ? (
              filteredStatusEntries.map(([status, total]) => (
                <div key={status || "unspecified"} className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-600">
                  <span className="capitalize">{status || "Unspecified"}</span>
                  <span className="font-semibold text-slate-800">{formatNumber(total)}</span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-400">No status data.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="text-[11px] font-semibold text-slate-700">By Year Level</h3>
          <div className="mt-2 space-y-2">
            {filteredYearEntries.length > 0 ? (
              filteredYearEntries.map((row) => (
                <div key={row.year_level} className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-600">
                  <span>{row.year_level || "Unassigned"}</span>
                  <span className="font-semibold text-slate-800">{formatNumber(row.total)}</span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-400">No year-level data.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <h3 className="text-[11px] font-semibold text-slate-700">Recent Enrollment Activity</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[12px] text-slate-600">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-3 py-1.5 text-left">Student</th>
                <th className="px-3 py-1.5 text-left">Program</th>
                <th className="px-3 py-1.5 text-left">Year</th>
                <th className="px-3 py-1.5 text-left">Status</th>
                <th className="px-3 py-1.5 text-right">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecent.length > 0 ? (
                filteredRecent.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-medium text-slate-800">
                      <div>{row.student_name || "Unnamed"}</div>
                      <div className="text-[10px] text-slate-400">ID: {row.student_id || "—"}</div>
                    </td>
                    <td className="px-3 py-1.5">{row.program || "—"}</td>
                    <td className="px-3 py-1.5">{row.year_level || "—"}</td>
                    <td className="px-3 py-1.5 capitalize">{row.status || "—"}</td>
                    <td className="px-3 py-1.5 text-right text-[11px] text-slate-500">{row.recorded_at || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[12px] text-slate-400">
                    No recent enrollment activity.
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
