import React, { useState } from "react";
import { usePage, useForm, router } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  UsersThree,
  MagnifyingGlass,
  IdentificationCard,
  Heart,
  User,
} from "phosphor-react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import Swal from "sweetalert2";

export default function Faculties() {
  const { faculties = [], departments = [] } = usePage().props;

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const { data, setData, post, reset, processing } = useForm({
    fName: "",
    mName: "",
    lName: "",
    suffix: "",
    id_number: "",
    contact: "",
    address: "",
    profession: "",
    gender: "",
    email: "",
    department_id: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    post(route("program-head.faculties.store"), {
      onSuccess: () => {
        reset();
        setShowModal(false);

        Swal.fire({
          toast: true,
          icon: "success",
          title: "Faculty profile added successfully",
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
      },
    });
  };

  const filteredFaculties = faculties.filter((f) => {
    const fullName = `${f.fName} ${f.mName ?? ""} ${f.lName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(search.toLowerCase()) ||
      (f.profession || "").toLowerCase().includes(search.toLowerCase()) ||
      (f.id_number || "").toLowerCase().includes(search.toLowerCase());

    const matchesGender = !genderFilter || (f.gender || "").toLowerCase() === genderFilter.toLowerCase();

    return matchesSearch && matchesGender;
  });

  const getDepartmentName = (faculty) => {
    if (faculty.department?.name) return faculty.department.name;
    const deptId = faculty.department_id ?? faculty.departmentId;
    if (!deptId) return "—";
    const match = departments.find((dept) => String(dept.id) === String(deptId));
    return match?.name || "—";
  };

  const getInitials = (faculty) => {
    const first = faculty?.fName?.[0] ?? "?";
    const last = faculty?.lName?.[0] ?? "";
    return `${first}${last}`.toUpperCase();
  };

  const handleCardClick = (faculty) => {
    router.visit(route("program-head.faculties.show", faculty.id));
  };

  const resolvePhoto = (faculty) => {
    const raw = faculty?.profile_picture;
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("/")) return raw;
    return `/storage/${raw}`;
  };

  const buildBio = (faculty) => {
    const dept = getDepartmentName(faculty);
    const profession = faculty.profession || "Faculty";
    const address = faculty.address ? `Based in ${faculty.address}.` : "";
    return `${profession} at ${dept}. ${address}`.trim();
  };

  const getCardMetrics = (faculty) => {
    return [
      {
        label: "ID Number",
        value: faculty.id_number || "—",
        Icon: IdentificationCard,
      },
      {
        label: "Gender",
        value: faculty.gender || "—",
        Icon: Heart,
      },
      {
        label: "Status",
        value: (faculty.status || "Inactive").replace(/_/g, " "),
        Icon: User,
      },
    ];
  };

  const totalPages = Math.max(1, Math.ceil(filteredFaculties.length / pageSize));
  const paginatedFaculties = filteredFaculties.slice((page - 1) * pageSize, page * pageSize);

  const goToPage = (target) => {
    if (target < 1 || target > totalPages) return;
    setPage(target);
  };

  return (
    <ProgramHeadLayout>
      <div className="min-h-screen bg-white px-6 py-6 text-gray-800 text-xs font-[Poppins] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded bg-blue-600" />
            <h1 className="text-base font-semibold text-gray-800">Faculty Profiles</h1>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-md pl-8 pr-2 py-1.5 text-[11px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <MagnifyingGlass
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Gender</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value="">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Profession</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by profession"
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {paginatedFaculties.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {paginatedFaculties.map((faculty) => {
              const photo = resolvePhoto(faculty);
              const metrics = getCardMetrics(faculty);
              return (
                <button
                  key={faculty.id}
                  type="button"
                  onClick={() => handleCardClick(faculty)}
                  className="relative overflow-hidden rounded-2xl bg-white/95 p-3 text-left shadow-[0_8px_20px_rgba(37,99,235,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(37,99,235,0.16)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-16 w-16 flex-shrink-0">
                      {photo ? (
                        <img
                          src={photo}
                          alt={`${faculty.fName} ${faculty.lName}`}
                          className="h-full w-full rounded-xl border-2 border-white object-cover shadow"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-xl border-2 border-white bg-gradient-to-br from-sky-200 to-blue-200 text-base font-semibold text-blue-700 shadow">
                          {getInitials(faculty)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">
                          {faculty.fName} {faculty.mName ? `${faculty.mName} ` : ""}
                          {faculty.lName}
                        </h3>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-600">
                          ID #{faculty.id_number || "N/A"}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-medium text-blue-600">
                        {faculty.profession || "Faculty"}
                      </p>
                      <p className="text-[11px] text-slate-500">{faculty.email || "No email provided"}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                        faculty.status === "active"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-blue-50 text-slate-500"
                      }`}
                    >
                      {faculty.status === "active" ? "Active" : "Inactive"}
                    </span>
                    <span className="inline-flex rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1 text-[10px] font-semibold text-white shadow">
                      View Profile
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
            <UsersThree size={48} className="text-gray-300 mb-2" />
            <span className="text-sm font-medium">No faculty found</span>
          </div>
        )}

        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="rounded-lg bg-gradient-to-b from-white via-gray-50 to-gray-100 p-5 shadow-lg w-full max-w-sm relative"
              >
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                >
                  <X size={22} />
                </button>

                <h2 className="text-base font-semibold mb-3">Add Faculty</h2>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-gray-600">ID Number</label>
                    <input
                      type="text"
                      value={data.id_number}
                      onChange={(e) => setData("id_number", e.target.value)}
                      placeholder="e.g., 2024-001"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-gray-600">First Name</label>
                      <input
                        type="text"
                        value={data.fName}
                        onChange={(e) => setData("fName", e.target.value)}
                        placeholder="e.g., Juan"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-gray-600">Middle Name</label>
                      <input
                        type="text"
                        value={data.mName}
                        onChange={(e) => setData("mName", e.target.value)}
                        placeholder="Optional"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-gray-600">Last Name</label>
                      <input
                        type="text"
                        value={data.lName}
                        onChange={(e) => setData("lName", e.target.value)}
                        placeholder="e.g., Dela Cruz"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-gray-600">Suffix</label>
                      <select
                        value={data.suffix}
                        onChange={(e) => setData("suffix", e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="">None</option>
                        <option value="Jr.">Jr.</option>
                        <option value="Sr.">Sr.</option>
                        <option value="I">I</option>
                        <option value="II">II</option>
                        <option value="III">III</option>
                        <option value="IV">IV</option>
                        <option value="V">V</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-gray-600">Contact No.</label>
                      <input
                        type="text"
                        value={data.contact}
                        onChange={(e) => setData("contact", e.target.value)}
                        placeholder="e.g., 09171234567"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-gray-600">Email</label>
                      <input
                        type="email"
                        value={data.email}
                        onChange={(e) => setData("email", e.target.value)}
                        placeholder="e.g., juan@email.com"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-gray-600">Address</label>
                    <input
                      type="text"
                      value={data.address}
                      onChange={(e) => setData("address", e.target.value)}
                      placeholder="House no., Street, City"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-gray-600">Profession</label>
                      <input
                        type="text"
                        value={data.profession}
                        onChange={(e) => setData("profession", e.target.value)}
                        placeholder="e.g., Instructor"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-gray-600">Department</label>
                      <select
                        value={data.department_id}
                        onChange={(e) => setData("department_id", e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={String(dept.id)}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-gray-600">Gender</label>
                      <select
                        value={data.gender}
                        onChange={(e) => setData("gender", e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 mt-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-3.5 py-1.5 rounded-lg border text-gray-600 text-xs hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700"
                    >
                      {processing ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {filteredFaculties.length > 0 && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-blue-100 bg-white/70 px-4 py-2 text-[11px] text-slate-600">
          <span>
            Showing {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, filteredFaculties.length)} of {filteredFaculties.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="rounded-full border border-blue-200 px-3 py-1 text-[10px] font-semibold text-blue-600 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-[10px] font-medium text-slate-500">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="rounded-full border border-blue-200 px-3 py-1 text-[10px] font-semibold text-blue-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </ProgramHeadLayout>
  );
}
