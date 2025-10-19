import React, { useMemo } from "react";
import FacultyLayout from "@/Layouts/FacultyLayout";
import { Head, router } from "@inertiajs/react";
import { ArrowLeft, ClipboardList, BookOpen, CalendarClock, Users } from "lucide-react";
import dayjs from "dayjs";

export default function AttendanceRecord({
  section,
  records = [],
  assignedSchedules = [],
  latestDate = null,
  studentCount = 0,
}) {
  const subjectPalettes = useMemo(
    () => [
      {
        accent: "#2563eb",
        iconClass: "text-sky-500",
      },
      {
        accent: "#0d9488",
        iconClass: "text-teal-500",
      },
      {
        accent: "#7c3aed",
        iconClass: "text-violet-500",
      },
    ],
    []
  );
  const { course_alias, major_alias } = section || {};
  const aliasPart = [course_alias, major_alias].filter(Boolean).join(" ");
  const composedSectionName = aliasPart
    ? [aliasPart, section?.section].filter(Boolean).join(" - ")
    : section?.section;

  const summaries = useMemo(() => {
    if (!Array.isArray(records) || records.length === 0) {
      return [];
    }

    // If backend already provides aggregated totals per date, normalise shape.
    const looksAggregated = records.every(
      (record) =>
        typeof record.present === "number" ||
        typeof record.absent === "number" ||
        typeof record.late === "number" ||
        typeof record.excused === "number"
    );

    if (looksAggregated) {
      return records
        .map((record) => {
          const dateValue = record.date || record.attendance_date || record.created_at;
          const key = dateValue ? dayjs(dateValue).format("YYYY-MM-DD") : "Unknown";
          return {
            dateKey: key,
            readableDate: dateValue
              ? dayjs(dateValue).format("MMMM DD, YYYY")
              : "No date",
            present: record.present ?? 0,
            absent: record.absent ?? 0,
            late: record.late ?? 0,
            excused: record.excused ?? 0,
          };
        })
        .sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
    }

    const grouped = records.reduce((acc, record) => {
      const dateValue = record.date || record.attendance_date || record.created_at;
      const key = dateValue ? dayjs(dateValue).format("YYYY-MM-DD") : "Unknown";

      if (!acc[key]) {
        acc[key] = {
          dateKey: key,
          readableDate: dateValue ? dayjs(dateValue).format("MMMM DD, YYYY") : "No date",
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
        };
      }

      const status = (record.status || "").toLowerCase();
      if (status === "present") acc[key].present += 1;
      else if (status === "absent") acc[key].absent += 1;
      else if (status === "late") acc[key].late += 1;
      else if (status === "excused") acc[key].excused += 1;

      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
  }, [records]);

  const latestRecordedDate = useMemo(() => {
    if (latestDate) return dayjs(latestDate).format("MMMM DD, YYYY");
    if (summaries.length === 0) return "No attendance yet";
    return summaries[0].readableDate;
  }, [latestDate, summaries]);

  const toTimeLabel = (start, end) => {
    if (!start || !end) return "—";
    const startTime = dayjs(`1970-01-01T${start}`);
    const endTime = dayjs(`1970-01-01T${end}`);
    if (!startTime.isValid() || !endTime.isValid()) {
      return `${start} - ${end}`;
    }
    return `${startTime.format("h:mm A")} - ${endTime.format("h:mm A")}`;
  };

  const scheduleData = useMemo(() => {
    if (Array.isArray(assignedSchedules?.data)) return assignedSchedules.data;
    if (Array.isArray(assignedSchedules)) return assignedSchedules;
    return [];
  }, [assignedSchedules]);

  const scheduleMeta = useMemo(() => {
    if (assignedSchedules && typeof assignedSchedules === "object") {
      return assignedSchedules.meta ?? {};
    }
    return {};
  }, [assignedSchedules]);

  const scheduleLinks = useMemo(() => {
    if (assignedSchedules && typeof assignedSchedules === "object") {
      return assignedSchedules.links ?? [];
    }
    return [];
  }, [assignedSchedules]);

  const currentSchedulePage = scheduleMeta.current_page ?? 1;

  const subjectGroups = useMemo(() => {
    const groups = new Map();

    const hydrateGroupFromSchedule = (schedule) => {
      if (!schedule) return null;

      const scheduleId = schedule.id;
      if (groups.has(scheduleId)) {
        return groups.get(scheduleId);
      }

      const curriculum = schedule.curriculum_subject || schedule.curriculumSubject || null;
      const subjectDetails = curriculum?.subject;
      const resolveUnits = () => {
        const candidates = [
          schedule.units,
          schedule.subject_units,
          curriculum?.units,
          curriculum?.subject_units,
          subjectDetails?.units,
          subjectDetails?.credit_units,
          subjectDetails?.lec_units,
        ];
        for (const candidate of candidates) {
          if (candidate === undefined || candidate === null) continue;
          const numeric = Number(candidate);
          if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
            return numeric;
          }
        }
        return null;
      };
      const subjectUnits = resolveUnits();

      const subjectName =
        subjectDetails?.descriptive_title ||
        subjectDetails?.title ||
        curriculum?.subject_title ||
        schedule.subject_title ||
        "Unnamed Subject";

      const courseDetails = curriculum?.course || schedule.course;
      const courseLabel =
        courseDetails?.code ||
        courseDetails?.course_code ||
        courseDetails?.abbr ||
        courseDetails?.short_name ||
        courseDetails?.name ||
        section?.course_alias ||
        section?.course?.course_code ||
        section?.course?.name ||
        "";

      const sectionLabel =
        schedule.section?.section ||
        schedule.section_name ||
        section?.section ||
        section?.name ||
        "Section";

      const scheduleDay = schedule.schedule_day || schedule.day || "—";
      const timeRange =
        schedule.formatted_time ||
        toTimeLabel(schedule.start_time, schedule.end_time);

      groups.set(scheduleId, {
        id: scheduleId,
        subjectName,
        courseLabel,
        sectionLabel,
        scheduleDay,
        timeRange,
        records: [],
        studentCount:
          typeof schedule.student_count === "number"
            ? schedule.student_count
            : Array.isArray(schedule.students)
            ? schedule.students.length
            : undefined,
        subjectUnits,
      });
    };

    scheduleData.forEach((schedule) => {
      hydrateGroupFromSchedule(schedule);
    });

    if (Array.isArray(records)) {
      records.forEach((record) => {
        const schedule =
          record.class_schedule || record.classSchedule || record.schedule || null;
        const scheduleId =
          schedule?.id || record.class_schedule_id || record.classSchedule_id;
        if (!scheduleId) return;

        const group = hydrateGroupFromSchedule({
          ...(schedule || {}),
          id: scheduleId,
        });

        if (group) {
          group.records.push(record);
        }
      });
    }

    return Array.from(groups.values())
      .map((group) => {
        const dateMap = {};
        group.records.forEach((record) => {
          const dateValue =
            record.date || record.attendance_date || record.created_at;
          const key = dateValue ? dayjs(dateValue).format("YYYY-MM-DD") : "Unknown";

          if (!dateMap[key]) {
            dateMap[key] = {
              dateKey: key,
              readableDate: dateValue
                ? dayjs(dateValue).format("MMMM DD, YYYY")
                : "No date",
              present: 0,
              absent: 0,
              late: 0,
              excused: 0,
            };
          }

          const status = (record.status || "").toLowerCase();
          if (status === "present") dateMap[key].present += 1;
          else if (status === "absent") dateMap[key].absent += 1;
          else if (status === "late") dateMap[key].late += 1;
          else if (status === "excused") dateMap[key].excused += 1;
        });

        const uniqueStudents = new Set(
          group.records
            .map((record) => record.enrollment_id || record.enrollment?.id)
            .filter(Boolean)
        );

        const studentCount =
          typeof group.studentCount === "number" && group.studentCount >= 0
            ? group.studentCount
            : uniqueStudents.size;

        const totals = Object.values(dateMap).reduce(
          (acc, date) => {
            acc.present += date.present;
            acc.absent += date.absent;
            acc.late += date.late;
            acc.excused += date.excused;
            return acc;
          },
          { present: 0, absent: 0, late: 0, excused: 0 }
        );

        const sessionCount = Object.keys(dateMap).length;

        const absenceThreshold =
          group.subjectUnits === 3 ? 7 : group.subjectUnits === 2 ? 5 : null;
        const isAbsenceExceeded =
          typeof absenceThreshold === "number" && totals.absent >= absenceThreshold;

        return {
          ...group,
          studentCount,
          dates: Object.values(dateMap).sort((a, b) =>
            a.dateKey < b.dateKey ? 1 : -1
          ),
          totals,
          sessionCount,
          absenceThreshold,
          isAbsenceExceeded,
        };
      })
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [records, section, scheduleData]);

  const handleSubjectView = (subjectScheduleId) => {
    if (!subjectScheduleId) return;
    router.visit(
      route("faculty.attendance.subject", {
        section: section.id,
        schedule: subjectScheduleId,
      })
    );
  };

  const handlePageChange = (page) => {
    if (!page || page === currentSchedulePage) return;
    router.get(
      route("faculty.attendance.records", section.id),
      { page },
      { preserveState: true, preserveScroll: true }
    );
  };

  const overviewCards = useMemo(() => {
    const totalSessions = summaries.length;
    const totalPresent = summaries.reduce((sum, item) => sum + (item.present ?? 0), 0);
    const totalAbsent = summaries.reduce((sum, item) => sum + (item.absent ?? 0), 0);
    return [
      {
        icon: <ClipboardList size={16} className="text-sky-500" />,
        label: "Enrolled Students",
        value: studentCount,
        tone: "bg-slate-50 text-slate-600",
      },
      {
        icon: <CalendarClock size={16} className="text-amber-500" />,
        label: "Recorded Sessions",
        value: totalSessions,
        tone: "bg-amber-50 text-amber-600",
      },
      {
        icon: <Users size={16} className="text-emerald-500" />,
        label: "Total Present",
        value: totalPresent,
        tone: "bg-emerald-50 text-emerald-600",
      },
      {
        icon: <Users size={16} className="text-rose-500" />,
        label: "Total Absent",
        value: totalAbsent,
        tone: "bg-rose-50 text-rose-600",
      },
    ];
  }, [studentCount, summaries]);

  return (
    <FacultyLayout>
      <Head title={`Attendance Records • ${section?.section || "Section"}`} />
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 text-[13px] text-slate-600">
        <section className="rounded-2xl border border-slate-200/70 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => router.visit(route("faculty.attendance"))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Attendance Records</p>
                <h1 className="text-lg font-semibold text-slate-900">
                  {composedSectionName || section?.section || "Unnamed Section"}
                </h1>
                <p className="text-[12px] text-slate-500">
                  Review attendance summaries per subject or drill down into specific dates and students.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-[12px] text-slate-600">
              <span className="font-semibold text-slate-700">Latest entry:</span> {latestRecordedDate}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {overviewCards.map((card, index) => (
              <div
                key={index}
                className={`rounded-xl border border-slate-200/70 px-4 py-3 text-[12px] shadow-sm ${card.tone}`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                    {card.icon}
                  </span>
                  <span className="text-[18px] font-semibold">{card.value}</span>
                </div>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {card.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Subjects
          </h2>
          {subjectGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[12px] text-slate-500">
              No subjects with attendance records yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="divide-y divide-slate-200">
                {subjectGroups.map((group, index) => {
                  const palette = subjectPalettes[index % subjectPalettes.length];
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleSubjectView(group.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-slate-700">
                          <BookOpen size={16} className={palette.iconClass} />
                          {group.subjectName}
                        </span>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock size={12} className={palette.iconClass} />
                            {group.scheduleDay} · {group.timeRange}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users size={12} className={palette.iconClass} />
                            {group.studentCount} student{group.studentCount === 1 ? "" : "s"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            Course:
                            <span className="font-semibold text-slate-600">{group.courseLabel || "—"}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            Section:
                            <span className="font-semibold text-slate-600">{group.sectionLabel || "—"}</span>
                          </span>
                          {group.subjectUnits ? (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              Units:
                              <span className="font-semibold text-slate-600">{group.subjectUnits}</span>
                            </span>
                          ) : null}
                          {group.isAbsenceExceeded && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                              Failed due to absences
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end text-right text-[11px] text-slate-500">
                        {typeof group.absenceThreshold === "number" && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            group.isAbsenceExceeded
                              ? "border border-rose-200 bg-rose-50 text-rose-600"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-600"
                          }`}>
                            Absences: {group.totals.absent}
                            {group.isAbsenceExceeded ? " / Exceeded" : ` / ${group.absenceThreshold}`}
                          </span>
                        )}
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold">
                          {group.sessionCount} session{group.sessionCount === 1 ? "" : "s"}
                        </span>
                        <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                          View details
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <PaginationControls
            links={scheduleLinks}
            currentPage={currentSchedulePage}
            onNavigate={handlePageChange}
          />
        </section>
      </div>
    </FacultyLayout>
  );
}

function PaginationControls({ links = [], currentPage = 1, onNavigate }) {
  if (!Array.isArray(links) || links.length === 0) {
    return null;
  }

  return (
    <div className="flex justify-end pt-3">
      <nav className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-sm">
        {links.map((link, index) => {
          const isActive = Boolean(link.active);
          const isDisabled = !link.url;

          const handleClick = (event) => {
            event.preventDefault();
            if (isDisabled) return;
            const url = new URL(link.url, window.location.origin);
            const targetPage = Number(url.searchParams.get("page"));
            onNavigate?.(targetPage);
          };

          return (
            <button
              key={`${link.label}-${index}`}
              type="button"
              onClick={handleClick}
              disabled={isDisabled}
              className={`px-3 py-1 text-[11px] font-medium transition ${
                isActive
                  ? "rounded-lg bg-slate-900 text-white shadow"
                  : "text-slate-500 hover:text-slate-700"
              } ${isDisabled ? "cursor-not-allowed opacity-40" : ""}`}
              dangerouslySetInnerHTML={{ __html: link.label }}
            />
          );
        })}
      </nav>
    </div>
  );
}
