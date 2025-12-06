import AdminLayout from '../../Layouts/AdminLayout';
import { Bar, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import clsx from 'clsx';
import { Users, BookOpen, IdentificationBadge, Bank } from 'phosphor-react';

export default function Dashboard({
  totals = {},
  genderBreakdown = {},
  departments = [],
  statusBreakdown = {},
  activeSchoolYear = null,
  studentsPerYear = {},
  adminName = 'Admin',
}) {
  const { students = 0, faculty = 0, registrars = 0 } = totals;
  const orderedYearLevels = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];
  const palette = ['#1e3a8a', '#0f766e', '#0ea5e9'];
  const summaryCards = [
    {
      title: students.toLocaleString(),
      subtitle: 'Total Students',
      description: 'All enrolled student accounts',
      accent: 'from-blue-500 to-blue-600',
      icon: <Users size={24} weight="fill" />,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-900',
    },
    {
      title: faculty.toLocaleString(),
      subtitle: 'Active Faculty',
      description: 'Teaching staff across departments',
      accent: 'from-teal-500 to-teal-600',
      icon: <BookOpen size={24} weight="fill" />,
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-900',
    },
    {
      title: registrars.toLocaleString(),
      subtitle: 'Registrars',
      description: 'Registrar profiles with system access',
      accent: 'from-cyan-500 to-cyan-600',
      icon: <IdentificationBadge size={24} weight="fill" />,
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-900',
    },
    {
      title: departments.length.toLocaleString(),
      subtitle: 'Departments',
      description: 'Academic units currently tracked',
      accent: 'from-slate-500 to-slate-600',
      icon: <Bank size={24} weight="fill" />,
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-900',
    },
  ];

  const yearLevelStyles = {
    'First Year': { gradient: 'from-[#1e3a8a] via-[#1d4ed8] to-[#0ea5e9]', accent: '#1e3a8a' },
    'Second Year': { gradient: 'from-[#0f766e] via-[#14b8a6] to-[#0ea5e9]', accent: '#0f766e' },
    'Third Year': { gradient: 'from-[#0ea5e9] via-[#38bdf8] to-[#1e3a8a]', accent: '#0ea5e9' },
    'Fourth Year': { gradient: 'from-[#1e293b] via-[#1e3a8a] to-[#0f766e]', accent: '#1e293b' },
  };

  const genderChart = {
    labels: ['Male', 'Female', 'Other'],
    datasets: [
      {
        data: [
          genderBreakdown?.male ?? 0,
          genderBreakdown?.female ?? 0,
          genderBreakdown?.other ?? 0,
        ],
        backgroundColor: palette,
      },
    ],
  };

  const statusChart = {
    labels: Object.keys(statusBreakdown),

    datasets: [
      {
        label: 'Enrollments',
        data: Object.values(statusBreakdown),
        backgroundColor: Object.keys(statusBreakdown).map((_, index) => palette[index % palette.length]),
      },
    ],
  };

  const yearLevelChart = {
    labels: orderedYearLevels,
    datasets: [
      {
        label: 'Students',
        data: orderedYearLevels.map((label) => studentsPerYear?.[label] ?? 0),
        backgroundColor: orderedYearLevels.map((_, idx) => palette[idx % palette.length]),
        borderRadius: 6,
        maxBarThickness: 24,
      },
    ],
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="rounded-xl bg-gradient-to-r from-blue-900/70 via-blue-800/70 to-blue-900/70 backdrop-blur-sm px-6 py-4 text-white shadow-lg border border-blue-700/30">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Administrator Dashboard</h1>
              <p className="mt-1 text-sm text-blue-200">Welcome back, {adminName}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 backdrop-blur-sm">
                <p className="text-[9px] uppercase tracking-[0.2em] text-blue-200">Active School Year</p>
                <p className="font-semibold text-white text-sm">{activeSchoolYear || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCard key={card.subtitle} {...card} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Year Level Distribution</h2>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Current</span>
            </div>
            <div className="mt-4">
              <Bar
                data={yearLevelChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { color: '#64748b', font: { family: 'Poppins', size: 11, weight: '500' } },
                    },
                    y: {
                      grid: { color: '#f1f5f9', drawBorder: false },
                      ticks: { color: '#64748b', font: { family: 'Poppins', size: 11 } },
                      beginAtZero: true,
                    },
                  },
                }}
                height={240}
              />
            </div>
          </div>

          <div className="xl:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {orderedYearLevels.map((label) => (
              <YearStatCard
                key={label}
                label={label}
                value={(studentsPerYear?.[label] ?? 0).toLocaleString()}
                gradient={yearLevelStyles[label]?.gradient}
                accent={yearLevelStyles[label]?.accent}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Enrollment Status Overview</h2>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Live</span>
            </div>
            <div className="mt-5">
              {Object.keys(statusBreakdown).length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No enrollment data available.</p>
              ) : (
                <Bar
                  data={statusChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', color: '#1e293b', font: { family: 'Poppins', size: 11 } } },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { family: 'Poppins', size: 11 } },
                      },
                      y: {
                        grid: { color: '#f1f5f9', drawBorder: false },
                        ticks: { color: '#64748b', font: { family: 'Poppins', size: 11 } },
                      },
                    },
                  }}
                  height={280}
                />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Student Gender Split</h2>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Diversity</span>
            </div>
            <div className="mt-4">
              <Doughnut
                data={genderChart}
                options={{
                  plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', color: '#1e293b', font: { family: 'Poppins', size: 11 } } },
                  },
                  cutout: '68%',
                }}
              />
            </div>
            <div className="mt-5 space-y-2 text-sm">
              <StatLine label="Male" value={genderBreakdown?.male ?? 0} color="bg-blue-500" />
              <StatLine label="Female" value={genderBreakdown?.female ?? 0} color="bg-teal-500" />
              <StatLine label="Other" value={genderBreakdown?.other ?? 0} color="bg-cyan-500" />
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Department Overview</h2>
              <p className="mt-1 text-sm text-slate-600">Staffing and enrollment snapshot by course.</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Updated realtime</span>
          </div>

          <div className="mt-6 space-y-4">
            {departments.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No department data available.</p>
            ) : (
              departments.map((dept) => (
                <div key={dept.id} className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 transition-all duration-200 hover:shadow-md">
                  <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{dept.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{dept.courses.length} course(s)</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-900">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        Faculty: {dept.faculty_count}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 font-semibold text-teal-900">
                        <span className="h-2 w-2 rounded-full bg-teal-500" />
                        Registrar: {dept.registrar_count}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 font-semibold text-cyan-900">
                        <span className="h-2 w-2 rounded-full bg-cyan-500" />
                        Students: {dept.student_total}
                      </span>
                    </div>
                  </header>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {dept.courses.map((course) => (
                      <div key={course.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 transition-all duration-200 hover:shadow-sm">
                        <p className="font-semibold text-slate-900">{course.code || course.name}</p>
                        {course.code && (
                          <p className="text-xs uppercase tracking-wide text-slate-400 mt-1">{course.name}</p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-slate-600">Students</span>
                          <span className="font-bold text-slate-900">{course.student_count}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <GenderPill label="M" color="bg-blue-500" value={course.gender_breakdown?.male ?? 0} compact />
                          <GenderPill label="F" color="bg-teal-500" value={course.gender_breakdown?.female ?? 0} compact />
                          <GenderPill label="O" color="bg-cyan-500" value={course.gender_breakdown?.other ?? 0} compact />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ title, subtitle, description, accent, icon, bgColor, textColor }) {
  return (
    <div className="group rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.25em] font-semibold text-slate-400">{subtitle}</p>
          <h3 className={`mt-2 text-3xl font-bold ${textColor}`}>{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function StatLine({ label, value, color }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-3 py-2 bg-slate-50">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <span className="text-sm font-bold text-slate-900">{value.toLocaleString()}</span>
    </div>
  );
}

function YearStatCard({ label, value, gradient = 'from-slate-200 via-white to-slate-100', accent = '#1e3a8a' }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`} />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500 mt-1">Students at this level</p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg" style={{ border: `2px solid ${accent}` }}>
          <YearIcon accent={accent} />
        </div>
      </div>
    </div>
  );
}

function YearIcon({ accent }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke={accent} strokeWidth="1.5" />
      <path d="M12 7V12L15 14" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GenderPill({ label, value, color, compact = false }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold',
        compact 
          ? 'px-2 py-1 text-[10px] border-slate-200 bg-slate-50 text-slate-700' 
          : 'px-3 py-1.5 text-xs border-slate-200 bg-white text-slate-900'
      )}
    >
      <span className={clsx('h-2 w-2 rounded-full', color)} />
      {label}: {value}
    </span>
  );
}
