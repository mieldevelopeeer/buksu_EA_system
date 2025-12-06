import React, { useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Search, User, GraduationCap, Plus } from "lucide-react";

const parseEnrollmentTimestamp = (value) => {
    if (!value) return 0;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const pickLatestEnrollment = (enrollments) => {
    if (!Array.isArray(enrollments) || enrollments.length === 0) return null;
    if (enrollments.length === 1) return enrollments[0];
    return [...enrollments].sort((a, b) => parseEnrollmentTimestamp(b?.enrolled_at) - parseEnrollmentTimestamp(a?.enrolled_at))[0];
};

const formatStudentName = ({ fName, mName, lName, suffix }) => {
    const last = lName?.trim();
    const first = fName?.trim();
    const middle = mName?.trim();
    const suffixText = suffix?.trim();

    const primary = [last, first].filter(Boolean).join(", ");
    const middleSection = middle ? ` ${middle}` : "";
    const suffixSection = suffixText ? ` ${suffixText}` : "";

    return (primary || "Unnamed Student") + middleSection + suffixSection;
};

export default function StudentProfile({ students, courses = [], filters = {} }) {
    const [search, setSearch] = useState(filters.search ?? "");
    const [filterCourse, setFilterCourse] = useState(filters.course ?? "All");
    const [perPage, setPerPage] = useState(Number(filters.per_page) || 12);
    const [letterFilter, setLetterFilter] = useState(filters.letter ?? "All");

    const letterOptions = useMemo(() => {
        const letters = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
        return ["All", ...letters];
    }, []);

    // Extract unique courses
    const courseOptions = useMemo(() => {
        const sanitized = (Array.isArray(courses) ? courses : [])
            .filter((code) => typeof code === "string" && code.trim().length > 0)
            .map((code) => code.trim())
            .sort((a, b) => a.localeCompare(b));

        return ["All", ...sanitized];
    }, [courses]);

    const studentList = students?.data ?? [];
    const paginationLinks = students?.links ?? [];
    const totalStudents = students?.meta?.total ?? studentList.length;
    const showingFrom = students?.meta?.from ?? (studentList.length ? 1 : 0);
    const showingTo = students?.meta?.to ?? studentList.length;

    const applyFilters = (overrides = {}) => {
        const query = {
            search: overrides.search ?? search ?? "",
            course: overrides.course ?? filterCourse ?? "All",
            letter: overrides.letter ?? letterFilter ?? "All",
            per_page: overrides.per_page ?? perPage ?? 12,
        };

        if (overrides.page) {
            query.page = overrides.page;
        }

        router.get(route("registrar.students.profile"), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        applyFilters({ search, page: 1 });
    };

    const handleCourseChange = (value) => {
        setFilterCourse(value);
        applyFilters({ course: value, page: 1 });
    };

    const handlePerPageChange = (value) => {
        const parsed = Number(value) || 12;
        setPerPage(parsed);
        applyFilters({ per_page: parsed, page: 1 });
    };

    const handleLetterChange = (value) => {
        setLetterFilter(value);
        applyFilters({ letter: value, page: 1 });
    };

    const handlePaginationClick = (link) => {
        if (!link.url || link.active) return;
        router.visit(link.url, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const formatLabel = (label) =>
        label
            .replace(/&laquo;/g, "«")
            .replace(/&raquo;/g, "»")
            .replace(/&nbsp;/g, " ");

    return (
        <RegistrarLayout>
            <div className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-white via-blue-50/40 to-slate-50">

                <div className="mx-auto w-full max-w-6xl px-4 py-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-end">
                            <Link
                                href={route("registrar.students.profile.create")}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600 sm:w-auto"
                            >
                                <Plus className="h-4 w-4" />
                                Add Student Info
                            </Link>
                        </div>

                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div className="space-y-1.5">
                                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                                    <GraduationCap className="h-3.5 w-3.5 text-blue-500" /> Registrar
                                </div>
                                <h1 className="text-xl font-semibold text-slate-900">Student Profiles</h1>
                                <p className="text-xs text-slate-500">Search and filter students quickly with a clean directory layout.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5 md:w-auto">
                                <div className="relative flex-1 sm:min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500/80" />
                                    <input
                                        type="text"
                                        placeholder="Search students"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                                    />
                                </div>
                                <select
                                    value={filterCourse}
                                    onChange={(e) => handleCourseChange(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                                >
                                    {courseOptions.map((course, idx) => (
                                        <option key={`${course}-${idx}`} value={course}>
                                            {course}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={perPage}
                                    onChange={(e) => handlePerPageChange(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                                >
                                    {[12, 24, 36, 48].map((size) => (
                                        <option key={size} value={size}>
                                            {size} / page
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="submit"
                                    className="rounded-lg border border-blue-400 bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:border-blue-500 hover:bg-blue-500/20"
                                >
                                    Apply
                                </button>
                            </form>
                        </div>

                        <div className="mt-6 rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-sm">
                            <header className="flex flex-col gap-1 border-b border-slate-100 pb-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-800">Directory</h2>
                                    <p className="text-[11px] text-slate-500">
                                        Showing {showingFrom}-{showingTo} of {totalStudents} students
                                    </p>
                                </div>
                            </header>

                            {/* Student List */}
                            <div className="mt-4 flex gap-3">
                                <div className="flex-1">
                                    {studentList.length === 0 ? (
                                        <p className="py-8 text-center text-xs text-slate-400">No students found.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                            {studentList.map((student) => {
                                                const latestEnrollment = pickLatestEnrollment(student.enrollments);
                                                const normalizedStatus = (latestEnrollment?.status ?? "").toString().toLowerCase();
                                                const isUnenrolled = normalizedStatus === "unenrolled";

                                                return (
                                                    <div
                                                        key={student.id}
                                                        className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-white p-3 transition hover:border-blue-200"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {student.profile_picture ? (
                                                                <img
                                                                    src={`/storage/${student.profile_picture}`}
                                                                    alt={student.fName}
                                                                    className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-500">
                                                                    <User className="h-5 w-5" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <h3 className="text-xs font-semibold text-slate-800">
                                                                    {formatStudentName(student)}
                                                                </h3>
                                                                <p className="text-[11px] text-slate-500">{student.id_number ?? "No ID"}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-600 min-h-[18px]">
                                                            {latestEnrollment && !isUnenrolled && (
                                                                <>
                                                                    {latestEnrollment.course?.code && <span>{latestEnrollment.course?.code}</span>}
                                                                    {latestEnrollment.year_level?.year_level && <span>{latestEnrollment.year_level?.year_level}</span>}
                                                                    {latestEnrollment.semester?.semester && <span>{latestEnrollment.semester?.semester}</span>}
                                                                </>
                                                            )}
                                                            {!latestEnrollment && (
                                                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500">
                                                                    No enrollment record
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="space-y-0.5 text-[10px] text-slate-500">
                                                            <p className="break-words">{student.email ?? "No email"}</p>
                                                            <p className="break-words">{student.contact_no ?? "No contact"}</p>
                                                        </div>

                                                        <Link
                                                            href={route("registrar.students.profile.show", student.id)}
                                                            className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
                                                        >
                                                            View Records
                                                        </Link>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="relative flex w-12 shrink-0 justify-center">
                                    <div className="group flex h-full w-full flex-col items-center justify-center">
                                        <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-blue-200/70 hover:scrollbar-thumb-blue-400 focus:scrollbar-thumb-blue-400 h-[520px] w-9 origin-center overflow-y-auto rounded-full border border-slate-200/80 bg-white/80 px-1 py-2 text-[9px] font-semibold text-slate-500 opacity-70 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                                            {letterOptions.map((letter) => {
                                                const isActive = letterFilter === letter;
                                                return (
                                                    <button
                                                        key={letter}
                                                        type="button"
                                                        onClick={() => handleLetterChange(letter)}
                                                        className={`mb-1 w-full rounded-full border px-0 py-0.5 tracking-wide transition last:mb-0 ${
                                                            isActive
                                                                ? "border-blue-400 bg-blue-50 text-blue-700 shadow"
                                                                : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                                                        }`}
                                                    >
                                                        {letter}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <nav className="mt-4 flex justify-center gap-2">
                                {paginationLinks.map((link) => (
                                    <button
                                        key={link.label}
                                        disabled={!link.url || link.active}
                                        onClick={() => handlePaginationClick(link)}
                                        className={`min-w-[2rem] rounded border px-2 py-1 transition ${
                                            link.active
                                                ? "border-blue-600 bg-blue-600 text-white"
                                                : !link.url
                                                    ? "cursor-not-allowed border-slate-200 text-slate-300"
                                                    : "border-blue-100 text-blue-600 hover:border-blue-300"
                                        }`}
                                    >
                                        {formatLabel(link.label)}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </RegistrarLayout>
    );
}
