import React, { useState } from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { useForm, usePage, router } from "@inertiajs/react";
import { Plus, X, Eye, PencilSimple } from "phosphor-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

export default function Department() {
  const { departments } = usePage().props;
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const form = useForm({
    name: "",
    description: "",
  });

  const openAddModal = () => {
    form.reset();
    setEditMode(false);
    setSelectedDepartment(null);
    setShowModal(true);
  };

  const openEditModal = (department) => {
    form.setData({
      name: department.name,
      description: department.description || "",
    });
    setEditMode(true);
    setSelectedDepartment(department);
    setShowModal(true);
  };

  const openViewModal = (department) => {
    setSelectedDepartment(department);
    setViewModal(true);
  };

  const submit = (e) => {
    e.preventDefault();

    const successMessage = editMode
      ? "Department updated successfully!"
      : "Department added successfully!";
    const errorMessage = editMode
      ? "Failed to update department."
      : "Failed to add department.";

    const onSuccess = () => {
      Swal.fire({
        icon: "success",
        title: "Success",
        text: successMessage,
        timer: 2000,
        showConfirmButton: false,
      });
      setShowModal(false);
      setEditMode(false);
      setSelectedDepartment(null);
      form.reset();
    };

    const onError = () => {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
      });
    };

    if (editMode && selectedDepartment) {
      form.put(route("registrar.departments.update", selectedDepartment.id), {
        onSuccess,
        onError,
      });
    } else {
      form.post(route("registrar.departments.store"), {
        onSuccess,
        onError,
      });
    }
  };

  const handlePagination = (url) => {
    if (url) router.visit(url);
  };

  return (
    <RegistrarLayout>
      <div className="text-gray-800 px-6 py-4 font-poppins text-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold tracking-wide">
            Department List
          </h1>
          <button
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm text-xs transition"
          >
            <Plus size={16} /> Add
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow border">
          <table className="min-w-full text-xs">
            <thead className="bg-indigo-50 text-left uppercase text-gray-600">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">Department</th>
                <th className="p-2" hidden>Description</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {departments.data.map((dept, index) => (
                <tr
                  key={dept.id}
                  className="border-t hover:bg-gray-50 transition text-[13px]"
                >
                  <td className="p-2">{departments.from + index}</td>
                  <td className="p-2">{dept.name}</td>
                  <td className="p-2" hidden>
                    {dept.description || "No Description"}
                  </td>
                  <td className="p-2 flex gap-1.5">
                    <button
                      onClick={() => openEditModal(dept)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition"
                    >
                      <PencilSimple size={14} /> Edit
                    </button>
                    <button
                      onClick={() => openViewModal(dept)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition"
                    >
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
              {departments.data.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="text-center text-gray-500 p-4 text-xs"
                  >
                    No departments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center mt-3 space-x-1">
          {departments.links.map((link, index) => (
            <button
              key={index}
              disabled={!link.url}
              dangerouslySetInnerHTML={{ __html: link.label }}
              onClick={() => handlePagination(link.url)}
              className={`px-2.5 py-1 text-xs border rounded ${
                link.active
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              } ${!link.url ? "opacity-50 cursor-not-allowed" : ""}`}
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
                className="bg-white p-5 rounded-lg shadow-lg w-full max-w-sm"
              >
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-semibold">
                    {editMode ? "Edit Department" : "Add Department"}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-600 hover:text-red-600 transition"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={submit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      placeholder="eg., College of Engineering"
                      value={form.data.name}
                      onChange={(e) => form.setData("name", e.target.value)}
                      className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    {form.errors.name && (
                      <p className="text-red-600 text-xs">
                        {form.errors.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      placeholder="Short description"
                      value={form.data.description}
                      onChange={(e) =>
                        form.setData("description", e.target.value)
                      }
                      className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    {form.errors.description && (
                      <p className="text-red-600 text-xs">
                        {form.errors.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={form.processing}
                    className={`w-full text-white px-4 py-1.5 rounded-md text-sm transition ${
                      form.processing
                        ? "bg-indigo-400"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    {form.processing ? "Saving..." : "Save"}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Modal */}
        <AnimatePresence>
          {viewModal && selectedDepartment && (
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
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-semibold">Department Info</h2>
                  <button
                    onClick={() => {
                      setViewModal(false);
                      setSelectedDepartment(null);
                    }}
                    className="text-gray-600 hover:text-red-600 transition"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-2 text-gray-700">
                  <p>
                    <strong>Name:</strong> {selectedDepartment.name}
                  </p>
                  <p className="font-medium">Description:</p>
                  <div className="bg-gray-100 border rounded p-2 text-gray-800 whitespace-pre-line">
                    {selectedDepartment.description || "No Description"}
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
