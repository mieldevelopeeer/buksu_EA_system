import React, { useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Users, BookOpen, CalendarDays, Clock, TrendingUp } from 'lucide-react';

const SummaryCard = ({ icon: Icon, label, value, accent }) => (
  <div className={`flex items-center gap-3 rounded-2xl border border-${accent}-100 bg-white px-4 py-3 shadow-sm`}>
    <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${accent}-50 text-${accent}-600`}>
      <Icon size={20} />
    </span>
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  </div>
);

const StatusList = ({ title, items }) => (
  <section className="rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    {items.length === 0 ? (
      <p className="mt-2 text-[11px] text-blue-600">No data available.</p>
    ) : (
      <ul className="mt-2 space-y-2 text-[11px] text-slate-600">
        {items.map((item, index) => (
          <li key={`${item.status}-${index}`} className="flex items-center justify-between">
            <span className="font-medium">{item.status}</span>
            <span>{item.count}</span>
          </li>
        ))}
      </ul>
    )}
  </section>
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

export default function EnrollmentReport() {
  const {
    totals = {},
    statusSummary = [],
    byCourse = [],
    bySchoolYear = [],
    recentEnrollments = [],
  } = usePage().props;

  const summaryItems = useMemo(() => [
    {
      icon: Users,
      label: 'Total Enrollments',
      value: totals.total ?? 0,
      accent: 'blue',
    },
    {
      icon: TrendingUp,
      label: 'Currently Enrolled',
      value: totals.enrolled ?? 0,
      accent: 'emerald',
    },
    {
      icon: Clock,
      label: 'Pending / Processing',
      value: totals.pending ?? 0,
      accent: 'amber',
    },
    {
      icon: CalendarDays,
      label: 'Withdrawn / Dropped',
      value: totals.withdrawn ?? 0,
      accent: 'rose',
    },
  ], [totals]);

  const courseRows = byCourse.map((course) => [
    course.course_code,
    course.course_name,
    course.total,
    course.statusBreakdown
      .map((item) => `${item.status}: ${item.count}`)
      .join(', '),
  ]);

  const schoolYearRows = bySchoolYear.map((entry) => [
    entry.school_year,
    entry.total,
    entry.semesters
      .map((semester) => `${semester.semester}: ${semester.count}`)
      .join(', '),
  ]);

  const recentRows = recentEnrollments.map((entry) => [
    entry.enrolled_at ?? 'N/A',
    entry.student,
    `${entry.course_code} · ${entry.course_name}`,
    entry.major ?? '—',
    `${entry.school_year ?? '—'} / ${entry.semester ?? '—'}`,
    entry.status,
  ]);

  return (
    <AdminLayout>
      <div className="space-y-4 bg-white px-5 py-5 text-[13px] text-slate-800">
        <header className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                Enrollment Report
              </span>
              <h1 className="text-lg font-semibold text-slate-900">Academic Enrollment Overview</h1>
              <p className="text-[11px] text-slate-600">
                Monitor overall enrollment performance, trends per program, and the latest admissions activity.
              </p>
            </div>
            <div className="grid w-full gap-2 text-[10px] sm:w-auto sm:grid-cols-2 lg:grid-cols-4">
              {summaryItems.map((item) => (
                <SummaryCard key={item.label} {...item} />
              ))}
            </div>
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-2">
          <StatusList title="Status Summary" items={statusSummary} />
          <StatusList title="Enrollment by School Year" items={bySchoolYear.map((entry) => ({
            status: entry.school_year,
            count: entry.total,
          }))} />
        </div>

        <TableSection
          title="Enrollments by Course"
          headers={['Course Code', 'Course Name', 'Total', 'Status Breakdown']}
          rows={courseRows}
          emptyMessage="No enrollment records found for the selected period."
        />

        <TableSection
          title="Enrollments by School Year & Semester"
          headers={['School Year', 'Total', 'Semesters']}
          rows={schoolYearRows}
          emptyMessage="School year data is not available."
        />

        <TableSection
          title="Recent Enrollments"
          headers={['Enrolled At', 'Student', 'Program', 'Major', 'AY / Semester', 'Status']}
          rows={recentRows}
          emptyMessage="No recent enrollment activity recorded."
        />
      </div>
    </AdminLayout>
  );
}
