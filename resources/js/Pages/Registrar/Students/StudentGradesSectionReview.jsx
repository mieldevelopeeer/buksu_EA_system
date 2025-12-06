import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Head, router } from "@inertiajs/react";
import {
  ArrowLeft,
  ChalkboardTeacher,
  Check,
  XCircle,
  Clock,
  UsersThree,
  SquaresFour,
  WarningCircle,
} from "phosphor-react";
import Swal from "sweetalert2";

const safeRoute = (name, fallback, params = {}, absolute = false) => {
  if (typeof route !== "function") {
    return fallback;
  }
  try {
    return route(name, params, absolute);
  } catch (error) {
    return fallback;
  }
};

const formatStudentName = (student = {}) => {
  const last = (student?.last_name || student?.lName || "").trim();
  const first = (student?.first_name || student?.fName || "").trim();
  const middle = (student?.middle_name || student?.mName || "").trim();
  const parts = [];
  if (last) {
    parts.push(`${last},`);
  }
  if (first) {
    parts.push(first);
  }
  if (middle) {
    parts.push(middle);
  }
  if (!parts.length) {
    return student?.name || student?.full_name || "Unnamed";
  }
  return parts.join(" ").replace(/\s+/g, " ");
};

const sortStudentsByName = (students = []) => {
  return [...students].sort((a, b) => {
    const nameA = (formatStudentName(a) || "").toLowerCase();
    const nameB = (formatStudentName(b) || "").toLowerCase();
    if (!nameA && !nameB) return 0;
    if (!nameA) return 1;
    if (!nameB) return -1;
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });
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

export default function StudentGradesSectionReview({
  user,
  course,
  year,
  section,
  subject,
  activeSemester = null,
  focus = null,
}) {
  const confirmGradeUrl = useMemo(() => safeRoute("grades.confirmGrade", "/registrar/grades/confirm"), []);
  const students = useMemo(() => subject?.students ?? [], [subject?.students]);
  const sortedStudents = useMemo(() => sortStudentsByName(students), [students]);
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedGrade, setSelectedGrade] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTerm, setModalTerm] = useState("");
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [changeModalStudent, setChangeModalStudent] = useState(null);
  const [changeModalTerm, setChangeModalTerm] = useState("");
  const [focusedStudentId, setFocusedStudentId] = useState(focus?.student_id ?? null);
  const [focusTerm, setFocusTerm] = useState(focus?.term ?? "");
  const [focusDismissed, setFocusDismissed] = useState(false);
  const studentRowRefs = useRef({});
  const dismissedFocusRef = useRef(new Set());

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  });

  const confirmProceed = async ({ title, text, confirmText = "Yes, continue", cancelText = "Cancel" }) => {
    const { isConfirmed } = await Swal.fire({
      title,
      text,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
    });
    return isConfirmed;
  };

  const refreshPage = useCallback(() => {
    if (typeof window === "undefined") return;
    router.visit(window.location.href, {
      preserveScroll: true,
      replace: true,
    });
  }, []);

  const closeModal = () => {
    setModalOpen(false);
    setSelectedGrade(null);
    setModalTerm("");
  };

  const closeChangeModal = () => {
    setChangeModalOpen(false);
    setChangeModalStudent(null);
    setChangeModalTerm("");
  };

  const openConfirmModal = (student, preferredTerm = "") => {
    if (!student) return;
    setSelectedGrade(student);
    const normalizedTerm = preferredTerm ? preferredTerm.toLowerCase() : getDefaultTerm(student);
    setModalTerm(normalizedTerm);
    setModalOpen(true);
  };

  const openChangeRequestModal = (student, term = "") => {
    if (!student) return;
    setChangeModalStudent(student);
    const resolvedTerm = term || getRequestedTermOptions(student)[0]?.value || "";
    setChangeModalTerm(resolvedTerm);
    setChangeModalOpen(true);
  };

  const backToSubjects = () => {
    const params = { course: course.id, year: year.id, section: section.id };
    if (course.major_id) params.major_id = course.major_id;
    router.visit(route("registrar.student.grades.course.year.section", params));
  };

  const handleConfirm = async (status) => {
    if (!selectedGrade) return;
    if (!modalTerm) {
      Toast.fire({ icon: "info", title: "Select a term to proceed." });
      return;
    }

    const proceed = await confirmProceed({
      title: status === "confirmed" ? "Confirm submitted grade?" : "Reject submitted grade?",
      text:
        status === "confirmed"
          ? "This will set the selected term's status to confirmed."
          : "This will reject the selected term's submission.",
      confirmText: status === "confirmed" ? "Confirm" : "Reject",
    });

    if (!proceed) return;

    router.post(
      confirmGradeUrl,
      {
        enrollment_id: selectedGrade.enrollment_id,
        class_schedule_id: subject.class_schedule_id,
        final_status: status,
        term: modalTerm,
      },
      {
        onSuccess: () => {
          const key = getStudentIdentifier(selectedGrade);
          if (key) {
            dismissedFocusRef.current.add(key);
            setFocusedStudentId(null);
            setFocusTerm("");
            setFocusDismissed(true);
          }
          closeModal();
          Toast.fire({
            icon: "success",
            title: status === "confirmed" ? "Grade confirmed!" : "Grade rejected!",
          }).then(() => {
            refreshPage();
          });
        },
        onError: (errors) => {
          const message = errors?.term || errors?.final_status || "Failed to update grade!";
          Toast.fire({ icon: "error", title: message });
        },
      }
    );
  };

  const handleChangeDecision = async (status) => {
    if (!changeModalStudent || !changeModalTerm) {
      Toast.fire({ icon: "info", title: "Select a term to proceed." });
      return;
    }

    const proceed = await confirmProceed({
      title: status === "confirmed" ? "Approve change request?" : "Deny change request?",
      text:
        status === "confirmed"
          ? "This will approve the faculty's requested change for the selected term."
          : "This will deny the requested change and keep the previous value.",
      confirmText: status === "confirmed" ? "Approve" : "Deny",
    });

    if (!proceed) return;

    router.post(
      confirmGradeUrl,
      {
        enrollment_id: changeModalStudent.enrollment_id,
        class_schedule_id: subject.class_schedule_id,
        final_status: status,
        term: changeModalTerm,
      },
      {
        onSuccess: () => {
          const key = getStudentIdentifier(changeModalStudent);
          if (key) {
            dismissedFocusRef.current.add(key);
            setFocusedStudentId(null);
            setFocusTerm("");
            setFocusDismissed(true);
          }
          closeChangeModal();
          Toast.fire({
            icon: "success",
            title: status === "confirmed" ? "Request approved!" : "Request denied!",
          }).then(() => {
            refreshPage();
          });
        },
        onError: (errors) => {
          const message = errors?.term || errors?.final_status || "Failed to update request.";
          Toast.fire({ icon: "error", title: message });
        },
      }
    );
  };

  const handleConfirmAll = async () => {
    if (!subject?.students?.length) {
      Toast.fire({ icon: "info", title: "No students to confirm." });
      return;
    }

    const termOptions = buildSubjectTermOptions(subject.students);

    if (termOptions.length === 0) {
      Toast.fire({ icon: "info", title: "No submitted grades to confirm." });
      return;
    }

    const { value: term } = await Swal.fire({
      title: "Confirm which term?",
      input: "radio",
      inputOptions: termOptions.reduce((acc, option) => {
        acc[option.value] = option.label;
        return acc;
      }, {}),
      inputValue: termOptions[termOptions.length - 1]?.value,
      showCancelButton: true,
      confirmButtonText: "Continue",
      cancelButtonText: "Cancel",
      inputValidator: (value) => {
        if (!value) {
          return "Please select a term.";
        }
      },
    });

    if (!term) return;

    const eligible = subject.students.filter((student) => canConfirmTerm(student, term));

    if (eligible.length === 0) {
      Toast.fire({ icon: "info", title: "No grades available for that term." });
      return;
    }

    const proceed = await confirmProceed({
      title: "Confirm all submitted grades?",
      text: `This will mark ${eligible.length} ${eligible.length === 1 ? "student" : "students"} as confirmed for the ${term} term.`,
      confirmText: "Confirm all",
    });

    if (!proceed) return;

    let completed = 0;
    const total = eligible.length;

    eligible.forEach((student) => {
      router.post(confirmGradeUrl, {
        enrollment_id: student.enrollment_id,
        class_schedule_id: subject.class_schedule_id,
        final_status: "confirmed",
        term,
      }, {
        onFinish: () => {
          completed += 1;
          if (completed === total) {
            refreshPage();
          }
        },
      });
    });

    Toast.fire({ icon: "success", title: `All ${term} grades confirmed!` });
  };

  const passed = sortedStudents.filter((s) => s.remarks === "Passed").length;
  const failed = sortedStudents.filter((s) => s.remarks === "Failed").length;
  const incomplete = sortedStudents.length - passed - failed;

  const pending = pendingCount(sortedStudents);
  const changeRequests = sortedStudents
    .map((student) => {
      const terms = getRequestedTermOptions(student);
      if (!terms.length) return null;
      return {
        id: student.id ?? student.enrollment_id,
        name: formatStudentName(student),
        parts: terms.map((term) => term.label),
        terms,
        student,
      };
    })
    .filter(Boolean);

  useEffect(() => {
    if (!focus) return;
    const focusId = focus.student_id ? String(focus.student_id) : null;
    const focusTermValue = (focus.term || "").toLowerCase();
    if (!focusId) {
      setFocusedStudentId(null);
      setFocusTerm("");
      setFocusDismissed(true);
      return;
    }

    if (dismissedFocusRef.current.has(focusId)) {
      setFocusedStudentId(null);
      setFocusTerm("");
      setFocusDismissed(true);
      return;
    }

    const targetStudent = sortedStudents.find((student) => String(student.id) === focusId || String(student.enrollment_id) === focusId);
    const actionable = !focusTermValue || canConfirmTerm(targetStudent, focusTermValue);

    if (!actionable) {
      dismissedFocusRef.current.add(focusId);
      setFocusedStudentId(null);
      setFocusTerm("");
      setFocusDismissed(true);
      return;
    }

    setFocusedStudentId(focusId);
    setFocusTerm(focus.term ?? "");
    setFocusDismissed(false);
  }, [focus, sortedStudents]);

  const normalizedFocusedStudentId = focusedStudentId ? String(focusedStudentId) : null;
  const focusStudentEntry = normalizedFocusedStudentId
    ? sortedStudents.find((student) => String(student.id) === normalizedFocusedStudentId)
    : null;

  const getWorkflowState = (student) => {
    if (!student) return "draft";
    const requested = getRequestedParts(student);
    if (requested.length) return "change";
    const midStatus = normalizeStatus(student.midterm_status);
    const finalStatus = normalizeStatus(student.final_status);
    const allConfirmed = midStatus === "confirmed" && finalStatus === "confirmed";
    if (allConfirmed) return "confirmed";
    const anySubmitted = [midStatus, finalStatus].some((status) => status === "submitted");
    if (anySubmitted) return "pending";
    return "draft";
  };

  const filterCounts = useMemo(() => {
    const counts = {
      all: sortedStudents.length,
      pending: 0,
      change: changeRequests.length,
      confirmed: 0,
      draft: 0,
    };
    sortedStudents.forEach((student) => {
      const state = getWorkflowState(student);
      if (state === "pending") counts.pending += 1;
      if (state === "change") counts.change += 1;
      if (state === "confirmed") counts.confirmed += 1;
      if (state === "draft") counts.draft += 1;
    });
    return counts;
  }, [sortedStudents, changeRequests.length]);

  const filterOptions = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "change", label: "Change Requests" },
    { value: "confirmed", label: "Confirmed" },
    { value: "draft", label: "Draft" },
  ];

  const filteredStudents = useMemo(() => {
    return sortedStudents.filter((student) => {
      const state = getWorkflowState(student);
      if (statusFilter === "pending") return state === "pending";
      if (statusFilter === "change") return state === "change";
      if (statusFilter === "confirmed") return state === "confirmed";
      if (statusFilter === "draft") return state === "draft";
      return true;
    });
  }, [sortedStudents, statusFilter]);

  useEffect(() => {
    if (!normalizedFocusedStudentId) return;
    const targetRow = studentRowRefs.current[normalizedFocusedStudentId];
    if (targetRow && typeof targetRow.scrollIntoView === "function") {
      targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
      targetRow.focus?.();
    }
  }, [normalizedFocusedStudentId]);

  const clearFocusState = () => {
    if (focusedStudentId) {
      dismissedFocusRef.current.add(focusedStudentId);
    }
    setFocusedStudentId(null);
    setFocusTerm("");
    setFocusDismissed(true);
  };

  return (
    <RegistrarLayout user={user}>
      <Head title={`Review • ${section?.name ?? "Section"}`} />
      <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-4 font-sans text-slate-700">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={backToSubjects}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{course?.code}</p>
            <h1 className="text-lg font-semibold text-slate-900">{subject?.subject}</h1>
            <p className="text-[12px] text-slate-500">
              {section?.name} • {year?.label}
              {activeSemester ? ` • ${activeSemester.semester}` : ""}
            </p>
          </div>
        </div>

        {!focusDismissed && focusStudentEntry && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            <span>
              Focused on <strong>{focusStudentEntry.name}</strong>
              {focusTerm ? ` • ${focusTerm}` : ""}
            </span>
            <button
              type="button"
              onClick={clearFocusState}
              className="ml-auto inline-flex items-center rounded-full border border-amber-200 px-2 py-0.5 text-[10px] font-semibold hover:bg-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {changeRequests.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-800">
            <div className="flex items-center gap-2">
              <WarningCircle size={16} /> {changeRequests.length} change request{changeRequests.length === 1 ? "" : "s"}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
              {changeRequests.slice(0, 4).map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => openChangeRequestModal(request.student, request.terms[0]?.value)}
                  className="rounded-full border border-amber-200 bg-white px-2 py-0.5 font-semibold text-amber-700"
                >
                  {request.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          <div className="flex items-center gap-1">
            <ChalkboardTeacher size={12} /> Faculty: <span className="font-semibold text-slate-800">{subject?.faculty ?? "N/A"}</span>
          </div>
          <div className="flex items-center gap-1">
            <UsersThree size={12} /> {sortedStudents.length} students
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} /> {pending} pending
          </div>
          {sortedStudents.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmAll}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-100"
            >
              <Check size={12} /> Confirm all
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
          <label className="font-semibold" htmlFor="statusFilter">
            Status filter
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-[11px]"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({filterCounts[option.value] ?? 0})
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Student roster</h2>
            <span className="text-[11px] text-slate-400">{filteredStudents.length} record(s)</span>
          </div>
          {filteredStudents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-[12px] text-slate-400">
              No students match the selected filter or search.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student, index) => {
                const midtermStatus = normalizeStatus(student.midterm_status);
                const finalStatus = normalizeStatus(student.final_status);
                const showMidterm = midtermStatus !== "draft";
                const showFinal = finalStatus !== "draft";
                const showRemarks = showMidterm && showFinal;
                const termOptions = getStudentTermOptions(student);
                const canConfirm = termOptions.length > 0;
                const studentKey = String(student.id ?? index);
                const isFocused = normalizedFocusedStudentId && studentKey === normalizedFocusedStudentId;
                const requestedTermOptions = getRequestedTermOptions(student);
                const requestedParts = requestedTermOptions.map((option) => option.label);

                return (
                  <div
                    key={`${student.id}-${index}`}
                    ref={(el) => {
                      if (el) {
                        studentRowRefs.current[studentKey] = el;
                      } else {
                        delete studentRowRefs.current[studentKey];
                      }
                    }}
                    tabIndex={isFocused ? 0 : -1}
                    className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition focus:outline-none ${
                      isFocused ? "ring-2 ring-amber-200" : "hover:border-slate-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Student #{index + 1}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-800">{formatStudentName(student)}</span>
                          {isFocused && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                              Focus
                            </span>
                          )}
                          {requestedParts.length > 0 && (
                            <button
                              type="button"
                              onClick={() => openChangeRequestModal(student, requestedTermOptions[0]?.value)}
                              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-800"
                            >
                              <WarningCircle size={10} /> {requestedParts.join(" & ")}
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">ID: {getStudentIdNumber(student) ?? "N/A"}</p>
                      </div>
                      <div className="flex flex-col gap-1 text-right text-[10px] text-slate-500">
                        <span className={renderStatusBadge(student.midterm_status)}>Midterm • {(student.midterm_status || "Draft").replace(/^./, (char) => char.toUpperCase())}</span>
                        <span className={renderStatusBadge(student.final_status)}>Final • {(student.final_status || "Draft").replace(/^./, (char) => char.toUpperCase())}</span>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 text-[11px] text-slate-600 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Midterm</p>
                        <p className="text-sm font-semibold text-slate-700">{showMidterm ? student.midterm ?? "-" : "—"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Final</p>
                        <p className="text-sm font-semibold text-slate-700">{showFinal ? student.final ?? "-" : "—"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Remarks</p>
                        {showRemarks ? (
                          <span className={renderRemarksBadge(student.remarks)}>{student.remarks ?? "Incomplete"}</span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-widest text-slate-400">Waiting</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={getDefaultTerm(student)}
                        disabled={!canConfirm}
                        onChange={(e) => openConfirmModal(student, e.target.value)}
                        className="w-48 rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] text-slate-600 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                      >
                        {canConfirm ? (
                          getStudentTermOptions(student).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))
                        ) : (
                          <option value="">No submissions</option>
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => openConfirmModal(student)}
                        disabled={!canConfirm}
                        className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-700 shadow-sm transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                      >
                        <Check size={12} /> Review
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {modalOpen && selectedGrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">Grade Review</p>
                  <h2 className="text-base font-semibold text-slate-800">{formatStudentName(selectedGrade)}</h2>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-slate-200 p-1 text-slate-400 transition hover:text-slate-600"
                >
                  <XCircle size={18} />
                </button>
              </div>
              <div className="mt-4 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>Faculty</span>
                  <span className="font-semibold text-slate-700">{subject?.faculty ?? "-"}</span>
                  <span className="text-slate-400">ID: {getStudentIdNumber(selectedGrade) ?? "N/A"}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]">
                  <span><span className="font-semibold text-slate-700">Midterm:</span> {selectedGrade.midterm ?? "-"}</span>
                  <span><span className="font-semibold text-slate-700">Final:</span> {selectedGrade.final ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Remarks:</span>
                  <span className={renderRemarksBadge(selectedGrade.remarks)}>{selectedGrade.remarks ?? "Incomplete"}</span>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Term to apply</label>
                  <select
                    value={modalTerm}
                    onChange={(e) => setModalTerm(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] text-slate-700 focus:border-sky-400 focus:outline-none"
                  >
                    <option value="" disabled>
                      Select term
                    </option>
                    {getStudentTermOptions(selectedGrade).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-[12px] font-semibold">
                <button
                  type="button"
                  onClick={() => handleConfirm("confirmed")}
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-500/10 px-4 py-2 text-emerald-700 transition hover:bg-emerald-500 hover:text-white"
                >
                  <Check size={14} className="mr-1" /> Confirm
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirm("rejected")}
                  className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-rose-700 transition hover:bg-rose-500 hover:text-white"
                >
                  <XCircle size={14} className="mr-1" /> Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {changeModalOpen && changeModalStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border border-amber-100 bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-amber-500">Change request</p>
                  <h2 className="text-base font-semibold text-slate-800">{formatStudentName(changeModalStudent)}</h2>
                </div>
                <button
                  type="button"
                  onClick={closeChangeModal}
                  className="rounded-full border border-slate-200 p-1 text-slate-400 transition hover:text-slate-600"
                >
                  <XCircle size={18} />
                </button>
              </div>
              <div className="mt-4 space-y-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-xs text-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>Requested term</span>
                  <span className="font-semibold text-slate-800">{formatTermLabel(changeModalTerm)}</span>
                  <span className="text-slate-400">ID: {getStudentIdNumber(changeModalStudent) ?? "N/A"}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]">
                  <span><span className="font-semibold text-slate-700">Midterm:</span> {changeModalStudent.midterm ?? "-"}</span>
                  <span><span className="font-semibold text-slate-700">Final:</span> {changeModalStudent.final ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Remarks:</span>
                  <span className={renderRemarksBadge(changeModalStudent.remarks)}>{changeModalStudent.remarks ?? "Incomplete"}</span>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-[12px] font-semibold">
                <button
                  type="button"
                  onClick={() => handleChangeDecision("confirmed")}
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-500/10 px-4 py-2 text-emerald-700 transition hover:bg-emerald-500 hover:text-white"
                >
                  <Check size={14} className="mr-1" /> Approve request
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeDecision("rejected")}
                  className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-rose-700 transition hover:bg-rose-500 hover:text-white"
                >
                  <XCircle size={14} className="mr-1" /> Deny request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}

function pendingCount(subject) {
  if (!subject?.students?.length) return 0;
  return subject.students.filter((student) => normalizeStatus(student.final_status) === "submitted").length;
}

const normalizeStatus = (status) => (status || "draft").toLowerCase();

const getStudentTermOptions = (student) => {
  if (!student) return [];
  const options = [];
  const midtermSubmitted = normalizeStatus(student.midterm_status) === "submitted";
  const finalSubmitted = normalizeStatus(student.final_status) === "submitted";

  if (midtermSubmitted) {
    options.push({ value: "midterm", label: "Midterm only" });
  }
  if (finalSubmitted) {
    options.push({ value: "final", label: "Final only" });
  }
  if (midtermSubmitted && finalSubmitted) {
    options.push({ value: "both", label: "Midterm & Final" });
  }

  return options;
};

const getDefaultTerm = (student) => {
  const options = getStudentTermOptions(student);
  if (!options.length) return "";
  const both = options.find((opt) => opt.value === "both");
  if (both) return both.value;
  const final = options.find((opt) => opt.value === "final");
  if (final) return final.value;
  return options[0].value;
};

const canConfirmTerm = (student, term) => {
  if (!student || !term) return false;
  const midtermSubmitted = normalizeStatus(student.midterm_status) === "submitted";
  const finalSubmitted = normalizeStatus(student.final_status) === "submitted";

  if (term === "midterm") return midtermSubmitted;
  if (term === "final") return finalSubmitted;
  if (term === "both") return midtermSubmitted && finalSubmitted;
  return false;
};

const buildSubjectTermOptions = (students = []) => {
  const options = [];
  if (students.some((student) => canConfirmTerm(student, "midterm"))) {
    options.push({ value: "midterm", label: "Midterm only" });
  }
  if (students.some((student) => canConfirmTerm(student, "final"))) {
    options.push({ value: "final", label: "Final only" });
  }
  if (students.some((student) => canConfirmTerm(student, "both"))) {
    options.push({ value: "both", label: "Midterm & Final" });
  }
  return options;
};

const getRequestedTermOptions = (student) => {
  if (!student) return [];
  const options = [];
  const midtermChange = (student.midterm_change_status || "none").toLowerCase();
  const finalChange = (student.final_change_status || "none").toLowerCase();

  if (midtermChange === "requested") {
    options.push({ value: "midterm", label: "Midterm" });
  }
  if (finalChange === "requested") {
    options.push({ value: "final", label: "Final" });
  }

  return options;
};

const getRequestedParts = (student) => getRequestedTermOptions(student).map((option) => option.label);

const formatTermLabel = (term) => {
  if (!term) return "—";
  if (term === "both") return "Midterm & Final";
  return term.replace(/^./, (char) => char.toUpperCase());
};

const getStudentIdentifier = (student) => {
  if (!student) return null;
  return String(student.id ?? student.enrollment_id ?? "");
};

const getStudentIdNumber = (student) => {
  if (!student) return null;
  return student.id_number || student.student_number || student.student?.id_number || null;
};

