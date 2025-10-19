import React, { useState, useMemo } from "react";
import { usePage, router } from "@inertiajs/react";
import {
  PencilSimple,
  Eye,
  EnvelopeSimple,
  MagnifyingGlass,
  UserPlus,
} from "phosphor-react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import Swal from "sweetalert2";

export default function StudentsAccount() {
  const { students = [] } = usePage().props;
  const [search, setSearch] = useState("");
  const [emailPending, setEmailPending] = useState(null);

// ✅ Handle create account
const handleCreateAccount = (student) => {
  Swal.fire({
    title: "Create Student Account?",
    text: `Do you want to generate an account for ${student.fName} ${student.lName}?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#2563eb",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, create it!",
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: "Creating...",
        text: "Please wait while the account is being generated.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      router.post(
        route("registrar.students.createAccount", student.id),
        {},
        {
          onSuccess: () => {
            Swal.close();

            Swal.fire({
              title: "Account Created!",
              text: "The student account has been created successfully.",
              icon: "success",
              confirmButtonColor: "#2563eb",
            });
          },
          onError: (errors) => {
            Swal.close();
            console.error("Account creation error:", errors);

            Swal.fire({
              title: "Error",
              text: "Failed to create the student account. Please try again.",
              icon: "error",
              confirmButtonColor: "#2563eb",
            });
          },
          onFinish: () => {
            console.log("Create account request finished for student:", student);
          },
        }
      );
    }
  });
};

  // ✅ Handle send email
  const handleSendEmail = (student) => {
    Swal.fire({
      title: "Send Email?",
      text: `Send credentials to ${student.fName} ${student.lName}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, send it!",
    }).then((result) => {
      if (result.isConfirmed) {
        setEmailPending(student.id);
        router.post(
          route("registrar.students.sendEmail", student.id),
          {},
          {
            onSuccess: () =>
              Swal.fire("Sent!", "Email has been sent.", "success"),
            onError: () =>
              Swal.fire(
                "Error",
                "Failed to send the email. Please try again.",
                "error"
              ),
            onFinish: () => setEmailPending(null),
          }
        );
      }
    });
  };

  const handleViewProfile = (student) => {
    router.visit(route("registrar.students.profile"), {
      data: { student_id: student.id },
    });
  };

  const handleEditAccount = (student) => {
    router.visit(route("registrar.students.list"), {
      data: { student_id: student.id },
    });
  };

  // ✅ Search filter
  const filteredStudents = useMemo(
    () =>
      students.filter((s) =>
        `${s.fName} ${s.lName}`.toLowerCase().includes(search.toLowerCase())
      ),
    [students, search]
  );

  return (
    <RegistrarLayout>
      <div className="p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
          <h1 className="text-lg font-bold flex items-center gap-1">
            <UserPlus size={20} /> Student Accounts
          </h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <MagnifyingGlass
                size={16}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search student..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 pr-2 py-1 text-sm border rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
          {filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left text-gray-700">
                <thead className="bg-gray-50 text-gray-600 uppercase tracking-wide text-[11px]">
                  <tr>
                    <th className="px-4 py-3">ID Number</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Generated Password</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">{s.id_number || "-"}</td>
                      <td className="px-4 py-3">
                        {s.fName} {s.mName} {s.lName}
                      </td>
                    
                      <td className="px-4 py-3 font-mono text-blue-600">
                        {s.generated_password || "-"}
                      </td>
                      <td className="px-4 py-3">{s.email || "-"}</td>
                      <td className="px-4 py-3 flex items-center justify-center gap-2">
                        {/* Create Account */}
                        <button
                          onClick={() => handleCreateAccount(s)}
                          disabled={s.username}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium 
                            bg-blue-600 text-white hover:bg-blue-700 transition
                            ${s.username ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <UserPlus size={12} />{" "}
                          {s.username ? "Exists" : "Create"}
                        </button>

                        <button
                          onClick={() => handleEditAccount(s)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200"
                        >
                          <PencilSimple size={14} /> Edit
                        </button>

                        <button
                          onClick={() => handleViewProfile(s)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          <Eye size={14} /> View
                        </button>

                        <button
                          onClick={() => handleSendEmail(s)}
                          disabled={emailPending === s.id}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 ${
                            emailPending === s.id ? "opacity-60 cursor-wait" : ""
                          }`}
                        >
                          <EnvelopeSimple size={14} />
                          {emailPending === s.id ? "Sending..." : "Resend"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-4 text-gray-500 text-sm">No students found.</p>
          )}
        </div>
      </div>
    </RegistrarLayout>
  );
}
