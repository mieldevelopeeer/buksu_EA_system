// resources/js/Pages/Admin/Users/Faculties.jsx
import React, { useState ,useEffect } from "react";
import { usePage, useForm, router } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  PencilSimple,
  X,
  Eye,
  UsersThree,
  MagnifyingGlass,
  EnvelopeSimple,
  UserPlus,
   Key,
} from "phosphor-react";
import AdminLayout from "@/Layouts/AdminLayout";
import Swal from "sweetalert2";

export default function Faculty() {
  const { faculties = [] } = usePage().props;

  const [showModal, setShowModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [search, setSearch] = useState("");

const { data, setData, post, reset, processing } = useForm({
  id_number: "",
  fName: "",
  mName: "",
  lName: "",
  username: "",
  email: "",
  password: "",             // 🔑 for backend bcrypt()
  generated_password: "",   // 🔑 optional, if you want to also store plain version
});



/////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////
const handleSubmit = (e) => {
  e.preventDefault();

  Swal.fire({
    title: "Processing...",
    text: selectedFaculty ? "Updating faculty..." : "Creating faculty...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  // Configure a toast
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  if (selectedFaculty) {
    // Edit mode → PUT request
    router.put(
      route("admin.faculties.update", selectedFaculty.id),
      data,
      {
        preserveScroll: true,
        onSuccess: (page) => {
          Swal.close();
          Toast.fire({
            icon: "success",
            title: page.props.flash?.success || "Faculty updated successfully",
          });
          setShowModal(false);
          setSelectedFaculty(null);
          reset();
        },
        onError: (errors) => {
          Swal.close();
          const firstError =
            Object.values(errors)[0] || "Please check the form and try again.";
          Toast.fire({
            icon: "error",
            title: firstError,
          });
        },
      }
    );
  } else {
    // Create mode → POST request
    post(route("admin.faculties.store"), {
      preserveScroll: true,
      onSuccess: (page) => {
        Swal.close();
        if (page.props.flash?.success) {
          Toast.fire({
            icon: "success",
            title: page.props.flash.success,
          });
          setShowModal(false);
          reset();
        } else if (page.props.flash?.error) {
          Toast.fire({
            icon: "warning",
            title: page.props.flash.error,
          });
        }
      },
      onError: (errors) => {
        Swal.close();
        const firstError =
          Object.values(errors)[0] || "Please check the form and try again.";
        Toast.fire({
          icon: "error",
          title: firstError,
        });
      },
    });
  }
};

//////////////////////////////////////////////////////////////////////////////////////


const openModal = (faculty = null) => {
  if (faculty) {
    // Editing existing faculty
    setSelectedFaculty(faculty);
    setData({
      id_number: faculty.id_number || "",
      fName: faculty.fName || "",
      mName: faculty.mName || "",
      lName: faculty.lName || "",
      username: faculty.username || "",
      email: faculty.email || "",
    });
  } else {
    // Creating new faculty
    reset();
    setSelectedFaculty(null);
  }
  setShowModal(true);
};

////////////////////////////////////////////////////////////////////////////////////////

  // ✅ Send Email
  const handleSendEmail = (faculty) => {
    Swal.fire({
      title: "Send Email?",
      text: `Do you want to send login credentials to ${faculty.fName} ${faculty.lName}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, send it!",
    }).then((result) => {
      if (result.isConfirmed) {
        router.post(
          route("admin.faculties.sendEmail", faculty.id),
          {},
          {
            onSuccess: () => {
              Swal.fire("Sent!", "Email has been sent successfully.", "success");
            },
          }
        );
      }
    });
  };

  const filteredFaculties = faculties.filter((f) =>
    `${f.fName} ${f.lName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-lg font-bold flex items-center gap-1">
            <UsersThree size={20} /> Faculty Accounts
          </h1>
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

        {/* Faculty Table */}
        <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
          {filteredFaculties.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left text-gray-700">
                <thead className="bg-gray-50 text-gray-600 uppercase tracking-wide text-[11px]">
                  <tr>
                    <th className="px-4 py-3">ID Number</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Generated Password</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredFaculties.map((faculty) => (
                    <tr
                      key={faculty.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">{faculty.id_number || "-"}</td>
                      <td className="px-4 py-3">
                        {faculty.fName} {faculty.mName} {faculty.lName}
                      </td>
                      <td className="px-4 py-3">{faculty.username || "-"}</td>
                      <td className="px-4 py-3 font-mono text-blue-600">
                        {faculty.generated_password || "-"}
                      </td>
                      <td className="px-4 py-3">{faculty.email || "-"}</td>
                      <td className="px-4 py-3 flex items-center justify-center gap-2">
                       {/* Create Button */}
<button
  onClick={() => {
    if (faculty.username || faculty.generated_password) {
      // Account already exists → show toast
      Swal.fire({
        icon: "warning",
        title: "Account Exists",
        text: "This faculty already has an account.",
        confirmButtonColor: "#2563eb",
      });
      return; // Prevent opening modal
    }

    // Otherwise, open modal to create new account
    setSelectedFaculty(null); // important: null → create mode
    setData({
      id_number: faculty.id_number || "",
      fName: faculty.fName || "",
      mName: faculty.mName || "",
      lName: faculty.lName || "",
      username: "",
      email: faculty.email || "",
      generated_password: "",
    });
    setShowModal(true);
  }}
  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium 
    bg-blue-600 bg-opacity-90 text-white 
    hover:bg-blue-700 hover:bg-opacity-100 
    transition mx-auto
    ${faculty.username || faculty.generated_password ? "opacity-50 cursor-not-allowed" : ""}`}
  disabled={faculty.username || faculty.generated_password} // disable button if account exists
>
  <UserPlus size={14} /> Create
</button>


                        <button
  onClick={() => openModal(faculty)}
  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition"
>
  <PencilSimple size={16} />
  Edit
</button>

                        <button
                          onClick={() => console.log("View faculty", faculty.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                        >
                          <Eye size={14} />
                          View
                        </button>
                        <button
                          onClick={() => handleSendEmail(faculty)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition"
                        >
                          <EnvelopeSimple size={14} />
                          Email
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-4 text-gray-500 text-sm">No faculty accounts found.</p>
          )}
        </div>
{/* Create/Edit Faculty Modal */}
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
          onClick={() => {
            setShowModal(false);
            setSelectedFaculty(null);
          }}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X size={22} />
        </button>

        {/* Modal Title */}
        <h2 className="text-xl font-bold mb-4">
          {selectedFaculty ? "Edit Faculty Account" : "Create Faculty Account"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ID Number */}
          <div>
            <label className="block text-sm font-medium mb-1">ID Number</label>
            <input
              type="text"
              value={data.id_number}
              disabled
              className="border rounded-lg px-3 py-2 text-sm w-full bg-gray-100 cursor-not-allowed"
            />
          </div>

          {/* Names */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                type="text"
                value={data.fName}
                disabled
                className="border rounded-lg px-3 py-2 text-sm w-full bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Middle Name</label>
              <input
                type="text"
                value={data.mName}
                disabled
                className="border rounded-lg px-3 py-2 text-sm w-full bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                type="text"
                value={data.lName}
                disabled
                className="border rounded-lg px-3 py-2 text-sm w-full bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => setData("email", e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full"
              required
            />
          </div>

        {/* Username */}
<div>
  <label className="block text-sm font-medium mb-1">Username</label>
  <div className="flex items-center gap-2">
    <input
      type="text"
      value={data.username}
      onChange={(e) => setData("username", e.target.value)}
      className="border rounded-lg px-3 py-2 text-sm w-full"
      required
    />
    <button
      type="button"
      onClick={() => {
        if (data.fName && data.lName) {
          const first = data.fName.toLowerCase().replace(/\s+/g, "");
          const last = data.lName.toLowerCase().replace(/\s+/g, "");
          const base1 = `${first.charAt(0)}.${last}`;
          const base2 = `${first}_${last.charAt(0)}`;
          const randomPart = Math.random().toString(36).substring(2, 6);
          const patterns = [
            `${base1}_${randomPart}`,
            `${base2}${randomPart}`,
            `${first}.${last}_${randomPart}`,
          ];
          const generated =
            patterns[Math.floor(Math.random() * patterns.length)];
          setData("username", generated);
        } else {
          Swal.fire({
            icon: "warning",
            title: "Cannot generate username",
            text: "Please enter First Name and Last Name first.",
            confirmButtonColor: "#2563eb",
          });
        }
      }}
      className="px-2 py-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 text-xs"
    >
      Generate
    </button>
  </div>
  <p className="text-xs text-gray-500 mt-1">
    Auto-generate a username from first + last name. You can edit manually anytime.
  </p>
</div>


          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setSelectedFaculty(null);
              }}
              className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              {processing ? "Saving..." : selectedFaculty ? "Update" : "Save"}
            </button>
          </div>
        </form>
   

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
