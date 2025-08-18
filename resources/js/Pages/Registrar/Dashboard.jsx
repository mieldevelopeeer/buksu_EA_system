import { Student, ListChecks, FileText, CalendarCheck } from 'phosphor-react';
import { Link, Head } from '@inertiajs/react';

function RegistrarDashboard() {
  return (
    <>
      <Head title="Registrar Dashboard" />

      <div className="space-y-6">
        {/* Welcome Box */}
        <div className="bg-white shadow p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-gray-800">Welcome, Registrar!</h1>
          <p className="text-gray-600 mt-1">Here’s what’s happening today.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={<Student size={28} />}
            label="Total Students"
            value="1,254"
            iconColor="text-blue-700"
            bgColor="bg-blue-100"
          />
          <SummaryCard
            icon={<ListChecks size={28} />}
            label="Enrolled Today"
            value="73"
            iconColor="text-green-700"
            bgColor="bg-green-100"
          />
          <SummaryCard
            icon={<FileText size={28} />}
            label="Pending Requests"
            value="12"
            iconColor="text-yellow-700"
            bgColor="bg-yellow-100"
          />
          <SummaryCard
            icon={<CalendarCheck size={28} />}
            label="Upcoming Events"
            value="3"
            iconColor="text-purple-700"
            bgColor="bg-purple-100"
          />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickLink href="/registrar/enrollment" label="Manage Enrollment" />
          <QuickLink href="/registrar/students" label="Student List" />
          <QuickLink href="/registrar/reports" label="View Reports" />
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">📋 Recent Activity</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✅ John Dela Cruz was enrolled to BSIT – July 16</li>
            <li>✏️ Maria Santos requested grade correction – July 15</li>
            <li>🆕 New section created for 1st Year BSEd – July 15</li>
          </ul>
        </div>
      </div>
    </>
  );
}

// Assign layout
import RegistrarLayout from '@/Layouts/RegistrarLayout';
RegistrarDashboard.layout = (page) => <RegistrarLayout children={page} />;

export default RegistrarDashboard;

// Helper Components
function SummaryCard({ icon, label, value, iconColor, bgColor }) {
  return (
    <div className="bg-white shadow rounded p-4 flex items-center gap-4">
      <div className={`${bgColor} ${iconColor} p-2 rounded-full`}>
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function QuickLink({ href, label }) {
  return (
    <Link
      href={href}
      className="bg-blue-700 text-white p-4 rounded shadow hover:bg-blue-800 text-center transition block font-semibold"
    >
      {label}
    </Link>
  );
}
