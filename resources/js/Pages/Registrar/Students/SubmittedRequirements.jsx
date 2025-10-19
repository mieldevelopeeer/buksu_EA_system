import React, { useMemo, useState } from "react";
import { Head, useForm } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import {
  X,
  FileText,
  User,
  CheckCircle,
  Clock,
  Users,
  CalendarCheck,
  Upload,
  Loader2,
} from "lucide-react";

export default function SubmittedRequirements({ students = [], requirements = [] }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [previewImage, setPreviewImage] = useState(null);
  const sortedRequirements = useMemo(() =>
    [...requirements].sort((a, b) => a.name.localeCompare(b.name)),
    [requirements]
  );
  const formatStudentName = (student) => {
    const last = student?.lName ?? "";
    const first = student?.fName ?? "";
    const middle = student?.mName ?? "";
    const rest = [first, middle].filter(Boolean).join(" ");
    return [last, rest].filter(Boolean).join(rest ? ", " : "");
  };
  const form = useForm({
    student_id: "",
    requirement_id: "",
    image: null,
    is_submitted: true,
  });

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const fullName = `${student.fName ?? ''} ${student.mName ?? ''} ${student.lName ?? ''}`.toLowerCase();
      const matchesSearch = fullName.includes(search.toLowerCase());

      if (filterStatus === "All") return matchesSearch;

      const hasSubmitted = student.student_requirements?.some((req) => req.is_submitted);
      if (filterStatus === "Submitted") return matchesSearch && hasSubmitted;
      if (filterStatus === "Not Submitted") return matchesSearch && !hasSubmitted;

      return matchesSearch;
    });
  }, [students, search, filterStatus]);

  const metrics = useMemo(() => {
    const totalStudents = students.length;
    let fullyCompliant = 0;
    let totalSubmitted = 0;
    let totalRequired = 0;

    students.forEach((student) => {
      const requirements = student.student_requirements ?? [];
      const submittedCount = requirements.filter((req) => req.is_submitted).length;
      if (requirements.length > 0 && submittedCount === requirements.length) fullyCompliant++;
      totalSubmitted += submittedCount;
      totalRequired += requirements.length;
    });

    const pendingStudents = totalStudents - fullyCompliant;
    const completionRate = totalRequired > 0 ? Math.round((totalSubmitted / totalRequired) * 100) : 0;

    return {
      totalStudents,
      fullyCompliant,
      pendingStudents,
      completionRate,
    };
  }, [students]);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    form.setData((data) => ({
      ...data,
      student_id: student.id,
      requirement_id: "",
      image: null,
      is_submitted: true,
    }));
  };

  const handleCloseModal = () => {
    setSelectedStudent(null);
    setPreviewImage(null);
    form.reset();
  };

  const handleRequirementSubmit = (event) => {
    event.preventDefault();
    if (!form.data.student_id || !form.data.requirement_id) return;
    form.post(route("registrar.submitted.requirements.store"), {
      onSuccess: () => {
        form.reset("requirement_id", "image", "is_submitted");
      },
      preserveScroll: true,
      forceFormData: true,
    });
  };

  const requirementAlreadyAdded = (student, requirementId) => {
    if (!student) return false;
    return (student.student_requirements ?? []).some(
      (req) => req.requirement_id === Number(requirementId)
    );
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    form.setData("image", file ?? null);
  };

  return (
    <RegistrarLayout>
      <Head title="Submitted Requirements" />

      <div className="p-6 text-xs text-gray-800 space-y-4">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Students Requirements</h1>
            <p className="text-[11px] text-gray-500">Monitor submitted enrollment requirements across students.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </label>

            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="All">All</option>
              <option value="Submitted">Submitted</option>
              <option value="Not Submitted">Not Submitted</option>
            </select>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-blue-100 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-500">
              <Users size={16} />
              <p className="text-[11px] font-medium uppercase tracking-wide">Total Students</p>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{metrics.totalStudents}</p>
            <p className="mt-1 text-[11px] text-gray-500">Learners monitored for requirement completion.</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle size={16} />
              <p className="text-[11px] font-medium uppercase tracking-wide">Fully Compliant</p>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{metrics.fullyCompliant}</p>
            <p className="mt-1 text-[11px] text-gray-500">Students who have submitted every required document.</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-500">
              <Clock size={16} />
              <p className="text-[11px] font-medium uppercase tracking-wide">Pending</p>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{metrics.pendingStudents}</p>
            <p className="mt-1 text-[11px] text-gray-500">Students still missing one or more documents.</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-500">
              <CalendarCheck size={16} />
              <p className="text-[11px] font-medium uppercase tracking-wide">Completion Rate</p>
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{metrics.completionRate}%</p>
            <p className="mt-1 text-[11px] text-gray-500">Percentage of submitted documents out of total required.</p>
          </div>
        </section>

        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/70 py-16 text-center text-gray-400">
            <Users size={32} className="mb-3" />
            <p className="text-sm font-medium">No students found.</p>
            <p className="mt-1 max-w-sm text-[11px]">Try adjusting the search or filter selections to broaden the results.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredStudents.map((student) => {
              const requirements = student.student_requirements ?? [];
              const submittedCount = requirements.filter((req) => req.is_submitted).length;
              const total = requirements.length;
              const progress = total > 0 ? Math.round((submittedCount / total) * 100) : 0;

              let statusLabel = "No Requirements";
              let statusClasses = "bg-gray-100 text-gray-500 border border-gray-200";
              if (total > 0 && submittedCount === 0) {
                statusLabel = "Pending";
                statusClasses = "bg-amber-50 text-amber-600 border border-amber-200";
              } else if (total > 0 && submittedCount === total) {
                statusLabel = "Complete";
                statusClasses = "bg-emerald-50 text-emerald-600 border border-emerald-200";
              } else if (total > 0) {
                statusLabel = "In Progress";
                statusClasses = "bg-blue-50 text-blue-600 border border-blue-200";
              }

              const avatar = student.profile_picture ? `/storage/${student.profile_picture}` : null;
              const initialsRaw = `${(student.fName ?? '').charAt(0)}${(student.lName ?? '').charAt(0)}`.trim();
              const initials = initialsRaw || null;

              return (
                <div
                  key={student.id}
                  className="group rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-blue-50 text-sm font-semibold text-blue-600 shadow-sm">
                        {avatar ? (
                          <img src={avatar} alt={`${student.fName ?? 'Student'} avatar`} className="h-full w-full object-cover" />
                        ) : initials ? (
                          initials
                        ) : (
                          <User size={18} className="text-blue-300" />
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Student</p>
                        <h2 className="text-base font-semibold text-gray-900">
                          {formatStudentName(student)}
                        </h2>
                        <p className="mt-1 text-[11px] text-gray-500">
                          {submittedCount}/{total} documents submitted
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${statusClasses}`}>
                      {statusLabel}
                    </span>
                  </header>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>Completion</span>
                      <span className="font-semibold text-gray-700">{progress}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-gray-500">
                    <div>
                      <p className="font-medium text-gray-600">Last Update</p>
                      <p>
                        {requirements.length > 0
                          ? requirements.reduce((latest, requirement) => {
                              const submittedAt = requirement.updated_at ?? requirement.created_at;
                              if (!submittedAt) return latest;
                              const date = new Date(submittedAt);
                              return date > latest ? date : latest;
                            }, new Date(0))
                              .toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                          : 'No records'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSelectStudent(student)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-100"
                    >
                      <FileText className="h-4 w-4" />
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
              <button
                onClick={handleCloseModal}
                className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>

              <header className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-blue-50 text-base font-semibold text-blue-600">
                  {selectedStudent.profile_picture ? (
                    <img src={`/storage/${selectedStudent.profile_picture}`} alt={`${selectedStudent.fName ?? 'Student'} avatar`} className="h-full w-full object-cover" />
                  ) : (selectedStudent.fName || selectedStudent.lName) ? (
                    `${(selectedStudent.fName ?? '').charAt(0)}${(selectedStudent.lName ?? '').charAt(0)}`.trim()
                  ) : (
                    <User size={22} className="text-blue-300" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {selectedStudent.fName ?? ''} {selectedStudent.mName ?? ''} {selectedStudent.lName ?? ''}
                  </h2>
                </div>
              </header>

              {(() => {
                const requirements = selectedStudent.student_requirements ?? [];
                const submittedCount = requirements.filter((req) => req.is_submitted).length;
                const total = requirements.length;
                const progress = total > 0 ? Math.round((submittedCount / total) * 100) : 0;

                let statusLabel = 'No Requirements';
                let statusClasses = 'bg-gray-100 text-gray-500 border border-gray-200';
                if (total > 0 && submittedCount === 0) {
                  statusLabel = 'Pending';
                  statusClasses = 'bg-amber-50 text-amber-600 border border-amber-200';
                } else if (total > 0 && submittedCount === total) {
                  statusLabel = 'Complete';
                  statusClasses = 'bg-emerald-50 text-emerald-600 border border-emerald-200';
                } else if (total > 0) {
                  statusLabel = 'In Progress';
                  statusClasses = 'bg-blue-50 text-blue-600 border border-blue-200';
                }

                return (
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <div>
                        <p className="font-medium text-gray-600">Submission Status</p>
                        <p className="mt-0.5">
                          {submittedCount}/{total} documents submitted
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${statusClasses}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {selectedStudent.student_requirements?.length === 0 ? (
                <p className="mt-6 text-center text-gray-400">No requirements submitted.</p>
              ) : (
                <ul className="mt-5 space-y-4">
                  {selectedStudent.student_requirements.map((requirement) => (
                    <li key={requirement.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-gray-800">{requirement.requirement?.name ?? 'Requirement'}</span>
                        <span className={`ml-auto text-xs font-semibold ${
                          requirement.is_submitted ? 'text-emerald-600' : 'text-amber-500'
                        }`}>
                          {requirement.is_submitted ? 'Submitted' : 'Not Submitted'}
                        </span>
                      </div>

                      {requirement.image && (
                        <div className="mt-3">
                          <img
                            src={`/storage/${requirement.image}`}
                            alt={requirement.requirement?.name ?? 'Submitted Requirement'}
                            className="h-12 w-12 cursor-pointer rounded border object-cover"
                            onClick={() => setPreviewImage(`/storage/${requirement.image}`)}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={handleRequirementSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600">Add Requirement</label>
                  <select
                    value={form.data.requirement_id}
                    onChange={(event) => form.setData("requirement_id", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select requirement</option>
                    {sortedRequirements.map((requirement) => (
                      <option
                        key={requirement.id}
                        value={requirement.id}
                        disabled={requirementAlreadyAdded(selectedStudent, requirement.id)}
                      >
                        {requirement.name} ({requirement.required_for})
                      </option>
                    ))}
                  </select>
                  {form.errors.requirement_id && (
                    <p className="mt-1 text-[11px] text-rose-500">{form.errors.requirement_id}</p>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3">
                  <div>
                    <p className="text-xs font-medium text-gray-700">Upload proof</p>
                    <p className="text-[11px] text-gray-500">Accepted files: JPG, PNG up to 2MB.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 shadow-sm transition hover:bg-blue-100">
                    <Upload className="h-4 w-4" />
                    Browse
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
                {form.errors.image && (
                  <p className="-mt-3 text-[11px] text-rose-500">{form.errors.image}</p>
                )}

                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                    checked={form.data.is_submitted}
                    onChange={(event) => form.setData("is_submitted", event.target.checked)}
                  />
                  Mark as submitted
                </label>

                <button
                  type="submit"
                  disabled={form.processing}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {form.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Save requirement
                </button>
              </form>
            </div>
          </div>
        )}

        {previewImage && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
            onClick={() => setPreviewImage(null)}
          >
            <img src={previewImage} alt="Preview" className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl" />
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}
