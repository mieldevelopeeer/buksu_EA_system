import React, { useMemo } from "react";
import { Head, usePage } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import GradeReport from "@/Pages/ProgramHead/PHreports/GradeReport";

const normalizeText = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";
  const lowered = text.toLowerCase();
  if (["null", "undefined", "nan"].includes(lowered)) return "";
  return text;
};

const formatPersonName = (entity) => {
  if (!entity) return "";
  const last = normalizeText(
    entity.lName ?? entity.last_name ?? entity.surname ?? entity.lastname
  );
  const first = normalizeText(
    entity.fName ?? entity.first_name ?? entity.given_name ?? entity.firstname
  );
  const middle = normalizeText(
    entity.mName ?? entity.middle_name ?? entity.middlename ?? entity.middle
  );

  if (!last && !first && !middle) return "";
  if (last && first) {
    const base = `${last}, ${first}`;
    return middle ? `${base} ${middle}` : base;
  }
  const base = last || first || middle;
  return middle && base !== middle ? `${base} ${middle}` : base;
};

const resolveStudentId = (record) => {
  const direct = normalizeText(record.id_number);
  if (direct) return direct;
  const candidates = [
    record.student_id_number,
    record.student_id,
    record.studentID,
    record.studentNumber,
    record.idNumber,
    record.id,
    record.student?.id_number,
    record.student?.idNumber,
    record.student?.student_id,
    record.student?.studentId,
    record.student?.student_id_number,
    record.student?.studentIdNumber,
    record.student?.profile?.id_number,
    record.student?.profile?.idNumber,
    record.student?.profile?.student_id_number,
    record.student?.profile?.studentIdNumber,
    record.student?.accounts?.id_number,
    record.student?.accounts?.idNumber,
    record.student?.accounts?.student_id_number,
    record.student?.accounts?.studentIdNumber,
    record.student_profile?.id_number,
    record.student_profile?.idNumber,
    record.student_profile?.student_id_number,
    record.student_profile?.studentIdNumber,
    record.student_profile?.student?.id_number,
    record.student_profile?.student?.idNumber,
    record.student?.student?.id_number,
    record.student?.student?.idNumber,
    record.student?.student?.profile?.id_number,
    record.student?.student?.profile?.idNumber,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (normalized) return normalized;
  }
  return "";
};

const extractSubjectInfo = (record) => {
  const subject =
    record.subject && typeof record.subject === "object"
      ? record.subject
      : record.curriculumSubject?.subject ||
        record.curriculum_subject?.subject ||
        record.classSchedule?.subject ||
        record.class_schedule?.subject ||
        null;
  const curriculumSubject =
    record.curriculumSubject ||
    record.curriculum_subject ||
    record.classSchedule?.curriculumSubject ||
    record.class_schedule?.curriculumSubject ||
    record.classSchedule?.curriculum_subject ||
    record.class_schedule?.curriculum_subject ||
    null;
  const schedule = record.classSchedule || record.class_schedule || {};

  const codeCandidates = [
    record.subject_code,
    subject?.code,
    subject?.subject_code,
    subject?.subjectCode,
    schedule.subject_code,
    schedule.subjectCode,
    schedule.subject?.code,
    schedule.subject?.subject_code,
    schedule.subject?.subjectCode,
    curriculumSubject?.subject_code,
    curriculumSubject?.subjectCode,
    curriculumSubject?.code,
    curriculumSubject?.subject?.code,
    curriculumSubject?.subject?.subject_code,
    curriculumSubject?.subject?.subjectCode,
  ];

  const code = codeCandidates.map(normalizeText).find(Boolean) || "";

  const description = normalizeText(
    record.subject_title ||
      subject?.descriptive_title ||
      subject?.title ||
      subject?.name ||
      curriculumSubject?.subject?.descriptive_title ||
      curriculumSubject?.subject?.title ||
      curriculumSubject?.subject?.name
  );

  let label = "Unassigned Subject";
  if (code && description) label = `${code} — ${description}`;
  else if (code) label = code;
  else if (description) label = description;

  return { code, description, label };
};

const resolveCourseLabel = (record) => {
  const course = record.course || record.classSchedule?.course || record.class_schedule?.course;
  const courseCode = course?.code || course?.course_code;
  const courseName = course?.description || course?.name;
  const yearLevel =
    record.year_level?.year_level ||
    record.yearLevel?.year_level ||
    record.year_level ||
    record.yearLevel ||
    record.year_level_display ||
    record.yearLevelDisplay;

  if (courseCode && yearLevel) return `${courseCode} • ${yearLevel}`;
  if (courseName && yearLevel) return `${courseName} • ${yearLevel}`;
  if (courseCode) return courseCode;
  if (courseName) return courseName;
  return "Unassigned Course";
};

const computeAverageValue = (midterm, final) => {
  const parseScore = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const mid = parseScore(midterm);
  const fin = parseScore(final);

  if (mid !== null && fin !== null) return (mid + fin) / 2;
  if (fin !== null) return fin;
  if (mid !== null) return mid;
  return null;
};

const resolveGradeValue = (record) => {
  const candidates = [
    record.final_grade,
    record.finalGrade,
    record.grade,
    record.final,
    record.gpa,
    record.general_average,
  ];
  for (const candidate of candidates) {
    const num = Number(candidate);
    if (Number.isFinite(num)) return num;
  }
  const average = computeAverageValue(record.midterm, record.final);
  return average !== null ? average : null;
};

const formatGradeDisplay = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  const formatted = numeric.toFixed(2);
  if (formatted.endsWith(".00")) {
    return String(numeric.toFixed(0));
  }
  return formatted;
};

const resolveRemarks = (record) =>
  normalizeText(record.remarks) ||
  normalizeText(record.status) ||
  normalizeText(record.final_status) ||
  normalizeText(record.midterm_status) ||
  "Pending";

const resolveTimestamp = (record) =>
  record.updated_at || record.updatedAt || record.created_at || record.createdAt || "";

const formatTimestampDisplay = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const resolveSemester = (record) =>
  record.semester?.semester ||
  record.semester?.name ||
  record.semester_name ||
  record.semester ||
  "";

const resolveSchoolYear = (record) =>
  record.school_year?.school_year ||
  record.school_year ||
  record.schoolYear ||
  record.school_year_name ||
  "";

const resolveInstructor = (record) => {
  const sources = [
    record.instructor,
    record.faculty,
    record.teacher,
    record.classSchedule?.faculty,
    record.class_schedule?.faculty,
    record.classSchedule?.instructor,
    record.class_schedule?.instructor,
  ];
  for (const source of sources) {
    if (source && typeof source === "object") {
      const formatted = formatPersonName(source);
      if (formatted) return formatted;
    }
  }
  return normalizeText(record.instructor_name || record.faculty_name) || "Registrar";
};

const resolveSchedule = (record) =>
  record.schedule_display ||
  record.schedule ||
  record.classSchedule?.schedule ||
  record.class_schedule?.schedule ||
  record.classSchedule?.time ||
  record.class_schedule?.time ||
  "TBA";

const buildSummary = (entries = [], registrarName = "Registrar") => {
  const byRemarks = {};
  const subjectCounts = new Map();
  let gradeTotal = 0;
  let gradeCount = 0;

  entries.forEach((entry) => {
    const remark = resolveRemarks(entry).toLowerCase();
    byRemarks[remark] = (byRemarks[remark] || 0) + 1;

    const { label } = extractSubjectInfo(entry);
    subjectCounts.set(label, (subjectCounts.get(label) || 0) + 1);

    const numericGrade = resolveGradeValue(entry);
    if (typeof numericGrade === "number" && Number.isFinite(numericGrade)) {
      gradeTotal += numericGrade;
      gradeCount += 1;
    }
  });

  const top_subjects = Array.from(subjectCounts.entries())
    .map(([subject, total]) => ({ subject, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const sample = entries[0] || {};
  const subjectInfo = extractSubjectInfo(sample);

  const meta = {
    campus: "ALUBIJID",
    semester: resolveSemester(sample) || "—",
    school_year: resolveSchoolYear(sample) || "—",
    instructor: resolveInstructor(sample) || registrarName,
    program_head: registrarName,
    campus_head: sample.campus_head || "Campus Head",
    subject_code: subjectInfo.code || "—",
    subject_description: subjectInfo.description || "—",
    schedule: resolveSchedule(sample) || "—",
    date: new Date().toLocaleDateString(),
  };

  return {
    total: entries.length,
    average: gradeCount ? gradeTotal / gradeCount : null,
    by_remarks: byRemarks,
    top_subjects,
    meta,
  };
};

const buildRecent = (entries = []) =>
  entries.map((entry) => {
    const subjectInfo = extractSubjectInfo(entry);
    const gradeValue = resolveGradeValue(entry);
    return {
      id: entry.id,
      student: entry.student_display || formatPersonName(entry.student) || "Unnamed Student",
      student_id: resolveStudentId(entry) || "—",
      subject: subjectInfo.label,
      subject_code: subjectInfo.code || "—",
      subject_description: subjectInfo.description || "—",
      course: resolveCourseLabel(entry),
      grade: formatGradeDisplay(gradeValue),
      remarks: resolveRemarks(entry),
      updated_at: formatTimestampDisplay(resolveTimestamp(entry)),
      semester: resolveSemester(entry),
      school_year: resolveSchoolYear(entry),
      instructor: resolveInstructor(entry),
      schedule: resolveSchedule(entry),
    };
  });

export default function GradeReports() {
  const { grades = { data: [] }, auth } = usePage().props;
  const gradeEntries = Array.isArray(grades?.data) ? grades.data : [];

  const summary = useMemo(
    () => buildSummary(gradeEntries, auth?.user?.name || "Registrar"),
    [gradeEntries, auth?.user?.name]
  );

  const recent = useMemo(() => buildRecent(gradeEntries), [gradeEntries]);

  return (
    <RegistrarLayout>
      <Head title="Grade Reports" />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <GradeReport summary={summary} recent={recent} />
      </div>
    </RegistrarLayout>
  );
}
