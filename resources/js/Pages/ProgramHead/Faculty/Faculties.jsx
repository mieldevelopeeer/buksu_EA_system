import React, { useState } from "react";
import { usePage, useForm, router } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  PencilSimple,
  Trash,
  X,
  Eye,
  UsersThree,
  MagnifyingGlass,
} from "phosphor-react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import Swal from "sweetalert2";

export default function Faculties() {
  const { faculties = [] } = usePage().props;

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

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
 
});


 const handleSubmit = (e) => {
  e.preventDefault();

  post(route("program-head.faculties.store"), {
    onSuccess: () => {
      reset();
      setShowModal(false);

      // SweetAlert2 Toast
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end', // top-right corner
        showConfirmButton: false,
        timer: 3000, // disappears after 3 seconds
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
        },
      });

      Toast.fire({
        icon: 'success',
        title: 'Faculty profile added successfully',
      });
    },
  });
};


  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This will remove the faculty profile.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        router.delete(route("programhead.faculties.destroy", id));
      }
    });
  };

  const filteredFaculties = faculties.filter((f) =>
    `${f.fName} ${f.lName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProgramHeadLayout>
      <div className="p-4">
  {/* Header */}
  <div className="flex items-center justify-between mb-4">
    <h1 className="text-lg font-bold flex items-center gap-1">
      <UsersThree size={20} /> Faculty
    </h1>
    <button
      onClick={() => setShowModal(true)}
      className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-blue-700 transition text-xs"
    >
      <Plus size={16} /> Add Faculty
    </button>
  </div>

  {/* Search */}
  <div className="flex items-center gap-2 mb-3">
    <MagnifyingGlass size={16} className="text-gray-500" />
    <input
      type="text"
      placeholder="Search faculty..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="w-56 border rounded-md px-2 py-1 text-xs"
    />
  </div>

  {/* Table */}
  <div className="overflow-x-auto bg-white rounded-xl shadow">
    <table className="min-w-full text-xs">
      <thead className="bg-gray-100 text-gray-700">
        <tr>
          <th className="px-3 py-2 text-left">ID No.</th>
          <th className="px-3 py-2 text-left">Name</th>
          <th className="px-3 py-2 text-left">Contact</th>
          <th className="px-3 py-2 text-left">Email</th>
          <th className="px-3 py-2 text-left">Profession</th>
          <th className="px-3 py-2 text-left">Gender</th>
          <th className="px-3 py-2 text-center">Actions</th>
        </tr>
      </thead>
      <tbody>
        {filteredFaculties.length > 0 ? (
          filteredFaculties.map((faculty) => (
            <tr key={faculty.id} className="border-t">
            <td className="px-3 py-2">{faculty.id_number}</td>
              <td className="px-3 py-2">
                {faculty.fName} {faculty.mName} {faculty.lName}
              </td>
              <td className="px-3 py-2">{faculty.contact}</td>
              <td className="px-3 py-2">{faculty.email}</td>
              <td className="px-3 py-2">{faculty.profession}</td>
              <td className="px-3 py-2">{faculty.gender}</td>
              <td className="px-3 py-2 text-center flex justify-center gap-2">
                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition">
                  <PencilSimple size={16} /> Edit
                </button>
                <button
                  onClick={() => openViewModal(reg)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition"
                >
                  <Eye size={14} /> View
                </button>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="6" className="text-center text-gray-500 py-4 italic text-xs">
              No faculty profiles found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>


        {/* Add Faculty Modal */}
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
                className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative"
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                >
                  <X size={22} />
                </button>

                <h2 className="text-xl font-bold mb-4">Add Faculty</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
               {/* ID Number */}
<div className="mb-2">
  <label className="block text-sm font-medium mb-1">ID Number</label>
  <input
    type="text"
    value={data.id_number}
    onChange={(e) => setData("id_number", e.target.value)}
    className="border rounded-lg px-3 py-2 text-sm w-full"
    required
  />
</div>

{/* Names + Suffix */}
<div className="grid grid-cols-12 gap-3 mb-2">
  {/* First Name */}
  <div className="col-span-3">
    <label className="block text-sm font-medium mb-1">First Name</label>
    <input
      type="text"
      value={data.fName}
      onChange={(e) => setData("fName", e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm w-full"
      required
    />
  </div>

  {/* Middle Name */}
  <div className="col-span-3">
    <label className="block text-sm font-medium mb-1">Middle Name</label>
    <input
      type="text"
      value={data.mName}
      onChange={(e) => setData("mName", e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm w-full"
    />
  </div>

  {/* Last Name */}
  <div className="col-span-4">
    <label className="block text-sm font-medium mb-1">Last Name</label>
    <input
      type="text"
      value={data.lName}
      onChange={(e) => setData("lName", e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm w-full"
      required
    />
  </div>

  {/* Suffix */}
  <div className="col-span-2">
    <label className="block text-sm font-medium mb-1">Suffix</label>
    <select
      value={data.suffix}
      onChange={(e) => setData("suffix", e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm w-full"
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

{/* Contact & Email */}
<div className="grid grid-cols-2 gap-3 mb-2">
  <div>
    <label className="block text-sm font-medium mb-1">Contact No.</label>
    <input
      type="text"
      value={data.contact}
      onChange={(e) => setData("contact", e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm w-full"
    />
  </div>
  <div>
    <label className="block text-sm font-medium mb-1">Email</label>
    <input
      type="email"
      value={data.email}
      onChange={(e) => setData("email", e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm w-full"
    />
  </div>
</div>

{/* Address */}
<div className="mb-2">
  <label className="block text-sm font-medium mb-1">Address</label>
  <input
    type="text"
    value={data.address}
    onChange={(e) => setData("address", e.target.value)}
    className="w-full border rounded-lg px-3 py-2 text-sm"
  />
</div>

{/* Profession */}
<div className="mb-2">
  <label className="block text-sm font-medium mb-1">Profession</label>
  <input
    type="text"
    value={data.profession}
    onChange={(e) => setData("profession", e.target.value)}
    className="w-full border rounded-lg px-3 py-2 text-sm"
  />
</div>

{/* Gender */}
<div className="mb-2">
  <label className="block text-sm font-medium mb-1">Gender</label>
  <select
    value={data.gender}
    onChange={(e) => setData("gender", e.target.value)}
    className="w-full border rounded-lg px-3 py-2 text-sm"
  >
    <option value="">Select Gender</option>
    <option value="Male">Male</option>
    <option value="Female">Female</option>
    <option value="Other">Other</option>
  </select>
</div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processing}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
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
    </ProgramHeadLayout>
  );
}
