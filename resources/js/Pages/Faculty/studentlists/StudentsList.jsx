import React, { useEffect, useMemo, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";
import FacultyLayout from "@/Layouts/FacultyLayout";
import { ChalkboardTeacher, FunnelSimple, MagnifyingGlass, UsersThree } from "phosphor-react";

export default function StudentsList() {
    const {
        teachingLoads = [],
        termLabel = "",
        auth,
        pagination: incomingPagination = {},
        filters: incomingFilters = {},
    } = usePage().props;

    const [selectedSubject, setSelectedSubject] = useState("all");
    const [search, setSearch] = useState("");
    const [droppingId, setDroppingId] = useState(null);
    const [restoringId, setRestoringId] = useState(null);
    const [perPage, setPerPage] = useState(incomingFilters?.perPage ?? 5);

    const activeFacultyId = auth?.user?.id ?? null;
    const pagination = useMemo(
        () => ({
            currentPage: incomingPagination?.currentPage ?? incomingPagination?.current_page ?? 1,
            lastPage: incomingPagination?.lastPage ?? incomingPagination?.last_page ?? 1,
            perPage: incomingPagination?.perPage ?? incomingPagination?.per_page ?? perPage,
            total: incomingPagination?.total ?? 0,
            from: incomingPagination?.from ?? 0,
            to: incomingPagination?.to ?? 0,
        }),
        [incomingPagination, perPage]
    );

    useEffect(() => {
        if (incomingFilters?.perPage && Number(incomingFilters.perPage) !== Number(perPage)) {
            setPerPage(Number(incomingFilters.perPage));
        }
    }, [incomingFilters?.perPage]);

    const extractStudents = (rawStudents) => {
        if (Array.isArray(rawStudents)) {
            return rawStudents;
        }

        if (Array.isArray(rawStudents?.data)) {
            return rawStudents.data;
        }

        if (rawStudents && typeof rawStudents === "object") {
            const possibleArray = Object.values(rawStudents).filter((value) => value !== undefined && value !== null);
            if (possibleArray.length > 0 && possibleArray.every((value) => typeof value === "object")) {
                return possibleArray;
            }
        }

        return [];
    };

    useEffect(() => {
        console.log("StudentsList: incoming props", { teachingLoads, termLabel, activeFacultyId });
    }, [teachingLoads, termLabel, activeFacultyId]);

    const filteredTeachingLoads = useMemo(() => {
        if (!activeFacultyId) {
            return teachingLoads;
        }

        const filtered = teachingLoads.filter((load) => {
            const candidateIds = [
                load?.faculty_id,
                load?.facultyId,
                load?.instructor_id,
                load?.instructorId,
                load?.assigned_faculty_id,
                load?.faculty?.id,
                load?.instructor?.id,
            ]
                .filter((value) => value !== null && value !== undefined)
                .map((value) => Number(value));

            if (candidateIds.length === 0) {
                return true;
            }

            return candidateIds.some((id) => Number.isFinite(id) && id === Number(activeFacultyId));
        });

        return filtered.length > 0 ? filtered : teachingLoads;
    }, [teachingLoads, activeFacultyId]);

    const normalizedLoads = useMemo(
        () =>
            filteredTeachingLoads.map((load, index) => {
                const subject = load?.subject ?? {};
                const subjectKey = subject.code || subject.name || "subject";
                const subjectId = String(subject.id ?? `${subjectKey}-${index}`);

                const students = extractStudents(load?.students);
                const classScheduleId = load?.classScheduleId ?? load?.class_schedule_id ?? load?.classSchedule?.id ?? null;
                const enrollmentSubjectCount = Array.isArray(students) ? students.length : 0;
                const rawFacultyId = load?.faculty_id ?? load?.facultyId ?? load?.faculty?.id ?? null;

                return {
                    subjectId,
                    classScheduleId,
                    facultyId: rawFacultyId,
                    raw: load,
                    subjectName: subject.name ?? "Unnamed Subject",
                    subjectCode: subject.code ?? "",
                    sectionName: (load?.section?.name ?? load?.section) ?? "",
                    schedule: load?.schedule ?? "",
                    enrollmentSubjectCount,
                    students: students.map((student, studentIndex) => {
                        const constructedName = [student?.last_name, student?.first_name]
                            .filter(Boolean)
                            .join(", ");
                        const fallbackName = constructedName || `Student ${studentIndex + 1}`;

                        const composedName = student?.name ?? fallbackName;

                        return {
                            id: student?.id ?? student?.student_id ?? `${subjectId}-student-${studentIndex}`,
                            name: composedName,
                            studentNumber: (student?.student_number ?? student?.studentNo) ?? "",
                            program: student?.program ?? student?.course ?? "",
                            yearLevel: student?.year_level ?? student?.yearLevel ?? "",
                            email: student?.email ?? "",
                            section: student?.section?.name ?? student?.section ?? "",
                            status: student?.status ?? "",
                            statusRaw: (student?.statusRaw ?? student?.status ?? "").toLowerCase(),
                            classScheduleId,
                            enrollment_subject_id: student?.enrollment_subject_id,
                            sourceType: student?.sourceType ?? null,
                            canDrop: Boolean(student?.canDrop) && String(student?.status ?? "").toLowerCase() !== "dropped",
                        };
                    }),
                };
            }),
        [filteredTeachingLoads]
    );

    const subjects = useMemo(
        () =>
            normalizedLoads.map((load) => ({
                value: load.subjectId,
                label: `${load.subjectCode ? `${load.subjectCode} · ` : ""}${load.subjectName}`.trim(),
            })),
        [normalizedLoads]
    );

    const filteredLoads = useMemo(() => {
        const query = search.trim().toLowerCase();

        return normalizedLoads
            .filter((load) => selectedSubject === "all" || load.subjectId === selectedSubject)
            .map((load) => {
                if (!query) {
                    return load;
                }

                const filteredStudents = load.students.filter((student) => {
                    const haystack = [
                        student.name,
                        student.studentNumber,
                        student.email,
                        student.program,
                        student.section,
                        student.status,
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                    return haystack.includes(query);
                });

                return { ...load, students: filteredStudents };
            });
    }, [normalizedLoads, selectedSubject, search]);

    const groupedLoads = useMemo(() => {
        const sectionsMap = new Map();

        filteredLoads.forEach((load, index) => {
            const sectionData = load?.raw?.section ?? {};
            const sectionName = load.sectionName || sectionData?.section || "No section assigned";
            const classScheduleKey =
                load.classScheduleId ??
                load.class_schedule_id ??
                load.classSchedule?.id ??
                load.raw?.classScheduleId ??
                load.raw?.class_schedule_id ??
                load.raw?.classSchedule?.id ??
                `idx-${index}`;
            const groupingId = sectionData?.id ?? sectionName;

            if (!sectionsMap.has(groupingId)) {
                sectionsMap.set(groupingId, {
                    id: groupingId,
                    name: sectionName,
                    yearLevel:
                        sectionData?.year_level ?? sectionData?.yearLevel?.year_level ?? sectionData?.yearLevel ?? null,
                    loads: [],
                });
            }

            sectionsMap.get(groupingId).loads.push({ ...load, sectionKey: `${groupingId}-${classScheduleKey}` });
        });

        return Array.from(sectionsMap.values())
            .map((section) => ({
                ...section,
                totalStudents: section.loads.reduce((sum, load) => sum + load.students.length, 0),
            }))
            .filter((section) => section.loads.length > 0)
            .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }, [filteredLoads]);

    useEffect(() => {
        console.log("StudentsList: normalized and filtered", {
            normalizedLoads,
            filteredLoads,
            selectedSubject,
            search,
        });
    }, [normalizedLoads, filteredLoads, selectedSubject, search]);

    const totalDisplayedStudents = useMemo(
        () => groupedLoads.reduce((sum, section) => sum + section.totalStudents, 0),
        [groupedLoads]
    );

    const totalDisplayedSections = useMemo(() => {
        const sectionIds = new Set();
        groupedLoads.forEach((section) => {
            sectionIds.add(section.id);
        });
        return sectionIds.size;
    }, [groupedLoads]);

    const handlePaginationRequest = (params = {}) => {
        router.get(
            "/faculty/students-list",
            {
                page: params.page ?? pagination.currentPage,
                perPage: params.perPage ?? perPage,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            }
        );
    };

    const handlePerPageChange = (event) => {
        const value = Number(event.target.value);
        setPerPage(value);
        handlePaginationRequest({ page: 1, perPage: value });
    };

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > pagination.lastPage) {
            return;
        }
        handlePaginationRequest({ page: newPage });
    };

    const handleDropStudent = async (student) => {
        if (!student?.enrollment_subject_id) {
            await Swal.fire({
                icon: "info",
                title: "Section roster entry",
                text: "Only students tied to this specific class schedule can be dropped.",
                confirmButtonText: "Got it",
            });
            return;
        }

        const response = await Swal.fire({
            icon: "warning",
            title: `Drop ${student.name || "this student"}?`,
            text: "The student will be marked as dropped for this class.",
            width: 360,
            customClass: {
                popup: "rounded-2xl text-sm",
                title: "text-base",
                confirmButton: "text-xs px-3 py-1.5",
                cancelButton: "text-xs px-3 py-1.5",
            },
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            confirmButtonText: "Drop Student",
            cancelButtonText: "Cancel",
        });

        if (!response.isConfirmed) {
            return;
        }

        const reasonPrompt = await Swal.fire({
            icon: "question",
            title: "Drop reason",
            input: "textarea",
            inputAttributes: {
                placeholder: "Provide an optional note (max 500 characters)",
                maxlength: 500,
            },
            inputValidator: (value) => {
                if (value && value.length > 500) {
                    return "Reason must be 500 characters or less.";
                }
                return null;
            },
            showCancelButton: true,
            confirmButtonText: "Submit",
            cancelButtonText: "Cancel",
        });

        if (!reasonPrompt.isConfirmed) {
            return;
        }

        setDroppingId(student.enrollment_subject_id);

        router.post(
            "/faculty/students-list/drop",
            {
                enrollment_subject_id: student.enrollment_subject_id,
                reason: reasonPrompt.value,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    Swal.fire({
                        icon: "success",
                        title: "Student dropped",
                        timer: 1800,
                        showConfirmButton: false,
                    });
                },
                onError: () => {
                    Swal.fire({
                        icon: "error",
                        title: "Unable to drop student",
                        text: "Please try again or contact support.",
                    });
                },
                onFinish: () => setDroppingId(null),
            }
        );
    };

    const handleUndoDropStudent = async (student) => {
        if (!student?.enrollment_subject_id) {
            return;
        }

        const response = await Swal.fire({
            icon: "question",
            title: `Restore ${student.name || "this student"}?`,
            text: "The student will be marked as enrolled again.",
            width: 360,
            customClass: {
                popup: "rounded-2xl text-sm",
                title: "text-base",
                confirmButton: "text-xs px-3 py-1.5",
                cancelButton: "text-xs px-3 py-1.5",
            },
            showCancelButton: true,
            confirmButtonText: "Yes, restore",
            cancelButtonText: "Cancel",
        });

        if (!response.isConfirmed) {
            return;
        }

        setRestoringId(student.enrollment_subject_id);

        router.post(
            "/faculty/students-list/undo-drop",
            { enrollment_subject_id: student.enrollment_subject_id },
            {
                preserveScroll: true,
                onSuccess: () => {
                    Swal.fire({
                        icon: "success",
                        title: "Student restored",
                        timer: 1800,
                        showConfirmButton: false,
                    });
                },
                onError: () => {
                    Swal.fire({
                        icon: "error",
                        title: "Unable to restore student",
                        text: "Please try again or contact support.",
                    });
                },
                onFinish: () => setRestoringId(null),
            }
        );
    };

    return (
        <FacultyLayout>
            <Head title="Students List" />

            <div className="space-y-6">
                <header className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">
                                Faculty · Students
                            </p>
                            <h1 className="text-lg font-semibold text-slate-900">
                                Students Overview
                            </h1>
                            {termLabel && <p className="text-[12px] text-slate-500">{termLabel}</p>}
                        </div>
                        <div className="flex gap-3 text-[12px]">
                            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-slate-600">
                                <UsersThree size={16} />
                                <div className="text-left">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Total Students</p>
                                    <p className="font-semibold text-slate-800">{totalDisplayedStudents}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-slate-600">
                                <ChalkboardTeacher size={16} />
                                <div className="text-left">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Sections</p>
                                    <p className="font-semibold text-slate-800">{totalDisplayedSections}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <FunnelSimple className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <select
                                    className="h-10 rounded-full border border-slate-200 bg-white pl-9 pr-4 text-[12px] text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                                    value={selectedSubject}
                                    onChange={(event) => setSelectedSubject(event.target.value)}
                                >
                                    <option value="all">All Subjects</option>
                                    {subjects.map((subject) => (
                                        <option key={subject.value} value={subject.value}>
                                            {subject.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative">
                                <select
                                    className="h-10 rounded-full border border-slate-200 bg-white px-4 text-[12px] text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                                    value={perPage}
                                    onChange={handlePerPageChange}
                                >
                                    {[5, 10, 15, 20, 25, 30].map((option) => (
                                        <option key={option} value={option}>
                                            {option} per page
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="relative w-full md:w-64">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search name, ID, program, or status"
                                className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-4 text-[12px] text-slate-600 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                            />
                        </div>
                    </div>

                    <div className="mt-5 space-y-4">
                        {groupedLoads.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-[12px] text-slate-500">
                                <p>No sections or enrolled students were found for your current filters.</p>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Verify that classes appear under <span className="font-semibold">My Classes</span> and that
                                    students have finalized their enrollment for these sections.
                                </p>
                            </div>
                        ) : (
                            groupedLoads.map((section) => (
                                <article
                                    key={`section-${section.id}`}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6"
                                >
                                    <header className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <h2 className="text-sm font-semibold text-slate-900">{section.name}</h2>
                                            {section.yearLevel && (
                                                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                                                    Year Level {section.yearLevel}
                                                </p>
                                            )}
                                        </div>
                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
                                            {section.totalStudents} {section.totalStudents === 1 ? "student" : "students"}
                                        </span>
                                    </header>

                                    <div className="mt-4 space-y-4">
                                        {section.loads.map((load) => (
                                            <div
                                                key={`subject-${load.sectionKey}`}
                                                className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                                            >
                                                <header className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-slate-900">
                                                            {load.subjectName}
                                                            {load.subjectCode && (
                                                                <span className="ml-2 text-[11px] font-medium text-slate-500">
                                                                    {load.subjectCode}
                                                                </span>
                                                            )}
                                                        </h3>
                                                        {load.schedule && (
                                                            <p className="text-[11px] text-slate-500">{load.schedule}</p>
                                                        )}
                                                    </div>
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
                                                        {load.students.length} {load.students.length === 1 ? "student" : "students"}
                                                    </span>
                                                </header>

                                                {load.students.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full text-left text-[12px] text-slate-600">
                                                            <thead className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                                                                <tr>
                                                                    <th className="px-3 py-2">Student</th>
                                                                    <th className="px-3 py-2">Student No.</th>
                                                                    <th className="px-3 py-2">Program</th>
                                                                    <th className="px-3 py-2">Year</th>
                                                                    <th className="px-3 py-2">Section</th>
                                                                    <th className="px-3 py-2">Status</th>
                                                                    <th className="px-3 py-2 text-right">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {load.students.map((student, studentIndex) => (
                                                                    <tr
                                                                        key={`${load.sectionKey}-student-${student.id ?? student.studentNumber ?? student.enrollmentId ?? studentIndex}-${studentIndex}`}
                                                                        className="hover:bg-slate-50"
                                                                    >
                                                                        <td className="px-3 py-2 font-medium text-slate-700">{student.name}</td>
                                                                        <td className="px-3 py-2">{student.studentNumber || "—"}</td>
                                                                        <td className="px-3 py-2">{student.program || "—"}</td>
                                                                        <td className="px-3 py-2">{student.yearLevel || "—"}</td>
                                                                        <td className="px-3 py-2">{student.section || "—"}</td>
                                                                        <td className="px-3 py-2">
                                                                            {student.status ? (
                                                                                (() => {
                                                                                    const tone = (student.statusRaw ?? "").toLowerCase();
                                                                                    let badgeClasses = "bg-emerald-50 text-emerald-600";

                                                                                    if (tone === "dropped") {
                                                                                        badgeClasses = "bg-rose-50 text-rose-600";
                                                                                    } else if (tone === "pending") {
                                                                                        badgeClasses = "bg-amber-50 text-amber-600";
                                                                                    }

                                                                                    return (
                                                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeClasses}`}>
                                                                                            {student.status}
                                                                                        </span>
                                                                                    );
                                                                                })()
                                                                            ) : (
                                                                                "—"
                                                                            )}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right">
                                                                            {String(student.status ?? "").toLowerCase() === "dropped" ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleUndoDropStudent(student)}
                                                                                    disabled={restoringId === student.enrollment_subject_id}
                                                                                    className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                                                                                        restoringId === student.enrollment_subject_id
                                                                                            ? "border-sky-200 bg-sky-100 text-sky-400 cursor-wait"
                                                                                            : "border-sky-300 bg-white text-sky-600 hover:bg-sky-50"
                                                                                    }`}
                                                                                >
                                                                                    {restoringId === student.enrollment_subject_id ? "Restoring…" : "Undo Drop"}
                                                                                </button>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleDropStudent(student)}
                                                                                    disabled={!student.canDrop || droppingId === student.enrollment_subject_id}
                                                                                    className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                                                                                        droppingId === student.enrollment_subject_id
                                                                                            ? "border-rose-200 bg-rose-100 text-rose-400 cursor-wait"
                                                                                            : student.canDrop
                                                                                                ? "border-rose-300 bg-white text-rose-500 hover:bg-rose-50"
                                                                                                : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                                                                    }`}
                                                                                >
                                                                                    {droppingId === student.enrollment_subject_id ? "Dropping…" : "Drop"}
                                                                                </button>
                                                                            )}

                                                                            {!student.canDrop &&
                                                                                String(student.status ?? "").toLowerCase() !== "dropped" && (
                                                                                    <p className="mt-1 text-[10px] text-slate-400">Section roster entry</p>
                                                                                )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[12px] text-slate-500">
                                                        No students match your filters for this subject.
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </article>
                            ))
                        )}
                    </div>

                    <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4 text-[12px] text-slate-500 md:flex-row md:items-center md:justify-between">
                        <p>
                            Showing <span className="font-semibold text-slate-700">{pagination.from || 0}</span> to
                            <span className="font-semibold text-slate-700"> {pagination.to || 0}</span> of
                            <span className="font-semibold text-slate-700"> {pagination.total || 0}</span> results
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                disabled={pagination.currentPage <= 1}
                                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                                    pagination.currentPage <= 1
                                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                Previous
                            </button>
                            <span className="text-[11px] text-slate-500">
                                Page <span className="font-semibold text-slate-700">{pagination.currentPage}</span> of
                                <span className="font-semibold text-slate-700"> {pagination.lastPage}</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                disabled={pagination.currentPage >= pagination.lastPage}
                                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                                    pagination.currentPage >= pagination.lastPage
                                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </FacultyLayout>
    );
}

