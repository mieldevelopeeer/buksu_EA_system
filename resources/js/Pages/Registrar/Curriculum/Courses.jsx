import React, { useState } from 'react';
import RegistrarLayout from '@/Layouts/RegistrarLayout';
import { useForm, usePage, router } from '@inertiajs/react';
import { Plus, X, CheckCircle, XCircle, Eye, PencilSimple } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

export default function Courses() {
  const { courses, departments, degreeTypes } = usePage().props;
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const form = useForm({
    code: '',
    name: '',
    description: '',
    department_id: '',
    degree_type: '',


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
      text: `Would you like to ${newStatus === 1 ? "activate" : "deactivate"
        } this course?`,
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
      <div className="text-gray-800 px-6 py-4 font-[Poppins]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-wide">Courses List</h1>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 shadow transition"
          >
            <Plus size={18} /> Add Course
          </button>
        </div>

        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-blue-100 text-left uppercase text-gray-600">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Degree Type</th>
                <th className="p-3">Code</th>
                <th className="p-3">Course Name</th>
                <th className="p-3">Department</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {courses.data.map((course, index) => (
                <tr key={course.id} className="border-t hover:bg-gray-50 transition">
                  <td className="p-3">{courses.from + index}</td>
                  <td className="p-3">{course.degree_type || '-'}</td>
                  <td className="p-3">{course.code}</td>
                  <td className="p-3">{course.name}</td>
                  <td className="p-3">{course.department?.name || '-'}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => openEditModal(course)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                    >
                      <PencilSimple size={16} /> Edit
                    </button>
                    <button
                      onClick={() => openViewModal(course)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition"
                    >
                      <Eye size={16} /> View

                    </button>
                    <button
                      onClick={() => handleToggleStatus(course.id, course.status)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition ${course.status === 1
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        }`}
                    >
                      {course.status === 1 ? (
                        <>
                          <XCircle size={16} /> Inactive
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} /> Active
                        </>
                      )}
                    </button>

                  </td>
                </tr>
              ))}
              {courses.data.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-gray-500 p-4">
                    No courses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center mt-4 space-x-2">
          {courses.links.map((link, index) => (
            <button
              key={index}
              disabled={!link.url}
              dangerouslySetInnerHTML={{ __html: link.label }}
              onClick={() => handlePagination(link.url)}
              className={`px-3 py-1 text-sm border rounded ${link.active
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
                className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md"
              >
                {/* Modal Header */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Degree Type
                    </label>
                    <select
                      value={form.data.degree_type}
                      onChange={(e) => form.setData('degree_type', e.target.value)}
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Degree Type</option>
                      {degreeTypes.map((type, index) => (
                        <option key={index} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Course Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Course Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., BSCS101"
                      value={form.data.code}
                      onChange={(e) => form.setData('code', e.target.value)}
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                    />
                    {form.errors.code && (
                      <p className="text-red-600 text-sm">{form.errors.code}</p>
                    )}
                  </div>

                  {/* Course Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Course Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Bachelor of Science in Computer Science"
                      value={form.data.name}
                      onChange={(e) => form.setData('name', e.target.value)}
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                    />
                    {form.errors.name && (
                      <p className="text-red-600 text-sm">{form.errors.name}</p>
                    )}
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={form.data.department_id}
                      onChange={(e) => form.setData('department_id', e.target.value)}
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    {form.errors.department_id && (
                      <p className="text-red-600 text-sm">{form.errors.department_id}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      placeholder="Enter a short description of the course"
                      value={form.data.description}
                      onChange={(e) => form.setData('description', e.target.value)}
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                    />
                    {form.errors.description && (
                      <p className="text-red-600 text-sm">{form.errors.description}</p>
                    )}
                  </div>

                  {/* Save Button */}
                  <button
                    type="submit"
                    disabled={form.processing}
                    className={`w-full text-white px-4 py-2 rounded-md transition ${form.processing ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
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
                className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Course Info</h2>
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

                <div className="space-y-2 text-sm text-gray-700">
                  {/* Status */}
                  <p>
                    <strong>Status:</strong>{' '}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${selectedCourse.status === 1
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
                  <div className="bg-gray-100 border border-gray-300 rounded p-3 text-sm text-gray-800 whitespace-pre-line">
                    {selectedCourse.description || '-'}
                  </div>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RegistrarLayout>
  );
}
