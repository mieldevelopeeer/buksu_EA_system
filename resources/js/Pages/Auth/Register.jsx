import { useEffect } from "react";
import { Head, Link, useForm } from "@inertiajs/react";

export default function Register() {
  const { data, setData, post, processing, errors, reset } = useForm({
    id_number: "",
    fName: "",
    mName: "",
    lName: "",
    username: "",
    email: "",
    password: "",
    password_confirmation: "",
  });

  useEffect(() => {
    return () => {
      reset("password", "password_confirmation");
    };
  }, []);

  const submit = (e) => {
    e.preventDefault();
    post(route("register"));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-6">
      <Head title="Register" />

      <div className="bg-white w-full max-w-3xl p-10 rounded-2xl shadow-xl">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          Create an Account
        </h1>
        <p className="text-gray-500 text-sm mb-8 text-center">
          Fill in your details to get started
        </p>

        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ID Number */}
          <div className="col-span-1">
            <label
              htmlFor="id_number"
              className="block text-sm font-medium text-gray-700"
            >
              ID Number
            </label>
            <input
              id="id_number"
              type="text"
              value={data.id_number}
              onChange={(e) => setData("id_number", e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              required
            />
            {errors.id_number && (
              <p className="text-xs text-red-500 mt-1">{errors.id_number}</p>
            )}
          </div>

          {/* First Name */}
          <div className="col-span-1">
            <label
              htmlFor="fName"
              className="block text-sm font-medium text-gray-700"
            >
              First Name
            </label>
            <input
              id="fName"
              type="text"
              value={data.fName}
              onChange={(e) => setData("fName", e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              required
            />
            {errors.fName && (
              <p className="text-xs text-red-500 mt-1">{errors.fName}</p>
            )}
          </div>

          {/* Middle Name */}
          <div className="col-span-1">
            <label
              htmlFor="mName"
              className="block text-sm font-medium text-gray-700"
            >
              Middle Name
            </label>
            <input
              id="mName"
              type="text"
              value={data.mName}
              onChange={(e) => setData("mName", e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
            {errors.mName && (
              <p className="text-xs text-red-500 mt-1">{errors.mName}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="col-span-1">
            <label
              htmlFor="lName"
              className="block text-sm font-medium text-gray-700"
            >
              Last Name
            </label>
            <input
              id="lName"
              type="text"
              value={data.lName}
              onChange={(e) => setData("lName", e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              required
            />
            {errors.lName && (
              <p className="text-xs text-red-500 mt-1">{errors.lName}</p>
            )}
          </div>

          {/* Username */}
          <div className="col-span-1">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={data.username}
              onChange={(e) => setData("username", e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              required
            />
            {errors.username && (
              <p className="text-xs text-red-500 mt-1">{errors.username}</p>
            )}
          </div>

          {/* Email */}
          <div className="col-span-1">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => setData("email", e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              required
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="col-span-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={data.password}
              onChange={(e) => setData("password", e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              required
            />
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="col-span-1">
            <label
              htmlFor="password_confirmation"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm Password
            </label>
            <input
              id="password_confirmation"
              type="password"
              value={data.password_confirmation}
              onChange={(e) =>
                setData("password_confirmation", e.target.value)
              }
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              required
            />
            {errors.password_confirmation && (
              <p className="text-xs text-red-500 mt-1">
                {errors.password_confirmation}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="col-span-2 flex items-center justify-between pt-4">
            <Link
              href={route("login")}
              className="text-sm text-blue-600 hover:underline"
            >
              Already registered?
            </Link>

            <button
              type="submit"
              disabled={processing}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition text-sm"
            >
              {processing ? "Registering..." : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
