import React, { useMemo, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import Swal from "sweetalert2";
import RegistrarLayout from "@/Layouts/RegistrarLayout";

export default function ApproveGrades() {
  const { submittedGrades } = usePage().props; // backend sends submitted grades
  const [grades, setGrades] = useState(submittedGrades || []);
  const [semesterFilter, setSemesterFilter] = useState("all");

  const groupedBySemester = useMemo(() => {
    const grouped = {
      "First Semester": [],
      "Second Semester": [],
    };

    grades.forEach((grade) => {
      const rawSemester = grade.semester || grade.semester_name || "";
      const normalized = rawSemester.toLowerCase();

      let key = "Unspecified Semester";
      if (normalized.includes("first")) key = "First Semester";
      else if (normalized.includes("second")) key = "Second Semester";
      else if (rawSemester) key = rawSemester;

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(grade);
    });

    return grouped;
  }, [grades]);

  const orderedSemesterKeys = useMemo(() => {
    const priority = ["First Semester", "Second Semester"];
    const others = Object.keys(groupedBySemester).filter(
      (key) => !priority.includes(key)
    );
    const combined = [
      ...priority.filter((key) => groupedBySemester[key]),
      ...others,
    ];

    const matchesFilter = (key) => {
      const normalized = key.toLowerCase();
      if (semesterFilter === "all") return true;
      if (semesterFilter === "first") return normalized.includes("first");
      if (semesterFilter === "second") return normalized.includes("second");
      return true;
    };

    return combined.filter(matchesFilter);
  }, [groupedBySemester, semesterFilter]);

  const hasVisibleRecords = useMemo(
    () =>
      orderedSemesterKeys.some(
        (key) => (groupedBySemester[key] || []).length > 0
      ),
    [orderedSemesterKeys, groupedBySemester]
  );

  const getSemesterTone = (semester) => {
    const palettes = {
      "First Semester": {
        container: "from-sky-50 via-white to-sky-100/70 border-sky-200/70",
        chip: "border-sky-200 bg-sky-50/80 text-sky-600",
        heading: "text-sky-700",
      },
      "Second Semester": {
        container: "from-violet-50 via-white to-violet-100/70 border-violet-200/70",
        chip: "border-violet-200 bg-violet-50/80 text-violet-600",
        heading: "text-violet-700",
      },
      default: {
        container: "from-white via-slate-50 to-slate-100/70 border-slate-200/70",
        chip: "border-slate-200 bg-slate-100/70 text-slate-600",
        heading: "text-slate-700",
      },
    };

    return palettes[semester] || palettes.default;
  };

  const getStatusBadge = (status) => {
    const normalized = (status || "draft").toLowerCase();
    if (normalized === "confirmed") return "border-emerald-200 bg-emerald-50/70 text-emerald-600";
    if (normalized === "submitted") return "border-indigo-200 bg-indigo-50/70 text-indigo-600";
    if (normalized === "rejected") return "border-rose-200 bg-rose-50/70 text-rose-600";
    return "border-slate-200 bg-slate-100/70 text-slate-500";
  };

  // Approve a single grade
  const approveGrade = (gradeId) => {
    Swal.fire({
      title: "Approve this grade?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, approve",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        router.post(`/registrar/grades/approve/${gradeId}`, {}, {
          onSuccess: () => {
            Swal.fire("Approved!", "The grade has been approved.", "success");
            // Remove approved grade from local state
            setGrades((prevGrades) => prevGrades.filter((g) => g.id !== gradeId));
          },
          onError: (error) => {
            Swal.fire("Error", error?.message || "Something went wrong", "error");
          },
        });
      }
    });
  };

  return (
    <RegistrarLayout>
      <Head title="Approve Grades" />
      <div className="mx-auto w-full max-w-6xl px-1.5 sm:px-3 py-4 font-sans text-[10.5px] md:text-[11px] text-slate-700">
        <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-3.5 md:p-4.5 shadow-[0_16px_30px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[15px] font-semibold text-slate-900">Approve Submitted Grades</h1>
              <p className="text-[10px] text-slate-500">
                Review pending submissions and approve them with confidence. Low-opacity cards highlight key details without overwhelming the view.
              </p>
            </div>
            {grades.length > 0 && (
              <div className="rounded-full border border-sky-200 bg-sky-50/70 px-3 py-0.5 text-[10px] font-medium text-sky-600">
                {grades.length} grade{grades.length === 1 ? "" : "s"} awaiting approval
              </div>
            )}
          </div>

          {grades.length > 0 && (
            <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">
                Filter by semester
              </span>
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="w-full rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-medium text-slate-600 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 sm:w-48"
              >
                <option value="all">All Semesters</option>
                <option value="first">First Semester</option>
                <option value="second">Second Semester</option>
              </select>
            </div>
          )}

          {grades.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white/80 py-10 text-slate-500">
              <span className="rounded-full border border-slate-200 bg-slate-100/70 px-3 py-0.5 text-[10px] font-medium uppercase tracking-wide">No pending grades</span>
              <p className="text-[12px] font-semibold text-slate-600">All submitted grades have already been processed.</p>
              <p className="text-[10px] text-slate-400">Once new submissions arrive, they will appear here automatically.</p>
            </div>
          ) : (
            <div className="mt-3.5 space-y-3">
              {orderedSemesterKeys.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 py-10 text-slate-500">
                  <span className="text-[12px] font-semibold">
                    No submissions match the selected semester filter.
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Try switching back to all semesters to review every record.
                  </span>
                </div>
              )}

              {orderedSemesterKeys.map((semester) => {
                const records = groupedBySemester[semester] || [];
                const palette = getSemesterTone(semester);

                return (
                  <div
                    key={semester}
                    className={`overflow-hidden rounded-2xl border bg-gradient-to-br px-0 py-0 shadow-[0_16px_32px_rgba(15,23,42,0.08)] ${palette.container}`}
                  >
                    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className={`text-[12px] font-semibold ${palette.heading}`}>{semester}</h2>
                        <p className="text-[10px] text-slate-500">Review submissions filed under this term.</p>
                      </div>
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-0.5 text-[10px] font-medium ${palette.chip}`}>
                        {records.length} record{records.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {records.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 border-t border-slate-200/70 bg-white/40 py-8 text-slate-500">
                        <span className="text-[12px] font-semibold">No submissions for this semester yet.</span>
                        <span className="text-[10px] text-slate-400">Approved entries will appear here automatically.</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border-t border-slate-200/70 bg-white/80">
                        <table className="min-w-full text-left text-[11px]">
                          <thead className="bg-white/70 text-[10px] uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-3 py-2.5">Student</th>
                              <th className="px-3 py-2.5">Course</th>
                              <th className="px-3 py-2.5">Year Level</th>
                              <th className="px-3 py-2.5">Subject</th>
                              <th className="px-3 py-2.5 text-center">Midterm</th>
                              <th className="px-3 py-2.5 text-center">Final</th>
                              <th className="px-3 py-2.5">Remarks</th>
                              <th className="px-3 py-2.5 text-center">Midterm Status</th>
                              <th className="px-3 py-2.5 text-center">Final Status</th>
                              <th className="px-3 py-2.5 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/70 text-[10.5px] text-slate-600">
                            {records.map((grade) => (
                              <tr key={grade.id} className="bg-white/70 transition hover:bg-slate-50/80">
                                <td className="px-3 py-2.5">
                                  <p className="text-[11px] font-semibold text-slate-800">{grade.student_name}</p>
                                  <p className="text-[9.5px] text-slate-400">{grade.id_number || "ID unavailable"}</p>
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">{grade.course}</td>
                                <td className="px-3 py-2.5 text-slate-600">{grade.year_level}</td>
                                <td className="px-3 py-2.5 text-slate-600">{grade.subject}</td>
                                <td className="px-3 py-2.5 text-center text-slate-600">{grade.midterm ?? "-"}</td>
                                <td className="px-3 py-2.5 text-center text-slate-600">{grade.final ?? "-"}</td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${getStatusBadge(grade.midterm_status)}`}>
                                    {(grade.midterm_status || "draft").replace(/^./, (c) => c.toUpperCase())}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${getStatusBadge(grade.final_status)}`}>
                                    {(grade.final_status || "draft").replace(/^./, (c) => c.toUpperCase())}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <button
                                    onClick={() => approveGrade(grade.id)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 transition hover:bg-emerald-100"
                                  >
                                    Approve
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </RegistrarLayout>
  );
}
