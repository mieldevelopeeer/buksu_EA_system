import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Head } from "@inertiajs/react";
import FacultyLayout from "@/Layouts/FacultyLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { debounce } from "lodash";

export default function FacultyGradeReport({
  schedules = [],
  gradeSummaries = [],
  activeSemester = null,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [remarkFilter, setRemarkFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const debugEnabled = (import.meta?.env?.MODE || "development") !== "production";

  // Utility functions
  const normalizeGrade = useCallback((value) => {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }, []);

  const loadLogoImage = useCallback(() => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn("Failed to load logo image");
        resolve(null);
      };
      img.src = "/images/buksu_logo.png";
    });
  }, []);

  const formatAverage = useCallback((value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(2) : "—";
  }, []);

  const parseTime = useCallback((time) => {
    if (!time) return "—";
    try {
      const [hours, minutes] = time.toString().split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes || '0', 10), 0);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).replace(/\s/g, '');
    } catch (error) {
      console.warn('Error parsing time:', { time, error });
      return time;
    }
  }, []);

  const formatScheduleTime = useCallback((start, end) => {
    if (!start || !end) return "—";
    const startLabel = parseTime(start);
    const endLabel = parseTime(end);
    return `${startLabel} - ${endLabel}`;
  }, [parseTime]);

  // Debounced search term update
  const debouncedSetSearchTerm = useMemo(
    () =>
      debounce((value) => {
        setSearchTerm(value);
      }, 300),
    []
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSetSearchTerm.cancel();
    };
  }, [debouncedSetSearchTerm]);

  useEffect(() => {
    console.groupCollapsed("[FacultyGradeReport] incoming props");
    console.log("Active Semester", activeSemester);
    console.log("Schedules count:", schedules?.length);
    console.log("Schedules", schedules);
    console.log("Grade Summaries count:", gradeSummaries?.length);
    console.log("Grade Summaries", gradeSummaries);
    console.groupEnd();
  }, [activeSemester, schedules, gradeSummaries]);

  const scheduleIndex = useMemo(() => {
    const map = new Map();
    if (Array.isArray(schedules)) {
      console.log("[scheduleIndex] Processing schedules:", schedules.length);
      schedules.forEach((schedule) => {
        const subject = schedule.curriculum_subject?.subject ?? schedule.subject ?? {};
        const course = schedule.curriculum_subject?.course ?? schedule.course ?? {};
        const section = schedule.section ?? {};

        const meta = {
          id: schedule.id,
          subjectName: subject.descriptive_title || subject.title || schedule.subject_title || "Unnamed Subject",
          subjectCode: subject.code || schedule.subject_code || "",
          sectionLabel: section.section || schedule.section_name || "Section",
          courseLabel: course.code || course.name || "Course",
          scheduleLabel: schedule.schedule_day || schedule.day || "—",
          timeLabel:
            schedule.formatted_time ||
            formatScheduleTime(schedule.start_time, schedule.end_time),
          studentCount: schedule.student_count ??
            (Array.isArray(schedule.students) ? schedule.students.length : null),
        };
        
        console.log(`[scheduleIndex] Schedule ${schedule.id}:`, {
          subject: subject.code || 'NO CODE',
          section: section.section || 'NO SECTION',
          meta
        });
        
        map.set(schedule.id, meta);
      });
      console.log("[scheduleIndex] Final map size:", map.size);
    } else {
      console.warn("[scheduleIndex] schedules is not an array:", schedules);
    }
    return map;
  }, [schedules]);

  const groupedGrades = useMemo(() => {
    if (!Array.isArray(gradeSummaries)) {
      console.warn("[groupedGrades] gradeSummaries is not an array:", gradeSummaries);
      return [];
    }

    console.log("[groupedGrades] Processing summaries:", gradeSummaries.length);

    const result = gradeSummaries
      .map((summary, index) => {
        const scheduleId = summary.class_schedule_id ?? summary.schedule_id ?? summary.classScheduleId;
        
        console.log(`[groupedGrades] Summary ${index}:`, {
          scheduleId,
          class_schedule_id: summary.class_schedule_id,
          schedule_id: summary.schedule_id,
          classScheduleId: summary.classScheduleId,
          totals: summary.totals,
          recordsCount: summary.records?.length
        });
        
        if (!scheduleId) {
          console.warn(`[groupedGrades] Summary ${index} missing scheduleId`);
          return null;
        }

        const scheduleMeta = scheduleIndex.get(scheduleId);
        const fallback = summary.reference || {};

        console.log(`[groupedGrades] Schedule ${scheduleId}:`, {
          foundInIndex: !!scheduleMeta,
          scheduleMeta,
          fallback
        });

        const schedule =
          scheduleMeta || {
            id: scheduleId,
            subjectName: fallback.subjectName || "Unknown Subject",
            subjectCode: fallback.subjectCode || "",
            sectionLabel: fallback.sectionLabel || "Section",
            courseLabel: fallback.courseLabel || "Course",
            scheduleLabel: fallback.schedule_day || fallback.day || "—",
            timeLabel: fallback.formatted_time || formatScheduleTime(fallback.start_time, fallback.end_time),
            studentCount: fallback.student_count ?? null,
          };

        const records = Array.isArray(summary.records) ? summary.records : [];
        const remarkCounts = records.reduce((map, record) => {
          const remarkKey = (record.remarks || record.final_status || record.midterm_status || "").toLowerCase();
          if (!remarkKey) return map;
          map.set(remarkKey, (map.get(remarkKey) ?? 0) + 1);
          return map;
        }, new Map());

        return {
          schedule,
          totals: {
            submitted: summary.totals?.submitted ?? 0,
            drafts: summary.totals?.drafts ?? 0,
            failing: summary.totals?.failing ?? 0,
            passed: summary.totals?.passed ?? 0,
          },
          average: summary.average ?? null,
          remarkCounts: Array.from(remarkCounts.entries()).map(([remark, count]) => ({ remark, count })),
          records,
        };
      })
      .filter(Boolean);

    console.log("[groupedGrades] Final grouped grades:", result.length);
    return result;
  }, [gradeSummaries, scheduleIndex]);

  const sectionOptions = useMemo(() => {
    const set = new Set(["all"]);
    scheduleIndex.forEach((meta) => {
      if (meta.sectionLabel) set.add(meta.sectionLabel);
    });
    const options = Array.from(set);
    console.log("[sectionOptions]", options);
    return options;
  }, [scheduleIndex]);

  const subjectOptions = useMemo(() => {
    const set = new Set(["all"]);
    scheduleIndex.forEach((meta) => {
      const label = meta.subjectCode ? `${meta.subjectCode} • ${meta.subjectName}` : meta.subjectName;
      if (label) set.add(label);
    });
    const options = Array.from(set);
    console.log("[subjectOptions]", options);
    return options;
  }, [scheduleIndex]);

  const studentOptions = useMemo(() => {
    const set = new Set(["all"]);
    groupedGrades.forEach((group) => {
      group.records.forEach((record) => {
        if (record.student_name) {
          set.add(record.student_name);
        }
      });
    });
    return Array.from(set);
  }, [groupedGrades]);

  const remarkOptions = useMemo(() => {
    const set = new Set(["all"]);
    groupedGrades.forEach((group) => {
      group.remarkCounts.forEach(({ remark }) => {
        if (remark) set.add(remark);
      });
    });
    return Array.from(set);
  }, [groupedGrades]);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return groupedGrades.filter((group) => {
      const { schedule } = group;
      if (!schedule) return false;

      const matchesSection =
        sectionFilter === "all" || schedule.sectionLabel === sectionFilter;
      if (!matchesSection) return false;

      const subjectLabel = schedule.subjectCode
        ? `${schedule.subjectCode} • ${schedule.subjectName}`
        : schedule.subjectName;
      const matchesSubject = subjectFilter === "all" || subjectLabel === subjectFilter;
      if (!matchesSubject) return false;

      if (
        studentFilter !== "all" &&
        !group.records.some((record) => record.student_name === studentFilter)
      ) {
        return false;
      }

      const haystack = [
        schedule.subjectName,
        schedule.subjectCode,
        schedule.sectionLabel,
        schedule.courseLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (term && !haystack.includes(term)) return false;

      if (statusFilter === "submitted" && group.totals.submitted === 0) return false;
      if (statusFilter === "pending" && group.totals.drafts === 0) return false;
      if (statusFilter === "failing" && group.totals.failing === 0) return false;

      if (remarkFilter !== "all") {
        const hasRemark = group.remarkCounts.some(
          ({ remark }) => remark && remark.toLowerCase() === remarkFilter.toLowerCase()
        );
        if (!hasRemark) return false;
      }

      return true;
    });
  }, [groupedGrades, searchTerm, sectionFilter, statusFilter, remarkFilter]);

  useEffect(() => {
    if (!debugEnabled) return;
    const snapshot = filteredGroups.map((group) => ({
      schedule: `${group.schedule.subjectCode ? `${group.schedule.subjectCode} · ` : ""}${group.schedule.subjectName}`,
      section: group.schedule.sectionLabel,
      submitted: group.totals.submitted,
      drafts: group.totals.drafts,
      passing: group.totals.passed,
      failing: group.totals.failing,
      average: group.average,
      recordCount: group.records.length,
    }));
    console.groupCollapsed("[FacultyGradeReport] filtered snapshot");
    console.table(snapshot);
    console.groupEnd();
  }, [filteredGroups, debugEnabled]);

  const overviewTotals = useMemo(() => {
    return filteredGroups.reduce(
      (acc, group) => {
        acc.submitted += group.totals.submitted;
        acc.drafts += group.totals.drafts;
        acc.failing += group.totals.failing;
        acc.passed += group.totals.passed;
        if (group.average !== null) {
          acc.averageSum += group.average;
          acc.averageCount += 1;
        }
        return acc;
      },
      { submitted: 0, drafts: 0, failing: 0, passed: 0, averageSum: 0, averageCount: 0 }
    );
  }, [filteredGroups]);

  const exportRows = useMemo(
    () =>
      filteredGroups.map(({ schedule, totals, average }) => ({
        Subject: `${schedule.subjectCode ? `${schedule.subjectCode} - ` : ""}${schedule.subjectName}`,
        Section: schedule.sectionLabel,
        Course: schedule.courseLabel,
        Schedule: `${schedule.scheduleLabel} ${schedule.timeLabel}`.trim(),
        Students: schedule.studentCount ?? "—",
        Submitted: totals.submitted,
        Draft: totals.drafts,
        Failing: totals.failing,
        Passed: totals.passed,
        Average: average !== null ? average.toFixed(2) : "—",
      })),
    [filteredGroups]
  );

  const templateMeta = useMemo(() => {
    return {
      campus: activeSemester?.campus ?? "ALUBIJID",
      semester: activeSemester?.semester ?? "—",
      schoolYear: activeSemester?.school_year ?? "—",
      instructor: schedules?.[0]?.faculty_name || "—",
      preparedRole: "Faculty",
      date: new Date().toLocaleDateString(),
    };
  }, [activeSemester, schedules]);

  const exportPDF = async () => {
    if (!exportRows.length || isExporting) return;
    
    try {
      setIsExporting(true);

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
      doc.text("FACULTY GRADE REPORT", pageWidth / 2, cursorY + 18, { align: "center" });
      doc.setFont("Times", "Normal");
      doc.text(
        `CAMPUS: ${templateMeta.campus}    Semester: ${templateMeta.semester}    S.Y.: ${templateMeta.schoolYear}`,
        pageWidth / 2,
        cursorY + 24,
        { align: "center" }
      );

      doc.text(`Instructor : ${templateMeta.instructor}`, marginX, cursorY + 34);
      doc.text(`Generated : ${templateMeta.date}`, pageWidth - marginX, cursorY + 34, { align: "right" });

      const tableStartY = cursorY + 42;
      autoTable(doc, {
        startY: tableStartY,
        head: [["SUBJECT", "SECTION", "COURSE", "SCHEDULE", "STUDENTS", "SUBMITTED", "DRAFT", "FAILING", "PASSED", "AVERAGE"]],
        body: exportRows.map((row) => [
          row.Subject,
          row.Section,
          row.Course,
          row.Schedule,
          row.Students,
          row.Submitted,
          row.Draft,
          row.Failing,
          row.Passed,
          row.Average,
        ]),
        styles: { fontSize: 8.5, font: "Times", cellPadding: 2 },
        headStyles: { fontStyle: "bold", fillColor: [240, 240, 240], textColor: 20 },
        bodyStyles: { textColor: 35 },
      });

      const signatureY = doc.lastAutoTable.finalY + 12;
      doc.setFont("Times", "Normal");
      doc.text("Prepared by:", marginX, signatureY);
      doc.setFont("Times", "Bold");
      doc.text(templateMeta.instructor, marginX, signatureY + 5);
      doc.setFont("Times", "Normal");
      doc.text(templateMeta.preparedRole, marginX, signatureY + 9);
      doc.setFontSize(7);
      doc.text("(signature over printed name)", marginX, signatureY + 13);

      const pdfDate = templateMeta.date.replace(/\//g, "-");
      doc.save(`Faculty Grade Report - ${pdfDate}.pdf`);
    };

      await generateTemplate();
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportExcel = () => {
    if (!exportRows.length || isExporting) return;
    
    try {
      setIsExporting(true);

    const metadataRows = [
      ["BUKIDNON STATE UNIVERSITY"],
      ["Malaybalay City, Bukidnon 8700"],
      ["Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph"],
      ["FACULTY GRADE REPORT"],
      [`CAMPUS: ${templateMeta.campus}    Semester: ${templateMeta.semester}    S.Y.: ${templateMeta.schoolYear}`],
      ["Instructor", templateMeta.instructor],
      ["Generated", templateMeta.date],
      [],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(metadataRows);
    XLSX.utils.sheet_add_json(worksheet, exportRows, { origin: metadataRows.length, skipHeader: false });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Grades");
    const excelDate = templateMeta.date.replace(/\//g, "-");
      XLSX.writeFile(workbook, `Faculty Grade Report - ${excelDate}.xlsx`);
    } catch (error) {
      console.error("Error generating Excel:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <FacultyLayout>
      <Head title="Grade Reports" />
      <div className="space-y-4 p-4 sm:p-6 bg-slate-50 min-h-screen">
        {/* Header Section */}
        <header className="bg-white rounded-lg shadow-sm border border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Grade Reports</h1>
              <p className="text-xs text-slate-500 mt-1">Monitor grade submissions across your assigned subjects</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportPDF}
                disabled={!exportRows.length || isExporting}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-busy={isExporting}
              >
                {isExporting ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>PDF</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={exportExcel}
                disabled={!exportRows.length || isExporting}
                className="inline-flex items-center gap-1.5 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-busy={isExporting}
              >
                {isExporting ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Excel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Active Semester Info */}
        {activeSemester && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-5 py-3">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Semester</span>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeSemester.semester ?? "—"}</p>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">School Year</span>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeSemester.school_year ?? "—"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Stats Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          {/* Search and Filters */}
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                defaultValue={searchTerm}
                onChange={(event) => debouncedSetSearchTerm(event.target.value)}
                placeholder="Search by subject, course, or section..."
                className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-md text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <select
                value={sectionFilter}
                onChange={(event) => setSectionFilter(event.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {sectionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "• All Sections" : option}
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
                    {option === "all" ? "• All Subjects" : option}
                  </option>
                ))}
              </select>

              <select
                value={studentFilter}
                onChange={(event) => setStudentFilter(event.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {studentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "• All Students" : option}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">• All Status</option>
                <option value="submitted">Submitted</option>
                <option value="pending">Pending</option>
                <option value="failing">Failing</option>
              </select>

              <select
                value={remarkFilter}
                onChange={(event) => setRemarkFilter(event.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {remarkOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "• All Remarks" : option}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setSectionFilter("all");
                  setSubjectFilter("all");
                  setStudentFilter("all");
                  setStatusFilter("all");
                  setRemarkFilter("all");
                  setSearchTerm("");
                }}
                className="px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition"
              >
                Clear Filters
              </button>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700">{filteredGroups.length}</span> of <span className="font-semibold text-slate-700">{groupedGrades.length}</span> schedule{groupedGrades.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-emerald-200/70 bg-emerald-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Submitted</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{overviewTotals.submitted}</p>
            </div>
            <div className="rounded-lg border border-amber-200/70 bg-amber-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Pending</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{overviewTotals.drafts}</p>
            </div>
            <div className="rounded-lg border border-sky-200/70 bg-sky-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-600">Passing</p>
              <p className="mt-1 text-2xl font-bold text-sky-700">{overviewTotals.passed}</p>
            </div>
            <div className="rounded-lg border border-rose-200/70 bg-rose-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600">Failing</p>
              <p className="mt-1 text-2xl font-bold text-rose-700">{overviewTotals.failing}</p>
            </div>
          </div>
        </div>

        {/* Grade Records List */}
        <div className="space-y-3">
          {filteredGroups.length === 0 ? (
            <div className="bg-white rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm text-slate-600 font-medium">No grade data found</p>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search term</p>
            </div>
          ) : (
            filteredGroups.map(({ schedule, totals, average, remarkCounts, records }) => (
              <div
                key={schedule.id}
                className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <h2 className="text-sm font-bold text-slate-900">
                        {schedule.subjectCode ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                              {schedule.subjectCode}
                            </span>
                            <span>{schedule.subjectName}</span>
                          </span>
                        ) : (
                          schedule.subjectName
                        )}
                      </h2>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {schedule.courseLabel}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {schedule.sectionLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {schedule.scheduleLabel} {schedule.timeLabel}
                      </span>
                      {typeof schedule.studentCount === "number" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-semibold">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          {schedule.studentCount}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md font-semibold">
                        Avg: {formatAverage(average)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center p-2 rounded-md bg-emerald-50 border border-emerald-200">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Submitted</p>
                    <p className="text-xl font-bold text-emerald-700 mt-0.5">{totals.submitted}</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-amber-50 border border-amber-200">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Pending</p>
                    <p className="text-xl font-bold text-amber-700 mt-0.5">{totals.drafts}</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-sky-50 border border-sky-200">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-600">Passing</p>
                    <p className="text-xl font-bold text-sky-700 mt-0.5">{totals.passed}</p>
                  </div>
                  <div className="text-center p-2 rounded-md bg-rose-50 border border-rose-200">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600">Failing</p>
                    <p className="text-xl font-bold text-rose-700 mt-0.5">{totals.failing}</p>
                  </div>
                </div>

                {/* Remarks Distribution */}
                {remarkCounts.length > 0 && (
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Remarks Distribution
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {remarkCounts.map(({ remark, count }) => (
                        <span
                          key={`${schedule.id}-${remark}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700"
                        >
                          <span className="capitalize">{remark || "unassigned"}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                            {count}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sample Records Details */}
                {records.length > 0 && (
                  <details className="border-t border-slate-200">
                    <summary className="px-4 py-3 cursor-pointer text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      View sample records ({records.length} total)
                    </summary>
                    <div className="px-4 py-3 bg-slate-50">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-white border-b border-slate-200">
                              <th className="px-3 py-2 text-left font-semibold text-slate-700">Student</th>
                              <th className="px-3 py-2 text-center font-semibold text-slate-700">Midterm</th>
                              <th className="px-3 py-2 text-center font-semibold text-slate-700">Final</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-700">Remarks</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {records.slice(0, 15).map((record, index) => (
                              <tr key={`${schedule.id}-record-${index}`} className="bg-white hover:bg-slate-50">
                                <td className="px-3 py-2 text-slate-700">{record.student_name || record.student || "Unnamed"}</td>
                                <td className="px-3 py-2 text-center font-medium text-slate-900">{record.midterm ?? "—"}</td>
                                <td className="px-3 py-2 text-center font-medium text-slate-900">{record.final ?? record.grade ?? "—"}</td>
                                <td className="px-3 py-2">
                                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                    record.remarks === 'passed' ? 'bg-emerald-100 text-emerald-700' :
                                    record.remarks === 'failed' ? 'bg-rose-100 text-rose-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {record.remarks ?? "—"}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium ${
                                    (record.final_status || record.midterm_status) === 'submitted' ? 'bg-blue-50 text-blue-700' :
                                    'bg-amber-50 text-amber-700'
                                  }`}>
                                    {record.final_status || record.midterm_status || "draft"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </FacultyLayout>
  );
}

const OverviewTile = React.memo(({ label, value, accent }) => {
  return (
    <div 
      className={`rounded-2xl border border-slate-200/70 bg-gradient-to-br px-4 py-3 shadow-sm ${accent}`}
      aria-label={`${label}: ${value}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500/80">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
});

OverviewTile.displayName = 'OverviewTile';

const MetricTile = React.memo(({ label, value, tone }) => {
  const toneMap = useMemo(() => ({
    emerald: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200/70 bg-amber-50 text-amber-700",
    sky: "border-sky-200/70 bg-sky-50 text-sky-700",
    rose: "border-rose-200/70 bg-rose-50 text-rose-700",
  }), []);

  const className = useMemo(() => 
    `rounded-lg border px-3 py-2 text-center ${toneMap[tone] || "border-slate-200/70 bg-slate-50 text-slate-600"}`,
    [tone, toneMap]
  );

  return (
    <div className={className} aria-label={`${label}: ${value}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
});

MetricTile.displayName = 'MetricTile';
