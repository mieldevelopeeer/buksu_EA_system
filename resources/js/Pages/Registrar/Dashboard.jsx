import { useMemo, useState, useEffect, useRef } from "react";
import { Link, Head } from "@inertiajs/react";
import { ListChecks, FileText, CalendarCheck, Clock, CheckCircle, Warning, GraduationCap, BookOpen } from "phosphor-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import RegistrarLayout from "@/Layouts/RegistrarLayout";

// Icon mapping
const iconMap = {
  CheckCircle,
  Clock,
  Warning,
  ListChecks,
  FileText,
  CalendarCheck,
  GraduationCap,
  BookOpen,
};

const StatCard = ({ icon: Icon, label, value, accent, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-gradient-to-br ${accent} shadow-sm rounded-2xl border border-slate-200/60 p-4 flex items-center gap-4 transition hover:shadow-lg cursor-pointer hover:scale-105`}
    >
      <div className="bg-white/60 text-slate-700 p-3 rounded-lg flex-shrink-0">
        <Icon size={28} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-600 font-medium">{label}</div>
      </div>
    </div>
  );
};

const QuickLink = ({ title, description, href }) => (
  <Link
    href={href}
    className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300"
  >
    <div className="flex items-start gap-3.5">
      <div>
        <p className="font-bold text-slate-900 text-[13px]">{title}</p>
        <p className="text-[12px] text-slate-600 mt-1">{description}</p>
      </div>
    </div>
  </Link>
);

const ActivityItem = ({ iconName, title, date, detail, status }) => {
  const statusColors = {
    success: "bg-emerald-50 text-emerald-600 border-emerald-200",
    pending: "bg-amber-50 text-amber-600 border-amber-200",
    alert: "bg-rose-50 text-rose-600 border-rose-200",
    info: "bg-blue-50 text-blue-600 border-blue-200",
  };

  // Get icon component from map, default to CheckCircle
  const Icon = iconMap[iconName] || CheckCircle;

  return (
    <div className={`rounded-lg border ${statusColors[status] || statusColors.info} px-4 py-3 hover:shadow-sm transition`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-[12px]">{title}</p>
          <p className="text-slate-600 text-[11px] mt-0.5">{detail}</p>
          <p className="text-[10px] text-slate-500 mt-1">{date}</p>
        </div>
      </div>
    </div>
  );
};

function RegistrarDashboard({
  auth,
  stats = {},
  enrollmentTrends = [],
  requestQueue = [],
  coursesEnrolled = [],
  yearLevelDistribution = [],
  genderDistribution = [],
  currentSemester = null,
  currentSchoolYear = null,
}) {
  const user = auth?.user;
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const semesterIdRef = useRef(currentSemester?.id);
  const schoolYearIdRef = useRef(currentSchoolYear?.id);

  // Auto-refresh logic for semester and school year changes
  useEffect(() => {
    // Check if semester or school year has changed
    const checkPeriodChange = () => {
      if (
        semesterIdRef.current !== currentSemester?.id ||
        schoolYearIdRef.current !== currentSchoolYear?.id
      ) {
        semesterIdRef.current = currentSemester?.id;
        schoolYearIdRef.current = currentSchoolYear?.id;
        window.location.reload();
      }

      // Check if current date is within the school year range
      if (currentSchoolYear?.startDate && currentSchoolYear?.endDate) {
        const now = new Date();
        const startDate = new Date(currentSchoolYear.startDate);
        const endDate = new Date(currentSchoolYear.endDate);

        if (now < startDate || now > endDate) {
          window.location.reload();
        }
      }
    };

    // Check immediately on mount
    checkPeriodChange();

    // Check every hour
    const intervalId = setInterval(checkPeriodChange, 3600000);

    // Listen for visibility changes to check when user returns to the page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkPeriodChange();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentSemester?.id, currentSchoolYear?.id, currentSchoolYear?.startDate, currentSchoolYear?.endDate]);

  const resolvedStats = {
    students: stats.students ?? 0,
    enrolledToday: stats.enrolledToday ?? 0,
    pendingRequests: stats.pendingRequests ?? 0,
    upcomingEvents: stats.upcomingEvents ?? 0,
    enrollmentStats: stats.enrollmentStats ?? {},
  };

  const chartData = useMemo(() => {
    if (enrollmentTrends.length) return enrollmentTrends;
    return [
      { name: "Mon", submitted: 0, target: 10 },
      { name: "Tue", submitted: 0, target: 10 },
      { name: "Wed", submitted: 0, target: 10 },
      { name: "Thu", submitted: 0, target: 10 },
      { name: "Fri", submitted: 0, target: 10 },
    ];
  }, [enrollmentTrends]);

  const activities = requestQueue.length
    ? requestQueue
    : [];

  return (
    <>
      <Head title="Registrar Dashboard" />
      <div className="mx-auto w-full space-y-6 px-4 py-6">
        {/* Header */}
        <header className="flex flex-col gap-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.45em] text-slate-500">Registrar Workspace</p>
          <h1 className="text-3xl font-bold text-slate-900">Good day{user?.fName ? `, ${user.fName}` : ""}</h1>
          <p className="text-[13px] text-slate-600 mt-1">Manage enrollment pipelines and student records.</p>
          
          {/* Academic Period Info */}
          {(currentSchoolYear || currentSemester) && (
            <div className="mt-4 flex flex-wrap gap-3">
              {currentSchoolYear && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 border border-blue-200">
                  <BookOpen size={14} className="text-blue-600" />
                  <span className="text-[12px] font-medium text-blue-900">AY {currentSchoolYear.year}</span>
                </div>
              )}
              {currentSemester && (
                <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 border border-indigo-200">
                  <GraduationCap size={14} className="text-indigo-600" />
                  <span className="text-[12px] font-medium text-indigo-900">{currentSemester.name}</span>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Enrollment Overview Stats */}
        {resolvedStats.enrollmentStats && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500">Enrollment Summary</p>
              <p className="text-[13px] text-slate-800 font-semibold mt-1">Current enrollment status breakdown</p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Enrollments Card */}
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-blue-600 uppercase tracking-wide">Total</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{resolvedStats.enrollmentStats.total?.toLocaleString() ?? 0}</p>
                  </div>
                  <div className="bg-blue-200/50 p-3 rounded-lg">
                    <ListChecks size={24} className="text-blue-600" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-[10px] text-blue-700">All enrollment records</p>
                </div>
              </div>

              {/* Enrolled Card */}
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wide">Enrolled</p>
                    <p className="text-3xl font-bold text-emerald-900 mt-2">{resolvedStats.enrollmentStats.enrolled?.toLocaleString() ?? 0}</p>
                  </div>
                  <div className="bg-emerald-200/50 p-3 rounded-lg">
                    <CheckCircle size={24} className="text-emerald-600" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-emerald-200">
                  <p className="text-[10px] text-emerald-700">Approved students</p>
                </div>
              </div>

              {/* Pending Card */}
              <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wide">Pending</p>
                    <p className="text-3xl font-bold text-amber-900 mt-2">{resolvedStats.enrollmentStats.pending?.toLocaleString() ?? 0}</p>
                  </div>
                  <div className="bg-amber-200/50 p-3 rounded-lg">
                    <Clock size={24} className="text-amber-600" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <p className="text-[10px] text-amber-700">Awaiting approval</p>
                </div>
              </div>

              {/* Rejected Card */}
              <div className="rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-rose-600 uppercase tracking-wide">Rejected</p>
                    <p className="text-3xl font-bold text-rose-900 mt-2">{resolvedStats.enrollmentStats.rejected?.toLocaleString() ?? 0}</p>
                  </div>
                  <div className="bg-rose-200/50 p-3 rounded-lg">
                    <Warning size={24} className="text-rose-600" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-rose-200">
                  <p className="text-[10px] text-rose-700">Dropped/Rejected</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-[11px] font-medium text-slate-600 mb-3">Enrollment Distribution</p>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-100">
                {resolvedStats.enrollmentStats.total > 0 && (
                  <>
                    <div 
                      className="bg-blue-500" 
                      style={{ width: `${(resolvedStats.enrollmentStats.total / resolvedStats.enrollmentStats.total) * 100}%` }}
                    />
                    <div 
                      className="bg-emerald-500" 
                      style={{ width: `${(resolvedStats.enrollmentStats.enrolled / resolvedStats.enrollmentStats.total) * 100}%` }}
                    />
                    <div 
                      className="bg-amber-500" 
                      style={{ width: `${(resolvedStats.enrollmentStats.pending / resolvedStats.enrollmentStats.total) * 100}%` }}
                    />
                    <div 
                      className="bg-rose-500" 
                      style={{ width: `${(resolvedStats.enrollmentStats.rejected / resolvedStats.enrollmentStats.total) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-slate-600">All Records</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-slate-600">Enrolled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-slate-600">Pending</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-rose-500 rounded-full" />
                  <span className="text-slate-600">Rejected</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Main Content Grid */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Enrollment Trend Chart */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500">Enrollment Trend</p>
              <p className="text-[13px] text-slate-800 font-semibold mt-1">Daily enrollment submissions vs target</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [value, 'Submitted']}
                />
                <Legend />
                <Bar dataKey="submitted" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Submitted" />
                <Bar dataKey="target" fill="#e5e7eb" radius={[8, 8, 0, 0]} name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Request Queue */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500">Latest Submissions</p>
                <p className="text-[13px] text-slate-800 font-semibold mt-1">{activities.length} pending</p>
              </div>
            </div>
            <div className="space-y-2">
              {activities.length > 0 ? (
                activities.slice(0, 6).map((activity, index) => (
                  <ActivityItem key={`${activity.title}-${index}`} {...activity} />
                ))
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-slate-500">No pending requests</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Courses, Year Level & Gender Distribution */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Courses Enrolled */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500">Courses Enrolled</p>
              <p className="text-[13px] text-slate-800 font-semibold mt-1">Top programs</p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {coursesEnrolled.length > 0 ? (
                coursesEnrolled.map((course, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-900 truncate">{course.code}</p>
                      <p className="text-[10px] text-slate-600 truncate">{course.name}</p>
                    </div>
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 whitespace-nowrap">
                      {course.count}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-slate-500">No courses enrolled</p>
                </div>
              )}
            </div>
          </div>

          {/* Year Level Distribution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500">Year Level Distribution</p>
              <p className="text-[13px] text-slate-800 font-semibold mt-1">Students by level</p>
            </div>
            <div className="space-y-3">
              {yearLevelDistribution.length > 0 ? (
                yearLevelDistribution.map((level, idx) => {
                  const maxCount = Math.max(...yearLevelDistribution.map(l => l.count), 1);
                  const percentage = (level.count / maxCount) * 100;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-medium text-slate-700">{level.year}</p>
                        <span className="text-[11px] font-bold text-indigo-600">{level.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-slate-500">No data</p>
                </div>
              )}
            </div>
          </div>

          {/* Gender Distribution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500">Gender Distribution</p>
              <p className="text-[13px] text-slate-800 font-semibold mt-1">Student demographics</p>
            </div>
            <div className="space-y-3">
              {genderDistribution.length > 0 ? (
                <>
                  <div className="flex gap-2 mb-4">
                    {genderDistribution.map((gender, idx) => {
                      const colors = ['bg-blue-500', 'bg-pink-500', 'bg-purple-500', 'bg-slate-500'];
                      const textColors = ['text-blue-700', 'text-pink-700', 'text-purple-700', 'text-slate-700'];
                      return (
                        <div key={idx} className={`flex-1 rounded-lg p-3 text-center ${colors[idx % colors.length]} bg-opacity-10 border ${textColors[idx % textColors.length]}`}>
                          <p className={`text-[10px] font-medium ${textColors[idx % textColors.length]}`}>{gender.gender}</p>
                          <p className={`text-2xl font-bold ${textColors[idx % textColors.length]}`}>{gender.count}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-3 border-t border-slate-200">
                    <div className="space-y-2">
                      {genderDistribution.map((gender, idx) => {
                        const total = genderDistribution.reduce((sum, g) => sum + g.count, 0);
                        const percentage = ((gender.count / total) * 100).toFixed(1);
                        return (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-[12px] text-slate-600">{gender.gender}</span>
                            <span className="text-[11px] font-semibold text-slate-900">{percentage}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-slate-500">No data</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

RegistrarDashboard.layout = (page) => <RegistrarLayout children={page} />;

export default RegistrarDashboard;
