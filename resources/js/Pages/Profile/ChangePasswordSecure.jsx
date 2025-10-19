import React, { useEffect } from "react";
import { Head, useForm, usePage, Link } from "@inertiajs/react";
import Swal from "sweetalert2";
import { ShieldCheck, ArrowLeft } from "phosphor-react";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring focus:ring-sky-600/40";

export default function ChangePasswordSecure() {
  const { auth, flash } = usePage().props;

  const { data, setData, put, processing, errors, reset } = useForm({
    current_password: "",
    password: "",
    password_confirmation: "",
  });

  useEffect(() => {
    if (flash?.success) {
      Swal.fire({
        icon: "success",
        title: flash.success,
        timer: 1600,
        showConfirmButton: false,
      });
      reset();
    }

    if (flash?.error) {
      Swal.fire({
        icon: "error",
        title: flash.error,
        timer: 2000,
        showConfirmButton: false,
      });
    }
  }, [flash, reset]);

  const handleSubmit = (event) => {
    event.preventDefault();

    put(route("profile.password.update"), {
      preserveScroll: true,
      onSuccess: () => {
        Swal.fire({
          icon: "success",
          title: "Password updated",
          timer: 1600,
          showConfirmButton: false,
        });
        reset();
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
      <Head title="Secure Password Update" />
      <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#030b2a] to-[#051a44] py-10 text-slate-100 transition-colors duration-500">
        <div className="mx-auto w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur transition-transform duration-500 ease-out hover:translate-y-[-4px]">
          <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">
                Security
              </span>
              <h1 className="mt-2 text-xl font-semibold text-white">Change Password</h1>
              <p className="mt-1 text-sm text-slate-300">
                Use a strong and unique password to protect your {auth?.user?.role ?? "account"} data.
              </p>
            </div>
            <Link
              href={route("profile.index")}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-200 transition hover:border-sky-400 hover:text-sky-200"
            >
              <ArrowLeft size={14} /> Back
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <section className="space-y-3.5">
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-slate-200 transition-colors duration-500 hover:border-sky-400/40 hover:bg-sky-500/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/20 text-sky-300 transition-transform duration-500 group-hover:scale-105">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-50">Password hygiene tips</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate-300">
                      <li>Use at least 12 characters mixing letters, numbers, and symbols.</li>
                      <li>Avoid reusing passwords from other sites.</li>
                      <li>Update your password whenever you suspect unusual activity.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">Current password</label>
                <input
                  type="password"
                  value={data.current_password}
                  onChange={(event) => setData("current_password", event.target.value)}
                  className={`${inputClass} ${errors.current_password ? "border-red-400" : ""}`}
                  autoComplete="current-password"
                  required
                />
                {errors.current_password && (
                  <p className="mt-1 text-xs text-red-500">{errors.current_password}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">New password</label>
                <input
                  type="password"
                  value={data.password}
                  onChange={(event) => setData("password", event.target.value)}
                  className={`${inputClass} ${errors.password ? "border-red-400" : ""}`}
                  autoComplete="new-password"
                  required
                />
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">Confirm new password</label>
                <input
                  type="password"
                  value={data.password_confirmation}
                  onChange={(event) => setData("password_confirmation", event.target.value)}
                  className={`${inputClass} ${errors.password_confirmation ? "border-red-400" : ""}`}
                  autoComplete="new-password"
                  required
                />
                {errors.password_confirmation && (
                  <p className="mt-1 text-xs text-red-500">{errors.password_confirmation}</p>
                )}
              </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href={route("profile.index")}
                className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-sky-200"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={processing}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-blue-600 to-sky-700 px-5 py-2 text-sm font-semibold text-white transition-transform transition-colors duration-300 hover:translate-y-[-2px] hover:from-sky-400 hover:via-blue-500 hover:to-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {processing ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
