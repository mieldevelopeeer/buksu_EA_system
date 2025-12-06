import React, { useEffect, useMemo, useState } from "react";
import FacultyLayout from "@/Layouts/FacultyLayout";
import { Head, usePage, router } from "@inertiajs/react";
import {
  ArrowLeft,
  CalendarDays,
  Users,
  CheckSquare,
  Save,
  AlertTriangle,
} from "lucide-react";
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

const getScheduleQuery = () => {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("schedule");
};

const parseScheduleId = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export default function AttendanceAdd({
  section,
  students = [],
  defaultDate,
  classSchedules = [],
  initialScheduleId = null,
}) {
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

  const resolvedInitialSchedule = useMemo(() => {
    if (normalizedSchedules.length === 0) return null;
    const scheduleFromQuery = parseScheduleId(getScheduleQuery());
    if (scheduleFromQuery) {
      const match = normalizedSchedules.find((item) => Number(item.id) === scheduleFromQuery);
      if (match) {
        return match.id;
      }
    }
    if (initialScheduleId) {
      const match = normalizedSchedules.find((item) => Number(item.id) === Number(initialScheduleId));
      if (match) {
        return match.id;
      }
    }
    return normalizedSchedules[0]?.id ?? null;
  }, [normalizedSchedules, initialScheduleId]);

  const [selectedSchedule, setSelectedSchedule] = useState(resolvedInitialSchedule);

  useEffect(() => {
    setSelectedSchedule(resolvedInitialSchedule);
  }, [resolvedInitialSchedule]);

  const filteredStudents = useMemo(() => {
    const baseList = (() => {
      if (!Array.isArray(students)) return [];
      if (!selectedSchedule) return students;
      const scheduleSpecific = studentsBySchedule.get(Number(selectedSchedule));
      if (Array.isArray(scheduleSpecific) && scheduleSpecific.length > 0) {
        return scheduleSpecific;
      }
      return students.filter((student) => Number(student.class_schedule_id) === Number(selectedSchedule));
    })();

    const filtered = baseList.filter((student) => {
      const status = (student.status || student.subject_status || "").toLowerCase();
      const remarks = (student.remarks || "").toLowerCase();
      const isCredited = status.includes("credited") || remarks.includes("credited");
      const isCompleted = status.includes("completed") || status === "passed";
      return !(isCredited || isCompleted);
    });

    return filtered
      .slice()
      .sort((a, b) => {
        const lastA = a.user?.lName ? a.user.lName.trim() : "";
        const lastB = b.user?.lName ? b.user.lName.trim() : "";
        const firstA = a.user?.fName ? a.user.fName.trim() : "";
        const firstB = b.user?.fName ? b.user.fName.trim() : "";
        const middleA = a.user?.mName ? a.user.mName.trim() : "";
        const middleB = b.user?.mName ? b.user.mName.trim() : "";

        const nameA = `${lastA}, ${firstA} ${middleA}`.trim().toLowerCase();
        const nameB = `${lastB}, ${firstB} ${middleB}`.trim().toLowerCase();

        if (!nameA && !nameB) return 0;
        if (!nameA) return 1;
        if (!nameB) return -1;

        return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      });
  }, [students, selectedSchedule, studentsBySchedule]);

  const flaggedStudents = useMemo(
    () =>
      filteredStudents.filter((student) => {
        const absenceTotal = Number(student.absence_count ?? student.absences ?? 0);
        return absenceTotal >= 3;
      }),
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

  const markAllPresent = async () => {
    if (!filteredStudents || filteredStudents.length === 0) return;

    const result = await Swal.fire({
      icon: "question",
      title: "Mark all as Present?",
      text: "This will set the status of all displayed students to Present.",
      showCancelButton: true,
      confirmButtonText: "Yes, mark all",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#16a34a",
    });

    if (!result.isConfirmed) return;

    setLocalRecords((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((student) => {
        next[student.id] = { status: "present" };
      });
      return next;
    });

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "All students marked present",
      showConfirmButton: false,
      timer: 1800,
      timerProgressBar: true,
    });
  };

  const navigateBackToMyClass = (targetScheduleId = null) => {
    const scheduleId =
      targetScheduleId || getScheduleQuery() || selectedSchedule || initialScheduleId;
    if (!scheduleId) {
      router.visit("/faculty/classes");
      return;
    }
    router.visit(`/faculty/classes/subject/${scheduleId}?tab=attendance`);
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

    router.post(route("faculty.attendance.store", section.id), payload, {
      onSuccess: () => {
        Swal.fire({
          icon: "success",
          title: "Attendance saved",
          text: "Attendance captured successfully.",
          confirmButtonColor: "#0f172a",
          confirmButtonText: "Back to Section",
        }).then(() => {
          navigateBackToMyClass(selectedSchedule);
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
        className="mx-auto w-full px-4 py-4 sm:px-6 lg:px-8 text-xs text-slate-700"
      >
        <header className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigateBackToMyClass(selectedSchedule)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              aria-label="Back to class"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Attendance
              </p>
              <h1 className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-900">
                <Users size={18} className="text-sky-600" />
                <span>{composedSectionName || section?.section || "Unnamed Section"}</span>
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">Mark and review attendance for this session</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-md border border-slate-200 bg-sky-50 px-3 py-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">Students</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-800">{studentCount}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Date</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-800">{readableDate}</p>
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
            <div className="mb-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              <AlertTriangle size={20} className="mt-0.5 text-amber-700" />
              <div>
                <p className="font-semibold uppercase tracking-wider text-amber-700">Attention</p>
                <p className="mt-1 text-sm font-medium text-amber-800">
                  The following students have 3 or more absences and may be subject to dropping:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
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
                      <li key={student.id} className="leading-tight">
                        {fullName} — {Number(student.absence_count ?? student.absences ?? 0)} absences
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
          {filteredStudents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm text-slate-500">
              No students found for this subject.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="min-w-full divide-y divide-slate-100 text-xs text-slate-700 md:table-fixed w-full">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Student Number</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
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
                        className={`transition ${isFlagged ? "bg-amber-50" : "hover:bg-slate-50"} even:bg-slate-50`}
                      >
                        <td className="px-3 py-3 text-xs text-slate-400">{index + 1}</td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-500">{student.user?.id_number || "—"}</td>
                        <td className="px-3 py-3 text-xs text-slate-800">{fullName || "Unnamed"}</td>
                        <td className="px-3 py-3 text-center">
                          <select
                            value={status}
                            onChange={(event) => updateStatus(student.id, event.target.value)}
                            className={`mx-auto block w-full max-w-[180px] rounded-md border-b-2 bg-transparent px-2 py-1 text-xs font-medium transition focus:outline-none focus:ring-0 ${statusClass}`}
                          >
                            <option value="">Select</option>
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {isFlagged && (
                            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-600">{absenceCount} abs</p>
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

        <footer className="flex items-center justify-between rounded-lg border border-blue-100 bg-white px-4 py-2.5 shadow-sm text-[10px]">
          <p className="text-slate-500">
            Review entries before submitting to ensure accuracy.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllPresent}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Mark All Present
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-sky-700"
            >
              Save Attendance
            </button>
          </div>
        </footer>
      </form>
    </FacultyLayout>
  );
}
