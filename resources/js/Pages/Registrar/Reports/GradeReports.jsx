import React, { useMemo, useState, Fragment, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { usePage, router } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { MagnifyingGlass, FileX, FileArrowDown } from "phosphor-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import dayjs from "dayjs";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function GradeReports() {
  const {
    grades = { data: [], links: [], meta: {} },
    courses = [],
    yearLevels = [],
    semesters = [],
    filters = {},
  } = usePage().props;

  const toSelectValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "all";
    }
    return String(value);
  };

  const formatWorkflowStatus = (status) => {
    if (!status) return "Draft";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getWorkflowBadgeClass = (status) => {
    const normalized = (status || "draft").toLowerCase();
    if (normalized === "confirmed") {
      return "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600";
    }
    if (normalized === "submitted") {
      return "inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-medium text-indigo-600";
    }
    if (normalized === "rejected") {
      return "inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-medium text-rose-600";
    }
    return "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium text-slate-600";
  };

  const [search, setSearch] = useState(filters.search ?? "");
  const [courseFilter, setCourseFilter] = useState(toSelectValue(filters.course_id));
  const [yearLevelFilter, setYearLevelFilter] = useState(toSelectValue(filters.year_level_id));
  const [semesterFilter, setSemesterFilter] = useState(toSelectValue(filters.semester_id));
  const [statusFilter, setStatusFilter] = useState(toSelectValue(filters.status));
  const [subjectFilter, setSubjectFilter] = useState(toSelectValue(filters.subject));

  const gradeItems = useMemo(() => {
    if (Array.isArray(grades?.data)) return grades.data;
    if (Array.isArray(grades)) return grades;
    return [];
  }, [grades]);

  const getSubjectLabel = (record) => {
    const code = record.subject_code || record.curriculum_subject?.subject_code;
    const title = record.subject_title || record.curriculum_subject?.subject_title;
    if (code && title) return `${code} — ${title}`;
    if (code) return code;
    if (title) return title;
    return resolveSubject(record) || "Unassigned Subject";
  };

  const subjectOptions = useMemo(() => {
    const map = new Map();

    gradeItems.forEach((record) => {
      const key = record.subject_key || record.subject_code || getSubjectLabel(record);
      const label = getSubjectLabel(record);
      if (!key || map.has(key)) return;
      map.set(key, label);
    });

    if (subjectFilter !== "all" && !map.has(subjectFilter)) {
      map.set(subjectFilter, subjectFilter);
    }

    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: "base" }));
  }, [gradeItems, subjectFilter]);

  const filtered = useMemo(() => {
    return gradeItems.filter((g) => {
      const name = (g.student_display || `${g.student?.fName || ""} ${g.student?.mName || ""} ${
        g.student?.lName || ""
      }`).trim();
      const studentId = g.student?.id_number?.toString() || "";
      const courseId = g.course?.id?.toString() || "";
      const yearLevelId = g.yearLevel?.id?.toString() || "";
      const semesterId = g.semester?.id?.toString() || "";
      const remarksValue = (g.remarks || g.status || "").toLowerCase();
      const recordSubjectKey = g.subject_key || g.subject_code || getSubjectLabel(g);
      const label = getSubjectLabel(g);

      const matchesSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        studentId.includes(search);
      const matchesCourse =
        courseFilter === "all" || courseId === courseFilter.toString();
      const matchesYear =
        yearLevelFilter === "all" || yearLevelId === yearLevelFilter.toString();
      const matchesSemester =
        semesterFilter === "all" || semesterId === semesterFilter.toString();
      const matchesStatus =
        statusFilter === "all" || remarksValue === statusFilter.toLowerCase();
      const matchesSubject =
        subjectFilter === "all" || recordSubjectKey === subjectFilter || label === subjectFilter;

      return (
        matchesSearch &&
        matchesCourse &&
        matchesYear &&
        matchesSemester &&
        matchesStatus &&
        matchesSubject
      );
    });
  }, [
    gradeItems,
    search,
    courseFilter,
    yearLevelFilter,
    semesterFilter,
    statusFilter,
    subjectFilter,
  ]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const passed = filtered.filter((g) => (g.remarks || g.status || "").toLowerCase() === "passed").length;
    const failed = filtered.filter((g) => (g.remarks || g.status || "").toLowerCase() === "failed").length;
    const inc = filtered.filter((g) => (g.remarks || g.status || "").toLowerCase() === "inc").length;
    return { total, passed, failed, inc };
  }, [filtered]);

  const paginationLinks = grades.links || [];
  const handleNavigate = (url) => {
    if (!url) return;
    router.visit(url, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const computeAverageValue = (midterm, final) => {
    const parseScore = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    const mid = parseScore(midterm);
    const fin = parseScore(final);

    if (mid !== null && fin !== null) {
      return (mid + fin) / 2;
    }

    if (fin !== null) {
      return fin;
    }

    if (mid !== null) {
      return mid;
    }

    return null;
  };

  const formatAverage = (midterm, final) => {
    const average = computeAverageValue(midterm, final);
    if (average === null) {
      return "N/A";
    }

    const formatted = average.toFixed(2);
    if (formatted === "0.05") {
      return "5";
    }
    if (formatted === "0.02") {
      return "2";
    }

    return formatted;
  };

  const formatPersonName = (entity) => {
    if (!entity) return "";

    const normalize = (value) => {
      if (typeof value === "string") return value.trim();
      if (value === null || value === undefined) return "";
      return String(value).trim();
    };

    const last = normalize(
      entity.lName ?? entity.last_name ?? entity.surname ?? entity.lastname
    );
    const first = normalize(
      entity.fName ?? entity.first_name ?? entity.given_name ?? entity.firstname
    );
    const middle = normalize(
      entity.mName ?? entity.middle_name ?? entity.middlename ?? entity.middle
    );

    if (!last && !first && !middle) {
      return "";
    }

    if (last && first) {
      const base = `${last}, ${first}`;
      return middle ? `${base} ${middle}` : base;
    }

    const base = last || first || middle;
    return middle && base !== middle ? `${base} ${middle}` : base;
  };

  const resolveStudentId = (record) => {
    const normalize = (value) => {
      if (value === null || value === undefined) {
        return null;
      }
      const text = String(value).trim();
      if (!text) return null;
      const lowered = text.toLowerCase();
      if (lowered === "null" || lowered === "undefined" || lowered === "nan") {
        return null;
      }
      return text;
    };

    const candidates = [
      record.student?.id_number,
      record.student?.idNumber,
      record.student?.IDNumber,
      record.student?.idnumber,
      record.student?.student_id_number,
      record.student?.studentIdNumber,
      record.student?.student_id,
      record.student?.studentId,
      record.student?.profile?.id_number,
      record.student?.profile?.idNumber,
      record.student_profile?.id_number,
      record.student_profile?.idNumber,
      record.student?.accounts?.id_number,
      record.student?.accounts?.idNumber,
      record.student_id_number,
      record.student_id,
      record.id_number,
      record.idNumber,
      record.studentId,
    ];

    for (const candidate of candidates) {
      const normalized = normalize(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  };

  const resolveFaculty = (record) => {
    const sources = [
      record.instructor,
      record.faculty,
      record.teacher,
      record.classSchedule?.faculty,
      record.class_schedule?.faculty,
      record.classSchedule?.instructor,
      record.class_schedule?.instructor,
    ];

    for (const source of sources) {
      if (source && typeof source === "object") {
        const formatted = formatPersonName(source);
        if (formatted) return formatted;
      }
    }

    const fallback = record.instructor_name || record.faculty_name || "";
    return fallback || "—";
  };

  const resolveSubject = (record) => {
    const pickSubject = () => {
      if (record.subject && typeof record.subject === "object") return record.subject;
      if (record.curriculumSubject?.subject) return record.curriculumSubject.subject;
      if (record.curriculum_subject?.subject) return record.curriculum_subject.subject;
      if (record.classSchedule?.subject) return record.classSchedule.subject;
      if (record.class_schedule?.subject) return record.class_schedule.subject;
      return null;
    };

    const subject = pickSubject();
    const curriculumSubject =
      record.curriculumSubject ||
      record.curriculum_subject ||
      record.classSchedule?.curriculumSubject ||
      record.class_schedule?.curriculumSubject ||
      record.classSchedule?.curriculum_subject ||
      record.class_schedule?.curriculum_subject ||
      null;
    const schedule = record.classSchedule || record.class_schedule || {};

    const parts = [];

    const codeCandidates = [
      record.subject_code,
      subject?.code,
      subject?.subject_code,
      subject?.subjectCode,
      schedule.subject_code,
      schedule.subjectCode,
      schedule.subject?.code,
      schedule.subject?.subject_code,
      schedule.subject?.subjectCode,
      curriculumSubject?.subject_code,
      curriculumSubject?.subjectCode,
      curriculumSubject?.code,
      curriculumSubject?.subject?.code,
      curriculumSubject?.subject?.subject_code,
      curriculumSubject?.subject?.subjectCode,
    ];

    const code = codeCandidates.find((value) => {
      if (value === null || value === undefined) return false;
      const trimmed = String(value).trim();
      return trimmed.length > 0 && trimmed.toLowerCase() !== "null";
    });

    const codeText = code ? String(code).trim() : "";
    if (codeText) {
      parts.push(codeText);
    }

    const title =
      record.subject_title ||
      subject?.descriptive_title ||
      subject?.title ||
      subject?.name ||
      curriculumSubject?.subject?.descriptive_title ||
      curriculumSubject?.subject?.title ||
      curriculumSubject?.subject?.name;
    if (title) parts.push(String(title).trim());

    if (parts.length === 0) {
      return "—";
    }

    return parts.length === 1 ? parts[0] : `${parts[0]} — ${parts.slice(1).join(" ")}`;
  };

  const overallAverage = useMemo(() => {
    const averages = filtered
      .map((g) => computeAverageValue(g.midterm, g.final))
      .filter((value) => value !== null);
    if (!averages.length) return null;
    const total = averages.reduce((acc, value) => acc + value, 0);
    return total / averages.length;
  }, [filtered]);

  const subjectLabel = getSubjectLabel;

  const logoDataUrlRef = useRef(null);
  const getLogoDataUrl = async () => {
    if (logoDataUrlRef.current) {
      return logoDataUrlRef.current;
    }

    try {
      const response = await fetch("/images/buksu_logo.png");
      if (!response.ok) {
        throw new Error(`Failed to fetch logo: ${response.status}`);
      }

      const blob = await response.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(typeof reader.result === "string" ? reader.result : null);
        };
        reader.onerror = () => {
          reject(reader.error || new Error("Failed to read logo data"));
        };
        reader.readAsDataURL(blob);
      });

      if (dataUrl) {
        logoDataUrlRef.current = dataUrl;
      }

      return dataUrl;
    } catch (error) {
      console.error("Failed to load logo:", error);
      return null;
    }
  };

  const groupedGrades = useMemo(() => {
    const subjectMap = new Map();

    filtered.forEach((record) => {
      const label = subjectLabel(record);
      if (!subjectMap.has(label)) {
        subjectMap.set(label, []);
      }
      subjectMap.get(label).push(record);
    });

    return Array.from(subjectMap.entries())
      .map(([subject, items]) => ({
        subject,
        items: items.slice().sort((a, b) => {
          const nameA = (a.student_display || formatPersonName(a.student) || "").toLowerCase();
          const nameB = (b.student_display || formatPersonName(b.student) || "").toLowerCase();
          return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
        }),
      }))
      .sort((a, b) => a.subject.localeCompare(b.subject, undefined, { sensitivity: "base" }));
  }, [filtered]);

  const getStatusBadgeClass = (statusText) => {
    const normalized = (statusText || "").toLowerCase();
    if (normalized.includes("fail")) {
      return "inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-medium text-rose-600";
    }

    if (normalized.includes("pass")) {
      return "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600";
    }

    if (normalized.includes("inc") || normalized.includes("incomplete")) {
      return "inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-600";
    }

    return "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium text-slate-600";
  };

  const doughnutData = useMemo(() => {
    const dataset = [summary.passed, summary.failed, summary.inc];
    if (dataset.every((value) => value === 0)) {
      return {
        labels: ["No Data"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["rgba(148, 163, 184, 0.45)"],
            borderWidth: 0,
          },
        ],
      };
    }

    return {
      labels: ["Passed", "Failed", "Incomplete"],
      datasets: [
        {
          data: dataset,
          backgroundColor: [
            "rgba(34, 197, 94, 0.65)",
            "rgba(239, 68, 68, 0.65)",
            "rgba(245, 158, 11, 0.65)",
          ],
          borderColor: [
            "rgba(34, 197, 94, 0.95)",
            "rgba(239, 68, 68, 0.95)",
            "rgba(245, 158, 11, 0.95)",
          ],
          borderWidth: 1,
          spacing: 2,
          cutout: "62%",
        },
      ],
    };
  }, [summary]);

  const chartOptions = useMemo(
    () => ({
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15,23,42,0.9)",
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
          padding: 10,
        },
      },
      maintainAspectRatio: false,
      cutout: "62%",
    }),
    []
  );

  const summaryTiles = useMemo(
    () => [
      {
        label: "Total Records",
        value: summary.total,
        subtext: "Filtered",
        accent: "from-sky-50 via-white to-sky-100/70 border-sky-200/70",
      },
      {
        label: "Average Grade",
        value: overallAverage !== null ? overallAverage.toFixed(2) : "—",
        subtext: "Across filtered",
        accent: "from-violet-50 via-white to-violet-100/70 border-violet-200/70",
      },
      {
        label: "Passed",
        value: summary.passed,
        subtext: "Students",
        accent: "from-emerald-50 via-white to-emerald-100/70 border-emerald-200/70",
      },
      {
        label: "Failed",
        value: summary.failed,
        subtext: "Students",
        accent: "from-rose-50 via-white to-rose-100/70 border-rose-200/70",
      },
      {
        label: "Incomplete",
        value: summary.inc,
        subtext: "Pending",
        accent: "from-amber-50 via-white to-amber-100/70 border-amber-200/70",
      },
    ],
    [summary, overallAverage]
  );

  const exportPDF = async () => {
    if (!groupedGrades.length) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 14;

    let logoDataUrl = null;
    try {
      logoDataUrl = await getLogoDataUrl();
    } catch (error) {
      logoDataUrl = null;
    }

    const logoWidth = 22;
    const logoHeight = 22;
    const logoY = 10;
    const logoX = (pageWidth - logoWidth) / 2;
    const headerStartY = logoDataUrl ? logoY + logoHeight + 6 : 18;

    groupedGrades.forEach((group, index) => {
      const firstRecord = group.items[0] || {};
      const facultyName = firstRecord.faculty_display || resolveFaculty(firstRecord);
      const scheduleInfo = firstRecord.schedule_display || "";
      const semesterText = firstRecord.semester_display || "Semester N/A";
      const subjectHeader = subjectLabel(firstRecord) || "Subject";

      if (index > 0) {
        doc.addPage();
      }

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoWidth, logoHeight);
      }

      let cursorY = headerStartY;

      doc.setTextColor(28, 35, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("BUKIDNON STATE UNIVERSITY", pageWidth / 2, cursorY, { align: "center" });

      cursorY += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text("Malaybalay City, Bukidnon 8700", pageWidth / 2, cursorY, { align: "center" });

      cursorY += 4;
      doc.text("Tel (088) 813-5661 to 5663; TeleFax (088) 813-7177", pageWidth / 2, cursorY, { align: "center" });

      cursorY += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(28, 35, 50);
      doc.text("GRADE REPORT", pageWidth / 2, cursorY, { align: "center" });

      cursorY += 5;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(subjectHeader, pageWidth / 2, cursorY, { align: "center" });

      cursorY += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Campus: Alubijid • ${semesterText}`, pageWidth / 2, cursorY, { align: "center" });

      cursorY += 4;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
      cursorY += 4;

      doc.setTextColor(55, 65, 81);

      cursorY += 6;
      const leftDetails = [
        `Instructor : ${facultyName || "N/A"}`,
        `Subject Code : ${firstRecord.subject_code || "N/A"}`,
        `Subject Description : ${firstRecord.subject_title || "N/A"}`,
      ];
      const rightDetails = [
        `Date : ${dayjs().format("MMM DD, YYYY")}`,
        `Schedule : ${scheduleInfo || "TBA"}`,
        `Course/Year : ${(firstRecord.course_code_display || "N/A")} ${firstRecord.year_level_display || ""}`,
      ];

      const detailRows = Math.max(leftDetails.length, rightDetails.length);
      for (let i = 0; i < detailRows; i += 1) {
        const left = leftDetails[i];
        const right = rightDetails[i];
        if (left) doc.text(left, marginX, cursorY + i * 5);
        if (right) doc.text(right, pageWidth - marginX, cursorY + i * 5, { align: "right" });
      }

      cursorY += detailRows * 5 + 6;

      const tableRows = group.items.map((record, rowIndex) => [
        rowIndex + 1,
        resolveStudentId(record) || "",
        record.student_display || formatPersonName(record.student) || "Unnamed Student",
        formatAverage(record.midterm, record.final),
        formatWorkflowStatus(record.midterm_status),
        formatWorkflowStatus(record.final_status ?? record.midterm_status),
        record.remarks || record.status || "",
      ]);

      autoTable(doc, {
        startY: cursorY,
        head: [["No", "ID No.", "Name", "Final Grade", "Midterm Status", "Final Status", "Remarks"]],
        body: tableRows,
        styles: {
          fontSize: 9,
          cellPadding: 2.5,
        },
        headStyles: {
          fillColor: [226, 232, 240],
          textColor: [51, 65, 85],
          lineWidth: 0.3,
          lineColor: [203, 213, 225],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 26 },
          2: { cellWidth: 78 },
          3: { cellWidth: 22, halign: "center" },
          4: { cellWidth: 30, halign: "center" },
          5: { cellWidth: 30, halign: "center" },
          6: { cellWidth: 34 },
        },
        margin: { left: marginX, right: marginX },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 6) {
            const badgeClass = getStatusBadgeClass(String(data.cell.raw || ""));
            if (badgeClass.includes("rose")) data.cell.styles.textColor = [220, 38, 38];
            else if (badgeClass.includes("emerald")) data.cell.styles.textColor = [22, 163, 74];
            else if (badgeClass.includes("amber")) data.cell.styles.textColor = [217, 119, 6];
            else data.cell.styles.textColor = [55, 65, 81];
          }
        },
      });
    });

    const filename = groupedGrades.length > 1 ? "GradeReports.pdf" : `${groupedGrades[0].subject}.pdf`;
    doc.save(filename);
  };

  const exportExcel = () => {
    if (!groupedGrades.length) return;

    const workbook = XLSX.utils.book_new();

    groupedGrades.forEach((group) => {
      const firstRecord = group.items[0] || {};
      const headerRows = [
        ["Bukidnon State University"],
        ["Malaybalay City, Bukidnon 8700"],
        ["Tel (088) 813-5661 to 5663; TeleFax (088) 813-7177"],
        [],
        ["GRADE REPORT"],
        [
          `Instructor: ${firstRecord.faculty_display || resolveFaculty(firstRecord) || "N/A"}`,
          `Date: ${dayjs().format("MMM DD, YYYY")}`,
        ],
        [
          `Subject Code: ${firstRecord.subject_code || "N/A"}`,
          `Schedule: ${firstRecord.schedule_display || "TBA"}`,
        ],
        [
          `Subject Description: ${firstRecord.subject_title || "N/A"}`,
          `Course/Year: ${(firstRecord.course_code_display || "N/A")} ${firstRecord.year_level_display || ""}`,
        ],
        [],
        ["No", "ID No.", "Name", "Final Grade", "Midterm Status", "Final Status", "Remarks"],
      ];

      const bodyRows = group.items.map((record, idx) => [
        idx + 1,
        resolveStudentId(record) || "",
        record.student_display || formatPersonName(record.student) || "Unnamed Student",
        formatAverage(record.midterm, record.final),
        formatWorkflowStatus(record.midterm_status),
        formatWorkflowStatus(record.final_status ?? record.midterm_status),
        record.remarks || record.status || "",
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([...headerRows, ...bodyRows]);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 32 },
        { wch: 10 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
      ];

      const headerRowIndex = headerRows.length;
      for (let col = 0; col < 7; col += 1) {
        const cellAddress = XLSX.utils.encode_cell({ c: col, r: headerRowIndex - 1 });
        const cell = worksheet[cellAddress];
        if (cell) {
          cell.s = {
            fill: {
              patternType: "solid",
              fgColor: { rgb: "E2E8F0" },
            },
            font: {
              color: { rgb: "334155" },
              bold: true,
            },
            alignment: {
              horizontal: "center",
              vertical: "center",
            },
            border: {
              top: { style: "thin", color: { rgb: "CBD5E1" } },
              right: { style: "thin", color: { rgb: "CBD5E1" } },
              bottom: { style: "thin", color: { rgb: "CBD5E1" } },
              left: { style: "thin", color: { rgb: "CBD5E1" } },
            },
          };
        }
      }

      const sheetName = (subjectLabel(firstRecord) || "Subject")
        .replace(/[^a-zA-Z0-9]/g, " ")
        .trim()
        .substring(0, 30) || "Subject";

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, "GradeReports.xlsx");
  };

  return (
    <RegistrarLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 border-b border-slate-200/70 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Grade Reports</h1>
            <p className="text-[11px] text-slate-500">
              Review grade submissions across courses, year levels, and terms. Export filtered insights for archival.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={exportPDF}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.25 text-[10px] font-medium text-rose-600 transition hover:bg-rose-100"
            >
              <FileArrowDown size={14} /> PDF
            </button>
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.25 text-[10px] font-medium text-emerald-600 transition hover:bg-emerald-100"
            >
              <FileArrowDown size={14} /> Excel
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="col-span-2 grid gap-2 sm:grid-cols-2">
            {summaryTiles.map((tile) => (
              <div
                key={tile.label}
                className={`rounded-2xl border bg-gradient-to-br p-3 shadow-[0_10px_22px_rgba(15,23,42,0.06)] ${tile.accent}`}
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{tile.label}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{tile.value}</p>
                <p className="text-[10px] text-slate-500">{tile.subtext}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
            <h3 className="text-[11px] font-semibold text-slate-700">Grade Distribution</h3>
            <div className="mt-2 h-40 w-40">
              <Doughnut data={doughnutData} options={chartOptions} />
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-3 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Passed
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Failed
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Incomplete
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white/95 p-3.5 shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
          <h2 className="text-[12px] font-semibold text-slate-800">Filters</h2>
          <div className="mt-3 flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3.5">
            <div className="relative w-full md:max-w-xs">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search by student name or ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-9 py-1.75 text-[11px] text-slate-600 shadow-sm transition placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div className="flex w-full flex-col gap-2.5 sm:flex-row">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.75 text-[11px] text-slate-600 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>

              <select
                value={yearLevelFilter}
                onChange={(e) => setYearLevelFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.75 text-[11px] text-slate-600 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All Year Levels</option>
                {yearLevels.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year_level}
                  </option>
                ))}
              </select>

              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.75 text-[11px] text-slate-600 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All Semesters</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.semester || s.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.75 text-[11px] text-slate-600 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All Status</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="inc">Incomplete</option>
                <option value="withdrawn">Withdrawn</option>
              </select>

              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.75 text-[11px] text-slate-600 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All Subjects</option>
                {subjectOptions.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_30px_RGBA(15,23,42,0.08)]">
          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[11px] md:text-[11.5px]">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3.25 py-2.5">Student ID</th>
                    <th className="px-3.25 py-2.5">Student</th>
                    <th className="px-3.25 py-2.5">Subject</th>
                    <th className="px-3.25 py-2.5">Faculty</th>
                    <th className="px-3.25 py-2.5">Course</th>
                    <th className="px-3.25 py-2.5">Year Level</th>
                    <th className="px-3.25 py-2.5">Semester</th>
                    <th className="px-3.25 py-2.5">Total</th>
                    <th className="px-3.25 py-2.5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {groupedGrades.map((group) => (
                    <Fragment key={group.subject}>
                      <tr className="bg-slate-100/80">
                        <td colSpan={9} className="px-3.25 py-2.5 font-semibold text-slate-700">
                          {group.subject}
                        </td>
                      </tr>
                      {group.items.map((g, idx) => (
                        <tr
                          key={g.id ?? `${group.subject}-${g.student?.id_number ?? "na"}-${idx}`}
                        >
                          <td className="px-3.25 py-2.5">{resolveStudentId(g) || ""}</td>
                          <td className="px-3.25 py-2.5">
                            {g.student_display || formatPersonName(g.student) || "Unnamed Student"}
                          </td>
                          <td className="px-3.25 py-2.5">{subjectLabel(g)}</td>
                          <td className="px-3.25 py-2.5">{resolveFaculty(g)}</td>
                          <td className="px-3.25 py-2.5">{g.course_code_display || g.course?.full_course_code || g.course?.code || ""}</td>
                          <td className="px-3.25 py-2.5">{g.year_level_display || g.yearLevel?.year_level || ""}</td>
                          <td className="px-3.25 py-2.5">{g.semester_display || g.semester?.semester || g.semester?.name || ""}</td>
                          <td className="px-3.25 py-2.5">
                            {formatAverage(g.midterm, g.final)}
                          </td>
                          <td className="px-3.25 py-2.5">
                            {(() => {
                              const content = g.remarks || g.status || "";
                              if (!content) {
                                return "";
                              }
                              return (
                                <span className={getStatusBadgeClass(content)}>
                                  {content}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
              <FileX size={46} className="text-slate-300" weight="duotone" />
              <p className="text-sm font-medium">No grade records match the current filters.</p>
              <p className="text-[11px] text-slate-400">Adjust filters or clear search to broaden results.</p>
            </div>
          )}
        </div>

        {paginationLinks.length > 1 && (
          <div className="mt-4 flex justify-center">
            <nav className="flex flex-wrap gap-1 text-[10.5px] md:text-[11px]">
              {paginationLinks.map((link, idx) => (
                <button
                  key={`${link.label}-${idx}`}
                  type="button"
                  disabled={!link.url}
                  onClick={() => handleNavigate(link.url)}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    link.active
                      ? "bg-sky-500 text-white shadow"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  } ${!link.url ? "cursor-not-allowed opacity-50" : ""}`}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                />
              ))}
            </nav>
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}
