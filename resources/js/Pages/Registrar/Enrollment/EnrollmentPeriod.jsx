// resources/js/Pages/Registrar/EnrollmentPeriods/EnrollmentPeriod.jsx
import React, { useMemo, useState } from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Head, router } from "@inertiajs/react";
import { Plus, Edit2, Loader2, X, CalendarDays, Clock, Flag } from "lucide-react";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function EnrollmentPeriod({ enrollmentPeriods = [], schoolYears = [], semesters = [] }) {
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedSchoolYears, setSelectedSchoolYears] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    // Deduplicate semesters by name (semester field)
    const uniqueSemesters = useMemo(() => {
        const seen = new Set();
        return semesters.filter((sem) => {
            const semesterName = sem.semester || sem.name;
            if (seen.has(semesterName)) {
                return false;
            }
            seen.add(semesterName);
            return true;
        });
    }, [semesters]);

    // Form state
    const [formData, setFormData] = useState({
        start_date: "",
        end_date: "",
        school_year_id: "",
        semester_id: "",
        status: "Open",
    });

    const filteredPeriods = useMemo(() => {
        const selectedSet = new Set(selectedSchoolYears);
        return selectedSet.size
            ? enrollmentPeriods.filter((period) => selectedSet.has(String(period.school_year_id ?? period.school_year?.id ?? "")))
            : enrollmentPeriods;
    }, [enrollmentPeriods, selectedSchoolYears]);

    const exportRows = useMemo(() => {
        return filteredPeriods.map((period, index) => {
            const start = period.start_date ? dayjs(period.start_date).format("MMMM D, YYYY") : "—";
            const end = period.end_date ? dayjs(period.end_date).format("MMMM D, YYYY") : "—";
            const schoolYear = period.school_year?.school_year || "—";
            const semester = period.semester?.semester || period.semester?.name || "—";
            const status = period.status || "—";

            return {
                index: index + 1,
                start,
                end,
                schoolYear,
                semester,
                status,
            };
        });
    }, [filteredPeriods]);

    const totalPages = Math.max(1, Math.ceil(filteredPeriods.length / itemsPerPage));
    const paginatedPeriods = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredPeriods.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredPeriods, currentPage]);

    const activePeriod = useMemo(() => enrollmentPeriods.find((period) => period.status === "Open"), [enrollmentPeriods]);
    const totalOpen = useMemo(() => enrollmentPeriods.filter((period) => period.status === "Open").length, [enrollmentPeriods]);
    const upcomingPeriod = useMemo(() => {
        const today = dayjs();
        const upcoming = enrollmentPeriods
            .filter((period) => dayjs(period.start_date).isAfter(today))
            .sort((a, b) => dayjs(a.start_date).diff(dayjs(b.start_date)));
        return upcoming[0];
    }, [enrollmentPeriods]);

    const toggleSchoolYearFilter = (id) => {
        setSelectedSchoolYears((prev) => {
            const exists = prev.includes(String(id));
            if (exists) {
                return prev.filter((entry) => entry !== String(id));
            }
            return [...prev, String(id)];
        });
    };

    const clearSchoolYearFilter = () => setSelectedSchoolYears([]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Enrollment Periods", 14, 18);

        autoTable(doc, {
            startY: 26,
            head: [["#", "Start Date", "End Date", "School Year", "Semester", "Status"]],
            body: exportRows.map((row) => [row.index, row.start, row.end, row.schoolYear, row.semester, row.status]),
            styles: { fontSize: 9 },
            headStyles: { fillColor: [20, 83, 136] },
        });

        doc.save("EnrollmentPeriods.pdf");
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(
            exportRows.map((row) => ({
                "#": row.index,
                "Start Date": row.start,
                "End Date": row.end,
                "School Year": row.schoolYear,
                Semester: row.semester,
                Status: row.status,
            }))
        );

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Enrollment Periods");
        XLSX.writeFile(workbook, "EnrollmentPeriods.xlsx");
    };

    // 🔹 Handle form change
    const handleChange = (e) => {
        console.log("[EnrollmentPeriod] Field change", e.target.name, e.target.value);
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const resetForm = () => {
        setFormData({ start_date: "", end_date: "", school_year_id: "", semester_id: "", status: "Open" });
        setEditingId(null);
    };

    const handleNew = () => {
        resetForm();
        setShowForm(true);
    };

    const handleEdit = (period) => {
        setEditingId(period.id);
        setFormData({
            start_date: dayjs(period.start_date).format("YYYY-MM-DD"),
            end_date: dayjs(period.end_date).format("YYYY-MM-DD"),
            school_year_id: period.school_year_id ?? "",
            semester_id: period.semesters_id ?? "",
            status: period.status ?? "Open",
        });
        setShowForm(true);
    };

    const showToast = (title, icon = "success") => {
        Swal.fire({
            icon,
            title,
            toast: true,
            position: "top-end",
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
        });
    };

    const showProcessing = (title = "Processing...") => {
        Swal.fire({
            title,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });
    };

    const handleToggleStatus = (period) => {
        setLoading(true);
        showProcessing(period.status === "Open" ? "Closing period..." : "Opening period...");
        router.put(route("registrar.enrollmentperiod.toggle", period.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                showToast(`Enrollment period ${period.status === "Open" ? "closed" : "opened"}.`);
            },
            onError: (errors) => {
                console.error("[EnrollmentPeriod] Toggle failed", errors);
                showToast("Failed to update status.", "error");
            },
            onFinish: () => {
                Swal.close();
                setLoading(false);
            },
        });
    };

    // 🔹 Create or update enrollment period
    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("[EnrollmentPeriod] Submitting payload", formData);
        setLoading(true);

        const routeName = editingId
            ? route("registrar.enrollmentperiod.update", editingId)
            : route("registrar.enrollmentperiod.store");

        const submitOptions = {
            onSuccess: () => {
                console.log("[EnrollmentPeriod] Submission succeeded");
                setShowForm(false);
                resetForm();
                showToast(editingId ? "Enrollment period updated." : "Enrollment period created.");
            },
            onError: (errors) => {
                console.error("[EnrollmentPeriod] Submission failed", errors);
                showToast("Failed to save enrollment period.", "error");
            },
            onFinish: () => {
                Swal.close();
                setLoading(false);
            },
        };

        showProcessing(editingId ? "Updating period..." : "Creating period...");
        if (editingId) {
            router.put(routeName, formData, submitOptions);
        } else {
            router.post(routeName, formData, submitOptions);
        }
    };

    return (
        <RegistrarLayout>
            <Head title="Enrollment Periods" />

            <div className="mx-auto w-full max-w-6xl px-4 py-8 font-sans text-xs md:text-sm text-slate-700">
                {/* Header */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-5 shadow-sm">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">Registrar · Schedules</p>
                        <h1 className="mt-1 text-lg font-semibold text-slate-900">Enrollment Periods</h1>
                        <p className="text-[12px] text-slate-500">Monitor opening and closing windows for the enrollment workflow.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                School Years
                            </span>
                            <button
                                type="button"
                                onClick={clearSchoolYearFilter}
                                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                                    selectedSchoolYears.length === 0
                                        ? "border-sky-200 bg-sky-50 text-sky-700"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                }`}
                            >
                                All
                            </button>
                            {schoolYears.map((year) => {
                                const isActive = selectedSchoolYears.includes(String(year.id));
                                return (
                                    <button
                                        key={year.id}
                                        type="button"
                                        onClick={() => toggleSchoolYearFilter(year.id)}
                                        className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                                            isActive
                                                ? "border-sky-400 bg-sky-600 text-white shadow"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                        }`}
                                    >
                                        {year.school_year}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={handleNew}
                            className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-[12px] font-medium text-white shadow-sm transition hover:bg-sky-500"
                        >
                            <Plus size={14} /> Create Period
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 shadow-xl backdrop-blur">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-[11px] md:text-[12px]">
                            <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                <tr>
                                    <th className="px-3 py-2 text-slate-600">Start Date</th>
                                    <th className="px-3 py-2 text-slate-600">End Date</th>
                                    <th className="px-3 py-2 text-slate-600">School Year</th>
                                    <th className="px-3 py-2 text-slate-600">Semester</th>
                                    <th className="px-3 py-2 text-slate-600">Status</th>
                                    <th className="px-3 py-2 text-center text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                                {paginatedPeriods.length > 0 ? (
                                    paginatedPeriods.map((period) => (
                                        <tr key={period.id} className="transition hover:bg-slate-50/80 text-[11px]">
                                            <td className="px-3 py-2.5 font-medium text-slate-800">
                                                {dayjs(period.start_date).format("MMMM D, YYYY")}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-600">{dayjs(period.end_date).format("MMMM D, YYYY")}</td>
                                            <td className="px-3 py-2.5 text-slate-600">{period.school_year?.school_year || "-"}</td>
                                            <td className="px-3 py-2.5 text-slate-600">{period.semester?.semester || "-"}</td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                                            period.status === "Open"
                                                                ? "bg-emerald-50 text-emerald-600"
                                                                : "bg-slate-100 text-slate-500"
                                                        }`}
                                                    >
                                                        {period.status === "Open" ? "Open" : "Closed"}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(period)}
                                                        className="inline-flex h-5 w-12 items-center rounded-full border border-slate-200 bg-white transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                                    >
                                                        <span
                                                            className={`inline-flex h-4 w-4 transform rounded-full bg-sky-500 shadow transition ${
                                                                period.status === "Open" ? "translate-x-6" : "translate-x-1"
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="flex items-center justify-center gap-2 px-3 py-2.5">
                                                <button
                                                    onClick={() => handleEdit(period)}
                                                    className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-sky-600 transition hover:border-sky-300 hover:bg-sky-50"
                                                >
                                                    <Edit2 size={12} /> Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-10 text-center text-[12px] italic text-slate-400">
                                            No enrollment periods match the selected filters. Adjust the filters or create a new period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500">
                        <span>
                            Showing {paginatedPeriods.length ? (currentPage - 1) * itemsPerPage + 1 : 0}–
                            {(currentPage - 1) * itemsPerPage + paginatedPeriods.length} of {filteredPeriods.length}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] disabled:opacity-40"
                            >
                                Prev
                            </button>
                            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                                <button
                                    key={page}
                                    type="button"
                                    onClick={() => setCurrentPage(page)}
                                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                                        currentPage === page
                                            ? "bg-sky-600 text-white"
                                            : "border border-slate-200 text-slate-600"
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* Add Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
                        <div className="w-full max-w-md rounded-3xl border border-slate-200/70 bg-white/95 p-6 shadow-2xl backdrop-blur-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-800">
                                        {editingId ? "Edit Enrollment Period" : "Add Enrollment Period"}
                                    </h2>
                                    <p className="text-[11px] text-slate-500">
                                        {editingId ? "Update the schedule details." : "Complete the schedule details."}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        resetForm();
                                    }}
                                    className="rounded-full border border-slate-200 p-1 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm">
                                {/* Start Date */}
                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-slate-500">Start Date</label>
                                    <input
                                        type="date"
                                        name="start_date"
                                        value={formData.start_date}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                                        required
                                    />
                                </div>

                                {/* End Date */}
                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-slate-500">End Date</label>
                                    <input
                                        type="date"
                                        name="end_date"
                                        value={formData.end_date}
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm transition focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                                        required
                                    />
                                </div>

                                {/* School Year Dropdown */}
                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-slate-500">School Year</label>
                                    <select
                                        name="school_year_id"
                                        value={formData.school_year_id}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                                        required
                                    >
                                        <option value="">Select Year</option>
                                        {schoolYears.map((year) => (
                                            <option key={year.id} value={year.id}>
                                                {year.school_year}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Semester Dropdown */}
                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-slate-500">Semester</label>
                                    <select
                                        name="semester_id"
                                        value={formData.semester_id}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                                        required
                                    >
                                        <option value="">Select Semester</option>
                                        {uniqueSemesters.map((sem) => (
                                            <option key={sem.id} value={sem.id}>
                                                {sem.semester}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status Dropdown */}
                                <div>
                                    <label className="mb-1 block text-[11px] font-medium text-slate-500">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                                        required
                                    >
                                        <option value="Open">Open</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForm(false);
                                            resetForm();
                                        }}
                                        className="rounded-full border border-slate-200 px-4 py-2 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-full bg-sky-600 px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-sky-500"
                                    >
                                        {editingId ? "Save Changes" : "Save"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </RegistrarLayout>
    );
}
