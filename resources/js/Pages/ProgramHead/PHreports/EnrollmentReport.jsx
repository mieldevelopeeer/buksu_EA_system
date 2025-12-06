import React, { useCallback, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const formatNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "0";

const formatSummaryTotals = (entries) =>
  entries.reduce((acc, [, total]) => acc + (Number(total) || 0), 0);

const loadLogoImage = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/images/buksu_logo.png";
  });

export default function EnrollmentReport({ summary = {}, recent = [] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [timeframeFilter, setTimeframeFilter] = useState("all");

  const statusOptions = useMemo(() => [
    "all",
    ...Object.keys(summary.by_status || {}).filter((value) => value !== null && value !== undefined),
  ], [summary]);

  const yearOptions = useMemo(() => [
    "all",
    ...summary.by_year?.map((row) => row.year_level).filter(Boolean) || [],
  ], [summary]);

  const programOptions = useMemo(() => [
    "all",
    ...summary.by_program?.map((row) => row.program).filter(Boolean) || [],
  ], [summary]);

  const quickStatusOptions = useMemo(
    () => statusOptions.filter((option) => option !== "all").slice(0, 4),
    [statusOptions]
  );

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

  const dateWithinTimeframe = (dateString) => {
    if (timeframeFilter === "all" || !dateString) return true;
    const recordDate = new Date(dateString);
    if (Number.isNaN(recordDate.getTime())) return true;

    const now = new Date();
    const timeframeMap = {
      week: 7,
      month: 30,
      quarter: 90,
    };
    const days = timeframeMap[timeframeFilter];
    if (!days) return true;
    const pastDate = new Date(now);
    pastDate.setDate(now.getDate() - days);
    return recordDate >= pastDate && recordDate <= now;
  };

  const filteredRecent = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return recent.filter((row) => {
      const matchesStatus = statusFilter === "all" || (row.status || "").toLowerCase() === statusFilter.toLowerCase();
      const matchesYear = yearFilter === "all" || row.year_level === yearFilter;
      const matchesProgram = programFilter === "all" || row.program === programFilter;
      const matchesTimeframe = dateWithinTimeframe(row.recorded_at);
      const matchesTerm =
        term === "" ||
        (row.student_name || "").toLowerCase().includes(term) ||
        (row.student_id || "").toLowerCase().includes(term) ||
        (row.program || "").toLowerCase().includes(term);

      return matchesStatus && matchesYear && matchesProgram && matchesTimeframe && matchesTerm;
    });
  }, [recent, statusFilter, yearFilter, programFilter, timeframeFilter, searchTerm]);

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

  const topStatus = useMemo(() => {
    if (!summary.by_status) return null;
    return Object.entries(summary.by_status).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0] || null;
  }, [summary]);

  const topYear = useMemo(() => {
    if (!summary.by_year) return null;
    return [...summary.by_year].sort((a, b) => (b.total || 0) - (a.total || 0))[0] || null;
  }, [summary]);

  const totalStatusCount = useMemo(() => formatSummaryTotals(Object.entries(summary.by_status || {})), [summary]);

  const getPercent = (value, total) => {
    if (!total) return 0;
    return Math.round(((Number(value) || 0) / total) * 100);
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setYearFilter("all");
    setProgramFilter("all");
    setTimeframeFilter("all");
    setSearchTerm("");
  };

  const timeframeOptions = [
    { value: "all", label: "Any time" },
    { value: "week", label: "Last 7 days" },
    { value: "month", label: "Last 30 days" },
    { value: "quarter", label: "Last 90 days" },
  ];

  const currentFilterSummary = `Status: ${statusFilter === "all" ? "All" : statusFilter} • Year: ${yearFilter === "all" ? "All" : yearFilter} • Program: ${
    programFilter === "all" ? "All" : programFilter
  } • Timeframe: ${timeframeOptions.find((opt) => opt.value === timeframeFilter)?.label || "Any time"} • Search: ${
    searchTerm ? `"${searchTerm}"` : "None"
  }`;

  const programBreakdown = summary.program_breakdown || [];
  const grandTotals = summary.grand_totals || {};

  const templateRows = useMemo(() => {
    const rows = [];
    programBreakdown.forEach((program) => {
      (program.rows || []).forEach((row) => {
        rows.push({
          label: row.label,
          male: row.male ?? 0,
          female: row.female ?? 0,
          total: row.total ?? 0,
        });
      });
      if (program.totals) {
        rows.push({
          label: program.totals.label || `TOTAL ${program.course_code || "PROGRAM"}`,
          male: program.totals.male ?? 0,
          female: program.totals.female ?? 0,
          total: program.totals.total ?? 0,
          isSubtotal: true,
        });
      }
    });
    return rows;
  }, [programBreakdown]);

  const templateMeta = useMemo(() => {
    const meta = summary.meta || {};
    return {
      campus: meta.campus || "ALUBIJID",
      semester: meta.semester || "—",
      schoolYear: meta.school_year || "—",
      preparedBy: meta.prepared_by || "—",
      preparedRole: meta.prepared_role || "Program Head",
      date: meta.date || new Date().toLocaleDateString(),
    };
  }, [summary.meta]);

  const handleExportPDF = () => {
    if (!templateRows.length && !exportRows.length) return;

    const generateTemplate = async () => {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 18;
      let cursorY = 16;

      const logo = await loadLogoImage();
      if (logo) {
        doc.addImage(logo, "PNG", marginX - 6, cursorY - 6, 18, 18);
      }

      doc.setFont("Times", "Bold");
      doc.setFontSize(12);
      doc.text("BUKIDNON STATE UNIVERSITY", pageWidth / 2, cursorY, { align: "center" });
      doc.setFont("Times", "Normal");
      doc.setFontSize(9);
      doc.text("Malaybalay City, Bukidnon 8700", pageWidth / 2, cursorY + 5, { align: "center" });
      doc.text("Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph", pageWidth / 2, cursorY + 9, { align: "center" });

      doc.setFont("Times", "Bold");
      doc.setFontSize(11);
      doc.text("ENROLLMENT REPORT FOR SATELLITE CAMPUS", pageWidth / 2, cursorY + 18, { align: "center" });
      doc.setFont("Times", "Normal");
      doc.text(
        `CAMPUS: ${templateMeta.campus}    Semester: ${templateMeta.semester}    S.Y.: ${templateMeta.schoolYear}`,
        pageWidth / 2,
        cursorY + 24,
        { align: "center" }
      );

      const tableStartY = cursorY + 34;
      const tableBody = (templateRows.length ? templateRows : exportRows.map((row) => ({
        label: row.Program,
        male: row.Male ?? "",
        female: row.Female ?? "",
        total: row.total ?? row.Total ?? "",
      }))).map((row) => (
        [row.label || "—", row.male ?? 0, row.female ?? 0, row.total ?? 0]
      ));

      if (templateRows.length) {
        tableBody.push([
          "TOTAL ENROLLMENT",
          grandTotals.male ?? 0,
          grandTotals.female ?? 0,
          grandTotals.overall ?? 0,
        ]);
      }

      autoTable(doc, {
        startY: tableStartY,
        head: [["COURSE/YEAR", "MALE", "FEMALE", "TOTAL"]],
        body: tableBody,
        styles: { fontSize: 9, font: "Times", halign: "center", cellPadding: 2 },
        headStyles: { fontStyle: "bold", fillColor: [240, 240, 240], textColor: 20 },
        columnStyles: {
          0: { cellWidth: 80, halign: "left" },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 },
        },
        bodyStyles: { textColor: 30 },
        alternateRowStyles: { fillColor: [252, 252, 252] },
      });

      const tableEndY = doc.lastAutoTable.finalY + 6;
      doc.setFont("Times", "Italic");
      doc.setFontSize(8);
      doc.text("Add rows if necessary", marginX, tableEndY);

      const signatureY = tableEndY + 16;
      doc.setFont("Times", "Normal");
      doc.setFontSize(9);
      doc.text("Prepared by:", marginX, signatureY - 6);
      doc.setFont("Times", "Bold");
      doc.text(templateMeta.preparedBy, marginX, signatureY, { align: "left" });
      doc.setFont("Times", "Normal");
      doc.text(templateMeta.preparedRole, marginX, signatureY + 4);
      doc.setFontSize(7);
      doc.text("(signature over printed name)", marginX, signatureY + 8);

      const footerY = signatureY + 16;
      doc.setFont("Times", "Normal");
      doc.setFontSize(7);
      doc.text(currentFilterSummary, marginX, footerY, { maxWidth: pageWidth - marginX * 2 });

      const pdfDate = templateMeta.date?.replace(/\//g, "-") || new Date().toLocaleDateString().replace(/\//g, "-");
      doc.save(`Enrollment Report - ${pdfDate}.pdf`);
    };

    generateTemplate();
  };

  const handleExportExcel = () => {
    if (!exportRows.length) return;

    const metadataRows = [
      ["BUKIDNON STATE UNIVERSITY"],
      ["Malaybalay City, Bukidnon 8700"],
      ["Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph"],
      ["ENROLLMENT REPORT FOR SATELLITE CAMPUS"],
      [`CAMPUS: ${templateMeta.campus}    Semester: ${templateMeta.semester}    S.Y.: ${templateMeta.schoolYear}`],
      [currentFilterSummary],
      ["Generated", templateMeta.date || new Date().toLocaleString()],
      [],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(metadataRows);
    XLSX.utils.sheet_add_json(worksheet, exportRows, {
      origin: metadataRows.length,
      skipHeader: false,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Enrollments");
    const excelDate = (templateMeta.date || new Date().toLocaleDateString()).replace(/\//g, "-");
    XLSX.writeFile(workbook, `Enrollment Report - ${excelDate}.xlsx`);
  };

  const handlePrint = useCallback(() => {
    if (typeof window === "undefined") return;
    const printWindow = window.open("", "_blank", "width=1024,height=768");
    if (!printWindow) return;

    const tableRows = (templateRows.length ? templateRows : []).map(
      (row) => `
        <tr>
          <td>${row.label || "—"}</td>
          <td class="text-center">${row.male ?? 0}</td>
          <td class="text-center">${row.female ?? 0}</td>
          <td class="text-center">${row.total ?? 0}</td>
        </tr>`
    );

    if (templateRows.length) {
      tableRows.push(`
        <tr class="font-semibold">
          <td>TOTAL ENROLLMENT</td>
          <td class="text-center">${grandTotals.male ?? 0}</td>
          <td class="text-center">${grandTotals.female ?? 0}</td>
          <td class="text-center">${grandTotals.overall ?? 0}</td>
        </tr>`);
    }

    const recentRows = filteredRecent.map(
      (row) => `
        <tr>
          <td>
            <div class="font-semibold">${row.student_name || "Unnamed"}</div>
            <div class="text-muted">ID: ${row.student_id || "—"}</div>
          </td>
          <td>${row.program || "—"}</td>
          <td class="text-center">${row.year_level || "—"}</td>
          <td class="text-center">${row.status || "—"}</td>
          <td class="text-right">${row.recorded_at || "—"}</td>
        </tr>`
    );

    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>Enrollment Report</title>
    <style>
      body { font-family: "Inter", "Poppins", sans-serif; color: #0f172a; margin: 24px; }
      h1 { font-size: 16px; margin: 0; }
      h2 { font-size: 14px; margin-bottom: 4px; }
      .meta { font-size: 11px; color: #475569; margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; }
      th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
      th { background: #f8fafc; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; color: #475569; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-muted { font-size: 10px; color: #94a3b8; }
      .section { margin-top: 20px; }
    </style>
  </head>
  <body>
    <div style="text-align:center; margin-bottom: 12px;">
      <div class="meta">BUKIDNON STATE UNIVERSITY</div>
      <div class="meta">Malaybalay City, Bukidnon 8700</div>
      <div class="meta">Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph</div>
      <h1>ENROLLMENT REPORT FOR SATELLITE CAMPUS</h1>
      <div class="meta">CAMPUS: ${templateMeta.campus} • Semester: ${templateMeta.semester} • S.Y.: ${templateMeta.schoolYear}</div>
      <div class="meta">${currentFilterSummary}</div>
      <div class="meta">Generated: ${templateMeta.date}</div>
    </div>

    <div class="section">
      <h2>Program Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Course / Year</th>
            <th class="text-center">Male</th>
            <th class="text-center">Female</th>
            <th class="text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows.join("\n") || `<tr><td colspan="4" class="text-center">No enrollment breakdown available.</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Recent Enrollment Activity</h2>
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Program</th>
            <th class="text-center">Year</th>
            <th class="text-center">Status</th>
            <th class="text-right">Recorded</th>
          </tr>
        </thead>
        <tbody>
          ${recentRows.join("\n") || `<tr><td colspan="5" class="text-center">No recent enrollment activity.</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="section" style="margin-top: 32px;">
      <div class="meta">Prepared by:</div>
      <div style="font-weight:600;">${templateMeta.preparedBy}</div>
      <div class="meta">${templateMeta.preparedRole}</div>
    </div>
  </body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, [
    templateRows,
    grandTotals.male,
    grandTotals.female,
    grandTotals.overall,
    filteredRecent,
    templateMeta.campus,
    templateMeta.semester,
    templateMeta.schoolYear,
    templateMeta.date,
    templateMeta.preparedBy,
    templateMeta.preparedRole,
    currentFilterSummary,
  ]);

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
            onClick={handlePrint}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Print
          </button>
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
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-[11px] font-semibold text-slate-700">Filters</h3>
            <p className="text-[11px] text-slate-500">{filteredRecent.length} results · {currentFilterSummary}</p>
          </div>
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
            <select
              value={programFilter}
              onChange={(event) => setProgramFilter(event.target.value)}
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
            >
              {programOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Programs" : option}
                </option>
              ))}
            </select>
            <select
              value={timeframeFilter}
              onChange={(event) => setTimeframeFilter(event.target.value)}
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
            >
              {timeframeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 transition hover:bg-slate-50"
              disabled={
                statusFilter === "all" &&
                yearFilter === "all" &&
                programFilter === "all" &&
                timeframeFilter === "all" &&
                !searchTerm
              }
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="text-[11px] font-semibold text-slate-700">By Status</h3>
          <div className="mt-2 space-y-2">
            {filteredStatusEntries.length > 0 ? (
              filteredStatusEntries.map(([status, total]) => (
                <div key={status || "unspecified"} className="space-y-1 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{status || "Unspecified"}</span>
                    <span className="font-semibold text-slate-800">{formatNumber(total)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-sky-400 transition-all"
                      style={{ width: `${getPercent(total, totalStatusCount)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">{getPercent(total, totalStatusCount)}% of total</p>
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
                <div key={row.year_level} className="space-y-1 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>{row.year_level || "Unassigned"}</span>
                    <span className="font-semibold text-slate-800">{formatNumber(row.total)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all"
                      style={{ width: `${getPercent(row.total, totalFiltered || summary.total)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">{getPercent(row.total, totalFiltered || summary.total)}% share</p>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-400">No year-level data.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="text-[11px] font-semibold text-slate-700">Insights</h3>
          <div className="mt-2 space-y-3 text-[12px] text-slate-600">
            <div className="rounded border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Top Status</p>
              {topStatus ? (
                <>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{topStatus[0]}</p>
                  <p className="text-[11px] text-slate-500">{formatNumber(topStatus[1])} students</p>
                </>
              ) : (
                <p className="text-[11px] text-slate-400">No status data.</p>
              )}
            </div>
            <div className="rounded border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Busiest Year Level</p>
              {topYear ? (
                <>
                  <p className="text-sm font-semibold text-slate-900">{topYear.year_level || "Unassigned"}</p>
                  <p className="text-[11px] text-slate-500">{formatNumber(topYear.total)} enrollments</p>
                </>
              ) : (
                <p className="text-[11px] text-slate-400">No year data.</p>
              )}
            </div>
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
