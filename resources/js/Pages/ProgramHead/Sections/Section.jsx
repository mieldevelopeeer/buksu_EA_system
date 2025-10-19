import React, { useState, useEffect } from "react";
import { useForm, usePage, Link, router } from "@inertiajs/react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import {
  Plus,
  PencilSimple,
  X,
  SpinnerGap,
  Notebook,
  UsersThree,
  MagnifyingGlass,
} from "phosphor-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

function StatusToggle({ section }) {
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
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="w-4 h-4 bg-white rounded-full shadow-sm"
        style={{ x: section.status ? 20 : 0 }}
      />
    </div>
  );
}


export default function Section() {
  const {
    sections = { data: [], links: [] },
    yearLevels = [],
  } = usePage().props;

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
const { auth } = usePage().props; 
  const form = useForm({
    section: "",
    year_level_id: "",
    student_limit: "",
    status: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1200,
    timerProgressBar: true,
  });

  const openAddModal = () => {
    form.reset();
    setEditMode(false);
    setSelectedSection(null);
    setShowModal(true);
  };

  const openEditModal = (section) => {
    form.setData({
      section: section.section,
      year_level_id: section.year_level_id,
      student_limit: section.student_limit || "",
      status: section.status ? 1 : 0,
    });
    setSelectedSection(section);
    setEditMode(true);
    setShowModal(true);
  };

  const submit = (e) => {
    e.preventDefault();

    const onSuccess = () => {
      Toast.fire({
        icon: "success",
        title: editMode ? "Section updated!" : "Section added!",
      });
      setShowModal(false);
      setEditMode(false);
      setSelectedSection(null);
      form.reset();
    };

    const onError = () => {
      Toast.fire({
        icon: "error",
        title: "Something went wrong.",
      });
    };

    if (editMode && selectedSection) {
      form.put(route("program-head.sections.update", selectedSection.id), {
        onSuccess,
        onError,
      });
    } else {
      form.post(route("program-head.sections.store"), { onSuccess, onError });
    }
  };

  const filteredSections = sections.data.filter(
    (s) =>
      s.section.toLowerCase().includes(search.toLowerCase()) ||
      (s.year_level?.year_level || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProgramHeadLayout>
      <div className="text-gray-800 font-[Poppins] px-6 py-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
          <h1 className="text-2xl font-semibold">Sections</h1>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search sections..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
              <MagnifyingGlass
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            {/* Add Button */}
            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 transition"
            >
              <Plus size={18} />
              Add Section
            </button>
          </div>
        </div>

        {/* Grouped Sections */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 text-gray-500">
            <SpinnerGap size={40} className="animate-spin text-blue-600 mb-2" />
            <span className="text-sm">Loading sections...</span>
          </div>
        ) : (
          <div className="space-y-10">
            {yearLevels.map((yl) => {
              const yearSections = filteredSections.filter(
                (s) => s.year_level && s.year_level.id === yl.id
              );

              if (yearSections.length === 0) return null;

              return (
                <div key={yl.id}>
                  {/* Year Level Title */}
                  <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <span className="w-2 h-6 rounded-full bg-gradient-to-b from-blue-500 to-blue-700"></span>
                    {yl.year_level}
                  </h2>

                  {/* File Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {yearSections.map((section, idx) => (
                      <div
                        key={section.id}
                        className={`group relative flex flex-col items-center justify-center rounded-xl p-5 shadow-sm cursor-pointer border
                          bg-white
                          hover:shadow-xl hover:-translate-y-1.5 transition duration-300 ease-in-out
                          ${
                            idx % 3 === 0
                              ? "border-blue-200 hover:border-blue-400"
                              : idx % 3 === 1
                              ? "border-green-200 hover:border-green-400"
                              : "border-purple-200 hover:border-purple-400"
                          }`}
                      >
                        {/* File Icon */}
                        <div
                          className={`rounded-xl p-4 mb-3 transition-all duration-300 shadow-sm
                            ${
                              idx % 3 === 0
                                ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 group-hover:from-blue-100 group-hover:to-blue-200"
                                : idx % 3 === 1
                                ? "bg-gradient-to-br from-green-50 to-green-100 text-green-600 group-hover:from-green-100 group-hover:to-green-200"
                                : "bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 group-hover:from-purple-100 group-hover:to-purple-200"
                            }`}
                        >
                          <Notebook size={30} />
                        </div>

                        {/* Section Name */}
                        <p className="text-gray-900 font-semibold text-sm text-center truncate w-full group-hover:text-blue-700">
                          {section.section}
                        </p>

                        {/* Student Limit */}
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <UsersThree size={14} /> Limit:{" "}
                          {section.student_limit !== null
                            ? section.student_limit
                            : "N/A"}
                        </p>

{/* Status + Toggle */}
<div className="mt-3 flex items-center justify-between w-full">
  <span
    className={`flex items-center text-xs font-medium ${
      section.status ? "text-green-600" : "text-red-600"
    }`}
  >
    <span
      className={`w-2 h-2 rounded-full mr-1.5 ${
        section.status ? "bg-green-500" : "bg-red-500"
      }`}
    />
    {section.status ? "Open" : "Closed"}
  </span>
  <StatusToggle section={section} />
</div>
      

                        {/* Edit button */}
                        <button
                          onClick={() => openEditModal(section)}
                          className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-700 hover:text-blue-600 rounded-full p-1.5 shadow transition"
                        >
                          <PencilSimple size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {sections.links.length > 1 && (
          <div className="flex justify-center p-4">
            <nav className="flex gap-1">
              {sections.links.map((link, index) => (
                <Link
                  key={index}
                  href={link.url || "#"}
                  className={`px-3 py-1 border rounded text-sm ${
                    link.active
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                />
              ))}
            </nav>
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    {editMode ? "Edit Section" : "Add Section"}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-600 hover:text-red-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  {/* Section Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Section Name
                    </label>
                    <input
                      type="text"
                      value={form.data.section}
                      onChange={(e) => form.setData("section", e.target.value)}
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    {form.errors.section && (
                      <p className="text-red-600 text-sm">
                        {form.errors.section}
                      </p>
                    )}
                  </div>

                  {/* Year Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year Level
                    </label>
                    <select
                      value={form.data.year_level_id}
                      onChange={(e) =>
                        form.setData("year_level_id", e.target.value)
                      }
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
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
                      <p className="text-red-600 text-sm">
                        {form.errors.year_level_id}
                      </p>
                    )}
                  </div>

                  {/* Student Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.data.student_limit}
                      onChange={(e) =>
                        form.setData("student_limit", e.target.value)
                      }
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    {form.errors.student_limit && (
                      <p className="text-red-600 text-sm">
                        {form.errors.student_limit}
                      </p>
                    )}
                  </div>

                  {/* Save Button */}
                  <button
                    type="submit"
                    disabled={form.processing}
                    className={`w-full text-white px-4 py-2 rounded-md transition ${
                      form.processing
                        ? "bg-blue-400"
                        : "bg-blue-600 hover:bg-blue-700"
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
    </ProgramHeadLayout>
  );
}
