import { useEffect, useState } from 'react';
import { Head, useForm, Link, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Moon, Sun } from 'lucide-react';

export default function Login() {
  const { status, errors } = usePage().props;
  const [darkMode, setDarkMode] = useState(false);

  const { data, setData, post, processing, reset } = useForm({
    username: '',
    password: '',
    remember: false,
  });

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    setDarkMode(theme === 'dark');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = darkMode ? 'light' : 'dark';
    setDarkMode(!darkMode);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };
const submit = (e) => {
  e.preventDefault();

  Swal.fire({
    title: 'Logging in...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  post(route('login.attempt'), {
    onSuccess: () => {
      Swal.close(); // Close loading before redirect
      window.location.reload(); // Reload to follow Inertia redirect properly
    },
    onError: (errors) => {
      setData('password', '');
      Swal.close();

      const messages = [];
      if (errors.username) messages.push(errors.username);
      if (errors.password) messages.push(errors.password);

      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        html: messages.length
          ? messages.map(msg => `<p>${msg}</p>`).join('')
          : 'Invalid username or password.',
        confirmButtonColor: '#3085d6',
      });
    },
    preserveScroll: false,
  });
};


  return (
    <>
      <Head title="Login" />
      <div className="min-h-screen flex items-center justify-center bg-blue-100 dark:bg-[#001d3d] font-[Poppins]">
        <button onClick={toggleTheme} className="absolute top-5 right-5 text-sm px-4 py-2 rounded-full bg-white dark:bg-[#002952] text-gray-800 dark:text-white shadow">
          {darkMode ? <><Sun size={18} /> </> : <><Moon size={18} /> </>}
        </button>

        <div className="flex flex-col md:flex-row w-full max-w-4xl shadow-2xl rounded-2xl overflow-hidden bg-white/90 dark:bg-[#003566]">
          {/* Logo Side */}
          <div className="md:w-1/2 p-10 flex flex-col justify-center items-center text-center dark:text-white">
            <img src="/images/buksu_logo.png" alt="Logo" className="h-24 mb-6" />
            <h1 className="text-2xl font-semibold">Web-Based Enrollment and Academic Management System</h1>
          </div>

          {/* Form Side */}
          <div className="md:w-1/2 bg-[#071740]/90 dark:bg-[#002855] p-10 text-white">
            {status && <div className="mb-4 text-green-400 text-sm">{status}</div>}

            <h2 className="text-2xl font-light mb-2">Welcome User,</h2>
            <h3 className="text-2xl font-bold mb-6">Login</h3>

            <form onSubmit={submit} className="space-y-4">
              <input
                type="text"
                name="username"
                value={data.username}
                onChange={(e) => setData('username', e.target.value)}
                placeholder="Username/ID Number"
                className={`w-full px-4 py-2 rounded-md border bg-white dark:bg-[#001b36] text-black dark:text-white ${errors.username ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.username && <p className="text-red-400 text-sm">{errors.username}</p>}

              <input
                type="password"
                name="password"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
                placeholder="Password"
                className={`w-full px-4 py-2 rounded-md border bg-white dark:bg-[#001b36] text-black dark:text-white ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.password && <p className="text-red-400 text-sm">{errors.password}</p>}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.remember}
                  onChange={(e) => setData('remember', e.target.checked)}
                  className="w-4 h-4"
                />
                Remember me
              </label>

              <button type="submit" disabled={processing} className="w-full py-2 bg-[#0043ec] hover:bg-blue-700 rounded-md font-semibold">
                LOGIN
              </button>

              <div className="text-sm">
                <Link href={route('password.request')} className="text-blue-200 hover:underline">Forgot your password?</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
