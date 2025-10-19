import { useMemo, useState } from 'react';
import StudentLayout from '@/Layouts/StudentLayout';
import { Head, usePage } from '@inertiajs/react';
import {
  Clock,
  Quote,
  RefreshCw,
  TrendingUp,
  CalendarDays,
  MapPin,
  Award,
  Star
} from 'lucide-react';

const QUOTES = [
  {
    text: 'Education is the passport to the future, for tomorrow belongs to those who prepare for it today.',
    author: 'Malcolm X',
  },
  {
    text: 'Success is the sum of small efforts, repeated day in and day out.',
    author: 'Robert Collier',
  },
  {
    text: 'The future depends on what you do today.',
    author: 'Mahatma Gandhi',
  },
  {
    text: 'Believe you can and you are halfway there.',
    author: 'Theodore Roosevelt',
  },
  {
    text: 'Discipline is the bridge between goals and accomplishment.',
    author: 'Jim Rohn',
  },
];

const to12Hour = (time) => {
  if (!time) return null;
  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr || '0');
  if (Number.isNaN(hour)) return time;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${suffix}`;
};

const normalizeClasses = (entries = []) =>
  entries.map((item, index) => {
    const subject = item.subject || item.descriptive_title || item.title || 'Subject to be announced';
    const start = item.start_time || item.startTime || item.start || null;
    const end = item.end_time || item.endTime || item.end || null;
    const time = start && end ? `${to12Hour(start)} - ${to12Hour(end)}` : item.time || 'Schedule to follow';
    const room = item.room || item.room_number || item.location || 'Room TBA';

    return {
      id: item.id || `${subject}-${index}`,
      subject,
      time,
      room,
    };
  });

const deriveGradeStatus = (summary = {}) => {
  const gpa = summary.gpa ?? summary.average ?? null;
  const latestGrade = summary.latestGrade ?? summary.lastGrade ?? null;
  const updatedAt = summary.updatedAt ?? summary.updated_at ?? null;
  const explicitStatus = summary.status?.toLowerCase();

  const numericGpa = gpa !== null ? Number(gpa) : null;

  let tone = 'neutral';
  let label = 'Grades pending';
  let message = 'New grades will appear here as soon as they are released.';

  if (explicitStatus) {
    if (['excellent', 'good', 'passed'].includes(explicitStatus)) {
      tone = 'positive';
      label = 'On track';
      message = 'Great work! Keep maintaining your performance.';
    } else if (['warning', 'probation', 'at risk'].includes(explicitStatus)) {
      tone = 'warning';
      label = 'Needs attention';
      message = 'Review your study plan and reach out to your adviser.';
    }
  } else if (numericGpa !== null) {
    if (numericGpa <= 1.75) {
      tone = 'positive';
      label = 'Excellent standing';
      message = 'Your hard work is paying off—keep it going!';
    } else if (numericGpa <= 2.25) {
      tone = 'neutral';
      label = 'Good standing';
      message = 'You are doing well. Stay consistent and push for higher marks.';
    } else if (numericGpa <= 2.75) {
      tone = 'warning';
      label = 'Watchlist';
      message = 'A quick review session could boost your next assessments.';
    } else {
      tone = 'warning';
      label = 'At risk';
      message = 'Let’s get you back on track—consider tutoring or study groups.';
    }
  }

  return {
    gpa: numericGpa,
    latestGrade,
    updatedAt,
    tone,
    label,
    message,
  };
};

export default function Dashboard({ auth }) {
  const { classesToday = [], classesTomorrow = [], gradeSummary = {} } = usePage().props;
  const fullName = auth?.user?.name || 'Student';
  const firstName = fullName.split(' ')[0];

  const todaysClasses = normalizeClasses(classesToday).slice(0, 3);
  const tomorrowsClasses = normalizeClasses(classesTomorrow).slice(0, 3);
  const gradeInfo = deriveGradeStatus(gradeSummary);
  const defaultQuoteIndex = useMemo(() => {
    const identifier = auth?.user?.id ?? fullName.length;
    return Math.abs(identifier * 7) % QUOTES.length;
  }, [auth?.user?.id, fullName]);
  const [quoteIndex, setQuoteIndex] = useState(defaultQuoteIndex);
  const inspirationalQuote = QUOTES[quoteIndex];

  const cycleQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
  };

  return (
    <StudentLayout>
      <Head title="Dashboard" />

      <div className="space-y-6 px-3 py-4 md:space-y-8 md:px-6 md:py-6">
        <header className="flex flex-col gap-2 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 p-4 text-sm text-white shadow-md transition md:border-blue-100 md:bg-gradient-to-r md:from-blue-50/80 md:via-white md:to-blue-50/80 md:text-blue-900 md:shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-100 md:text-blue-500">Welcome back</p>
            <h1 className="text-lg font-semibold text-white md:text-blue-900 md:text-xl">
              {firstName}, ready for your next class?
            </h1>
          </div>
          <span className="text-xs text-blue-50 md:text-blue-700 md:text-sm">
            Stay organized with quick actions and upcoming reminders.
          </span>
        </header>

        {/* Schedule / Grades / Quote */}
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ScheduleCard
            title="Today's classes"
            classes={todaysClasses}
            fallback="You are all clear for today."
            className="xl:col-span-1"
          />
          <ScheduleCard
            title="Tomorrow's preview"
            classes={tomorrowsClasses}
            fallback="No classes scheduled for tomorrow."
            className="xl:col-span-1"
          />
          <GradeCard
            className="md:col-span-2 xl:col-span-2"
            gpa={gradeInfo.gpa}
            latestGrade={gradeInfo.latestGrade}
            updatedAt={gradeInfo.updatedAt}
            tone={gradeInfo.tone}
            label={gradeInfo.label}
            message={gradeInfo.message}
          />
          <QuoteCard
            className="md:col-span-2 xl:col-span-2"
            quote={inspirationalQuote}
            onNext={cycleQuote}
          />
        </section>
      </div>
    </StudentLayout>
  );
}

function ScheduleCard({ title, classes, fallback, className = '' }) {
  return (
    <article
      className={`group flex h-full flex-col gap-3 rounded-xl border border-gray-200 bg-white/95 p-4 text-sm text-gray-600 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg ${className}`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 md:text-base">
        <Clock className="h-4 w-4 text-blue-600 transition-transform duration-300 group-hover:-rotate-6" />
        {title}
      </div>
      <ul className="space-y-2 text-xs text-gray-600 md:text-sm">
        {classes.length === 0 && (
          <li className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-gray-500">
            {fallback}
          </li>
        )}
        {classes.map((session) => (
          <li
            key={session.id}
            className="rounded-md border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50 px-3 py-3 text-blue-800 shadow-sm"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-500 md:text-[13px]">
              <Clock className="h-3.5 w-3.5" />
              <span>{session.time}</span>
            </div>
            <p className="mt-1 flex items-center gap-2 font-semibold text-blue-900">
              <BookOpen className="h-4 w-4" />
              <span>{session.subject}</span>
            </p>
            <p className="mt-1 flex items-center gap-2 text-xs text-blue-700">
              <MapPin className="h-3.5 w-3.5" />
              <span>{session.room}</span>
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}

function GradeCard({ gpa, latestGrade, updatedAt, tone, label, message, className = '' }) {
  const toneStyles = {
    positive: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
    neutral: 'border-amber-200 bg-amber-50/70 text-amber-700',
    warning: 'border-rose-200 bg-rose-50/70 text-rose-700',
  };

  const labelStyles = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    neutral: 'bg-amber-50 text-amber-700 border-amber-200',
    warning: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <article
      className={`group flex h-full flex-col gap-3 rounded-xl border border-gray-200 bg-white/95 p-4 text-sm text-gray-600 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg ${className}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 md:text-base">
          <TrendingUp className="h-4 w-4 text-blue-600 transition-transform duration-300 group-hover:rotate-6" />
          Grade update
        </h3>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium md:text-sm ${labelStyles[tone]}`}>
          {label}
        </span>
      </div>
      <p className="text-xs text-gray-500 md:text-sm">{message}</p>
      <div className="flex flex-wrap gap-4 text-gray-800">
        <div className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${toneStyles.positive}`}>
          <Award className="mt-0.5 h-4 w-4 text-emerald-500" />
          <div>
            <span className="block text-[10px] uppercase tracking-wide text-emerald-500">GPA</span>
            <span className="text-lg font-semibold text-emerald-700 md:text-xl">
              {gpa !== null && !Number.isNaN(gpa) ? gpa.toFixed(2) : '—'}
            </span>
          </div>
        </div>
        <div className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${toneStyles.neutral}`}>
          <Star className="mt-0.5 h-4 w-4 text-amber-500" />
          <div>
            <span className="block text-[10px] uppercase tracking-wide text-amber-500">Latest grade</span>
            <span className="text-lg font-semibold text-amber-700 md:text-xl">{latestGrade ?? '—'}</span>
          </div>
        </div>
      </div>
      <span className="text-[11px] text-gray-400">
        {updatedAt ? `Updated ${updatedAt}` : 'Awaiting registrar update'}
      </span>
    </article>
  );
}

function QuoteCard({ quote, onNext, className = '' }) {
  return (
    <article
      className={`group flex h-full flex-col justify-between gap-4 rounded-xl border border-blue-100 bg-blue-600/10 p-4 text-sm text-blue-900 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg ${className}`}
    >
      <Quote className="h-6 w-6 text-blue-500" />
      <p className="text-base font-medium text-blue-900 md:text-lg">“{quote.text}”</p>
      <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 md:text-sm">
        — {quote.author}
      </span>
      <button
        type="button"
        onClick={onNext}
        className="flex w-max items-center gap-2 rounded-full border border-blue-200 bg-white/40 px-3 py-1 text-xs font-medium text-blue-700 transition duration-200 hover:bg-white hover:text-blue-900 md:text-sm"
      >
        <RefreshCw className="h-4 w-4" />
        Inspire me again
      </button>
    </article>
  );
}
