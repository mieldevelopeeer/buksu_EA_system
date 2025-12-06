import React, { useMemo, useState } from "react";
import { Head, Link, router, useForm } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { ArrowLeft, Calendar, CheckCircle2, Loader2, Plus, Search } from "lucide-react";

const buildScheduleLabel = (schedule) => {
  if (!schedule) return "No schedule";
  const day = schedule.schedule_day ?? schedule.day ?? "";
  const start = schedule.start_time ?? "";
  const end = schedule.end_time ?? "";
  const room = schedule.classroom?.room_number ?? schedule.room_number ?? "TBA";
  const faculty = schedule.faculty
    ? `${schedule.faculty.lName ?? ""}, ${schedule.faculty.fName ?? ""}`.trim()
    : "TBA";

  const timePart = day && (start || end) ? `${day} ${start}${end ? `-${end}` : ""}` : "";
  const roomPart = room ? `Room ${room}` : "";
  return [timePart, roomPart, faculty ? `Prof. ${faculty}` : ""].filter(Boolean).join(" • ") || "TBA";
};

const AddSubject = ({
  enrollment,
  availableSubjects = [],
  alreadyEnrolledIds = [],
  yearLabel = null,
}) => {
  const [search, setSearch] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");

  const form = useForm({
    curriculum_subject_id: "",
    class_schedule_id: "",
  });

  const currentUnits = useMemo(() => {
    const value = Number.parseFloat(enrollment?.current_units ?? 0);
    return Number.isFinite(value) ? value : 0;
  }, [enrollment?.current_units]);

  const normalizedOptions = useMemo(() => {
    const enrolledSet = new Set(
      (alreadyEnrolledIds ?? []).map((id) => Number.parseInt(id, 10)).filter((id) => Number.isFinite(id))
    );

    return availableSubjects.map((subject) => {
      const totalUnits = Number(subject.lec_unit ?? 0) + Number(subject.lab_unit ?? 0);
      const schedules = Array.isArray(subject.class_schedules) ? subject.class_schedules : [];
      return {
        id: String(subject.id),
        curriculumSubjectId: subject.id,
        code: subject.subject?.code ?? "—",
        title: subject.subject?.descriptive_title ?? subject.subject?.descriptiveTitle ?? "Untitled subject",
        yearLabel:
          subject.yearLevel?.year_level ?? subject.year_level?.year_level ?? subject.yearLevel ?? subject.year_level ?? "Year N/A",
        semesterLabel:
          subject.semester?.semester ?? subject.semesters?.semester ?? subject.semester ?? "Semester N/A",
        units: Number.isFinite(totalUnits) ? totalUnits : null,
        schedules: schedules.map((schedule) => ({
          id: schedule.id,
          label: buildScheduleLabel(schedule),
        })),
        alreadyEnrolled: enrolledSet.has(Number(subject.id)),
      };
    });
  }, [availableSubjects, alreadyEnrolledIds]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    const term = search.trim().toLowerCase();
    return normalizedOptions.filter(
      (option) =>
        option.code?.toLowerCase().includes(term) || option.title?.toLowerCase().includes(term)
    );
  }, [normalizedOptions, search]);

  const selectedOption = useMemo(() => {
    if (!selectedSubjectId) return null;
    return normalizedOptions.find((option) => option.id === selectedSubjectId) ?? null;
  }, [normalizedOptions, selectedSubjectId]);

  const selectedUnits = selectedOption?.units ?? 0;
  const projectedUnits = currentUnits + (Number.isFinite(selectedUnits) ? selectedUnits : 0);

  const groupedOptions = useMemo(() => {
    const groups = new Map();

    filteredOptions.forEach((option) => {
      const yearKey = option.yearLabel ?? "Year N/A";
      if (!groups.has(yearKey)) {
        groups.set(yearKey, []);
      }

      groups.get(yearKey).push(option);
    });

    return Array.from(groups.entries());
  }, [filteredOptions]);

  const handleSubjectSelect = (optionId) => {
    const option = normalizedOptions.find((item) => item.id === optionId);
    if (!option || option.alreadyEnrolled) return;

    setSelectedSubjectId(option.id);
    const firstScheduleId = option.schedules[0]?.id ? String(option.schedules[0].id) : "";
    setSelectedScheduleId(firstScheduleId);
    form.setData({
      curriculum_subject_id: String(option.curriculumSubjectId),
      class_schedule_id: firstScheduleId,
    });
    form.clearErrors();
  };

  const handleScheduleSelect = (scheduleId) => {
    const value = scheduleId ? String(scheduleId) : "";
    setSelectedScheduleId(value);
    form.setData("class_schedule_id", value);
    form.clearErrors("class_schedule_id");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!selectedOption) {
      form.setError("curriculum_subject_id", "Please select a subject to add.");
      return;
    }

    if (selectedOption.alreadyEnrolled) {
      form.setError("curriculum_subject_id", "This subject is already enrolled.");
      return;
    }

    if (selectedOption.schedules.length > 0 && !selectedScheduleId) {
      form.setError("class_schedule_id", "Please choose a schedule for this subject.");
      return;
    }

    form.post(route("registrar.students.subjects.add", enrollment.id), {
      preserveScroll: true,
      onSuccess: () => {
        router.visit(route("registrar.students.profile.show", enrollment.student_id));
      },
    });
  };

  return (
    <RegistrarLayout>
      <Head title="Add Subject" />
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
            <h1 className="text-lg font-semibold text-slate-800">Add Subject</h1>
            <p className="mt-1 text-[11px] text-slate-500">
              Select a curriculum subject to add{yearLabel ? ` for ${yearLabel}` : ""}. Already enrolled subjects are marked and cannot
              be added again.
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
                  className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {filteredOptions.length === 0 ? (
                <div className="flex h-full min-h-[14rem] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-[11px] text-slate-500">
                  <Search className="mb-2 h-6 w-6 text-slate-400" />
                  <p>No curriculum subjects matched the filters.</p>
                  {search ? <p className="mt-1 text-slate-400">Try adjusting your keywords.</p> : null}
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedOptions.map(([yearKey, options]) => (
                    <div key={yearKey} className="space-y-2">
                      <div className="flex items-center justify-between rounded-md border border-slate-200/70 bg-slate-50 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-600">
                        <span>{yearKey}</span>
                        <span>{options.length} subject{options.length === 1 ? "" : "s"}</span>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                        <table className="min-w-full divide-y divide-slate-100 text-left text-[11px] text-slate-700">
                          <thead className="bg-slate-50 text-[10.5px] uppercase tracking-wide text-slate-600">
                            <tr>
                              <th className="px-3 py-2 text-slate-500">Select</th>
                              <th className="px-3 py-2 text-slate-500">Code</th>
                              <th className="px-3 py-2 text-slate-500">Subject</th>
                              <th className="px-3 py-2 text-slate-500">Year • Semester</th>
                              <th className="px-3 py-2 text-right text-slate-500">Units</th>
                              <th className="px-3 py-2 text-slate-500">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {options.map((option) => {
                              const isSelected = option.id === selectedSubjectId;
                              const isDisabled = option.alreadyEnrolled || form.processing;

                              return (
                                <tr
                                  key={option.id}
                                  onClick={() => {
                                    if (isDisabled) return;
                                    handleSubjectSelect(option.id);
                                  }}
                                  className={`cursor-pointer border-b border-slate-100 last:border-b-0 transition hover:bg-blue-50/60 ${
                                    isSelected ? "bg-blue-50" : "bg-white"
                                  } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                                >
                                  <td className="px-3 py-2 align-middle">
                                    <input
                                      type="radio"
                                      name="subject"
                                      className="h-3.5 w-3.5"
                                      checked={isSelected}
                                      onChange={() => handleSubjectSelect(option.id)}
                                      disabled={isDisabled}
                                    />
                                  </td>
                                  <td className="px-3 py-2 font-semibold text-slate-800">{option.code}</td>
                                  <td className="px-3 py-2 text-slate-600">
                                    <div className="whitespace-pre-line break-words leading-snug">{option.title}</div>
                                  </td>
                                  <td className="px-3 py-2 text-slate-500">
                                    {option.yearLabel} • {option.semesterLabel}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-600">
                                    {option.units ?? "—"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {option.alreadyEnrolled ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                                        <CheckCircle2 className="h-3 w-3" /> Already enrolled
                                      </span>
                                    ) : isSelected ? (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                                        <CheckCircle2 className="h-3 w-3" /> Selected
                                      </span>
                                    ) : (
                                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                        Available
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-600">
                    <span>
                      <span className="font-semibold text-slate-800">Current enrolled units:</span> {currentUnits}
                    </span>
                    <span>
                      <span className="font-semibold text-slate-800">Selected subject units:</span> {Number.isFinite(selectedUnits) ? selectedUnits : "—"}
                    </span>
                    <span>
                      <span className="font-semibold text-slate-800">Projected total units:</span> {Number.isFinite(selectedUnits) ? projectedUnits : currentUnits}
                    </span>
                  </div>

                  {selectedOption && selectedOption.schedules.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Choose schedule
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedOption.schedules.map((schedule) => (
                          <button
                            key={`${selectedOption.id}-schedule-${schedule.id}`}
                            type="button"
                            onClick={() => handleScheduleSelect(schedule.id)}
                            disabled={form.processing}
                            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] transition ${
                              selectedScheduleId === String(schedule.id)
                                ? "border-blue-300 bg-blue-100 text-blue-700"
                                : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600"
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {schedule.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {form.errors.curriculum_subject_id ? (
                <p className="mt-3 text-[11px] text-rose-500">{form.errors.curriculum_subject_id}</p>
              ) : null}
              {form.errors.class_schedule_id ? (
                <p className="text-[11px] text-rose-500">{form.errors.class_schedule_id}</p>
              ) : null}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex flex-col gap-2 text-[10px] text-slate-500 md:flex-row md:items-center md:justify-between">
                <div>
                  Only subjects from the student's curriculum and department are listed. Already enrolled subjects cannot be added
                  again.
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
                    disabled={form.processing}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
                  >
                    {form.processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add subject
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

export default AddSubject;
