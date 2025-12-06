import React, { useEffect, useMemo, useRef, useState } from "react";
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
  DotsThreeOutlineVertical,
} from "phosphor-react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
});

const computeRemarks = (midterm, final) => {
  if (midterm == null && final == null) return "Incomplete";
  const finalGrade = final ?? midterm;
  return finalGrade <= 3.0 ? "Passed" : "Failed";
};

const hasGradeValue = (value) => value !== null && value !== undefined && value !== "";

const resolveGradeValue = (student, gradePart) => {
  if (!student) return null;
  console.log(`🔍 Resolving ${gradePart} for student:`, { student_id: student.id, midterm: student.midterm, final: student.final });
  if (gradePart === "midterm") {
    return hasGradeValue(student.midterm) ? student.midterm : null;
  }
  const candidates = [student.final, student.summer, student.grade];
  return candidates.find((value) => hasGradeValue(value)) ?? null;
};

const normalizeStudentRecord = (student = {}) => {
  if (!student) return student;
  return {
    ...student,
    midterm: resolveGradeValue(student, "midterm"),
    final: resolveGradeValue(student, "final"),
  };
};

const formatStudentName = (student = {}) => {
  const last = (student?.last_name || "").trim();
  const first = (student?.first_name || "").trim();
  const middle = (student?.middle_name || "").trim();
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
    return (student?.name || "Unnamed")?.trim?.() || "Unnamed";
  }
  return parts.join(" ").replace(/\s+/g, " ");
};

const sortByStudentName = (records = []) => {
  return [...(records ?? [])].sort((a, b) => {
    const nameA = formatStudentName(a).toLowerCase();
    const nameB = formatStudentName(b).toLowerCase();
    if (!nameA && !nameB) return 0;
    if (!nameA) return 1;
    if (!nameB) return -1;
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });
};

const hydrateStudents = (records = []) =>
  sortByStudentName((records ?? []).map((student) => normalizeStudentRecord(student)));

const formatGradeValue = (value) => {
  console.log(`💳 Formatting grade value:`, value, `hasValue: ${hasGradeValue(value)}`);
  if (!hasGradeValue(value)) return "–";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value;
  const fixed = numeric.toFixed(2);
  if (fixed.endsWith(".00")) return fixed.slice(0, -3);
  if (fixed.endsWith("0")) return fixed.slice(0, -1);
  return fixed;
};

const parseGradeNumber = (value) => {
  if (!hasGradeValue(value)) return null;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const submittedLikeStatuses = ["submitted", "confirmed"];

const isPartSubmitted = (student, part) => {
  if (!student) return false;
  const status = student?.[`${part}_status`] ?? "draft";
  return submittedLikeStatuses.includes(status);
};

const getChangeStatus = (student, part) => {
  if (!student) return "none";
  const raw = (student?.[`${part}_change_status`] ?? "none").toLowerCase();
  if (raw !== "none") {
    return raw;
  }
  const partStatus = (student?.[`${part}_status`] ?? "draft").toLowerCase();
  if (partStatus === "confirmed") {
    return "confirmed";
  }
  if (partStatus === "submitted") {
    return "submitted";
  }
  return "none";
};

const canEditPart = (student, part) => {
  if (!student) return false;
  if (!isPartSubmitted(student, part)) return true;
  const changeStatus = getChangeStatus(student, part);
  return changeStatus === "approved";
};

const getEffectiveDraftStatus = (student, part) => {
  const status = student?.[`${part}_status`] ?? "draft";
  if (!submittedLikeStatuses.includes(status)) {
    return status;
  }
  return canEditPart(student, part) ? "draft" : status;
};

const getLockMessage = (student, part) => {
  if (!student) return null;
  const changeStatus = getChangeStatus(student, part);
  if (changeStatus === "requested") {
    return "Change request pending — wait for registrar approval to edit.";
  }
  if (changeStatus === "denied") {
    return "Change request denied — submit a new request to edit.";
  }
  if (changeStatus === "confirmed") {
    return "Registrar confirmed this grade — request a change approval to edit.";
  }
  return "Submitted — request a change to edit.";
};

const deriveOverallStatus = (midtermStatus = "draft", finalStatus = "draft") => {
  const statuses = [midtermStatus, finalStatus];
  const isSubmittedLike = (status) => ["submitted", "confirmed"].includes(status);
  if (statuses.every(isSubmittedLike)) return "submitted";
  if (statuses.some(isSubmittedLike)) return "submitted";
  return "draft";
};

const GradeModal = ({ student, onClose, allowOverride = false }) => {
  const prepareDraftStudent = (record) => ({
    ...normalizeStudentRecord(record),
    midterm_status: getEffectiveDraftStatus(record, "midterm"),
    final_status: getEffectiveDraftStatus(record, "final"),
  });

  const [draftStudent, setDraftStudent] = useState(() => prepareDraftStudent(student));
  const [isSubmitMenuOpen, setIsSubmitMenuOpen] = useState(false);
  const submitMenuRef = useRef(null);

  useEffect(() => {
    console.log("📄 GradeModal opened for student:", student);
    console.log("💾 Draft student state:", draftStudent);
    setDraftStudent(prepareDraftStudent(student));
  }, [student]);

  const midtermEditable = canEditPart(draftStudent, "midterm") || allowOverride;
  const finalEditable = canEditPart(draftStudent, "final") || allowOverride;
  const hasEditableParts = midtermEditable || finalEditable;

  const handleChange = (field, value) => {
    console.log(`✏️ Changing ${field} to:`, value);
    const updated = {
      ...draftStudent,
      [field]: value !== "" ? parseFloat(value) : null,
    };
    updated.remarks = computeRemarks(updated.midterm, updated.final);
    setDraftStudent(updated);
  };

  const applyChangeStatusResets = (parts = []) => {
    const touched = new Set(parts);
    return {
      midterm_change_status: touched.has("midterm") ? "none" : draftStudent.midterm_change_status ?? "none",
      final_change_status: touched.has("final") ? "none" : draftStudent.final_change_status ?? "none",
    };
  };

  const persistGrade = (payload, successMessage, partsTouched = []) => {
    console.log("🔄 Persisting grade with payload:", payload);
    router.post(
      route("faculty.grades.add"),
      {
        grades: [payload],
      },
      {
        onSuccess: () => {
          console.log("✅ Grade saved successfully");
          const resetStatuses = applyChangeStatusResets(partsTouched);
          Toast.fire({ icon: "success", title: successMessage });
          onClose(true, {
            ...draftStudent,
            midterm_status: payload.midterm_status,
            final_status: payload.final_status,
            remarks: payload.remarks,
            status: deriveOverallStatus(payload.midterm_status, payload.final_status),
            ...resetStatuses,
          });
        },
        onError: () => Toast.fire({ icon: "error", title: "Failed to save grade!" }),
      }
    );
  };

  const saveDraft = () => {
    const payload = {
      enrollment_id: draftStudent.enrollment_id,
      class_schedule_id: draftStudent.class_schedule_id,
      midterm: draftStudent.midterm,
      final: draftStudent.final,
      remarks: draftStudent.remarks,
      midterm_status: draftStudent.midterm_status ?? "draft",
      final_status: draftStudent.final_status ?? "draft",
    };

    persistGrade(payload, "Draft saved!", ["midterm", "final"]);
  };

  const submitParts = (parts) => {
    if (parts.some((part) => !canEditPart(draftStudent, part))) {
      Swal.fire({
        icon: "info",
        title: "Locked grade",
        text: "Request a change approval before editing submitted grades.",
        confirmButtonColor: "#0f172a",
      });
      return;
    }

    if (parts.includes("midterm") && (draftStudent.midterm == null || draftStudent.midterm === "")) {
      Swal.fire({
        icon: "info",
        title: "Enter a midterm grade first.",
        confirmButtonColor: "#0f172a",
      });
      return;
    }

    if (parts.includes("final") && (draftStudent.final == null || draftStudent.final === "")) {
      Swal.fire({
        icon: "info",
        title: `Enter a final grade first.`,
        confirmButtonColor: "#0f172a",
      });
      return;
    }

    const partLabel =
      parts.length === 2
        ? "midterm and final grades"
        : `${parts[0] === "midterm" ? "midterm" : "final"} grade`;

    Swal.fire({
      title: `Submit ${partLabel}?`,
      text: "Submitted grades lock until a change request is approved.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0f172a",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Yes, submit",
    }).then((result) => {
      if (!result.isConfirmed) return;

      const nextMidtermStatus = parts.includes("midterm") ? "submitted" : draftStudent.midterm_status ?? "draft";
      const nextFinalStatus = parts.includes("final") ? "submitted" : draftStudent.final_status ?? "draft";

      const payload = {
        enrollment_id: draftStudent.enrollment_id,
        class_schedule_id: draftStudent.class_schedule_id,
        midterm: draftStudent.midterm,
        final: draftStudent.final,
        remarks: draftStudent.remarks,
        midterm_status: nextMidtermStatus,
        final_status: nextFinalStatus,
      };

      const label =
        parts.length === 2 ? "Grades submitted!" : `${parts[0][0].toUpperCase() + parts[0].slice(1)} submitted!`;
      persistGrade(payload, label, parts);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Add / Edit Grade</h2>
          <button onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <p className="mb-3 font-medium text-gray-700">{draftStudent?.name}</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1 text-gray-600">Midterm</label>
            <input
              type="number"
              step="0.25"
              min="1"
              max="5"
              value={draftStudent?.midterm ?? ""}
              onChange={(e) => handleChange("midterm", e.target.value)}
              disabled={!midtermEditable}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !midtermEditable ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""
              }`}
            />
            {!midtermEditable && (
              <p className="mt-1 text-[11px] text-slate-400">{getLockMessage(draftStudent, "midterm")}</p>
            )}
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-600">Final</label>
            <input
              type="number"
              step="0.25"
              min="1"
              max="5"
              value={draftStudent?.final ?? ""}
              onChange={(e) => handleChange("final", e.target.value)}
              disabled={!finalEditable}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                !finalEditable ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""
              }`}
            />
            {!finalEditable && (
              <p className="mt-1 text-[11px] text-slate-400">{getLockMessage(draftStudent, "final")}</p>
            )}
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-600">Remarks</label>
            <input
              type="text"
              value={draftStudent?.remarks ?? "Incomplete"}
              readOnly
              className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 cursor-not-allowed"
            />
          </div>
        </div>

        {!hasEditableParts && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            Editing is locked while your change request is awaiting registrar approval.
          </div>
        )}

        <div className="flex justify-end mt-6 gap-3 flex-wrap">
          <button
            onClick={saveDraft}
            disabled={!hasEditableParts}
            className={`px-4 py-2 text-sm rounded-lg ${
              hasEditableParts
                ? "bg-gray-600 text-white hover:bg-gray-700"
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
            }`}
          >
            Save Draft
          </button>
          <div className="relative" ref={submitMenuRef}>
            <button
              type="button"
              onClick={() => setIsSubmitMenuOpen((prev) => !prev)}
              disabled={!hasEditableParts}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${
                hasEditableParts
                  ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              Submit Options
              <CaretDown size={14} />
            </button>
            {isSubmitMenuOpen && hasEditableParts && (
              <div className="absolute right-0 z-10 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Submit</p>
                <button
                  type="button"
                  onClick={() => {
                    submitParts(["midterm"]);
                    setIsSubmitMenuOpen(false);
                  }}
                  disabled={!canEditPart(draftStudent, "midterm")}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Midterm only
                </button>
                <button
                  type="button"
                  onClick={() => {
                    submitParts(["final"]);
                    setIsSubmitMenuOpen(false);
                  }}
                  disabled={!canEditPart(draftStudent, "final")}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Final only
                </button>
                <button
                  type="button"
                  onClick={() => {
                    submitParts(["midterm", "final"]);
                    setIsSubmitMenuOpen(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Midterm + Final
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ImportPreviewModal = ({ fileData, onClose, onConfirm }) => {
  if (!fileData || fileData.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 relative">
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Preview Import</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-xs border border-gray-200 rounded-lg">
            <thead className="bg-gray-100 text-gray-600">
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

        <div className="flex justify-end mt-4 gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-500 text-white text-sm">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">
            Confirm Import
          </button>
        </div>
      </div>
    </div>
  );
};

export default function GradesPage({ user, schedule, students = [] }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [localStudents, setLocalStudents] = useState(() => hydrateStudents(students));
  const [previewData, setPreviewData] = useState(null);
  const [allowOverrideSubmittedEdit, setAllowOverrideSubmittedEdit] = useState(() => !!user?.is_admin || false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkEditQueue, setBulkEditQueue] = useState([]);

  // Debug: Log students and schedule on mount
  useEffect(() => {
    console.log("🎓 GradesPage mounted");
    console.log("📋 Schedule:", schedule);
    console.log("👥 Raw students from props:", students);
    if (students && students.length > 0) {
      console.log("📊 First student structure:", students[0]);
      console.log("🔍 First student grades:", {
        midterm: students[0]?.midterm,
        final: students[0]?.final,
        midterm_status: students[0]?.midterm_status,
        final_status: students[0]?.final_status,
      });
    }
  }, []);

  useEffect(() => {
    console.log("📊 Students updated from props:", localStudents);
    setLocalStudents(hydrateStudents(students));
  }, [students]);

  useEffect(() => {
    if (!selectedStudent) return;
    const latest = localStudents.find((student) => student.enrollment_id === selectedStudent.enrollment_id);
    if (!latest) return;

    setSelectedStudent((prev) => {
      if (!prev) return prev;
      if (prev.enrollment_id !== latest.enrollment_id) return prev;

      const normalized = normalizeStudentRecord({
        ...latest,
        class_schedule_id: latest.class_schedule_id ?? schedule?.id,
      });

      const fieldsToCompare = [
        "midterm",
        "final",
        "midterm_status",
        "final_status",
        "midterm_change_status",
        "final_change_status",
        "remarks",
      ];

      const changed = fieldsToCompare.some((field) => (prev?.[field] ?? null) !== (normalized?.[field] ?? null));
      return changed ? normalized : prev;
    });
  }, [localStudents, selectedStudent, schedule?.id]);

  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => localStudents.some((s) => s.enrollment_id === id)));
  }, [localStudents]);

  const summary = useMemo(() => {
    const total = localStudents.length;
    const submitted = localStudents.filter((s) => s.status === "submitted").length;
    return {
      total,
      submitted,
      pending: Math.max(total - submitted, 0),
    };
  }, [localStudents]);

  const isSummerTerm = useMemo(() => {
    return String(schedule?.semester || "").toLowerCase().includes("summer");
  }, [schedule]);



  const changeStatusMeta = useMemo(
    () => ({
      none: {
        label: "No request",
        className: "bg-slate-100 text-slate-500",
      },
      requested: {
        label: "Pending change",
        className: "bg-amber-100 text-amber-700",
      },
      approved: {
        label: "Approved",
        className: "bg-emerald-100 text-emerald-700",
      },
      denied: {
        label: "Denied",
        className: "bg-rose-100 text-rose-700",
      },
    }),
    []
  );

  const gradeStatusMeta = useMemo(
    () => ({
      draft: {
        label: "Draft",
        className: "bg-slate-100 text-slate-500",
      },
      submitted: {
        label: "Submitted",
        className: "bg-emerald-100 text-emerald-700",
      },
      confirmed: {
        label: "Confirmed",
        className: "bg-blue-100 text-blue-700",
      },
    }),
    []
  );

  const getGradeLabel = (gradePart) =>
    gradePart === "midterm" ? "Midterm" : isSummerTerm ? "Summer" : "Final";

  const hasGradeForPart = (student, gradePart) => hasGradeValue(resolveGradeValue(student, gradePart));

  const isEditable = (student) => canEditPart(student, "midterm") || canEditPart(student, "final");

  const openGradeEditor = (student) => {
    if (!student) return;
    console.log("📝 Opening grade editor for student:", formatStudentName(student));
    setSelectedStudent(
      normalizeStudentRecord({
        ...student,
        class_schedule_id: student.class_schedule_id ?? schedule.id,
      })
    );
  };

  const hasCompleteGrades = (student) => {
    if (!student) return false;
    const midtermValue = resolveGradeValue(student, "midterm");
    const finalValue = resolveGradeValue(student, "final");
    return hasGradeValue(midtermValue) && hasGradeValue(finalValue);
  };

  const onModalClose = (updated, updatedStudent) => {
    if (updated && updatedStudent) {
      setLocalStudents((prev) =>
        prev.map((student) =>
          student.enrollment_id === updatedStudent.enrollment_id
            ? normalizeStudentRecord({ ...student, ...updatedStudent })
            : student
        )
      );
    }
    setSelectedStudent(null);
    if (updated) {
      setBulkEditQueue((prev) => {
        if (prev.length === 0) return [];
        const [next, ...rest] = prev;
        setTimeout(() => openGradeEditor(next), 50);
        return rest;
      });
    } else {
      setBulkEditQueue([]);
    }
  };

  const submitChangeRequest = (targets, gradePart, reason) => {
    if (!targets.length) return;

    const eligibleTargets = [];
    let missingGradeCount = 0;
    let draftCount = 0;

    targets.forEach((student) => {
      const hasGrade = hasGradeForPart(student, gradePart);
      const submitted = isPartSubmitted(student, gradePart);

      if (!hasGrade) missingGradeCount += 1;
      if (!submitted) draftCount += 1;

      if (submitted && hasGrade) {
        eligibleTargets.push(student);
      }
    });

    if (eligibleTargets.length === 0) {
      const message =
        draftCount === targets.length
          ? "Only submitted grades can request changes."
          : `${getGradeLabel(gradePart)} grade not ready for change requests.`;
      Toast.fire({ icon: "info", title: message });
      return;
    }

    if (missingGradeCount > 0) {
      Toast.fire({
        icon: "info",
        title: `${missingGradeCount} student(s) skipped — no ${getGradeLabel(gradePart).toLowerCase()} grade yet.`,
      });
    }

    if (draftCount > 0 && draftCount !== targets.length) {
      Toast.fire({
        icon: "info",
        title: `${draftCount} student(s) skipped — submit grades before requesting changes.`,
      });
    }

    const affectedIds = eligibleTargets.map((student) => student.enrollment_id);

    router.post(
      route("faculty.grades.request_change"),
      {
        students: eligibleTargets.map((student) => ({
          enrollment_id: student.enrollment_id,
          class_schedule_id: student.class_schedule_id ?? schedule.id,
          grade_part: gradePart,
        })),
        reason,
      },
      {
        onSuccess: () => {
          Toast.fire({ icon: "success", title: "Change request sent" });
          setLocalStudents((prev) =>
            prev.map((record) =>
              affectedIds.includes(record.enrollment_id)
                ? {
                    ...record,
                    [`${gradePart}_change_status`]: "requested",
                  }
                : record
            )
          );

          if (selectedStudent && affectedIds.includes(selectedStudent.enrollment_id)) {
            setSelectedStudent(null);
          }
        },
        onError: () =>
          Toast.fire({ icon: "error", title: "Unable to submit request" }),
      }
    );
  };

  const requestGradeChange = (student, gradePart) => {
    if (!isPartSubmitted(student, gradePart)) {
      Toast.fire({
        icon: "info",
        title: `Submit the ${getGradeLabel(gradePart).toLowerCase()} before requesting changes.`,
      });
      return;
    }
    Swal.fire({
      title: `Request ${gradePart} grade change`,
      input: "textarea",
      inputLabel: "Reason (optional)",
      inputPlaceholder: "Provide context for the registrar...",
      showCancelButton: true,
      confirmButtonText: "Submit request",
      confirmButtonColor: "#0f172a",
    }).then((result) => {
      if (!result.isConfirmed) return;

      submitChangeRequest([student], gradePart, result.value);
    });
  };

  const selectedRecords = useMemo(
    () => localStudents.filter((student) => selectedIds.includes(student.enrollment_id)),
    [localStudents, selectedIds]
  );

  const allSelected = localStudents.length > 0 && selectedIds.length === localStudents.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : localStudents.map((student) => student.enrollment_id));
  };

  const toggleSelectOne = (enrollmentId) => {
    setSelectedIds((prev) =>
      prev.includes(enrollmentId)
        ? prev.filter((id) => id !== enrollmentId)
        : [...prev, enrollmentId]
    );
  };

  const handleBulkEdit = () => {
    if (selectedRecords.length === 0) return;

    const editable = selectedRecords.filter(isEditable);
    const lockedCount = selectedRecords.length - editable.length;

    if (editable.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Editing locked",
        text: "Submitted grades stay read-only until a change request is approved.",
        confirmButtonColor: "#0f172a",
      });
      return;
    }

    if (lockedCount > 0) {
      Swal.fire({
        icon: "info",
        title: `${lockedCount} submitted grade(s) skipped`,
        text: "Those students need an approved change request before editing.",
        confirmButtonColor: "#0f172a",
      });
    }

    const [first, ...rest] = editable;
    setBulkEditQueue(rest);
    openGradeEditor(first);
  };

  const handleSingleEdit = (student) => {
    if (!isEditable(student)) {
      Swal.fire({
        icon: "info",
        title: "Editing locked",
        text: "Both grade parts are submitted. Request a change approval to edit again.",
        confirmButtonColor: "#0f172a",
      });
      setBulkEditQueue([]);
      return;
    }
    setBulkEditQueue([]);
    openGradeEditor(student);
  };

  const handleBulkRequestChange = () => {
    if (selectedRecords.length === 0) return;

    Swal.fire({
      title: "Request change for selected",
      html: `
        <div class="space-y-3 text-left">
          <label class="text-xs font-semibold text-slate-500">Grade Part</label>
          <select id="bulkGradePart" class="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">Choose...</option>
            <option value="midterm">Midterm</option>
            <option value="final">Final</option>
          </select>
          <label class="text-xs font-semibold text-slate-500">Reason (optional)</label>
          <textarea id="bulkReason" class="w-full rounded-lg border px-3 py-2 text-sm"></textarea>
        </div>
      `,
      focusConfirm: false,
      preConfirm: () => {
        const gradePart = document.getElementById("bulkGradePart").value;
        const reason = document.getElementById("bulkReason").value;
        if (!gradePart) {
          Swal.showValidationMessage("Please select a grade part");
          return false;
        }
        return { gradePart, reason };
      },
      showCancelButton: true,
      confirmButtonText: "Submit requests",
      confirmButtonColor: "#0f172a",
    }).then((result) => {
      if (!result.isConfirmed) return;
      submitChangeRequest(selectedRecords, result.value.gradePart, result.value.reason);
    });
  };

  const handleSubmitAll = () => {
    Swal.fire({
      title: "Submit Grades",
      html: `
        <div class="space-y-3 text-left">
          <label class="text-xs font-semibold text-slate-500">Grade scope</label>
          <select id="bulkSubmitScope" class="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">Choose...</option>
            <option value="midterm">Midterm only</option>
            <option value="final">Final only</option>
            <option value="both">Midterm + Final</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      focusConfirm: false,
      preConfirm: () => {
        const scope = document.getElementById("bulkSubmitScope").value;
        if (!scope) {
          Swal.showValidationMessage("Select which grades to submit");
          return false;
        }
        return scope;
      },
      confirmButtonText: "Submit",
      confirmButtonColor: "#16a34a",
    }).then((result) => {
      if (!result.isConfirmed) return;

      const scope = result.value;
      const submissions = [];
      const submissionMeta = {};
      let eligibleCount = 0;

      localStudents.forEach((student) => {
        const midtermValue = resolveGradeValue(student, "midterm");
        const finalValue = resolveGradeValue(student, "final");
        const parts = [];
        if (
          (scope === "midterm" || scope === "both") &&
          student.midterm_status !== "submitted" &&
          hasGradeValue(midtermValue)
        ) {
          parts.push("midterm");
        }
        if (
          (scope === "final" || scope === "both") &&
          student.final_status !== "submitted" &&
          hasGradeValue(finalValue)
        ) {
          parts.push("final");
        }

        if (!parts.length) return;

        const numericMidterm = parseGradeNumber(midtermValue);
        const numericFinal = parseGradeNumber(finalValue);
        const nextMidtermStatus = parts.includes("midterm") ? "submitted" : student.midterm_status ?? "draft";
        const nextFinalStatus = parts.includes("final") ? "submitted" : student.final_status ?? "draft";

        submissions.push({
          enrollment_id: student.enrollment_id,
          class_schedule_id: student.class_schedule_id,
          midterm: numericMidterm,
          final: numericFinal,
          remarks: computeRemarks(numericMidterm, numericFinal),
          midterm_status: nextMidtermStatus,
          final_status: nextFinalStatus,
        });

        submissionMeta[student.enrollment_id] = {
          midterm_status: nextMidtermStatus,
          final_status: nextFinalStatus,
        };
        eligibleCount += 1;
      });

      if (eligibleCount === 0) {
        Toast.fire({ icon: "info", title: "No eligible grades to submit." });
        return;
      }

      router.post(
        route("faculty.grades.add"),
        {
          grades: submissions,
        },
        {
          onSuccess: () => {
            Toast.fire({ icon: "success", title: "Grades submitted!" });
            setLocalStudents((prev) =>
              prev.map((student) => {
                const meta = submissionMeta[student.enrollment_id];
                if (!meta) return student;
                const updatedMidtermStatus = meta.midterm_status;
                const updatedFinalStatus = meta.final_status;
                return normalizeStudentRecord({
                  ...student,
                  midterm_status: updatedMidtermStatus,
                  final_status: updatedFinalStatus,
                  status: deriveOverallStatus(updatedMidtermStatus, updatedFinalStatus),
                });
              })
            );
          },
          onError: () => Toast.fire({ icon: "error", title: "Failed to submit selected grades!" }),
        }
      );
    });
  };

  const handleImport = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

      setPreviewData(jsonData);
      setPendingImport({ file });
    };
    reader.readAsArrayBuffer(file);
  };

    const handleExport = () => {
      if (!localStudents || localStudents.length === 0) {
        Toast.fire({ icon: "info", title: "No students to export" });
        return;
      }

      const data = localStudents.map((s) => ({
        Name: s.name || "",
        ID: s.id_number || "",
        Midterm: formatGradeValue(resolveGradeValue(s, "midterm")) || "",
        Final: formatGradeValue(resolveGradeValue(s, "final")) || "",
        Remarks: s.remarks || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Grades");

      const fileName = `${(schedule?.subject || "grades").replace(/[^a-z0-9_-]/gi, "_")}_${
        schedule?.section || ""
      }.xlsx`;
      XLSX.writeFile(workbook, fileName);
      Toast.fire({ icon: "success", title: "Export started" });
    };

    const handleExportCSV = () => {
      if (!localStudents || localStudents.length === 0) {
        Toast.fire({ icon: "info", title: "No students to export" });
        return;
      }

      const headers = ["Name", "ID", "Midterm", "Final", "Remarks"];
      const rows = localStudents.map((s) => {
        const mid = parseGradeNumber(resolveGradeValue(s, "midterm"));
        const fin = parseGradeNumber(resolveGradeValue(s, "final"));
        return [s.name || "", s.id_number || "", mid === null ? "" : mid, fin === null ? "" : fin, s.remarks || ""];
      });

      const csvContent = [headers, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(schedule?.subject || "grades").replace(/[^a-z0-9_-]/gi, "_")}_${schedule?.section || ""}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      Toast.fire({ icon: "success", title: "CSV exported" });
    };

  const confirmImport = () => {
    if (!pendingImport) return;
    router.post(
      route("faculty.grades.import"),
      {
        file: pendingImport.file,
        class_schedule_id: schedule.id,
      },
      {
        forceFormData: true,
        onSuccess: () => {
          Toast.fire({ icon: "success", title: "Grades imported successfully!" });
          setPreviewData(null);
          setPendingImport(null);
        },
        onError: () => Toast.fire({ icon: "error", title: "Failed to import grades!" }),
      }
    );
  };

  const backToClass = () => {
    router.visit(`/faculty/classes/subject/${schedule.id}?tab=grades`);
  };

  return (
    <FacultyLayout user={user}>
      <Head title={`${schedule?.subject ?? "Subject"} Grades`} />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <button onClick={backToClass} className="text-xs text-blue-500 hover:underline">
            ← Back to Subject
          </button>
          <span className="text-slate-400">/</span>
          <span>{schedule.subject}</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <ChalkboardTeacher size={18} weight="duotone" />
              </span>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{schedule.subject}</h1>
                <p className="text-xs text-slate-500">{schedule.section} • {schedule.course}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              {schedule.semester && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-0.5">
                  <Clock size={12} />
                  {schedule.semester}
                </span>
              )}
              {schedule.school_year && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-0.5">
                  <CheckCircle size={12} />
                  SY {schedule.school_year}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-700">{schedule.subject}</h2>
              <div className="flex items-center gap-2">
                <label className="bg-blue-500 text-white px-3 py-1 rounded-md text-xs cursor-pointer flex items-center gap-1">
                  <Plus size={12} /> Import
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e?.target?.files?.[0];
                      if (!file) return;
                      handleImport(file);
                      e.target.value = null;
                    }}
                  />
                </label>
                {/* Export actions moved to options menu to avoid duplication */}
                <div className="relative">
                  <button
                    onClick={() => setIsOptionsOpen((v) => !v)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    title="More options"
                  >
                    <DotsThreeOutlineVertical size={16} />
                  </button>
                  {isOptionsOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                      <button
                        onClick={() => {
                          handleExport();
                          setIsOptionsOpen(false);
                        }}
                        className="w-full text-left rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Export XLSX
                      </button>
                      <button
                        onClick={() => {
                          handleExportCSV();
                          setIsOptionsOpen(false);
                        }}
                        className="w-full text-left rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Export CSV
                      </button>
                      <div className="my-2 h-px bg-slate-100" />
                      <label className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowOverrideSubmittedEdit}
                          onChange={(e) => setAllowOverrideSubmittedEdit(e.target.checked)}
                          className="mt-1 h-4 w-4"
                        />
                        <div className="text-xs">
                          <div className="font-semibold text-slate-700">Allow edit submitted grades</div>
                          <div className="text-[11px] text-slate-400">Client-side override — server must allow changes.</div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSubmitAll}
                  className="bg-green-600 text-white px-3 py-1 rounded-md text-xs hover:bg-green-700"
                >
                  Submit All
                </button>
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-700">
                <span className="font-semibold">{selectedIds.length} student(s) selected</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkEdit}
                    className="rounded-full border border-blue-400 px-3 py-1 font-semibold text-blue-600 hover:bg-blue-100"
                  >
                    Add / Edit selected
                  </button>
                  <button
                    onClick={handleBulkRequestChange}
                    className="rounded-full border border-blue-400 px-3 py-1 font-semibold text-blue-600 hover:bg-blue-100"
                  >
                    Request change
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-xl">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Student / ID</th>
                    <th className="px-3 py-2 text-left">Midterm Grade</th>
                    <th className="px-3 py-2 text-left">Final Grade</th>
                    <th className="px-3 py-2 text-left">Remarks</th>
                    <th className="px-3 py-2 text-right">Add / Edit Grades</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {localStudents.map((student, idx) => (
                    <tr key={student.enrollment_id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={selectedIds.includes(student.enrollment_id)}
                          onChange={() => toggleSelectOne(student.enrollment_id)}
                        />
                      </td>
                      <td className="px-3 py-3 text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col leading-tight">
                          <p className="text-[13px] font-semibold text-slate-900">{formatStudentName(student)}</p>
                          <span>
                            {student.id_number && (
                              <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
                                {student.id_number}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-col items-start gap-1 text-left text-sm">
                          <div className="flex items-center gap-2 font-semibold text-slate-800">
                            <span>{formatGradeValue(resolveGradeValue(student, "midterm"))}</span>
                            {(() => {
                              const change = getChangeStatus(student, "midterm");
                              if (change === "approved") {
                                return (
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${changeStatusMeta.approved.className}`}>
                                    <CheckCircle size={12} className="inline-block align-middle mr-1" />
                                    {changeStatusMeta.approved.label}
                                  </span>
                                );
                              }
                              return (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    gradeStatusMeta[student.midterm_status ?? "draft"]?.className ||
                                    gradeStatusMeta.draft.className
                                  }`}
                                >
                                  {gradeStatusMeta[student.midterm_status ?? "draft"]?.label ||
                                    gradeStatusMeta.draft.label}
                                </span>
                              );
                            })()}
                          </div>
                          {(student.midterm_change_status && student.midterm_change_status !== "none" && student.midterm_change_status !== "approved") && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                changeStatusMeta[student.midterm_change_status]?.className ||
                                changeStatusMeta.none.className
                              }`}
                            >
                              {changeStatusMeta[student.midterm_change_status]?.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-col items-start gap-1 text-left text-sm">
                          <div className="flex items-center gap-2 font-semibold text-slate-800">
                            <span>{formatGradeValue(resolveGradeValue(student, "final"))}</span>
                            {(() => {
                              const change = getChangeStatus(student, "final");
                              if (change === "approved") {
                                return (
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${changeStatusMeta.approved.className}`}>
                                    <CheckCircle size={12} className="inline-block align-middle mr-1" />
                                    {changeStatusMeta.approved.label}
                                  </span>
                                );
                              }
                              return (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    gradeStatusMeta[student.final_status ?? "draft"]?.className ||
                                    gradeStatusMeta.draft.className
                                  }`}
                                >
                                  {gradeStatusMeta[student.final_status ?? "draft"]?.label ||
                                    gradeStatusMeta.draft.label}
                                </span>
                              );
                            })()}
                          </div>
                          {(student.final_change_status && student.final_change_status !== "none" && student.final_change_status !== "approved") && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                changeStatusMeta[student.final_change_status]?.className ||
                                changeStatusMeta.none.className
                              }`}
                            >
                              {changeStatusMeta[student.final_change_status]?.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {hasCompleteGrades(student) ? (
                          <span
                            className={`font-semibold ${
                              (student.remarks ?? "Incomplete") === "Passed"
                                ? "text-green-600"
                                : (student.remarks ?? "Incomplete") === "Failed"
                                ? "text-red-600"
                                : "text-gray-500"
                            }`}
                          >
                            {student.remarks ?? "Incomplete"}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                            Pending grades
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPosition({ x: rect.right - 180, y: rect.bottom + 8 });
                            setActiveMenu((prev) =>
                              prev === student.enrollment_id ? null : student.enrollment_id
                            );
                          }}
                          aria-label={`Open actions for ${student.name}`}
                        >
                          <DotsThreeOutlineVertical size={16} weight="bold" />
                        </button>
                        {activeMenu === student.enrollment_id && (
                          <div className="fixed inset-0 z-40" onClick={() => setActiveMenu(null)}>
                            <div
                              className="absolute w-48 rounded-xl border border-slate-200 bg-white p-2 text-left shadow-2xl"
                              style={{ top: menuPosition.y, left: Math.max(menuPosition.x, 16) }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Actions
                              </p>
                              <button
                                onClick={() => {
                                  handleSingleEdit(student);
                                  setActiveMenu(null);
                                }}
                                className="w-full rounded-lg px-3 py-2 text-left text-[12px] font-medium text-slate-600 hover:bg-slate-50"
                              >
                                Add / Edit grade
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  requestGradeChange(student, "midterm");
                                  setActiveMenu(null);
                                }}
                                disabled={student.midterm_change_status === "requested"}
                                className="w-full rounded-lg px-3 py-2 text-left text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:text-slate-400"
                              >
                                Request midterm change
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  requestGradeChange(student, "final");
                                  setActiveMenu(null);
                                }}
                                disabled={student.final_change_status === "requested"}
                                className="w-full rounded-lg px-3 py-2 text-left text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:text-slate-400"
                              >
                                Request final change
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {selectedStudent && (
        <GradeModal student={selectedStudent} onClose={onModalClose} allowOverride={allowOverrideSubmittedEdit} />
      )}

      {previewData && (
        <ImportPreviewModal
          fileData={previewData}
          onClose={() => {
            setPreviewData(null);
            setPendingImport(null);
          }}
          onConfirm={confirmImport}
        />
      )}
    </FacultyLayout>
  );
}
