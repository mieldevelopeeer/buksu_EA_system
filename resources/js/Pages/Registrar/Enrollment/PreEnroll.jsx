import React, { useState, useMemo } from "react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Head, router } from "@inertiajs/react";
import {
  Users,
  Loader2,
  CheckCircle,
  Search,
  BookOpen,
  ClipboardList,
  X,
} from "lucide-react";
import Swal from "sweetalert2";

export default function PreEnroll({ preEnrolledStudents = [] }) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [previewImage, setPreviewImage] = useState(null); // 🔥 Added for large preview

  // ✅ Search filtering
  const filteredStudents = useMemo(() => {
    return preEnrolledStudents.filter((enrollment) => {
      const fullName = `${enrollment.user?.fName || ""} ${enrollment.user?.mName || ""} ${
        enrollment.user?.lName || ""
      }`.toLowerCase();
      const idNumber = enrollment.user?.id_number?.toLowerCase() || "";
      return (
        fullName.includes(search.toLowerCase()) ||
        idNumber.includes(search.toLowerCase())
      );
    });
  }, [preEnrolledStudents, search]);

  // ✅ Confirm enrollment
  const handleConfirm = (id) => {
    Swal.fire({
      title: "Confirm Enrollment?",
      text: "This student will be marked as Enrolled.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Confirm",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        setLoading(true);
        router.post(`/registrar/pre-enroll/${id}/confirm`, {}, { onFinish: () => setLoading(false) });
      }
    });
  };

  // ❌ Reject enrollment
  const handleReject = (id) => {
    Swal.fire({
      title: "Reject Enrollment?",
      text: "This student will be marked as Dropped.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Reject",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        setLoading(true);
        router.post(`/registrar/pre-enroll/${id}/reject`, {}, { onFinish: () => setLoading(false) });
      }
    });
  };

  // 📘 Review subjects
  const handleReview = (id) => {
    router.get(`/registrar/pre-enroll/${id}/review`);
  };

  // 📂 View requirements
  const handleRequirements = (student) => {
    setSelectedStudent(student);
    setShowRequirements(true);
  };

  return (
    <RegistrarLayout>
      <Head title="Pre-Enrolled Students" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
            <Users size={18} className="text-indigo-600" /> Pre-Enrolled Students
          </h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>
        </div>

       {/* Loading */}
{loading && (
  <div className="flex items-center justify-center py-4 text-gray-500 text-[11px]">
    <Loader2 className="animate-spin mr-1" size={12} />
    <span>Processing...</span>
  </div>
)}

{/* Table */}
{filteredStudents.length === 0 ? (
  <p className="text-gray-400 text-center py-4 text-[11px] italic">
    No pre-enrolled students found.
  </p>
) : (
  <div className="overflow-x-auto bg-white shadow-sm rounded-lg border border-gray-200">
    <table className="w-full text-[12px] text-gray-700 border-collapse font-[Poppins]">
      {/* Table Head */}
      <thead className="bg-gray-50 sticky top-0 text-[11px] text-gray-600 uppercase font-medium tracking-wide">
        <tr>
          <th className="px-3 py-2 text-left">#</th>
          <th className="px-3 py-2 text-left">ID</th>
          <th className="px-3 py-2 text-left">Name</th>
          <th className="px-3 py-2 text-left">Course</th>
          <th className="px-3 py-2 text-left">Year</th>
          <th className="px-3 py-2 text-left">Student Type</th>
          <th className="px-3 py-2 text-center">Action</th>
        </tr>
      </thead>

      {/* Table Body */}
      <tbody>
        {filteredStudents.map((enrollment, idx) => (
          <tr
            key={enrollment.id}
            className={`border-t hover:bg-gray-50 transition ${
              idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
            }`}
          >
            <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
            <td className="px-3 py-2">{enrollment.user?.id_number}</td>
            <td className="px-3 py-2 font-medium text-gray-800">
              {enrollment.user?.lName}, {enrollment.user?.fName}{" "}
              {enrollment.user?.mName || ""}
            </td>
            <td className="px-3 py-2">{enrollment.course?.code || "-"}</td>
            <td className="px-3 py-2">{enrollment.year_level?.year_level || "-"}</td>
            <td className="px-3 py-2">
              {enrollment.student_type || "Freshman"}
            </td>

            {/* Actions */}
            <td className="px-3 py-2 text-center space-x-1.5">
              <button
                onClick={() => handleReview(enrollment.id)}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[11px] font-medium hover:bg-blue-200 transition"
              >
                <BookOpen size={12} className="mr-1" />
                Review
              </button>

              <button
                onClick={() => handleRequirements(enrollment.user)}
                className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-[11px] font-medium hover:bg-purple-200 transition"
              >
                <ClipboardList size={12} className="mr-1" />
                Requirements
              </button>

              <button
                onClick={() => handleConfirm(enrollment.id)}
                className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-[11px] font-medium hover:bg-green-200 transition"
              >
                <CheckCircle size={12} className="mr-1" />
                Confirm
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

      </div>

      {/* 🔥 Requirements Modal */}
      {showRequirements && selectedStudent && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-6 relative">
            <button
              onClick={() => setShowRequirements(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              {selectedStudent.lName}, {selectedStudent.fName} Submitted Requirements
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Student Type: {selectedStudent.student_type || "Freshman"}
            </p>

            {selectedStudent.student_requirements?.length > 0 ? (
              <ul className="space-y-3">
                {selectedStudent.student_requirements.map((req) => (
                  <li key={req.id} className="border rounded-md p-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{req.requirement?.name}</p>
                      <p className="text-xs text-gray-500">
                        {req.is_submitted ? `Submitted: ${req.submitted_at}` : "Not Submitted"}
                      </p>
                    </div>

                    {/* ✅ Thumbnail if image */}
                    {req.is_submitted && req.image && req.image.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <img
                        src={`/storage/${req.image}`}
                        alt="Requirement"
                        className="h-12 w-12 object-cover rounded-md cursor-pointer border hover:opacity-80"
                        onClick={() => setPreviewImage(`/storage/${req.image}`)}
                      />
                    ) : req.is_submitted && req.image ? (
                      <a
                        href={`/storage/${req.image}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-xs underline"
                      >
                        View File
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No requirements submitted.</p>
            )}
          </div>
        </div>
      )}

      {/* 🔍 Large Image Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70 z-50"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative">
            <img
              src={previewImage}
              alt="Large Preview"
              className="max-h-[80vh] max-w-[90vw] rounded-lg shadow-lg"
            />
            <button
              className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 text-gray-600 hover:text-red-600"
              onClick={() => setPreviewImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </RegistrarLayout>
  );
}
