import ProgramHeadLayout from '@/Layouts/ProgramHeadLayout';
import { Head } from '@inertiajs/react';
import {
  GraduationCap,
  ChalkboardTeacher,
  CheckSquareOffset,
  FileDoc
} from 'phosphor-react';

export default function ProgramHeadDashboard({ auth }) {
  return (
    <ProgramHeadLayout>
      <Head title="Dashboard" />

      <h1 className="text-2xl font-bold text-gray-800 mb-6">Welcome, Program Head!</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard icon={<GraduationCap size={28} />} label="Total Students" value="832" />
        <SummaryCard icon={<ChalkboardTeacher size={28} />} label="Courses Offered" value="45" />
        <SummaryCard icon={<CheckSquareOffset size={28} />} label="Grades to Approve" value="19" />
        <SummaryCard icon={<FileDoc size={28} />} label="Reports Pending" value="3" />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <QuickLink href="/program-head/curriculum/edit" label="Edit Curriculum" />
        <QuickLink href="/program-head/faculty/assign" label="Assign Faculty" />
        <QuickLink href="/program-head/grades/approval" label="Review Grades" />
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-4 shadow rounded">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Recent Activity</h2>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>📌 BSCS curriculum updated – July 15</li>
          <li>📌 Engr. Ramos assigned to CS 101 – July 14</li>
          <li>📌 12 grades submitted for approval – July 13</li>
        </ul>
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

function QuickLink({ href, label }) {
  return (
    <a
      href={href}
      className="bg-indigo-600 text-white p-4 rounded shadow hover:bg-indigo-700 text-center transition block font-semibold"
    >
      {label}
    </a>
  );
}
