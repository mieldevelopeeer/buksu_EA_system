import React, { useMemo, useState } from "react";
import FacultyLayout from "@/Layouts/FacultyLayout";
import { Head, usePage, router } from "@inertiajs/react";
import { ArrowLeft, CalendarDays, Users } from "lucide-react";
import dayjs from "dayjs";
import Swal from "sweetalert2";

const statusOptions = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
];

const statusStyles = {
  absent: "text-rose-600 border-rose-300 focus:border-rose-400",
  late: "text-amber-600 border-amber-300 focus:border-amber-400",
  excused: "text-sky-600 border-sky-300 focus:border-sky-400",
};

export default function AddAttendance({ section, students = [], defaultDate, classSchedules = [] }) {
  const { course_alias, major_alias } = section || {};
  const composedSectionName = [course_alias, major_alias, section?.section]
    .filter(Boolean)
    .join(" ");

  const { errors = {} } = usePage().props;
  const [selectedDate, setSelectedDate] = useState(defaultDate || dayjs().format("YYYY-MM-DD"));
  const normalizedSchedules = useMemo(() => {
    return Array.isArray(classSchedules)
      ? classSchedules.map((schedule) => ({
          ...schedule,
          id: Number(schedule.id),
          students: Array.isArray(schedule.students)
            ? schedule.students.map((student) => ({
                ...student,
                id: Number(student.id ?? student.enrollment_id ?? student.user?.id ?? 0),
              }))
            : [],
        }))
      : [];
  }, [classSchedules]);

  const studentsBySchedule = useMemo(() => {
    const map = new Map();
    normalizedSchedules.forEach((schedule) => {
      if (!schedule.id) return;
      if (Array.isArray(schedule.students) && schedule.students.length > 0) {
        map.set(
          schedule.id,
          schedule.students.map((student) => ({
            ...student,
            class_schedule_id: schedule.id,
            enrollment_id: student.id ?? student.enrollment_id,
          }))
        );
      }
    });
    return map;
  }, [normalizedSchedules]);

  const [selectedSchedule, setSelectedSchedule] = useState(() => {
    if (normalizedSchedules.length === 0) return null;
    const scheduleFromQuery = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("schedule")
      : null;
    if (scheduleFromQuery) {
      const match = normalizedSchedules.find((item) => String(item.id) === scheduleFromQuery);
      if (match) return match.id;
    }
    return normalizedSchedules[0]?.id ?? null;
  });

  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];
    if (!selectedSchedule) return students;
    const scheduleSpecific = studentsBySchedule.get(Number(selectedSchedule));
    if (Array.isArray(scheduleSpecific) && scheduleSpecific.length > 0) {
      return scheduleSpecific;
    }
    return students.filter((student) => Number(student.class_schedule_id) === Number(selectedSchedule));
  }, [students, selectedSchedule, studentsBySchedule]);

  const flaggedStudents = useMemo(
    () =>
      filteredStudents.filter(
        (student) => Number(student.absence_count ?? student.absences ?? 0) >= 3
      ),
    [filteredStudents]
  );

  const hasFlaggedStudents = flaggedStudents.length > 0;

  const [localRecords, setLocalRecords] = useState(() => {
    if (!Array.isArray(students)) return {};
    return students.reduce((acc, student) => {
      acc[student.id] = {
        status: "",
      };
      return acc;
    }, {});
  });

  const studentCount = useMemo(() => filteredStudents.length, [filteredStudents]);

  const updateStatus = (studentId, value) => {
    setLocalRecords((prev) => ({
      ...prev,
      [studentId]: {
        status: value,
      },
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      date: selectedDate,
      class_schedule_id: selectedSchedule,
      records: filteredStudents.map((student) => ({
        student_id: student.id,
        enrollment_id: student.enrollment_id || student.id,
        class_schedule_id: student.class_schedule_id,
        status: localRecords[student.id]?.status || "absent",
      })),
    };

    console.log("Submitting attendance payload", payload);

    router.post(route("faculty.attendance.store", section.id), payload, {
      onSuccess: () => {
        Swal.fire({
          icon: "success",
          title: "Attendance saved",
          text: "Attendance captured successfully.",
          confirmButtonColor: "#0f172a",
          confirmButtonText: "View Records",
        }).then(() => {
          const query = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
          const scheduleId = query?.get("schedule") || selectedSchedule;

          router.visit(
            route("faculty.attendance.subject", {
              section: section.id,
              schedule: scheduleId,
            })
          );
        });
      },
      onError: () => {
        Swal.fire({
          icon: "error",
          title: "Unable to save",
          text: "Please review the inputs and try again.",
          confirmButtonColor: "#b91c1c",
        });
      },
    });
  };

  const readableDate = dayjs(selectedDate).format("MMMM DD, YYYY");

  return (
    <FacultyLayout>
      <Head title={`Attendance • ${section?.section || "Section"}`} />
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-5xl space-y-3 px-3 py-3 text-[12px] text-slate-600 sm:space-y-3 sm:px-3"
      >
        <header className="rounded-lg border border-slate-100 bg-white px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => {
                  const query = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
                  const scheduleId = query?.get("schedule") || selectedSchedule;

                  router.visit(
                    route("faculty.attendance.subject", {
                      section: section.id,
                      schedule: scheduleId,
                    })
                  );
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:text-slate-600"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Attendance Section
                </p>
                <h1 className="text-[15px] font-semibold text-slate-900 md:text-base">
                  {composedSectionName || section?.section || "Unnamed Section"}
                </h1>
                <p className="text-[11px] text-slate-500">
                  Mark today’s session with streamlined controls.
                </p>
              </div>
            </div>

            <div className="grid gap-1 text-[10px] text-slate-500 sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-blue-50 px-3 py-2 shadow-sm">
                <p className="font-semibold uppercase tracking-[0.18em] text-sky-600">
                  Students
                </p>
                <p className="mt-0.5 text-[13px] font-semibold text-slate-700">
                  {studentCount}
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-blue-50 px-3 py-2 shadow-sm">
                <p className="font-semibold uppercase tracking-[0.18em] text-sky-600">
                  Selected Date
                </p>
                <p className="mt-0.5 text-[13px] font-semibold text-slate-700">
                  {readableDate}
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-lg border border-blue-100 bg-white px-4 py-3.5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold uppercase tracking-[0.22em] text-sky-500">
                Date
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="w-full rounded-md border border-blue-200 bg-white px-7 py-1.5 text-[11px] text-slate-700 shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              {errors.date && (
                <p className="text-xs text-rose-500">{errors.date}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold uppercase tracking-[0.22em] text-sky-500">
                Subject / Schedule
              </label>
              <select
                value={selectedSchedule || ""}
                onChange={(event) => setSelectedSchedule(event.target.value ? Number(event.target.value) : null)}
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-1.5 text-[11px] text-slate-700 shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {classSchedules.length === 0 && <option value="">All schedules</option>}
                {classSchedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold uppercase tracking-[0.22em] text-sky-500">
                Section
              </label>
              <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3.5 py-2 text-[12px] text-slate-600">
                <Users size={15} />
                <span>{composedSectionName || section?.section || "No Section"}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-blue-100 bg-white px-4 py-3.5 shadow-sm">
          {hasFlaggedStudents && (
            <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[11px] text-amber-700">
              <p className="font-semibold uppercase tracking-[0.18em]">Attention</p>
              <p className="mt-1 text-[12px] font-medium">
                The following students have 3 or more absences and may be subject to dropping:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px]">
                {flaggedStudents.map((student) => {
                  const fullName = [
                    student.user?.lName,
                    student.user?.fName,
                    student.user?.mName,
                  ]
                    .filter(Boolean)
                    .join(", ")
                    .replace(/, ,/g, ", ") || "Unnamed";

                  return (
                    <li key={student.id}>
                      {fullName} — {Number(student.absence_count ?? student.absences ?? 0)} absences
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {filteredStudents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm text-slate-500">
              No students found for this subject.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-blue-100 text-[11px] text-slate-600 md:table-fixed">
                <thead className="bg-blue-50 text-[9px] font-semibold uppercase tracking-[0.2em] text-sky-600">
                  <tr>
                    <th className="px-2.5 py-1.5 text-left">#</th>
                    <th className="px-2.5 py-1.5 text-left">Student Number</th>
                    <th className="px-2.5 py-1.5 text-left">Name</th>
                    <th className="px-2.5 py-1.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStudents.map((student, index) => {
                    const entry = localRecords[student.id] || {};
                    const status = entry.status || "";
                    const statusClass =
                      statusStyles[status] ||
                      "text-slate-600 border-blue-200 focus:border-blue-400";
                    const absenceCount = Number(
                      student.absence_count ?? student.absences ?? 0
                    );
                    const isFlagged = absenceCount >= 3;

                    const fullName = [
                      student.user?.lName,
                      student.user?.fName,
                      student.user?.mName,
                    ]
                      .filter(Boolean)
                      .join(", ")
                      .replace(/, ,/g, ", ");

                    return (
                      <tr
                        key={student.id}
                        className={`transition ${
                          isFlagged ? "bg-amber-50" : "hover:bg-blue-50/70"
                        }`}
                      >
                        <td className="px-2.5 py-1.5 text-[10px] text-slate-400">
                          {index + 1}
                        </td>
                        <td className="px-2.5 py-1.5 font-mono text-[10px] text-slate-500">
                          {student.user?.id_number || "—"}
                        </td>
                        <td className="px-2.5 py-1.5 text-[11px] text-slate-700">
                          {fullName || "Unnamed"}
                        </td>
                        <td className="px-2.5 py-1.5 text-center">
                          <select
                            value={status}
                            onChange={(event) =>
                              updateStatus(student.id, event.target.value)
                            }
                            className={`w-full border-b-2 bg-transparent px-1 pb-0.5 text-[10px] font-medium transition focus:outline-none focus:ring-0 ${statusClass}`}
                          >
                            <option value="">Select</option>
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {isFlagged && (
                            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">
                              {absenceCount} absences
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="flex items-center justify-between rounded-lg border border-blue-100 bg-white px-4 py-2.5 shadow-sm text-[11px]">
          <p className="text-slate-500">
            Review entries before submitting to ensure accuracy.
          </p>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            Save Attendance
          </button>
        </footer>
      </form>
    </FacultyLayout>
  );
}
