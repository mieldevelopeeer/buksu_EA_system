import StudentLayout from '@/Layouts/StudentLayout';
import { Head } from '@inertiajs/react';

export default function Dashboard({ auth }) {
  const upcomingEvents = [
    {
      title: 'Student Orientation',
      date: 'August 10, 2025',
      description: 'Mandatory orientation for all freshmen and transferees.',
    },
    {
      title: 'Midterm Exam Week',
      date: 'September 1–5, 2025',
      description: 'Prepare and check the schedule for upcoming exams.',
    },
  ];

  return (
    <StudentLayout>
      <Head title="Dashboard" />
      <div className="py-6 px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Welcome, {auth?.user?.name || 'Student'}!
        </h1>

        {/* Student Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <Card
            title="My Enrollment"
            description="Enroll or view your current subjects and academic status."
          />
          <Card
            title="My Grades"
            description="Access your grades per semester and download grade reports."
          />
          <Card
            title="Campus Events"
            description="Join events, vote in elections, and stay involved in campus life."
          />
          <Card
            title="Class Schedule"
            description="Check your daily schedule, time slots, and room assignments."
          />
          <Card
            title="My Curriculum"
            description="View your program’s curriculum and track completed subjects."
          />
          <Card
            title="Student Profile"
            description="Update your personal info, contact details, and password."
          />
        </div>

        {/* Optional: Upcoming Events */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📅 Upcoming Events</h2>
          <ul className="space-y-4">
            {upcomingEvents.map((event, index) => (
              <li key={index} className="border-l-4 border-blue-500 pl-4">
                <p className="text-md font-medium text-gray-700">{event.title}</p>
                <p className="text-sm text-gray-500">{event.date}</p>
                <p className="text-sm text-gray-600">{event.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </StudentLayout>
  );
}

// ✅ Reusable Card component
function Card({ title, description }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
      <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
      <p className="text-sm text-gray-500 mt-2">{description}</p>
    </div>
  );
}
