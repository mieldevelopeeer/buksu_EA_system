import React, { useMemo, useState } from "react";
import { Head } from "@inertiajs/react";
import FacultyLayout from "@/Layouts/FacultyLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const normalizeGrade = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatAverage = (value) => (value === null || value === undefined ? "—" : value.toFixed(2));

export default function FacultyGradeReport({
  schedules = [],
  gradeSummaries = [],
  activeSemester = null,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [remarkFilter, setRemarkFilter] = useState("all");

  const scheduleIndex = useMemo(() => {
    const map = new Map();
    if (Array.isArray(schedules)) {
      schedules.forEach((schedule) => {
        const subject = schedule.curriculum_subject?.subject ?? schedule.subject ?? {};
        const course = schedule.curriculum_subject?.course ?? schedule.course ?? {};
        const section = schedule.section ?? {};

        map.set(schedule.id, {
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
        });
      });
    }
    return map;
  }, [schedules]);

  const groupedGrades = useMemo(() => {
    const groups = new Map();

    const hydrateGroup = (scheduleId) => {
      if (groups.has(scheduleId)) return groups.get(scheduleId);
      const scheduleMeta = scheduleIndex.get(scheduleId);
      const fallback = scheduleMeta || {
        id: scheduleId,
        subjectName: "Unknown Subject",
        subjectCode: "",
        sectionLabel: "Section",
        courseLabel: "Course",
        scheduleLabel: "—",
        timeLabel: "—",
        studentCount: null,
      };

      const template = {
        schedule: fallback,
        records: [],
        totals: {
          submitted: 0,
          drafts: 0,
          failing: 0,
          passed: 0,
        },
        remarkCounts: new Map(),
        gradeSum: 0,
        gradeCount: 0,
      };
      groups.set(scheduleId, template);
      return template;
    };

    if (Array.isArray(gradeSummaries)) {
      gradeSummaries.forEach((record) => {
        const scheduleId = record.class_schedule_id ?? record.schedule_id ?? record.classScheduleId;
        if (!scheduleId) return;

        const group = hydrateGroup(scheduleId);
        group.records.push(record);

        const remarks = (record.remarks || record.status || "").toLowerCase();
        group.remarkCounts.set(remarks, (group.remarkCounts.get(remarks) ?? 0) + 1);

        if ((record.final_status || record.midterm_status || "").toLowerCase() === "submitted") {
          group.totals.submitted += 1;
        } else {
          group.totals.drafts += 1;
        }

        if (remarks.includes("fail")) group.totals.failing += 1;
        if (remarks.includes("pass")) group.totals.passed += 1;

        const gradeValue = normalizeGrade(record.final ?? record.grade ?? record.midterm);
        if (gradeValue !== null) {
          group.gradeSum += gradeValue;
          group.gradeCount += 1;
        }
      });
    }

    return Array.from(groups.values()).map((group) => {
      const average = group.gradeCount > 0 ? group.gradeSum / group.gradeCount : null;
      return {
        ...group,
        average,
        remarkCounts: Array.from(group.remarkCounts.entries()).map(([key, count]) => ({
          remark: key,
          count,
        })),
      };
    });
  }, [gradeSummaries, scheduleIndex]);

  const sectionOptions = useMemo(() => {
    const set = new Set(["all"]);
    scheduleIndex.forEach((meta) => {
      if (meta.sectionLabel) set.add(meta.sectionLabel);
    });
    return Array.from(set);
  }, [scheduleIndex]);

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
        "Students": (schedule.studentCount ?? "—"),
        "Submitted": totals.submitted,
        "Draft": totals.drafts,
        "Failing": totals.failing,
        "Passed": totals.passed,
        "Average": average !== null ? average.toFixed(2) : "—",
      })),
    [filteredGroups]
  );

  const exportPDF = () => {
    if (!exportRows.length) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    doc.text("Faculty Grade Report", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Subject", "Section", "Course", "Schedule", "Students", "Submitted", "Draft", "Failing", "Passed", "Average"]],
      body: exportRows.map((row) => [
        row.Subject,
        row.Section,
        row.Course,
        row.Schedule,
        row["Students"],
        row.Submitted,
        row.Draft,
        row.Failing,
        row.Passed,
        row.Average,
      ]),
      styles: { fontSize: 9 },
    });
    doc.save("faculty-grade-report.pdf");
  };

  const exportExcel = () => {
    if (!exportRows.length) return;
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Grades");
    XLSX.writeFile(workbook, "faculty-grade-report.xlsx");
  };

  return (
    <FacultyLayout>
      <Head title="Grade Reports" />
      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 text-[13px] text-slate-600">
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Grade Reports</p>
            <h1 className="text-xl font-semibold text-slate-900">Submission Overview</h1>
            <p className="text-[12px] text-slate-500">Track grade progress across your assigned schedules.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportPDF}
              disabled={!exportRows.length}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={exportExcel}
              disabled={!exportRows.length}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export Excel
            </button>
          </div>
        </section>

        {activeSemester && (
          <section className="grid gap-2 rounded-2xl border border-slate-200/60 bg-slate-50 px-5 py-4 text-[12px] text-slate-600 sm:grid-cols-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Semester</span>
              <p className="text-sm font-semibold text-slate-800">{activeSemester.semester ?? "—"}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">School Year</span>
              <p className="text-sm font-semibold text-slate-800">{activeSemester.school_year ?? "—"}</p>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200/70 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search subject or course"
                className="w-full rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 shadow-sm focus:border-sky-300 focus:outline-none sm:w-64"
              />
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
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="pending">Pending</option>
                <option value="failing">Failing</option>
              </select>
              <select
                value={remarkFilter}
                onChange={(event) => setRemarkFilter(event.target.value)}
                className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none"
              >
                {remarkOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All Remarks" : option}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-slate-400">
              {filteredGroups.length} schedule{filteredGroups.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <OverviewTile
              label="Submitted Grades"
              value={overviewTotals.submitted}
              accent="from-emerald-50 via-white to-emerald-100/60"
            />
            <OverviewTile
              label="Pending Grades"
              value={overviewTotals.drafts}
              accent="from-amber-50 via-white to-amber-100/60"
            />
            <OverviewTile
              label="Passing Records"
              value={overviewTotals.passed}
              accent="from-sky-50 via-white to-sky-100/60"
            />
            <OverviewTile
              label="Failing Records"
              value={overviewTotals.failing}
              accent="from-rose-50 via-white to-rose-100/60"
            />
          </div>
        </section>

        <section className="space-y-3">
          {filteredGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[12px] text-slate-500">
              No grade data matches your current filters.
            </div>
          ) : (
            filteredGroups.map(({ schedule, totals, average, remarkCounts, records }) => (
              <article
                key={schedule.id}
                className="rounded-xl border border-slate-200/70 bg-white px-4 py-4 shadow-sm"
              >
                <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      {schedule.subjectCode ? `${schedule.subjectCode} · ` : ""}
                      {schedule.subjectName}
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {schedule.courseLabel} • {schedule.sectionLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 font-semibold">
                      {schedule.scheduleLabel} • {schedule.timeLabel}
                    </span>
                    {typeof schedule.studentCount === "number" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 font-semibold">
                        {schedule.studentCount} student{schedule.studentCount === 1 ? "" : "s"}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 font-semibold">
                      Avg: {formatAverage(average)}
                    </span>
                  </div>
                </header>

                <div className="mt-3 grid gap-2 text-[12px] text-slate-600 sm:grid-cols-4">
                  <MetricTile label="Submitted" value={totals.submitted} tone="emerald" />
                  <MetricTile label="Pending" value={totals.drafts} tone="amber" />
                  <MetricTile label="Passing" value={totals.passed} tone="sky" />
                  <MetricTile label="Failing" value={totals.failing} tone="rose" />
                </div>

                {remarkCounts.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Remarks Distribution
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                      {remarkCounts.map(({ remark, count }) => (
                        <span
                          key={`${schedule.id}-${remark}`}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1"
                        >
                          <span className="font-semibold text-slate-700">{remark || "unassigned"}</span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            {count}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {records.length > 0 && (
                  <details className="mt-3 rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2 text-[11px]">
                    <summary className="cursor-pointer font-semibold text-slate-600">
                      View sample records
                    </summary>
                    <div className="mt-2 max-h-52 overflow-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="sticky top-0 bg-white text-slate-400">
                          <tr>
                            <th className="px-2 py-1">Student</th>
                            <th className="px-2 py-1 text-center">Midterm</th>
                            <th className="px-2 py-1 text-center">Final</th>
                            <th className="px-2 py-1">Remarks</th>
                            <th className="px-2 py-1">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {records.slice(0, 15).map((record, index) => (
                            <tr key={`${schedule.id}-record-${index}`}>
                              <td className="px-2 py-1">{record.student_name || record.student || "Unnamed"}</td>
                              <td className="px-2 py-1 text-center">{record.midterm ?? "—"}</td>
                              <td className="px-2 py-1 text-center">{record.final ?? record.grade ?? "—"}</td>
                              <td className="px-2 py-1">{record.remarks ?? "—"}</td>
                              <td className="px-2 py-1">{record.final_status || record.midterm_status || "draft"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </article>
            ))
          )}
        </section>
      </div>
    </FacultyLayout>
  );
}

function OverviewTile({ label, value, accent }) {
  return (
    <div className={`rounded-2xl border border-slate-200/70 bg-gradient-to-br px-4 py-3 shadow-sm ${accent}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500/80">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MetricTile({ label, value, tone }) {
  const toneMap = {
    emerald: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200/70 bg-amber-50 text-amber-700",
    sky: "border-sky-200/70 bg-sky-50 text-sky-700",
    rose: "border-rose-200/70 bg-rose-50 text-rose-700",
  };

  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${toneMap[tone] || "border-slate-200/70 bg-slate-50 text-slate-600"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function formatScheduleTime(start, end) {
  if (!start || !end) return "—";
  const startLabel = dayjs(`1970-01-01T${start}`).isValid()
    ? dayjs(`1970-01-01T${start}`).format("h:mm A")
    : start;
  const endLabel = dayjs(`1970-01-01T${end}`).isValid()
    ? dayjs(`1970-01-01T${end}`).format("h:mm A")
    : end;
  return `${startLabel} - ${endLabel}`;
}
