import JudgeLayout from '@/Layouts/JudgeLayout';
import { Head, Link } from '@inertiajs/react';

export default function Dashboard({ auth, stats = {}, schedule = [], announcements = [] }) {
  return (
    <JudgeLayout>
      <Head title="Dashboard" />

      <div className="py-8 px-4 space-y-8">
        {/* Greeting */}
        <h2 className="text-2xl font-semibold text-gray-800">
          Welcome, {auth?.user?.name || 'Judge'}!
        </h2>

      
     

        {/* Main Navigation Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            title="View Contestants"
            description="Check the list of all participants in each category."
            link="/judge/contestants"
          />
          <Card
            title="Judging" 
            description="Submit your evaluations for each contestant."
            link="/judge/judging"
          />
          <Card
            title="Announcement of Winners"
            description="View the final results and rankings of the contest."
            link="/judge/winners"
          />
        </section>

        {/* Today's Schedule */}
        <section>
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Today's Judging Schedule</h3>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="p-3">Event</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Venue</th>
                </tr>
              </thead>
              <tbody>
                {schedule.length ? (
                  schedule.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3">{item.event}</td>
                      <td className="p-3">{item.category}</td>
                      <td className="p-3">{item.time}</td>
                      <td className="p-3">{item.venue}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-500">
                      No events scheduled today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Announcements */}
        <section>
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Announcements</h3>
          <ul className="space-y-3">
            {announcements.length ? (
              announcements.map((note, index) => (
                <li key={index} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
                  {note}
                </li>
              ))
            ) : (
              <li className="text-gray-500">No announcements at the moment.</li>
            )}
          </ul>
        </section>
      </div>
    </JudgeLayout>
  );
}

// Reusable Components
function StatCard({ title, value }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow text-center">
      <h4 className="text-md text-gray-500">{title}</h4>
      <p className="text-3xl font-bold text-blue-700 mt-2">{value}</p>
    </div>
  );
}

function Card({ title, description, link }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
      <h3 className="text-lg font-semibold text-blue-800">{title}</h3>
      <p className="text-sm text-gray-600 mt-2">{description}</p>
      <Link href={link} className="inline-block mt-4 text-blue-600 hover:underline text-sm">
        Go to {title}
      </Link>
    </div>
  );
}
