import React, { useEffect, useMemo, useState } from "react";
import { usePage, Link } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { MagnifyingGlass, FileX, FileArrowDown, Printer } from "phosphor-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function EnrollmentReports() {
  const {
    enrollments = { data: [], links: [] },
    courses = [],
    yearLevels = [],
    semesters = [],
    schoolYears = [],
  } = usePage().props;

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [yearLevelFilter, setYearLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [schoolYearStart, setSchoolYearStart] = useState("all");
  const [schoolYearEnd, setSchoolYearEnd] = useState("all");
  const [singleSchoolYear, setSingleSchoolYear] = useState("all");
  const [logoData, setLogoData] = useState(null);

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      const aCode = (a?.code || "").toUpperCase();
      const bCode = (b?.code || "").toUpperCase();
      return aCode.localeCompare(bCode);
    });
  }, [courses]);

  const sortedYearLevels = useMemo(() => {
    return [...yearLevels].sort((a, b) => {
      const aLevel = (a?.year_level || "").toString().toUpperCase();
      const bLevel = (b?.year_level || "").toString().toUpperCase();
      return aLevel.localeCompare(bLevel);
    });
  }, [yearLevels]);

  const sortedSemesters = useMemo(() => {
    return [...semesters].sort((a, b) => {
      const aName = (a?.name || a?.semester || "").toString().toUpperCase();
      const bName = (b?.name || b?.semester || "").toString().toUpperCase();
      return aName.localeCompare(bName);
    });
  }, [semesters]);

  const sortedSchoolYears = useMemo(() => {
    return [...schoolYears].sort((a, b) => {
      const aYear = (a?.school_year || "").toString().toUpperCase();
      const bYear = (b?.school_year || "").toString().toUpperCase();
      return aYear.localeCompare(bYear);
    });
  }, [schoolYears]);

  useEffect(() => {
    if (
      schoolYearStart !== "all" &&
      schoolYearEnd !== "all" &&
      Number(schoolYearStart) > Number(schoolYearEnd)
    ) {
      setSchoolYearEnd(schoolYearStart);
    }
  }, [schoolYearStart, schoolYearEnd]);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch("/images/BukSu-Alubijid.png");
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => setLogoData(reader.result);
        reader.readAsDataURL(blob);
      } catch (error) {
        console.warn("Unable to load BukSU logo for PDF export.", error);
      }
    };

    loadLogo();
  }, []);

  // Helper: full course code
  const getCourseCode = (enroll) => {
    if (enroll.full_course_code) return enroll.full_course_code;
    if (!enroll.course) return "N/A";
    return enroll.major?.code
      ? `${enroll.course.code}-${enroll.major.code}`
      : enroll.course.code;
  };

  const filtered = useMemo(() => {
    return (enrollments.data || []).filter((e) => {
      const name = `${e.student?.fName || ""} ${e.student?.mName || ""} ${
        e.student?.lName || ""
      }`.trim();
      const studentId =
        e.student_id_number?.toString() ||
        e.id_number?.toString() ||
        e.student?.id_number?.toString() ||
        "";
      const courseId = e.course_id?.toString() || "";
      const yearLevelId = e.year_level_id?.toString() || "";
      const status = (e.status || "").toLowerCase();
      const semesterId =
        e.semester_id ??
        e.semester?.id ??
        (typeof e.semester === "object" && e.semester !== null
          ? e.semester?.id
          : null);

      const matchesSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        studentId.includes(search);

      const matchesCourse =
        courseFilter === "all" || courseId === courseFilter.toString();
      const matchesYear =
        yearLevelFilter === "all" || yearLevelId === yearLevelFilter.toString();
      const matchesStatus =
        statusFilter === "all" || status === statusFilter.toLowerCase();
      const matchesSemester =
        semesterFilter === "all" ||
        (semesterId !== null && String(semesterId) === semesterFilter);

      const schoolYearIdRaw =
        e.school_year_id ??
        e.school_year?.id ??
        e.school_year?.["id"] ??
        (typeof e.school_year === "object" && e.school_year !== null
          ? e.school_year?.id
          : null);
      const schoolYearId =
        schoolYearIdRaw !== null && schoolYearIdRaw !== undefined
          ? Number(schoolYearIdRaw)
          : null;

      const matchesSchoolYearStart =
        schoolYearStart === "all" ||
        (schoolYearId !== null && schoolYearId >= Number(schoolYearStart));

      const matchesSchoolYearEnd =
        schoolYearEnd === "all" ||
        (schoolYearId !== null && schoolYearId <= Number(schoolYearEnd));

      const matchesSingleSchoolYear =
        singleSchoolYear === "all" ||
        (schoolYearId !== null && schoolYearId === Number(singleSchoolYear));

      return (
        matchesSearch &&
        matchesCourse &&
        matchesYear &&
        matchesStatus &&
        matchesSemester &&
        matchesSchoolYearStart &&
        matchesSchoolYearEnd &&
        matchesSingleSchoolYear
      );
    });
  }, [
    enrollments.data,
    search,
    courseFilter,
    yearLevelFilter,
    statusFilter,
    semesterFilter,
    schoolYearStart,
    schoolYearEnd,
    singleSchoolYear,
  ]);

  const formatStudentName = (record) => {
    const normalize = (value) => {
      if (typeof value === "string") return value.trim();
      if (value === null || value === undefined) return "";
      return String(value).trim();
    };

    const last = normalize(
      record.student?.lName ?? record.lName ?? record.last_name ?? record.student_lName
    );
    const first = normalize(
      record.student?.fName ?? record.fName ?? record.first_name ?? record.student_fName
    );
    const middle = normalize(
      record.student?.mName ?? record.mName ?? record.middle_name ?? record.student_mName
    );

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

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) =>
      formatStudentName(a).localeCompare(formatStudentName(b), undefined, { sensitivity: "base" })
    );
  }, [filtered]);

  const statusSummary = useMemo(() => {
    return filtered.reduce(
      (acc, curr) => {
        const normalized = (curr.status || "unknown").toLowerCase();
        acc.total += 1;
        acc.byStatus[normalized] = (acc.byStatus[normalized] || 0) + 1;
        acc.courses.add(getCourseCode(curr));
        acc.yearLevels.add(curr.year_level?.year_level || "N/A");
        return acc;
      },
      { total: 0, byStatus: {}, courses: new Set(), yearLevels: new Set() }
    );
  }, [filtered]);

  const getStatusBadge = (status) => {
    const normalized = (status || "Pending").toLowerCase();
    if (normalized === "enrolled") return "bg-emerald-50 text-emerald-600 border-emerald-200";
    if (normalized === "pending") return "bg-amber-50 text-amber-600 border-amber-200";
    if (normalized === "dropped") return "bg-rose-50 text-rose-600 border-rose-200";
    return "bg-slate-100 text-slate-500 border-slate-200";
  };

  const summaryTiles = [
    {
      label: "Total Records",
      value: statusSummary.total,
      subtext: "After current filters",
    },
    {
      label: "Active Courses",
      value: statusSummary.courses.size,
      subtext: "Distinct course codes",
    },
    {
      label: "Year Levels",
      value: statusSummary.yearLevels.size,
      subtext: "Represented",
    },
    {
      label: "Enrolled",
      value: statusSummary.byStatus.enrolled || 0,
      subtext: `${statusSummary.byStatus.pending || 0} pending • ${
        statusSummary.byStatus.dropped || 0
      } dropped`,
    },
  ];

  const getSummaryPalette = (label) => {
    const palettes = {
      "Total Records": {
        container: "from-sky-50 via-white to-sky-100/60 border-sky-200/70",
        label: "text-sky-500",
        value: "text-sky-800",
        subtext: "text-sky-600",
      },
      "Active Courses": {
        container: "from-violet-50 via-white to-violet-100/60 border-violet-200/70",
        label: "text-violet-500",
        value: "text-violet-800",
        subtext: "text-violet-600",
      },
      "Year Levels": {
        container: "from-amber-50 via-white to-amber-100/60 border-amber-200/70",
        label: "text-amber-500",
        value: "text-amber-700",
        subtext: "text-amber-600",
      },
      Enrolled: {
        container: "from-emerald-50 via-white to-emerald-100/60 border-emerald-200/70",
        label: "text-emerald-500",
        value: "text-emerald-800",
        subtext: "text-emerald-600",
      },
    };

    return (
      palettes[label] || {
        container: "from-white via-slate-50 to-slate-100/60 border-slate-200/70",
        label: "text-slate-400",
        value: "text-slate-900",
        subtext: "text-slate-500",
      }
    );
  };

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Enrollment Reports", 14, 16);
    const tableColumn = [
      "Student ID",
      "Name",
      "Course Code",
      "Year Level",
      "Semester",
      "Status",
    ];
    const tableRows = sortedFiltered.map((e) => [
      e.student_id_number || e.id_number,
      formatStudentName(e),
      getCourseCode(e),
      e.year_level?.year_level || "",
      e.semester?.semester || "",
      e.status || "",
    ]);
    autoTable(doc, {
      startY: 42,
      head: [tableColumn],
      body: tableRows,
    });
    doc.save("EnrollmentReports.pdf");
  };

  // Export Excel
  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      sortedFiltered.map((e) => ({
        "Student ID": e.student_id_number || e.id_number,
        Name: formatStudentName(e),
        "Course Code": getCourseCode(e),
        "Year Level": e.year_level?.year_level || "",
        Semester: e.semester?.semester || "",
        Status: e.status || "",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Enrollments");
    XLSX.writeFile(workbook, "EnrollmentReports.xlsx");
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=1024,height=768");
    if (!printWindow) return;

    const tableHtml = document.getElementById("enrollment-report-table")?.outerHTML || "";
    const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((node) => node.outerHTML)
      .join("\n");

    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>Enrollment Reports</title>
    ${styles}
    <style>
      body { font-family: 'Poppins', sans-serif; padding: 24px; color: #1f2937; }
      h1 { font-size: 20px; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #cbd5f5; padding: 8px; text-align: left; }
      th { background-color: #f8fafc; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; }
      tr:nth-child(even) { background-color: #f9fafb; }
    </style>
  </head>
  <body>
    <h1>Enrollment Reports</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    ${tableHtml}
  </body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <RegistrarLayout>
      <div className="mx-auto w-full max-w-6xl px-2.5 md:px-4 py-5 font-sans text-[11px] md:text-[12px] text-slate-700">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Enrollment Reports</h1>
            <p className="text-[11px] text-slate-500">
              Monitor enrollment trends by course, year level, and status. Export filtered views for offline analysis.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={exportPDF}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-1.75 text-[11px] font-medium text-rose-600 transition hover:bg-rose-100"
            >
              <FileArrowDown size={14} /> PDF
            </button>
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-1.75 text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-100"
            >
              <FileArrowDown size={14} /> Excel
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.75 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {summaryTiles.map((tile) => {
            const palette = getSummaryPalette(tile.label);
            return (
              <div
                key={tile.label}
                className={`rounded-2xl border bg-gradient-to-br p-3 shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition hover:translate-y-[-1px] hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] ${palette.container}`}
              >
                <p className={`text-[10px] font-medium uppercase tracking-wide ${palette.label}`}>{tile.label}</p>
                <p className={`mt-1.5 text-lg font-semibold ${palette.value}`}>{tile.value}</p>
                <p className={`text-[10px] ${palette.subtext}`}>{tile.subtext}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white/95 p-3.5 shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
          <h2 className="text-[12px] font-semibold text-slate-800">Filters</h2>
          <div className="mt-3 flex flex-col gap-3">
            <div className="relative w-full max-w-sm">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search by student name or ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-9 py-1.5 text-[11px] text-slate-600 shadow-sm transition placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All Courses</option>
                {sortedCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>

              <select
                value={yearLevelFilter}
                onChange={(e) => setYearLevelFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All Year Levels</option>
                {sortedYearLevels.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year_level}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All Status</option>
                <option value="enrolled">Enrolled</option>
                <option value="pending">Pending</option>
                <option value="dropped">Dropped</option>
              </select>

              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">All Semesters</option>
                {sortedSemesters.map((sem) => (
                  <option
                    key={sem.id ?? sem.name}
                    value={sem.id !== undefined && sem.id !== null ? String(sem.id) : ""}
                  >
                    {sem.name || sem.semester}
                  </option>
                ))}
              </select>

              <select
                value={schoolYearStart}
                onChange={(e) => setSchoolYearStart(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">School Year From</option>
                {sortedSchoolYears.map((sy) => (
                  <option key={sy.id} value={sy.id}>
                    {sy.school_year}
                  </option>
                ))}
              </select>

              <select
                value={schoolYearEnd}
                onChange={(e) => setSchoolYearEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">School Year To</option>
                {sortedSchoolYears.map((sy) => (
                  <option key={sy.id} value={sy.id}>
                    {sy.school_year}
                  </option>
                ))}
              </select>
              <select
                value={singleSchoolYear}
                onChange={(e) => setSingleSchoolYear(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="all">Specific School Year</option>
                {sortedSchoolYears.map((sy) => (
                  <option key={`single-${sy.id}`} value={sy.id}>
                    {sy.school_year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table id="enrollment-report-table" className="min-w-full text-left text-[11px] md:text-[11.5px]">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-32 px-4 py-2.5 text-center">Student ID</th>
                    <th className="px-3.25 py-2.5">Student</th>
                    <th className="px-3.25 py-2.5">Course Code</th>
                    <th className="px-3.25 py-2.5">Year Level</th>
                    <th className="px-3.25 py-2.5">Semester</th>
                    <th className="px-3.25 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px] md:text-[11px] text-slate-600">
                  {sortedFiltered.map((enroll) => (
                    <tr key={enroll.id} className="hover:bg-slate-50/70">
                      <td className="w-32 px-4 py-2.5 text-center font-medium text-slate-700">
                        {enroll.student_id_number || enroll.id_number || "N/A"}
                      </td>
                      <td className="px-3.25 py-2.5">
                        <div className="text-[11px] md:text-[11.5px] font-semibold text-slate-800">
                          {formatStudentName(enroll)}
                        </div>
                        <div className="text-[9.3px] md:text-[9.8px] text-slate-400">{enroll.student?.email || "No email"}</div>
                      </td>
                      <td className="px-3.25 py-2.5 text-slate-700">{getCourseCode(enroll)}</td>
                      <td className="px-3.25 py-2.5 text-slate-600">{enroll.year_level?.year_level || "N/A"}</td>
                      <td className="px-3.25 py-2.5 text-slate-600">{enroll.semester?.semester || "N/A"}</td>
                      <td className="px-3.25 py-2.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.3 py-0.7 text-[10px] md:text-[10.5px] font-medium ${getStatusBadge(
                            enroll.status
                          )}`}
                        >
                          {enroll.status || "Unknown"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
              <FileX size={46} className="text-slate-300" weight="duotone" />
              <p className="text-sm font-medium">No enrollments match the current filters.</p>
              <p className="text-[11px] text-slate-400">Adjust filters or clear search to broaden results.</p>
            </div>
          )}
        </div>

        {enrollments.links.length > 1 && (
          <div className="mt-5 flex justify-center">
            <nav className="flex flex-wrap gap-1 text-[10.5px] md:text-[11px]">
              {enrollments.links.map((link, i) => (
                <Link
                  key={i}
                  href={link.url || "#"}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    link.active
                      ? "bg-sky-500 text-white shadow"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                />
              ))}
            </nav>
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}
