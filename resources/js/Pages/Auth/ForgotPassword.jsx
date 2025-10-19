import React, { useCallback, useEffect, useRef, useState } from "react";
import GuestLayout from "@/Layouts/GuestLayout";
import InputError from "@/Components/InputError";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import { Head, Link, useForm } from "@inertiajs/react";
import { Moon, Sun, ShieldCheck } from "lucide-react";

export default function ForgotPassword({ status }) {
  const { data, setData, post, processing, errors } = useForm({
    email: "",
  });

  const [acknowledged, setAcknowledged] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [animatePanel, setAnimatePanel] = useState(false);
  const animationFrameRef = useRef(null);

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
    const theme = localStorage.getItem("theme");
    setDarkMode(theme === "dark");
    document.documentElement.classList.toggle("dark", theme === "dark");
    triggerPanelAnimation();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [triggerPanelAnimation]);

  const toggleTheme = () => {
    const newTheme = darkMode ? "light" : "dark";
    setDarkMode(!darkMode);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    triggerPanelAnimation();
  };

  const submit = (event) => {
    event.preventDefault();

    if (!acknowledged) return;

    post(route("password.email"), {
      preserveScroll: true,
    });
  };

  return (
    <GuestLayout>
      <Head title="Forgot Password" />

      <div className="min-h-screen flex items-center justify-center bg-blue-100 dark:bg-[#001d3d] font-[Poppins]">
        <button
          onClick={toggleTheme}
          className="absolute top-5 right-5 text-sm px-4 py-2 rounded-full bg-white dark:bg-[#002952] text-gray-800 dark:text-white shadow flex items-center gap-2"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          {darkMode ? "Light" : "Dark"}
        </button>

        <div
          className="flex flex-col md:flex-row-reverse w-full max-w-4xl shadow-2xl rounded-2xl overflow-hidden bg-white/90 dark:bg-[#003566]"
          style={{
            transition: "transform 420ms ease, opacity 420ms ease",
            transform: animatePanel ? "translateY(0)" : "translateY(14px)",
            opacity: animatePanel ? 1 : 0,
          }}
        >
          <div className="md:w-1/2 p-10 flex flex-col justify-center gap-6 text-center text-slate-700 dark:text-white bg-white/70 dark:bg-[#042047]/80 transition duration-700 ease-out">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Password Assistance</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-200">
                Provide the email tied to your BukSU account. If we recognize it, we'll send secure reset instructions.
                For privacy, we won't confirm whether the address exists.
              </p>
            </div>
            <ul className="space-y-3 text-left text-xs text-slate-500 dark:text-slate-200">
              <li className="flex gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Use an inbox only you can access to keep your account safe.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Reset links expire after 60 minutes—complete the process promptly.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Haven't requested this? Simply ignore the email and your password stays safe.
              </li>
            </ul>
            <div className="text-xs text-slate-500 dark:text-slate-300">
              Remembered your password?{' '}
              <Link href={route('login')} className="font-semibold text-blue-600 hover:underline">
                Go back to login
              </Link>
            </div>
          </div>

          <div className="md:w-1/2 relative overflow-hidden bg-[#162a66] dark:bg-[#002855] transition duration-500 ease-out">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#122b7a] via-[#071e57] to-[#071740]"
              style={{
                transform: animatePanel ? "translateX(0%)" : "translateX(-60%)",
                transition: "transform 520ms ease-out",
              }}
            />

            <div
              className="relative z-10 p-10 text-white"
              style={{
                transform: animatePanel ? "translateX(0)" : "translateX(-14px)",
                opacity: animatePanel ? 1 : 0,
                transition: "transform 420ms ease-out 80ms, opacity 420ms ease-out 80ms",
              }}
            >
            <h2 className="text-2xl font-light mb-2">Reset Access</h2>
            <h3 className="text-2xl font-bold mb-6">Forgot Password</h3>

            {status && (
              <div className="mb-4 rounded-md border border-emerald-300 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-800">
                {status}
              </div>
            )}

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label htmlFor="email" className="text-sm font-medium text-slate-200">
                  Email Address
                </label>
                <TextInput
                  id="email"
                  type="email"
                  name="email"
                  value={data.email}
                  className="mt-2 block w-full rounded-md border border-white/20 bg-white/90 py-2 text-slate-900 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  autoComplete="email"
                  isFocused
                  onChange={(event) => setData("email", event.target.value)}
                  required
                />
                <InputError message={errors.email} className="mt-2" />
              </div>

              <label className="flex items-start gap-3 text-xs text-slate-200">
                <input
                  type="checkbox"
                  className="mt-[2px] h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                <span>
                  I confirm this is my registered email and understand reset instructions will only be sent if this
                  account exists.
                </span>
              </label>

              <PrimaryButton className="w-full justify-center py-2" disabled={processing || !acknowledged}>
                {processing ? "Sending" : "Send Reset Instructions"}
              </PrimaryButton>
            </form>
            </div>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
