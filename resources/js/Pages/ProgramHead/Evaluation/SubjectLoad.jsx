import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Head, router } from "@inertiajs/react";
import { motion } from "framer-motion";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import { BookOpen, CheckSquare, Square, WarningCircle } from "phosphor-react";
import Swal from "sweetalert2";
import axios from "axios";

export default function SubjectLoad({ availableSubjects = [], enrollment = {}, creditedSubjects = [], preselectedSubjects = [], creditCatalog = [], loadWarning = null, loadError = null }) {
  const [selectedSubjects, setSelectedSubjects] = useState(preselectedSubjects || []);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [curriculumYearFilter, setCurriculumYearFilter] = useState("All");
  const [curriculumSemesterFilter, setCurriculumSemesterFilter] = useState("All");
  const [manualSubjects, setManualSubjects] = useState([]);
  const [gradesData, setGradesData] = useState({});
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesError, setGradesError] = useState("");

  const enrollmentSectionId = useMemo(() => Number(enrollment?.section_id) || null, [enrollment?.section_id]);

  const getCurriculumItemKey = useCallback((item) => {
    if (!item) return null;

    const subjectData = item.subject || item.subjectInfo || {};

    const normalizeValue = (value) => {
      if (value === null || value === undefined) {
        return null;
      }

      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return String(numeric);
      }

      return String(value).trim().toLowerCase();
    };

    const subjectId = normalizeValue(item.subject_id ?? item.curriculum_subject_id ?? subjectData.id);
    const code = normalizeValue(subjectData.code ?? subjectData.subject_code ?? item.code);
    const semester = normalizeValue(item.semesterName ?? item.semester ?? subjectData.semester);
    const fallbackId = normalizeValue(item.id ?? item.subjectCatalogId ?? item.curriculum_subject_id);

    if (subjectId) {
      return semester ? `subject:${subjectId}|semester:${semester}` : `subject:${subjectId}`;
    }

    if (code) {
      return semester ? `code:${code}|semester:${semester}` : `code:${code}`;
    }

    return fallbackId ? `id:${fallbackId}` : null;
  }, []);

  const subjects = useMemo(() => {
    const processedSubjects = Array.isArray(availableSubjects)
      ? availableSubjects
          .map((subject) => {
            const scheduleList = Array.isArray(subject.schedules) ? subject.schedules : [];

            const hasAnySchedules = typeof subject.has_any_schedules === "boolean"
              ? subject.has_any_schedules
              : scheduleList.length > 0;

            const hasSectionSchedulesRaw = typeof subject.has_section_schedules === "boolean"
              ? subject.has_section_schedules
              : scheduleList.some((sched) => Number(sched.section_id) === enrollmentSectionId);

            const isFailed = Boolean(subject.is_failed);
            const usesCrossSection = Boolean(subject.uses_cross_section);
            const allowCrossSection = isFailed && usesCrossSection;
            const isBacktrack = Boolean(subject.is_backtrack);
            const sourceYearLevel = subject.source_year_level || subject.year_level?.year_level || null;
            const sourceSemester = subject.source_semester || subject.semester?.semester || null;
            const hasFailedPrerequisites = Boolean(subject.has_failed_prerequisites);
            const failedPrerequisiteIds = Array.isArray(subject.failed_prerequisite_ids)
              ? subject.failed_prerequisite_ids.filter((id) => Number.isFinite(Number(id))).map((id) => Number(id))
              : [];
            const prerequisiteSubjectIds = Array.isArray(subject.prerequisite_subject_ids)
              ? subject.prerequisite_subject_ids.filter((id) => Number.isFinite(Number(id))).map((id) => Number(id))
              : [];

            const sectionSchedules = enrollmentSectionId
              ? scheduleList.filter((sched) => Number(sched.section_id) === enrollmentSectionId)
              : scheduleList;

            return {
              ...subject,
              schedules: sectionSchedules,
              hasAnySchedules,
              hasSectionSchedules: hasSectionSchedulesRaw && sectionSchedules.length > 0,
              isFailed,
              usesCrossSection,
              allowCrossSection,
              isBacktrack,
              sourceYearLevel,
              sourceSemester,
              hasFailedPrerequisites,
              failedPrerequisiteIds,
              prerequisiteSubjectIds,
            };
          })
          .filter((subject) => {
            if (!enrollmentSectionId) return true;
            if (subject.hasSectionSchedules) return true;
            if (subject.allowCrossSection) return true;
            if (!subject.hasAnySchedules) return true;
            return false;
          })
      : [];

    const normalizedManualSubjects = (manualSubjects || []).map((subject) => {
      const scheduleList = Array.isArray(subject.schedules) ? subject.schedules : [];
      const normalizedId = Number(subject.id) || subject.id;
      return {
        ...subject,
        id: normalizedId,
        subject_id: subject.subject_id ?? normalizedId,
        subject: subject.subject ?? subject.subjectInfo ?? null,
        schedules: scheduleList,
        hasAnySchedules: scheduleList.length > 0,
        hasSectionSchedules: scheduleList.length > 0,
        usesCrossSection: Boolean(subject.usesCrossSection),
        allowCrossSection: Boolean(subject.allowCrossSection),
        isManual: true,
      };
    });

    const merged = new Map();

    processedSubjects.forEach((subject) => {
      const key = Number(subject.id) || subject.id;
      merged.set(key, subject);
    });

    normalizedManualSubjects.forEach((subject) => {
      const key = Number(subject.id) || subject.id;
      if (!merged.has(key)) {
        merged.set(key, subject);
      }
    });

    return Array.from(merged.values());
  }, [availableSubjects, enrollmentSectionId, manualSubjects]);

  const availableSubjectMap = useMemo(() => {
    const map = new Map();
    subjects.forEach((subject) => {
      const identifiers = new Set();
      const primaryId = Number(subject.id);
      if (Number.isFinite(primaryId)) identifiers.add(primaryId);
      if (subject.id) identifiers.add(String(subject.id));

      const relatedSubjectId = Number(subject.subject_id);
      if (Number.isFinite(relatedSubjectId)) identifiers.add(relatedSubjectId);
      if (subject.subject_id) identifiers.add(String(subject.subject_id));

      const nestedSubjectId = Number(subject?.subject?.id);
      if (Number.isFinite(nestedSubjectId)) identifiers.add(nestedSubjectId);
      if (subject?.subject?.id) identifiers.add(String(subject.subject?.id));

      const subjectCode = subject?.subject?.code;
      if (subjectCode) {
        identifiers.add(`code:${String(subjectCode).toLowerCase()}`);
      }

      identifiers.forEach((id) => {
        if (!map.has(id)) {
          map.set(id, subject);
        }
      });
    });
    return map;
  }, [subjects]);


  const subjectsByYearLevel = useMemo(() => {
    const labelMap = new Map([
      ["1", "First Year"],
      ["1st Year", "First Year"],
      ["First Year", "First Year"],
      ["2", "Second Year"],
      ["2nd Year", "Second Year"],
      ["Second Year", "Second Year"],
      ["3", "Third Year"],
      ["3rd Year", "Third Year"],
      ["Third Year", "Third Year"],
      ["4", "Fourth Year"],
      ["4th Year", "Fourth Year"],
      ["Fourth Year", "Fourth Year"],
    ]);

    const groups = new Map();

    subjects.forEach((subject) => {
      const raw = subject?.year_level?.year_level;
      const label = labelMap.get(String(raw).trim()) || "Unassigned Year Level";
      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label).push(subject);
    });

    const order = ["First Year", "Second Year", "Third Year", "Fourth Year", "Unassigned Year Level"];

    return Array.from(groups.entries())
      .map(([label, items]) => ({
        label,
        items: items.slice().sort((a, b) => {
          const codeA = a?.subject?.code || "";
          const codeB = b?.subject?.code || "";
          return codeA.localeCompare(codeB);
        }),
      }))
      .sort((a, b) => {
        const indexA = order.indexOf(a.label);
        const indexB = order.indexOf(b.label);
        return (indexA === -1 ? order.length : indexA) - (indexB === -1 ? order.length : indexB);
      });
  }, [subjects]);

  const curriculumCatalogGroups = useMemo(() => {
    if (Array.isArray(creditCatalog) && creditCatalog.length > 0) {
      const order = ["First Year", "Second Year", "Third Year", "Fourth Year", "Unassigned Year Level"];

      return creditCatalog
        .map((entry) => {
          const label = entry?.year_level_name || "Unassigned Year Level";
          const seen = new Set();
          const items = Array.isArray(entry?.subjects)
            ? entry.subjects.reduce((acc, subject) => {
                const subjectInfo = subject?.subject || {};
                const rawSemester = subject?.semester || null;
                const semesterId = subject?.semesters_id ?? (rawSemester && rawSemester.id) ?? null;
                let semesterName = "Unassigned Semester";

                if (rawSemester) {
                  if (typeof rawSemester === "object") {
                    semesterName = rawSemester.semester || "Unassigned Semester";
                  } else if (typeof rawSemester === "string") {
                    semesterName = rawSemester || "Unassigned Semester";
                  }
                }

                const normalizedId = Number(subject?.id) || subject?.id;
                const dedupeKey = getCurriculumItemKey({
                  id: normalizedId,
                  subject_id: subject?.subject_id,
                  subject: subjectInfo,
                  code: subjectInfo?.code,
                  descriptive_title: subjectInfo?.descriptive_title,
                  semesterName,
                });
                if (dedupeKey && seen.has(dedupeKey)) {
                  return acc;
                }
                if (dedupeKey) {
                  seen.add(dedupeKey);
                }

                acc.push({
                  id: normalizedId,
                  subject: subjectInfo,
                  subject_id: subject?.subject_id,
                  lec_unit: subject?.lec_unit,
                  lab_unit: subject?.lab_unit,
                  type: subject?.type,
                  semesterId,
                  semesterName,
                  prerequisiteCodes: Array.isArray(subject?.prerequisites)
                    ? subject.prerequisites.map((pre) => pre?.code || pre)
                    : Array.isArray(subject?.prerequisite_subject_codes)
                      ? subject.prerequisite_subject_codes
                      : [],
                });

                return acc;
              }, [])
            : [];

          return {
            label,
            items,
            sortKey: order.indexOf(label) === -1 ? order.length : order.indexOf(label),
          };
        })
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(({ sortKey, ...rest }) => rest);
    }

    return subjectsByYearLevel.map((group) => {
      const seen = new Set();
      return {
        label: group.label,
        items: group.items.reduce((acc, subject) => {
          const semesterObj = subject?.semester || null;
          const semesterName = semesterObj?.semester || subject?.sourceSemester || "Unassigned Semester";
          const normalizedId = Number(subject.id) || subject.id;
          const dedupeKey = getCurriculumItemKey({
            id: normalizedId,
            subject_id: subject?.subject_id,
            subject: subject?.subject,
            code: subject?.subject?.code,
            descriptive_title: subject?.subject?.descriptive_title,
            semesterName,
          });
          if (dedupeKey && seen.has(dedupeKey)) {
            return acc;
          }
          if (dedupeKey) {
            seen.add(dedupeKey);
          }

          acc.push({
            id: normalizedId,
            subject: subject?.subject,
            subject_id: subject?.subject_id,
            lec_unit: subject?.lec_unit,
            lab_unit: subject?.lab_unit,
            type: subject?.type,
            semesterId: semesterObj?.id || subject?.semesters_id || null,
            semesterName,
            prerequisiteCodes: Array.isArray(subject?.prerequisites)
              ? subject.prerequisites.map((pre) => pre?.code || pre)
              : Array.isArray(subject?.prerequisite_subject_codes)
                ? subject.prerequisite_subject_codes
                : Array.isArray(subject?.prerequisiteSubjectCodes)
                  ? subject.prerequisiteSubjectCodes
                  : [],
          });

          return acc;
        }, []),
      };
    });
  }, [creditCatalog, subjectsByYearLevel]);

  const curriculumYearOptions = useMemo(() => {
    const labels = new Set();
    curriculumCatalogGroups.forEach((group) => {
      if (group.label) {
        labels.add(group.label);
      }
    });
    return ["All", ...Array.from(labels)];
  }, [curriculumCatalogGroups]);

  const curriculumSemesterOptions = useMemo(() => {
    const semesters = new Set();
    curriculumCatalogGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.semesterName) {
          semesters.add(item.semesterName);
        }
      });
    });

    const sortedSemesters = Array.from(semesters).sort((a, b) => a.localeCompare(b));
    return ["All", ...sortedSemesters];
  }, [curriculumCatalogGroups]);

  useEffect(() => {
    if (showCurriculumModal) {
      setCurriculumYearFilter("All");
      setCurriculumSemesterFilter("All");
    }
  }, [showCurriculumModal]);

  const getCurriculumGroupsByFilter = useCallback(
    (filter) => {
      if (filter === "All") {
        return curriculumCatalogGroups;
      }
      return curriculumCatalogGroups.filter(({ label }) => label === filter);
    },
    [curriculumCatalogGroups]
  );

  const filteredCurriculumGroups = useMemo(() => {
    return getCurriculumGroupsByFilter(curriculumYearFilter)
      .map((group) => {
        const items = curriculumSemesterFilter === "All"
          ? group.items
          : group.items.filter((item) => item.semesterName === curriculumSemesterFilter);

        const seenKeys = new Set();
        const dedupedItems = [];

        items.forEach((item) => {
          const key = getCurriculumItemKey(item);
          if (key && seenKeys.has(key)) {
            return;
          }

          if (key) {
            seenKeys.add(key);
          }

          dedupedItems.push(item);
        });

        return {
          ...group,
          items: dedupedItems,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [curriculumYearFilter, curriculumSemesterFilter, getCurriculumGroupsByFilter]);

  const filteredSubjects = useMemo(() => {
    const query = subjectQuery.trim().toLowerCase();
    if (!query) return subjects;

    return subjects.filter((subject) => {
      const code = subject?.subject?.code?.toLowerCase() || "";
      const title = subject?.subject?.descriptive_title?.toLowerCase() || "";
      return code.includes(query) || title.includes(query);
    });
  }, [subjects, subjectQuery]);

  const currentSemesterName = enrollment?.semester_name ?? null;

  const { currentSubjects, retakeSubjects } = useMemo(() => {
    const current = [];
    const retake = [];
    const normalizedCurrent = currentSemesterName ? currentSemesterName.toLowerCase() : null;

    filteredSubjects.forEach((subject) => {
      const semesterNameRaw =
        (subject.semester && subject.semester.semester) ||
        subject.sourceSemester ||
        null;
      const semesterNameNormalized = semesterNameRaw
        ? String(semesterNameRaw).toLowerCase()
        : null;

      const isRetakeSubject = Boolean(subject.isBacktrack) || Boolean(subject.isFailed);

      const matchesCurrent = normalizedCurrent
        ? semesterNameNormalized === normalizedCurrent
        : !isRetakeSubject;

      if (!isRetakeSubject && matchesCurrent) {
        current.push(subject);
      } else {
        retake.push(subject);
      }
    });

    return { currentSubjects: current, retakeSubjects: retake };
  }, [filteredSubjects, currentSemesterName]);

  const hasRetakeInventory = useMemo(
    () => retakeSubjects.length > 0,
    [retakeSubjects]
  );

  const selectionGuards = useMemo(() => {
    const blockedScheduleIds = new Set();
    const blockedSubjectIds = new Set();
    const selectableScheduleSet = new Set();

    subjects.forEach((subj) => {
      const scheduleIds = Array.isArray(subj.schedules)
        ? subj.schedules.map((sched) => sched.id)
        : [];
      const isRetakeSubject = Boolean(subj.isFailed) || Boolean(subj.isBacktrack);

      if (subj.hasFailedPrerequisites && !isRetakeSubject) {
        if (scheduleIds.length > 0) {
          scheduleIds.forEach((id) => blockedScheduleIds.add(id));
        } else {
          blockedScheduleIds.add(subj.id);
        }
        blockedSubjectIds.add(subj.id);
        return;
      }

      if (scheduleIds.length > 0) {
        scheduleIds.forEach((id) => selectableScheduleSet.add(id));
      } else {
        selectableScheduleSet.add(subj.id);
      }
    });

    return {
      blockedScheduleIds,
      blockedSubjectIds,
      selectableScheduleIds: Array.from(selectableScheduleSet),
    };
  }, [subjects]);

  const { blockedScheduleIds, blockedSubjectIds, selectableScheduleIds } = selectionGuards;

  const allSelectableSelected = useMemo(() => {
    if (selectableScheduleIds.length === 0) return false;
    if (selectedSubjects.length !== selectableScheduleIds.length) return false;
    return selectableScheduleIds.every((id) => selectedSubjects.includes(id));
  }, [selectableScheduleIds, selectedSubjects]);

  const renderCurrentSubjectRows = (subjectList) => {
    return subjectList.map((subj) => {
      const scheduleList = Array.isArray(subj.schedules) ? subj.schedules : [];
      const isCredited = creditedSubjects.includes(subj.id);
      const subjectScheduleIds = scheduleList.map((sched) => sched.id);
      const isSubjectSelected = subjectScheduleIds.length > 0
        ? subjectScheduleIds.every((id) => selectedSubjects.includes(id))
        : selectedSubjects.includes(subj.id);
      const isSubjectBlocked = blockedSubjectIds.has(subj.id);

      if (scheduleList.length > 0) {
        return scheduleList.map((sched, idx) => {
          const rowSelected = selectedSubjects.includes(sched.id);
          const rowBlocked = isSubjectBlocked || blockedScheduleIds.has(sched.id);

          return (
            <tr
              key={`${subj.id}-${sched.id}`}
              className={`transition ${rowBlocked ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50 cursor-pointer"} ${rowSelected ? "bg-sky-50/70" : ""} ${isCredited ? "opacity-60" : ""}`}
              onClick={() => {
                if (!rowBlocked) {
                  toggleSubject(sched.id);
                }
              }}
            >
              {idx === 0 && (
                <>
                  <td
                    rowSpan={scheduleList.length}
                    className="border px-3 py-2 text-center cursor-pointer"
                  >
                    {isSubjectBlocked ? (
                      <Square size={18} className="text-slate-300 inline-block" />
                    ) : isSubjectSelected ? (
                      <CheckSquare size={18} className="text-sky-600 inline-block" />
                    ) : (
                      <Square size={18} className="text-slate-400 inline-block" />
                    )}
                  </td>
                  <td rowSpan={scheduleList.length} className="border px-3 py-2">
                    {subj.subject?.code || "-"}
                  </td>
                  <td rowSpan={scheduleList.length} className="border px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={isCredited ? "text-gray-600 font-medium" : ""}>
                          {subj.subject?.descriptive_title || "-"}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isCredited && (
                            <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 select-none whitespace-nowrap">
                              Credited
                            </span>
                          )}
                          {subj.isFailed && (
                            <span className="inline-block rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600 select-none whitespace-nowrap">
                              Needs Retake
                            </span>
                          )}
                          {subj.isBacktrack && (
                            <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 select-none whitespace-nowrap">
                              Retake
                            </span>
                          )}
                          {subj.hasFailedPrerequisites && (
                            <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600 select-none whitespace-nowrap">
                              Prerequisite failed
                            </span>
                          )}
                          {subj.allowCrossSection && (
                            <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600 select-none whitespace-nowrap">
                              Cross-section schedule
                            </span>
                          )}
                          {subj.isBacktrack && (
                            <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 select-none whitespace-nowrap">
                              From {subj.sourceYearLevel || "previous year"}
                            </span>
                          )}
                        </div>
                      </div>
                      {subj.allowCrossSection && (
                        <p className="text-[11px] text-slate-500">
                          Showing available schedules from other sections so this subject can be retaken.
                        </p>
                      )}
                      {subj.hasFailedPrerequisites && !subj.isFailed && !subj.isBacktrack && (
                        <p className="text-[11px] text-amber-600">
                          Cannot be auto-loaded because a prerequisite was failed.
                        </p>
                      )}
                      {subj.isBacktrack && (
                        <p className="text-[11px] text-slate-500">
                          Originally offered in {subj.sourceYearLevel || "a previous year"}
                          {subj.sourceSemester ? ` • ${subj.sourceSemester}` : ""}. Ensure this retake is prioritized.
                        </p>
                      )}
                    </div>
                  </td>
                  <td
                    rowSpan={scheduleList.length}
                    className="border px-3 py-2 text-center"
                  >
                    {(subj.lec_unit || 0) + (subj.lab_unit || 0)}
                  </td>
                </>
              )}
              <td className="border px-3 py-2">{sched.schedule_day || "-"}</td>
              <td className="border px-3 py-2">{sched.section || enrollment?.section_name || "-"}</td>
              <td className="border px-3 py-2">
                {formatTime(sched.start_time)} - {formatTime(sched.end_time)}
              </td>
              <td className="border px-3 py-2">{sched.classroom || "-"}</td>
              <td hidden className="border px-3 py-2">{sched.faculty_name || "-"}</td>
            </tr>
          );
        });
      }

      return (
        <tr
          key={subj.id}
          className={`transition ${isSubjectBlocked ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50 cursor-pointer"} ${selectedSubjects.includes(subj.id) ? "bg-sky-50/70" : ""} ${isCredited ? "opacity-60" : ""}`}
          onClick={() => {
            if (!isSubjectBlocked) {
              toggleSubject(subj.id);
            }
          }}
        >
          <td className="border px-3 py-2 text-center">
            {isSubjectBlocked ? (
              <Square size={18} className="text-slate-300 inline-block" />
            ) : isSubjectSelected ? (
              <CheckSquare size={18} className="text-sky-600 inline-block" />
            ) : (
              <Square size={18} className="text-slate-400 inline-block" />
            )}
          </td>
          <td className="border px-3 py-2">{subj.subject?.code || "-"}</td>
          <td className="border px-3 py-2">{subj.subject?.descriptive_title || "-"}</td>
          <td className="border px-3 py-2 text-center">
            {(subj.lec_unit || 0) + (subj.lab_unit || 0)}
          </td>
          <td colSpan={4} className="border px-3 py-2 text-center text-slate-400">
            {subj.hasAnySchedules
              ? "No schedule available for the selected section"
              : "No schedule assigned"}
          </td>
        </tr>
      );
    });
  };

  const renderRetakeRows = (subjectList) => {
    return subjectList.map((subj) => {
      const isCredited = creditedSubjects.includes(subj.id);
      const scheduleList = Array.isArray(subj.schedules) ? subj.schedules : [];
      const noteMessages = [];
      const subjectScheduleIds = scheduleList.map((sched) => sched.id);
      const isSubjectSelected = subjectScheduleIds.length > 0
        ? subjectScheduleIds.every((id) => selectedSubjects.includes(id))
        : selectedSubjects.includes(subj.id);
      const isSubjectBlocked = blockedSubjectIds.has(subj.id);

      if (subj.allowCrossSection && scheduleList.length > 0) {
        noteMessages.push("Cross-section schedules available");
      }

      if (subj.hasFailedPrerequisites) {
        if (subj.isFailed || subj.isBacktrack) {
          noteMessages.push("Prerequisite previously failed — include prerequisite retake if needed");
        } else {
          noteMessages.push("Prerequisite failed — resolve before loading");
        }
      }

      if (subj.hasAnySchedules && scheduleList.length === 0) {
        noteMessages.push("No schedules for current section");
      }

      if (!subj.hasAnySchedules) {
        noteMessages.push("No schedules published yet");
      }

      if (subj.sourceYearLevel || subj.sourceSemester) {
        noteMessages.push(
          [`Originally offered in`, subj.sourceYearLevel || "previous year", subj.sourceSemester ? `• ${subj.sourceSemester}` : ""].filter(Boolean).join(" ")
        );
      }

      if (noteMessages.length === 0) {
        noteMessages.push("For retake prioritization");
      }

      if (scheduleList.length > 0) {
        return scheduleList.map((sched, idx) => {
          const rowSelected = selectedSubjects.includes(sched.id);
          const rowBlocked = isSubjectBlocked || blockedScheduleIds.has(sched.id);

          return (
            <tr
              key={`retake-${subj.id}-${sched.id}`}
              className={`transition ${rowBlocked ? "cursor-not-allowed opacity-60" : "hover:bg-rose-50 cursor-pointer"} ${rowSelected ? "bg-rose-50/80" : ""} ${isCredited ? "opacity-60" : ""}`}
              onClick={() => {
                if (!rowBlocked) {
                  toggleSubject(sched.id);
                }
              }}
            >
              {idx === 0 && (
                <>
                  <td
                    rowSpan={scheduleList.length}
                    className="border px-3.5 py-2 text-center"
                  >
                    {isSubjectBlocked ? (
                      <Square size={16} className="text-slate-300 inline-block" />
                    ) : isSubjectSelected ? (
                      <CheckSquare size={16} className="text-sky-600 inline-block" />
                    ) : (
                      <Square size={16} className="text-slate-400 inline-block" />
                    )}
                  </td>
                  <td rowSpan={scheduleList.length} className="border px-3.5 py-2 text-left font-medium text-slate-700">
                    {subj.subject?.code || "-"}
                  </td>
                  <td rowSpan={scheduleList.length} className="border px-3.5 py-2 text-left">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-slate-700">{subj.subject?.descriptive_title || "-"}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {subj.isFailed && (
                          <span className="inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                            Failed (3.0)
                          </span>
                        )}
                        {subj.isBacktrack && (
                          <span className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                            Backtrack
                          </span>
                        )}
                        {(subj.isFailed || subj.isBacktrack) && (
                          <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                            Retake
                          </span>
                        )}
                        {isCredited && (
                          <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                            Credited
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td
                    rowSpan={scheduleList.length}
                    className="border px-3.5 py-2 text-center"
                  >
                    {(subj.lec_unit || 0) + (subj.lab_unit || 0)}
                  </td>
                </>
              )}
              <td className="border px-3.5 py-2">{sched.schedule_day || "-"}</td>
              <td className="border px-3.5 py-2">{sched.section || enrollment?.section_name || "-"}</td>
              <td className="border px-3.5 py-2">
                {formatTime(sched.start_time)} - {formatTime(sched.end_time)}
              </td>
              <td className="border px-3.5 py-2">{sched.classroom || "-"}</td>
              {idx === 0 && (
                <td rowSpan={scheduleList.length} className="border px-3.5 py-2 text-left text-slate-600">
                  {noteMessages.map((note, noteIdx) => (
                    <span key={noteIdx} className="block text-[11px] leading-relaxed">
                      {note}
                    </span>
                  ))}
                </td>
              )}
            </tr>
          );
        });
      }

      return (
        <tr
          key={`retake-${subj.id}`}
          className={`transition ${isSubjectBlocked ? "cursor-not-allowed opacity-60" : "hover:bg-rose-50 cursor-pointer"} ${isCredited ? "opacity-60" : ""}`}
          onClick={() => {
            if (!isSubjectBlocked) {
              toggleSubjectGroup(subj);
            }
          }}
        >
          <td className="border px-3.5 py-2 text-center">
            {isSubjectBlocked ? (
              <Square size={16} className="text-slate-300 inline-block" />
            ) : isSubjectSelected ? (
              <CheckSquare size={16} className="text-sky-600 inline-block" />
            ) : (
              <Square size={16} className="text-slate-400 inline-block" />
            )}
          </td>
          <td className="border px-3.5 py-2 text-left font-medium text-slate-700">
            {subj.subject?.code || "-"}
          </td>
          <td className="border px-3.5 py-2 text-left">
            <div className="flex flex-col gap-1">
              <span className="font-medium text-slate-700">{subj.subject?.descriptive_title || "-"}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {subj.isFailed && (
                  <span className="inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                    Failed (3.0)
                  </span>
                )}
                {subj.isBacktrack && (
                  <span className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                    Backtrack
                  </span>
                )}
                {isCredited && (
                  <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                    Credited
                  </span>
                )}
              </div>
            </div>
          </td>
          <td className="border px-3.5 py-2 text-center">
            {(subj.lec_unit || 0) + (subj.lab_unit || 0)}
          </td>
          <td className="border px-3.5 py-2 text-center text-slate-500" colSpan={4}>
            No schedules assigned
          </td>
          <td className="border px-3.5 py-2 text-left text-slate-600">
            {noteMessages.map((note, idx) => (
              <span key={idx} className="block text-[11px] leading-relaxed">
                {note}
              </span>
            ))}
          </td>
        </tr>
      );
    });
  };

  useEffect(() => {
    if (!preselectedSubjects?.length) return;

    const sanitized = preselectedSubjects.filter((id) => !blockedScheduleIds.has(id));

    setSelectedSubjects((prev) => {
      const merged = Array.from(new Set([...prev, ...sanitized]));
      if (merged.length === prev.length && merged.every((id, index) => prev[index] === id)) {
        return prev;
      }
      return merged;
    });
  }, [preselectedSubjects, blockedScheduleIds]);

  useEffect(() => {
    setSelectedSubjects((prev) => prev.filter((id) => !blockedScheduleIds.has(id)));
  }, [blockedScheduleIds]);

  const toggleSubject = useCallback((classScheduleId) => {
    if (blockedScheduleIds.has(classScheduleId)) {
      return;
    }

    setSelectedSubjects((prev) =>
      prev.includes(classScheduleId)
        ? prev.filter((id) => id !== classScheduleId)
        : [...prev, classScheduleId]
    );
  }, [blockedScheduleIds]);

  const registerManualSubject = useCallback((subject) => {
    if (!subject) return;

    setManualSubjects((prev) => {
      const normalizedId = Number(subject.id) || subject.id;
      if (!normalizedId) {
        return prev;
      }

      const subjectKey = getCurriculumItemKey({
        ...subject,
        id: normalizedId,
        subject_id: subject.subject_id,
        subject: subject.subject || subject.subjectInfo,
        semesterName: subject.sourceSemester ?? subject.semesterName,
      }) || `id:${normalizedId}`;

      const sanitized = {
        ...subject,
        id: normalizedId,
        subjectKey,
        sourceYearLevel: subject.sourceYearLevel ?? subject.source_year_level ?? null,
        sourceSemester: subject.sourceSemester ?? subject.source_semester ?? null,
        lec_unit: Number(subject.lec_unit) || 0,
        lab_unit: Number(subject.lab_unit) || 0,
        isManual: true,
      };

      const existsIndex = prev.findIndex((item) => item.subjectKey === subjectKey || (Number(item.id) || item.id) === normalizedId);
      if (existsIndex !== -1) {
        const updated = prev.slice();
        updated[existsIndex] = { ...updated[existsIndex], ...sanitized };
        return updated;
      }

      return [...prev, sanitized];
    });
  }, []);

  const toggleSubjectGroup = useCallback((subject) => {
    if (blockedSubjectIds.has(subject.id)) {
      return;
    }

    const schedules = Array.isArray(subject?.schedules) ? subject.schedules : [];
    if (schedules.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No schedules available",
        text: "This subject does not have any schedules yet. Please add or check schedules first.",
        confirmButtonText: "OK",
      });
      return;
    }

    const subjectKey = subject?.subjectKey || subject?.id || subject?.subject_id;
    const existingIndex = selectedSubjects.findIndex((selected) => selected.subjectKey === subjectKey || selected.id === subject.id);

    if (existingIndex !== -1) {
      const updated = selectedSubjects.filter((_, index) => index !== existingIndex);
      setSelectedSubjects(updated);
      return;
    }

    const scheduleIds = schedules.map((sched) => sched.id);
    const allowedScheduleIds = scheduleIds.filter((id) => !blockedScheduleIds.has(id));

    setSelectedSubjects((prev) => {
      if (allowedScheduleIds.length > 0) {
        const fullySelected = allowedScheduleIds.every((id) => prev.includes(id));
        if (fullySelected) {
          return prev.filter((id) => !allowedScheduleIds.includes(id));
        }
        return Array.from(new Set([...prev, ...allowedScheduleIds]));
      }

      if (blockedSubjectIds.has(subject.id)) {
        return prev;
      }

      return prev.includes(subject.id)
        ? prev.filter((id) => id !== subject.id)
        : [...prev, subject.id];
    });
  }, [blockedScheduleIds, blockedSubjectIds]);

  const isSubjectFullySelected = useCallback(
    (subject) => {
      if (blockedSubjectIds.has(subject.id)) {
        return false;
      }

      const scheduleIds = Array.isArray(subject.schedules) ? subject.schedules.map((sched) => sched.id) : [];
      if (scheduleIds.length > 0) {
        return scheduleIds
          .filter((id) => !blockedScheduleIds.has(id))
          .every((id) => selectedSubjects.includes(id));
      }

      return selectedSubjects.includes(subject.id);
    },
    [blockedScheduleIds, blockedSubjectIds, selectedSubjects]
  );

  const toggleAllSubjects = useCallback(() => {
    if (allSelectableSelected) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(selectableScheduleIds);
    }
  }, [allSelectableSelected, selectableScheduleIds]);


  const totalUnits = useMemo(() => {
    if (!selectedSubjects.length) return 0;

    const subjectUnits = new Map();

    subjects.forEach((subj) => {
      if (blockedSubjectIds.has(subj.id)) {
        return;
      }

      const scheduleIds = Array.isArray(subj.schedules)
        ? subj.schedules.map((sched) => sched.id)
        : [];

      const hasSelectedSchedule = scheduleIds.length > 0
        ? scheduleIds.some((id) => selectedSubjects.includes(id))
        : selectedSubjects.includes(subj.id);

      const isPrerequisiteBlocked = Boolean(subj.hasFailedPrerequisites) && !Boolean(subj.isFailed) && !Boolean(subj.isBacktrack);

      if (hasSelectedSchedule && !isPrerequisiteBlocked) {
        const key = Number(subj.id) || subj.id;
        subjectUnits.set(
          key,
          (Number(subj.lec_unit) || 0) + (Number(subj.lab_unit) || 0)
        );
      }
    });

    return Array.from(subjectUnits.values()).reduce((sum, units) => sum + units, 0);
  }, [blockedSubjectIds, selectedSubjects, subjects]);

  const curriculumTotalUnits = useMemo(() => {
    if (!Array.isArray(subjects) || subjects.length === 0) return 0;

    const subjectUnits = new Map();

    subjects.forEach((subj) => {
      if (subj.isManual) {
        return;
      }

      if (subj.isFailed || subj.isBacktrack) {
        return;
      }

      if (!subjectUnits.has(subj.id)) {
        subjectUnits.set(
          subj.id,
          (Number(subj.lec_unit) || 0) + (Number(subj.lab_unit) || 0)
        );
      }
    });

    return Array.from(subjectUnits.values()).reduce((sum, units) => sum + units, 0);
  }, [subjects]);

  const toNumberOrNull = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const formatGradeValue = (value) =>
    typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "-";

  const handleOpenCrediting = useCallback(() => {
    if (!enrollment?.id) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "Load enrollment details before crediting.",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
      return;
    }

    router.visit(route("program-head.enrollment.crediting", { id: enrollment.id }));
  }, [enrollment?.id]);

  const handleSubjectLoad = useCallback(() => {
    if (selectedSubjects.length === 0) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "Please select at least one subject.",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
      return;
    }

    Swal.fire({
      title: "Loading subjects...",
      text: "Please wait while we save the selected subjects.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    router.post(
      route("program-head.evaluation.subjectload.store"),
      {
        enrollment_id: enrollment?.id,
        class_schedule_ids: selectedSubjects,
      },
      {
        onSuccess: () => {
          Swal.close();
          setSelectedSubjects([]);
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Subjects loaded successfully!",
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
          });
        },
        onError: (error) => {
          Swal.close();
          console.error("Failed to load subjects:", error);
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "error",
            title: "Failed to load subjects!",
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
          });
        },
      }
    );
  }, [selectedSubjects, enrollment?.id]);

  const formatTime = useCallback((time) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  }, []);

  const handleCheckGrades = useCallback(async () => {
    if (!enrollment?.id) return;

    setGradesError("");
    setGradesData({});
    setShowGradesModal(true);
    setGradesLoading(true);

    try {
      const response = await axios.get(
        route("program-head.grades.index", { enrollment: enrollment.id })
      );

      if (response.data.success) {
        const grades = response.data.grades; // nested object

        // Ensure the structure is YearLevel -> Semester -> Subjects
        const nestedGrades = {};

        Object.entries(grades).forEach(([yearLevel, semesters]) => {
          nestedGrades[yearLevel] = {};

          Object.entries(semesters).forEach(([semester, subjectsList]) => {
            const normalized = Array.isArray(subjectsList)
              ? subjectsList.map((entry) => {
                  const midterm = toNumberOrNull(entry.midterm);
                  const final = toNumberOrNull(entry.final);
                  let gradeValue = toNumberOrNull(entry.grade);

                  if (gradeValue === null && midterm !== null && final !== null) {
                    gradeValue = Number(((midterm + final) / 2).toFixed(2));
                  }

                  return {
                    ...entry,
                    midterm,
                    final,
                    grade: gradeValue,
                    remarks: entry.remarks ?? entry.remark ?? null,
                  };
                })
              : [];

            nestedGrades[yearLevel][semester] = normalized;
          });
        });

        setGradesData(nestedGrades);
      } else {
        const message = response.data.message || "No grades found.";
        setGradesError(message);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "error",
          title: message,
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
      }
    } catch (error) {
      console.error("Failed to fetch grades:", error);
      setGradesError("Failed to fetch grades.");
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: "Failed to fetch grades!",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
    } finally {
      setGradesLoading(false);
    }
  }, [enrollment?.id]);

  return (
    <ProgramHeadLayout>
      <Head title="Subject Loading" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="mx-auto max-w-5xl space-y-5 px-4 py-5 md:space-y-6 md:px-5 md:py-8"
      >
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm md:px-6 md:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-600">
                <BookOpen size={13} weight="duotone" /> Subject Loading
              </div>
              <div>
                <h1 className="text-[1.5rem] font-semibold text-slate-900 md:text-[1.6rem]">
                  Subject Loading
                </h1>
                <p className="max-w-xl text-[12px] text-slate-500">
                  Review the student&apos;s recommended subjects, make adjustments with confidence, and finalize a balanced schedule.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleOpenCrediting}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
              >
                Credit Subjects
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleCheckGrades}
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-100"
              >
                View Grades
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowCurriculumModal(true)}
                className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-100"
              >
                Add Subject
              </motion.button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(loadWarning || loadError) && (
          <div className="mb-5 space-y-2">
            {loadWarning && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-[12px] text-amber-700">
                <WarningCircle size={16} className="mt-0.5" />
                <span>{loadWarning}</span>
              </div>
            )}
            {loadError && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200/80 bg-rose-50/80 px-3 py-2.5 text-[12px] text-rose-700">
                <WarningCircle size={16} className="mt-0.5" />
                <span>{loadError}</span>
              </div>
            )}
          </div>
        )}

        {/* Student Info */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Student Snapshot
          </h2>
          <div className="mt-2 grid gap-2.5 text-[12px] text-slate-600 sm:grid-cols-2">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-800">Name:</span>
              <span>
                {(() => {
                  const last = enrollment?.last_name?.trim();
                  const first = enrollment?.first_name?.trim();
                  const middle = enrollment?.middle_name?.trim();

                  if (!last && !first && !middle) {
                    return "-";
                  }

                  const base = [last, first].filter(Boolean).join(", ");
                  return [base || "-", middle].filter(Boolean).join(" ");
                })()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-800">Program:</span>
              <span>{enrollment?.program_name || "-"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-800">Year Level:</span>
              <span>{enrollment?.year_level_name || "-"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-800">Semester:</span>
              <span>{enrollment?.semester_name || "-"}</span>
            </div>
          </div>
        </div>

        {/* Select All & Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={toggleAllSubjects}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
          >
            {allSelectableSelected ? (
              <CheckSquare size={16} className="text-sky-600" />
            ) : (
              <Square size={16} className="text-slate-400" />
            )}
            <span>
              {allSelectableSelected
                ? "Deselect All"
                : "Select All Subjects"}
            </span>
          </button>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={subjectQuery}
              onChange={(event) => setSubjectQuery(event.target.value)}
              placeholder="Search by code or title"
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-[11.5px] text-slate-600 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
        </div>

        {/* Table */}
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-[12px]">
            <thead className="bg-slate-50/80 text-slate-600">
              <tr>
                <th className="px-3.5 py-2 text-left font-semibold">Select</th>
                <th className="px-3.5 py-2 text-left font-semibold">Code</th>
                <th className="px-3.5 py-2 text-left font-semibold">Subject</th>
                <th className="px-3.5 py-2 text-left font-semibold">Units</th>
                <th className="px-3.5 py-2 text-left font-semibold">Day</th>
                <th className="px-3.5 py-2 text-left font-semibold">Section</th>
                <th className="px-3.5 py-2 text-left font-semibold">Time</th>
                <th className="px-3.5 py-2 text-left font-semibold">Room</th>
                <th hidden className="border px-3 py-2 text-left">Faculty</th>
              </tr>
            </thead>
            <tbody>
              {currentSubjects.length > 0 ? (
                renderCurrentSubjectRows(currentSubjects)
              ) : (
                <tr>
                  <td colSpan="8" className="border px-3 py-6 text-center text-gray-400">
                    No subjects available for the current semester.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>


        {hasRetakeInventory && (
          <div className="mt-6 space-y-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-[12px] font-semibold text-rose-700">
              Retake Subjects
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-[12px]">
                <thead className="bg-slate-50/80 text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2 text-left font-semibold">Select</th>
                    <th className="px-3.5 py-2 text-left font-semibold">Code</th>
                    <th className="px-3.5 py-2 text-left font-semibold">Subject</th>
                    <th className="px-3.5 py-2 text-center font-semibold">Units</th>
                    <th className="px-3.5 py-2 text-left font-semibold">Day</th>
                    <th className="px-3.5 py-2 text-left font-semibold">Section</th>
                    <th className="px-3.5 py-2 text-left font-semibold">Time</th>
                    <th className="px-3.5 py-2 text-left font-semibold">Room</th>
                    <th className="px-3.5 py-2 text-left font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {retakeSubjects.length > 0 ? (
                    renderRetakeRows(retakeSubjects)
                  ) : (
                    <tr>
                      <td colSpan="4" className="border px-3 py-6 text-center text-gray-400">
                        No retake subjects available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* Total Units & Action */}
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-500">
              {curriculumTotalUnits > 0 ? `${totalUnits}/${curriculumTotalUnits}` : totalUnits}
            </span>
            <span>Total credit units selected</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white shadow-sm transition ${selectedSubjects.length > 0
                ? "bg-sky-600 hover:bg-sky-700"
                : "cursor-not-allowed bg-slate-300"
              }`}
            onClick={handleSubjectLoad}
            disabled={selectedSubjects.length === 0}
          >
            Load Selected Subjects
          </motion.button>
        </div>






        {showCurriculumModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="flex w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-lg max-h-[85vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <h2 className="text-base font-semibold text-slate-800">Curriculum Subjects</h2>
                <button
                  type="button"
                  onClick={() => setShowCurriculumModal(false)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                >
                  Close
                </button>
              </div>
              <div className="border-b border-slate-200 px-5 py-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {curriculumYearOptions.map((option) => {
                    const isActive = option === curriculumYearFilter;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setCurriculumYearFilter(option)}
                        className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                          isActive
                            ? "border border-sky-300 bg-sky-50 text-sky-700"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {curriculumSemesterOptions.map((option) => {
                    const isActive = option === curriculumSemesterFilter;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setCurriculumSemesterFilter(option)}
                        className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                          isActive
                            ? "border border-sky-300 bg-sky-50 text-sky-700"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                {filteredCurriculumGroups.length > 0 ? (
                  filteredCurriculumGroups.map(({ label, items }) => (
                    <div key={label} className="space-y-2">
                      <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full border-collapse text-[11.5px]">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Code</th>
                              <th className="px-3 py-2 text-left font-semibold">Subject</th>
                              <th className="px-3 py-2 text-left font-semibold">Units</th>
                              <th className="px-3 py-2 text-left font-semibold">Semester</th>
                              <th className="px-3 py-2 text-left font-semibold">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.length > 0 ? (
                              items.map((item) => {
                                const normalizedId = Number.isFinite(Number(item.id)) ? Number(item.id) : item.id;
                                const relatedId = Number.isFinite(Number(item.subject_id)) ? Number(item.subject_id) : item.subject_id;
                                const codeKey = item?.subject?.code ? `code:${String(item.subject.code).toLowerCase()}` : null;
                                const subjectRecord =
                                  availableSubjectMap.get(normalizedId) ??
                                  (relatedId ? availableSubjectMap.get(relatedId) : null) ??
                                  (codeKey ? availableSubjectMap.get(codeKey) : null);
                                const subjectDetails = subjectRecord ?? item;
                                const fallbackId = Number.isFinite(Number(subjectDetails?.subject_id))
                                  ? Number(subjectDetails.subject_id)
                                  : subjectDetails?.subject_id || normalizedId;
                                const subjectInfo = subjectDetails?.subject || {};
                                const units = (Number(subjectDetails?.lec_unit) || 0) + (Number(subjectDetails?.lab_unit) || 0);
                                const semesterLabel = item.semesterName || "-";
                                const targetSubject = subjectRecord
                                  ? {
                                      ...subjectRecord,
                                      schedules: Array.isArray(subjectRecord?.schedules)
                                        ? subjectRecord.schedules
                                        : Array.isArray(subjectDetails?.schedules)
                                          ? subjectDetails.schedules
                                          : [],
                                    }
                                  : {
                                      id: fallbackId,
                                      subject: subjectInfo,
                                      lec_unit: subjectDetails?.lec_unit,
                                      lab_unit: subjectDetails?.lab_unit,
                                      hasFailedPrerequisites: Boolean(subjectDetails?.hasFailedPrerequisites || subjectDetails?.has_failed_prerequisites),
                                      failedPrerequisiteIds: subjectDetails?.failedPrerequisiteIds || subjectDetails?.failed_prerequisite_ids || [],
                                      isFailed: Boolean(subjectDetails?.isFailed || subjectDetails?.is_failed),
                                      isBacktrack: Boolean(subjectDetails?.isBacktrack || subjectDetails?.is_backtrack),
                                      schedules: Array.isArray(subjectDetails?.schedules) ? subjectDetails.schedules : [],
                                    };
                                const effectiveId = subjectRecord
                                  ? (Number.isFinite(Number(subjectRecord.id)) ? Number(subjectRecord.id) : subjectRecord.id)
                                  : fallbackId;
                                const isBlocked = blockedSubjectIds.has(effectiveId);
                                const fullySelected = isSubjectFullySelected(targetSubject);
                                const actionDisabled = isBlocked;
                                const prerequisiteBlocked = Boolean(targetSubject.hasFailedPrerequisites);

                                return (
                                  <tr key={item.id} className="border-t border-slate-200 text-slate-600">
                                    <td className="px-3 py-2 font-medium text-slate-700">{subjectInfo?.code || "-"}</td>
                                    <td className="px-3 py-2">
                                      <div className="flex flex-col gap-1">
                                        <span>{subjectInfo?.descriptive_title || "-"}</span>
                                        {Array.isArray(item.prerequisiteCodes) && item.prerequisiteCodes.length > 0 && (
                                          <span className="text-[10px] font-medium text-slate-500">
                                            Prerequisites: {item.prerequisiteCodes.join(", ")}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">{units}</td>
                                    <td className="px-3 py-2">{semesterLabel}</td>
                                    <td className="px-3 py-2">
                                      <button
                                        type="button"
                                        disabled={actionDisabled}
                                        onClick={() => {
                                          if (!actionDisabled) {
                                            const annotatedSubject = {
                                              ...targetSubject,
                                              sourceYearLevel: targetSubject.sourceYearLevel ?? label,
                                              sourceSemester: targetSubject.sourceSemester ?? semesterLabel,
                                            };

                                            if (!subjectRecord) {
                                              registerManualSubject({
                                                ...annotatedSubject,
                                                lec_unit: annotatedSubject.lec_unit ?? subjectDetails?.lec_unit ?? 0,
                                                lab_unit: annotatedSubject.lab_unit ?? subjectDetails?.lab_unit ?? 0,
                                              });
                                            }

                                            toggleSubjectGroup(annotatedSubject);
                                          }
                                        }}
                                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10.5px] font-medium transition ${
                                          actionDisabled
                                            ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                                            : fullySelected
                                              ? "border border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:text-rose-700"
                                              : "border border-sky-200 bg-sky-50 text-sky-600 hover:border-sky-300 hover:text-sky-700"
                                        }`}
                                      >
                                        {actionDisabled
                                          ? "Unavailable"
                                          : fullySelected
                                            ? "Remove from Subject Load"
                                            : "Add to Subject Load"}
                                      </button>
                                      {(targetSubject.isFailed || targetSubject.isBacktrack) && (
                                        <span className="mt-1 block text-[10px] font-semibold text-rose-600">
                                          Retake
                                        </span>
                                      )}
                                      {prerequisiteBlocked && (
                                        <span className="mt-1 block text-[10px] font-medium text-amber-600">
                                          Prerequisite failed — resolve before loading
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan="5" className="px-3 py-3 text-center text-slate-400">No subjects listed.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                    No curriculum subjects available.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}


        {/* Grades Modal */}
        {showGradesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start z-50 pt-20"
          >
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              className="bg-white rounded-lg shadow-lg p-4 max-w-2xl w-full max-h-[500px] flex flex-col overflow-hidden"
            >
              <h2 className="text-lg font-semibold mb-3 text-gray-800">
                Grades • {enrollment.first_name} {enrollment.last_name}
              </h2>

              <div className="overflow-y-auto flex-1">
                {gradesLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Fetching latest grades...
                  </div>
                ) : gradesError ? (
                  <div className="flex h-full items-center justify-center text-center text-sm text-red-500">
                    {gradesError}
                  </div>
                ) : Object.keys(gradesData).length > 0 ? (
                  Object.entries(gradesData).map(([yearLevel, semesters]) => (
                    <div key={yearLevel} className="mb-4">
                      <h3 className="text-sm font-bold text-gray-700 mb-1 border-b border-gray-200 pb-1">
                        {yearLevel}
                      </h3>

                      {Object.entries(semesters).map(([semester, subjects]) => (
                        <div key={semester} className="mb-3">
                          <h4 className="text-xs font-semibold text-gray-600 mb-1">{semester}</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border border-gray-200 rounded table-auto">
                              <thead className="bg-blue-50 text-gray-700 sticky top-0">
                                <tr>
                                  <th className="border px-2 py-1 text-left">Code</th>
                                  <th className="border px-2 py-1 text-left">Subject</th>
                                  <th className="border px-2 py-1 text-center">Final Grade</th>
                                  <th className="border px-2 py-1 text-left">Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.isArray(subjects) && subjects.length > 0 ? (
                                  subjects.map((g) => {
                                    const midtermVal = typeof g.midterm === "number" ? g.midterm : null;
                                    const finalVal = typeof g.final === "number" ? g.final : null;
                                    const computedAverage = midtermVal !== null && finalVal !== null
                                      ? (midtermVal + finalVal) / 2
                                      : typeof g.grade === "number"
                                        ? g.grade
                                        : null;
                                    const remarkLower = (g.remarks || "").toLowerCase();
                                    const isPassed = remarkLower.includes("pass");
                                    const isFailed = remarkLower.includes("fail");
                                    const gradeColorClass = isPassed
                                      ? "text-emerald-600"
                                      : isFailed
                                        ? "text-rose-600"
                                        : "text-gray-700";

                                    return (
                                      <tr key={`${g.enrollment_id}-${g.subject_id}`} className="hover:bg-gray-50">
                                        <td className="border px-2 py-1">{g.subject_code || "-"}</td>
                                        <td className="border px-2 py-1">{g.subject_title || "-"}</td>
                                        <td className={`border px-2 py-1 text-center font-semibold ${gradeColorClass}`}>{formatGradeValue(computedAverage)}</td>
                                        <td className={`border px-2 py-1 ${gradeColorClass}`}>{g.remarks || "-"}</td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan="4" className="border px-2 py-2 text-center text-gray-400">
                                      No subjects found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-10 text-sm">
                    No grades available
                  </div>
                )}
              </div>


              <div className="flex justify-end mt-3">
                <button
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm font-medium transition"
                  onClick={() => {
                    setShowGradesModal(false);
                    setGradesData({});
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}


      </motion.div>
    </ProgramHeadLayout>
  );
}
