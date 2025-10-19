import React, { useCallback, useEffect, useRef, useState } from "react";
import GuestLayout from "@/Layouts/GuestLayout";
import InputError from "@/Components/InputError";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import { Head, useForm } from "@inertiajs/react";
import { Lock, ShieldCheck } from "lucide-react";

export default function ResetPassword({ token, email }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    token,
    email,
    password: "",
    password_confirmation: "",
  });

  const animationFrameRef = useRef(null);
  const [animatePanel, setAnimatePanel] = useState(false);

  const triggerPanelAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setAnimatePanel(false);
    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = requestAnimationFrame(() => setAnimatePanel(true));
    });
  }, []);

  useEffect(() => {
    triggerPanelAnimation();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      reset("password", "password_confirmation");
    };
  }, [triggerPanelAnimation, reset]);

  const submit = (event) => {
    event.preventDefault();
    post(route("password.store"));
  };

  return (
    <GuestLayout>
      <Head title="Reset Password" />

      <div className="min-h-screen flex items-center justify-center bg-blue-100 dark:bg-[#001d3d] font-[Poppins]">
        <div
          className="flex flex-col md:flex-row w-full max-w-4xl shadow-2xl rounded-2xl overflow-hidden bg-white/90 dark:bg-[#003566]"
          style={{
            transition: "transform 600ms ease, opacity 600ms ease",
            transform: animatePanel ? "translateY(0)" : "translateY(24px)",
            opacity: animatePanel ? 1 : 0,
          }}
        >
          <div className="md:w-1/2 relative overflow-hidden bg-[#162a66]/10 dark:bg-[#042047]/60">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/40 via-white/30 to-white/10 dark:from-white/10 dark:via-white/5 dark:to-transparent"
              style={{
                transform: animatePanel ? "translateX(0%)" : "translateX(100%)",
                transition: "transform 800ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />

            <div
              className="relative z-10 p-10 flex flex-col justify-center items-center text-center gap-4 dark:text-white"
              style={{
                transform: animatePanel ? "translateX(0)" : "translateX(32px)",
                opacity: animatePanel ? 1 : 0,
                transition: "transform 600ms ease-out 120ms, opacity 600ms ease-out 120ms",
              }}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-semibold">Create a Secure Password</h1>
              <p className="max-w-sm text-sm text-slate-600 dark:text-slate-200">
                Choose a new password that you haven't used before. Strong passwords combine letters, numbers, and
                symbols.
              </p>
            </div>
          </div>

          <div className="md:w-1/2 relative overflow-hidden bg-[#071740]/95 dark:bg-[#002855]">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f63] via-[#071740] to-[#071740]"
              style={{
                transform: animatePanel ? "translateX(0%)" : "translateX(100%)",
                transition: "transform 820ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />

            <form
              onSubmit={submit}
              className="relative z-10 p-10 space-y-5 text-white"
              style={{
                transform: animatePanel ? "translateX(0)" : "translateX(24px)",
                opacity: animatePanel ? 1 : 0,
                transition: "transform 600ms ease-out 160ms, opacity 600ms ease-out 160ms",
              }}
            >
              <header className="space-y-2">
                <h2 className="text-2xl font-light">Reset Access</h2>
                <h3 className="text-2xl font-bold">Set New Password</h3>
                <p className="text-xs text-blue-100/90">
                  Your password should be at least 12 characters long and include upper, lower, number, and symbol.
                </p>
              </header>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-blue-100/90">
                  Email Address
                </label>
                <TextInput
                  id="email"
                  type="email"
                  name="email"
                  value={data.email}
                  className="mt-1 block w-full rounded-md border border-white/20 bg-white/90 py-2 text-slate-900 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  autoComplete="username"
                  onChange={(event) => setData("email", event.target.value)}
                  required
                />
                <InputError message={errors.email} className="mt-1" />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-blue-100/90">
                  New Password
                </label>
                <div className="relative">
                  <TextInput
                    id="password"
                    type="password"
                    name="password"
                    value={data.password}
                    className="mt-1 block w-full rounded-md border border-white/20 bg-white/90 py-2 pr-10 text-slate-900 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    autoComplete="new-password"
                    isFocused
                    onChange={(event) => setData("password", event.target.value)}
                    required
                  />
                  <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                <InputError message={errors.password} className="mt-1" />
              </div>

              <div className="space-y-2">
                <label htmlFor="password_confirmation" className="text-sm font-medium text-blue-100/90">
                  Confirm Password
                </label>
                <TextInput
                  id="password_confirmation"
                  type="password"
                  name="password_confirmation"
                  value={data.password_confirmation}
                  className="mt-1 block w-full rounded-md border border-white/20 bg-white/90 py-2 text-slate-900 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  autoComplete="new-password"
                  onChange={(event) => setData("password_confirmation", event.target.value)}
                  required
                />
                <InputError message={errors.password_confirmation} className="mt-1" />
              </div>

              <PrimaryButton className="w-full justify-center py-2" disabled={processing}>
                {processing ? "Saving" : "Reset Password"}
              </PrimaryButton>
            </form>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
