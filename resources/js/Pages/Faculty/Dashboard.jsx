import FacultyLayout from '@/Layouts/FacultyLayout';
import { Head } from '@inertiajs/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard({ auth }) {
  const user = auth?.user;

  // Example static data (replace with actual data from props or API)
  const stats = {
    classes: 5,
    students: 120,
    pendingGrades: 3,
  };

  const gradeData = [
    { name: 'Math', submitted: 80 },
    { name: 'Science', submitted: 95 },
    { name: 'English', submitted: 60 },
  ];

  return (
    <FacultyLayout>
      <Head title="Dashboard" />

      <div className="py-8 px-4">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Welcome{user?.name ? `, ${user.name}` : ''}!
        </h2>

        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-100 text-blue-800 p-4 rounded shadow">
            <h4 className="font-bold text-lg">My Classes</h4>
            <p className="text-2xl">{stats.classes}</p>
          </div>

          <div className="bg-green-100 text-green-800 p-4 rounded shadow">
            <h4 className="font-bold text-lg">Total Students</h4>
            <p className="text-2xl">{stats.students}</p>
          </div>

          <div className="bg-yellow-100 text-yellow-800 p-4 rounded shadow">
            <h4 className="font-bold text-lg">Pending Grades</h4>
            <p className="text-2xl">{stats.pendingGrades}</p>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">My Classes</h3>
            <p className="text-sm text-gray-500 mt-2">View your class schedule and assigned subjects.</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Grades</h3>
            <p className="text-sm text-gray-500 mt-2">Encode, view, and submit grades for your classes.</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Attendance</h3>
            <p className="text-sm text-gray-500 mt-2">Track and manage student attendance records.</p>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Grade Submission Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gradeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="submitted" fill="#3182ce" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </FacultyLayout>
  );
}
