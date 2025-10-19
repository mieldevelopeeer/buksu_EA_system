import { useForm, Head, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { KeyRound, Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

export default function ChangePassword() {
  const { flash } = usePage().props;
  const { data, setData, put, processing, errors } = useForm({
    password: "",
    password_confirmation: "",
  });

  const [strength, setStrength] = useState({ label: "", score: 0 });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password rules
  const rules = [
    { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
    { label: "At least 1 uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
    { label: "At least 1 number", test: (pw) => /[0-9]/.test(pw) },
    { label: "At least 1 special character", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
  ];

  // Strength checker
  const checkStrength = (password) => {
    if (!password) return { label: "", score: 0 };
    let score = rules.reduce((acc, rule) => (rule.test(password) ? acc + 1 : acc), 0);

    switch (score) {
      case 1:
        return { label: "Weak", score };
      case 2:
        return { label: "Fair", score };
      case 3:
        return { label: "Good", score };
      case 4:
        return { label: "Strong", score };
      default:
        return { label: "", score: 0 };
    }
  };

  useEffect(() => {
    setStrength(checkStrength(data.password));
  }, [data.password]);

  const submit = (e) => {
    e.preventDefault();
    put(route("password.change.update"), {
      onSuccess: () => {
        Swal.fire({
          icon: "success",
          title: "Password Updated 🎉",
          text: "Your password has been changed successfully.",
          confirmButtonColor: "#2563eb",
        });
      },
      onError: () => {
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: "Please check your inputs and try again.",
          confirmButtonColor: "#dc2626",
        });
      },
    });
  };

  // Progress bar color
  const barColor =
    strength.score === 1
      ? "bg-red-500"
      : strength.score === 2
      ? "bg-yellow-500"
      : strength.score === 3
      ? "bg-blue-500"
      : strength.score === 4
      ? "bg-green-600"
      : "bg-gray-200";

  return (
    <>
      <Head title="Change Password" />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-50 font-[Poppins] px-4">
        <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center w-14 h-14 mx-auto bg-blue-100 text-blue-600 rounded-full mb-3">
              <KeyRound size={28} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Change Password</h2>
            <p className="text-sm text-gray-500 mt-1">
              For security, please set a strong password before continuing.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-5">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={data.password}
                  onChange={(e) => setData("password", e.target.value)}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Strength Indicator */}
              {data.password && (
                <div className="mt-2">
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${(strength.score / 4) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs mt-1 font-medium text-gray-600">
                    Strength:{" "}
                    <span
                      className={
                        strength.score === 1
                          ? "text-red-500"
                          : strength.score === 2
                          ? "text-yellow-500"
                          : strength.score === 3
                          ? "text-blue-500"
                          : strength.score === 4
                          ? "text-green-600"
                          : "text-gray-400"
                      }
                    >
                      {strength.label}
                    </span>
                  </p>

                  {/* ✅ Suggestions */}
                  <ul className="mt-2 space-y-1 text-xs">
                    {rules.map((rule, idx) => {
                      const passed = rule.test(data.password);
                      return (
                        <li
                          key={idx}
                          className={`flex items-center gap-2 ${
                            passed ? "text-green-600" : "text-gray-500"
                          }`}
                        >
                          {passed ? (
                            <CheckCircle size={14} />
                          ) : (
                            <XCircle size={14} />
                          )}
                          {rule.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={data.password_confirmation}
                  onChange={(e) =>
                    setData("password_confirmation", e.target.value)
                  }
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.password_confirmation
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password_confirmation && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.password_confirmation}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={processing}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-md transition"
            >
              {processing ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
