import React, { useMemo, useState } from "react";
import { Head, Link, router, useForm } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { AlertCircle, ArrowLeft, Loader2, Minus, Search } from "lucide-react";

const DropSubject = ({ enrollment, enrolledSubjects = [], yearLabel = null }) => {
  const [search, setSearch] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [reason, setReason] = useState("");

  const form = useForm({ reason: "" });

  const filteredSubjects = useMemo(() => {
    if (!search.trim()) return enrolledSubjects;
    const term = search.trim().toLowerCase();
    return enrolledSubjects.filter((subject) => {
      const code = subject.code ?? subject.subject_code ?? "";
      const title = subject.title ?? subject.subject_title ?? "";
      return code.toLowerCase().includes(term) || title.toLowerCase().includes(term);
    });
  }, [enrolledSubjects, search]);

  const selectedSubject = useMemo(() => {
    if (!selectedSubjectId) return null;
    return enrolledSubjects.find((subject) => String(subject.enrollment_subject_id) === selectedSubjectId) ?? null;
  }, [enrolledSubjects, selectedSubjectId]);

  const handleSubjectSelect = (subject) => {
    const subjectId = String(subject.enrollment_subject_id ?? subject.id ?? "");
    if (!subjectId) return;
    setSelectedSubjectId(subjectId);
    form.clearErrors();
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!selectedSubject) {
      form.setError("reason", "Please select a subject to drop.");
      return;
    }

    if (!reason.trim()) {
      form.setError("reason", "Please provide a reason for dropping this subject.");
      return;
    }

    form.setData("reason", reason.trim());

    const enrollmentSubjectId = selectedSubject.enrollment_subject_id ?? selectedSubject.id;

    form.post(route("registrar.students.subjects.drop", enrollmentSubjectId), {
      preserveScroll: true,
      onSuccess: () => {
        router.visit(route("registrar.students.profile.show", enrollment.student_id));
      },
    });
  };

  return (
    <RegistrarLayout>
      <Head title="Drop Subject" />
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href={route("registrar.students.profile.show", enrollment.student_id)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Student Record
          </Link>
          <div className="text-right text-xs text-slate-500">
            <div className="font-semibold text-slate-700">{enrollment.student_name}</div>
            <div>
              {enrollment.course?.code ?? "Course N/A"} • {enrollment.year_level?.year_level ?? "Year N/A"} • {" "}
              {enrollment.semester?.semester ?? "Semester N/A"}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h1 className="text-lg font-semibold text-slate-800">Drop Subject</h1>
            <p className="mt-1 text-[11px] text-slate-500">
              Select an enrolled subject to drop{yearLabel ? ` for ${yearLabel}` : ""}. A reason is required for dropping.
            </p>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Enrollment:</span>{" "}
                {enrollment.course?.code ?? "Course N/A"} • {enrollment.year_level?.year_level ?? "Year N/A"} • {" "}
                {enrollment.semester?.semester ?? "Semester N/A"}
              </div>
              <div className="relative min-w-[14rem]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search code or title"
                  className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-200"
                />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {filteredSubjects.length === 0 ? (
                <div className="flex h-full min-h-[14rem] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-[11px] text-slate-500">
                  <AlertCircle className="mb-2 h-6 w-6 text-slate-400" />
                  <p>No enrolled subjects matched the filters.</p>
                  {search ? <p className="mt-1 text-slate-400">Try adjusting your keywords.</p> : null}
                </div>
              ) : (
                <ul className="grid gap-4">
                  {filteredSubjects.map((subject) => {
                    const subjectId = String(subject.enrollment_subject_id ?? subject.id ?? "");
                    const isSelected = subjectId === selectedSubjectId;
                    const scheduleLabel = subject.schedule_label ?? subject.scheduleLabel ?? "Schedule not set";

                    return (
                      <li key={subjectId} className="rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-rose-200">
                        <button
                          type="button"
                          onClick={() => handleSubjectSelect(subject)}
                          className={`flex w-full flex-col gap-3 rounded-xl px-4 py-3 text-left text-[11px] transition ${
                            isSelected
                              ? "border border-rose-200 bg-rose-50"
                              : "border border-transparent bg-transparent"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-800">{subject.code || subject.subject_code || "—"}</span>
                              <span className="text-[11px] text-slate-600">{subject.title || subject.subject_title || "Untitled subject"}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                              <span className="rounded-full border border-slate-200 px-2 py-0.5">
                                {subject.units ?? subject.subject_units ?? "—"} units
                              </span>
                              <span className="rounded-full border border-slate-200 px-2 py-0.5">
                                {subject.year_label ?? subject.yearLabel ?? "Year N/A"}
                              </span>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-500">{scheduleLabel}</p>

                          {isSelected ? (
                            <div className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                              <Minus className="h-3 w-3" /> Selected for dropping
                            </div>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {form.errors.reason ? (
                <p className="mt-3 text-[11px] text-rose-500">{form.errors.reason}</p>
              ) : null}

              <div className="mt-4 space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Reason for dropping
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    if (form.errors.reason) form.clearErrors("reason");
                  }}
                  placeholder="Provide a clear justification"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-200"
                  disabled={!selectedSubject || form.processing}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex flex-col gap-2 text-[10px] text-slate-500 md:flex-row md:items-center md:justify-between">
                <div>
                  Dropped subjects will be recorded with the provided reason for audit purposes.
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={route("registrar.students.profile.show", enrollment.student_id)}
                    className="inline-flex items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={form.processing || !selectedSubject}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-400"
                  >
                    {form.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4" />} Drop subject
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </RegistrarLayout>
  );
};

export default DropSubject;
