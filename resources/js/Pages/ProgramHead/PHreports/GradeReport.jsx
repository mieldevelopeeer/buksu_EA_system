import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { UsersThree, TrendUp, BookOpen, FunnelSimple } from "phosphor-react";

const formatNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "0";

const formatAverage = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—";

const StatCard = ({ label, value, caption, icon: Icon, accent = "indigo" }) => {
  const accentClasses = {
    indigo: "text-indigo-600 bg-indigo-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
  };

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm shadow-slate-100">
      <div className={`rounded-xl p-2 text-base ${accentClasses[accent] || accentClasses.indigo}`}>
        <Icon size={18} />
      </div>
      <div className="flex flex-col">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="text-xl font-semibold text-slate-900">{value}</p>
        {caption && <p className="text-[11px] text-slate-500">{caption}</p>}
      </div>
    </div>
  );
};

const SectionCard = ({ title, description, children, tone = "default" }) => {
  const toneClasses =
    tone === "muted"
      ? "border-slate-100 bg-slate-50"
      : "border-slate-100 bg-white/90";

  return (
    <section className={`rounded-2xl p-4 shadow-sm shadow-slate-100 ${toneClasses}`}>
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description && <p className="text-[11px] text-slate-500">{description}</p>}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
};

const loadLogoImage = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/images/buksu_logo.png";
  });

export default function GradeReport({ summary = {}, recent = [] }) {
  const [remarksFilter, setRemarksFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [schoolYearFilter, setSchoolYearFilter] = useState("all");
  const [gradeBucket, setGradeBucket] = useState("all");
  const [timeframeFilter, setTimeframeFilter] = useState("all");
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

  const quickRemarkOptions = useMemo(
    () => remarkOptions.filter((option) => option !== "all").slice(0, 4),
    [remarkOptions]
  );

  const subjectOptions = useMemo(() => {
    const uniqueSubjects = new Set(
      recent.map((row) => row.subject_code).filter((value) => value !== undefined && value !== null && value !== '—')
    );
    return ["all", ...Array.from(uniqueSubjects)];
  }, [recent]);

  const courseOptions = useMemo(() => {
    const uniqueCourses = new Set(
      recent.map((row) => row.course).filter((value) => value !== undefined && value !== null)
    );
    return ["all", ...uniqueCourses];
  }, [recent]);

  const semesterOptions = useMemo(() => {
    const uniqueSemesters = new Set(
      recent.map((row) => row.semester).filter((value) => value !== undefined && value !== null && value !== '—')
    );
    return ["all", ...Array.from(uniqueSemesters)];
  }, [recent]);

  const schoolYearOptions = useMemo(() => {
    const uniqueSchoolYears = new Set(
      recent.map((row) => row.school_year).filter((value) => value !== undefined && value !== null && value !== '—')
    );
    return ["all", ...Array.from(uniqueSchoolYears)].sort();
  }, [recent]);

  const gradeBucketOptions = [
    { value: "all", label: "All GPA" },
    { value: "excellent", label: "≤ 1.25" },
    { value: "very_good", label: "1.26 - 1.75" },
    { value: "good", label: "1.76 - 2.25" },
    { value: "satisfactory", label: "2.26 - 2.75" },
    { value: "needs_support", label: "> 2.75" },
  ];

  const timeframeOptions = [
    { value: "all", label: "Any time" },
    { value: "week", label: "Last 7 days" },
    { value: "month", label: "Last 30 days" },
    { value: "quarter", label: "Last 90 days" },
  ];

  const filteredRemarkEntries = useMemo(() => {
    if (remarksFilter === "all") return remarkEntries;
    return remarkEntries.filter(([remarks]) => remarks === remarksFilter);
  }, [remarkEntries, remarksFilter]);

  const filteredSubjects = useMemo(() => {
    if (subjectFilter === "all") return topSubjects;
    return topSubjects.filter((row) => row.subject === subjectFilter);
  }, [topSubjects, subjectFilter]);

  const matchesGradeBucket = (grade) => {
    if (gradeBucket === "all") return true;
    const numeric = Number(grade);
    if (Number.isNaN(numeric)) return false;
    switch (gradeBucket) {
      case "excellent":
        return numeric <= 1.25;
      case "very_good":
        return numeric > 1.25 && numeric <= 1.75;
      case "good":
        return numeric > 1.75 && numeric <= 2.25;
      case "satisfactory":
        return numeric > 2.25 && numeric <= 2.75;
      case "needs_support":
        return numeric > 2.75;
      default:
        return true;
    }
  };

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
      const matchesRemarks =
        remarksFilter === "all" || (row.remarks || "").toLowerCase() === remarksFilter.toLowerCase();
      const matchesSubject =
        subjectFilter === "all" || (row.subject_code || "").toLowerCase() === subjectFilter.toLowerCase();
      const matchesCourse =
        courseFilter === "all" || (row.course || "").toLowerCase() === courseFilter.toLowerCase();
      const matchesSemester =
        semesterFilter === "all" || (row.semester || "").toLowerCase() === semesterFilter.toLowerCase();
      const matchesSchoolYear =
        schoolYearFilter === "all" || (row.school_year || "").toLowerCase() === schoolYearFilter.toLowerCase();
      const matchesGrade = matchesGradeBucket(row.grade);
      const matchesTimeframe = dateWithinTimeframe(row.updated_at);
      const matchesTerm =
        term === "" ||
        (row.student || "").toLowerCase().includes(term) ||
        (row.student_id || "").toLowerCase().includes(term) ||
        (row.course || "").toLowerCase().includes(term) ||
        (row.subject_code || "").toLowerCase().includes(term) ||
        (row.faculty || "").toLowerCase().includes(term) ||
        (row.schedule || "").toLowerCase().includes(term);

      return matchesRemarks && matchesSubject && matchesCourse && matchesSemester && matchesSchoolYear && matchesGrade && matchesTimeframe && matchesTerm;
    });
  }, [recent, remarksFilter, subjectFilter, courseFilter, semesterFilter, schoolYearFilter, gradeBucket, timeframeFilter, searchTerm]);

  const filteredMetaSource = useMemo(() => filteredRecent[0] || null, [filteredRecent]);

  const totalFiltered = useMemo(() => {
    if (remarksFilter === "all") return summary.total ?? remarkEntries.reduce((acc, [, total]) => acc + (Number(total) || 0), 0);
    return filteredRemarkEntries.reduce((acc, [, total]) => acc + (Number(total) || 0), 0);
  }, [summary, remarkEntries, filteredRemarkEntries, remarksFilter]);

  const exportRows = useMemo(() => filteredRecent.map((row) => ({
    Student: row.student || "Unnamed",
    ID: row.student_id || "—",
    "Subject Code": row.subject_code || "—",
    Course: row.course || "—",
    Schedule: row.schedule || "—",
    Faculty: row.faculty || "—",
    Grade: row.grade ?? "—",
    Remarks: row.remarks || "—",
    Updated: row.updated_at || "—",
  })), [filteredRecent]);

  const currentFilterSummary = `Remarks: ${remarksFilter === "all" ? "All" : remarksFilter} • Semester: ${semesterFilter === "all" ? "All" : semesterFilter} • School Year: ${schoolYearFilter === "all" ? "All" : schoolYearFilter} • Course: ${courseFilter === "all" ? "All" : courseFilter} • Subject: ${
    subjectFilter === "all" ? "All" : subjectFilter
  } • Grades: ${
    gradeBucketOptions.find((option) => option.value === gradeBucket)?.label || "All grades"
  } • Timeframe: ${timeframeOptions.find((opt) => opt.value === timeframeFilter)?.label || "Any time"} • Search: ${
    searchTerm ? `"${searchTerm}"` : "None"
  }`;

  const handleExportPDF = () => {
    if (!filteredRecent.length) return;

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
      doc.text("GRADE REPORT FOR SATELLITE CAMPUS", pageWidth / 2, cursorY + 18, { align: "center" });
      doc.setFont("Times", "Normal");
      doc.setFontSize(9);
      doc.text(
        `CAMPUS: ${reportMeta.campus}    Semester: ${reportMeta.semester}    S.Y.: ${reportMeta.schoolYear}`,
        pageWidth / 2,
        cursorY + 23,
        { align: "center" }
      );

      const infoStartY = cursorY + 33;
      doc.text(`Instructor : ${reportMeta.instructor}`, marginX, infoStartY);
      doc.text(`Subject Code : ${reportMeta.subjectCode}`, marginX, infoStartY + 5);

      doc.text(`Date : ${reportMeta.date}`, pageWidth - marginX, infoStartY, { align: "right" });
      doc.text(`Schedule : ${reportMeta.schedule}`, pageWidth - marginX, infoStartY + 5, { align: "right" });

      const tableStartY = infoStartY + 13;
      const tableRows = filteredRecent.map((row, index) => [
        index + 1,
        row.student_id || "—",
        row.student || "Unnamed",
        row.grade ?? "—",
        row.remarks || "—",
      ]);

      const targetRows = Math.max(25, tableRows.length);
      while (tableRows.length < targetRows) {
        tableRows.push(["", "", "", "", ""]);
      }
      tableRows.push(["", "", "Nothing Follows***", "", ""]);

      autoTable(doc, {
        startY: tableStartY,
        head: [["No.", "ID NO.", "NAME", "FINAL GRADE", "REMARKS"]],
        body: tableRows,
        styles: { fontSize: 8, cellPadding: 2, font: "Times" },
        headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 28 },
          2: { cellWidth: 74 },
          3: { cellWidth: 30, halign: "center" },
          4: { cellWidth: 35 },
        },
        bodyStyles: { textColor: 30 },
      });

      const tableEndY = doc.lastAutoTable.finalY + 4;
      doc.setFontSize(8);
      doc.setFont("Times", "Italic");
      doc.text("Add rows if necessary", marginX, tableEndY);
      doc.setFont("Times", "Normal");

      const pageHeight = doc.internal.pageSize.getHeight();
      const footerHeight = 8; // Height needed for footer
      const signatureHeight = 12; // Height needed for signatures
      const minBottomMargin = 8;
      const signatureSpacing = 8; // Space after "Add rows if necessary"
      
      // Calculate total space needed
      const totalNeededSpace = signatureSpacing + signatureHeight + footerHeight + minBottomMargin;
      const availableSpace = pageHeight - tableEndY;
      
      // Only add new page if there's really not enough space
      let signatureY;
      if (availableSpace < totalNeededSpace) {
        doc.addPage();
        signatureY = 20;
      } else {
        signatureY = tableEndY + signatureSpacing;
      }

      const blockWidth = (pageWidth - marginX * 2) / 3;
      const signatureBlocks = [
        { label: reportMeta.instructor, role: "Instructor" },
        { label: reportMeta.programHead, role: "Program Head" },
        { label: reportMeta.campusHead, role: "Campus Head" },
      ];

      signatureBlocks.forEach((sig, index) => {
        const centerX = marginX + blockWidth * index + blockWidth / 2;
        doc.setFont("Times", "Bold");
        doc.setFontSize(9);
        doc.text(sig.label, centerX, signatureY, { align: "center" });
        doc.setFont("Times", "Normal");
        doc.text(sig.role, centerX, signatureY + 4, { align: "center" });
        doc.setFontSize(7);
        doc.text("(signature over printed name)", centerX, signatureY + 8, { align: "center" });
      });

      // Place footer at a fixed position from bottom
      const footerY = pageHeight - minBottomMargin;
      doc.setFont("Times", "Normal");
      doc.setFontSize(7);
      doc.text("Document Code: RGP-5-001", marginX, footerY);
      doc.text("Revision No.: 0", marginX + 50, footerY);
      doc.text("Issue No.: 01", marginX + 90, footerY);
      doc.text("Issue Date: July 07, 2020", pageWidth - marginX, footerY, { align: "right" });

      const pdfDate = reportMeta.date?.replace(/\//g, "-") || new Date().toLocaleDateString().replace(/\//g, "-");
      doc.save(`Grade Report - ${pdfDate}.pdf`);
    };

    generateTemplate();
  };

  const handleExportExcel = () => {
    if (!exportRows.length) return;

    const metadataRows = [
      ["Grade Report"],
      [currentFilterSummary],
      ["Generated", new Date().toLocaleString()],
      [],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(metadataRows);
    XLSX.utils.sheet_add_json(worksheet, exportRows, {
      origin: metadataRows.length,
      skipHeader: false,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Grades");
    const excelDate = new Date().toLocaleDateString().replace(/\//g, "-");
    XLSX.writeFile(workbook, `Grade Report - ${excelDate}.xlsx`);
  };

  const totalRemarksCount = useMemo(
    () => remarkEntries.reduce((acc, [, total]) => acc + (Number(total) || 0), 0),
    [remarkEntries]
  );

  const getPercent = (value, total) => {
    if (!total) return 0;
    return Math.round(((Number(value) || 0) / total) * 100);
  };

  const topRemark = useMemo(() => {
    if (!remarkEntries.length) return null;
    return [...remarkEntries].sort((a, b) => (b[1] || 0) - (a[1] || 0))[0];
  }, [remarkEntries]);

  const busiestSubject = useMemo(() => {
    if (!topSubjects.length) return null;
    return [...topSubjects].sort((a, b) => (b.total || 0) - (a.total || 0))[0];
  }, [topSubjects]);

  const resetFilters = () => {
    setRemarksFilter("all");
    setSubjectFilter("all");
    setCourseFilter("all");
    setSemesterFilter("all");
    setSchoolYearFilter("all");
    setGradeBucket("all");
    setTimeframeFilter("all");
    setSearchTerm("");
  };

  const filterChips = useMemo(
    () => [
      { label: "Remarks", value: remarksFilter === "all" ? "All" : remarksFilter },
      { label: "Semester", value: semesterFilter === "all" ? "All" : semesterFilter },
      { label: "School Year", value: schoolYearFilter === "all" ? "All" : schoolYearFilter },
      { label: "Course", value: courseFilter === "all" ? "All" : courseFilter },
      { label: "Subject", value: subjectFilter === "all" ? "All" : subjectFilter },
      { label: "GPA", value: gradeBucketOptions.find((opt) => opt.value === gradeBucket)?.label || "All" },
      { label: "Window", value: timeframeOptions.find((opt) => opt.value === timeframeFilter)?.label || "Any time" },
    ],
    [remarksFilter, subjectFilter, courseFilter, semesterFilter, schoolYearFilter, gradeBucket, timeframeFilter]
  );

  const statCards = useMemo(
    () => [
      {
        label: "Total Records",
        value: formatNumber(totalFiltered),
        caption: "Entries within applied filters",
        icon: UsersThree,
        accent: "indigo",
      },
      {
        label: "Average GPA",
        value: formatAverage(summary.average),
        caption: "Lower values indicate better performance",
        icon: TrendUp,
        accent: "emerald",
      },
      {
        label: "Unique Subjects",
        value: formatNumber(topSubjects.length),
        caption: "Top curriculum loads monitored",
        icon: BookOpen,
        accent: "amber",
      },
    ],
    [summary.average, topSubjects.length, totalFiltered]
  );

  const reportMeta = useMemo(() => {
    const meta = summary.meta || {};
    const source = filteredMetaSource || {};

    const fallbackDate = meta.date || new Date().toLocaleDateString();

    return {
      campus: meta.campus || "ALUBIJID",
      semester: source.semester || meta.semester || "—",
      schoolYear: source.school_year || meta.school_year || "—",
      instructor: source.faculty || source.instructor || meta.instructor || "—",
      programHead: meta.program_head || "—",
      campusHead: meta.campus_head || "—",
      subjectCode: source.subject_code || meta.subject_code || "—",
      date: fallbackDate,
      schedule: source.schedule || meta.schedule || "—",
    };
  }, [summary.meta, filteredMetaSource]);

  return (
    <div className="space-y-3 p-3 sm:p-5 bg-slate-50 min-h-screen">
      <header className="bg-white rounded-lg shadow-sm border border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Grade Report</h1>
            <p className="text-xs text-slate-500 mt-1">
              Comprehensive grade records and academic performance tracking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
              disabled={!exportRows.length}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition hover:bg-green-100"
              disabled={!exportRows.length}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by student, ID, subject, or course..."
              className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-md text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {/* Filter Controls Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            <select
              value={remarksFilter}
              onChange={(event) => setRemarksFilter(event.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              {remarkOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "• Remarks" : option}
                </option>
              ))}
            </select>

            <select
              value={semesterFilter}
              onChange={(event) => setSemesterFilter(event.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              {semesterOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "• Semester" : option}
                </option>
              ))}
            </select>

            <select
              value={schoolYearFilter}
              onChange={(event) => setSchoolYearFilter(event.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              {schoolYearOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "• School Year" : option}
                </option>
              ))}
            </select>

            <select
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              {courseOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "• Course" : option}
                </option>
              ))}
            </select>

            <select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              {subjectOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "• Subject" : option}
                </option>
              ))}
            </select>

            <select
              value={gradeBucket}
              onChange={(event) => setGradeBucket(event.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              {gradeBucketOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={timeframeFilter}
              onChange={(event) => setTimeframeFilter(event.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              {timeframeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filters & Actions Row */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              {remarksFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-medium border border-blue-200">
                  Remarks: {remarksFilter}
                  <button onClick={() => setRemarksFilter('all')} className="hover:text-blue-900 text-sm">×</button>
                </span>
              )}
              {semesterFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded text-[10px] font-medium border border-purple-200">
                  Semester: {semesterFilter}
                  <button onClick={() => setSemesterFilter('all')} className="hover:text-purple-900 text-sm">×</button>
                </span>
              )}
              {schoolYearFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded text-[10px] font-medium border border-indigo-200">
                  S.Y.: {schoolYearFilter}
                  <button onClick={() => setSchoolYearFilter('all')} className="hover:text-indigo-900 text-sm">×</button>
                </span>
              )}
              {courseFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium border border-emerald-200">
                  Course: {courseFilter}
                  <button onClick={() => setCourseFilter('all')} className="hover:text-emerald-900 text-sm">×</button>
                </span>
              )}
              {subjectFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded text-[10px] font-medium border border-amber-200">
                  Subject: {subjectFilter}
                  <button onClick={() => setSubjectFilter('all')} className="hover:text-amber-900 text-sm">×</button>
                </span>
              )}
              {gradeBucket !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded text-[10px] font-medium border border-rose-200">
                  GPA: {gradeBucketOptions.find(opt => opt.value === gradeBucket)?.label}
                  <button onClick={() => setGradeBucket('all')} className="hover:text-rose-900 text-sm">×</button>
                </span>
              )}
              {timeframeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded text-[10px] font-medium border border-cyan-200">
                  Time: {timeframeOptions.find(opt => opt.value === timeframeFilter)?.label}
                  <button onClick={() => setTimeframeFilter('all')} className="hover:text-cyan-900 text-sm">×</button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-300">
                  "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-slate-900 text-sm">×</button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                {filteredRecent.length} results
              </span>
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:text-slate-900 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                disabled={
                  remarksFilter === "all" &&
                  subjectFilter === "all" &&
                  courseFilter === "all" &&
                  semesterFilter === "all" &&
                  schoolYearFilter === "all" &&
                  gradeBucket === "all" &&
                  timeframeFilter === "all" &&
                  !searchTerm
                }
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <SectionCard title="Remarks Breakdown" description="Volume of grade submissions per status label">
          {filteredRemarkEntries.length > 0 ? (
            filteredRemarkEntries.map(([remarks, total]) => (
              <div key={remarks || "unspecified"} className="space-y-1 rounded-xl border border-slate-100 bg-white px-3 py-2 text-[12px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="capitalize">{remarks || "Unspecified"}</span>
                  <span className="font-semibold text-slate-900">{formatNumber(total)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-400 transition-all"
                    style={{ width: `${getPercent(total, totalRemarksCount)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">{getPercent(total, totalRemarksCount)}% share</p>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-slate-400">No remarks data.</p>
          )}
        </SectionCard>

        <SectionCard title="Top Subjects" description="Subjects with the highest number of recorded grades">
          {filteredSubjects.length > 0 ? (
            filteredSubjects.map((row, index) => (
              <div key={`${row.subject}-${index}`} className="space-y-1 rounded-xl border border-slate-100 bg-white px-3 py-2 text-[12px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span>{row.subject || "Unnamed Subject"}</span>
                  <span className="font-semibold text-slate-900">{formatNumber(row.total)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${getPercent(row.total, summary.total || totalFiltered || 1)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">{getPercent(row.total, summary.total || totalFiltered || 1)}% of records</p>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-slate-400">No subject distribution available.</p>
          )}
        </SectionCard>

        <SectionCard title="Insights" description="At-a-glance takeaways" tone="muted">
          <div className="rounded-xl border border-slate-100 bg-white p-3 text-[12px] text-slate-600">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Most Common Remarks</p>
            {topRemark ? (
              <>
                <p className="text-sm font-semibold text-slate-900 capitalize">{topRemark[0] || "Unspecified"}</p>
                <p className="text-[11px] text-slate-500">{formatNumber(topRemark[1])} records</p>
              </>
            ) : (
              <p className="text-[11px] text-slate-400">No remarks data.</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-3 text-[12px] text-slate-600">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Busiest Subject</p>
            {busiestSubject ? (
              <>
                <p className="text-sm font-semibold text-slate-900">{busiestSubject.subject || "Unnamed"}</p>
                <p className="text-[11px] text-slate-500">{formatNumber(busiestSubject.total)} grades logged</p>
              </>
            ) : (
              <p className="text-[11px] text-slate-400">No subject data.</p>
            )}
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title="Recent Grade Activity"
        description="Latest updates across monitored sections"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[12px] text-slate-600">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-3 py-1.5 text-left">Student</th>
                <th className="px-3 py-1.5 text-left">Subject Code</th>
                <th className="px-3 py-1.5 text-left">Schedule</th>
                <th className="px-3 py-1.5 text-left">Course</th>
                <th className="px-3 py-1.5 text-left">GPA</th>
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
                    <td className="px-3 py-1.5">{row.subject_code || "—"}</td>
                    <td className="px-3 py-1.5 text-[10px]">{row.schedule || "—"}</td>
                    <td className="px-3 py-1.5">{row.course || "—"}</td>
                    <td className="px-3 py-1.5">{row.grade ?? "—"}</td>
                    <td className="px-3 py-1.5 capitalize">{row.remarks || "—"}</td>
                    <td className="px-3 py-1.5 text-right text-[11px] text-slate-500">{row.updated_at || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-[12px] text-slate-400">
                    No recent grade activity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
