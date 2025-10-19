import React, { useState, useEffect, useMemo } from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Head, router } from "@inertiajs/react";
import { Plus, Check, Search, ArrowLeft, Loader2, SquareCheckBig } from "lucide-react";
import Swal from "sweetalert2";

export default function ReviewSubjectLoads({
    enrollment = {},
    student = {},
    availableSubjects = [],
    selectedSubjectIds = [],
    takenSubjects = [],
}) {
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(false); // 🔹 For update
    const [pageLoading, setPageLoading] = useState(true); // 🔹 For initial page load
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const perPage = 10;

    useEffect(() => {
        if (Array.isArray(selectedSubjectIds) && selectedSubjectIds.length > 0) {
            setSelected(selectedSubjectIds);
        }

        // 🔹 Simulate loading delay before showing content
        const timer = setTimeout(() => setPageLoading(false), 600); 
        return () => clearTimeout(timer);
    }, [selectedSubjectIds]);

    const toggleSelect = (scheduleId) => {
        setSelected((prev) =>
            prev.includes(scheduleId)
                ? prev.filter((id) => id !== scheduleId)
                : [...prev, scheduleId]
        );
    };

    const toggleAll = () => {
        const currentPageIds = paginatedSubjects.flatMap((subj) =>
            subj.class_schedules?.map((sched) => sched.id) || []
        );

        const allSelected = currentPageIds.every((id) => selected.includes(id));

        if (allSelected) {
            setSelected((prev) => prev.filter((id) => !currentPageIds.includes(id)));
        } else {
            setSelected((prev) => [...new Set([...prev, ...currentPageIds])]);
        }
    };

    const handleUpdate = () => {
        Swal.fire({
            title: "Update Subject Load?",
            text: "This will update the student's enrolled subjects.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes, Update",
            confirmButtonColor: "#4f46e5",
        }).then((res) => {
            if (res.isConfirmed) {
                setLoading(true);
                router.post(
                    route("registrar.preenroll.updateSubjects", enrollment.id),
                    {
                        enrollment_id: enrollment.id,
                        class_schedule_ids: selected,
                    },
                    { onFinish: () => setLoading(false) }
                );
            }
        });
    };

    // Filter + Pagination
    const filteredSubjects = useMemo(() => {
        return availableSubjects.filter((subj) =>
            `${subj.subject?.subject_code || ""} ${subj.subject?.descriptive_title || ""}`
                .toLowerCase()
                .includes(search.toLowerCase())
        );
    }, [search, availableSubjects]);

    const paginatedSubjects = useMemo(() => {
        const start = (page - 1) * perPage;
        return filteredSubjects.slice(start, start + perPage);
    }, [filteredSubjects, page]);

    const totalPages = Math.ceil(filteredSubjects.length / perPage);

    // 🔹 If still loading, show spinner
    if (pageLoading) {
        return (
            <RegistrarLayout>
                <Head title="Review Subject Loads" />
                <div className="flex items-center justify-center h-[70vh] text-gray-500 text-sm font-[Poppins]">
                    <Loader2 className="animate-spin mr-2" size={20} />
                    <span>Loading data, please wait...</span>
                </div>
            </RegistrarLayout>
        );
    }

    return (
        <RegistrarLayout>
            <Head title="Review Subject Loads" />
            <div className="p-6 space-y-6 max-w-7xl mx-auto text-sm font-[Poppins]">

                {/* Back Button */}
                <button
                    type="button"
                    onClick={() => router.visit(route("registrar.preenroll.index"))}
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                    <ArrowLeft size={16} /> Back to Pre-Enroll
                </button>

                {/* Student Info */}
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 text-xs">
                    <h2 className="font-semibold text-gray-800 mb-3 text-sm">Student Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-gray-600">
                        <p><span className="font-medium">Name:</span> {student?.lName}, {student?.fName} {student?.mName}</p>
                        <p><span className="font-medium">Course:</span> {enrollment?.course?.code || "N/A"} – {enrollment?.major?.code || "N/A"}</p>
                        <p><span className="font-medium">Year/Sem:</span> {enrollment?.year_level?.year_level || "N/A"} – {enrollment?.semester?.semester || "N/A"}</p>
                        <p><span className="font-medium">Student Type:</span> {student?.student_type || enrollment?.student_type || "Freshman"}</p>
                    </div>
                </div>
                {/* Taken Subjects (Table) */}
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                    <h2 className="font-semibold text-gray-800 mb-3 text-sm">Taken Subjects</h2>
                    {!takenSubjects?.length ? (
                        <p className="text-gray-400 italic text-xs">No subjects taken yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border">
                                <thead className="bg-gray-50 text-gray-600 border-b">
                                    <tr>
                                        <th className="p-2 text-left">Code</th>
                                        <th className="p-2 text-left">Subject</th>
                                        <th className="p-2 text-left">Schedule</th>
                                        <th className="p-2 text-left">Faculty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {takenSubjects.map((ts) => (
                                        <tr key={ts.id} className="border-b hover:bg-gray-50">
                                            <td className="p-2">{ts.code || "-"}</td>
                                            <td className="p-2">{ts.subject || "-"}</td>
                                            <td className="p-2">{ts.day || "TBA"} {ts.time || ""}</td>
                                            <td className="p-2">{ts.faculty || "TBA"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Available Subjects (Table) */}
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-gray-800 text-sm">Available Subjects</h2>
                        <div className="flex items-center gap-2">
                            {/* 🔘 Select All / Deselect All */}
                            <button
                                onClick={toggleAll}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                            >
                                <SquareCheckBig size={14} />
                                {paginatedSubjects.flatMap((subj) =>
                                    subj.class_schedules?.map((sched) => sched.id) || []
                                ).every((id) => selected.includes(id))
                                    ? "Deselect All"
                                    : "Select All"}
                            </button>

                            <div className="relative">
                                <Search size={14} className="absolute left-2 top-2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {!paginatedSubjects?.length ? (
                        <p className="text-gray-400 italic text-xs">No subjects found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border">
                                <thead className="bg-gray-50 text-gray-600 border-b">
                                    <tr>
                                        <th className="p-2 text-left">Code</th>
                                        <th className="p-2 text-left">Subject</th>
                                        <th className="p-2 text-left">Units</th>
                                        <th className="p-2 text-left">Section</th>
                                        <th className="p-2 text-left">Schedule</th>
                                        <th className="p-2 text-left">Semester</th>
                                        <th className="p-2 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedSubjects.flatMap((subj) =>
                                        subj.class_schedules?.length
                                            ? subj.class_schedules.map((sched) => (
                                                  <tr key={sched.id} className="border-b hover:bg-gray-50">
                                                      <td className="p-2">{subj.subject?.code || "-"}</td>
                                                      <td className="p-2">{subj.subject?.descriptive_title || "-"}</td>
                                                      <td className="p-2">
                                                          {(subj.lec_unit || 0) + (subj.lab_unit || 0)}
                                                      </td>
                                                      <td className="p-2">{sched.section?.section || "N/A"}</td>
                                                      <td className="p-2">
                                                          {[sched.schedule_day, sched.formatted_time]
                                                              .filter(Boolean)
                                                              .join(" ") || "TBA"}
                                                      </td>
                                                      <td className="p-2">{sched.semester?.semester || enrollment?.semester?.semester || ""}</td>
                                                      <td className="p-2 text-center">
                                                          <button
                                                              type="button"
                                                              onClick={() => toggleSelect(sched.id)}
                                                              className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 mx-auto ${
                                                                  selected.includes(sched.id)
                                                                      ? "bg-green-100 text-green-700 border border-green-300"
                                                                      : "bg-indigo-100 text-indigo-700 border border-indigo-300"
                                                              }`}
                                                          >
                                                              {selected.includes(sched.id) ? (
                                                                  <>
                                                                      <Check size={12} /> Selected
                                                                  </>
                                                              ) : (
                                                                  <>
                                                                      <Plus size={12} /> Add
                                                                  </>
                                                              )}
                                                          </button>
                                                      </td>
                                                  </tr>
                                              ))
                                            : (
                                                <tr key={subj.id}>
                                                    <td className="p-2 text-center text-gray-400 italic" colSpan={7}>
                                                        No schedules available
                                                    </td>
                                                </tr>
                                            )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center mt-3 gap-2 text-xs">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
                            >
                                Prev
                            </button>
                            <span className="px-2 text-gray-600">{page} / {totalPages}</span>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* Update Button */}
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleUpdate}
                        disabled={loading || selected.length === 0}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 text-xs shadow-sm"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={14} className="animate-spin" /> Updating...
                            </>
                        ) : (
                            <>
                                <Check size={14} /> Update Load
                            </>
                        )}
                    </button>
                </div>
            </div>
        </RegistrarLayout>
    );
}
