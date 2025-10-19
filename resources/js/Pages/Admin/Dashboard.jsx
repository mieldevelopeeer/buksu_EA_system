import AdminLayout from '../../Layouts/AdminLayout';
import { Bar, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import clsx from 'clsx';

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
      accent: '#1e3a8a',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor">
          <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z" />
          <path d="M3 21v-.2C3 16.914 7.03 14 12 14s9 2.914 9 6.8V21" />
        </svg>
      ),
    },
    {
      title: faculty.toLocaleString(),
      subtitle: 'Active Faculty',
      description: 'Teaching staff across departments',
      accent: '#0f766e',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor">
          <path d="M12 7V3m0 4c3.314 0 6 1.79 6 4s-2.686 4-6 4-6-1.79-6-4 2.686-4 6-4Zm0 8v6" />
          <path d="M7 21h10" />
        </svg>
      ),
    },
    {
      title: registrars.toLocaleString(),
      subtitle: 'Registrars',
      description: 'Registrar profiles with system access',
      accent: '#0ea5e9',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor">
          <path d="M4 4h16v16H4z" />
          <path d="M8 4v16" />
          <path d="M4 9h4" />
        </svg>
      ),
    },
    {
      title: departments.length.toLocaleString(),
      subtitle: 'Departments',
      description: 'Academic units currently tracked',
      accent: '#1e293b',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor">
          <path d="M4 19h16" />
          <path d="M4 5h16v14H4z" />
          <path d="M9 5v14" />
        </svg>
      ),
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
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Overview</p>
              <h1 className="mt-1 text-xl font-semibold text-slate-900">Administrator Dashboard</h1>
              <p className="mt-1 text-xs text-slate-500">Welcome back, {adminName}.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Active School Year</span>
              <span className="rounded-full bg-[#1e3a8a] px-3 py-1 text-white">
                {activeSchoolYear ?? 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCard key={card.subtitle} {...card} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-transform duration-150 hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1e3a8a]">Year Level Distribution</h2>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Current SY</span>
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
                      ticks: { color: '#475569', font: { family: 'Inter', size: 11 } },
                    },
                    y: {
                      grid: { color: '#e2e8f0' },
                      ticks: { color: '#475569', font: { family: 'Inter', size: 11 } },
                      beginAtZero: true,
                    },
                  },
                }}
                height={220}
              />
            </div>
          </div>

          <div className="xl:col-span-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-transform duration-150 hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1e3a8a]">Enrollment Status Overview</h2>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Live</span>
            </div>
            <div className="mt-5">
              {Object.keys(statusBreakdown).length === 0 ? (
                <p className="text-sm text-slate-500">No enrollment data available.</p>
              ) : (
                <Bar
                  data={statusChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', color: '#1e293b' } },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { color: '#475569', font: { family: 'Inter' } },
                      },
                      y: {
                        grid: { color: '#e2e8f0' },
                        ticks: { color: '#64748b', font: { family: 'Inter' } },
                      },
                    },
                  }}
                  height={260}
                />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-transform duration-150 hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1e3a8a]">Student Gender Split</h2>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Diversity</span>
            </div>
            <div className="mt-4">
              <Doughnut
                data={genderChart}
                options={{
                  plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', color: '#1e293b' } },
                  },
                  cutout: '68%',
                }}
              />
            </div>
            <div className="mt-5 space-y-2 text-sm text-slate-600">
              <StatLine label="Male" value={genderBreakdown?.male ?? 0} color="bg-[#1e3a8a]" />
              <StatLine label="Female" value={genderBreakdown?.female ?? 0} color="bg-[#0f766e]" />
              <StatLine label="Other" value={genderBreakdown?.other ?? 0} color="bg-[#0ea5e9]" />
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1e3a8a]">Department Overview</h2>
              <p className="text-sm text-slate-500">Staffing and enrollment snapshot by course.</p>
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Updated realtime</span>
          </div>

          <div className="mt-5 space-y-4">
            {departments.length === 0 ? (
              <p className="text-sm text-slate-500">No department data available.</p>
            ) : (
              departments.map((dept) => (
                <div key={dept.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-transform duration-150 hover:-translate-y-1 hover:shadow-md">
                  <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-[#1e3a8a]">{dept.name}</h3>
                      <p className="text-xs text-slate-500">{dept.courses.length} course(s)</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1">
                        Faculty <strong className="ml-1 text-[#1e3a8a]">{dept.faculty_count}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1">
                        Registrar <strong className="ml-1 text-[#1e3a8a]">{dept.registrar_count}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1">
                        Students <strong className="ml-1 text-[#1e3a8a]">{dept.student_total}</strong>
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <GenderPill label="Male" color="bg-[#1e3a8a]" value={dept.gender_breakdown?.male ?? 0} />
                      <GenderPill label="Female" color="bg-[#0f766e]" value={dept.gender_breakdown?.female ?? 0} />
                      <GenderPill label="Other" color="bg-[#0ea5e9]" value={dept.gender_breakdown?.other ?? 0} />
                    </div>
                  </header>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {dept.courses.map((course) => (
                      <div key={course.id} className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm font-medium text-[#1e3a8a]">{course.code || course.name}</p>
                        {course.code && (
                          <p className="text-xs uppercase tracking-wide text-slate-400">{course.name}</p>
                        )}
                        <div className="mt-2 text-xs text-slate-500">
                          Students <span className="font-semibold text-[#0f766e]">{course.student_count}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-slate-600">
                          <GenderPill label="M" color="bg-[#1e3a8a]" value={course.gender_breakdown?.male ?? 0} compact />
                          <GenderPill label="F" color="bg-[#0f766e]" value={course.gender_breakdown?.female ?? 0} compact />
                          <GenderPill label="O" color="bg-[#0ea5e9]" value={course.gender_breakdown?.other ?? 0} compact />
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

function SummaryCard({ title, subtitle, description, accent, icon }) {
  return (
    <div
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[#1e3a8a]">
          {icon}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-400">{subtitle}</p>
          <h3 className="text-xl font-semibold text-[#1e3a8a]">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function StatLine({ label, value, color }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2">
      <div className="flex items-center gap-3">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-[#1e3a8a]">{value.toLocaleString()}</span>
    </div>
  );
}

function YearStatCard({ label, value, gradient = 'from-slate-200 via-white to-slate-100', accent = '#1e3a8a' }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-transform duration-150 hover:-translate-y-1 hover:shadow-md"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-[#1e293b]">{value}</p>
          <p className="text-xs text-slate-500">Students currently at this level</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg" style={{ border: `1px solid ${accent}` }}>
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
        'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white font-medium text-[#1e293b]',
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      )}
    >
      <span className={clsx('h-2 w-2 rounded-full', color)} />
      {label}: {value}
    </span>
  );
}
