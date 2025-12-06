import ProgramHeadLayout from '@/Layouts/ProgramHeadLayout';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import {
  GraduationCap,
  ChalkboardTeacher,
  CheckSquareOffset,
  FileDoc,
  UsersThree,
  UserPlus
} from 'phosphor-react';

export default function ProgramHeadDashboard({
  auth,
  stats = {},
  genderBreakdown = {},
  statusBreakdown = {},
  recentEnrollments = [],
  department = {},
  academicYear = null,
}) {
  const lastAcademicYearRef = useRef(academicYear?.id);

  // Auto-refresh logic based on semester and school year dates
  useEffect(() => {
    if (!academicYear?.id || !academicYear?.startDate || !academicYear?.endDate) {
      return;
    }

    // Store the initial academic year ID
    if (lastAcademicYearRef.current === undefined) {
      lastAcademicYearRef.current = academicYear.id;
    }

    // Check if academic year has changed
    if (lastAcademicYearRef.current !== academicYear.id) {
      console.log('Academic year changed, refreshing dashboard...');
      window.location.reload();
      return;
    }

    const checkSemesterChange = () => {
      const now = new Date();
      const startDate = new Date(academicYear.startDate);
      const endDate = new Date(academicYear.endDate);

      // Check if current date is within the academic year range
      if (now < startDate || now > endDate) {
        console.log('Outside academic year range, refreshing dashboard...');
        window.location.reload();
        return;
      }
    };

    // Check immediately
    checkSemesterChange();

    // Set up interval to check every hour
    const refreshInterval = setInterval(checkSemesterChange, 3600000); // 1 hour

    // Also check when page becomes visible (user returns from another tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSemesterChange();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [academicYear]);

  // Update the ref when academic year changes
  useEffect(() => {
    lastAcademicYearRef.current = academicYear?.id;
  }, [academicYear?.id]);
  const {
    totalStudents = 0,
    enrolledStudents = 0,
    pendingEnrollments = 0,
    coursesOffered = 0,
    facultyCount = 0,
  } = stats;

  const {
    male = 0,
    female = 0,
    other = 0,
  } = genderBreakdown;

  const genderTotal = male + female + other;

  const summaryCards = [
    { icon: <GraduationCap size={28} />, label: 'Total Students', value: totalStudents.toLocaleString() },
    { icon: <UserPlus size={28} />, label: 'Enrolled Students', value: enrolledStudents.toLocaleString() },
    { icon: <CheckSquareOffset size={28} />, label: 'Pending Enrollments', value: pendingEnrollments.toLocaleString() },
    { icon: <ChalkboardTeacher size={28} />, label: 'Faculty', value: facultyCount.toLocaleString() },
  ];

  const statusEntries = Object.entries(statusBreakdown).map(([key, value]) => ({
    status: key,
    count: value,
  }));
  const statusTotal = statusEntries.reduce((sum, item) => sum + item.count, 0);

  return (
    <ProgramHeadLayout>
      <Head title="Dashboard" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, Program Head</h1>
          <p className="text-sm text-gray-600 mt-1">
            {department?.name ? `Department: ${department.name}` : 'Keep track of your program performance at a glance.'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <SummaryCard icon={<GraduationCap size={28} />} label="Total Students" value={totalStudents.toLocaleString()} accent="from-blue-100 to-blue-200" />
        <SummaryCard icon={<UserPlus size={28} />} label="Enrolled Students" value={enrolledStudents.toLocaleString()} accent="from-emerald-100 to-emerald-200" />
        <SummaryCard icon={<CheckSquareOffset size={28} />} label="Pending Enrollments" value={pendingEnrollments.toLocaleString()} accent="from-amber-100 to-amber-200" />
        <SummaryCard icon={<ChalkboardTeacher size={28} />} label="Faculty" value={facultyCount.toLocaleString()} accent="from-rose-100 to-rose-200" />
      </div>

      {/* Faculty & Gender Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Faculty Overview */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-5">Faculty & Courses</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <span className="text-gray-600">Total Faculty</span>
              <span className="text-2xl font-bold text-indigo-600">{facultyCount}</span>
            </div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <span className="text-gray-600">Total Courses</span>
              <span className="text-2xl font-bold text-purple-600">{coursesOffered}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Avg. Students/Faculty</span>
              <span className="text-2xl font-bold text-blue-600">{facultyCount > 0 ? Math.round(enrolledStudents / facultyCount) : 0}</span>
            </div>
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-5">Gender Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Male</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-600">{male}</span>
                <span className="text-xs font-semibold text-gray-500">({genderTotal > 0 ? ((male / genderTotal) * 100).toFixed(1) : 0}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <span className="text-gray-600">Female</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-pink-600">{female}</span>
                <span className="text-xs font-semibold text-gray-500">({genderTotal > 0 ? ((female / genderTotal) * 100).toFixed(1) : 0}%)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Other</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-purple-600">{other}</span>
                <span className="text-xs font-semibold text-gray-500">({genderTotal > 0 ? ((other / genderTotal) * 100).toFixed(1) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment Details Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Enrollment Overview</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enrollment Status Breakdown */}
          <div className="lg:col-span-1 bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-5">Status Breakdown</h3>
            {statusEntries.length === 0 ? (
              <p className="text-sm text-gray-500">No enrollment data available.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Total</span>
                  <span className="font-bold text-gray-900">{statusTotal.toLocaleString()}</span>
                </div>
                {statusEntries.map((item) => {
                  const percent = statusTotal > 0 ? (item.count / statusTotal) * 100 : 0;
                  return (
                    <div key={item.status}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{formatStatusLabel(item.status)}</span>
                        <span className={`text-sm font-bold ${statusPercentageColor(item.status)}`}>{percent.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${statusColorClass(item.status)}`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gender Distribution Cards */}
          <div className="lg:col-span-2 bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-5">Gender Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GenderCard label="Male" value={male} percentage={genderTotal ? (male / genderTotal) * 100 : 0} />
              <GenderCard label="Female" value={female} percentage={genderTotal ? (female / genderTotal) * 100 : 0} />
              <GenderCard label="Others" value={other} percentage={genderTotal ? (other / genderTotal) * 100 : 0} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Enrollments & Courses Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Courses Offered */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900">Courses</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
              <UsersThree size={14} /> {coursesOffered}
            </span>
          </div>
          <div className="space-y-4">
            <div className="pb-4 border-b border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Enrolled</p>
              <p className="text-2xl font-bold text-emerald-600">{enrolledStudents.toLocaleString()}</p>
            </div>
            <div className="pb-4 border-b border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{pendingEnrollments.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">School Year</p>
              <p className="text-lg font-bold text-gray-900">{stats?.activeSchoolYear ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Recent Enrollments */}
        <div className="lg:col-span-2 bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <FileDoc size={20} className="text-indigo-600" /> Recent Enrollments
          </h3>
          {recentEnrollments.length === 0 ? (
            <p className="text-sm text-gray-500">No enrollments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentEnrollments.map((item) => (
                <div key={item.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3 hover:bg-gray-50 transition">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{item.student}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{item.course}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                      {item.status}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProgramHeadLayout>
  );
}

function SummaryCard({ icon, label, value, accent }) {
  return (
    <div className={`bg-gradient-to-br ${accent} shadow-sm rounded-2xl border border-slate-200/60 p-4 flex items-center gap-4 transition hover:shadow-lg`}>
      <div className="bg-white/60 text-slate-700 p-3 rounded-lg flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-600 font-medium">{label}</div>
      </div>
    </div>
  );
}

function GenderCard({ label, value, percentage }) {
  return (
    <div className="border border-gray-100 rounded-lg p-4 bg-slate-50/60">
      <p className="text-sm font-semibold text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value.toLocaleString()}</p>
      <div className="mt-3">
        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500"
            style={{ width: `${Math.min(100, Math.round(percentage))}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">{percentage.toFixed(1)}% of total students</p>
      </div>
    </div>
  );
}

function formatStatusLabel(status) {
  if (!status) return 'Unknown';
  const normalized = status.toString().replace(/_/g, ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function statusColorClass(status) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'enrolled') return 'bg-emerald-500';
  if (normalized === 'pending') return 'bg-amber-500';
  if (normalized === 'dropped' || normalized === 'rejected') return 'bg-rose-500';
  if (normalized === 'evaluated') return 'bg-indigo-500';
  return 'bg-slate-400';
}

function statusPercentageColor(status) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'enrolled') return 'text-emerald-600';
  if (normalized === 'pending') return 'text-amber-600';
  if (normalized === 'dropped' || normalized === 'rejected') return 'text-rose-600';
  if (normalized === 'evaluated') return 'text-indigo-600';
  return 'text-slate-600';
}

function StatisticCard({ title, value, percentage, color, textColor }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-lg p-5 border border-slate-200/60 shadow-sm`}>
      <p className="text-sm font-semibold text-gray-600 mb-3">{title}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className={`text-4xl font-bold ${textColor}`}>{value}</p>
          <p className={`text-sm font-semibold mt-2 ${textColor}`}>{percentage}%</p>
        </div>
      </div>
      <div className="mt-4 h-2 w-full rounded-full bg-white/50 overflow-hidden">
        <div
          className={`h-full rounded-full ${textColor.replace('text-', 'bg-')}`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}
