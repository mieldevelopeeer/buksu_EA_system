import React, { useEffect, useMemo, useState } from "react";
import { useForm, usePage, router } from "@inertiajs/react";
import axios from "axios";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import Swal from "sweetalert2";
import {
  ShieldCheck,
  ClipboardText,
  Calendar,
  Funnel,
  Plus,
  MagnifyingGlass,
  ArrowClockwise,
  CheckCircle,
  WarningCircle,
  FileText,
  Printer,
  Lock,
  LockOpen,
  UsersThree,
} from "phosphor-react";

const badgeClass = {
  active: "bg-emerald-50 text-emerald-600 border-emerald-200",
  inactive: "bg-slate-50 text-slate-500 border-slate-200",
  expiring: "bg-amber-50 text-amber-600 border-amber-200",
};

const parseDate = (dateString) => {
  if (!dateString) return null;

  const normalized = dateString.includes("T") ? dateString : `${dateString}T00:00:00`;
  const date = new Date(normalized);

  if (Number.isNaN(date.valueOf())) {
    return null;
  }

  return date;
};

const formatValidityDate = (dateString) => {
  const date = parseDate(dateString);
  if (!date) return dateString;

  return date.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const isExpiringSoon = (dateString) => {
  const expiresAt = parseDate(dateString);
  if (!expiresAt) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const inSevenDays = new Date(today);
  inSevenDays.setDate(today.getDate() + 7);

  return expiresAt >= today && expiresAt <= inSevenDays;
};

const getValidityDescription = (permission) => {
  if (!permission.granted_until) {
    return permission.is_active ? "No expiry" : "Inactive";
  }

  const formattedDate = formatValidityDate(permission.granted_until);

  if (!permission.is_active) {
    return `Inactive since ${formattedDate}`;
  }

  if (isExpiringSoon(permission.granted_until)) {
    return `Expiring soon until ${formattedDate}`;
  }

  return `Valid until ${formattedDate}`;
};

export default function FacultyPermissions() {
  const { permissions = [], faculties = [], courses = [], majors = [] } = usePage().props;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [permissionRecords, setPermissionRecords] = useState(permissions);
  const [isSavingPermission, setIsSavingPermission] = useState(false);

  const form = useForm({
    faculty_id: "",
    course_id: "",
    major_id: "",
    granted_until: "",
    can_print_cor: true,
    is_active: true,
  });

  useEffect(() => {
    setPermissionRecords(permissions);
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    return permissionRecords.filter((permission) => {
      const facultyName = `${permission.faculty?.fName ?? ""} ${permission.faculty?.lName ?? ""}`
        .toLowerCase()
        .trim();
      const matchesSearch = !search.trim() || facultyName.includes(search.toLowerCase());

      const isExpiring = isExpiringSoon(permission.granted_until);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && permission.is_active) ||
        (statusFilter === "inactive" && !permission.is_active) ||
        (statusFilter === "expiring" && permission.is_active && isExpiring);

      return matchesSearch && matchesStatus;
    });
  }, [permissionRecords, search, statusFilter]);

  const summary = useMemo(() => {
    const total = permissionRecords.length;
    const active = permissionRecords.filter((p) => p.is_active).length;
    const canPrintCor = permissionRecords.filter((p) => p.can_print_cor).length;
    const expiring = permissionRecords.filter((p) => isExpiringSoon(p.granted_until)).length;

    return { total, active, canPrintCor, expiring };
  }, [permissionRecords]);

  const availableMajors = useMemo(() => {
    if (!form.data.course_id) {
      return majors;
    }

    return majors.filter(
      (major) => String(major.courses_id ?? "") === String(form.data.course_id)
    );
  }, [majors, form.data.course_id]);

  useEffect(() => {
    if (!form.data.course_id && courses.length === 1) {
      form.setData("course_id", String(courses[0].id));
    }
  }, [courses, form]);

  useEffect(() => {
    if (!form.data.course_id) {
      return;
    }

    const matchingMajors = majors.filter(
      (major) => String(major.courses_id ?? "") === String(form.data.course_id)
    );

    if (matchingMajors.length === 1 && form.data.major_id !== String(matchingMajors[0].id)) {
      form.setData("major_id", String(matchingMajors[0].id));
      return;
    }

    if (
      form.data.major_id &&
      !matchingMajors.some((major) => String(major.id) === String(form.data.major_id))
    ) {
      form.setData("major_id", "");
    }
  }, [form, majors, form.data.course_id, form.data.major_id]);

  const upsertPermission = (permission) => {
    if (!permission) return;
    setPermissionRecords((prev) => {
      const exists = prev.some((entry) => entry.id === permission.id);
      if (exists) {
        return prev.map((entry) => (entry.id === permission.id ? permission : entry));
      }
      return [permission, ...prev];
    });
  };

  const removePermission = (permissionId) => {
    setPermissionRecords((prev) => prev.filter((entry) => entry.id !== permissionId));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSavingPermission(true);
    form.clearErrors();

    try {
      const response = await axios.post(route("program-head.faculty-permissions.store"), form.data);
      upsertPermission(response.data?.permission);
      setShowModal(false);
      form.reset();
      Swal.fire({
        toast: true,
        icon: "success",
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
        title: "Permission granted",
      });
    } catch (error) {
      if (error.response?.status === 422 && error.response.data?.errors) {
        form.setError(error.response.data.errors);
      } else {
        console.error("Failed to grant permission", error);
        Swal.fire("Error", "Failed to save permission. Please try again.", "error");
      }
    } finally {
      setIsSavingPermission(false);
    }
  };

  const deletePermission = async (permission) => {
    if (!permission) return;

    const confirmed = await Swal.fire({
      title: "Delete permission?",
      text: "This faculty member will permanently lose evaluation access and COR printing for this record.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Yes, delete",
    }).then((result) => result.isConfirmed);

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(route("program-head.faculty-permissions.destroy", permission.id));
      removePermission(permission.id);
      Swal.fire({
        toast: true,
        icon: "success",
        timer: 2200,
        showConfirmButton: false,
        position: "top-end",
        title: "Permission deleted",
      });
    } catch (error) {
      console.error("Failed to delete permission", error);
      Swal.fire("Error", "Unable to delete the permission. Please try again.", "error");
    }
  };

  const confirmToggle = async ({ title, text, confirmLabel }) => {
    const result = await Swal.fire({
      title,
      text,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: confirmLabel,
    });

    return result.isConfirmed;
  };

  const togglePermission = async (permission, field) => {
    const togglingPrintCor = field === "can_print_cor";
    const togglingAssessment = field === "is_active";

    if (!togglingPrintCor && !togglingAssessment) {
      return;
    }

    const isCurrentlyEnabled = Boolean(permission[field]);
    const confirmed = await confirmToggle({
      title: togglingPrintCor
        ? `${isCurrentlyEnabled ? "Disable" : "Allow"} COR printing?`
        : `${isCurrentlyEnabled ? "Suspend" : "Activate"} assessment access?`,
      text: togglingPrintCor
        ? isCurrentlyEnabled
          ? "Faculty will lose the ability to print Certificates of Registration until re-enabled."
          : "Faculty will be able to print Certificates of Registration."
        : isCurrentlyEnabled
        ? "Faculty can no longer assess enrollments after this action."
        : "Faculty will be able to assess enrollments immediately.",
      confirmLabel: togglingPrintCor
        ? isCurrentlyEnabled
          ? "Yes, disable"
          : "Yes, allow"
        : isCurrentlyEnabled
        ? "Yes, suspend"
        : "Yes, activate",
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await axios.patch(
        route("program-head.faculty-permissions.update", permission.id),
        {
          [field]: !permission[field],
        }
      );
      upsertPermission(response.data?.permission);
      Swal.fire({
        toast: true,
        icon: "success",
        timer: 2000,
        position: "top-end",
        showConfirmButton: false,
        title: togglingPrintCor
          ? `COR printing ${isCurrentlyEnabled ? "disabled" : "enabled"}`
          : `Assessment access ${isCurrentlyEnabled ? "suspended" : "activated"}`,
      });
    } catch (error) {
      console.error("Failed to update permission", error);
      Swal.fire("Error", "Unable to update the permission. Please try again.", "error");
    }
  };

  const deactivatePermission = (permission) => {
    Swal.fire({
      title: "Deactivate permission?",
      text: "The faculty member will lose access immediately.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, deactivate",
    }).then((result) => {
      if (result.isConfirmed) {
        togglePermission(permission, "is_active");
      }
    });
  };

  const renderBadge = (permission) => {
    const expiresAt = permission.granted_until ? new Date(permission.granted_until) : null;
    if (!permission.is_active) {
      return <span className={`badge ${badgeClass.inactive}`}>Inactive</span>;
    }

    if (expiresAt && expiresAt <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      return <span className={`badge ${badgeClass.expiring}`}>Expiring soon</span>;
    }

    return <span className={`badge ${badgeClass.active}`}>Active</span>;
  };

  return (
    <ProgramHeadLayout>
      <div className="px-6 py-4 text-gray-800 text-xs font-[Poppins]">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded bg-blue-600" />
            <div>
              <h1 className="text-base font-semibold text-gray-900">Faculty Evaluation Permissions</h1>
              <p className="text-[11px] text-gray-500">
                Configure which faculty members can assess enrollments and print Certificates of Registration (COR).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.reload({ only: ["permissions"] })}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-[11px] text-gray-600 transition hover:bg-gray-50"
            >
              <ArrowClockwise size={14} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={14} /> Grant permission
            </button>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard icon={<ShieldCheck size={18} />} label="Active permissions" value={summary.active} />
          <SummaryCard icon={<ClipboardText size={18} />} label="Total records" value={summary.total} />
          <SummaryCard icon={<Printer size={18} />} label="Can print COR" value={summary.canPrintCor} />
          <SummaryCard icon={<WarningCircle size={18} />} label="Expiring soon" value={summary.expiring} tone="warning" />
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative w-full sm:max-w-xs">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search faculty"
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 pl-8 text-[11px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <MagnifyingGlass size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-[11px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expiring">Expiring soon</option>
              </select>
            </div>
            <a
              href={route("program-head.faculties.index")}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
            >
              <UsersThree size={14} /> Manage faculty profiles
            </a>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-[11px] text-gray-600">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">Faculty</th>
                  <th className="px-3 py-2">Course / Major</th>
                  <th className="px-3 py-2 text-center">Assess Enrollment</th>
                  <th className="px-3 py-2 text-center">Print COR</th>
                  <th className="px-3 py-2">Validity</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPermissions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-[11px] text-gray-400">
                      No permission records found.
                    </td>
                  </tr>
                )}
                {filteredPermissions.map((permission) => (
                  <tr key={permission.id} className="hover:bg-gray-50/60">
                    <td className="px-3 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800">
                          {permission.faculty
                            ? `${permission.faculty.fName ?? ""} ${permission.faculty.lName ?? ""}`.trim()
                            : "Faculty N/A"}
                        </span>
                        <span className="text-[10px] text-gray-500">ID: {permission.faculty?.id_number ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-700">{permission.course?.code ?? "Any course"}</span>
                        <span className="text-[10px] text-gray-500">{permission.major?.name ?? "All majors"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {permission.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          <CheckCircle size={12} /> Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          <Lock size={12} /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => togglePermission(permission, "can_print_cor")}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                          permission.can_print_cor
                            ? "border-blue-200 bg-blue-50 text-blue-600"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        <Printer size={12} /> {permission.can_print_cor ? "Allowed" : "Blocked"}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold text-gray-500">{renderBadge(permission)}</span>
                        <span className="text-[11px] text-gray-600">{getValidityDescription(permission)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => togglePermission(permission, "is_active")}
                          className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 transition hover:bg-gray-50"
                        >
                          {permission.is_active ? (
                            <>
                              <Lock size={12} /> Suspend
                            </>
                          ) : (
                            <>
                              <LockOpen size={12} /> Activate
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => deactivatePermission(permission)}
                          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-600"
                        >
                          Revoke
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePermission(permission)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Grant faculty permission</h2>
                  <p className="text-[11px] text-gray-500">Select the faculty member and define the scope of access.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500">Faculty</label>
                  <select
                    value={form.data.faculty_id}
                    onChange={(event) => form.setData("faculty_id", event.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-[11px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select faculty</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.fName} {faculty.lName} • {faculty.id_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500">Course</label>
                    <select
                      value={form.data.course_id}
                      onChange={(event) => form.setData("course_id", event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-[11px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All courses</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.code} • {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500">Major</label>
                    <select
                      value={form.data.major_id}
                      onChange={(event) => form.setData("major_id", event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-[11px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All majors</option>
                      {availableMajors.map((major) => (
                        <option key={major.id} value={major.id}>
                          {major.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500">
                      Valid until <span className="text-gray-400">(optional)</span>
                    </label>
                    <div className="relative">
                      <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={form.data.granted_until ?? ""}
                        onChange={(event) => form.setData("granted_until", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 pl-9 text-[11px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                    <label className="text-[10px] font-semibold text-gray-500">Allow COR printing</label>
                    <button
                      type="button"
                      onClick={() => form.setData("can_print_cor", !form.data.can_print_cor)}
                      className={`ml-auto inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-semibold transition ${
                        form.data.can_print_cor
                          ? "border-blue-200 bg-blue-50 text-blue-600"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {form.data.can_print_cor ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                  <label className="text-[10px] font-semibold text-gray-500">Permission status</label>
                  <button
                    type="button"
                    onClick={() => form.setData("is_active", !form.data.is_active)}
                    className={`ml-auto inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-semibold transition ${
                      form.data.is_active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {form.data.is_active ? "Active" : "Suspended"}
                  </button>
                </div>

                {form.errors && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-600">
                    {Object.values(form.errors).map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPermission}
                    className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    {isSavingPermission ? "Saving..." : "Save permission"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProgramHeadLayout>
  );
}

const SummaryCard = ({ icon, label, value, tone = "default" }) => {
  const toneClass =
    tone === "warning"
      ? "bg-amber-50 border-amber-100 text-amber-700"
      : "bg-white border-gray-200 text-gray-800";

  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm ${toneClass}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-blue-600">{icon}</div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
};

const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M23 20v-2a4 4 0 00-3-3.87" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 010 7.75" /></svg>;
