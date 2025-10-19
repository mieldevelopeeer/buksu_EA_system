import { useCallback, useEffect, useRef, useState } from 'react';
import { Head, useForm, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Moon, Sun, User, Lock } from 'lucide-react';

export default function Login() {
  const { status, errors: pageErrors } = usePage().props;
  const [darkMode, setDarkMode] = useState(false);
  const [animatePanel, setAnimatePanel] = useState(false);
  const [showLoadingBar, setShowLoadingBar] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
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

  const { data, setData, post, processing, reset } = useForm({
    username: '',
    password: '',
    remember: false,
  });

  useEffect(() => {
    let interval;

    if (processing) {
      setLoadingProgress(12);
      setShowLoadingBar(true);

      interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 85) {
            return prev;
          }
          const increment = Math.random() * 12;
          return Math.min(prev + increment, 85);
        });
      }, 360);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [processing]);

  useEffect(() => {
    if (!processing && showLoadingBar) {
      setLoadingProgress(100);

      const timeout = setTimeout(() => {
        setShowLoadingBar(false);
        setLoadingProgress(0);
      }, 320);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [processing, showLoadingBar]);

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    const isDark = theme === 'dark';
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
    triggerPanelAnimation();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [triggerPanelAnimation]);

  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
    triggerPanelAnimation();
  }, [triggerPanelAnimation]);

  const handleSubmit = useCallback((event) => {
    event.preventDefault();

    Swal.fire({
      title: 'Logging in...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    post(route('login.attempt'), {
      onSuccess: (page) => {
        Swal.close();

        const user = page.props?.user;
        if (user?.role === 'student' || user?.role === 'students') {
          window.location.href = route('students.dashboard');
          return;
        }

        if (user) {
          window.location.href = route('dashboard');
          return;
        }

        window.location.reload();
      },
      onError: (errors) => {
        Swal.close();
        reset('password');

        const messages = [errors.username, errors.password, errors.error].filter(Boolean);

        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          html: messages.length
            ? messages.map((message) => `<p>${message}</p>`).join('')
            : 'Invalid username or password.',
          confirmButtonColor: '#3085d6',
        });
      },
      onFinish: () => console.log('Login request finished'),
      preserveScroll: false,
    });
  }, [post, reset]);

  return (
    <>
      <Head title="Login" />
      <div className="min-h-screen flex items-center justify-center bg-blue-100 dark:bg-[#001d3d] font-[Poppins] relative">
        {showLoadingBar && (
          <div className="absolute top-0 left-0 right-0 h-1">
            <div className="mx-auto h-full w-full max-w-4xl overflow-hidden rounded-full bg-white/60 dark:bg-white/10 backdrop-blur">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 shadow-[0_0_18px_rgba(59,130,246,0.45)] transition-[width] duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>
        )}
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-5 right-5 text-sm px-4 py-2 rounded-full bg-white dark:bg-[#002952] text-gray-800 dark:text-white shadow flex items-center gap-2"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          {darkMode ? "Light" : "Dark"}
        </button>

        {/* Card */}
        <div
          className="flex flex-col md:flex-row w-full max-w-4xl shadow-2xl rounded-2xl overflow-hidden bg-white/90 dark:bg-[#003566]"
          style={{
            transition: 'transform 600ms ease, opacity 600ms ease',
            transform: animatePanel ? 'translateY(0)' : 'translateY(24px)',
            opacity: animatePanel ? 1 : 0,
          }}
        >
          {/* Logo Side */}
          <div className="md:w-1/2 relative overflow-hidden bg-[#162a66]/10 dark:bg-[#042047]/60">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/40 via-white/30 to-white/10 dark:from-white/10 dark:via-white/5 dark:to-transparent"
              style={{
                transform: animatePanel ? 'translateX(0%)' : 'translateX(100%)',
                transition: 'transform 800ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />

            <div
              className="relative z-10 p-10 flex flex-col justify-center items-center text-center gap-4 dark:text-white"
              style={{
                transform: animatePanel ? 'translateX(0)' : 'translateX(32px)',
                opacity: animatePanel ? 1 : 0,
                transition: 'transform 600ms ease-out 120ms, opacity 600ms ease-out 120ms',
              }}
            >
            <img src="/images/buksu_logo.png" alt="Logo" className="h-24 mb-6" />
            <h1 className="text-2xl font-semibold">
              Web-Based Enrollment and Academic Management System
            </h1>
            <p className="max-w-sm text-sm text-slate-600 dark:text-slate-200">
              Access your enrollment dashboard, track academic records, and manage your progress in one cohesive portal.
            </p>
            </div>
          </div>

          {/* Form Side */}
          <div className="md:w-1/2 relative overflow-hidden bg-[#071740]/95 dark:bg-[#002855]">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f63] via-[#071740] to-[#071740]"
              style={{
                transform: animatePanel ? 'translateX(0%)' : 'translateX(100%)',
                transition: 'transform 820ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />

            <div
              className="relative z-10 p-10 text-white"
              style={{
                transform: animatePanel ? 'translateX(0)' : 'translateX(24px)',
                opacity: animatePanel ? 1 : 0,
                transition: 'transform 600ms ease-out 160ms, opacity 600ms ease-out 160ms',
              }}
            >
            {status && (
              <div className="mb-4 text-green-400 text-sm">{status}</div>
            )}

            <h2 className="text-2xl font-light mb-2">Welcome User,</h2>
            <h3 className="text-2xl font-bold mb-6">Login</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="username"
                  value={data.username}
                  onChange={(e) => setData('username', e.target.value)}
                  placeholder="Username/ID Number"
                  className={`w-full pl-10 pr-4 py-2 rounded-md border bg-white dark:bg-[#001b36] text-black dark:text-white ${
                    pageErrors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {pageErrors.username && (
                <p className="text-red-400 text-sm">{pageErrors.username}</p>
              )}

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  name="password"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  placeholder="Password"
                  className={`w-full pl-10 pr-4 py-2 rounded-md border bg-white dark:bg-[#001b36] text-black dark:text-white ${
                    pageErrors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {pageErrors.password && (
                <p className="text-red-400 text-sm">{pageErrors.password}</p>
              )}

              {/* Remember Me */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.remember}
                  onChange={(e) => setData('remember', e.target.checked)}
                  className="w-4 h-4"
                />
                Remember me
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={processing}
                className="w-full py-2 bg-[#0043ec] hover:bg-blue-700 rounded-md font-semibold"
              >
                LOGIN
              </button>

              {/* Forgot Password */}
              <div className="text-sm">
                <Link
                  href={route('password.request')}
                  className="text-blue-200 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
