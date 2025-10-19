import React, { useMemo, useState } from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Head, router } from "@inertiajs/react";
import {
  Users,
  Check,
  Folder,
  CaretDown,
  CaretRight,
  UsersThree,
  StackSimple,
  SquaresFour,
  ChalkboardTeacher,
  XCircle,
  Clock,
} from "phosphor-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

export default function StudentGrades({ user, schedules = [], activeSemester = null }) {
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [activeSubjects, setActiveSubjects] = useState({});

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  });

  const groupedData = useMemo(() => {
    const courses = {};

    schedules.forEach((sched) => {
      const courseCode =
        sched.curriculum_subject?.course?.code ??
        sched.section?.course?.code ??
        sched.enrollments?.find((enroll) => enroll?.course?.code)?.course?.code ??
        "N/A";
      const yearLevel = sched.section?.year_level?.year_level ?? "N/A";
      const sectionName = sched.section?.section ?? "No Section";
      const subjectTitle = sched.curriculum_subject?.subject?.descriptive_title ?? "N/A";

      if (!courses[courseCode]) courses[courseCode] = {};
      if (!courses[courseCode][yearLevel]) courses[courseCode][yearLevel] = {};
      if (!courses[courseCode][yearLevel][sectionName]) courses[courseCode][yearLevel][sectionName] = {};

      if (!courses[courseCode][yearLevel][sectionName][subjectTitle]) {
        courses[courseCode][yearLevel][sectionName][subjectTitle] = {
          subject: subjectTitle,
          class_schedule_id: sched.id,
          faculty: sched.faculty ? `${sched.faculty.fName ?? ""} ${sched.faculty.lName ?? ""}`.trim() : "N/A",
          students: (sched.students || []).filter((s) => (s.final_status ?? "draft") !== "draft"),
        };
      } else {
        courses[courseCode][yearLevel][sectionName][subjectTitle].students.push(
          ...(sched.students || []).filter((s) => (s.final_status ?? "draft") !== "draft")
        );
      }
    });

    return Object.keys(courses).map((courseCode) => ({
      course: courseCode,
      years: Object.keys(courses[courseCode]).map((yearLevel) => ({
        yearLevel,
        sections: Object.keys(courses[courseCode][yearLevel]).map((sectionName) => ({
          section: sectionName,
          subjects: Object.values(courses[courseCode][yearLevel][sectionName]),
        })),
      })),
    }));
  }, [schedules]);

  const toggleGroup = (key) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const setActiveSubject = (sectionKey, index) =>
    setActiveSubjects((prev) => ({ ...prev, [sectionKey]: index }));

  const handleConfirm = (status) => {
    if (!selectedGrade) return;
    router.post(
      route("registrar.grades.confirmGrade"),
      {
        enrollment_id: selectedGrade.enrollment_id,
        class_schedule_id: selectedGrade.class_schedule_id,
        final_status: status,
      },
      {
        onSuccess: () => {
          Toast.fire({
            icon: "success",
            title: status === "confirmed" ? "Grade confirmed!" : "Grade rejected!",
          });
          setModalOpen(false);
        },
        onError: () => Toast.fire({ icon: "error", title: "Failed to update grade!" }),
      }
    );
  };

  const handleConfirmAll = (students, class_schedule_id, subject) => {
    const pending = students.filter((student) => (student.final_status || "draft").toLowerCase() === "submitted");

    if (pending.length === 0) {
      Toast.fire({ icon: "info", title: `No submitted grades to confirm for ${subject}.` });
      return;
    }

    pending.forEach((student) => {
      router.post(route("registrar.grades.confirmGrade"), {
        enrollment_id: student.enrollment_id,
        class_schedule_id,
        final_status: "confirmed",
      });
    });
    Toast.fire({ icon: "success", title: `All grades confirmed for ${subject}!` });
  };

  const renderRemarksBadge = (remarks) => {
    const normalized = remarks || "Incomplete";
    const base = "font-medium px-2 py-0.5 rounded-full text-[10px]";
    if (normalized === "Passed") return `${base} bg-emerald-100 text-emerald-600 border border-emerald-200`;
    if (normalized === "Failed") return `${base} bg-rose-100 text-rose-600 border border-rose-200`;
    return `${base} bg-slate-100 text-slate-500 border border-slate-200`;
  };

  const renderStatusBadge = (status) => {
    const normalized = (status || "draft").toLowerCase();
    const base = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium";

    if (normalized === "confirmed") {
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-600`;
    }

    if (normalized === "submitted") {
      return `${base} border-indigo-200 bg-indigo-50 text-indigo-600`;
    }

    if (normalized === "rejected") {
      return `${base} border-rose-200 bg-rose-50 text-rose-600`;
    }

    return `${base} border-slate-200 bg-slate-50 text-slate-500`;
  };

  const renderCaret = (isOpen, size = 18) =>
    isOpen ? <CaretDown size={size} className="text-sky-500" /> : <CaretRight size={size} className="text-sky-500" />;

  return (
    <RegistrarLayout user={user}>
      <Head title="Student Grades" />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 font-sans text-xs md:text-sm text-slate-700 space-y-5">
        <div className="flex flex-col gap-2 border-b border-slate-200/70 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Users size={22} className="text-sky-500" />
            <div>
              <h1 className="text-sm font-semibold text-slate-800">Student Grades</h1>
              <p className="text-[11px] text-slate-500">Track submissions and confirm grade postings.</p>
            </div>
          </div>
          {activeSemester && (
            <div className="rounded-full border border-slate-200 bg-white px-4 py-1 text-[11px] text-slate-600 shadow-sm">
              <span className="font-medium text-slate-700">Active Semester:</span> {activeSemester.semester}
            </div>
          )}
        </div>

        {groupedData.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
            No submitted student grades available.
          </p>
        ) : (
          groupedData.map((course, cIdx) => {
            const courseKey = `course-${cIdx}`;
            const totalSections = course.years.reduce(
              (count, year) => count + year.sections.length,
              0
            );
            const totalStudents = course.years.reduce((courseTally, year) => {
              return (
                courseTally +
                year.sections.reduce((secTally, section) => {
                  return (
                    secTally +
                    section.subjects.reduce((subTally, subject) => subTally + subject.students.length, 0)
                  );
                }, 0)
              );
            }, 0);

            return (
              <div
                key={courseKey}
                className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100/60 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5 transition hover:translate-y-[-2px] hover:shadow-[0_14px_32px_rgba(15,23,42,0.12)]"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200/60 bg-white/70 px-4 py-3 text-left text-slate-700 backdrop-blur-sm transition hover:bg-white"
                  onClick={() => toggleGroup(courseKey)}
                >
                  <div className="flex items-center gap-3">
                    {renderCaret(openGroups[courseKey])}
                    <Folder size={20} className="text-amber-500" />
                    <span className="text-sm font-semibold text-slate-900">{course.course}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/90 px-3 py-0.5 shadow-sm">
                      <StackSimple size={12} className="text-slate-400" />
                      {course.years.length} year level{course.years.length === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/90 px-3 py-0.5 shadow-sm">
                      <SquaresFour size={12} className="text-slate-400" />
                      {totalSections} section{totalSections === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/90 px-3 py-0.5 shadow-sm">
                      <UsersThree size={12} className="text-slate-400" />
                      {totalStudents} student{totalStudents === 1 ? "" : "s"}
                    </span>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {openGroups[courseKey] && (
                    <motion.div
                      key={`${courseKey}-content`}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="mt-4 space-y-4 border-l-2 border-slate-200/80 pl-5"
                    >
                      {course.years.map((year, yIdx) => {
                        const yearKey = `${courseKey}-year-${yIdx}`;
                        return (
                          <div key={yearKey} className="space-y-3">
                            <button
                              type="button"
                              className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-left text-slate-600 backdrop-blur-sm transition hover:bg-white"
                              onClick={() => toggleGroup(yearKey)}
                            >
                              {renderCaret(openGroups[yearKey], 16)}
                              <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                                {year.yearLevel}
                              </span>
                            </button>

                            <AnimatePresence initial={false}>
                              {openGroups[yearKey] && (
                                <motion.div
                                  key={`${yearKey}-sections`}
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -4 }}
                                  transition={{ duration: 0.16 }}
                                  className="space-y-3 border-l-2 border-slate-200/70 pl-4"
                                >
                                  {year.sections.map((section, sIdx) => {
                                    const sectionKey = `${yearKey}-section-${sIdx}`;
                                    const hasSubjects = section.subjects.length > 0;
                                    return (
                                      <div
                                        key={sectionKey}
                                        className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white via-slate-50 to-slate-100/70 p-4 shadow-[0_1px_10px_rgba(15,23,42,0.08)]"
                                      >
                                        <button
                                          type="button"
                                          className="flex w-full items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-left text-slate-600 backdrop-blur-sm transition hover:bg-white"
                                          onClick={() => toggleGroup(sectionKey)}
                                        >
                                          <div className="flex items-center gap-2">
                                            {renderCaret(openGroups[sectionKey], 14)}
                                            <span className="text-[12px] font-semibold text-slate-600">{section.section}</span>
                                          </div>
                                          <span className="text-[10px] text-slate-400">{section.subjects.length} subjects</span>
                                        </button>

                                        <AnimatePresence initial={false}>
                                          {hasSubjects && openGroups[sectionKey] && (
                                            <motion.div
                                              key={`${sectionKey}-subjects`}
                                              initial={{ opacity: 0, y: -4 }}
                                              animate={{ opacity: 1, y: 0 }}
                                              exit={{ opacity: 0, y: -4 }}
                                              transition={{ duration: 0.16 }}
                                              className="mt-2 space-y-3"
                                            >
                                              <div className="flex flex-wrap gap-2">
                                                {section.subjects.map((subject, subjIdx) => (
                                                  <button
                                                    key={`${sectionKey}-tab-${subjIdx}`}
                                                    type="button"
                                                    onClick={() => setActiveSubject(sectionKey, subjIdx)}
                                                    className={`rounded-full border px-3.5 py-1 text-[10px] font-semibold transition ${
                                                      activeSubjects[sectionKey] === subjIdx
                                                        ? "border-sky-500 bg-sky-500 text-white shadow-lg shadow-sky-200/60"
                                                        : "border-slate-200/80 bg-white/70 text-slate-500 hover:bg-white"
                                                    }`}
                                                  >
                                                    {subject.subject}
                                                  </button>
                                                ))}
                                              </div>

                                              {section.subjects.length > 0 && (
                                                <div className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                                                  {(() => {
                                                    const activeIndex = activeSubjects[sectionKey] ?? 0;
                                                    const subject = section.subjects[activeIndex] ?? null;

                                                    if (!subject) {
                                                      return (
                                                        <p className="py-6 text-center text-[11px] text-slate-400">
                                                          No subjects selected.
                                                        </p>
                                                      );
                                                    }

                                                    return (
                                                      <>
                                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                          <div className="space-y-1">
                                                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-[10px] font-semibold text-slate-500 shadow-sm">
                                                              <ChalkboardTeacher size={12} className="text-slate-400" />
                                                              Faculty • {subject.faculty}
                                                            </div>
                                                            <h5 className="text-[13px] font-semibold text-slate-800">
                                                              {subject.subject}
                                                            </h5>
                                                          </div>
                                                          {subject.students.length > 0 && (
                                                            <button
                                                              type="button"
                                                              onClick={() => handleConfirmAll(subject.students, subject.class_schedule_id, subject.subject)}
                                                              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-600 transition hover:bg-emerald-100"
                                                            >
                                                              <Check size={12} /> Confirm All
                                                            </button>
                                                          )}
                                                        </div>

                                                        {(() => {
                                                          const passed = subject.students.filter((s) => s.remarks === "Passed").length;
                                                          const failed = subject.students.filter((s) => s.remarks === "Failed").length;
                                                          const incomplete = subject.students.length - passed - failed;
                                                          return (
                                                            <div className="flex flex-wrap gap-2 text-[10px] font-medium text-slate-500">
                                                              <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1 text-emerald-600">
                                                                <Check size={12} className="text-emerald-500" />
                                                                {passed} Passed
                                                              </span>
                                                              <span className="inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-1 text-rose-500">
                                                                <XCircle size={12} />
                                                                {failed} Failed
                                                              </span>
                                                              <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1 text-slate-500">
                                                                <Clock size={12} />
                                                                {incomplete} Pending
                                                              </span>
                                                            </div>
                                                          );
                                                        })()}

                                                        <div className="mt-3 overflow-x-auto">
                                                          <table className="min-w-full overflow-hidden rounded-xl text-left text-[11px]">
                                                            <thead className="bg-slate-100/80 text-slate-500">
                                                              <tr>
                                                                <th className="px-3 py-2 font-semibold uppercase tracking-wide">#</th>
                                                                <th className="px-3 py-2 font-semibold uppercase tracking-wide">Student</th>
                                                                <th className="px-3 py-2 text-center font-semibold uppercase tracking-wide">Midterm</th>
                                                                <th className="px-3 py-2 text-center font-semibold uppercase tracking-wide">Final</th>
                                                                <th className="px-3 py-2 text-center font-semibold uppercase tracking-wide">Remarks</th>
                                                                <th className="px-3 py-2 text-center font-semibold uppercase tracking-wide">Midterm Status</th>
                                                                <th className="px-3 py-2 text-center font-semibold uppercase tracking-wide">Final Status</th>
                                                                <th className="px-3 py-2 text-center font-semibold uppercase tracking-wide">Action</th>
                                                              </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100/70">
                                                              {subject.students.map((student, stIdx) => {
                                                                const midtermStatus = (student.midterm_status || "").toLowerCase();
                                                                const finalStatus = (student.final_status || "").toLowerCase();
                                                                const showMidterm = midtermStatus !== "draft";
                                                                const showFinal = finalStatus !== "draft";

                                                                return (
                                                                  <tr key={student.id} className="transition hover:bg-slate-50/80">
                                                                    <td className="px-3 py-2 font-medium text-slate-600/90">{stIdx + 1}</td>
                                                                    <td className="px-3 py-2 text-slate-700">{student.name}</td>
                                                                    <td className="px-3 py-2 text-center text-slate-600">{showMidterm ? student.midterm ?? "-" : "—"}</td>
                                                                    <td className="px-3 py-2 text-center text-slate-600">{showFinal ? student.final ?? "-" : "—"}</td>
                                                                    <td className="px-3 py-2 text-center">
                                                                      <span className={renderRemarksBadge(student.remarks)}>{student.remarks ?? "Incomplete"}</span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                      <span className={renderStatusBadge(student.midterm_status)}>
                                                                        {(student.midterm_status || "draft").replace(/^./, (char) => char.toUpperCase())}
                                                                      </span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                      <span className={renderStatusBadge(student.final_status)}>
                                                                        {(student.final_status || "draft").replace(/^./, (char) => char.toUpperCase())}
                                                                      </span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                      <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                          setSelectedGrade({
                                                                            ...student,
                                                                            class_schedule_id: subject.class_schedule_id,
                                                                            faculty: subject.faculty,
                                                                          });
                                                                          setModalOpen(true);
                                                                        }}
                                                                        disabled={finalStatus !== "submitted"}
                                                                        className="inline-flex items-center gap-1 rounded-md bg-sky-500 px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                                                                      >
                                                                        <Check size={12} /> Confirm
                                                                      </button>
                                                                    </td>
                                                                  </tr>
                                                                );
                                                              })}
                                                            </tbody>
                                                          </table>
                                                        </div>
                                                      </>
                                                    );
                                                  })()}
                                                </div>
                                              )}
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}

        {modalOpen && selectedGrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl border border-slate-200/70 bg-white p-6 shadow-xl">
              <h2 className="text-sm font-semibold text-slate-800">Confirm Grade</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-700">Student:</span> {selectedGrade.name}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Faculty:</span> {selectedGrade.faculty ?? "-"}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Midterm:</span> {selectedGrade.midterm ?? "-"} | <span className="font-medium text-slate-700">Final:</span> {selectedGrade.final ?? "-"}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Remarks:</span> {selectedGrade.remarks ?? "Incomplete"}
                </p>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleConfirm("confirmed")}
                  className="rounded-md bg-emerald-500 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-emerald-600"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirm("rejected")}
                  className="rounded-md bg-rose-500 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-rose-600"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md bg-slate-300 px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}
