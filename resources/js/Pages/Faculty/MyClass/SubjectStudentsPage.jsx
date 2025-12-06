import React, { useEffect, useMemo, useRef, useState } from "react";

import FacultyLayout from "@/Layouts/FacultyLayout";
import { Head, router, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";
import {
  Eye,
  EyeSlash,
  UsersThree,
  Notebook,
  CalendarCheck,
  GraduationCap,
  ChartLineUp,
  ArrowSquareOut,
  UserList,
} from "phosphor-react";
import * as XLSX from "xlsx";

const tabs = [
  { key: "students", label: "Students", icon: UsersThree },
  { key: "grades", label: "Grades", icon: Notebook },
  { key: "attendance", label: "Attendance", icon: CalendarCheck },
];

const TAB_TRANSITION_MS = 220;
const SESSIONS_PER_PAGE = 3;

const resolveInitialTab = () => {
  if (typeof window === "undefined") {
    return "students";
  }
  const queryTab = new URLSearchParams(window.location.search).get("tab");
  return tabs.some((tab) => tab.key === queryTab) ? queryTab : "students";
};

export default function SubjectStudentsPage({ user, schedule, students, attendanceSessions = [] }) {
  // Debug: Log initial props
  console.log('Initial props:', { schedule, studentsCount: students?.length });
  console.log('Sample student data:', students?.[0]);
  const [activeTab, setActiveTab] = useState(resolveInitialTab);
  const [renderedTab, setRenderedTab] = useState(() => resolveInitialTab());
  const [isTabAnimating, setIsTabAnimating] = useState(false);
  const [tabDirection, setTabDirection] = useState("forward");
  const tabSwitchTimer = useRef(null);
  const [roster, setRoster] = useState(students ?? []);
  const [attendancePage, setAttendancePage] = useState(1);
  const formatStudentName = (student) => {
    const parts = [];
    const last = student?.last_name?.trim();
    const first = student?.first_name?.trim();
    const middle = student?.middle_name?.trim();

    if (last) {
      parts.push(`${last},`);
    }
    if (first) {
      parts.push(first);
    }
    if (middle) {
      parts.push(middle);
    }

    if (parts.length === 0) {
      return student?.name || "Unnamed";
    }
    return parts.join(" ").replace(/\s+/g, " ");
  };

  const sortedRoster = useMemo(() => {
    const clone = [...(roster ?? [])];
    return clone.sort((a, b) => {
      const nameA = formatStudentName(a).toLowerCase();
      const nameB = formatStudentName(b).toLowerCase();
      if (!nameA && !nameB) return 0;
      if (!nameA) return 1;
      if (!nameB) return -1;
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    });
  }, [roster]);
  
  // Debug: Log roster when it changes
  useEffect(() => {
    console.log('Roster updated:', roster);
    if (roster.length > 0) {
      console.log('First student grades:', {
        midterm: roster[0].midterm,
        final: roster[0].final,
        remarks: roster[0].remarks
      });
    }
  }, [roster]);
  const [droppingId, setDroppingId] = useState(null);
  const [showDropActions, setShowDropActions] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editFormData, setEditFormData] = useState({ status: "", time_in: "", time_out: "" });

  const { props: pageProps } = usePage();

  useEffect(() => {
    const flash = pageProps?.flash || {};
    if (flash.success) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: flash.success,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    }
    if (flash.error) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: flash.error,
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
      });
    }
  }, [pageProps]);

  useEffect(() => {
    setRoster(students ?? []);
  }, [students]);

  useEffect(() => {
    return () => {
      if (tabSwitchTimer.current) {
        clearTimeout(tabSwitchTimer.current);
      }
    };
  }, []);

  const totalStudents = roster?.length ?? 0;

  const tabCounts = {
    students: totalStudents,
    grades: totalStudents,
    attendance: (attendanceSessions || []).length,
  };

  const uniqueAttendanceSessions = useMemo(() => {
    const seen = new Set();
    return (attendanceSessions ?? []).filter((session) => {
      const key = session?.date || session?.label || crypto.randomUUID?.() || Math.random().toString();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [attendanceSessions]);

  useEffect(() => {
    setAttendancePage(1);
  }, [uniqueAttendanceSessions.length]);

  const totalAttendancePages = Math.max(1, Math.ceil(uniqueAttendanceSessions.length / SESSIONS_PER_PAGE));
  const paginatedAttendanceSessions = useMemo(() => {
    const start = (attendancePage - 1) * SESSIONS_PER_PAGE;
    return uniqueAttendanceSessions.slice(start, start + SESSIONS_PER_PAGE);
  }, [uniqueAttendanceSessions, attendancePage]);

  const formatSessionLabel = (session) => {
    if (!session) return "Attendance Session";
    if (session.date) {
      const parsed = new Date(session.date);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    }
    const fallback = (session.label || "Attendance Session").trim();
    return fallback.replace(/\s+/g, " ");
  };

  const statusCounts = useMemo(() => {
    return (roster ?? []).reduce(
      (acc, student) => {
        const status = (student.status || "enrolled").toLowerCase();
        acc[status] = (acc[status] || 0) + 1;
        acc.total += 1;
        return acc;
      },
      { total: 0 }
    );
  }, [roster]);

  const resolveGradeTone = (value) => {
    if (value === null || value === undefined || value === "") {
      return "border-slate-200 bg-slate-50 text-slate-400";
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return "border-slate-200 bg-white text-slate-500";
    }
    if (numeric <= 3) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    return "border-rose-200 bg-rose-50 text-rose-600";
  };

  const hasGradeValue = (value) => value !== null && value !== undefined && value !== "";

const renderGradeValue = (value) => {
  const display = value ?? "–";

  return (
      <span
        className={`inline-flex min-w-[52px] justify-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${resolveGradeTone(
          value
        )}`}
      >
        {display}
      </span>
    );
};

const resolveRemarksTone = (remarks = "") => {
  const normalized = remarks.toLowerCase();
  if (normalized.includes("pass")) {
    return "text-emerald-600";
  }
  if (normalized.includes("fail")) {
    return "text-rose-600";
  }
  if (normalized.includes("incomplete")) {
    return "text-amber-600";
  }
  if (normalized.includes("drop")) {
    return "text-slate-500";
  }
  return "text-slate-500";
};

const renderRemarksValue = (student) => {
  const midtermDone = hasGradeValue(student?.midterm);
  const finalDone = hasGradeValue(student?.final);

  if (!midtermDone || !finalDone) {
    return <span className="font-medium text-slate-400">Pending</span>;
  }

  const label = student?.remarks ?? "Pending";
  return <span className={`font-medium ${resolveRemarksTone(label)}`}>{label}</span>;
};

  const getTabIndex = (key) => tabs.findIndex((tab) => tab.key === key);

  const handleTabChange = (nextTab) => {
    if (nextTab === activeTab) {
      return;
    }

    const currentIndex = getTabIndex(activeTab);
    const nextIndex = getTabIndex(nextTab);
    if (currentIndex !== -1 && nextIndex !== -1) {
      setTabDirection(nextIndex > currentIndex ? "forward" : "backward");
    }

    setActiveTab(nextTab);
    setIsTabAnimating(true);

    if (tabSwitchTimer.current) {
      clearTimeout(tabSwitchTimer.current);
    }

    tabSwitchTimer.current = setTimeout(() => {
      setRenderedTab(nextTab);
      if (typeof window !== "undefined" && window.requestAnimationFrame) {
        window.requestAnimationFrame(() => setIsTabAnimating(false));
      } else {
        setIsTabAnimating(false);
      }
    }, TAB_TRANSITION_MS);
  };

  const handleBackToSection = () => {
    if (schedule?.section_id) {
      router.visit(`/faculty/classes/${schedule.section_id}`);
      return;
    }
    window.history.back();
  };

  const flaggedStudents = useMemo(() => {
    return (roster ?? []).filter((student) =>
      (student.status || "").toLowerCase() === "absent"
    );
  }, [roster]);

  const handleStudentStatusChange = async (student, action) => {
    if (!student?.enrollment_subject_id) {
      await Swal.fire({
        icon: "info",
        title: `Cannot ${action}`,
        text: "This student record is missing a section assignment.",
        confirmButtonText: "Got it",
      });
      return;
    }

    if (action === "drop") {
      const confirmResult = await Swal.fire({
        icon: "warning",
        title: `Drop ${student.name || "this student"}?`,
        text: "They will be marked as dropped for this class schedule.",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        confirmButtonText: "Drop student",
        cancelButtonText: "Cancel",
      });

      if (!confirmResult.isConfirmed) {
        return;
      }

      const reasonPrompt = await Swal.fire({
        icon: "question",
        title: "Drop reason",
        input: "textarea",
        inputAttributes: {
          placeholder: "Optional remarks (max 500 characters)",
          maxlength: 500,
        },
        showCancelButton: true,
        confirmButtonText: "Submit",
        cancelButtonText: "Cancel",
        inputValidator: (value) => {
          if (value && value.length > 500) {
            return "Reason must be 500 characters or less.";
          }
          return null;
        },
      });

      if (!reasonPrompt.isConfirmed) {
        return;
      }

      setDroppingId(student.enrollment_subject_id);

      router.post(
        "/faculty/students-list/drop",
        {
          enrollment_subject_id: student.enrollment_subject_id,
          reason: reasonPrompt.value,
        },
        {
          preserveScroll: true,
          onSuccess: () => {
            setRoster((prev = []) =>
              prev.map((entry) =>
                entry.id === student.id ? { ...entry, status: "Dropped" } : entry
              )
            );
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: "Student dropped",
              showConfirmButton: false,
              timer: 1800,
              timerProgressBar: true,
            });
          },
          onError: () => {
            Swal.fire({
              icon: "error",
              title: "Unable to drop student",
              text: "Please try again or contact support.",
            });
          },
          onFinish: () => setDroppingId(null),
        }
      );
      return;
    }

    if (action === "undo") {
      const confirmResult = await Swal.fire({
        icon: "question",
        title: `Restore ${student.name || "this student"}?`,
        text: "This will mark the student as enrolled again.",
        showCancelButton: true,
        confirmButtonText: "Restore student",
        cancelButtonText: "Cancel",
      });

      if (!confirmResult.isConfirmed) {
        return;
      }

      setDroppingId(student.enrollment_subject_id);

      router.post(
        "/faculty/students-list/undo-drop",
        {
          enrollment_subject_id: student.enrollment_subject_id,
        },
        {
          preserveScroll: true,
          onSuccess: () => {
            setRoster((prev = []) =>
              prev.map((entry) =>
                entry.id === student.id ? { ...entry, status: "Enrolled" } : entry
              )
            );
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: "Student restored",
              showConfirmButton: false,
              timer: 1600,
              timerProgressBar: true,
            });
          },
          onError: () => {
            Swal.fire({
              icon: "error",
              title: "Unable to restore student",
              text: "Please try again or contact support.",
            });
          },
          onFinish: () => setDroppingId(null),
        }
      );
    }
  };

  const handleViewSession = (session) => {
    if (!session) return;
    setSelectedSession(session);
  };

  const closeSessionModal = () => {
    setSelectedSession(null);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setEditFormData({
      status: entry.status || "",
      time_in: entry.time_in || "",
      time_out: entry.time_out || "",
    });
  };

  const closeEditModal = () => {
    setEditingEntry(null);
    setEditFormData({ status: "", time_in: "", time_out: "" });
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    try {
      await router.post(
        "/faculty/attendance/update-entry",
        {
          entry_id: editingEntry.id,
          status: editFormData.status,
          time_in: editFormData.time_in,
          time_out: editFormData.time_out,
        },
        {
          preserveScroll: true,
          onSuccess: () => {
            // Update the session entries
            if (selectedSession) {
              const updatedEntries = selectedSession.entries.map((e) =>
                e.id === editingEntry.id
                  ? { ...e, ...editFormData }
                  : e
              );
              setSelectedSession({ ...selectedSession, entries: updatedEntries });
            }
            closeEditModal();
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: "Attendance updated",
              showConfirmButton: false,
              timer: 1500,
              timerProgressBar: true,
            });
          },
          onError: () => {
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "error",
              title: "Unable to update attendance",
              text: "Please try again or contact support.",
              showConfirmButton: false,
              timer: 4000,
              timerProgressBar: true,
            });
          },
        }
      );
    } catch (error) {
      console.error("Error updating attendance:", error);
    }
  };

  const handlePrintSession = () => {
    if (!selectedSession) return;
    const { entries = [] } = selectedSession;
    const label = formatSessionLabel(selectedSession);
    const windowContent = `
      <html>
        <head>
          <title>Attendance Session - ${label || "Session"}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 8px; }
            p { font-size: 12px; margin: 0 0 8px 0; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            th, td { border: 1px solid #cbd5f5; padding: 8px; text-align: left; }
            th { background: #f8fafc; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; color: #475569; }
            tbody tr:nth-child(even) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Attendance Session</h1>
          <p>Date: ${label || "—"}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>ID Number</th>
                <th>Status</th>
                <th>Time In</th>
                <th>Time Out</th>
              </tr>
            </thead>
            <tbody>
              ${entries
                .map((entry, index) => {
                  return `<tr>
                    <td>${index + 1}</td>
                    <td>${entry.student_name || "Unnamed"}</td>
                    <td>${entry.student_number || "—"}</td>
                    <td>${(entry.status || "").toUpperCase()}</td>
                    <td>${entry.time_in || "—"}</td>
                    <td>${entry.time_out || "—"}</td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1024,height=768");
    if (!printWindow) return;
    printWindow.document.write(windowContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportSession = () => {
    if (!selectedSession) return;

    const label = formatSessionLabel(selectedSession);
    const entries = selectedSession.entries ?? [];
    const dataHeaders = ["#", "Student", "ID Number", "Status", "Time In", "Time Out"];
    const dataset = entries.length
      ? entries.map((entry, index) => ({
          "#": index + 1,
          Student: entry.student_name || "Unnamed",
          "ID Number": entry.student_number || "",
          Status: (entry.status || "—").toUpperCase(),
          "Time In": entry.time_in || "—",
          "Time Out": entry.time_out || "—",
        }))
      : [
          {
            "#": "—",
            Student: "No attendance entries",
            "ID Number": "—",
            Status: "—",
            "Time In": "—",
            "Time Out": "—",
          },
        ];

    const facultyName =
      user?.name ||
      [user?.fName, user?.mName, user?.lName].filter(Boolean).join(" ").trim() ||
      "Faculty";

    const columnOffset = 1; // Start at column "B" for a simple layout
    const prefix = Array(columnOffset).fill("");
    const headerRows = [
      [...prefix, "BUKIDNON STATE UNIVERSITY"],
      [...prefix, "Malaybalay City, Bukidnon 8700"],
      [...prefix, "Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph"],
      [...prefix, "FACULTY ATTENDANCE SESSION"],
      [
        ...prefix,
        `Subject: ${schedule?.subject || "Subject"}    Section: ${schedule?.section || "—"}    Date: ${label}`,
      ],
      [...prefix, `Faculty: ${facultyName}`],
      [],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(headerRows);
    XLSX.utils.sheet_add_json(worksheet, dataset, {
      header: dataHeaders,
      origin: XLSX.utils.encode_cell({ r: headerRows.length, c: columnOffset }),
      skipHeader: false,
    });

    const totalColumns = dataHeaders.length;
    const tableHeaderRowIndex = headerRows.length;
    const tableDataStart = tableHeaderRowIndex + 1;

    worksheet['!merges'] = worksheet['!merges'] || [];
    headerRows.forEach((row, idx) => {
      if (!row.length) return;
      worksheet['!merges'].push({
        s: { r: idx, c: columnOffset },
        e: { r: idx, c: columnOffset + totalColumns - 1 },
      });

      const cellAddress = XLSX.utils.encode_cell({ r: idx, c: columnOffset });
      const cell = worksheet[cellAddress];
      if (!cell) return;

      const headerStyles = [
        { font: { bold: true, sz: 14 } },
        { font: { sz: 11 } },
        { font: { sz: 10 } },
        { font: { bold: true, sz: 12 } },
        { font: { sz: 11 } },
        { font: { sz: 11 } },
      ];

      const resolvedStyle = headerStyles[idx] || { font: { sz: 11 } };
      cell.s = {
        ...resolvedStyle,
        alignment: { horizontal: "left", vertical: "center", wrapText: true },
      };
    });

    const applyCellStyle = (rowIdx, colIdx, style) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
      const cell = worksheet[cellAddress];
      if (!cell) return;
      cell.s = {
        ...style,
        alignment: { horizontal: "left", vertical: "center", wrapText: true, ...(style?.alignment || {}) },
      };
    };

    for (let c = 0; c < totalColumns; c += 1) {
      const colIndex = columnOffset + c;
      applyCellStyle(tableHeaderRowIndex, colIndex, {
        font: { bold: true },
        fill: { fgColor: { rgb: "D6E4FD" } },
        border: {
          top: { style: "thin", color: { rgb: "9DBFF9" } },
          right: { style: "thin", color: { rgb: "9DBFF9" } },
          bottom: { style: "thin", color: { rgb: "9DBFF9" } },
          left: { style: "thin", color: { rgb: "9DBFF9" } },
        },
        alignment: { horizontal: "left" },
      });
    }

    const zebraFill = { even: "FFFFFF", odd: "F5F7FB" };
    for (let r = 0; r < dataset.length; r += 1) {
      const rowIndex = tableDataStart + r;
      const fillColor = zebraFill[r % 2 === 0 ? "even" : "odd"];

      for (let c = 0; c < totalColumns; c += 1) {
        const colIndex = columnOffset + c;
        const horizontal = "left";
        applyCellStyle(rowIndex, colIndex, {
          fill: { fgColor: { rgb: fillColor } },
          border: {
            top: { style: "thin", color: { rgb: "D7DFE9" } },
            right: { style: "thin", color: { rgb: "D7DFE9" } },
            bottom: { style: "thin", color: { rgb: "BBC6D8" } },
            left: { style: "thin", color: { rgb: "D7DFE9" } },
          },
          alignment: { horizontal },
        });
      }
    }

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const columns = worksheet['!cols'] || [];
    for (let C = 0; C < totalColumns; C += 1) {
      const colIndex = columnOffset + C;
      let maxWidth = 14;
      for (let R = 0; R <= range.e.r; R += 1) {
        const cellAddress = XLSX.utils.encode_cell({ c: colIndex, r: R });
        const cell = worksheet[cellAddress];
        if (!cell || cell.v === undefined || cell.v === null) continue;
        const cellText = cell.v.toString();
        maxWidth = Math.max(maxWidth, Math.min(50, cellText.length + 4));
      }
      columns[colIndex] = { wch: maxWidth };
    }
    worksheet['!cols'] = columns;

    worksheet['!rows'] = worksheet['!rows'] || [];
    headerRows.forEach((row, idx) => {
      if (!row.length) return;
      worksheet['!rows'][idx] = { hpt: idx === 0 ? 22 : 16 };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    const sanitize = (value) => (value || "Session").replace(/[^\w\d]+/g, "_");
    const subjectFragment = sanitize(schedule?.subject || "Subject");
    const labelFragment = sanitize(label);

    XLSX.writeFile(workbook, `Attendance_${subjectFragment}_${labelFragment}.xlsx`);
  };

  return (
    <FacultyLayout user={user}>
      <Head title={`${schedule?.subject ?? "Subject"} Students`} />
      <div className="min-h-screen bg-slate-100 px-0 py-0 md:px-4 md:py-6">
        <div className="flex min-h-screen flex-col text-[12px] md:text-[13px]">
          <div className="flex flex-1 flex-col rounded-none border-y border-slate-200 bg-white shadow-sm md:rounded-3xl md:border md:border-slate-200">

            <div className="px-5 pt-4 pb-5 border-b border-slate-200 text-[11px] text-slate-600 md:text-[12px] bg-gradient-to-r from-white via-slate-50 to-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl bg-white/70 p-3 shadow-sm">
                  <GraduationCap size={28} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.45em] text-slate-400">Teaching load</p>
                  <h1 className="text-[18px] font-semibold text-slate-900 md:text-[20px]">{schedule?.subject || "Subject"}</h1>
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                    <span className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600">Section {schedule?.section || "—"}</span>
                    <span className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600">
                      {schedule?.day || "Schedule"} • {schedule?.time || "TBA"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white px-4 py-3 shadow-sm">
                  <div className="rounded-full bg-emerald-50 p-2">
                    <UsersThree size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-slate-400">Students</p>
                    <p className="text-base font-semibold text-slate-900">{totalStudents}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white px-4 py-3 shadow-sm">
                  <div className="rounded-full bg-sky-50 p-2">
                    <Notebook size={18} className="text-sky-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-slate-400">Schedule</p>
                    <p className="text-base font-semibold text-slate-900">{schedule?.day || "TBA"}</p>
                    <p className="text-[11px] text-slate-500">{schedule?.time || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white px-4 py-3 shadow-sm">
                  <div className="rounded-full bg-amber-50 p-2">
                    <ChartLineUp size={18} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-slate-400">Sessions recorded</p>
                    <p className="text-base font-semibold text-slate-900">{uniqueAttendanceSessions.length}</p>
                    <p className="text-[11px] text-slate-500">Attendance logs</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-2 pb-3 text-[11px]">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.key;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => handleTabChange(tab.key)}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition-all ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100"
                          : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                      }`}
                      aria-pressed={isActive}
                    >
                      {Icon && <Icon size={15} className="text-current" />}
                      <span className="text-[13px] font-semibold">{tab.label}</span>
                      <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {tabCounts[tab.key] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleBackToSection}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-[12px] font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
              >
                <ArrowSquareOut size={16} />
                Back to Section
              </button>
            </div>

            <div
              className={`flex-1 overflow-y-auto transition-all duration-300 ease-out ${
                isTabAnimating
                  ? `opacity-0 ${tabDirection === "forward" ? "translate-x-4" : "-translate-x-4"}`
                  : "opacity-100 translate-x-0"
              }`}
            >

              {renderedTab === "students" && (
                <div className="divide-y divide-slate-100 text-[12px] text-slate-600">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-400">Section roster</p>
                      <p className="text-[12px] text-slate-500">{totalStudents} student{totalStudents === 1 ? "" : "s"}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-slate-400">
                      <span>{showDropActions ? "Drop actions shown" : "Drop actions hidden"}</span>
                      <button
                        type="button"
                        onClick={() => setShowDropActions((prev) => !prev)}
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-slate-500 transition ${
                          showDropActions
                            ? "border-rose-200 bg-rose-50 text-rose-600"
                            : "border-slate-200 bg-slate-50 hover:text-slate-700"
                        }`}
                        aria-label={showDropActions ? "Hide drop options" : "Show drop options"}
                      >
                        {showDropActions ? <EyeSlash size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    {(sortedRoster ?? []).map((student, idx) => {
                      const statusLabel = student.status || "Enrolled";
                      const statusClass = (() => {
                        const normalized = statusLabel.toLowerCase();
                        if (normalized === "dropped") {
                          return "border-rose-200 bg-rose-50 text-rose-600";
                        }
                        if (normalized === "enrolled") {
                          return "border-slate-200 bg-slate-50 text-slate-500";
                        }
                        return "border-slate-200 bg-slate-50 text-slate-500";
                      })();
                      const isDropped = statusLabel.toLowerCase() === "dropped";

                      return (
                        <div
                          key={student.id ?? idx}
                          className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 first:pt-0 last:border-b-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-slate-900">{formatStudentName(student)}</p>
                            <p className="text-[11px] text-slate-400">{student.id_number || "N/A"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.3em] ${statusClass}`}
                            >
                              {statusLabel}
                            </span>
                            {showDropActions && (
                              isDropped ? (
                                <button
                                  type="button"
                                  disabled={droppingId === student.enrollment_subject_id}
                                  onClick={() => handleStudentStatusChange(student, "undo")}
                                  className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
                                    droppingId === student.enrollment_subject_id
                                      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                  }`}
                                >
                                  {droppingId === student.enrollment_subject_id ? "Restoring..." : "Undo"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={droppingId === student.enrollment_subject_id}
                                  onClick={() => handleStudentStatusChange(student, "drop")}
                                  className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
                                    droppingId === student.enrollment_subject_id
                                      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                                      : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                                  }`}
                                >
                                  {droppingId === student.enrollment_subject_id ? "Dropping..." : "Drop"}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {totalStudents === 0 && (
                      <div className="py-6 text-center text-[12px] text-slate-400">
                        No students are currently enrolled in this subject.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {renderedTab === "grades" && (
                <div className="space-y-4 px-5 py-4 text-[12px]">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-4 text-slate-600 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Grades snapshot</p>
                      <p className="text-sm text-slate-500">Monitor presence trends and recent captures.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!schedule?.id) return;
                        router.visit(`/faculty/classes/subject/${schedule.id}/grades`);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2 text-[13px] font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      <Notebook size={16} />
                      Open Grades Module
                      <ArrowSquareOut size={14} className="text-slate-400" />
                    </button>
                  </div>
                  {totalStudents === 0 ? (
                    <p className="text-center text-[12px] text-slate-400">No grade records available.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-[12px] text-slate-600">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
                            <th className="py-2 pr-4">Student</th>
                            <th className="py-2 pr-4">Midterm</th>
                            <th className="py-2 pr-4">Final</th>
                            <th className="py-2">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(sortedRoster ?? []).map((student) => (
                            <tr key={`${student.id}-grade`}>
                              <td className="py-2 pr-4">
                                <p className="text-[13px] font-medium text-slate-900">{formatStudentName(student)}</p>
                                <p className="text-[11px] text-slate-400">{student.id_number || "N/A"}</p>
                              </td>
                              <td className="py-2 pr-4">{renderGradeValue(student.midterm)}</td>
                              <td className="py-2 pr-4">{renderGradeValue(student.final)}</td>
                              <td className="py-2 text-[11px]">{renderRemarksValue(student)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {renderedTab === "attendance" && (
                <div className="space-y-5 px-5 py-5 text-[12px] text-slate-600">
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Attendance Snapshot</p>
                      <p className="text-[12px] text-slate-500">Monitor presence trends and recent captures.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!schedule?.section_id) return;
                        router.visit(`/faculty/classes/subject/${schedule.id}/attendance?section=${schedule.section_id}`);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2 text-[13px] font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      <CalendarCheck size={16} />
                      Open Attendance Module
                      <ArrowSquareOut size={14} className="text-slate-400" />
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Recorded sessions</p>
                        <p className="text-[12px] text-slate-500">Recent attendance captures for this class</p>
                      </div>
                      {uniqueAttendanceSessions.length > 0 && (
                        <span className="text-[12px] font-semibold text-slate-500">{uniqueAttendanceSessions.length} sessions</span>
                      )}
                    </div>
                    <div className="mt-4 space-y-3">
                      {uniqueAttendanceSessions.length === 0 && (
                        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-[12px] text-slate-400">
                          No attendance sessions recorded yet.
                        </p>
                      )}
                      {paginatedAttendanceSessions.map((session) => (
                        <div
                          key={session.date || session.label}
                          className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[13px] text-slate-600"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-[14px] font-semibold text-slate-900">{formatSessionLabel(session)}</p>
                              <p className="text-[12px] text-slate-500">{session.totals?.records ?? 0} records captured</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleViewSession(session)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-semibold text-slate-600 transition hover:border-slate-300"
                            >
                              View
                              <span className="text-slate-400">→</span>
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-medium uppercase tracking-[0.25em]">
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600">
                              P {session.totals?.present ?? 0}
                            </span>
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-600">
                              A {session.totals?.absent ?? 0}
                            </span>
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600">
                              L {session.totals?.late ?? 0}
                            </span>
                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-600">
                              E {session.totals?.excused ?? 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {uniqueAttendanceSessions.length > SESSIONS_PER_PAGE && (
                      <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
                        <span>
                          Page {attendancePage} of {totalAttendancePages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={attendancePage === 1}
                            onClick={() => setAttendancePage((prev) => Math.max(1, prev - 1))}
                            className={`rounded-full border px-3 py-1 font-semibold transition ${
                              attendancePage === 1
                                ? "cursor-not-allowed border-slate-200 text-slate-300"
                                : "border-slate-200 text-slate-600 hover:border-slate-400"
                            }`}
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            disabled={attendancePage === totalAttendancePages}
                            onClick={() => setAttendancePage((prev) => Math.min(totalAttendancePages, prev + 1))}
                            className={`rounded-full border px-3 py-1 font-semibold transition ${
                              attendancePage === totalAttendancePages
                                ? "cursor-not-allowed border-slate-200 text-slate-300"
                                : "border-slate-200 text-slate-600 hover:border-slate-400"
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedSession && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Attendance session</p>
                <h3 className="text-base font-semibold text-slate-900">{formatSessionLabel(selectedSession)}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintSession}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Print
                </button>
                <button
                  type="button"
                  onClick={handleExportSession}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={closeSessionModal}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              {(!selectedSession.entries || selectedSession.entries.length === 0) && (
                <p className="text-center text-sm text-slate-400">No attendance entries for this session.</p>
              )}
              {selectedSession.entries && selectedSession.entries.length > 0 && (
                <table className="min-w-full divide-y divide-slate-100 text-sm text-slate-700">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                      <th className="py-2 text-left">#</th>
                      <th className="py-2 text-left">Student</th>
                      <th className="py-2 text-left">ID Number</th>
                      <th className="py-2 text-left">Status</th>
                      <th className="py-2 text-left">Time in</th>
                      <th className="py-2 text-left">Time out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSession.entries.map((entry, index) => (
                      <tr key={entry.id || `${entry.student_number}-${index}`}>
                        <td className="py-2 pr-3 text-slate-500">{index + 1}</td>
                        <td className="py-2 pr-3">
                          <p className="font-semibold text-slate-900">{entry.student_name || "Unnamed"}</p>
                        </td>
                        <td className="py-2 pr-3 text-slate-500">{entry.student_number || "—"}</td>
                        <td className="py-2 pr-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-slate-600">
                            {(entry.status || "—").toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-slate-500">{entry.time_in || "—"}</td>
                        <td className="py-2 pr-3 text-slate-500">{entry.time_out || "—"}</td>
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            onClick={() => handleEditEntry(entry)}
                            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Edit attendance</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">{editingEntry.student_name}</h3>
              <p className="text-[12px] text-slate-500">{editingEntry.student_number}</p>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="block text-[12px] font-semibold text-slate-700">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-900 focus:border-blue-400 focus:outline-none"
                >
                  <option value="">Select Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="excused">Excused</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-slate-700">Time In</label>
                <input
                  type="time"
                  value={editFormData.time_in}
                  onChange={(e) => setEditFormData({ ...editFormData, time_in: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-900 focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-slate-700">Time Out</label>
                <input
                  type="time"
                  value={editFormData.time_out}
                  onChange={(e) => setEditFormData({ ...editFormData, time_out: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-900 focus:border-blue-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={closeEditModal}
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[12px] font-semibold text-blue-600 transition hover:bg-blue-100"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </FacultyLayout>
  );
}