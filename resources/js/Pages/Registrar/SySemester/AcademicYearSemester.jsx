import React, { useState } from "react";
import { useForm, usePage, router } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import {
  Plus,
  X,
  CalendarCheck,
  PencilSimple,
  CheckCircle,
  XCircle,
} from "phosphor-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

export default function AcademicYearsSemesters() {
  const { semesters } = usePage().props;
  const semestersData = semesters || [];

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [collapsedYears, setCollapsedYears] = useState({});

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // 🔹 Show 5 school years per page

  const form = useForm({ school_year_id: "", semester: "", is_active: false });

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1200,
    timerProgressBar: true,
  });

  const getAcademicYear = (sem) => sem.academicYear || sem.academic_year || null;

  const getCurrentSchoolYear = () => {
    const today = new Date();
    const startYear = today.getFullYear();
    const month = today.getMonth() + 1;
    const actualStartYear = month >= 6 ? startYear : startYear - 1;
    return `${actualStartYear}-${actualStartYear + 1}`;
  };

  const getAutoSemester = () => {
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 10) return "First Semester";
    if (month >= 11 || month <= 3) return "Second Semester";
    return "Summer";
  };

  const openAddModal = () => {
    form.reset();
    setEditMode(false);
    setSelectedSemester(null);

    const currentYear = academicYears.find(
      (ay) => ay.school_year === getCurrentSchoolYear()
    );
    if (currentYear) {
      form.setData("school_year_id", currentYear.id);
    }
    form.setData("semester", getAutoSemester());
    setShowModal(true);
  };

  const openEditModal = (semester) => {
    setEditMode(true);
    setSelectedSemester(semester);
    const ay = getAcademicYear(semester);
    form.setData({
      school_year_id: ay?.id || "",
      semester: semester.semester,
      is_active: semester.is_active,
    });
    setShowModal(true);
  };

  const toggleCollapse = (year) =>
    setCollapsedYears((prev) => ({ ...prev, [year]: !prev[year] }));

  const submit = (e) => {
    e.preventDefault();
    const onSuccess = () => {
      Toast.fire({ icon: "success", title: editMode ? "Updated!" : "Added!" });
      setShowModal(false);
      setEditMode(false);
      setSelectedSemester(null);
      form.reset();
    };
    const onError = () =>
      Toast.fire({ icon: "error", title: "Failed to save." });

    if (editMode && selectedSemester) {
      router.put(
        route("registrar.ay-semester.update", { id: selectedSemester.id }),
        form.data,
        { onSuccess, onError }
      );
    } else {
      router.post(route("registrar.ay-semester.store"), form.data, {
        onSuccess,
        onError,
      });
    }
  };

  const toggleStatus = (semester) => {
    const ay = getAcademicYear(semester);
    Swal.fire({
      title: `Change status for ${ay?.school_year || "Unknown"} - ${
        semester.semester
      }?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes",
    }).then((result) => {
      if (result.isConfirmed) {
        router.put(
          route("registrar.ay-semester.toggle", { id: semester.id }),
          {},
          {
            onSuccess: () =>
              Toast.fire({ icon: "success", title: "Status updated" }),
            onError: () =>
              Toast.fire({ icon: "error", title: "Failed to update status." }),
          }
        );
      }
    });
  };

  const toggleYearStatus = (yearObj) => {
    Swal.fire({
      title: `Change status for S.Y. ${yearObj.school_year}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes",
    }).then((result) => {
      if (result.isConfirmed) {
        router.put(
          route("registrar.ay-year.toggle", { id: yearObj.id }),
          {},
          {
            onSuccess: () =>
              Toast.fire({ icon: "success", title: "School Year updated" }),
            onError: () =>
              Toast.fire({ icon: "error", title: "Failed to update year." }),
          }
        );
      }
    });
  };

  // Group by academic year
  const groupedSemesters = semestersData.reduce((acc, sem) => {
    const ay = getAcademicYear(sem);
    const year = ay?.school_year || "Unknown";
    if (!acc[year]) acc[year] = [];
    acc[year].push(sem);
    return acc;
  }, {});

  const academicYears = [
    ...new Map(
      semestersData
        .map((s) => {
          const ay = getAcademicYear(s);
          return [ay?.id, ay];
        })
        .filter(([id]) => id)
    ).values(),
  ];

  const sortedGroupedSemesters = Object.entries(groupedSemesters).sort(
    ([yearA], [yearB]) => {
      const startA = parseInt(yearA.split("-")[0], 10);
      const startB = parseInt(yearB.split("-")[0], 10);
      return startB - startA;
    }
  );

  // 🔹 Pagination
  const totalPages = Math.ceil(sortedGroupedSemesters.length / itemsPerPage);
  const currentItems = sortedGroupedSemesters.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <RegistrarLayout>
      <div className="p-6 font-sans text-gray-900">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <CalendarCheck className="text-blue-600" size={22} />
            Academic Year & Semester
          </h1>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-sm text-sm transition-all"
          >
            <Plus size={16} /> Add
          </button>
        </div>

        {/* Semester List */}
        {semestersData.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            No semesters found.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {currentItems.map(([year, items]) => {
              const yearObj = academicYears.find(
                (ay) => ay.school_year === year
              );
              return (
                <div key={year} className="border-b">
                  <div
                    className="flex justify-between items-center cursor-pointer bg-gray-50 p-3 hover:bg-gray-100 transition"
                    onClick={() => toggleCollapse(year)}
                  >
                    <span className="font-medium">S.Y {year}</span>
                    <div className="flex items-center gap-3">
                      {yearObj && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleYearStatus(yearObj);
                          }}
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            yearObj.is_active
                              ? "text-green-600 bg-green-100"
                              : "text-red-600 bg-red-100"
                          }`}
                        >
                          {yearObj.is_active ? "Active" : "Inactive"}
                        </button>
                      )}
                      <span className="text-gray-500 text-xs">
                        {collapsedYears[year] ? "Expand" : "Collapse"}
                      </span>
                    </div>
                  </div>

                  {!collapsedYears[year] && (
                    <div className="p-1.5 space-y-1">
                      {items.map((s) => (
                        <div
                          key={s.id}
                          className="flex justify-between items-center border rounded-md px-2 py-1 hover:bg-gray-50 transition text-xs"
                        >
                          <span className="font-medium text-gray-600">
                            {s.semester}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => toggleStatus(s)}
                              className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full transition ${
                                s.is_active
                                  ? "text-green-700 bg-green-100 hover:bg-green-200"
                                  : "text-red-700 bg-red-100 hover:bg-red-200"
                              }`}
                            >
                              {s.is_active ? (
                                <CheckCircle size={12} weight="fill" />
                              ) : (
                                <XCircle size={12} weight="fill" />
                              )}
                              {s.is_active ? "Active" : "Inactive"}
                            </button>

                            <button
                              onClick={() => openEditModal(s)}
                              className="p-1 rounded-full hover:bg-blue-100 text-blue-600 transition"
                              title="Edit"
                            >
                              <PencilSimple size={12} weight="bold" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4 text-sm">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>

            <span className="text-gray-600">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

      {/* Modal */}
<AnimatePresence>
  {showModal && (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black/30 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-xl p-5 w-full max-w-xs shadow-md"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-semibold text-gray-700">
            {editMode ? "Edit Semester" : "Add Semester"}
          </h2>
          <button
            onClick={() => setShowModal(false)}
            className="text-gray-400 hover:text-red-500 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-2 text-sm">
          <div>
            <label className="block mb-1 text-gray-600">School Year</label>
            <select
              value={form.data.school_year_id}
              onChange={(e) => form.setData("school_year_id", e.target.value)}
              className="w-full border rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-500 text-sm"
              required
            >
              <option value="" disabled>
                Select School Year
              </option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.school_year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-gray-600">Semester</label>
            <select
              value={form.data.semester}
              onChange={(e) => form.setData("semester", e.target.value)}
              className="w-full border rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-500 text-sm"
              required
            >
              <option value="" disabled>
                Select Semester
              </option>
              <option value="First Semester">First Semester</option>
              <option value="Second Semester">Second Semester</option>
              <option value="Summer">Summer</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={form.processing}
            className={`w-full bg-blue-600 text-white py-1.5 rounded-md text-sm transition ${
              form.processing ? "bg-blue-400" : "hover:bg-blue-700"
            }`}
          >
            {form.processing ? "Saving..." : "Save"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

      </div>
    </RegistrarLayout>
  );
}
