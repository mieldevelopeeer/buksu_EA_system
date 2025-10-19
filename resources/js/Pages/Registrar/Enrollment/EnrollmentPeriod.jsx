// resources/js/Pages/Registrar/EnrollmentPeriods/EnrollmentPeriod.jsx
import React, { useMemo, useState } from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Head, router } from "@inertiajs/react";
import { Plus, Edit2, Loader2, X } from "lucide-react";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function EnrollmentPeriod({ enrollmentPeriods = [], schoolYears = [], semesters = [] }) {
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedSchoolYears, setSelectedSchoolYears] = useState([]);

    // Form state
    const [formData, setFormData] = useState({
        start_date: "",
        end_date: "",
        school_year_id: "",
        semester_id: "",
        status: "Open",
    });

    const exportRows = useMemo(() => {
        const selectedSet = new Set(selectedSchoolYears);
        const filtered = selectedSet.size
            ? enrollmentPeriods.filter((period) => selectedSet.has(String(period.school_year_id ?? period.school_year?.id ?? "")))
            : enrollmentPeriods;

        return filtered.map((period, index) => {
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
    }, [enrollmentPeriods, selectedSchoolYears]);

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

    const handleToggleStatus = (period) => {
        setLoading(true);
        router.put(route("registrar.enrollmentperiod.toggle", period.id), {}, {
            preserveScroll: true,
            onError: (errors) => {
                console.error("[EnrollmentPeriod] Toggle failed", errors);
            },
            onFinish: () => setLoading(false),
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

        const submitter = editingId ? router.put : router.post;

        submitter(routeName, formData, {
            onSuccess: () => {
                console.log("[EnrollmentPeriod] Submission succeeded");
                setShowForm(false);
                resetForm();
            },
            onError: (errors) => {
                console.error("[EnrollmentPeriod] Submission failed", errors);
            },
            onFinish: () => setLoading(false),
        });
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
                        <select
                            multiple
                            value={selectedSchoolYears}
                            onChange={(event) => {
                                const options = Array.from(event.target.selectedOptions);
                                setSelectedSchoolYears(options.map((option) => option.value));
                            }}
                            className="min-w-[160px] rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[11px] text-slate-600 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        >
                            {schoolYears.map((year) => (
                                <option key={year.id} value={String(year.id)}>
                                    {year.school_year}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleExportPDF}
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.75 text-[11px] font-medium text-rose-600 transition hover:bg-rose-100"
                        >
                            PDF
                        </button>
                        <button
                            onClick={handleExportExcel}
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.75 text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-100"
                        >
                            Excel
                        </button>
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
                        <table className="min-w-full text-left text-[12px] md:text-[13px]">
                            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                <tr>
                                    <th className="px-4 py-2.5 text-slate-600">Start Date</th>
                                    <th className="px-4 py-2.5 text-slate-600">End Date</th>
                                    <th className="px-4 py-2.5 text-slate-600">School Year</th>
                                    <th className="px-4 py-2.5 text-slate-600">Semester</th>
                                    <th className="px-4 py-2.5 text-slate-600">Status</th>
                                    <th className="px-4 py-2.5 text-center text-slate-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                                {enrollmentPeriods.length > 0 ? (
                                    enrollmentPeriods.map((period) => (
                                        <tr key={period.id} className="transition hover:bg-slate-50/80">
                                            <td className="px-4 py-3 font-medium text-slate-800">
                                                {dayjs(period.start_date).format("MMMM D, YYYY")}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{dayjs(period.end_date).format("MMMM D, YYYY")}</td>
                                            <td className="px-4 py-3 text-slate-600">{period.school_year?.school_year || "-"}</td>
                                            <td className="px-4 py-3 text-slate-600">{period.semester?.semester || "-"}</td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(period)}
                                                    className={`relative inline-flex h-6 w-16 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${
                                                        period.status === "Open"
                                                            ? "bg-emerald-500/70"
                                                            : "bg-slate-300"
                                                    }`}
                                                >
                                                    <span
                                                        className={`absolute inset-y-1 flex h-4 w-6 items-center justify-center text-[10px] font-medium uppercase tracking-wide text-white ${
                                                            period.status === "Open" ? "left-2" : "left-7"
                                                        }`}
                                                    >
                                                        {period.status === "Open" ? "Open" : "Off"}
                                                    </span>
                                                    <span
                                                        className={`absolute left-1 inline-flex h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                                                            period.status === "Open" ? "translate-x-8" : "translate-x-0"
                                                        }`}
                                                    />
                                                </button>
                                            </td>
                                            <td className="flex items-center justify-center gap-2 px-4 py-3">
                                                <button
                                                    onClick={() => handleEdit(period)}
                                                    className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-medium text-sky-600 transition hover:border-sky-300 hover:bg-sky-50"
                                                >
                                                    <Edit2 size={12} /> Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-[12px] italic text-slate-400">
                                            No enrollment periods have been created yet. Start by adding one above.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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
                                        {semesters.map((sem) => (
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

                {/* Global Loading Overlay */}
                {loading && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
                        <div className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs shadow-lg">
                            <Loader2 className="animate-spin text-sky-600" size={16} />
                            <span>Processing...</span>
                        </div>
                    </div>
                )}
            </div>
        </RegistrarLayout>
    );
}
