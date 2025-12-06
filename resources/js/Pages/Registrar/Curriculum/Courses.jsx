import React, { useState } from 'react';
import RegistrarLayout from '@/Layouts/RegistrarLayout';
import { useForm, usePage, router } from '@inertiajs/react';
import { 
  Plus, 
  X, 
  CheckCircle, 
  XCircle, 
  Eye, 
  PencilSimple,
  CaretDown,
  CaretUp,
  Folder,
  FileText
} from "phosphor-react";

import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

export default function Courses() {
  const { courses, departments, degreeTypes } = usePage().props;
  const degreeOptions = Array.isArray(degreeTypes) && degreeTypes.length > 0
    ? degreeTypes
    : ['Bachelor', 'Master', 'Doctorate'];
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [majorsModal, setMajorsModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

    // 🔹 Filter states
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [degreeTypeFilter, setDegreeTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const form = useForm({
    code: '',
    name: '',
    description: '',
    department_id: '',
    degree_type: '',
  });

  // 🔹 Apply filtering on courses
  const filteredCourses = courses.data.filter((course) => {
    const matchesSearch =
      course.name.toLowerCase().includes(search.toLowerCase()) ||
      course.code.toLowerCase().includes(search.toLowerCase());

    const matchesDepartment =
      !departmentFilter || course.department_id == departmentFilter;

    const matchesDegree =
      !degreeTypeFilter || course.degree_type === degreeTypeFilter;

    const matchesStatus =
      !statusFilter ||
      (statusFilter === "active" && course.status === 1) ||
      (statusFilter === "inactive" && course.status === 0);

    return matchesSearch && matchesDepartment && matchesDegree && matchesStatus;
  });

  const showToast = (message, icon = "success") => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: icon,
      title: message,
      showConfirmButton: false,
      timer: 1000,
      timerProgressBar: true,
    });
  };

  const openAddModal = () => {
    form.reset();
    setEditMode(false);
    setSelectedCourse(null);
    setShowModal(true);
  };

  const openEditModal = (course) => {
    form.setData({
      code: course.code,
      name: course.name,
      description: course.description || '',
      department_id: course.department_id,
      degree_type: course.degree_type || '',
    });
    setEditMode(true);
    setSelectedCourse(course);
    setShowModal(true);
  };

  const openViewModal = (course) => {
    setSelectedCourse(course);
    setViewModal(true);
  };

const openMajorsModal = (course) => {
  router.get(
    route("registrar.courses.majors.index", course.id),
    {},
    {
      preserveScroll: true,
      onSuccess: (page) => {
        setSelectedCourse({
          ...course,
          majors: page.props.majors, // fetched majors
        });
        setMajorsModal(true);
      },
    }
  );
};

  const submit = (e) => {
    e.preventDefault();

    const successMessage = editMode
      ? "Course updated successfully!"
      : "Course added successfully!";
    const errorMessage = editMode
      ? "Failed to update course."
      : "Failed to add course.";

    const onSuccess = () => {
      showToast(successMessage, "success");
      setShowModal(false);
      setEditMode(false);
      setSelectedCourse(null);
      form.reset();
    };

    const onError = () => {
      showToast(errorMessage, "error");
    };

    if (editMode && selectedCourse) {
      form.put(route("registrar.courses.update", selectedCourse.id), {
        onSuccess,
        onError,
      });
    } else {
      form.post(route("registrar.courses.store"), {
        onSuccess,
        onError,
      });
    }
  };

  const handlePagination = (url) => {
    if (url) router.visit(url);
  };

  const handleToggleStatus = (id, currentStatus) => {
    const newStatus = currentStatus === 1 ? 0 : 1;

    Swal.fire({
      title: "Are you sure?",
      text: `Would you like to ${newStatus === 1 ? "activate" : "deactivate"} this course?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, proceed",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        router.put(
          route("registrar.courses.toggleStatus", id),
          { status: newStatus },
          {
            preserveScroll: true,
            onSuccess: () => {
              showToast(
                `The course is now ${newStatus === 1 ? "active" : "inactive"}.`,
                "success"
              );
            },
            onError: () => {
              showToast("Failed to update course status.", "error");
            },
          }
        );
      }
    });
  };

  return (
    <RegistrarLayout>
      <div className="text-gray-800 px-5 py-3 font-[Poppins] text-xs">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold tracking-wide">Courses List</h1>

          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow transition text-[11px]"
          >
            <Plus size={16} /> Add Course
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 mb-5 text-[11px]">
          <div className="grid gap-2.5 md:grid-cols-4">
            <div>
              <label htmlFor="course-search" className="block text-[10px] font-semibold text-gray-500 mb-1">
                Search
              </label>
              <input
                id="course-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by course code or name"
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition placeholder:text-[11px]"
              />
            </div>

            <div>
              <label htmlFor="department-filter" className="block text-[10px] font-semibold text-gray-500 mb-1">
                Department
              </label>
              <select
                id="department-filter"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="degree-filter" className="block text-[10px] font-semibold text-gray-500 mb-1">
                Degree Type
              </label>
              <select
                id="degree-filter"
                value={degreeTypeFilter}
                onChange={(e) => setDegreeTypeFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value="">All Degrees</option>
                {degreeOptions.map((type, index) => (
                  <option key={index} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="status-filter" className="block text-[10px] font-semibold text-gray-500 mb-1">
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between text-[11px]"
              >
                {/* Course Info */}
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center justify-between">
                    {course.name}
                  </h3>
                  <p className="text-[11px] text-gray-600">
                    Code: <span className="font-medium">{course.code}</span>
                  </p>
                  <p className="text-[11px] text-gray-600">
                    Department:{" "}
                    <span className="font-medium">
                      {course.department?.name || "-"}
                    </span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 text-[11px]">
                  {/* Majors Button */}
                  <button
                    onClick={() => router.visit(route("registrar.courses.majors.index", course.id))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition font-medium"
                    title="Manage Majors"
                  >
                    <Eye size={14} />
                    See Majors
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEditModal(course)}
                    className="p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
                    title="Edit"
                  >
                    <PencilSimple size={14} />
                  </button>

                  {/* View */}
                  <button
                    onClick={() => openViewModal(course)}
                    className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                    title="View"
                  >
                    <Eye size={14} />
                  </button>

                  {/* Toggle Status */}
                  <button
                    onClick={() => handleToggleStatus(course.id, course.status)}
                    className={`p-1.5 rounded-lg transition ${
                      course.status === 1
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-green-100 text-green-600 hover:bg-green-200"
                    } text-xs`}
                    title={course.status === 1 ? "Inactivate" : "Activate"}
                  >
                    {course.status === 1 ? (
                      <XCircle size={14} />
                    ) : (
                      <CheckCircle size={14} />
                    )}
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500 py-10">
              No courses found.
            </p>
          )}
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center mt-4 space-x-2">
          {courses.links.map((link, index) => (
            <button
              key={index}
              disabled={!link.url}
              dangerouslySetInnerHTML={{ __html: link.label }}
              onClick={() => handlePagination(link.url)}
              className={`px-3 py-1 text-[11px] border rounded ${
                link.active
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          ))}
        </div>

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-5 rounded-lg shadow-lg w-full max-w-sm text-xs"
              >
                {/* Modal Header */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-semibold">
                    {editMode ? 'Edit Course' : 'Add Course'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-600 hover:text-red-600 transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={submit} className="space-y-4">
                  {/* Degree Type */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Degree Type
                    </label>
                    <select
                      value={form.data.degree_type}
                      onChange={(e) => form.setData('degree_type', e.target.value)}
                      className="w-full border rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 text-[11px]"
                    >
                      <option value="">Select Degree Type</option>
                      {degreeOptions.map((type, index) => (
                        <option key={index} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Course Code */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Course Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., BSCS101"
                      value={form.data.code}
                      onChange={(e) => form.setData('code', e.target.value)}
                      className="w-full border rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 text-[11px]"
                    />
                    {form.errors.code && (
                      <p className="text-red-600 text-[11px]">{form.errors.code}</p>
                    )}
                  </div>

                  {/* Course Name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Course Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Bachelor of Science in Computer Science"
                      value={form.data.name}
                      onChange={(e) => form.setData('name', e.target.value)}
                      className="w-full border rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 text-[11px] placeholder:text-[11px]"
                    />
                    {form.errors.name && (
                      <p className="text-red-600 text-[11px]">{form.errors.name}</p>
                    )}
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Department
                    </label>
                    <select
                      value={form.data.department_id}
                      onChange={(e) => form.setData('department_id', e.target.value)}
                      className="w-full border rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 text-[11px]"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    {form.errors.department_id && (
                      <p className="text-red-600 text-[11px]">{form.errors.department_id}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Description
                    </label>
                    <textarea
                      placeholder="Enter a short description of the course"
                      value={form.data.description}
                      onChange={(e) => form.setData('description', e.target.value)}
                      className="w-full border rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 text-[11px] placeholder:text-[11px]"
                    />
                    {form.errors.description && (
                      <p className="text-red-600 text-[11px]">{form.errors.description}</p>
                    )}
                  </div>

                  {/* Save Button */}
                  <button
                    type="submit"
                    disabled={form.processing}
                    className={`w-full text-white px-3 py-2 rounded-md text-[11px] transition ${
                      form.processing
                        ? 'bg-blue-400'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {form.processing ? 'Saving...' : 'Save'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Modal */}
        <AnimatePresence>
          {viewModal && selectedCourse && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-5 rounded-lg shadow-lg w-full max-w-sm text-xs"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-semibold">Course Info</h2>
                  <button
                    onClick={() => {
                      setViewModal(false);
                      setSelectedCourse(null);
                    }}
                    className="text-gray-600 hover:text-red-600 transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-gray-700">
                  {/* Status */}
                  <p>
                    <strong>Status:</strong>{' '}
                    <span
                      className={`px-2 py-1 rounded-full text-[11px] font-medium ${
                        selectedCourse.status === 1
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {selectedCourse.status === 1 ? 'Active' : 'Inactive'}
                    </span>
                  </p>

                  <p><strong>Degree Type:</strong> {selectedCourse.degree_type || '-'}</p>
                  <p><strong>Code:</strong> {selectedCourse.code}</p>
                  <p><strong>Name:</strong> {selectedCourse.name}</p>
                  <p><strong>Department:</strong> {selectedCourse.department?.name || '-'}</p>

                  <p className="font-semibold mb-1">Description:</p>
                  <div className="bg-gray-100 border border-gray-300 rounded p-3 text-xs text-gray-800 whitespace-pre-line">
                    {selectedCourse.description || '-'}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Majors Modal */}
        <AnimatePresence>
          {majorsModal && selectedCourse && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-5 rounded-lg shadow-lg w-full max-w-md text-xs"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-semibold">
                    Majors for {selectedCourse.name}
                  </h2>
                  <button
                    onClick={() => {
                      setMajorsModal(false);
                      setSelectedCourse(null);
                    }}
                    className="text-gray-600 hover:text-red-600 transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Majors List (placeholder until backend is hooked) */}
                <div className="space-y-2">
                  {selectedCourse.majors && selectedCourse.majors.length > 0 ? (
                    selectedCourse.majors.map((major, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-gray-100 p-2 rounded"
                      >
                        <span>{major.name}</span>
                        <button className="text-blue-600 hover:underline text-xs">
                          Edit
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No majors added yet.</p>
                  )}
                </div>

                {/* Add Major Button */}
                <button
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-md text-[11px]"
                >
                  + Add Major
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RegistrarLayout>
  );
}
