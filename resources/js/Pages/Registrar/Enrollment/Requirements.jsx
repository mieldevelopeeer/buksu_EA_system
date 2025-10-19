import { useForm, usePage } from "@inertiajs/react";
import { useState, useMemo, useEffect } from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import {
  Plus,
  X,
  MagnifyingGlass,
  PencilSimple,
  Eye,
  FileText,
} from "phosphor-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

export default function Requirements() {
  const { requirements, requiredForOptions } = usePage().props;

  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("");

  const form = useForm({
    name: "",
    description: "",
    required_for: "",
  });

  // 🔹 Modal Handlers
  const closeModal = () => {
    form.reset();
    setShowModal(false);
    setEditMode(false);
    setSelectedRequirement(null);
  };

  const openAddModal = () => {
    form.reset();
    setEditMode(false);
    setSelectedRequirement(null);
    setShowModal(true);
  };

  const openEditModal = (requirement) => {
    form.setData({
      name: requirement.name,
      description: requirement.description,
      required_for: requirement.required_for,
    });
    setEditMode(true);
    setSelectedRequirement(requirement);
    setShowModal(true);
  };

  const openViewModal = (requirement) => {
    setSelectedRequirement(requirement);
    setViewModal(true);
  };

  // 🔹 Submit
  const submit = (e) => {
    e.preventDefault();

    const successMessage = editMode
      ? "Requirement updated successfully!"
      : "Requirement added successfully!";
    const errorMessage = editMode
      ? "Failed to update requirement."
      : "Failed to add requirement.";

    const onSuccess = () => {
      Swal.fire({
        icon: "success",
        title: "Success",
        text: successMessage,
        timer: 1800,
        showConfirmButton: false,
      });
      closeModal();
    };

    const onError = () => {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
      });
    };

    if (editMode && selectedRequirement) {
      form.put(route("registrar.requirements.update", selectedRequirement.id), {
        onSuccess,
        onError,
      });
    } else {
      form.post(route("registrar.requirements.store"), {
        onSuccess,
        onError,
      });
    }
  };

  // 🔹 Filter + Group
  const groupedRequirements = useMemo(() => {
    const filtered = requirements.filter((req) =>
      `${req.name} ${req.description} ${req.required_for}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
    return filtered.reduce((acc, req) => {
      if (!acc[req.required_for]) acc[req.required_for] = [];
      acc[req.required_for].push(req);
      return acc;
    }, {});
  }, [requirements, searchTerm]);

  const categories = Object.keys(groupedRequirements);

  useEffect(() => {
    if (!activeTab && categories.length > 0) {
      setActiveTab(categories[0]);
    }
  }, [categories, activeTab]);

  return (
    <RegistrarLayout title="Requirements">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 font-sans text-xs md:text-sm text-slate-700 space-y-5">
        {/* 🔹 Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <FileText size={22} className="text-sky-500" />
            <div>
              <h1 className="text-sm font-semibold text-slate-800">Enrollment Requirements</h1>
              <p className="text-[11px] text-slate-500">Maintain requirement sets per applicant type.</p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative w-full sm:w-64">
              <MagnifyingGlass
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search requirement..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-600 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-500/90 px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-sky-500"
            >
              <Plus size={14} /> New Requirement
            </button>
          </div>
        </div>

        {/* 🔹 Tabs */}
        <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
          <div className="flex overflow-x-auto border-b border-slate-200/60 px-2 text-[11px]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-4 py-2.5 font-medium transition whitespace-nowrap ${
                  activeTab === cat
                    ? "border-b-2 border-sky-500 bg-sky-50 text-sky-600"
                    : "text-slate-500 hover:text-sky-600"
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* 🔹 Cards */}
          <div className="grid gap-4 px-4 py-5 md:grid-cols-2 lg:grid-cols-3">
            {groupedRequirements[activeTab]?.length > 0 ? (
              groupedRequirements[activeTab].map((req) => (
                <motion.div
                  key={req.id}
                  whileHover={{ y: -2 }}
                  className="rounded-lg border border-slate-200/70 bg-slate-50/60 p-4 shadow-[0_1px_4px_rgba(15,23,42,0.06)] transition hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
                >
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">{req.name}</h3>
                  <p className="line-clamp-3 text-[11px] text-slate-600">
                    {req.description || "No description provided."}
                  </p>
                  <span className="mt-3 inline-flex rounded-full border border-sky-200 bg-sky-100/70 px-2.5 py-0.5 text-[10px] font-medium text-sky-600">
                    {req.required_for}
                  </span>

                  <div className="mt-3 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => openEditModal(req)}
                      className="flex items-center gap-1 rounded-md border border-sky-200 bg-white px-3 py-1.5 text-[11px] font-medium text-sky-600 transition hover:bg-sky-50"
                    >
                      <PencilSimple size={14} /> Edit
                    </button>
                    <button
                      onClick={() => openViewModal(req)}
                      className="flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-50"
                    >
                      <Eye size={14} /> View
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                No requirements found for this category.
              </div>
            )}
          </div>
        </div>
      </div>
      {/* 🔹 Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
                className="w-full max-w-lg rounded-xl border border-slate-200/70 bg-white p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-sm font-semibold text-slate-800">
                  {editMode ? "Edit Requirement" : "Add Requirement"}
                </h2>
                <button
                  onClick={closeModal}
                  className="rounded-full border border-slate-200 p-1 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4 text-xs md:text-sm">
                {/* Name */}
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Requirement name"
                    value={form.data.name}
                    onChange={(e) => form.setData("name", e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">
                    Description
                  </label>
                  <textarea
                    placeholder="Requirement description"
                    value={form.data.description}
                    onChange={(e) =>
                      form.setData("description", e.target.value)
                    }
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                    rows="3"
                  ></textarea>
                </div>

                {/* Required For */}
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">
                    Required For
                  </label>
                  <select
                    value={form.data.required_for}
                    onChange={(e) =>
                      form.setData("required_for", e.target.value)
                    }
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="">-- Select Required For --</option>
                    {(requiredForOptions || []).map((option, idx) => (
                      <option key={idx} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {form.errors.required_for && (
                    <p className="mt-1 text-[11px] text-rose-500">
                      {form.errors.required_for}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={form.processing}
                  className={`w-full rounded-md px-4 py-2 text-sm font-medium text-white transition ${
                    form.processing
                      ? "bg-sky-400"
                      : "bg-sky-500 hover:bg-sky-600"
                  }`}
                >
                  {form.processing ? "Saving..." : "Save"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔹 View Modal */}
      <AnimatePresence>
        {viewModal && selectedRequirement && (
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
              className="w-full max-w-sm rounded-xl border border-slate-200/70 bg-white p-5 shadow-lg"
            >
              <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-sm font-semibold text-slate-800">
                  Requirement Info
                </h2>
                <button
                  onClick={() => {
                    setViewModal(false);
                    setSelectedRequirement(null);
                  }}
                  className="rounded-full border border-slate-200 p-1 text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2 text-xs md:text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-700">Name:</span> {selectedRequirement.name}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Description:</span> {selectedRequirement.description || "—"}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Required For:</span> {selectedRequirement.required_for}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </RegistrarLayout>
  );
}
