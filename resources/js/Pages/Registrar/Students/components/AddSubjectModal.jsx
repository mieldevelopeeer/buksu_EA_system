import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";

const AddSubjectModal = ({
  isOpen,
  onClose,
  onSubmit,
  search,
  onSearchChange,
  enrollmentSummary,
  options,
  selection,
  onSelectOption,
  onSelectSchedule,
  isSubmitting,
}) => {
  if (!isOpen) {
    return null;
  }

  const { course, year, semester, yearLabel } = enrollmentSummary ?? {};
  const hasOptions = Array.isArray(options) && options.length > 0;
  const selectedId = selection?.curriculumSubjectId ?? "";
  const selectedScheduleId = selection?.classScheduleId ?? "";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          <X className="h-5 w-5" />
        </button>

        <form onSubmit={onSubmit} className="flex h-full flex-col">
          <div className="border-b border-slate-200 px-6 py-5">
            <h3 className="text-base font-semibold text-slate-800">Add subject</h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Choose a curriculum subject to add for {yearLabel ?? "this year level"}. Already enrolled subjects are marked and cannot be selected.
            </p>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Enrollment:</span>
                <span>
                  {course ?? "Course N/A"} • {year ?? "Year N/A"} • {semester ?? "Semester N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative min-w-[12rem] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={onSearchChange}
                    placeholder="Search code or title"
                    className="w-full rounded-full border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-[11px] text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {!hasOptions ? (
              <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-[11px] text-slate-500">
                <AlertCircle className="mb-2 h-6 w-6 text-slate-400" />
                <p>No curriculum subjects matched the filters.</p>
                {search ? (
                  <p className="mt-1 text-slate-400">Try adjusting the search keywords.</p>
                ) : (
                  <p className="mt-1 text-slate-400">Verify the curriculum has subjects for this year level.</p>
                )}
              </div>
            ) : (
              <ul className="grid gap-3">
                {options.map((option) => {
                  const optionId = String(option.curriculumSubjectId);
                  const isSelected = selectedId === optionId;
                  const isDisabled = Boolean(option.isAlreadyEnrolled);

                  return (
                    <li key={`add-${optionId}`}>
                      <button
                        type="button"
                        onClick={() => onSelectOption(optionId)}
                        disabled={isDisabled || isSubmitting}
                        className={`flex w-full flex-col gap-3 rounded-xl border px-4 py-3 text-left text-[11px] transition ${
                          isSelected
                            ? "border-blue-300 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50"
                        } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-800">{option.code}</span>
                            <span className="text-[11px] text-slate-600">{option.title}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                            <span className="rounded-full border border-slate-200 px-2 py-0.5 font-semibold text-slate-600">
                              {option.units ?? "—"} unit{option.units === 1 ? "" : "s"}
                            </span>
                            <span className="rounded-full border border-slate-200 px-2 py-0.5">
                              {option.yearLabel} • {option.semesterLabel}
                            </span>
                          </div>
                        </div>

                        {isDisabled ? (
                          <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> Already enrolled
                          </div>
                        ) : isSelected ? (
                          <div className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                            <CheckCircle2 className="h-3 w-3" /> Selected
                          </div>
                        ) : null}

                        {!isDisabled && option.schedules.length > 0 && isSelected ? (
                          <div className="mt-2 space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Choose schedule
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {option.schedules.map((schedule) => (
                                <button
                                  key={`${optionId}-sched-${schedule.id}`}
                                  type="button"
                                  onClick={() => onSelectSchedule(schedule.id)}
                                  disabled={isSubmitting}
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
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div className="flex flex-col gap-2 text-[10px] text-slate-500 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>
                  Only subjects from the student's curriculum and department are listed. Already enrolled subjects cannot be added again.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add subject
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSubjectModal;
