import FacultyLayout from "@/Layouts/FacultyLayout";
import { Head, Link, usePage } from "@inertiajs/react";
import { useMemo, useState, useEffect, useRef } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { CalendarBlank, Clock, MapPin, Users, BookOpen, ArrowUpRight, Warning, CheckCircle, Clock as ClockIcon } from "phosphor-react";

const StatCard = ({ label, value, accent, icon: Icon }) => (
  <div className={`rounded-2xl border border-slate-200/60 px-6 py-5 shadow-sm transition hover:shadow-lg ${accent}`}>
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500">{label}</p>
        <p className="mt-3 text-4xl font-bold text-slate-900">{value}</p>
      </div>
      {Icon && <Icon size={32} className="text-slate-300 opacity-50 flex-shrink-0" />}
    </div>
  </div>
);

const QuickLink = ({ title, description, href, icon: Icon }) => (
  <Link
    href={href}
    className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-slate-300"
  >
    <div className="flex items-start gap-3.5">
      {Icon && <Icon size={24} className="mt-0.5 flex-shrink-0 text-blue-600" />}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-900 text-[13px]">{title}</p>
        <p className="text-[12px] text-slate-600 mt-1">{description}</p>
      </div>
    </div>
  </Link>
);

const ScheduleList = ({ title, schedules, icon: Icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-2.5 mb-5">
      {Icon && <Icon size={22} className="text-blue-600" />}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500">{title}</p>
        <p className="text-[13px] text-slate-800 font-semibold mt-0.5">{schedules.length ? `${schedules.length} class${schedules.length > 1 ? "es" : ""}` : "No classes"}</p>
      </div>
    </div>
    <div className="space-y-3">
      {schedules.length ? (
        schedules.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-slate-100 bg-gradient-to-r from-blue-50/60 to-transparent px-4 py-3 hover:border-blue-200 transition">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-semibold text-slate-900 text-[12px] line-clamp-1">{entry.subject}</span>
              <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap">{entry.section}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 text-[11px]">
              <div className="flex items-center gap-1">
                <Clock size={12} className="text-slate-400" />
                <span>{entry.time}</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-slate-400" />
                <span>{entry.room}</span>
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-center text-[11px] text-slate-400">No classes scheduled</p>
      )}
    </div>
  </div>
);

const AbsenceCard = ({ title, alerts, variant = "warning" }) => {
  const variantStyles = {
    warning: "border-amber-200/50 bg-gradient-to-br from-amber-50 to-white",
    critical: "border-rose-200/50 bg-gradient-to-br from-rose-50 to-white"
  };
  const badgeStyles = {
    warning: "bg-amber-100 text-amber-700",
    critical: "bg-rose-100 text-rose-700"
  };
  const iconColor = {
    warning: "text-amber-500",
    critical: "text-rose-500"
  };
  const Icon = variant === "critical" ? Warning : Clock;

  return (
    <div className={`rounded-2xl border border-slate-200 ${variantStyles[variant]} p-6 shadow-sm`}>
      <div className="flex items-center gap-2.5 mb-5">
        <Icon size={22} className={iconColor[variant]} />
        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-600">{title}</p>
      </div>
      <div className="space-y-3">
        {alerts.length ? (
          alerts.map((alert, idx) => (
            <div key={`${alert.student}-${idx}`} className="rounded-lg border border-slate-100 bg-white px-4 py-3 hover:shadow-sm transition">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900 text-[12px] line-clamp-1">{alert.student}</span>
                <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${badgeStyles[variant]}`}>{alert.absences}x</span>
              </div>
              <p className="text-slate-700 text-[11px]">{alert.subject} • {alert.section}</p>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-[11px] text-slate-400">No alerts</p>
        )}
      </div>
    </div>
  );
};

const EnrollmentPeriodCard = ({ currentPeriod, upcomingPeriod }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500 mb-5">Enrollment Window</p>
    <div className="space-y-5">
      {/* Current Period */}
      <div className="pb-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Active Period</p>
        </div>
        {currentPeriod ? (
          <div className="space-y-2 text-[12px] text-slate-700">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Status:</span>
              <span className="text-slate-600">{currentPeriod.status}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarBlank size={14} className="text-slate-400" />
              <span className="text-slate-600">{formatDate(currentPeriod.start)} → {formatDate(currentPeriod.end)}</span>
            </div>
            <div className="text-slate-600 font-medium text-[11px]">{currentPeriod.semester} • {currentPeriod.schoolYear}</div>
          </div>
        ) : (
          <p className="text-slate-400 text-[12px] italic">No open period.</p>
        )}
      </div>

      {/* Upcoming Period */}
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Upcoming</p>
        </div>
        {upcomingPeriod ? (
          <div className="space-y-2 text-[12px] text-slate-700">
            <div className="flex items-center gap-2">
              <CalendarBlank size={14} className="text-slate-400" />
              <span className="text-slate-600">Starts {formatDate(upcomingPeriod.start)}</span>
            </div>
            <div className="text-slate-600 font-medium text-[11px]">{upcomingPeriod.semester} • {upcomingPeriod.schoolYear}</div>
          </div>
        ) : (
          <p className="text-slate-400 text-[12px] italic">No upcoming period.</p>
        )}
      </div>
    </div>
  </div>
);

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

export default function Dashboard({
  auth,
  stats = {},
  gradeOverview = [],
  attendanceSummary = [],
  quickLinks = [],
  schedulesToday = [],
  schedulesTomorrow = [],
  absenceAlerts = { warning: [], critical: [] },
  enrollmentPeriod = {},
  academicYear = null,
}) {
  const user = auth?.user;
  const [activeTab, setActiveTab] = useState("overview");
  const { props: currentProps } = usePage();
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

  const resolvedStats = {
    classes: stats.classes ?? 0,
    students: stats.students ?? 0,
    pendingGrades: stats.pendingGrades ?? 0,
    attendanceRate: stats.attendanceRate ?? "0",
  };

  const chartData = useMemo(() => {
    if (gradeOverview.length) return gradeOverview;
    return [
      { name: "Mon", submitted: 0, target: 5 },
      { name: "Tue", submitted: 0, target: 5 },
      { name: "Wed", submitted: 0, target: 5 },
      { name: "Thu", submitted: 0, target: 5 },
      { name: "Fri", submitted: 0, target: 5 },
    ];
  }, [gradeOverview]);

  const attendanceBySection = useMemo(() => {
    if (attendanceSummary.length) return attendanceSummary;
    return [
      { section: "—", rate: 0 },
    ];
  }, [attendanceSummary]);

  const links = quickLinks.length
    ? quickLinks
    : [
        { title: "My Classes", description: "View schedule & load", href: "/faculty/classes", icon: BookOpen },
        { title: "Record Attendance", description: "Log daily presence", href: "/faculty/attendance", icon: Users },
        { title: "Encode Grades", description: "Submit final marks", href: "/faculty/grades", icon: ArrowUpRight },
      ];

  const warningAlerts = absenceAlerts?.warning ?? [];
  const criticalAlerts = absenceAlerts?.critical ?? [];
  const currentPeriod = enrollmentPeriod?.current ?? null;
  const upcomingPeriod = enrollmentPeriod?.upcoming ?? null;

  return (
    <FacultyLayout>
      <Head title="Faculty Dashboard" />

      <div className="mx-auto w-full space-y-6 px-4 py-6">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl px-7 py-8 text-white shadow-lg">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-blue-100">Faculty Workspace</p>
              <h1 className="mt-3 text-3xl font-bold">Good day{user?.fName ? `, ${user.fName}` : "!"}</h1>
              <p className="mt-2 text-blue-100 text-[13px]">Monitor classes, attendance, and submissions at a glance.</p>
            </div>
            <div className="hidden md:block text-right flex-shrink-0">
              <p className="text-blue-100 text-[10px] font-semibold">Last updated</p>
              <p className="font-bold text-[12px] mt-1">{new Date().toLocaleString()}</p>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active Classes" value={resolvedStats.classes} accent="bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200" icon={BookOpen} />
          <StatCard label="Students" value={resolvedStats.students} accent="bg-gradient-to-br from-emerald-100 via-emerald-50 to-emerald-200" icon={Users} />
          <StatCard label="Pending Grades" value={resolvedStats.pendingGrades} accent="bg-gradient-to-br from-amber-100 via-amber-50 to-amber-200" icon={ClockIcon} />
          <StatCard label="Avg Attendance %" value={`${resolvedStats.attendanceRate}%`} accent="bg-gradient-to-br from-rose-100 via-rose-50 to-rose-200" icon={CheckCircle} />
        </section>

        {/* Schedule Section */}
        <section className="grid gap-4 md:grid-cols-2">
          <ScheduleList title="Today's Classes" schedules={schedulesToday} icon={CalendarBlank} />
          <ScheduleList title="Tomorrow" schedules={schedulesTomorrow} icon={Clock} />
        </section>

        {/* Charts Section */}
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-6">
              <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500">Grade Submission Trend</p>
              <p className="text-[13px] text-slate-800 font-semibold mt-1">Records submitted per day</p>
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

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-slate-500 mb-5">Attendance Snapshot</p>
            <div className="space-y-3.5">
              {attendanceBySection.map((row, index) => (
                <div key={`${row.section}-${index}`} className="rounded-lg border border-slate-100 px-4 py-3 hover:border-emerald-200 transition">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="font-bold text-slate-900 text-[12px]">{row.section}</span>
                    <span className="font-bold text-emerald-700 text-[12px]">{row.rate}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all" style={{ width: `${Math.min(row.rate, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Alerts & Enrollment Section */}
        <section className="grid gap-4 lg:grid-cols-3">
          <AbsenceCard title="Absence Watch (3x)" alerts={warningAlerts} variant="warning" />
          <AbsenceCard title="Critical Absences (5x)" alerts={criticalAlerts} variant="critical" />
          <EnrollmentPeriodCard currentPeriod={currentPeriod} upcomingPeriod={upcomingPeriod} />
        </section>
      </div>
    </FacultyLayout>
  );
}
