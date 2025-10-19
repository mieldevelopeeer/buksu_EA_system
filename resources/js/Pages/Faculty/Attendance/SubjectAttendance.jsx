import React, { useMemo, useState } from "react";
import FacultyLayout from "@/Layouts/FacultyLayout";
import { Head, router } from "@inertiajs/react";
import {
  ArrowLeft,
  CalendarClock,
  Users,
  PlusCircle,
  Eye,
  Pencil,
  Printer,
} from "lucide-react";
import dayjs from "dayjs";

export default function SubjectAttendance({
  section,
  schedule,
  dateSummaries = [],
  records = [],
  studentCount = 0,
  totals = {},
}) {
  const [viewingDate, setViewingDate] = useState(null);

  const viewingDateLabel = viewingDate ? dayjs(viewingDate).format("MMMM DD, YYYY") : "";

  const selectedEntries = useMemo(() => {
    if (!viewingDate || !Array.isArray(records)) return [];

    return records.filter((record) => {
      const dateKey = record.date ? dayjs(record.date).format("YYYY-MM-DD") : null;
      if (!dateKey) return false;
      return dateKey === viewingDate;
    });
  }, [records, viewingDate]);

  const statusBadgeStyles = {
    present: "bg-emerald-50 text-emerald-600",
    absent: "bg-rose-50 text-rose-600",
    late: "bg-amber-50 text-amber-600",
    excused: "bg-sky-50 text-sky-600",
  };

  const handleView = (dateKey) => {
    setViewingDate(dateKey);
  };

  const closeModal = () => {
    setViewingDate(null);
  };

  const handleEdit = (dateKey) => {
    router.visit(
      route("faculty.attendance.add", {
        section: section.id,
        date: dateKey,
        schedule: schedule.id,
      })
    );
  };

  const handleAddAttendance = () => {
    router.visit(
      route("faculty.attendance.add", {
        section: section.id,
        schedule: schedule.id,
      })
    );
  };

  const handlePrintViewedSession = () => {
    if (!viewingDate) return;

    const subjectLabel = schedule?.subjectName || "Subject";
    const courseLabel =
      section?.course?.course_name ||
      section?.course_alias ||
      schedule?.courseLabel ||
      "";
    const sectionLabel = section?.section || section?.name || "Section";
    const scheduleDescriptor = [schedule?.scheduleDay, schedule?.timeRange]
      .filter(Boolean)
      .join(" · ");

    const rowsHtml = selectedEntries.length
      ? selectedEntries
          .map((entry, index) => {
            const user = entry?.enrollment?.user || {};
            const fullName = [user?.lName, user?.fName, user?.mName]
              .filter(Boolean)
              .join(", ")
              .replace(/, ,/g, ", ");
            const status = (entry?.status || "").toLowerCase();
            const formattedStatus = status
              ? status.charAt(0).toUpperCase() + status.slice(1)
              : "—";
            const timeIn = entry.time_in
              ? dayjs(entry.time_in, "HH:mm").format("h:mm A")
              : "—";
            const timeOut = entry.time_out
              ? dayjs(entry.time_out, "HH:mm").format("h:mm A")
              : "—";

            return `
              <tr>
                <td>${index + 1}</td>
                <td>${fullName || "Unnamed Student"}</td>
                <td>${formattedStatus}</td>
                <td>${timeIn}</td>
                <td>${timeOut}</td>
              </tr>
            `;
          })
          .join("")
      : `
          <tr>
            <td colspan="5">No attendance records captured for this date.</td>
          </tr>
        `;

    const printWindow = window.open("", "_blank", "width=1024,height=768");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Report • ${subjectLabel}</title>
          <style>
            @page { margin: 1in; }
            body { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1e293b; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p.meta { font-size: 12px; color: #64748b; margin: 0 0 16px 0; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
            th { background: #f8fafc; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; }
            tbody tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Attendance Report</h1>
          <p class="meta">
            Subject: ${subjectLabel || "—"}<br />
            Course: ${courseLabel || "—"}<br />
            Section: ${sectionLabel || "—"}<br />
            Schedule: ${scheduleDescriptor || "—"}<br />
            Session Date: ${viewingDateLabel || "—"}<br />
            Generated: ${dayjs().format("MMMM DD, YYYY h:mm A")}
          </p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Status</th>
                <th>Time In</th>
                <th>Time Out</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const subjectDescriptor = [schedule?.subjectName, schedule?.courseLabel]
    .filter(Boolean)
    .join(" · ");

  const timelineDescriptor = [schedule?.scheduleDay, schedule?.timeRange]
    .filter(Boolean)
    .join(" · ");

  return (
    <FacultyLayout>
      <Head
        title={`Subject Attendance • ${
          schedule?.subjectName || "Subject"
        }`}
      />
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-4 text-[13px] text-slate-600">
        <section className="rounded-2xl border border-slate-200/70 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() =>
                  router.visit(
                    route("faculty.attendance.records", section.id)
                  )
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Subject Attendance
                </p>
                <h1 className="text-lg font-semibold text-slate-900">
                  {schedule?.subjectName || "Subject"}
                </h1>
                <p className="text-[12px] text-slate-500">
                  {subjectDescriptor || "Subject information unavailable"}
                </p>
                {timelineDescriptor && (
                  <p className="text-[11px] text-slate-400">
                    {timelineDescriptor}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleAddAttendance}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-sky-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-sky-700"
                >
                  <PlusCircle size={16} /> New Attendance
                </button>
              </div>
              <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-2 text-[12px] text-slate-600">
                <span className="font-semibold text-slate-700">Enrolled:</span> {studentCount}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Present", value: totals?.present ?? 0, tone: "bg-emerald-50 text-emerald-600" },
              { label: "Absent", value: totals?.absent ?? 0, tone: "bg-rose-50 text-rose-600" },
              { label: "Late", value: totals?.late ?? 0, tone: "bg-amber-50 text-amber-600" },
              { label: "Excused", value: totals?.excused ?? 0, tone: "bg-sky-50 text-sky-600" },
            ].map((card) => (
              <div
                key={card.label}
                className={`rounded-xl border border-slate-200/70 px-4 py-3 text-[12px] shadow-sm ${card.tone}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {card.label}
                  </span>
                  <span className="text-[18px] font-semibold">{card.value}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white px-5 py-5 shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Attendance Sessions
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                <CalendarClock size={12} className="text-slate-400" /> {schedule?.scheduleDay || "—"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                {schedule?.timeRange || "—"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                <Users size={12} className="text-slate-400" /> {studentCount} student{studentCount === 1 ? "" : "s"}
              </span>
            </div>
          </header>

          {dateSummaries.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[12px] text-slate-500">
              No attendance recorded for this subject yet.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-[12px] text-slate-600">
                <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-center">Present</th>
                    <th className="px-3 py-2 text-center">Absent</th>
                    <th className="px-3 py-2 text-center">Late</th>
                    <th className="px-3 py-2 text-center">Excused</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {dateSummaries.map((summary) => (
                    <tr key={summary.dateKey} className="transition hover:bg-slate-50">
                      <td className="px-3 py-2 text-[12px] font-medium text-slate-700">
                        {summary.readableDate}
                      </td>
                      <td className="px-3 py-2 text-center text-emerald-600">{summary.present}</td>
                      <td className="px-3 py-2 text-center text-rose-600">{summary.absent}</td>
                      <td className="px-3 py-2 text-center text-amber-600">{summary.late}</td>
                      <td className="px-3 py-2 text-center text-sky-600">{summary.excused}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(summary.dateKey)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-sky-600 transition hover:border-slate-300 hover:text-sky-700"
                          >
                            <Eye size={14} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(summary.dateKey)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-sky-600 transition hover:border-slate-300 hover:text-sky-700"
                          >
                            <Pencil size={14} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {viewingDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-3">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-lg">
              <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    Attendance Details
                  </p>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {viewingDateLabel || "Selected Date"}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintViewedSession}
                    disabled={selectedEntries.length === 0}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                  >
                    <Printer size={14} /> Print
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                  >
                    ×
                  </button>
                </div>
              </header>

              <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
                {selectedEntries.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-[11px] text-slate-500">
                    No records captured for this date.
                  </div>
                ) : (
                  <table className="min-w-full table-auto divide-y divide-slate-100 text-[11px] text-slate-600">
                    <thead className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left">Student</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">In</th>
                        <th className="px-3 py-2 text-left">Out</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedEntries.map((entry) => {
                        const user = entry?.enrollment?.user || {};
                        const fullName = [
                          user?.lName,
                          user?.fName,
                          user?.mName,
                        ]
                          .filter(Boolean)
                          .join(", ")
                          .replace(/, ,/g, ", ");

                        const status = (entry?.status || "").toLowerCase();
                        const badgeClass = statusBadgeStyles[status] || "bg-slate-100 text-slate-500";

                        return (
                          <tr key={`${entry.id}-${entry.enrollment_id}`}>
                            <td className="px-3 py-2 text-slate-700">
                              {fullName || "Unnamed Student"}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                              >
                                {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500">
                              {entry.time_in ? dayjs(entry.time_in, "HH:mm").format("h:mm A") : "—"}
                            </td>
                            <td className="px-3 py-2 text-slate-500">
                              {entry.time_out ? dayjs(entry.time_out, "HH:mm").format("h:mm A") : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </FacultyLayout>
  );
}
