import React, { useEffect, useMemo } from "react";
import { useForm, usePage, Head, Link } from "@inertiajs/react";
import Swal from "sweetalert2";
import { User, IdentificationBadge, EnvelopeSimple, MapPin, Phone, ArrowLeft, ShieldCheck } from "phosphor-react";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring focus:ring-sky-600/40";

export default function EditProfile() {
  const { auth, user, department, flash } = usePage().props;
  const currentUser = user ?? auth.user;

  const {
    data,
    setData,
    put,
    processing,
    errors,
    reset,
    wasSuccessful,
  } = useForm({
    fName: currentUser?.fName ?? "",
    mName: currentUser?.mName ?? "",
    lName: currentUser?.lName ?? "",
    username: currentUser?.username ?? "",
    email: currentUser?.email ?? "",
    contact_no: currentUser?.contact_no ?? "",
    address: currentUser?.address ?? "",
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (flash?.success) {
      Swal.fire({
        icon: "success",
        title: flash.success,
        timer: 1800,
        showConfirmButton: false,
      });
    }

    if (flash?.error) {
      Swal.fire({
        icon: "error",
        title: flash.error,
        timer: 2000,
        showConfirmButton: false,
      });
    }
  }, [flash]);

  useEffect(() => {
    if (wasSuccessful) {
      reset();
    }
  }, [wasSuccessful, reset]);

  const roleLabel = useMemo(() => {
    return (currentUser?.role ?? "Member").split("_").join(" ");
  }, [currentUser?.role]);

  const handleSubmit = (event) => {
    event.preventDefault();

    put(route("profile.update"), {
      preserveScroll: true,
      onSuccess: () => {
        Swal.fire({
          icon: "success",
          title: "Profile updated",
          timer: 1600,
          showConfirmButton: false,
        });
      },
      onError: () => {
        Swal.fire({
          icon: "error",
          title: "Update failed",
          text: "Please review the highlighted fields.",
        });
      },
    });
  };

  return (
    <>
      <Head title="Edit Profile" />
      <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#030b2a] to-[#051a44] py-10 text-slate-100 transition-colors duration-500">
        <div className="mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur transition-transform duration-500 ease-out hover:translate-y-[-4px] md:flex-row">
          <div className="relative flex w-full items-center justify-center border-b border-white/10 bg-gradient-to-br from-sky-900 via-blue-800 to-slate-900 p-10 text-slate-100 md:w-1/2 md:border-b-0 md:border-r">
            <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at top left, rgba(148, 197, 255, 0.4), transparent 55%)" }} />
            <div className="relative z-10 space-y-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/20 text-sky-200">
                <ShieldCheck size={28} />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-semibold text-white">Keep Your Profile Current</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">
                  Update your contact information so departments can reach you quickly. Accurate details help us deliver
                  personalized guidance and alerts.
                </p>
              </div>
              <ul className="space-y-3 text-left text-xs text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Use institutional emails whenever possible for privileged notices.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Update your address to receive printed correspondence without delays.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Need to change your password instead? Visit the secure change password page anytime.
                </li>
              </ul>
              <button
                type="button"
                onClick={() => history.back()}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-sky-400/60"
              >
                <ArrowLeft size={16} />
                Back to profile
              </button>
            </div>
          </div>

          <div className="relative w-full overflow-hidden bg-slate-950/60 py-10 px-8 text-slate-100 md:w-1/2">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-white">Edit Personal Information</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Refresh your personal details. Changes apply immediately after saving.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
              <section className="space-y-3.5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-500">Identity</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">First Name</label>
                    <input
                      value={data.fName}
                      onChange={(event) => setData("fName", event.target.value)}
                      className={`${inputClass} ${errors.fName ? "border-red-400" : ""}`}
                    />
                    {errors.fName && <p className="mt-1 text-xs text-red-500">{errors.fName}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">Middle Name</label>
                    <input
                      value={data.mName}
                      onChange={(event) => setData("mName", event.target.value)}
                      className={`${inputClass} ${errors.mName ? "border-red-400" : ""}`}
                    />
                    {errors.mName && <p className="mt-1 text-xs text-red-500">{errors.mName}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">Last Name</label>
                    <input
                      value={data.lName}
                      onChange={(event) => setData("lName", event.target.value)}
                      className={`${inputClass} ${errors.lName ? "border-red-400" : ""}`}
                    />
                    {errors.lName && <p className="mt-1 text-xs text-red-500">{errors.lName}</p>}
                  </div>
                </div>
              </section>

              <section className="space-y-3.5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-400">Account</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">Username</label>
                    <input
                      value={data.username}
                      onChange={(event) => setData("username", event.target.value)}
                      className={`${inputClass} ${errors.username ? "border-red-400" : ""}`}
                    />
                    {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">Email</label>
                    <input
                      type="email"
                      value={data.email}
                      onChange={(event) => setData("email", event.target.value)}
                      className={`${inputClass} ${errors.email ? "border-red-400" : ""}`}
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                  </div>
                </div>
              </section>

              <section className="space-y-3.5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-400">Contact</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">Contact Number</label>
                    <input
                      value={data.contact_no}
                      onChange={(event) => setData("contact_no", event.target.value)}
                      className={`${inputClass} ${errors.contact_no ? "border-red-400" : ""}`}
                    />
                    {errors.contact_no && <p className="mt-1 text-xs text-red-500">{errors.contact_no}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">Address</label>
                    <input
                      value={data.address}
                      onChange={(event) => setData("address", event.target.value)}
                      className={`${inputClass} ${errors.address ? "border-red-400" : ""}`}
                    />
                    {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-4 text-sm text-slate-200">
                <p>
                  <strong className="font-semibold text-slate-100">Role:</strong> {roleLabel}
                </p>
                <p className="mt-1">
                  <strong className="font-semibold text-slate-100">Department:</strong> {department?.name ?? currentUser?.department?.name ?? "N/A"}
                </p>
              </section>
    
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => history.back()}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-sky-700 px-5 py-2 text-sm font-semibold text-white transition-transform transition-colors duration-300 hover:translate-y-[-2px] hover:from-sky-400 hover:via-blue-500 hover:to-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {processing ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
     </div>
    </>
  );
}
