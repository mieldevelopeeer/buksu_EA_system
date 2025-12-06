import React, { useMemo, useState } from "react";
import { useForm, usePage, router } from "@inertiajs/react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import { UsersThree, Gauge, WarningCircle, CheckCircle, Plus, X } from "phosphor-react";

const ProgressBar = ({ value, max }) => {
  const percent = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
      <div
        className={`h-full transition-all duration-300 ${
          percent >= 95 ? "bg-rose-500" : percent >= 80 ? "bg-amber-400" : "bg-emerald-500"
        }`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};

const formatYear = (ya) => ya?.year_level || "Unassigned";

const StatusToggle = ({ section }) => {
  const handleToggle = () => {
    router.patch(
      route("program-head.sections.toggle-status", section.id),
      { status: section.status ? 0 : 1 },
      {
        preserveScroll: true,
        preserveState: true,
      }
    );
  };

  return (
    <div
      onClick={handleToggle}
      className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
        section.status ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <div
        className="w-4 h-4 bg-white rounded-full shadow-sm transition-transform"
        style={{ transform: `translateX(${section.status ? 20 : 0}px)` }}
      />
    </div>
  );
};

const deriveSummary = (sections) => {
  return sections.reduce(
    (acc, section) => {
      const capacity = Number(section.student_limit) || 0;
      const enrolled = Number(section.enrolled_students_count) || 0;
      acc.capacity += capacity;
      acc.enrolled += enrolled;
      acc.sections += 1;
      acc.risky += enrolled >= capacity;
      return acc;
    },
    { capacity: 0, enrolled: 0, sections: 0, risky: 0 }
  );
};

export default function SectionCapacity() {
  const { sections = [], yearLevels = [], activeSchoolYear = null } = usePage().props;
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const form = useForm({
    section: "",
    year_level_id: "",
    student_limit: "",
  });

  const groupedSections = useMemo(() => {
    const groups = {};
    yearLevels.forEach((yl) => {
      groups[yl.id] = { year: yl, sections: [] };
    });

    sections.forEach((section) => {
      const key = section.year_level_id || "unassigned";
      if (!groups[key]) {
        groups[key] = { year: { id: key, year_level: "Unassigned" }, sections: [] };
      }
      groups[key].sections.push(section);
    });

    return Object.values(groups)
      .filter((group) => group.sections.length > 0)
      .sort((a, b) => (a.year.id ?? 0) - (b.year.id ?? 0));
  }, [sections, yearLevels]);

  const overallSummary = useMemo(() => deriveSummary(sections), [sections]);

  const openAddModal = () => {
    form.reset();
    setEditMode(false);
    setSelectedSection(null);
    setShowModal(true);
  };

  const openEditModal = (section) => {
    form.setData({
      section: section.section || "",
      year_level_id: section.year_level_id || "",
      student_limit: section.student_limit || "",
    });
    setSelectedSection(section);
    setEditMode(true);
    setShowModal(true);
  };

  const submit = (e) => {
    e.preventDefault();
    const onSuccess = () => {
      setShowModal(false);
      setEditMode(false);
      setSelectedSection(null);
      form.reset();
    };

    if (editMode && selectedSection) {
      form.put(route("program-head.sections.update", selectedSection.id), {
        onSuccess,
      });
    } else {
      form.post(route("program-head.sections.store"), {
        onSuccess,
      });
    }
  };

  return (
    <ProgramHeadLayout>
      <div className="px-6 py-4 text-slate-800 font-[Poppins]">
        <div className="mb-5 space-y-3">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Program Head • Sections</p>
              <h1 className="text-xl font-semibold">Section Capacity Overview</h1>
              <p className="text-[12px] text-slate-500">
                Active School Year: {activeSchoolYear?.school_year || "Not set"}
              </p>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-600 bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-500"
            >
              <Plus size={16} weight="bold" />
              Add Section
            </button>
          </div>

          <div className="grid gap-2 text-[12px] sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-blue-500">Total Capacity</p>
              <p className="text-xl font-semibold text-blue-800">{overallSummary.capacity}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-emerald-500">Enrolled</p>
              <p className="text-xl font-semibold text-emerald-700">{overallSummary.enrolled}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Sections</p>
              <p className="text-xl font-semibold text-slate-700">{overallSummary.sections}</p>
            </div>
          </div>
        </div>

        {groupedSections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No sections found for your department.
          </div>
        ) : (
          <div className="space-y-8">
            {groupedSections.map(({ year, sections: yearSections }) => {
              const summary = deriveSummary(yearSections);
              const percent = Math.min(100, Math.round((summary.enrolled / Math.max(1, summary.capacity)) * 100));

              return (
                <div key={year.id || "unassigned"} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Year Level</p>
                      <h2 className="text-lg font-semibold text-slate-800">{formatYear(year)}</h2>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                      <div className="flex items-center gap-2 text-slate-600">
                        <UsersThree size={16} className="text-blue-500" />
                        <span>
                          {summary.enrolled} / {summary.capacity} students
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Gauge size={16} className="text-emerald-500" />
                        <span>{percent}% utilization</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 px-5 py-4 md:grid-cols-2 lg:grid-cols-3">
                    {yearSections.map((section) => {
                      const capacity = Number(section.student_limit) || 0;
                      const enrolled = Number(section.enrolled_students_count) || 0;
                      const isFull = enrolled >= capacity;
                      return (
                        <div
                          key={section.id}
                          className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 shadow-sm text-[12px]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-slate-400">Section</p>
                              <h3 className="text-base font-semibold text-slate-800">
                                {section.section || "Unnamed"}
                              </h3>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                  isFull
                                    ? "bg-rose-100 text-rose-700"
                                    : enrolled / Math.max(1, capacity) >= 0.8
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {isFull ? (
                                  <WarningCircle size={14} weight="bold" />
                                ) : (
                                  <CheckCircle size={14} weight="bold" />
                                )}
                                {isFull ? "Full" : "Open"}
                              </span>
                              <button
                                type="button"
                                onClick={() => openEditModal(section)}
                                className="rounded-full border border-slate-200 p-1 text-slate-400 transition hover:text-blue-600 hover:border-blue-300"
                              >
                                <span className="sr-only">Edit section</span>
                                ✎
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 space-y-1 text-[11px] text-slate-600">
                            <div className="flex justify-between text-[11px]">
                              <span>Enrolled</span>
                              <span>
                                {enrolled} / {capacity}
                              </span>
                            </div>
                            <ProgressBar value={enrolled} max={capacity} />
                            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                              <span
                                className={`flex items-center font-semibold ${
                                  section.status ? "text-emerald-600" : "text-rose-600"
                                }`}
                              >
                                <span
                                  className={`mr-1.5 h-2 w-2 rounded-full ${
                                    section.status ? "bg-emerald-500" : "bg-rose-500"
                                  }`}
                                />
                                {section.status ? "Open" : "Closed"}
                              </span>
                              <StatusToggle section={section} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Sections</p>
                  <h2 className="text-xl font-semibold text-slate-800">{editMode ? "Edit" : "Add"} Section</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditMode(false);
                    setSelectedSection(null);
                    form.reset();
                  }}
                  className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4 text-sm">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Section Name
                  </label>
                  <input
                    type="text"
                    value={form.data.section}
                    onChange={(e) => form.setData("section", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    required
                  />
                  {form.errors.section && (
                    <p className="mt-1 text-xs text-rose-600">{form.errors.section}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Year Level
                  </label>
                  <select
                    value={form.data.year_level_id}
                    onChange={(e) => form.setData("year_level_id", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    required
                  >
                    <option value="">-- Select Year Level --</option>
                    {yearLevels.map((yl) => (
                      <option key={yl.id} value={yl.id}>
                        {yl.year_level}
                      </option>
                    ))}
                  </select>
                  {form.errors.year_level_id && (
                    <p className="mt-1 text-xs text-rose-600">{form.errors.year_level_id}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Student Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.data.student_limit}
                    onChange={(e) => form.setData("student_limit", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    required
                  />
                  {form.errors.student_limit && (
                    <p className="mt-1 text-xs text-rose-600">{form.errors.student_limit}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={form.processing}
                  className="w-full rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {form.processing ? "Saving..." : editMode ? "Update Section" : "Save Section"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProgramHeadLayout>
  );
}
