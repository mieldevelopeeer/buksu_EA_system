import React, { useMemo, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { CalendarCheck, Filter, MapPin, Users, Clock, Layers } from 'lucide-react';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const formatFacultyName = (faculty = {}) => {
  if (!faculty || typeof faculty !== 'object') {
    return 'Unassigned';
  }

  const last = typeof faculty.lName === 'string' ? faculty.lName.trim() : '';
  const first = typeof faculty.fName === 'string' ? faculty.fName.trim() : '';
  const middle = typeof faculty.mName === 'string' ? faculty.mName.trim() : '';

  const segments = [last, first, middle].filter(Boolean);
  return segments.length > 0 ? segments.join(', ') : 'Unassigned';
};

const formatSectionLabel = (section = {}) => {
  const candidates = [section.section, section.name, section.label, section.code, section.section_name];
  const resolved = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  if (resolved) return resolved;
  if (section.id !== undefined && section.id !== null) {
    return `Section ${section.id}`;
  }
  return 'Unnamed Section';
};

const capitalize = (text) => {
  if (!text) return 'N/A';
  return text
    .split(' ')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(' ');
};

const countSchedules = (schoolYears = {}) => {
  return Object.values(schoolYears).reduce((syAcc, semesters) => {
    return syAcc + Object.values(semesters ?? {}).reduce((semAcc, yearLevels) => {
      return semAcc + Object.values(yearLevels ?? {}).reduce((ylAcc, schedules) => {
        return ylAcc + (Array.isArray(schedules) ? schedules.length : 0);
      }, 0);
    }, 0);
  }, 0);
};

const DAY_ALIASES = {
  monday: 'mon',
  mon: 'mon',
  tuesday: 'tue',
  tue: 'tue',
  tues: 'tue',
  wednesday: 'wed',
  wed: 'wed',
  thursday: 'thu',
  thu: 'thu',
  thurs: 'thu',
  friday: 'fri',
  fri: 'fri',
  saturday: 'sat',
  sat: 'sat',
  sunday: 'sun',
  sun: 'sun',
};

const DAYS_OF_WEEK = [
  { label: 'Monday', key: 'mon' },
  { label: 'Tuesday', key: 'tue' },
  { label: 'Wednesday', key: 'wed' },
  { label: 'Thursday', key: 'thu' },
  { label: 'Friday', key: 'fri' },
  { label: 'Saturday', key: 'sat' },
];

const normalizeDay = (value = '') => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  return DAY_ALIASES[trimmed] ?? trimmed.slice(0, 3);
};

const toMinutes = (value = '') => {
  if (typeof value !== 'string') return Number.POSITIVE_INFINITY;
  const trimmed = value.trim();
  if (!trimmed) return Number.POSITIVE_INFINITY;
  const isoMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (isoMatch) {
    const hours = parseInt(isoMatch[1], 10) % 24;
    const minutes = parseInt(isoMatch[2], 10);
    return hours * 60 + minutes;
  }
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return Number.POSITIVE_INFINITY;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem) {
    if (meridiem === 'AM' && hours === 12) hours = 0;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
  }
  return hours * 60 + minutes;
};

const formatTimeOfDay = (value = '') => {
  if (typeof value !== 'string') return 'TBA';
  const trimmed = value.trim();
  if (!trimmed) return 'TBA';
  const isoMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!isoMatch) return trimmed;
  let hours = parseInt(isoMatch[1], 10);
  const minutes = isoMatch[2];
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes}${meridiem}`;
};

const formatTimeRange = (start, end, fallback = '') => {
  if (start || end) {
    const startLabel = start ? formatTimeOfDay(start) : 'TBA';
    const endLabel = end ? formatTimeOfDay(end) : '';
    return endLabel ? `${startLabel} – ${endLabel}` : startLabel;
  }
  if (typeof fallback === 'string' && fallback.trim()) {
    return fallback.trim();
  }
  return 'TBA';
};

const getScheduleDay = (schedule = {}) => schedule.schedule_day ?? schedule.day ?? '';
const getScheduleStart = (schedule = {}) => schedule.start_time ?? schedule.startTime ?? schedule.start ?? '';
const getScheduleEnd = (schedule = {}) => schedule.end_time ?? schedule.endTime ?? schedule.end ?? '';
const getScheduleSectionId = (schedule = {}) =>
  schedule.section_id ?? schedule.sectionId ?? schedule.section?.id ?? schedule.section_id_id ?? '';
const getScheduleSlotKey = (schedule = {}) => {
  const start = getScheduleStart(schedule);
  const end = getScheduleEnd(schedule);
  if (start || end) {
    return `${start || 'TBA'}__${end || 'TBA'}`;
  }
  const fallback = schedule.time ?? schedule.schedule_time ?? '';
  return fallback.trim() || 'TBA';
};

const getScheduleSlotOrderValue = (schedule = {}) => {
  const start = getScheduleStart(schedule);
  if (start) return toMinutes(start);
  const fallback = schedule.time ?? schedule.schedule_time ?? '';
  const [rawStart] = typeof fallback === 'string' ? fallback.split('-') : [''];
  return toMinutes(rawStart ?? '');
};

const buildTimeSlots = (items = []) => {
  const bucket = new Map();
  items.forEach((item) => {
    const key = getScheduleSlotKey(item);
    if (!bucket.has(key)) {
      const start = getScheduleStart(item);
      const end = getScheduleEnd(item);
      const fallback = item.time ?? item.schedule_time ?? '';
      bucket.set(key, {
        key,
        label: formatTimeRange(start, end, fallback),
        order: getScheduleSlotOrderValue(item),
      });
    }
  });
  return Array.from(bucket.values()).sort((a, b) => a.order - b.order);
};

export default function ClassSchedules({ groupedSchedules = {}, filters = {}, options = {} }) {
  const [schoolYearId, setSchoolYearId] = useState(filters.school_year_id ?? '');
  const [semesterId, setSemesterId] = useState(filters.semester_id ?? '');
  const [yearLevelId, setYearLevelId] = useState(filters.year_level_id ?? '');
  const [sectionId, setSectionId] = useState(filters.section_id ?? '');
  const [courseId, setCourseId] = useState(filters.course_id ?? '');

  const courseGroups = useMemo(() => (Array.isArray(groupedSchedules) ? groupedSchedules : []), [groupedSchedules]);
  const schoolYears = options.schoolYears ?? [];
  const semesters = options.semesters ?? [];
  const yearLevels = options.yearLevels ?? [];
  const courses = options.courses ?? [];
  const sections = options.sections ?? [];

  const visibleCourseGroups = useMemo(() => {
    let filtered = courseGroups;

    if (courseId) {
      const matchCourseId = String(courseId);
      filtered = filtered.filter((course) => String(course.course_id ?? course.courseId ?? '') === matchCourseId);
    }

    if (!sectionId) return filtered;
    const matchId = String(sectionId);

    return filtered
      .map((course) => {
        const filteredSchoolYears = {};

        Object.entries(course.school_years ?? {}).forEach(([schoolYearLabel, semestersGroup]) => {
          const filteredSemesters = {};

          Object.entries(semestersGroup ?? {}).forEach(([semesterLabel, yearLevelsGroup]) => {
            const filteredYearLevels = {};

            Object.entries(yearLevelsGroup ?? {}).forEach(([yearLevelLabel, schedules]) => {
              const filteredSchedules = (Array.isArray(schedules) ? schedules : []).filter((schedule) => {
                return String(getScheduleSectionId(schedule)) === matchId;
              });

              if (filteredSchedules.length > 0) {
                filteredYearLevels[yearLevelLabel] = filteredSchedules;
              }
            });

            if (Object.keys(filteredYearLevels).length > 0) {
              filteredSemesters[semesterLabel] = filteredYearLevels;
            }
          });

          if (Object.keys(filteredSemesters).length > 0) {
            filteredSchoolYears[schoolYearLabel] = filteredSemesters;
          }
        });

        if (countSchedules(filteredSchoolYears) === 0) {
          return null;
        }

        return {
          ...course,
          school_years: filteredSchoolYears,
        };
      })
      .filter(Boolean);
  }, [courseGroups, sectionId]);

  const totalSchedules = useMemo(() => {
    return visibleCourseGroups.reduce((acc, course) => acc + countSchedules(course.school_years ?? {}), 0);
  }, [visibleCourseGroups]);

  const courseCount = visibleCourseGroups.length;

  const schoolYearCount = useMemo(() => {
    const labels = new Set();
    visibleCourseGroups.forEach((course) => {
      Object.keys(course.school_years ?? {}).forEach((label) => labels.add(label));
    });
    return labels.size;
  }, [visibleCourseGroups]);

  const semesterCount = useMemo(() => {
    return visibleCourseGroups.reduce((acc, course) => {
      return (
        acc +
        Object.values(course.school_years ?? {}).reduce((sum, semestersMap) => {
          return sum + Object.keys(semestersMap ?? {}).length;
        }, 0)
      );
    }, 0);
  }, [visibleCourseGroups]);

  const handleFilter = (event) => {
    event.preventDefault();
    router.get(
      route('admin.academic-setup.schedule'),
      {
        school_year_id: schoolYearId || undefined,
        semester_id: semesterId || undefined,
        year_level_id: yearLevelId || undefined,
        section_id: sectionId || undefined,
        course_id: courseId || undefined,
      },
      {
        preserveState: true,
        preserveScroll: true,
      }
    );
  };

  return (
    <AdminLayout>
      <Head title="Class Schedules" />

      <div className="p-6 text-xs text-gray-800 space-y-6">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-100 p-3 text-blue-500">
              <CalendarCheck size={20} />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Class Schedules</h1>
              <p className="text-[11px] text-gray-500">
                Review teaching loads across school years, semesters, and year levels.
              </p>
            </div>
          </div>

          <dl className="grid w-full gap-3 sm:grid-cols-4 lg:w-auto">
            <div className="rounded-xl border border-blue-100 bg-white/80 px-4 py-3 shadow-sm">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-blue-500">Total Blocks</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">{totalSchedules}</dd>
            </div>
            <div className="rounded-xl border border-purple-100 bg-white/80 px-4 py-3 shadow-sm">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-purple-500">School Years</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">{schoolYearCount}</dd>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white/80 px-4 py-3 shadow-sm">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-emerald-500">Semesters</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">{semesterCount}</dd>
            </div>
            <div className="rounded-xl border border-amber-100 bg-white/80 px-4 py-3 shadow-sm">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-amber-500">Courses</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">{courseCount}</dd>
            </div>
          </dl>
        </header>

        <form
          onSubmit={handleFilter}
          className="grid gap-3 rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
        >
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-600">
              <Filter size={14} /> School Year
            </label>
            <select
              value={schoolYearId}
              onChange={(event) => setSchoolYearId(event.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All School Years</option>
              {schoolYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.school_year}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-600">
              <Layers size={14} /> Semester
            </label>
            <select
              value={semesterId}
              onChange={(event) => setSemesterId(event.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100"
            >
              <option value="">All Semesters</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.semester}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-600">
              <Users size={14} /> Year Level
            </label>
            <select
              value={yearLevelId}
              onChange={(event) => setYearLevelId(event.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">All Year Levels</option>
              {yearLevels.map((yearLevel) => (
                <option key={yearLevel.id} value={yearLevel.id}>
                  {yearLevel.year_level}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[11px] font-semibold text-gray-600">
              <Users size={14} /> Section
            </label>
            <select
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100"
            >
              <option value="">All Sections</option>
              {sections.map((section) => (
                <option key={section.id ?? formatSectionLabel(section)} value={section.id}>
                  {formatSectionLabel(section)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              Apply Filters
            </button>
          </div>
        </form>

        {totalSchedules === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/70 py-16 text-center text-gray-400">
            <CalendarCheck size={32} className="mb-3" />
            <p className="text-sm font-medium">No class schedules available.</p>
            <p className="mt-1 max-w-sm text-[11px]">Adjust the filters above or ensure schedules have been encoded for the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleCourseGroups.map((course) => {
              const schoolYears = course.school_years ?? {};
              const courseTotal = countSchedules(schoolYears);

              return (
                <section
                  key={course.course_id ?? course.course_code ?? course.department_id ?? 'uncategorized'}
                  className="space-y-5"
                >
                  <header className="flex flex-col gap-2 rounded-2xl border border-blue-100 bg-white/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">
                        {course.course_code} · {course.course_name}
                      </h2>
                      <p className="text-[11px] text-gray-500">Department: {course.department_name}</p>
                    </div>
                    <span className="rounded-lg bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600">
                      {courseTotal} classes
                    </span>
                  </header>

                  {Object.entries(schoolYears).map(([schoolYearLabel, semestersGroup]) => (
                    <div key={`${course.course_id ?? course.course_code ?? 'uncategorized'}-${schoolYearLabel}`} className="space-y-4">
                      <header className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">School Year {schoolYearLabel}</h3>
                          <p className="text-[11px] text-gray-500">Semesters and levels scheduled for this academic year.</p>
                        </div>
                        <span className="rounded-lg bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600">
                          {Object.values(semestersGroup).reduce(
                            (count, yearLevelsGroup) => count + Object.values(yearLevelsGroup).reduce((acc, schedules) => acc + schedules.length, 0),
                            0
                          )}{' '}
                          classes
                        </span>
                      </header>

                      <div className="space-y-5">
                        {Object.entries(semestersGroup).map(([semesterLabel, yearLevelsGroup]) => (
                          <div key={`${course.course_id ?? course.course_code ?? 'uncategorized'}-${schoolYearLabel}-${semesterLabel}`} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-purple-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-600">
                                {capitalize(semesterLabel)}
                              </span>
                              <span className="text-[11px] text-gray-500">
                                {Object.values(yearLevelsGroup).reduce((acc, schedules) => acc + schedules.length, 0)} classes
                              </span>
                            </div>

                            <div className="grid gap-3 lg:grid-cols-1">
                              {Object.entries(yearLevelsGroup).map(([yearLevelLabel, schedules]) => (
                                <article
                                  key={`${course.course_id ?? course.course_code ?? 'uncategorized'}-${schoolYearLabel}-${semesterLabel}-${yearLevelLabel}`}
                                  className="w-full space-y-2 rounded-2xl border border-gray-200 bg-white/90 p-3 shadow-sm"
                                >
                                  <header className="flex items-center justify-between">
                                    <div>
                                      <p className="text-[11px] font-semibold text-gray-600">Year Level</p>
                                      <h4 className="text-sm font-semibold text-gray-900">{capitalize(yearLevelLabel)}</h4>
                                    </div>
                                    <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                                      {schedules.length} class{schedules.length === 1 ? '' : 'es'}
                                    </span>
                                  </header>

                                  <div className="space-y-2">
                                    {(() => {
                                      const sectionGroups = schedules.reduce((acc, schedule) => {
                                        const sectionLabel = schedule.section ?? 'Unassigned Section';
                                        if (!acc[sectionLabel]) {
                                          acc[sectionLabel] = [];
                                        }
                                        acc[sectionLabel].push(schedule);
                                        return acc;
                                      }, {});

                                      return Object.entries(sectionGroups)
                                        .sort(([sectionA], [sectionB]) => sectionA.localeCompare(sectionB))
                                        .map(([sectionLabel, sectionSchedules]) => {
                                          const timeSlots = buildTimeSlots(sectionSchedules);
                                          const scheduleLookup = sectionSchedules.reduce((acc, item) => {
                                            const timeKey = getScheduleSlotKey(item);
                                            const dayKey = normalizeDay(getScheduleDay(item));
                                            const key = `${timeKey}__${dayKey}`;
                                            if (!acc[key]) {
                                              acc[key] = [];
                                            }
                                            acc[key].push(item);
                                            return acc;
                                          }, {});

                                          return (
                                            <div key={sectionLabel} className="w-full space-y-3 rounded-2xl border border-gray-200 bg-white/90 p-3 shadow-sm">
                                              <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Section</p>
                                                  <h5 className="text-sm font-semibold text-gray-900">{sectionLabel}</h5>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                                                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-indigo-600">
                                                    <Users size={12} /> {sectionSchedules.length} class{sectionSchedules.length === 1 ? '' : 'es'}
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="overflow-x-auto">
                                                <table className="min-w-full table-fixed divide-y divide-gray-200 text-[11px]">
                                                  <thead>
                                                    <tr className="bg-gray-50">
                                                      <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-gray-600">Time</th>
                                                      {DAYS_OF_WEEK.map((day) => (
                                                        <th key={day.key} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-gray-600">
                                                          {day.label}
                                                        </th>
                                                      ))}
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-gray-100 bg-white">
                                                    {timeSlots.length === 0 ? (
                                                      <tr>
                                                        <td colSpan={DAYS_OF_WEEK.length + 1} className="px-3 py-4 text-center text-gray-400">
                                                          No scheduled classes for this section.
                                                        </td>
                                                      </tr>
                                                    ) : (
                                                      timeSlots.map((slot) => (
                                                        <tr key={slot.key}>
                                                          <td className="whitespace-nowrap px-3 py-2 font-semibold text-gray-800">{slot.label}</td>
                                                          {DAYS_OF_WEEK.map((day) => {
                                                            const entries = scheduleLookup[`${slot.key}__${day.key}`] ?? [];
                                                            return (
                                                              <td key={`${slot.key}-${day.key}`} className="align-top px-3 py-2">
                                                                {entries.length === 0 ? (
                                                                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-2 py-3 text-center text-[10px] text-gray-400">
                                                                    —
                                                                  </div>
                                                                ) : (
                                                                  <div className="space-y-1.5">
                                                                    {entries.map((entry) => (
                                                                      <div key={entry.id} className="space-y-1.5 rounded-lg border border-gray-200 bg-white px-2 py-2 shadow-sm">
                                                                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                                          <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">{entry.subject_code}</span>
                                                                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600">{entry.course}</span>
                                                                        </div>
                                                                        <p className="text-[11px] font-semibold text-gray-800">{entry.subject}</p>
                                                                        <div className="grid gap-0.5 text-[10px] text-gray-600">
                                                                          <span className="flex items-center gap-1 font-medium text-gray-700">
                                                                            <Clock size={12} className="text-blue-500" /> {entry.time}
                                                                          </span>
                                                                          <span className="flex items-center gap-1">
                                                                            <Users size={12} className="text-indigo-500" /> {formatFacultyName(entry.faculty)}
                                                                          </span>
                                                                          <span className="flex items-center gap-1">
                                                                            <MapPin size={12} className="text-amber-500" /> {entry.classroom}
                                                                          </span>
                                                                          <span className="flex items-center gap-1 text-gray-500">Load: {entry.load_hours} hrs</span>
                                                                        </div>
                                                                      </div>
                                                                    ))}
                                                                  </div>
                                                                )}
                                                              </td>
                                                            );
                                                          })}
                                                        </tr>
                                                      ))
                                                    )}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          );
                                        });
                                    })()}
                                  </div>
                                </article>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
