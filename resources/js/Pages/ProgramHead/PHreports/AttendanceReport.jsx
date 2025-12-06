import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const formatNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "0";

const loadLogoImage = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/images/buksu_logo.png";
  });

const buildSubjectLabel = (session = {}) => {
  const subject = session.subject?.trim?.() || session.subject;
  const code = session.subject_code;
  if (code && subject) return `${code} · ${subject}`;
  if (code) return code;
  if (subject) return subject;
  return "—";
};

export default function AttendanceReport({ summary = {}, recent = [] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [instructorFilter, setInstructorFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const sessions = Array.isArray(recent) ? recent : [];
  const filters = summary.filters || {};
  const statusEntries = useMemo(() => Object.entries(summary.by_status || {}), [summary]);
  const sectionEntries = summary.by_section || [];

  const statusOptions = useMemo(
    () => [
      "all",
      ...statusEntries.map(([status]) => status).filter((value) => value !== undefined && value !== null),
    ],
    [statusEntries]
  );

  const sectionOptions = useMemo(() => {
    const set = new Set(["all"]);
    (filters.sections || []).forEach((value) => value && set.add(value));
    sectionEntries.forEach((row) => row?.section && set.add(row.section));
    return Array.from(set);
  }, [filters.sections, sectionEntries]);

  const subjectOptions = useMemo(() => {
    const set = new Set(["all"]);
    (filters.subjects || []).forEach((value) => value && set.add(value));
    return Array.from(set);
  }, [filters.subjects]);

  const instructorOptions = useMemo(() => {
    const set = new Set(["all"]);
    (filters.instructors || []).forEach((value) => value && set.add(value));
    return Array.from(set);
  }, [filters.instructors]);

  const courseOptions = useMemo(() => {
    const set = new Set(["all"]);
    (filters.courses || []).forEach((value) => value && set.add(value));
    return Array.from(set);
  }, [filters.courses]);

  const filteredStatusEntries = useMemo(() => {
    if (statusFilter === "all") return statusEntries;
    return statusEntries.filter(([status]) => status === statusFilter);
  }, [statusEntries, statusFilter]);

  const filteredSectionEntries = useMemo(() => {
    if (sectionFilter === "all") return sectionEntries;
    return sectionEntries.filter((row) => row.section === sectionFilter);
  }, [sectionEntries, sectionFilter]);

  const filteredSessions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return sessions
      .filter((session) => {
        const sectionValue = (session.section || "").toLowerCase();
        const subjectLabel = buildSubjectLabel(session);
        const subjectValue = subjectLabel.toLowerCase();
        const instructorValue = (session.instructor || "").toLowerCase();
        const courseValue = (session.course || "").toLowerCase();
        const statusValues = Object.keys(session.status_counts || {}).length
          ? Object.keys(session.status_counts || {})
          : [session.status];

        const matchesStatus =
          statusFilter === "all" ||
          statusValues.some((status) => (status || "").toLowerCase() === statusFilter.toLowerCase());
        const matchesSection = sectionFilter === "all" || sectionValue === sectionFilter.toLowerCase();
        const matchesSubject = subjectFilter === "all" || subjectLabel === subjectFilter;
        const matchesInstructor = instructorFilter === "all" || instructorValue === instructorFilter.toLowerCase();
        const matchesCourse = courseFilter === "all" || courseValue === courseFilter.toLowerCase();

        const matchesTerm =
          term === "" ||
          [sectionValue, subjectValue, instructorValue, courseValue, session.date?.toLowerCase?.(), session.recorded_at?.toLowerCase?.()]
            .filter(Boolean)
            .some((value) => value.includes(term)) ||
          (session.students || []).some((student) => {
            const name = (student.student || "").toLowerCase();
            const id = (student.student_id || "").toLowerCase();
            return name.includes(term) || id.includes(term);
          });

        return matchesStatus && matchesSection && matchesSubject && matchesInstructor && matchesCourse && matchesTerm;
      })
      .map((session) => ({
        ...session,
        subjectLabel: buildSubjectLabel(session),
        statusCounts: session.status_counts || {},
        students: Array.isArray(session.students) ? session.students : [],
      }));
  }, [sessions, statusFilter, sectionFilter, subjectFilter, instructorFilter, courseFilter, searchTerm]);

  const totalSessionsFiltered = filteredSessions.length || summary.total || 0;
  const totalStudentsTracked = useMemo(
    () => filteredSessions.reduce((acc, session) => acc + session.students.length, 0),
    [filteredSessions]
  );
  const latestSessionLabel = filteredSessions.length ? filteredSessions[0].date || "—" : summary.latest || "—";

  const exportRows = useMemo(
    () =>
      filteredSessions.flatMap((session) => {
        const rows = session.students.length
          ? session.students
          : [{ student: "—", student_id: "—", status: session.status || "—" }];

        return rows.map((student) => ({
          Section: session.section || "—",
          Subject: session.subjectLabel || "—",
          Student: student.student || "—",
          ID: student.student_id || "—",
          Status: student.status || session.status || "—",
          Date: session.date || "—",
          Instructor: session.instructor || "TBA",
          Recorded: session.recorded_at || "—",
        }));
      }),
    [filteredSessions]
  );

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
    if (!exportRows.length) return;

    const generateTemplate = async () => {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
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
      doc.text("ATTENDANCE REPORT FOR SATELLITE CAMPUS", pageWidth / 2, cursorY + 18, { align: "center" });
      doc.setFont("Times", "Normal");
      doc.text(
        `CAMPUS: ${templateMeta.campus}    Semester: ${templateMeta.semester}    S.Y.: ${templateMeta.schoolYear}`,
        pageWidth / 2,
        cursorY + 24,
        { align: "center" }
      );

      const tableStartY = cursorY + 34;
      autoTable(doc, {
        startY: tableStartY,
        head: [["SECTION", "SUBJECT", "STUDENT", "ID", "STATUS", "DATE", "INSTRUCTOR", "RECORDED"]],
        body: exportRows.map((row) => [
          row.Section,
          row.Subject,
          row.Student,
          row.ID,
          row.Status,
          row.Date,
          row.Instructor,
          row.Recorded,
        ]),
        styles: { fontSize: 9, font: "Times", cellPadding: 2 },
        headStyles: { fontStyle: "bold", fillColor: [240, 240, 240], textColor: 20 },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 48 },
          2: { cellWidth: 46 },
          3: { cellWidth: 24 },
          4: { cellWidth: 24 },
          5: { cellWidth: 28 },
          6: { cellWidth: 44 },
          7: { cellWidth: 38 },
        },
        bodyStyles: { textColor: 30 },
        alternateRowStyles: { fillColor: [252, 252, 252] },
      });

      const tableEndY = doc.lastAutoTable.finalY + 8;
      doc.setFont("Times", "Normal");
      doc.setFontSize(9);
      doc.text("Prepared by:", marginX, tableEndY);
      doc.setFont("Times", "Bold");
      doc.text(templateMeta.preparedBy, marginX, tableEndY + 6);
      doc.setFont("Times", "Normal");
      doc.text(templateMeta.preparedRole, marginX, tableEndY + 10);
      doc.setFontSize(7);
      doc.text("(signature over printed name)", marginX, tableEndY + 14);

      const footerY = tableEndY + 22;
      doc.text(`Generated: ${templateMeta.date}`, marginX, footerY);

      const pdfDate = templateMeta.date?.replace(/\//g, "-") || new Date().toLocaleDateString().replace(/\//g, "-");
      doc.save(`Attendance Report - ${pdfDate}.pdf`);
    };

    generateTemplate();
  };

  const handleExportExcel = () => {
    if (!exportRows.length) return;

    const metadataRows = [
      ["BUKIDNON STATE UNIVERSITY"],
      ["Malaybalay City, Bukidnon 8700"],
      ["Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph"],
      ["ATTENDANCE REPORT FOR SATELLITE CAMPUS"],
      [`CAMPUS: ${templateMeta.campus}    Semester: ${templateMeta.semester}    S.Y.: ${templateMeta.schoolYear}`],
      ["Generated", templateMeta.date],
      [],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(metadataRows);
    XLSX.utils.sheet_add_json(worksheet, exportRows, {
      origin: metadataRows.length,
      skipHeader: false,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    const excelDate = templateMeta.date.replace(/\//g, "-");
    XLSX.writeFile(workbook, `Attendance Report - ${excelDate}.xlsx`);
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
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(totalSessionsFiltered)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Students Tracked</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(totalStudentsTracked)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Most Recent</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{latestSessionLabel || "—"}</p>
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
            <select
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
            >
              {courseOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Courses" : option}
                </option>
              ))}
            </select>
            <select
              value={instructorFilter}
              onChange={(event) => setInstructorFilter(event.target.value)}
              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
            >
              {instructorOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All Faculty" : option}
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

      <section className="rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-500">
        Showing <span className="font-semibold text-slate-800">{formatNumber(filteredSessions.length)}</span> session
        {filteredSessions.length === 1 ? "" : "s"} · {formatNumber(totalStudentsTracked)} student entries match current filters.
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

      <section className="space-y-3">
        {filteredSessions.length > 0 ? (
          filteredSessions.map((session) => (
            <article
              key={session.session_key}
              className="rounded-xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm"
            >
              <header className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{session.subjectLabel}</h4>
                    <p className="text-[11px] text-slate-500">
                      {session.course || "Program"} • {session.section || "—"}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    <div>Faculty: <span className="font-medium text-slate-800">{session.instructor || "TBA"}</span></div>
                    <div>{session.date || "—"}</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">
                  Recorded {session.recorded_at || "—"} • {formatNumber(session.students.length)} student
                  {session.students.length === 1 ? "" : "s"}
                </div>
              </header>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {Object.entries(session.statusCounts).map(([label, count]) => (
                  <span
                    key={`${session.session_key}-${label}`}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-slate-600"
                  >
                    <span className="capitalize">{label || "unspecified"}</span>
                    <span className="font-semibold text-slate-900">{formatNumber(count)}</span>
                  </span>
                ))}
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-[12px] text-slate-600">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-3 py-1.5 text-left">Student</th>
                      <th className="px-3 py-1.5 text-left">ID Number</th>
                      <th className="px-3 py-1.5 text-left">Status</th>
                      <th className="px-3 py-1.5 text-left">Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.students.length > 0 ? (
                      session.students.map((student, index) => (
                        <tr key={`${session.session_key}-${student.student_id || index}`} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-medium text-slate-800">{student.student || "—"}</td>
                          <td className="px-3 py-1.5 text-[11px] text-slate-500">{student.student_id || "—"}</td>
                          <td className="px-3 py-1.5 capitalize">{student.status || "—"}</td>
                          <td className="px-3 py-1.5 text-[11px] text-slate-500">{session.recorded_at || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-[11px] text-slate-400">
                          No student attendance entries recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[12px] text-slate-500">
            No attendance sessions match your current filters.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <h3 className="text-[11px] font-semibold text-slate-700">Student Attendance Summary</h3>
        <div className="mt-3 space-y-4">
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session) => {
              const students = session.students.length
                ? session.students
                : [{ student: "—", student_id: "—", status: session.status || "—" }];

              return (
                <article key={`summary-${session.session_key}`} className="rounded-xl border border-slate-100">
                  <header className="border-b border-slate-100 px-4 py-3 text-[11px] text-slate-500">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{session.subjectLabel}</p>
                        <p className="text-[11px] text-slate-500">Section {session.section || "—"}</p>
                      </div>
                      <div className="text-right">
                        <p>Faculty: <span className="font-medium text-slate-800">{session.instructor || "TBA"}</span></p>
                        <p>Date: {session.date || "—"}</p>
                      </div>
                    </div>
                    <p className="mt-1">Recorded: {session.recorded_at || "—"}</p>
                  </header>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] border-collapse text-[12px] text-slate-600">
                      <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-3 py-1.5 text-left">#</th>
                          <th className="px-3 py-1.5 text-left">ID Number</th>
                          <th className="px-3 py-1.5 text-left">Student</th>
                          <th className="px-3 py-1.5 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, index) => (
                          <tr key={`${session.session_key}-summary-${student.student_id || index}`} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-1.5 text-[11px] text-slate-500">{index + 1}</td>
                            <td className="px-3 py-1.5 text-[11px] text-slate-500">{student.student_id || "—"}</td>
                            <td className="px-3 py-1.5 font-medium text-slate-800">{student.student || "—"}</td>
                            <td className="px-3 py-1.5 capitalize">{student.status || session.status || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[12px] text-slate-400">
              No student attendance entries for the selected filters.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
