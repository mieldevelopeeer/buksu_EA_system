import React, { useMemo } from "react";
import { Head, usePage } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import EnrollmentReport from "@/Pages/ProgramHead/PHreports/EnrollmentReport";

const normalizeGender = (student) => (student?.gender || "").toLowerCase();

const formatStudentName = (record) => {
  const normalize = (value) => {
    if (typeof value === "string") return value.trim();
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  const last = normalize(record.student?.lName ?? record.lName ?? record.last_name);
  const first = normalize(record.student?.fName ?? record.fName ?? record.first_name);
  const middle = normalize(record.student?.mName ?? record.mName ?? record.middle_name);

  if (!last && !first && !middle) {
    return "Unnamed Student";
  }

  if (last && first) {
    const base = `${last}, ${first}`;
    return middle ? `${base} ${middle}` : base;
  }

  const base = last || first || middle;
  return middle && base !== middle ? `${base} ${middle}` : base;
};

const getProgramLabel = (entry) => {
  if (entry.course?.description) return entry.course.description;
  if (entry.course?.code && entry.major?.code) return `${entry.course.code}-${entry.major.code}`;
  if (entry.course?.code) return entry.course.code;
  return "Unassigned Program";
};

const buildSummary = (entries = [], preparedBy = "Registrar") => {
  const byStatus = {};
  const yearMap = new Map();
  const programMap = new Map();
  const programGroups = new Map();
  const grandTotals = { male: 0, female: 0, overall: 0 };

  entries.forEach((entry) => {
    const statusKey = (entry.status || "unspecified").toLowerCase();
    byStatus[statusKey] = (byStatus[statusKey] || 0) + 1;

    const yearLabel = entry.year_level?.year_level || "Unassigned";
    yearMap.set(yearLabel, (yearMap.get(yearLabel) || 0) + 1);

    const programLabel = getProgramLabel(entry);
    programMap.set(programLabel, (programMap.get(programLabel) || 0) + 1);

    const gender = normalizeGender(entry.student);
    const group = programGroups.get(programLabel) || {
      course_code: programLabel,
      rows: new Map(),
      totals: { male: 0, female: 0, total: 0 },
    };
    const row = group.rows.get(yearLabel) || { label: yearLabel, male: 0, female: 0, total: 0 };
    row.total += 1;
    if (gender === "male") {
      row.male += 1;
      group.totals.male += 1;
      grandTotals.male += 1;
    } else if (gender === "female") {
      row.female += 1;
      group.totals.female += 1;
      grandTotals.female += 1;
    } else {
      group.totals.total += 1;
    }
    group.totals.total += 1;
    grandTotals.overall += 1;
    group.rows.set(yearLabel, row);
    programGroups.set(programLabel, group);
  });

  const byYear = Array.from(yearMap.entries()).map(([year_level, total]) => ({ year_level, total }));
  const byProgram = Array.from(programMap.entries()).map(([program, total]) => ({ program, total }));
  const program_breakdown = Array.from(programGroups.values()).map((group) => ({
    course_code: group.course_code,
    rows: Array.from(group.rows.values()),
    totals: {
      label: group.course_code ? `TOTAL ${group.course_code}` : "PROGRAM TOTAL",
      male: group.totals.male,
      female: group.totals.female,
      total: group.totals.total,
    },
  }));

  const sample = entries[0] || {};
  const meta = {
    campus: "ALUBIJID",
    semester: sample.semester?.semester || "—",
    school_year: sample.school_year?.school_year || "—",
    prepared_by: preparedBy,
    prepared_role: "Registrar",
    date: new Date().toLocaleDateString(),
  };

  return {
    total: entries.length,
    programs: programMap.size,
    by_status: byStatus,
    by_year: byYear,
    by_program: byProgram,
    program_breakdown,
    grand_totals: grandTotals,
    meta,
  };
};

const buildRecent = (entries = []) =>
  entries.map((entry) => ({
    id: entry.id,
    student_name: formatStudentName(entry),
    student_id:
      entry.student_id_number || entry.id_number || entry.student?.id_number || "—",
    program: getProgramLabel(entry),
    year_level: entry.year_level?.year_level || "—",
    status: entry.status || "—",
    recorded_at: entry.enrolled_at || entry.created_at || entry.updated_at || "",
  }));

export default function EnrollmentReports() {
  const { enrollments = { data: [] }, auth } = usePage().props;
  const entries = enrollments.data || [];

  const summary = useMemo(
    () => buildSummary(entries, auth?.user?.name || "Registrar"),
    [entries, auth?.user?.name]
  );

  const recent = useMemo(() => buildRecent(entries), [entries]);

  return (
    <RegistrarLayout>
      <Head title="Enrollment Reports" />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <EnrollmentReport summary={summary} recent={recent} />
      </div>
    </RegistrarLayout>
  );
}
