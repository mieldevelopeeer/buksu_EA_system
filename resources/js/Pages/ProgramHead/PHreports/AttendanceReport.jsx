import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const formatNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "0";

export default function AttendanceReport({ summary = {}, recent = [] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const statusEntries = useMemo(() => Object.entries(summary.by_status || {}), [summary]);
  const sectionEntries = summary.by_section || [];

  const statusOptions = useMemo(
    () => [
      "all",
      ...statusEntries.map(([status]) => status).filter((value) => value !== undefined && value !== null),
    ],
    [statusEntries]
  );

  const sectionOptions = useMemo(
    () => [
      "all",
      ...sectionEntries.map((row) => row.section).filter(Boolean),
    ],
    [sectionEntries]
  );

  const filteredStatusEntries = useMemo(() => {
    if (statusFilter === "all") return statusEntries;
    return statusEntries.filter(([status]) => status === statusFilter);
  }, [statusEntries, statusFilter]);

  const filteredSectionEntries = useMemo(() => {
    if (sectionFilter === "all") return sectionEntries;
    return sectionEntries.filter((row) => row.section === sectionFilter);
  }, [sectionEntries, sectionFilter]);

  const filteredRecent = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return recent.filter((row) => {
      const matchesStatus = statusFilter === "all" || (row.status || "").toLowerCase() === statusFilter.toLowerCase();
      const matchesSection = sectionFilter === "all" || (row.section || "").toLowerCase() === sectionFilter.toLowerCase();
      const matchesTerm =
        term === "" ||
        (row.section || "").toLowerCase().includes(term) ||
        (row.subject || "").toLowerCase().includes(term) ||
        (row.instructor || "").toLowerCase().includes(term);

      return matchesStatus && matchesSection && matchesTerm;
    });
  }, [recent, statusFilter, sectionFilter, searchTerm]);

  const totalFiltered = useMemo(() => {
    if (statusFilter === "all") return summary.total ?? filteredStatusEntries.reduce((acc, [, total]) => acc + (Number(total) || 0), 0);
    return filteredStatusEntries.reduce((acc, [, total]) => acc + (Number(total) || 0), 0);
  }, [summary, filteredStatusEntries, statusFilter]);

  const exportRows = useMemo(() => filteredRecent.map((row) => ({
    Section: row.section || "—",
    Subject: row.subject || "—",
    Status: row.status || "—",
    Date: row.date || "—",
    Instructor: row.instructor || "TBA",
    Recorded: row.recorded_at || "—",
  })), [filteredRecent]);

  const handleExportPDF = () => {
    if (!exportRows.length) return;

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    doc.text("Attendance Report", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Section", "Subject", "Status", "Date", "Instructor", "Recorded"]],
      body: exportRows.map((row) => [row.Section, row.Subject, row.Status, row.Date, row.Instructor, row.Recorded]),
      styles: { fontSize: 9 },
    });
    doc.save("program-head-attendance-report.pdf");
  };

  const handleExportExcel = () => {
    if (!exportRows.length) return;

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "program-head-attendance-report.xlsx");
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 text-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-900">Attendance Snapshot</h2>
          <p className="text-[11px] text-slate-500">
            Tracks attendance submissions from faculty across active sections.
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
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Sessions Logged</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(totalFiltered)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Distinct Sections</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(summary.sections)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Most Recent</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{summary.latest || "—"}</p>
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
              placeholder="Search by section, subject, or instructor"
              className="w-full rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 shadow-sm focus:border-sky-300 focus:outline-none focus:ring focus:ring-sky-100 sm:w-60"
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
              value={sectionFilter}
              onChange={(event) => setSectionFilter(event.target.value)}
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
            >
              {sectionOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Sections" : option}
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
              <p className="text-[11px] text-slate-400">No attendance status data.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="text-[11px] font-semibold text-slate-700">Top Sections</h3>
          <div className="mt-2 space-y-2">
            {filteredSectionEntries.length > 0 ? (
              filteredSectionEntries.map((row, index) => (
                <div key={`${row.section}-${index}`} className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-600">
                  <span>{row.section || "Unnamed Section"}</span>
                  <span className="font-semibold text-slate-800">{formatNumber(row.total)}</span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-400">No section distribution yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-3">
        <h3 className="text-[11px] font-semibold text-slate-700">Recent Attendance Activity</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-[12px] text-slate-600">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-3 py-1.5 text-left">Section</th>
                <th className="px-3 py-1.5 text-left">Subject</th>
                <th className="px-3 py-1.5 text-left">Status</th>
                <th className="px-3 py-1.5 text-left">Date</th>
                <th className="px-3 py-1.5 text-right">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecent.length > 0 ? (
                filteredRecent.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-medium text-slate-800">
                      <div>{row.section || "—"}</div>
                      <div className="text-[10px] text-slate-400">Instructor: {row.instructor || "TBA"}</div>
                    </td>
                    <td className="px-3 py-1.5">{row.subject || "—"}</td>
                    <td className="px-3 py-1.5 capitalize">{row.status || "—"}</td>
                    <td className="px-3 py-1.5">{row.date || "—"}</td>
                    <td className="px-3 py-1.5 text-right text-[11px] text-slate-500">{row.recorded_at || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[12px] text-slate-400">
                    No recent attendance submissions.
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
