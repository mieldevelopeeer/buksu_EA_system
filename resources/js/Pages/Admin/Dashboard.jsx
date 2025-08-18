import AdminLayout from '../../Layouts/AdminLayout';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

export default function Dashboard() {
  const chartData = {
    labels: ['Room A', 'Room B', 'Room C', 'Room D', 'Room E', 'Room F', 'Room G'],
    datasets: [
      {
        label: 'Capacity',
        backgroundColor: '#1E3A8A',
        data: [40, 35, 30, 45, 25, 20, 28],
      },
      {
        label: 'Sections',
        backgroundColor: '#0EA5E9',
        data: [2, 3, 2, 4, 1, 1, 2],
      },
      {
        label: 'Students Present',
        backgroundColor: '#F59E0B',
        data: [38, 33, 29, 41, 23, 19, 26],
      },
    ],
  };

  return (
    
    <AdminLayout>
      
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Administrator Dashboard</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card title="365" subtitle="Students" />
          <Card title="240" subtitle="Enrolled" />
          <Card title="20" subtitle="Faculty" />
          <Card title="Pageant" subtitle="Upcoming Event" />
        </div>

        {/* Chart and Seat Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Enrollment by Room</h2>
            <Bar data={chartData} />
          </div>

          {/* Sidebar Info Boxes */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl shadow">
              <h3 className="text-md font-semibold text-gray-700 mb-3">Open Seat Details</h3>
              <SeatBox label="Total Open" count="1K" />
              <SeatBox label="Offered" count="1K" />
              <SeatBox label="Accepted" count="1K" />
            </div>

            <div className="bg-white p-5 rounded-2xl shadow">
              <h3 className="text-md font-semibold text-gray-700">Seats Available</h3>
              <p className="text-4xl font-extrabold text-center mt-4 text-red-600">73</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}


// Summary card
function Card({ title, subtitle }) {
  return (
    <div className="bg-blue-900 text-white p-5 rounded-2xl shadow text-center">
      <div className="text-3xl font-bold">{title}</div>
      <div className="text-sm opacity-90">{subtitle}</div>
    </div>
  );
}

// Seat info box
function SeatBox({ label, count }) {
  return (
    <div className="bg-red-100 text-red-800 text-center py-2 px-3 rounded-lg font-semibold shadow-sm mb-2">
      {label}: {count}
    </div>
  );
}
