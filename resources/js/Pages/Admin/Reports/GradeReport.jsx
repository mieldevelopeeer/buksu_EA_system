import React, { useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { BarChart3, ClipboardCheck, BookOpen, TrendingDown, TrendingUp } from 'lucide-react';

const SummaryCard = ({ icon: Icon, label, value, accent }) => (
  <div className={`flex items-center gap-3 rounded-2xl border border-${accent}-100 bg-white px-4 py-3 shadow-sm`}>
    <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${accent}-50 text-${accent}-600`}>
      <Icon size={20} />
    </span>
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value ?? 'N/A'}</p>
    </div>
  </div>
);

const TableSection = ({ title, headers, rows, emptyMessage }) => (
  <section className="rounded-2xl border border-blue-100 bg-white shadow-sm">
    <header className="border-b border-blue-50 px-4 py-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    </header>
    <div className="overflow-x-auto px-4 py-3">
      {rows.length === 0 ? (
        <p className="text-[11px] text-blue-600">{emptyMessage}</p>
      ) : (
        <table className="min-w-full divide-y divide-blue-50 text-[11px]">
          <thead>
            <tr className="text-left text-slate-500">
              {headers.map((header) => (
                <th key={header} className="px-2 py-2 font-semibold uppercase tracking-wide">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50 text-slate-700">
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-2 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </section>
);

export default function GradeReport() {
  const {
    totals = {},
    statusSummary = [],
    byCourse = [],
    bySchoolYear = [],
    recentGrades = [],
  } = usePage().props;

  const summaryItems = useMemo(() => [
    {
      icon: ClipboardCheck,
      label: 'Total Grade Records',
      value: totals.records ?? 0,
      accent: 'blue',
    },
    {
      icon: BookOpen,
      label: 'With Numeric Grades',
      value: totals.withGrades ?? 0,
      accent: 'emerald',
    },
    {
      icon: BarChart3,
      label: 'Average Grade',
      value: totals.average ?? 'N/A',
      accent: 'sky',
    },
  ], [totals]);

  const statusRows = statusSummary.map((item) => [item.status, item.count]);

  const courseRows = byCourse.map((entry) => [
    entry.course_code,
    entry.course_name,
    entry.records,
    entry.average ?? 'N/A',
    entry.statusBreakdown.map((status) => `${status.status}: ${status.count}`).join(', '),
  ]);

  const schoolYearRows = bySchoolYear.map((entry) => [
    entry.school_year,
    entry.records,
    entry.average ?? 'N/A',
  ]);

  const recentRows = recentGrades.map((entry) => [
    entry.recorded_at ?? 'N/A',
    entry.student,
    `${entry.course_code} · ${entry.course_name}`,
    entry.grade ?? 'N/A',
    entry.status,
    entry.remarks ?? '—',
  ]);

  return (
    <AdminLayout>
      <div className="space-y-4 bg-white px-5 py-5 text-[13px] text-slate-800">
        <header className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                Grade Report
              </span>
              <h1 className="text-lg font-semibold text-slate-900">Academic Performance Summary</h1>
              <p className="text-[11px] text-slate-600">
                Review overall grading outcomes, averages per program, and the most recent submissions.
              </p>
            </div>
            <div className="grid w-full gap-2 text-[10px] sm:w-auto sm:grid-cols-3">
              {summaryItems.map((item) => (
                <SummaryCard key={item.label} {...item} />
              ))}
            </div>
          </div>
        </header>

        <TableSection
          title="Grade Status Overview"
          headers={['Status', 'Count']}
          rows={statusRows}
          emptyMessage="No grade status data available."
        />

        <TableSection
          title="Grades by Course"
          headers={['Course Code', 'Course Name', 'Records', 'Average Grade', 'Status Breakdown']}
          rows={courseRows}
          emptyMessage="No grade data recorded by course."
        />

        <TableSection
          title="Grades by School Year"
          headers={['School Year', 'Records', 'Average Grade']}
          rows={schoolYearRows}
          emptyMessage="No grade data recorded by school year."
        />

        <TableSection
          title="Recent Grade Submissions"
          headers={['Recorded At', 'Student', 'Program', 'Grade', 'Status', 'Remarks']}
          rows={recentRows}
          emptyMessage="No recent grade submissions found."
        />
      </div>
    </AdminLayout>
  );
}
