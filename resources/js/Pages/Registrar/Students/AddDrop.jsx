import React, { useEffect, useMemo, useState } from "react";
import { Head, Link, router, useForm } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  Search,
  Save,
  X,
} from "lucide-react";

const buildScheduleLabel = (schedule) => {
  if (!schedule) return "No schedule";
  const day = schedule.schedule_day ?? schedule.day ?? "";
  const start = schedule.start_time ?? "";
  const end = schedule.end_time ?? "";
  const room = schedule.classroom?.room_number ?? schedule.room_number ?? "TBA";
  const faculty = schedule.faculty
    ? `${schedule.faculty.lName ?? ""}, ${schedule.faculty.fName ?? ""}`.trim()
    : "TBA";

  const timePart = day && (start || end) ? `${day} ${start}${end ? `-${end}` : ""}` : "";
  const roomPart = room ? `Room ${room}` : "";
  return [timePart, roomPart, faculty ? `Prof. ${faculty}` : ""]
    .filter(Boolean)
    .join(" • ") || "TBA";
};

const formatDate = (value, fallback = null) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getNumericOrder = (label) => {
  if (!label) return 999;
  const match = String(label).match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 999;
};

const compareYearLabels = (a, b) => {
  const orderDiff = getNumericOrder(a) - getNumericOrder(b);
  if (orderDiff !== 0) return orderDiff;
  return (a ?? "").localeCompare(b ?? "");
};

const compareSemesterLabels = (a, b) => {
  const orderDiff = getNumericOrder(a) - getNumericOrder(b);
  if (orderDiff !== 0) return orderDiff;
  return (a ?? "").localeCompare(b ?? "");
};

const compareSubjectOptions = (a, b) => {
  const semesterDiff = compareSemesterLabels(a.semesterLabel, b.semesterLabel);
  if (semesterDiff !== 0) return semesterDiff;
  return (a.code ?? "").localeCompare(b.code ?? "");
};

const AddDrop = ({
  enrollment,
  availableSubjects = [],
  alreadyEnrolledIds = [],
  enrolledSubjects = [],
  yearLabel = null,
  initialMode = "add",
  dropWindowDays = null,
  dropDeadline = null,
  isWithinDropWindow = true,
  prefillDropSubjectId = null,
}) => {
  const [mode, setMode] = useState(initialMode === "drop" ? "drop" : "add");
  const [addSearch, setAddSearch] = useState("");
  const [dropSearch, setDropSearch] = useState("");
  const [selectedAddSubjectId, setSelectedAddSubjectId] = useState("");
  const [selectedAddScheduleId, setSelectedAddScheduleId] = useState("");
  const [dropSelections, setDropSelections] = useState([]);
  const [isSubjectViewerOpen, setSubjectViewerOpen] = useState(false);

  const addForm = useForm({
    curriculum_subject_id: "",
    class_schedule_id: "",
  });
  const dropForm = useForm({
    subjects: [],
  });

  useEffect(() => {
    if (!prefillDropSubjectId) return;

    setDropSelections((prev) => {
      const alreadyExists = prev.some(
        (item) => item.enrollmentSubjectId === String(prefillDropSubjectId),
      );
      if (alreadyExists) return prev;

      return [
        ...prev,
        {
          enrollmentSubjectId: String(prefillDropSubjectId),
          reason: "",
        },
      ];
    });
  }, [prefillDropSubjectId]);

  const dropDeadlineLabel = useMemo(
    () => formatDate(dropDeadline),
    [dropDeadline],
  );

  const enrolledUnits = useMemo(() => {
    if (!Array.isArray(enrolledSubjects) || enrolledSubjects.length === 0) {
      return null;
    }

    return enrolledSubjects.reduce((total, subject) => {
      const status = subject.status?.toString().toLowerCase() ?? "enrolled";
      if (status !== "enrolled") {
        return total;
      }

      const unitsValue = Number.parseFloat(subject.units ?? subject.subject_units ?? 0);
      return Number.isFinite(unitsValue) ? total + unitsValue : total;
    }, 0);
  }, [enrolledSubjects]);

  const currentUnits = useMemo(() => {
    if (Number.isFinite(enrolledUnits)) {
      return enrolledUnits;
    }

    const fallback = Number.parseFloat(enrollment?.current_units ?? 0);
    return Number.isFinite(fallback) ? fallback : 0;
  }, [enrolledUnits, enrollment?.current_units]);

  const activeYearLabel = enrollment?.year_level?.year_level ?? null;
  const activeSemesterLabel = enrollment?.semester?.semester ?? null;

  const normalizedAddOptions = useMemo(() => {
    const enrolledSet = new Set(
      (alreadyEnrolledIds ?? [])
        .map((id) => Number.parseInt(id, 10))
        .filter((id) => Number.isFinite(id)),
    );

    return availableSubjects.map((subject) => {
      const totalUnits = Number(subject.lec_unit ?? 0) + Number(subject.lab_unit ?? 0);
      const schedules = Array.isArray(subject.class_schedules) ? subject.class_schedules : [];
      const prerequisites = Array.isArray(subject.prerequisites) ? subject.prerequisites : [];
      const prerequisitesMet = subject.prerequisites_met !== false;
      const hasPassed = subject.has_passed === true;
      const latestGrade = subject.latest_grade ?? null;
      const unmetPrerequisites = prerequisites.filter((item) => item?.met !== true);

      return {
        curriculumSubjectId: subject.id,
        code: subject.subject?.code ?? "—",
        title:
          subject.subject?.descriptive_title ??
          subject.subject?.descriptiveTitle ??
          "Untitled subject",
        yearLabel:
          subject.yearLevel?.year_level ??
          subject.year_level?.year_level ??
          subject.yearLevel ??
          subject.year_level ??
          "Year N/A",
        semesterLabel:
          subject.semester?.semester ??
          subject.semesters?.semester ??
          subject.semester ??
          "Semester N/A",
        units: Number.isFinite(totalUnits) ? totalUnits : null,
        schedules: schedules.map((schedule) => ({
          id: schedule.id,
          label: buildScheduleLabel(schedule),
        })),
        prerequisites,
        prerequisitesMet,
        unmetPrerequisites,
        hasPassed,
        latestGrade,
        isAlreadyEnrolled: enrolledSet.has(Number(subject.id)),
      };
    });
  }, [availableSubjects, alreadyEnrolledIds]);

  const addScopeOptions = useMemo(() => {
    return normalizedAddOptions.filter((option) => {
      const optionYear = option.yearLabel ?? null;
      const optionSemester = option.semesterLabel ?? null;

      const matchesYear = yearLabel
        ? optionYear === yearLabel
        : activeYearLabel
          ? optionYear === activeYearLabel
          : true;

      const matchesSemester = activeSemesterLabel
        ? optionSemester === activeSemesterLabel
        : true;

      return matchesYear && matchesSemester;
    });
  }, [normalizedAddOptions, yearLabel, activeYearLabel, activeSemesterLabel]);

  const filteredAddOptions = useMemo(() => {
    const trimmed = addSearch.trim().toLowerCase();
    if (!trimmed) return normalizedAddOptions;

    return normalizedAddOptions.filter((option) => {
      return (
        option.code?.toLowerCase().includes(trimmed) ||
        option.title?.toLowerCase().includes(trimmed)
      );
    });
  }, [normalizedAddOptions, addSearch]);

  const groupedAddOptions = useMemo(() => {
    if (!filteredAddOptions.length) return [];

    const groups = new Map();

    filteredAddOptions.forEach((option) => {
      const yearKey = option.yearLabel ?? "Year N/A";
      if (!groups.has(yearKey)) {
        groups.set(yearKey, []);
      }
      groups.get(yearKey).push(option);
    });

    return Array.from(groups.entries())
      .map(([year, options]) => ({
        yearLabel: year,
        options: options.slice().sort(compareSubjectOptions),
      }))
      .sort((a, b) => compareYearLabels(a.yearLabel, b.yearLabel));
  }, [filteredAddOptions]);

  const totalCurriculumUnits = useMemo(() => {
    if (!addScopeOptions.length) return null;

    return addScopeOptions.reduce((total, option) => {
      const units = Number.parseFloat(option.units ?? 0);
      return Number.isFinite(units) ? total + units : total;
    }, 0);
  }, [addScopeOptions]);

  const selectedAddOption = useMemo(() => {
    if (!selectedAddSubjectId) return null;
    return (
      normalizedAddOptions.find(
        (option) => String(option.curriculumSubjectId) === String(selectedAddSubjectId),
      ) ?? null
    );
  }, [normalizedAddOptions, selectedAddSubjectId]);

  const selectedAddUnits = selectedAddOption?.units ?? 0;
  const projectedUnits = currentUnits + (Number.isFinite(selectedAddUnits) ? selectedAddUnits : 0);
  const isAddOverload =
    Number.isFinite(totalCurriculumUnits) && Number.isFinite(projectedUnits)
      ? projectedUnits > totalCurriculumUnits
      : false;
  const hasUnmetPrereqs = (selectedAddOption?.unmetPrerequisites ?? []).length > 0;
  const hasPassedSubjectAlready = selectedAddOption?.hasPassed === true;

  const normalizedDropSubjects = useMemo(() => {
    return (enrolledSubjects ?? []).map((subject) => {
      const id = subject.enrollment_subject_id ?? subject.id ?? null;
      const status = subject.status ?? "enrolled";

      return {
        id: id ? String(id) : "",
        code: subject.code ?? subject.subject_code ?? "—",
        title: subject.title ?? subject.subject_title ?? "Untitled subject",
        units: subject.units ?? subject.subject_units ?? null,
        yearLabel: subject.year_label ?? subject.yearLabel ?? "Year N/A",
        semesterLabel: subject.semester_label ?? subject.semesterLabel ?? "Semester N/A",
        scheduleLabel: subject.schedule_label ?? subject.scheduleLabel ?? "Schedule not set",
        status,
      };
    });
  }, [enrolledSubjects]);

  const availableDropSubjects = useMemo(() => {
    return normalizedDropSubjects.filter((subject) => {
      const status = subject.status?.toString().toLowerCase();
      if (status !== "enrolled") return false;
      if (yearLabel && subject.yearLabel !== yearLabel) return false;
      return true;
    });
  }, [normalizedDropSubjects, yearLabel]);

  const filteredDropSubjects = useMemo(() => {
    const trimmed = dropSearch.trim().toLowerCase();
    if (!trimmed) return availableDropSubjects;

    return availableDropSubjects.filter((subject) => {
      return (
        subject.code?.toLowerCase().includes(trimmed) ||
        subject.title?.toLowerCase().includes(trimmed)
      );
    });
  }, [availableDropSubjects, dropSearch]);

  const dropSelectionsDetailed = useMemo(() => {
    return dropSelections.map((selection) => {
      const subject =
        normalizedDropSubjects.find(
          (item) => item.id === selection.enrollmentSubjectId,
        ) ?? {};

      return {
        id: selection.enrollmentSubjectId,
        code: subject.code ?? "—",
        title: subject.title ?? "Untitled subject",
        units: subject.units ?? "—",
        scheduleLabel: subject.scheduleLabel ?? "Schedule not set",
        yearLabel: subject.yearLabel ?? "Year N/A",
        semesterLabel: subject.semesterLabel ?? "Semester N/A",
        reason: selection.reason,
      };
    });
  }, [dropSelections, normalizedDropSubjects]);

  const selectedDropIds = useMemo(
    () => dropSelections.map((selection) => selection.enrollmentSubjectId),
    [dropSelections],
  );

  const handleAddOptionSelect = (optionId) => {
    const option = normalizedAddOptions.find(
      (item) => String(item.curriculumSubjectId) === String(optionId),
    );

    if (!option || option.isAlreadyEnrolled) {
      return;
    }

    if (option.hasPassed) {
      addForm.setError(
        "curriculum_subject_id",
        "Student already passed this subject. Choose a different subject.",
      );
      return;
    }

    if (option.prerequisitesMet === false) {
      addForm.setError(
        "curriculum_subject_id",
        "Prerequisites are not yet met for this subject.",
      );
      return;
    }

    const firstScheduleId = option.schedules[0]?.id ? String(option.schedules[0].id) : "";

    setSelectedAddSubjectId(String(option.curriculumSubjectId));
    setSelectedAddScheduleId(firstScheduleId);

    addForm.setData({
      curriculum_subject_id: String(option.curriculumSubjectId),
      class_schedule_id: firstScheduleId,
    });
    addForm.clearErrors();
  };

  const handleAddScheduleSelect = (scheduleId) => {
    const value = scheduleId ? String(scheduleId) : "";
    setSelectedAddScheduleId(value);
    addForm.setData("class_schedule_id", value);
    addForm.clearErrors("class_schedule_id");
  };

  const handleClearAddSelection = () => {
    setSelectedAddSubjectId("");
    setSelectedAddScheduleId("");
    addForm.setData({
      curriculum_subject_id: "",
      class_schedule_id: "",
    });
    addForm.clearErrors();
  };

  const handleSubjectViewerSelect = (optionId) => {
    handleAddOptionSelect(optionId);
    setSubjectViewerOpen(false);
  };

  const handleAddSubmit = (event) => {
    event.preventDefault();

    if (!selectedAddOption) {
      addForm.setError("curriculum_subject_id", "Please select a subject to add.");
      return;
    }

    if (selectedAddOption.isAlreadyEnrolled) {
      addForm.setError("curriculum_subject_id", "This subject is already enrolled.");
      return;
    }

    if (selectedAddOption.hasPassed) {
      addForm.setError(
        "curriculum_subject_id",
        "Student already passed this subject.",
      );
      return;
    }

    if (selectedAddOption.prerequisitesMet === false) {
      addForm.setError(
        "curriculum_subject_id",
        "Prerequisites are not yet met for this subject.",
      );
      return;
    }

    if (selectedAddOption.schedules.length > 0 && !selectedAddScheduleId) {
      addForm.setError("class_schedule_id", "Please choose a schedule for this subject.");
      return;
    }

    if (isAddOverload) {
      addForm.setError("curriculum_subject_id", "This causes overloading of units.");
      return;
    }

    addForm.post(route("registrar.students.subjects.add", enrollment.id), {
      preserveScroll: true,
      onSuccess: () => {
        router.visit(route("registrar.students.profile.show", enrollment.student_id));
      },
    });
  };

  const handleToggleDropSelection = (subject) => {
    if (!subject?.id) return;

    setDropSelections((prev) => {
      const subjectId = subject.id;
      const exists = prev.some((item) => item.enrollmentSubjectId === subjectId);
      if (exists) {
        return prev.filter((item) => item.enrollmentSubjectId !== subjectId);
      }

      return [
        ...prev,
        {
          enrollmentSubjectId: subjectId,
          reason: "",
        },
      ];
    });
    dropForm.clearErrors("subjects");
  };

  const handleDropReasonUpdate = (subjectId, value) => {
    setDropSelections((prev) =>
      prev.map((item) =>
        item.enrollmentSubjectId === subjectId
          ? { ...item, reason: value }
          : item,
      ),
    );
    dropForm.clearErrors("subjects");
  };

  const handleDropSubmit = (event) => {
    event.preventDefault();

    if (dropSelections.length === 0) {
      dropForm.setError("subjects", "Select at least one subject to drop.");
      return;
    }

    const hasMissingReason = dropSelections.some((item) => !item.reason.trim());
    if (hasMissingReason) {
      dropForm.setError("subjects", "Provide a reason for every selected subject.");
      return;
    }

    dropForm.setData(
      "subjects",
      dropSelections.map((selection) => ({
        enrollment_subject_id: selection.enrollmentSubjectId,
        reason: selection.reason.trim(),
      })),
    );

    dropForm.post(route("registrar.students.subjects.drop.batch", enrollment.id), {
      preserveScroll: true,
      onSuccess: () => {
        router.visit(route("registrar.students.profile.show", enrollment.student_id));
      },
    });
  };

  const renderAddSection = () => (
    <form onSubmit={handleAddSubmit} className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            Use the catalog to pick exactly one subject to add.
          </p>
          <button
            type="button"
            onClick={() => setSubjectViewerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
          >
            <Search className="h-3.5 w-3.5" />
            {selectedAddOption ? "Change subject" : "Choose subject"}
          </button>
        </div>

        {selectedAddOption ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">Selected subject</p>
                <h3 className="mt-1 text-base font-semibold text-slate-800">
                  {selectedAddOption.code} • {selectedAddOption.title}
                </h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  {selectedAddOption.yearLabel} • {selectedAddOption.semesterLabel}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-600">
                  Units: {selectedAddOption.units ?? "—"}
                </span>
                <button
                  type="button"
                  onClick={handleClearAddSelection}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
                >
                  Clear selection
                </button>
              </div>
            </div>
            {selectedAddOption.isAlreadyEnrolled ? (
              <p className="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> This subject is already enrolled.
              </p>
            ) : null}

            {hasPassedSubjectAlready ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] text-violet-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                <span>The student already passed this subject. Adding it again is not allowed.</span>
              </div>
            ) : null}

            {isAddOverload ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-600">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                <span>
                  This causes overloading of units. Current total: {currentUnits}. Projected total: {projectedUnits}.
                </span>
              </div>
            ) : null}

            {selectedAddOption.prerequisites?.length ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Prerequisites</p>
                <ul className="mt-2 space-y-1">
                  {selectedAddOption.prerequisites.map((prereq) => (
                    <li key={`prereq-${selectedAddOption.curriculumSubjectId}-${prereq.subject_id}`} className="flex items-start gap-2 text-[10.5px]">
                      {prereq.met ? (
                        <CheckCircle2 className="mt-0.5 h-3 w-3 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-3 w-3 text-rose-500" />
                      )}
                      <div className="leading-tight text-slate-600">
                        <span className="font-medium text-slate-700">{prereq.code ?? "Prerequisite"}</span>
                        <span className="block text-[10px] text-slate-500">{prereq.title ?? "No title"}</span>
                        {prereq.comment ? (
                          <span className="block text-[9.5px] text-slate-400">{prereq.comment}</span>
                        ) : null}
                        {prereq.latest_grade ? (
                          <span className="block text-[9.5px] text-slate-400">
                            Last grade: {prereq.latest_grade.grade ?? "N/A"} • {prereq.latest_grade.remarks ?? "No remarks"}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
                {hasUnmetPrereqs ? (
                  <div className="mt-3 inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-600">
                    <AlertTriangle className="h-3 w-3" /> Some prerequisites are not yet satisfied.
                  </div>
                ) : null}
              </div>
            ) : null}

            {selectedAddOption.latestGrade ? (
              <div className="mt-4 grid gap-2 rounded-lg border border-slate-200 bg-white p-4 text-[10px] text-slate-600">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Last enrolled grade</p>
                <div className="flex flex-wrap items-center gap-2 text-[10.5px]">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">
                    Grade: {selectedAddOption.latestGrade.grade ?? "N/A"}
                  </span>
                  <span className="text-slate-500">
                    Remarks: {selectedAddOption.latestGrade.remarks ?? "N/A"}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${selectedAddOption.latestGrade.is_passed ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-rose-200 bg-rose-50 text-rose-600"}`}>
                    {selectedAddOption.latestGrade.is_passed ? "Passed" : "Failed"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-[11px] text-slate-500">
            <AlertCircle className="mb-3 h-6 w-6 text-slate-400" />
            <p className="font-semibold text-slate-600">No subject selected</p>
            <p className="mt-1 max-w-xs text-slate-400">
              Choose "{selectedAddOption ? "Change" : "Choose"} subject" above to open the catalog and pick a curriculum subject.
            </p>
          </div>
        )}

        {selectedAddOption && selectedAddOption.schedules.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Choose schedule</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedAddOption.schedules.map((schedule) => (
                <button
                  key={`${selectedAddOption.curriculumSubjectId}-schedule-${schedule.id}`}
                  type="button"
                  onClick={() => handleAddScheduleSelect(schedule.id)}
                  disabled={addForm.processing}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] transition ${
                    selectedAddScheduleId === String(schedule.id)
                      ? "border-blue-300 bg-blue-100 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600"
                  }`}
                >
                  <Calendar className="h-3 w-3" />
                  {schedule.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {addForm.errors.curriculum_subject_id ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-600">
            {addForm.errors.curriculum_subject_id}
          </p>
        ) : null}
        {addForm.errors.class_schedule_id ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-600">
            {addForm.errors.class_schedule_id}
          </p>
        ) : null}
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
        <div className="flex flex-col gap-3 text-[10px] text-slate-500 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
              Units: {currentUnits}
              {Number.isFinite(totalCurriculumUnits) ? ` / ${totalCurriculumUnits}` : ""}
            </span>
            <span className="text-slate-600">
              Selected subject units: {Number.isFinite(selectedAddUnits) ? selectedAddUnits : "—" }
            </span>
            <span className="text-slate-600">
              Projected total: {Number.isFinite(selectedAddUnits) ? projectedUnits : currentUnits}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={route("registrar.students.profile.show", enrollment.student_id)}
              className="inline-flex items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={addForm.processing}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
            >
              {addForm.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </div>
        </div>
      </div>
    </form>
  );

  const renderDropSection = () => (
    <form onSubmit={handleDropSubmit} className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {!isWithinDropWindow ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            <p className="font-semibold">Drop window closed</p>
            <p>
              Dropping is outside the standard {dropWindowDays ?? ""} day window.
              {dropDeadlineLabel ? ` Last allowed day: ${dropDeadlineLabel}.` : " Provide a detailed reason to proceed."}
            </p>
          </div>
        ) : null}

        {filteredDropSubjects.length === 0 ? (
          <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-[11px] text-slate-500">
            <AlertCircle className="mb-2 h-6 w-6 text-slate-400" />
            <p>No enrolled subjects matched the filters.</p>
            {dropSearch ? (
              <p className="mt-1 text-slate-400">Try adjusting your keywords.</p>
            ) : (
              <p className="mt-1 text-slate-400">Only active subjects are listed for dropping.</p>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <table className="min-w-full divide-y divide-slate-100 text-left text-[11px] text-slate-600">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-12 px-3 py-3">Select</th>
                  <th className="px-3 py-3">Code</th>
                  <th className="px-3 py-3">Subject</th>
                  <th className="px-3 py-3">Schedule</th>
                  <th className="px-3 py-3">Year • Semester</th>
                  <th className="px-3 py-3 text-right">Units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[11px]">
                {filteredDropSubjects.map((subject) => {
                  const isSelected = selectedDropIds.includes(subject.id);

                  return (
                    <tr
                      key={`drop-${subject.id}`}
                      className={`transition hover:bg-rose-50/70 ${isSelected ? "bg-rose-50" : ""}`}
                    >
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5"
                          checked={isSelected}
                          onChange={() => handleToggleDropSelection(subject)}
                          disabled={dropForm.processing}
                        />
                      </td>
                      <td className="px-3 py-2 align-middle font-semibold text-slate-800">{subject.code}</td>
                      <td className="px-3 py-2 align-middle text-slate-600">
                        <div className="whitespace-pre-line leading-snug">{subject.title}</div>
                      </td>
                      <td className="px-3 py-2 align-middle text-[10.5px] text-slate-500">{subject.scheduleLabel}</td>
                      <td className="px-3 py-2 align-middle text-slate-500">
                        {subject.yearLabel} • {subject.semesterLabel}
                      </td>
                      <td className="px-3 py-2 align-middle text-right text-slate-600">{subject.units ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="space-y-3">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Selected subjects & reasons
          </label>

          {dropSelectionsDetailed.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[11px] text-slate-500">
              Select one or more subjects above to enable dropping.
            </div>
          ) : (
            <div className="space-y-3">
              {dropSelectionsDetailed.map((subject) => (
                <div
                  key={`selected-drop-${subject.id}`}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-600 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {subject.code} • {subject.title}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {subject.yearLabel} • {subject.semesterLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDropSelection({ id: subject.id })}
                      className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">Schedule: {subject.scheduleLabel}</p>
                  <textarea
                    rows={3}
                    value={subject.reason}
                    onChange={(event) => handleDropReasonUpdate(subject.id, event.target.value)}
                    placeholder="Provide a clear justification"
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-[11px] text-slate-700 focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-200"
                    disabled={dropForm.processing}
                  />
                </div>
              ))}
            </div>
          )}

          {dropForm.errors.subjects ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-600">
              {dropForm.errors.subjects}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
        <div className="flex flex-col gap-2 text-[10px] text-slate-500 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            <span>Dropped subjects will be recorded together with the provided reason.</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={route("registrar.students.profile.show", enrollment.student_id)}
              className="inline-flex items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={dropForm.processing || dropSelections.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-400"
            >
              {dropForm.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4" />} Drop subject
            </button>
          </div>
        </div>
      </div>
    </form>
  );

  const renderSubjectViewer = () => (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 px-3 py-6">
      <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Available curriculum subjects</h2>
            <p className="mt-1 text-[10px] text-slate-500">
              Browse the catalog and choose a subject to populate the add form. Filters from the main page apply here as well.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSubjectViewerOpen(false)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close subject viewer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={addSearch}
              onChange={(event) => setAddSearch(event.target.value)}
              placeholder="Search curriculum subjects"
              className="w-full rounded-full border border-slate-200 bg-white py-1.5 pl-7 pr-3 text-[10px] text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {filteredAddOptions.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-[10px] text-slate-500">
              <AlertCircle className="mb-2 h-5 w-5 text-slate-400" />
              <p>No curriculum subjects matched the current filters.</p>
              <p className="mt-1 text-slate-400">Adjust the search or year context to see more results.</p>
            </div>
          ) : (
            <div className="max-h-[54vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-[10px] text-slate-600">
                <thead className="bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3.5 py-2.5">Code</th>
                    <th className="px-3.5 py-2.5">Subject</th>
                    <th className="px-3.5 py-2.5">Year • Semester</th>
                    <th className="px-3.5 py-2.5 text-right">Units</th>
                    <th className="px-3.5 py-2.5">Status</th>
                    <th className="w-24 px-3.5 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {groupedAddOptions.map(({ yearLabel: groupYearLabel, options }) => {
                    const displayYearLabel = groupYearLabel ?? "Year N/A";

                    return (
                      <React.Fragment key={`group-${displayYearLabel}`}>
                        <tr className="bg-slate-50/90">
                          <td colSpan={6} className="px-3.5 py-2.5 text-left text-[9.5px] font-semibold uppercase tracking-wide text-slate-500">
                            {displayYearLabel}
                          </td>
                        </tr>
                        {options.map((option) => {
                          const optionId = String(option.curriculumSubjectId);
                          const isSelected = optionId === String(selectedAddSubjectId);
                          const hasUnits = Number.isFinite(option.units);
                          const prospectiveUnits = hasUnits ? currentUnits + option.units : currentUnits;
                          const willOverload =
                            hasUnits && Number.isFinite(totalCurriculumUnits)
                              ? prospectiveUnits > totalCurriculumUnits
                              : false;
                          const unmetPrereqCount = option.unmetPrerequisites?.length ?? 0;

                          return (
                            <tr key={`viewer-${displayYearLabel}-${optionId}`} className="transition hover:bg-blue-50/60">
                              <td className="px-3.5 py-2.5 align-middle font-semibold text-slate-800">{option.code}</td>
                              <td className="px-3.5 py-2.5 align-middle text-slate-600">
                                <div className="whitespace-pre-line leading-snug">{option.title}</div>
                                {option.schedules.length > 0 ? (
                                  <div className="mt-1 space-y-1 text-[9px] text-slate-400">
                                    {option.schedules.map((schedule) => (
                                      <div key={`${optionId}-schedule-${schedule.id}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5">
                                        <Calendar className="h-2.5 w-2.5" />
                                        <span>{schedule.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-3.5 py-2.5 align-middle text-slate-500">
                                {option.yearLabel} • {option.semesterLabel}
                              </td>
                              <td className="px-3.5 py-2.5 align-middle text-right text-slate-600">
                                {option.units ?? "—"}
                              </td>
                              <td className="px-3.5 py-2.5 align-middle">
                                {option.isAlreadyEnrolled ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-600">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Already enrolled
                                  </span>
                                ) : option.hasPassed ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-600">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Completed
                                  </span>
                                ) : unmetPrereqCount > 0 ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-600">
                                    <AlertTriangle className="h-2.5 w-2.5" /> {unmetPrereqCount} prereq{unmetPrereqCount === 1 ? "" : "s"} missing
                                  </span>
                                ) : isSelected ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-600">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Currently selected
                                  </span>
                                ) : willOverload ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-semibold text-rose-600">
                                    <AlertTriangle className="h-2.5 w-2.5" /> Will overload
                                  </span>
                                ) : (
                                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-500">
                                    Available
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 align-middle text-right">
                                <button
                                  type="button"
                                  disabled={option.isAlreadyEnrolled || option.hasPassed || option.prerequisitesMet === false}
                                  onClick={() => handleSubjectViewerSelect(optionId)}
                                  className="inline-flex items-center justify-end gap-1 rounded-md border border-blue-200 px-2.5 py-1.5 text-[9.5px] font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                                >
                                  Use subject
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={() => setSubjectViewerOpen(false)}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3.5 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <RegistrarLayout>
      <Head title="Manage Subjects" />
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href={route("registrar.students.profile.show", enrollment.student_id)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Student Record
          </Link>
          <div className="text-right text-xs text-slate-500">
            <div className="font-semibold text-slate-700">{enrollment.student_name}</div>
            <div>
              {enrollment.course?.code ?? "Course N/A"} • {enrollment.year_level?.year_level ?? "Year N/A"} • {" "}
              {enrollment.semester?.semester ?? "Semester N/A"}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-lg font-semibold text-slate-800">Manage subjects</h1>
                <p className="mt-1 text-[11px] text-slate-500">
                  Switch between adding curriculum subjects and dropping enrolled subjects for this student.
                </p>
                {yearLabel ? (
                  <p className="mt-1 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold text-slate-600">
                    Year context: {yearLabel}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-3 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Enrollment:</span>
                  <span>
                    {enrollment.course?.code ?? "Course N/A"} • {enrollment.year_level?.year_level ?? "Year N/A"} • {" "}
                    {enrollment.semester?.semester ?? "Semester N/A"}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setMode("add")}
                    className={`rounded-full px-4 py-1.5 text-[11px] font-semibold transition ${
                      mode === "add"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-blue-50"
                    }`}
                  >
                    <Plus className="mr-1.5 inline h-3.5 w-3.5" /> Add subjects
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("drop")}
                    className={`rounded-full px-4 py-1.5 text-[11px] font-semibold transition ${
                      mode === "drop"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-rose-50"
                    }`}
                  >
                    <Minus className="mr-1.5 inline h-3.5 w-3.5" /> Drop subjects
                  </button>
                </div>
                {mode === "drop" ? (
                  <div className="relative min-w-[14rem] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={dropSearch}
                      onChange={(event) => setDropSearch(event.target.value)}
                      placeholder="Search enrolled subjects"
                      className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {mode === "add" ? renderAddSection() : renderDropSection()}
        </div>
      </div>

      {isSubjectViewerOpen ? renderSubjectViewer() : null}
    </RegistrarLayout>
  );
};

export default AddDrop;
