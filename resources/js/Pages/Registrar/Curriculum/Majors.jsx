import React, { useState, useEffect } from "react";
import { usePage, useForm } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  PencilSimple,
  Eye,
  XCircle,
  CheckCircle,
  Trash,
  ArrowLeft,
  GraduationCap,
  X,
} from "phosphor-react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import Swal from "sweetalert2";

export default function Majors() {
  const { majors = [], course } = usePage().props;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState(null);

  const form = useForm({
    name: "",
    code: "",
    description: "",
  });

  // ✅ Backspace shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === "Backspace" &&
        e.target.tagName !== "INPUT" &&
        e.target.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        window.history.back();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /// ✅ Submit Add Major
  const handleSubmit = (e) => {
    e.preventDefault();
    form.post(route("registrar.courses.majors.store", course.id), {
      onSuccess: () => {
        setShowAddModal(false);
        form.reset();
        Swal.fire("Success", "Major added successfully!", "success");
      },
    });
  };

  /// ✅ Submit Edit Major (no need for courseId anymore)
  const handleUpdate = (e) => {
    e.preventDefault();

   form.put(
  route("registrar.courses.majors.update", {
    courseId: selectedMajor.courses_id, // ✅ pass courseId from the major
    majorId: selectedMajor.id,          // ✅ pass majorId
  }),
  {
    onSuccess: () => {
      setShowEditModal(false);
      form.reset();
      Swal.fire("Updated", "Major updated successfully!", "success");
    },
  }
);
  };

  return (
    <RegistrarLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft size={20} /> Back
            </button>

            {/* Course Info */}
            <div className="flex items-center gap-2 text-gray-700">
              <GraduationCap size={22} className="text-indigo-600" />
              <span className="font-semibold text-lg">
                {course?.code} – {course?.name}
              </span>
            </div>
          </div>

          {/* Add Major */}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow transition text-[11px]"
          >
            <Plus size={16} /> Add Major
          </button>
        </div>

        {/* Majors List */}
        <div className="space-y-4">
          {majors.length > 0 ? (
            majors.map((major, index) => (
              <motion.div
                key={major.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between bg-white shadow-md rounded-xl p-4 border hover:shadow-lg transition"
              >
                {/* Major Info */}
                <div>
                  <h2 className="font-semibold text-gray-800 text-lg">
                    {major.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Code: {major.code} • {major.description || "No description"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedMajor(major);
                      form.setData({
                        name: major.name,
                        code: major.code,
                        description: major.description,
                      });
                      setShowEditModal(true);
                    }}
                    className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                    title="Edit"
                  >
                    <PencilSimple size={18} />
                  </button>

                  <button
                    onClick={() => {
                      setSelectedMajor(major);
                      setShowViewModal(true);
                    }}
                    className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                    title="View"
                  >
                    <Eye size={18} />
                  </button>

                  <button
                    onClick={() => console.log("Toggle status", major.id)}
                    className={`p-2 rounded-lg transition ${
                      major.status === 1
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-green-100 text-green-600 hover:bg-green-200"
                    }`}
                    title={major.status === 1 ? "Deactivate" : "Activate"}
                  >
                    {major.status === 1 ? (
                      <XCircle size={18} />
                    ) : (
                      <CheckCircle size={18} />
                    )}
                  </button>

                 
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border">
              No majors added yet.  
              <br />
              <span className="text-sm">Click “Add Major” to create one.</span>
            </div>
          )}
        </div>
      </div>

      {/* ➕ Add Major Modal */}
      <AnimatePresence>
        {showAddModal && (
          <ModalWrapper onClose={() => setShowAddModal(false)}>
            {(close) => (
              <div className="text-xs">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-semibold">
                    Add Major for {course?.code}
                  </h2>
                  <button
                    onClick={close}
                    className="text-gray-600 hover:text-red-600 transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Major Name
                    </label>
                    <input
                      type="text"
                      value={form.data.name}
                      onChange={(e) => form.setData("name", e.target.value)}
                      placeholder="e.g., Software Development"
                      className="w-full border rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 text-[11px] placeholder:text-[11px]"
                    />
                    {form.errors.name && (
                      <p className="text-red-600 text-[11px] mt-1">{form.errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Major Code
                    </label>
                    <input
                      type="text"
                      value={form.data.code}
                      onChange={(e) => form.setData("code", e.target.value)}
                      placeholder="e.g., SD-101"
                      className="w-full border rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 text-[11px] placeholder:text-[11px]"
                    />
                    {form.errors.code && (
                      <p className="text-red-600 text-[11px] mt-1">{form.errors.code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Description
                    </label>
                    <textarea
                      value={form.data.description}
                      onChange={(e) => form.setData("description", e.target.value)}
                      placeholder="Enter a short description"
                      rows={3}
                      className="w-full border rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 text-[11px] placeholder:text-[11px]"
                    />
                    {form.errors.description && (
                      <p className="text-red-600 text-[11px] mt-1">{form.errors.description}</p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={close}
                      className="px-3 py-1.5 rounded-md border text-[11px] text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={form.processing}
                      className={`px-3 py-1.5 rounded-md text-white text-[11px] transition ${
                        form.processing
                          ? "bg-blue-400"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {form.processing ? "Saving..." : "Save Major"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </ModalWrapper>
        )}
      </AnimatePresence>

      {/* ✏️ Edit Major Modal */}
      <AnimatePresence>
        {showEditModal && (
          <ModalWrapper onClose={() => setShowEditModal(false)}>
            {(close) => (
              <div className="text-xs">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-semibold">
                    Edit Major – {selectedMajor?.name}
                  </h2>
                  <button
                    onClick={close}
                    className="text-gray-600 hover:text-red-600 transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Major Name
                    </label>
                    <input
                      type="text"
                      value={form.data.name}
                      onChange={(e) => form.setData("name", e.target.value)}
                      placeholder="e.g., Software Development"
                      className="w-full border rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 text-[11px] placeholder:text-[11px]"
                    />
                    {form.errors.name && (
                      <p className="text-red-600 text-[11px] mt-1">{form.errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Major Code
                    </label>
                    <input
                      type="text"
                      value={form.data.code}
                      onChange={(e) => form.setData("code", e.target.value)}
                      placeholder="e.g., SD-101"
                      className="w-full border rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 text-[11px] placeholder:text-[11px]"
                    />
                    {form.errors.code && (
                      <p className="text-red-600 text-[11px] mt-1">{form.errors.code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Description
                    </label>
                    <textarea
                      value={form.data.description}
                      onChange={(e) => form.setData("description", e.target.value)}
                      placeholder="Enter a short description"
                      rows={3}
                      className="w-full border rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 text-[11px] placeholder:text-[11px]"
                    />
                    {form.errors.description && (
                      <p className="text-red-600 text-[11px] mt-1">{form.errors.description}</p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={close}
                      className="px-3 py-1.5 rounded-md border text-[11px] text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={form.processing}
                      className={`px-3 py-1.5 rounded-md text-white text-[11px] transition ${
                        form.processing
                          ? "bg-blue-400"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {form.processing ? "Saving..." : "Update Major"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </ModalWrapper>
        )}
      </AnimatePresence>

      {/* 👁 View Major Modal */}
      <AnimatePresence>
        {showViewModal && (
          <ModalWrapper onClose={() => setShowViewModal(false)}>
            {(close) => (
              <div className="text-xs">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-semibold">{selectedMajor?.name}</h2>
                  <button
                    onClick={close}
                    className="text-gray-600 hover:text-red-600 transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-2 text-gray-700">
                  <p>
                    <strong>Code:</strong> {selectedMajor?.code || "-"}
                  </p>
                  <p>
                    <strong>Description:</strong>{" "}
                    {selectedMajor?.description || "No description provided"}
                  </p>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={close}
                    className="px-3 py-1.5 rounded-md border text-[11px] text-gray-600 hover:bg-gray-100"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </ModalWrapper>
        )}
      </AnimatePresence>
    </RegistrarLayout>
  );
}

/* ✅ Reusable modal wrapper */
/* ✅ Reusable modal wrapper with blur + animate bg */
function ModalWrapper({ children, onClose }) {
  const content = typeof children === 'function' ? children(onClose) : children;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-50"
    >
      {/* Background Blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose} // ✅ Close when clicking outside
      />

      {/* Modal Content */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5"
      >
        {content}
      </motion.div>
    </motion.div>
  );
}


/* ✅ Reusable input field */
function InputField({ label, value, onChange }) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="w-full border rounded-lg px-3 pt-5 pb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
      />
      <label className="absolute left-3 top-2 text-xs text-gray-500">
        {label}
      </label>
    </div>
  );
}

/* ✅ Reusable textarea field */
function TextareaField({ label, value, onChange }) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={onChange}
        rows="3"
        className="w-full border rounded-lg px-3 pt-5 pb-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
      />
      <label className="absolute left-3 top-2 text-xs text-gray-500">
        {label}
      </label>
    </div>
  );
}

/* ✅ Reusable action buttons */
function ActionButtons({ onCancel, processing, label }) {
  return (
    <div className="flex justify-end gap-3 mt-6">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={processing}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
      >
        {processing ? "Saving..." : label}
      </button>
    </div>
  );
}
