import ProgramHeadLayout from '@/Layouts/ProgramHeadLayout';
import { Head } from '@inertiajs/react';
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
}) {
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

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome, Program Head!</h1>
          <p className="text-sm text-gray-500">
            {department?.name ? `Department: ${department.name}` : 'Keep track of your program performance at a glance.'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} icon={card.icon} label={card.label} value={card.value} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow rounded p-4 xl:col-span-2">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Gender Distribution</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GenderCard label="Male" value={male} percentage={genderTotal ? (male / genderTotal) * 100 : 0} />
            <GenderCard label="Female" value={female} percentage={genderTotal ? (female / genderTotal) * 100 : 0} />
            <GenderCard label="Others" value={other} percentage={genderTotal ? (other / genderTotal) * 100 : 0} />
          </div>
        </div>

        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-700">Courses Offered</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
              <UsersThree size={14} /> {coursesOffered}
            </span>
          </div>
          <p className="text-sm text-gray-500">Active course offerings under your department.</p>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>Enrolled students</span>
            <span className="font-semibold text-gray-800">{enrolledStudents.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
            <span>Pending enrollment requests</span>
            <span className="font-semibold text-gray-800">{pendingEnrollments.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Enrollment Status Overview</h2>
          {statusEntries.length === 0 ? (
            <p className="text-sm text-gray-500">No enrollment data available.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
                <span>Total</span>
                <span className="font-semibold text-gray-700">{statusTotal.toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                {statusEntries.map((item) => {
                  const percent = statusTotal ? (item.count / statusTotal) * 100 : 0;
                  return (
                    <div key={item.status}>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span className="font-medium text-gray-700">{formatStatusLabel(item.status)}</span>
                        <span className="text-gray-500">{item.count.toLocaleString()} ({percent.toFixed(1)}%)</span>
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
            </div>
          )}
        </div>

        <div className="bg-white p-4 shadow rounded xl:col-span-2">
          <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <FileDoc size={20} className="text-indigo-500" /> Recent Enrollments
          </h2>
          {recentEnrollments.length === 0 ? (
            <p className="text-sm text-gray-500">No enrollments recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentEnrollments.map((item) => (
                <li key={item.id} className="flex items-center justify-between border border-gray-100 rounded px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-gray-800">{item.student}</p>
                    <p className="text-gray-500 text-xs">{item.course}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 mr-2">
                      {item.status}
                    </span>
                    <span className="text-xs text-gray-400">{item.date}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded p-4 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">At a glance</h3>
          <p className="text-sm text-gray-500 mb-4">
            Track student engagement and approval pipeline in real time. Use the quick links to take action right away.
          </p>
          <div className="grid grid-cols-2 gap-3 text-center text-sm text-gray-600">
            <div className="border rounded-md p-3">
              <p className="text-xs uppercase tracking-wide text-gray-400">School Year</p>
              <p className="text-lg font-semibold text-gray-800">{stats?.activeSchoolYear ?? '—'}</p>
            </div>
            <div className="border rounded-md p-3">
              <p className="text-xs uppercase tracking-wide text-gray-400">Programs</p>
              <p className="text-lg font-semibold text-gray-800">{coursesOffered.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="bg-white p-4 shadow rounded">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Quick Links</h2>
          <div className="grid grid-cols-1 gap-3">
            <QuickLink href="/program-head/curricula" label="Edit Curriculum" />
            <QuickLink href="/program-head/faculties/assignfaculty" label="Assign Faculty" />
            <QuickLink href="/program-head/grades/approval" label="Review Grades" />
          </div>
        </div>
      </div>
    </ProgramHeadLayout>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="bg-white shadow rounded p-4 flex items-center gap-4">
      <div className="bg-indigo-100 text-indigo-700 p-2 rounded-full">
        {icon}
      </div>
      <div>
        <div className="text-lg font-bold">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
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

function QuickLink({ href, label }) {
  return (
    <a
      href={href}
      className="bg-indigo-600 text-white p-3 rounded shadow hover:bg-indigo-700 text-center transition block text-sm font-semibold"
    >
      {label}
    </a>
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
