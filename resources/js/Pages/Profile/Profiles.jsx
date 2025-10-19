import React, { useMemo, useRef, useState, useEffect } from "react";
import { usePage, router, useForm } from "@inertiajs/react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import {
  PencilSimple,
  UserCircle,
  FileText,
  IdentificationBadge,
  EnvelopeSimple,
  Lock,
} from "phosphor-react";

// ✅ Import all layouts
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import AdminLayout from "@/Layouts/AdminLayout";
import FacultyLayout from "@/Layouts/FacultyLayout";
import StudentLayout from "@/Layouts/StudentLayout";
import RegistrarLayout from "@/Layouts/RegistrarLayout";

export default function Profile() {
  const { auth, department, users: userData } = usePage().props;
  const user = userData ?? auth.user;

  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const { setData, post, processing, reset, errors, clearErrors } = useForm({
    avatar: null,
  });

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setData("avatar", file);
    setPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(file);
    });
    clearErrors("avatar");
    setShowPreviewModal(true);
  };

  const handleConfirmUpload = () => {
    post(route("profile.avatar.upload"), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        reset();
        setPreview((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          return null;
        });
        setShowPreviewModal(false);
        clearErrors("avatar");
        Swal.fire({
          icon: "success",
          title: "Profile photo updated",
          timer: 1500,
          showConfirmButton: false,
        });
      },
      onError: () => {
        Swal.fire({
          icon: "error",
          title: "Upload failed",
          text: "Please try again.",
        });
      },
      onFinish: () => {
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      },
    });
  };

  const handleCancelUpload = () => {
    reset();
    clearErrors("avatar");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    setShowPreviewModal(false);
    Swal.fire({
      icon: "info",
      title: "Upload canceled",
      timer: 1200,
      showConfirmButton: false,
    });
  };

  const profileImage = useMemo(() => {
    if (preview) {
      return preview;
    }

    if (user?.profile_picture) {
      return `/storage/${user.profile_picture}`;
    }

    if (user?.avatar) {
      return user.avatar;
    }

    return null;
  }, [preview, user?.profile_picture, user?.avatar]);

  const handleViewImage = () => {
    if (profileImage) {
      setShowImageModal(true);
    }
  };

  const handleCloseImageModal = () => {
    setShowImageModal(false);
  };

  const getLayout = () => {
    switch (user.role) {
      case "admin":
        return AdminLayout;
      case "registrar":
        return RegistrarLayout;
      case "program_head":
        return ProgramHeadLayout;
      case "faculty":
        return FacultyLayout;
      case "student":
        return StudentLayout;
      default:
        return ProgramHeadLayout; // fallback
    }
  };

  const Layout = getLayout();

  const fullName = useMemo(
    () => `${user.fName ?? ""} ${user.mName ?? ""} ${user.lName ?? ""}`.replace(/\s+/g, " ").trim(),
    [user.fName, user.mName, user.lName]
  );

  const quickStats = useMemo(
    () => [
      {
        label: "Username",
        value: `@${user.username ?? "unknown"}`,
        icon: IdentificationBadge,
      },
      {
        label: "Email",
        value: user.email ?? "No email on record",
        icon: EnvelopeSimple,
      },
    ],
    [user.username, user.email]
  );

  const departmentName =
    user.role === "program_head"
      ? department?.name || "Department"
      : user.department?.name || "";

  return (
    <Layout>
      {showImageModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm"
          onClick={handleCloseImageModal}
        >
          <div
            className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">Profile photo</h2>
            <p className="mt-1 text-sm text-slate-500">Tap close to return.</p>
            <div className="mt-4 flex justify-center">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="max-h-[70vh] w-full rounded-3xl object-contain"
                />
              ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-full bg-slate-100">
                  <UserCircle size={96} className="text-slate-300" />
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleCloseImageModal}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Preview photo</h2>
            <p className="mt-1 text-sm text-slate-500">Confirm to update your profile picture.</p>
            <div className="mt-4 flex justify-center">
              {preview ? (
                <img
                  src={preview}
                  alt="Selected preview"
                  className="h-48 w-48 rounded-full object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-full bg-slate-100">
                  <UserCircle size={96} className="text-slate-300" />
                </div>
              )}
            </div>
            {errors.avatar && (
              <p className="mt-3 text-center text-sm text-red-500">{errors.avatar}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelUpload}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={processing}
                className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {processing ? "Uploading..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-slate-100">
        {/* Cover photo */}
        <div className="relative h-40 w-full overflow-hidden sm:h-56 lg:h-64">
          <img src="/images/buksu-cover.png" alt="BukSU" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-6xl px-3 pb-12 sm:px-6">
          {/* Profile header */}
          <section className="mt-6 rounded-3xl bg-white px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full border-4 border-white bg-slate-100 shadow-sm sm:h-28 sm:w-28">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100">
                        <UserCircle size={72} className="text-slate-300" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => inputRef.current?.click()}
                    disabled={processing}
                    className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-400"
                    aria-label="Upload profile avatar"
                  >
                    <PencilSimple size={16} />
                  </button>
                  {profileImage && (
                    <button
                      type="button"
                      onClick={handleViewImage}
                      className="absolute -bottom-2 left-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300"
                    >
                      View
                    </button>
                  )}
                  <input
                    ref={inputRef}
                    onChange={handleFileChange}
                    type="file"
                    accept="image/*"
                    className="hidden"
                  />
                  {errors.avatar && (
                    <p className="mt-2 text-center text-xs text-red-500">{errors.avatar}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{fullName || "User"}</h1>
                  <p className="text-sm text-slate-500">{(user.role || "Member").split("_").join(" ")}</p>
                  {departmentName && <p className="text-sm text-slate-400">{departmentName}</p>}
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
                <button
                  onClick={() => router.visit("/profile/edit")}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300"
                >
                  <PencilSimple size={16} />
                  Edit Profile
                </button>
                <button
                  onClick={() => router.visit(route("profile.password.edit"))}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-200 px-4 py-2 text-sm font-medium text-sky-600 transition hover:border-sky-300"
                >
                  <Lock size={16} />
                  Change Password
                </button>

                <ul className="flex flex-wrap justify-center gap-2 text-xs text-slate-500 sm:justify-end">
                  {quickStats.map(({ label, value }) => (
                    <li key={label} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
                      <span className="ml-2 text-sm text-slate-700">{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <nav className="mt-6 flex flex-wrap gap-2 border-t border-slate-200 pt-4 text-sm font-medium text-slate-500">
              {['About', 'Files', 'Activity'].map((tab) => (
                <button
                  key={tab}
                  className={`rounded-full px-4 py-2 transition ${
                    tab === 'About' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </section>

          {/* Content layout */}
          <section className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <article className="rounded-3xl bg-white px-6 py-5 shadow-sm">
                <header className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">About</h2>
                  <button
                    onClick={() => router.visit("/profile/edit")}
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600"
                  >
                    Edit info
                  </button>
                </header>

                <div className="mt-4 space-y-5">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Identity</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[{
                        label: 'First Name',
                        value: user.fName ?? '—',
                      },
                      {
                        label: 'Middle Name',
                        value: user.mName ?? '—',
                      },
                      {
                        label: 'Last Name',
                        value: user.lName ?? '—',
                      }].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-slate-200 px-4 py-3">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{item.label}</span>
                          <span className="mt-1 block text-sm font-medium text-slate-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Academic</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[{
                        label: 'Department',
                        value:
                          user.role === 'program_head'
                            ? department?.name || 'N/A'
                            : user.department?.name || '—',
                      },
                      {
                        label: 'Role',
                        value: (user.role || 'Member').split('_').join(' '),
                      }].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-slate-200 px-4 py-3">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{item.label}</span>
                          <span className="mt-1 block text-sm font-medium text-slate-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Contact</span>
                    <p className="mt-1 text-sm font-medium text-slate-900">{user.email || 'No email on record'}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl bg-white px-6 py-5 shadow-sm">
                <header className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Timeline</h2>
                  <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Recent activity</span>
                </header>
                <div className="mt-4 space-y-4">
                  {[{
                    title: 'Profile details reviewed',
                    description: 'Verified personal and contact information.',
                    time: '2 days ago',
                  },
                  {
                    title: 'Password updated',
                    description: 'Improved account security with a new password.',
                    time: '1 week ago',
                  }].map((event) => (
                    <div key={event.title} className="space-y-1 border-l border-slate-200 pl-4">
                      <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                      <p className="text-sm text-slate-600">{event.description}</p>
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{event.time}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl bg-white px-6 py-5 shadow-sm">
                <header className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Shared Files</h2>
                  <button className="text-sm font-medium text-sky-600 transition hover:text-sky-700">View all</button>
                </header>
                <div className="mt-4 space-y-3">
                  {[{
                    title: 'Curriculum Guide',
                    meta: 'PDF • Aug 2025',
                  },
                  {
                    title: 'Faculty Handbook',
                    meta: 'DOCX • Jul 2025',
                  },
                  {
                    title: 'Department Policies',
                    meta: 'PDF • Jun 2025',
                  }].map((file) => (
                    <div key={file.title} className="flex items-center justify-between border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{file.title}</p>
                        <p className="text-xs text-slate-500">{file.meta}</p>
                      </div>
                      <FileText size={18} className="text-sky-500" />
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <aside className="space-y-6">
              <section className="rounded-3xl bg-white px-6 py-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Contact & Settings</h3>
                <p className="mt-3 text-sm text-slate-600">
                  Keep your contact and security preferences updated so we can reach you on time.
                </p>
                <button
                  onClick={() => router.visit(route("profile.password.edit"))}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  <Lock size={16} />
                  Change Password
                </button>
              </section>

              <section className="rounded-3xl bg-white px-6 py-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Reminders</h3>
                <ul className="mt-3 space-y-3 text-sm text-slate-600">
                  <li className="border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                    <p className="font-medium text-slate-900">Refresh your photo</p>
                    <p className="text-xs text-slate-500">Upload a recent portrait to keep your profile recognizable.</p>
                  </li>
                  <li className="border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                    <p className="font-medium text-slate-900">Stay secure</p>
                    <p className="text-xs text-slate-500">Rotate your password each term for better protection.</p>
                  </li>
                  <li className="border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                    <p className="font-medium text-slate-900">Department news</p>
                    <p className="text-xs text-slate-500">Watch for new announcements from {department?.name || 'your department'}.</p>
                  </li>
                </ul>
              </section>
            </aside>
          </section>
        </div>
      </motion.div>
    </Layout>
  );
}
