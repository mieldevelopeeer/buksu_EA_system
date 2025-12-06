import React, { useState, useEffect } from "react";
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
  const [yearEditMode, setYearEditMode] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [collapsedYears, setCollapsedYears] = useState({});

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // 🔹 Show 5 school years per page

  const [formData, setFormData] = useState({
    school_year: "",
    start_date: "",
    end_date: "",
    is_active: false,
  });

  const form = useForm(formData);

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

  const COLLAPSE_STORAGE_KEY = "ay-semester-collapsed-years";

  const openAddModal = () => {
    setFormData({
      school_year: getCurrentSchoolYear(),
      start_date: "",
      end_date: "",
      is_active: false,
    });
    setEditMode(false);
    setYearEditMode(false);
    setSelectedSemester(null);
    setSelectedYear(null);
    setShowModal(true);
  };

  const openEditModal = (semester) => {
    setEditMode(true);
    setYearEditMode(false);
    setSelectedSemester(semester);
    const ay = getAcademicYear(semester);
    setFormData({
      school_year: ay?.school_year || "",
      start_date: semester.start_date || "",
      end_date: semester.end_date || "",
      is_active: semester.is_active,
    });
    setSelectedYear(null);
    setShowModal(true);
  };

  const openYearEditModal = (yearObj) => {
    if (!yearObj) return;
    setYearEditMode(true);
    setEditMode(false);
    setSelectedYear(yearObj);
    setSelectedSemester(null);
    setFormData({
      school_year: yearObj.school_year || "",
      start_date: yearObj.start_date || "",
      end_date: yearObj.end_date || "",
      is_active: yearObj.is_active ?? false,
    });
    setShowModal(true);
  };

  const toggleCollapse = (year) =>
    setCollapsedYears((prev) => ({ ...prev, [year]: !prev[year] }));

  const submit = (e) => {
    e.preventDefault();
    const onSuccess = () => {
      Toast.fire({
        icon: "success",
        title: yearEditMode ? "School Year updated!" : editMode ? "Updated!" : "Added!",
      });
      setShowModal(false);
      setEditMode(false);
      setYearEditMode(false);
      setSelectedSemester(null);
      setSelectedYear(null);
      setFormData({
        school_year: "",
        start_date: "",
        end_date: "",
        is_active: false,
      });
    };
    const onError = (errors) => {
      const duplicateMessage = "Semesters for this school year already exist.";
      const schoolYearError = Array.isArray(errors?.school_year)
        ? errors.school_year[0]
        : typeof errors?.school_year === "string"
          ? errors.school_year
          : null;

      const title = schoolYearError === duplicateMessage
        ? "Already Existed"
        : schoolYearError || "Failed to save.";

      Toast.fire({ icon: "error", title });
    };

    if (yearEditMode && selectedYear) {
      router.put(
        route("registrar.ay-year.update", { id: selectedYear.id }),
        formData,
        { onSuccess, onError }
      );
    } else if (editMode && selectedSemester) {
      router.put(
        route("registrar.ay-semester.update", { id: selectedSemester.id }),
        formData,
        { onSuccess, onError }
      );
    } else {
      router.post(route("registrar.ay-semester.store"), formData, {
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

  const handleInputChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        setCollapsedYears(parsed);
      }
    } catch (error) {
      console.warn("Failed to parse collapse state", error);
    }
  }, []);

  useEffect(() => {
    setCollapsedYears((prev) => {
      const next = { ...prev };
      let changed = false;

      sortedGroupedSemesters.forEach(([year]) => {
        if (!(year in next)) {
          next[year] = true;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [sortedGroupedSemesters]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      COLLAPSE_STORAGE_KEY,
      JSON.stringify(collapsedYears)
    );
  }, [collapsedYears]);

  // 🔹 Pagination
  const totalPages = Math.ceil(sortedGroupedSemesters.length / itemsPerPage);
  const currentItems = sortedGroupedSemesters.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <RegistrarLayout>
      <div className="p-6 font-sans text-gray-900 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarCheck className="text-blue-600" size={24} weight="duotone" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Academic Year & Semester</h1>
              <p className="text-sm text-gray-500">Manage academic years and their semesters</p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            <Plus size={18} weight="bold" /> 
            <span>Add New</span>
          </button>
        </div>

        {/* Semester List */}
        {semestersData.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <CalendarCheck size={32} className="text-blue-500" weight="duotone" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-1">No academic years found</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first academic year</p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} weight="bold" />
              Add Academic Year
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            {currentItems.map(([year, items]) => {
              const yearObj = academicYears.find((ay) => ay.school_year === year);
              const isYearActive = yearObj?.is_active;
              
              return (
                <div key={year} className="border-b border-gray-100 last:border-0">
                  <div
                    className="flex justify-between items-center cursor-pointer p-4 hover:bg-gray-50 transition-colors"
                    onClick={() => toggleCollapse(year)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${isYearActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <div>
                        <h3 className="font-semibold text-gray-800">S.Y. {year}</h3>
                        <p className="text-xs text-gray-500">
                          {items.length} semester{items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleYearStatus(yearObj);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          isYearActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${isYearActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        {isYearActive ? "Active" : "Inactive"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openYearEditModal(yearObj);
                        }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        title="Edit School Year"
                        disabled={!yearObj}
                      >
                        <PencilSimple size={14} weight="bold" />
                      </button>
                      <span className="text-gray-400">
                        {collapsedYears[year] ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {!collapsedYears[year] && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 pb-3"
                      >
                        <div className="space-y-2 mt-2">
                          {items.map((s) => (
                            <div
                              key={s.id}
                              className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-6 rounded-full ${s.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <span className="font-medium text-gray-700">
                                  {s.semester}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleStatus(s)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    s.is_active
                                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                                      : "bg-red-100 text-red-700 hover:bg-red-200"
                                  }`}
                                >
                                  {s.is_active ? (
                                    <CheckCircle size={14} weight="fill" className="text-green-600" />
                                  ) : (
                                    <XCircle size={14} weight="fill" className="text-red-600" />
                                  )}
                                  {s.is_active ? "Active" : "Inactive"}
                                </button>

                                <button
                                  onClick={() => openEditModal(s)}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                  title="Edit"
                                >
                                  <PencilSimple size={14} weight="bold" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 px-1">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, semestersData.length)}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, semestersData.length)}
              </span>{' '}
              of <span className="font-medium">{semestersData.length}</span> academic years
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                } transition-colors`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <span className="px-2 text-gray-500">...</span>
                )}
                
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === totalPages
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {totalPages}
                  </button>
                )}
              </div>
              
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                } transition-colors`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl w-full max-w-sm shadow-lg overflow-hidden"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 500 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {yearEditMode
                      ? "Edit School Year"
                      : editMode
                        ? "Edit Semester"
                        : "Add New Academic Year"}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} weight="bold" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {yearEditMode
                    ? "Update the school year information"
                    : editMode
                      ? "Update the semester details"
                      : "Add a new academic year with semesters"}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={submit} className="p-4 space-y-3 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    School Year <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.school_year}
                      onChange={handleInputChange}
                      name="school_year"
                      list="schoolYearOptions"
                      placeholder="e.g., 2024-2025"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      required
                    />
                    <datalist id="schoolYearOptions" className="hidden">
                      {academicYears.map((year) => (
                        <option key={year.id} value={year.school_year} />
                      ))}
                    </datalist>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Format: YYYY-YYYY (e.g., 2024-2025)
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    />
                  </div>
                </div>

                {!editMode && !yearEditMode && (
                  <div>
                    <p className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Semesters to create
                    </p>
                    <div className="space-y-1.5 text-[11px]">
                      {['First Semester', 'Second Semester', 'Summer'].map((semester) => (
                        <div key={semester} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{semester}</p>
                            <p className="text-xs text-gray-500">Will be created as inactive</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={form.processing}
                    className={`w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg shadow-sm transition-all ${
                      form.processing ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-md'
                    }`}
                  >
                    {form.processing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        {yearEditMode ? (
                          <>
                            <PencilSimple size={16} weight="bold" />
                            Update School Year
                          </>
                        ) : editMode ? (
                          <>
                            <PencilSimple size={16} weight="bold" />
                            Update Semester
                          </>
                        ) : (
                          <>
                            <Plus size={16} weight="bold" />
                            Add Academic Year
                          </>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>
    </RegistrarLayout>
  );
}
