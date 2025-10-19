import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Head, router } from "@inertiajs/react";
import { motion } from "framer-motion";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import {
  ArrowLeft,
  CheckSquare,
  Square,
  MagnifyingGlass,
  ClipboardText,
  Books,
  Notepad,
} from "phosphor-react";
import Swal from "sweetalert2";

export default function CreditingSubjects({
  enrollment = {},
  student = {},
  groupedSubjects = [],
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectCodeFilter, setSubjectCodeFilter] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [creditUnits, setCreditUnits] = useState({});
  const [creditRemarks, setCreditRemarks] = useState({});

  const resolvedStudent = useMemo(() => {
    if (student && (student.fName || student.lName)) return student;
    if (enrollment?.student) return enrollment.student;
    return {};
  }, [student, enrollment]);

  const studentName = useMemo(() => {
    const first = resolvedStudent?.fName ?? "";
    const last = resolvedStudent?.lName ?? "";
    const middle = resolvedStudent?.mName ? ` ${resolvedStudent.mName}` : "";
    const suffix = resolvedStudent?.suffix ? ` ${resolvedStudent.suffix}` : "";
    const full = `${first}${middle} ${last}${suffix}`.trim();
    return full.length > 0 ? full : "—";
  }, [resolvedStudent]);

  const programName = useMemo(() => {
    return (
      enrollment?.program_name ??
      enrollment?.course?.name ??
      resolvedStudent?.program ??
      "—"
    );
  }, [enrollment, resolvedStudent]);

  const programCode = useMemo(() => {
    return (
      enrollment?.course?.code ??
      enrollment?.program_code ??
      resolvedStudent?.program_code ??
      null
    );
  }, [enrollment, resolvedStudent]);

  const departmentName = useMemo(() => {
    return (
      enrollment?.department_name ??
      enrollment?.course?.department?.department ??
      resolvedStudent?.department ??
      null
    );
  }, [enrollment, resolvedStudent]);

  const yearLevelName = useMemo(() => {
    return (
      enrollment?.year_level_name ??
      enrollment?.yearLevel?.year_level ??
      enrollment?.year_level?.year_level ??
      resolvedStudent?.year_level ??
      "—"
    );
  }, [enrollment, resolvedStudent]);

  const semesterName = useMemo(() => {
    return (
      enrollment?.semester_name ??
      enrollment?.semester?.semester ??
      resolvedStudent?.semester ??
      "—"
    );
  }, [enrollment, resolvedStudent]);

  const normalizedGroups = useMemo(() => {
    return Array.isArray(groupedSubjects)
      ? groupedSubjects.map((group) => ({
          year_level: group?.year_level ?? "N/A",
          subjects: Array.isArray(group?.subjects) ? group.subjects : [],
        }))
      : [];
  }, [groupedSubjects]);

  const subjectCodeOptions = useMemo(() => {
    const map = new Map();
    normalizedGroups.forEach((group) => {
      group.subjects.forEach((subject) => {
        const code = subject?.subject_code;
        if (!code) return;
        if (!map.has(code)) {
          map.set(code, subject?.subject_title ?? "Untitled Subject");
        }
      });
    });
    return Array.from(map.entries())
      .map(([code, title]) => ({ code, title }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [normalizedGroups]);

  const selectedSubjectOption = useMemo(() => {
    if (!subjectCodeFilter) return null;
    return subjectCodeOptions.find((option) => option.code === subjectCodeFilter) ?? null;
  }, [subjectCodeFilter, subjectCodeOptions]);

  useEffect(() => {
    const defaults = new Set();
    const units = {};
    const remarks = {};

    normalizedGroups.forEach((group) => {
      group.subjects.forEach((subject) => {
        if (subject.is_credited) {
          defaults.add(subject.id);
          units[subject.id] =
            subject?.credited_units ?? subject?.total_units ?? (subject?.lec_unit || 0) + (subject?.lab_unit || 0);
          if (subject?.remarks) {
            remarks[subject.id] = subject.remarks;
          }
        }
      });
    });

    setSelectedSubjects(Array.from(defaults));
    setCreditUnits(units);
    setCreditRemarks(remarks);
  }, [normalizedGroups]);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const codeFilter = subjectCodeFilter.trim().toLowerCase();

    if (!term && !codeFilter) return normalizedGroups;

    return normalizedGroups
      .map((group) => ({
        ...group,
        subjects: group.subjects.filter((subject) => {
          const code = subject?.subject_code ?? "";
          const title = subject?.subject_title ?? "";
          const course = programName ?? "";
          const dept = departmentName ?? "";
          const matchesSearch = !term || `${code} ${title} ${course} ${dept}`.toLowerCase().includes(term);
          const matchesCode = !codeFilter || code.toLowerCase() === codeFilter;
          return matchesSearch && matchesCode;
        }),
      }))
      .filter((group) => group.subjects.length > 0);
  }, [normalizedGroups, searchTerm, subjectCodeFilter, programName, departmentName]);

  const handleToggleSubject = useCallback(
    (subject) => {
      setSelectedSubjects((prev) => {
        if (prev.includes(subject.id)) {
          return prev.filter((id) => id !== subject.id);
        }

        const next = [...prev, subject.id];
        if (!creditUnits[subject.id]) {
          setCreditUnits((curr) => ({
            ...curr,
            [subject.id]:
              subject?.total_units ?? (subject?.lec_unit || 0) + (subject?.lab_unit || 0),
          }));
        }
        return next;
      });
    },
    [creditUnits]
  );

  const handleUnitChange = useCallback((subjectId, value) => {
    setCreditUnits((prev) => ({
      ...prev,
      [subjectId]: value,
    }));
  }, []);

  const handleRemarkChange = useCallback((subjectId, value) => {
    setCreditRemarks((prev) => ({
      ...prev,
      [subjectId]: value,
    }));
  }, []);

  const handleSave = useCallback(() => {
    if (!enrollment?.id) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "Missing enrollment context.",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
      return;
    }

    if (selectedSubjects.length === 0) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: "Select at least one subject to credit.",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
      return;
    }

    const payload = selectedSubjects.map((id) => ({
      curriculum_subject_id: id,
      credited_units: parseFloat(creditUnits[id] ?? 0) || 0,
      remarks: creditRemarks[id] ?? "",
    }));

    Swal.fire({
      title: "Saving credited subjects...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    router.post(
      route("program-head.subjectload.credit"),
      {
        enrollment_id: enrollment.id,
        subjects: payload,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Credited subjects saved!",
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
          });
        },
        onError: () => {
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "error",
            title: "Failed to save credited subjects.",
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
          });
        },
      }
    );
  }, [enrollment?.id, selectedSubjects, creditUnits, creditRemarks]);

  const handleBack = useCallback(() => {
    if (!enrollment?.id) {
      router.visit(route("program-head.enrollment.index"));
      return;
    }

    router.visit(route("program-head.evaluation.subjectload", { id: enrollment.id }));
  }, [enrollment?.id]);

  return (
    <ProgramHeadLayout>
      <Head title="Credit Subjects" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="mx-auto max-w-5xl space-y-5 px-4 py-5 md:space-y-6 md:px-5 md:py-8"
      >
        <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-slate-50/70 p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
                <ClipboardText size={13} weight="duotone" /> Credit Subjects
              </div>
              <div>
                <h1 className="text-[1.45rem] font-semibold text-slate-900 md:text-[1.6rem]">
                  Manage Subject Crediting
                </h1>
                <p className="max-w-xl text-[12px] text-slate-500">
                  Select curriculum subjects to credit for the student, adjust credited units, and leave optional remarks.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm">
                  <Books size={12} className="text-sky-500" /> {programName ?? "Program"}
                </span>
                {programCode && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Code</span>
                    <span className="text-[11px] font-semibold text-slate-700">{programCode}</span>
                  </span>
                )}
                {departmentName && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Dept</span>
                    <span className="text-[11px] font-semibold text-slate-700">{departmentName}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm">
                  <Notepad size={12} className="text-emerald-500" /> {yearLevelName}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[11.5px] font-medium text-slate-600 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
              >
                <ArrowLeft size={16} /> Back to Subject Load
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-[12px] font-semibold text-white shadow-[0_16px_28px_RGBA(16,185,129,0.18)] transition hover:bg-emerald-700"
              >
                <CheckSquare size={16} /> Save Credits
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm md:px-4 md:py-3">
          <div className="grid gap-2.5 text-[12.5px] text-slate-600 sm:grid-cols-2">
            <div>
              <span className="font-semibold text-slate-800">Student:</span> {studentName}
            </div>
            <div>
              <span className="font-semibold text-slate-800">Course:</span> {programName}
            </div>
            {departmentName && (
              <div>
                <span className="font-semibold text-slate-800">Department:</span> {departmentName}
              </div>
            )}
            <div>
              <span className="font-semibold text-slate-800">Year Level:</span> {yearLevelName}
            </div>
            <div>
              <span className="font-semibold text-slate-800">Semester:</span> {semesterName}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm md:px-4 md:py-3">
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code, title, course, or department..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-600 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm md:px-4 md:py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Filter by Subject Code
              </label>
              <span className="text-[11px] text-slate-500">
                Narrow the list to show subjects matching a specific course code.
              </span>
            </div>
            <div className="w-full md:w-64">
              <select
                value={subjectCodeFilter}
                onChange={(e) => setSubjectCodeFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="">All subject codes</option>
                {subjectCodeOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {selectedSubjectOption && (
            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11.5px] text-slate-600">
              <span className="font-semibold text-slate-700">Subject:</span> {selectedSubjectOption.title}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm md:px-4 md:py-3">
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <div key={group.year_level} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {group.year_level}
                    </h2>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {group.subjects.map((subject) => {
                      const isSelected = selectedSubjects.includes(subject.id);
                      const creditedUnits =
                        creditUnits[subject.id] ??
                        subject?.credited_units ??
                        subject?.total_units ??
                        (subject?.lec_unit || 0) + (subject?.lab_unit || 0);

                      return (
                        <motion.div
                          key={subject.id}
                          whileHover={{ y: -1.5 }}
                          className={`flex flex-col gap-2.5 rounded-xl border px-3.5 py-3 shadow-sm transition ${
                            isSelected ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSubject(subject)}
                              className="mt-1 h-4 w-4 accent-emerald-500"
                            />
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-600">
                                  {subject?.subject_code ?? "—"}
                                </span>
                                <span className="text-[13px] font-semibold text-slate-800">
                                  {subject?.subject_title ?? "Untitled Subject"}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-slate-500">
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                                  Units: {subject?.total_units ?? (subject?.lec_unit || 0) + (subject?.lab_unit || 0)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                                  Semester: {subject?.semester ?? "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="flex flex-col gap-2 md:flex-row">
                              <div className="w-full md:w-28">
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  Credited Units
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={creditedUnits}
                                  onChange={(e) => handleUnitChange(subject.id, e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.75 text-[13px] text-slate-600 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-100"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  Remarks
                                </label>
                                <input
                                  type="text"
                                  value={creditRemarks[subject.id] ?? ""}
                                  onChange={(e) => handleRemarkChange(subject.id, e.target.value)}
                                  placeholder="Optional remarks..."
                                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.75 text-[13px] text-slate-600 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-100"
                                />
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-500">
                No subjects found for the current filter.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </ProgramHeadLayout>
  );
}
