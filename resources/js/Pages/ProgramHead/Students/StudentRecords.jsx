import React, { useMemo, useState } from "react";
import { Head, Link, usePage, router } from "@inertiajs/react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import {
  Notebook,
  GraduationCap,
  Calendar,
  Stack,
  MagnifyingGlass,
  CloudArrowDown,
  FilePdf,
  ArrowSquareOut,
} from "phosphor-react";

const formatAverage = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "—";

const normalizeText = (value) => String(value || "").toLowerCase().trim();

const statusTone = (summary) => {
  const value = normalizeText(summary);

  if (value.includes("fail")) return "text-rose-600";
  if (value.includes("mixed")) return "text-amber-500";
  if (value.includes("pass")) return "text-emerald-600";

  return "text-slate-500";
};

export default function StudentRecords() {
  const {
    records = [],
    exportUrl = null,
    student = null,
    filters = {},
    routes: routeNames = {},
  } = usePage().props;

  const [search, setSearch] = useState(filters.search ?? "");
  const [yearFilter, setYearFilter] = useState(filters.year ?? "all");
  const [schoolYearFilter, setSchoolYearFilter] = useState(filters.school_year ?? "all");

  const yearOptions = useMemo(() => {
    return ["all", ...new Set(records.map((record) => record.year_level_label).filter(Boolean))];
  }, [records]);

  const schoolYearOptions = useMemo(() => {
    return ["all", ...new Set(records.map((record) => record.school_year).filter(Boolean))];
  }, [records]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    return records.filter((record) => {
      const yearLevel = normalizeText(record.year_level_label);
      const schoolYear = normalizeText(record.school_year);
      const studentName = normalizeText(
        `${record.student?.lName || ""}, ${record.student?.fName || ""} ${record.student?.mName || ""}`
      );
      const idNumber = normalizeText(record.student?.id_number);

      const matchesSearch =
        normalizedSearch === "" ||
        studentName.includes(normalizedSearch) ||
        idNumber.includes(normalizedSearch) ||
        normalizeText(record.course?.code).includes(normalizedSearch);
      const matchesYear = yearFilter === "all" || yearLevel === normalizeText(yearFilter);
      const matchesSchoolYear =
        schoolYearFilter === "all" || schoolYear === normalizeText(schoolYearFilter);

      return matchesSearch && matchesYear && matchesSchoolYear;
    });
  }, [records, search, yearFilter, schoolYearFilter]);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const handlePageChange = (direction) => {
    setPage((prev) => {
      if (direction === "prev") {
        return Math.max(1, prev - 1);
      }
      if (direction === "next") {
        return Math.min(totalPages, prev + 1);
      }
      return prev;
    });
  };

  const handleDirectPage = (value) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      setPage(Math.min(totalPages, Math.max(1, parsed)));
    }
  };

  const handleExport = (type) => {
    if (!exportUrl) return;

    router.visit(exportUrl, {
      method: "get",
      preserveScroll: true,
      data: {
        ...filters,
        search,
        year: yearFilter,
        school_year: schoolYearFilter,
        format: type,
      },
    });
  };

  return (
    <ProgramHeadLayout>
      <Head title="Student Academic Records" />

      <div className="px-4 py-5 md:px-5 md:py-6 space-y-4">
        <header className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-500">
              <Notebook size={18} />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Student Academic Records</h1>
              <p className="text-[12px] text-slate-500">
                Review grade snapshots per enrollment to gauge progression over time.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleExport("excel")}
              disabled={!exportUrl}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CloudArrowDown size={14} /> Excel
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={!exportUrl}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 transition hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FilePdf size={14} /> PDF
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200/80 bg-white/95 p-3.5 shadow-sm">
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:w-56">
              <MagnifyingGlass
                size={16}
                className="absolute left-2.5 top-2.5 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student, ID, or course"
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[13px] text-slate-700 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring focus:ring-sky-100"
              />
            </div>

            <div className="flex flex-wrap gap-1 text-[10px]">
              <label className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
                <Stack size={12} />
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="bg-transparent text-slate-700 focus:outline-none"
                >
                  {yearOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All Years" : option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
                <Calendar size={12} />
                <select
                  value={schoolYearFilter}
                  onChange={(e) => setSchoolYearFilter(e.target.value)}
                  className="bg-transparent text-slate-700 focus:outline-none"
                >
                  {schoolYearOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All School Years" : option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-[12px] text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Student</th>
                  <th className="px-3 py-2 text-left">Program</th>
                  <th className="px-3 py-2 text-left">Year</th>
                  <th className="px-3 py-2 text-left">School Year</th>
                  <th className="px-3 py-2 text-left">Summary</th>
                  <th className="px-3 py-2 text-center">Average</th>
                  <th className="px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((record) => {
                    const studentName = `${record.student?.lName || ""}, ${record.student?.fName || ""} ${record.student?.mName || ""}`.replace(/\s+/g, " ").trim();
                    const remarksSummary = record.remarks_summary || "—";
                    const summaryTone = statusTone(remarksSummary);

                    return (
                      <tr key={record.enrollment_id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="px-3 py-2 text-[13px] font-medium text-slate-800">
                          <div className="space-y-0.5">
                            <span>{studentName || "Unnamed"}</span>
                            <span className="block text-[10px] text-slate-400">ID: {record.student?.id_number || "—"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[12px]">
                          <div className="space-y-0.5">
                            <span>{record.course?.name || "—"}</span>
                            <span className="block text-[10px] uppercase text-slate-400">{record.course?.code || "—"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[12px]">{record.year_level_label || "—"}</td>
                        <td className="px-3 py-2 text-[12px]">{record.school_year || "—"}</td>
                        <td className={`px-3 py-2 text-[12px] font-semibold ${summaryTone}`}>{remarksSummary}</td>
                        <td className="px-3 py-2 text-center text-[12px] font-semibold text-slate-700">
                          {formatAverage(record.average)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              href={route("program-head.academic-records.show", record.enrollment_id)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-[5px] text-[11px] font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-700"
                            >
                              <ArrowSquareOut size={12} /> View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-5 text-center text-[13px] text-slate-400">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-col gap-2 text-[11px] text-slate-500 md:flex-row md:items-center md:justify-between">
            <div>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredRecords.length)} of {filteredRecords.length} records</div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange("prev")}
                disabled={page === 1}
                className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange("next")}
                disabled={page === totalPages}
                className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {student && (
          <section className="rounded-xl border border-slate-200/80 bg-white/95 p-3.5 shadow-sm">
            <header className="flex items-center gap-2 text-slate-600">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                <GraduationCap size={18} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Student Overview</h2>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  {student.id_number || "ID not available"}
                </p>
              </div>
            </header>

            <dl className="mt-3 grid gap-2.5 text-[13px] text-slate-600 md:grid-cols-3">
              <div>
                <dt className="text-[11px] uppercase text-slate-400">Name</dt>
                <dd className="text-[13px] font-medium text-slate-800">
                  {`${student.lName || ""}, ${student.fName || ""} ${student.mName || ""}`.replace(/\s+/g, " ").trim() || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-slate-400">Program</dt>
                <dd className="text-[13px] font-medium text-slate-800">
                  {student.program?.name || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-slate-400">Status</dt>
                <dd className="text-[13px] font-medium text-slate-800">
                  {student.status || "—"}
                </dd>
              </div>
            </dl>
          </section>
        )}
      </div>
    </ProgramHeadLayout>
  );
}
