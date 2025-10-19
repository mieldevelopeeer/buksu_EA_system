import React, { useState, useMemo, useEffect } from "react";
import FacultyLayout from "@/Layouts/FacultyLayout";
import { Head, router } from "@inertiajs/react";
import {
  Clipboard,
  Users,
  CaretDown,
  CaretUp,
  Plus,
  CheckCircle,
  Clock,
  ChalkboardTeacher,
} from "phosphor-react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

/* -------------------------
   Toast config
------------------------- */
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
});

/* -------------------------
   Helper functions
------------------------- */
const computeRemarks = (midterm, final) => {
  if (midterm == null && final == null) return "Incomplete";
  const finalGrade = final ?? midterm;
  return finalGrade <= 3.0 ? "Passed" : "Failed";
};

/* -------------------------
   Import Preview Modal
------------------------- */
const ImportPreviewModal = ({ fileData, onClose, onConfirm }) => {
  if (!fileData || fileData.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Preview Import
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Table Preview */}
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-xs border border-gray-200 rounded-lg">
            <thead className="bg-gray-100 text-gray-600 sticky top-0">
              <tr>
                {Object.keys(fileData[0]).map((key) => (
                  <th key={key} className="p-2 border-b text-left">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {fileData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  {Object.values(row).map((val, i) => (
                    <td key={i} className="p-2">
                      {val ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex justify-end mt-4 gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-500 text-white text-sm hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Confirm Import
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------
   Grade Modal
------------------------- */
const GradeModal = ({ student, onClose, onSave }) => {
  const [draftStudent, setDraftStudent] = useState(student);

  const handleChange = (field, value) => {
    const updated = {
      ...draftStudent,
      [field]: value !== "" ? parseFloat(value) : null,
    };
    updated.remarks = computeRemarks(updated.midterm, updated.final);
    setDraftStudent(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fadeIn">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Add / Edit Grade
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            ✕
          </button>
        </div>

        {/* Student Name */}
        <p className="mb-3 font-medium text-gray-700">
          {draftStudent?.name}
        </p>

        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1 text-gray-600">
              Midterm
            </label>
            <input
              type="number"
              step="0.25"
              min="1"
              max="5"
              value={draftStudent?.midterm ?? ""}
              onChange={(e) => handleChange("midterm", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-600">
              Final
            </label>
            <input
              type="number"
              step="0.25"
              min="1"
              max="5"
              value={draftStudent?.final ?? ""}
              onChange={(e) => handleChange("final", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-600">
              Remarks
            </label>
            <input
              type="text"
              value={draftStudent?.remarks ?? "Incomplete"}
              readOnly
              className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end mt-6 gap-3">
          <button
            onClick={() => onSave(draftStudent, "draft")}
            className="bg-gray-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-gray-700 transition"
          >
            Save Draft
          </button>
          <button
            onClick={() => onSave(draftStudent, "submitted")}
            className="bg-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-700 transition"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------
   Main Page
------------------------- */
export default function Grades({ user, schedules = [], activeSemester = null }) {
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [localSchedules, setLocalSchedules] = useState(schedules);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // For Import Preview
  const [previewData, setPreviewData] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);

  useEffect(() => setLocalSchedules(schedules), [schedules]);

  // Group by Section -> Subject -> Students
  const groupedSections = useMemo(() => {
    const sections = {};
    localSchedules.forEach((sched) => {
      const sectionName = sched.section?.section ?? "No Section";
      const subjectTitle =
        sched.curriculum_subject?.subject?.descriptive_title ?? "N/A";

      if (!sections[sectionName]) sections[sectionName] = {};
      if (!sections[sectionName][subjectTitle]) {
        sections[sectionName][subjectTitle] = {
          subject: subjectTitle,
          class_schedule_id: sched.id,
          students: sched.students || [],
        };
      } else {
        sections[sectionName][subjectTitle].students.push(
          ...(sched.students || [])
        );
      }
    });

    return Object.keys(sections).map((sectionName) => ({
      section: sectionName,
      subjects: Object.values(sections[sectionName]),
    }));
  }, [localSchedules]);

  const dashboardSummary = useMemo(() => {
    const totalStudents = localSchedules.reduce(
      (sum, sched) =>
        sum + (Array.isArray(sched.students) ? sched.students.length : 0),
      0
    );
    const submitted = localSchedules.reduce(
      (sum, sched) =>
        sum +
        (Array.isArray(sched.students)
          ? sched.students.filter((student) => student.status === "submitted")
              .length
          : 0),
      0
    );

    return {
      totalStudents,
      submitted,
      pending: Math.max(totalStudents - submitted, 0),
    };
  }, [localSchedules]);

  const summaryCards = useMemo(
    () => [
      {
        label: "Rostered Students",
        value: dashboardSummary.totalStudents,
        icon: Clipboard,
        cardClass:
          "border-sky-100/70 bg-gradient-to-br from-sky-50/80 via-white to-sky-50/40",
        iconClass: "bg-sky-100 text-sky-600",
        hoverRing: "hover:ring-sky-200/70",
      },
      {
        label: "Grades Submitted",
        value: dashboardSummary.submitted,
        icon: CheckCircle,
        cardClass:
          "border-emerald-100/70 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40",
        iconClass: "bg-emerald-100 text-emerald-600",
        hoverRing: "hover:ring-emerald-200/70",
      },
      {
        label: "Pending Grades",
        value: dashboardSummary.pending,
        icon: Clock,
        cardClass:
          "border-amber-100/70 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40",
        iconClass: "bg-amber-100 text-amber-600",
        hoverRing: "hover:ring-amber-200/70",
      },
    ],
    [dashboardSummary]
  );

  const toggleSection = (sectionName) =>
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));

  const toggleSubject = (sectionName, subjectTitle) => {
    const key = `${sectionName}-${subjectTitle}`;
    setExpandedSubjects((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveStudentGrade = (student, status) => {
    router.post(
      route("faculty.grades.add"),
      {
        grades: [
          {
            enrollment_id: student.enrollment_id,
            class_schedule_id: student.class_schedule_id,
            midterm: student.midterm,
            final: student.final,
            remarks: student.remarks,
            status,
          },
        ],
      },
      {
        onSuccess: () => {
          Toast.fire({
            icon: "success",
            title: status === "draft" ? "Draft saved!" : "Grade submitted!",
          });

          // Update local state
          const updatedSchedules = localSchedules.map((sched) =>
            sched.id === student.class_schedule_id
              ? {
                  ...sched,
                  students: sched.students.map((s) =>
                    s.enrollment_id === student.enrollment_id
                      ? { ...student, status }
                      : s
                  ),
                }
              : sched
          );
          setLocalSchedules(updatedSchedules);
          setSelectedStudent(null);
        },
        onError: () =>
          Toast.fire({ icon: "error", title: "Failed to save grade!" }),
      }
    );
  };

  return (
    <FacultyLayout user={user}>
      <Head title="Grades" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="rounded-3xl border border-slate-200/60 bg-white/90 px-6 py-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <ChalkboardTeacher size={24} weight="duotone" />
              </span>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">
                  Grades
                </h1>
                <p className="text-sm text-slate-500">
                  Manage submissions and keep your classes aligned at a glance.
                </p>
              </div>
            </div>

            {activeSemester ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-semibold">
                  <Clock size={14} />
                  {activeSemester.semester}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-semibold">
                  <CheckCircle size={14} />
                  SY {activeSemester.school_year}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400">
                No active semester details available.
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaryCards.map(
            ({ label, value, icon: Icon, cardClass, iconClass, hoverRing }) => (
              <div
                key={label}
                className={`relative overflow-hidden rounded-2xl border px-5 py-4 shadow-sm ring-1 ring-transparent transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${cardClass} ${hoverRing}`}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-white/60" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500/90">
                      {label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-slate-800">
                      {value}
                    </p>
                  </div>
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${iconClass}`}
                  >
                    <Icon size={18} weight="duotone" />
                  </span>
                </div>
              </div>
            )
          )}
        </div>

        {/* Sections */}
        {groupedSections.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No students found for your classes.
          </p>
        ) : (
          groupedSections.map((section) => {
            const isSectionExpanded =
              expandedSections[section.section] ?? false;
            return (
              <div
                key={section.section}
                className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
              >
                {/* Section Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer bg-blue-50 hover:bg-blue-100 transition"
                  onClick={() => toggleSection(section.section)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-100">
                      <Users size={16} className="text-blue-600" />
                    </div>
                    <span className="font-semibold text-blue-700 text-sm">
                      {section.section}
                    </span>
                  </div>
                  {isSectionExpanded ? (
                    <CaretUp size={16} />
                  ) : (
                    <CaretDown size={16} />
                  )}
                </div>

                {/* Subjects */}
                {isSectionExpanded && (
                  <div className="p-4 space-y-4">
                    {section.subjects.map((subj) => {
                      const key = `${section.section}-${subj.subject}`;
                      const isSubjectExpanded =
                        expandedSubjects[key] ?? false;

                      return (
                        <div
                          key={subj.class_schedule_id}
                          className="bg-gray-50 rounded-lg border shadow-sm"
                        >
                          {/* Subject Header */}
                          <div
                            className="flex items-center justify-between px-3 py-2 cursor-pointer bg-gray-100 hover:bg-gray-200 rounded-t"
                            onClick={() =>
                              toggleSubject(section.section, subj.subject)
                            }
                          >
                            <span className="font-medium text-gray-700 text-sm">
                              {subj.subject}
                            </span>
                            {isSubjectExpanded ? (
                              <CaretUp size={14} />
                            ) : (
                              <CaretDown size={14} />
                            )}
                          </div>

                          {/* Students */}
{isSubjectExpanded && (
  <div className="mt-2 overflow-x-auto">
    {/* Action Buttons */}
    <div className="flex justify-end items-center mb-2 pr-4 gap-2">
      {/* Import */}
      <label className="bg-blue-500 text-white px-3 py-1 rounded-md text-xs cursor-pointer flex items-center gap-1 hover:bg-blue-600 transition-all shadow-sm">
        <Plus size={12} /> Import
        <input
          type="file"
          accept=".xlsx, .xls"
          className="hidden"
          onChange={(e) => {
            const file = e?.target?.files?.[0];
            if (!file) return;

            const classSchedule = localSchedules.find(
              (sched) =>
                (sched.curriculum_subject?.subject?.descriptive_title ?? "").trim() === subj.subject.trim() &&
                (sched.section?.section ?? "").trim() === section.section.trim()
            );

            if (!classSchedule) {
              Toast.fire({ icon: "error", title: "Class schedule not found." });
              e.target.value = null;
              return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
              const data = new Uint8Array(event.target.result);
              const workbook = XLSX.read(data, { type: "array" });
              const worksheet = workbook.Sheets[workbook.SheetNames[0]];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

              setPreviewData(jsonData);
              setPendingImport({ file, classSchedule });
            };
            reader.readAsArrayBuffer(file);

            e.target.value = null; // reset input
          }}
        />
      </label>

     {/* Submit All */}
<button
  onClick={() => {
    const drafts = subj.students.filter((s) => s.status !== "submitted");
    if (drafts.length === 0) {
      Toast.fire({ icon: "info", title: "No draft grades to submit." });
      return;
    }

    Swal.fire({
      title: "Submit All Grades?",
      text: `This will submit ${drafts.length} draft grade(s). Once submitted, they cannot be edited.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#16a34a", // green-600
      cancelButtonColor: "#6b7280",  // gray-500
      confirmButtonText: "Yes, submit all",
    }).then((result) => {
      if (result.isConfirmed) {
        router.post(
          route("faculty.grades.add"),
          {
            grades: drafts.map((s) => ({
              enrollment_id: s.enrollment_id,
              class_schedule_id: subj.class_schedule_id,
              midterm: s.midterm,
              final: s.final,
              remarks: s.remarks,
              status: "submitted",
            })),
          },
          {
            onSuccess: () => {
              Toast.fire({ icon: "success", title: "All grades submitted!" });

              // update local state
              const updatedSchedules = localSchedules.map((sched) =>
                sched.id === subj.class_schedule_id
                  ? {
                      ...sched,
                      students: sched.students.map((s) =>
                        drafts.find((d) => d.enrollment_id === s.enrollment_id)
                          ? { ...s, status: "submitted" }
                          : s
                      ),
                    }
                  : sched
              );
              setLocalSchedules(updatedSchedules);
            },
            onError: () =>
              Toast.fire({ icon: "error", title: "Failed to submit all grades!" }),
          }
        );
      }
    });
  }}
  className="bg-green-600 text-white px-3 py-1 rounded-md text-xs hover:bg-green-700 transition-all shadow-sm"
>
  Submit All
</button>

    </div>


                              {/* Students Table */}
                              <table className="w-full text-xs border border-gray-200 rounded-lg">
                                <thead className="bg-gray-100 text-gray-600 sticky top-0">
                                  <tr>
                                    <th className="p-2 border-b text-left">#</th>
                                    <th className="p-2 border-b text-left">
                                      Student Name
                                    </th>
                                    <th className="p-2 border-b">Midterm</th>
                                    <th className="p-2 border-b">Final</th>
                                    <th className="p-2 border-b">Remarks</th>
                                    <th className="p-2 border-b text-center">
                                      Action
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {subj.students.map((student, idx) => (
                                    <tr
                                      key={student.enrollment_id}
                                      className="hover:bg-gray-50 transition"
                                    >
                                      <td className="p-2">{idx + 1}</td>
                                      <td className="p-2 flex items-center gap-2">
                                        <span>{student.name}</span>
                                        {student.status === "submitted" ? (
                                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                            Submitted
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                                            Draft
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-2 text-center">
                                        {student.midterm ?? "-"}
                                      </td>
                                      <td className="p-2 text-center">
                                        {student.final ?? "-"}
                                      </td>
                                      <td className="p-2 text-center">
                                        <span
                                          className={`font-semibold ${
                                            (student.remarks ?? "Incomplete") ===
                                            "Passed"
                                              ? "text-green-600"
                                              : (student.remarks ??
                                                  "Incomplete") === "Failed"
                                              ? "text-red-600"
                                              : "text-gray-500"
                                          }`}
                                        >
                                          {student.remarks ?? "Incomplete"}
                                        </span>
                                      </td>
                                      <td className="p-2 text-center">
                                        <button
                                          onClick={() =>
                                            setSelectedStudent({
                                              ...student,
                                              class_schedule_id:
                                                subj.class_schedule_id,
                                            })
                                          }
                                          className="text-blue-600 hover:text-blue-800 transition"
                                          aria-label={`Edit grade for ${student.name}`}
                                        >
                                          <Plus size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Grade Modal */}
        {selectedStudent && (
          <GradeModal
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
            onSave={saveStudentGrade}
          />
        )}

        {/* Import Preview Modal */}
        {previewData && (
          <ImportPreviewModal
            fileData={previewData}
            onClose={() => {
              setPreviewData(null);
              setPendingImport(null);
            }}
            onConfirm={() => {
              if (!pendingImport) return;
              const { file, classSchedule } = pendingImport;

              router.post(
                route("faculty.grades.import"),
                {
                  file,
                  class_schedule_id: classSchedule.id,
                },
                {
                  forceFormData: true,
                  onSuccess: () => {
                    Toast.fire({
                      icon: "success",
                      title: "Grades imported successfully!",
                    });
                    setPreviewData(null);
                    setPendingImport(null);
                  },
                  onError: () =>
                    Toast.fire({
                      icon: "error",
                      title: "Failed to import grades!",
                    }),
                }
              );
            }}
          />
        )}
      </div>
    </FacultyLayout>
  );
}
