import React, { useState, useEffect } from "react";
import { useForm, usePage, router } from "@inertiajs/react";
import { motion } from "framer-motion";
import imageCompression from "browser-image-compression";
import {
  Upload,
  CheckCircle,
  XCircle,
  GraduationCap,
  IdentificationCard,
} from "phosphor-react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import Swal from "sweetalert2";
export default function Enrollment() {
  const { requirements = [], sections = [], yearLevels = [], semesters = [], courses = [] ,schoolYear = null} = usePage().props;
  const [selectedFiles, setSelectedFiles] = useState({});

  // Form state
  const form = useForm({
    id_number: "",
    first_name: "",
    last_name: "",
    middle_name: "",
    suffix: "",
    dob: "",
    gender: "",
    email: "",
    contact: "",
    address: "",
    type: "",
    program: "",
    year_level: "",
    semester: "",
    section: "",
  });

// Add useEffect at the top of your component
useEffect(() => {
  if (form.data.type === "freshmen") {
    // find the freshmen year level (assuming it's named "1st Year" or "Freshman")
    const freshmenYL = yearLevels.find(
      (yl) =>
        yl.year_level.toLowerCase().includes("1") || // matches "1st Year"
        yl.year_level.toLowerCase().includes("fresh") // matches "Freshman"
    );

    if (freshmenYL) {
      form.setData("year_level", freshmenYL.id);
    }
  }
}, [form.data.type, yearLevels]);


// Filtered requirements based on type
const filteredRequirements = requirements.filter((req) => {
  if (!form.data.type) return false; // nothing selected yet
  return req.required_for?.split(",").includes(form.data.type);
});



  useEffect(() => {
    if (semesters.length > 0 && !form.data.semester) {
      form.setData("semester", semesters[0].id); // default to first active
    }
  }, [semesters]);



  const handleFileChange = async (e, reqId) => {
  const file = e.target.files[0];
  if (file) {
    // ✅ Allowed file types
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      alert("Only JPG and PNG images are allowed.");
      return;
    }

    // ✅ Set max size = 5MB
    const maxSize = 5 * 1024 * 1024; // 5 MB

    let finalFile = file;

    if (file.size > maxSize) {
      try {
        // Compression options (compress to <= 5MB)
        const options = {
          maxSizeMB: 5, // target ~5MB
          maxWidthOrHeight: 1920, // resize only if very large
          useWebWorker: true,
        };

        const compressedFile = await imageCompression(file, options);
        finalFile = compressedFile;
      } catch (err) {
        console.error("Image compression error:", err);
        alert("Failed to compress image.");
        return;
      }
    }

    setSelectedFiles((prev) => ({
      ...prev,
      [reqId]: finalFile,
    }));
  }
};
  
  // Submit handler
// Submit handler
const handleSubmit = (e) => {
  e.preventDefault();

  const formData = new FormData();
  Object.keys(form.data).forEach((key) => {
    formData.append(key, form.data[key]);
  });
  Object.keys(selectedFiles).forEach((id) => {
    formData.append(`files[${id}]`, selectedFiles[id]);
  });

  // 🔄 Show loading Swal
  Swal.fire({
    title: "Saving student information...",
    text: "Please wait while we process the enrollment.",
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  router.post(route("program-head.enrollment.submit"), formData, {
    onSuccess: () => {
      Swal.close(); // ✅ close loading before showing success
      setSelectedFiles({});
      form.reset();

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Enrollment submitted successfully!",
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });
    },
    onError: (errors) => {
      Swal.close(); // ✅ close loading before showing error

      // Always display first error (if available) directly in toast
      const firstError =
        errors && Object.values(errors).length > 0
          ? Object.values(errors)[0][0] // first error string
          : "Failed to submit enrollment!";

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: firstError,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    },
  });
};





  // Required fields by student type
  const requiredFieldsByType = {
    freshmen: [
      "first_name",
      "last_name",
      "dob",
      "gender",
      "email",
      "contact",
      "address",
      "program",
      "year_level",
      "semester",
      "section",
    ],
    transferee: [
      "id_number",
      "first_name",
      "last_name",
      "dob",
      "gender",
      "email",
      "program",
      "year_level",
      "section",
    ],
    shiftee: ["id_number", "program", "year_level", "semester", "section"],
    returnee: ["id_number", "program", "year_level", "section"],
    old: ["id_number", "program", "semester", "section"],
  };

  const isRequired = (field) =>
    requiredFieldsByType[form.data.type]?.includes(field);

  return (
    <ProgramHeadLayout>
      {/* Scrollable content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto px-6 py-8 h-[calc(100vh-4rem)] overflow-y-auto"
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Enrollment Form</h1>
          <p className="text-gray-500 text-xs mt-1">
            Select your student type first. Required fields marked{" "}
            <span className="text-red-500">*</span>
          </p>
        </div>
{/* Show School Year */}
{schoolYear && (
  <div className="mb-4 text-center bg-blue-50 border border-blue-200 p-3 rounded-lg">
    <p className="text-sm text-gray-700">
      Academic Year: 
      <span className="font-semibold text-blue-700 ml-1">{schoolYear.school_year}</span>
    </p>
  </div>
)}
        {/* Enrollment Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border p-6 space-y-8"
        >
     {/* Student Type */}
<div>
  <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
    <GraduationCap size={16} className="text-blue-600" />
    Student Type <span className="text-red-500">*</span>
  </label>
  <select
    value={form.data.type}
    onChange={(e) => {
      form.setData("type", e.target.value);
      setSelectedFiles({}); // reset files when type changes
    }}
    className="border rounded-lg px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
    required
  >
    <option value="">-- Select Type --</option>
    <option value="freshmen">Freshmen</option>
    <option value="transferee">Transferee</option>
    <option value="shiftee">Shiftee</option>
    <option value="returnee">Returnee</option>
    <option value="old">Old/Continuing</option>
  </select>
</div>


          {/* Student ID */}
        <div>
  <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
    <IdentificationCard size={15} className="text-indigo-600" />
    Student ID{" "}
    {isRequired("id_number") && <span className="text-red-500">*</span>}
  </label>
  <input
    type="text"
    placeholder="Enter Student ID"
    value={form.data.id_number}
    onChange={(e) => form.setData("id_number", e.target.value)}
    className={`border rounded-lg px-3 py-2 w-full text-sm ${
      form.errors.id_number ? "border-red-500" : ""
    } focus:ring-1 focus:ring-blue-500 focus:outline-none`}
  />
  {form.errors.id_number && (
    <p className="text-xs text-red-500 mt-1">{form.errors.id_number}</p>
  )}
</div>


          {/* Personal Information */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Personal Information
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  First Name{" "}
                  {isRequired("first_name") && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="Enter First Name"
                  value={form.data.first_name}
                  onChange={(e) => form.setData("first_name", e.target.value)}
                  className={`border rounded-lg px-3 py-2 w-full text-sm ${isRequired("first_name") ? "border-red-400" : ""
                    } focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                />
              </div>
             {/* Middle Name */}
<div>
  <label className="block text-xs font-medium text-gray-600 mb-1">
    Middle Name{" "}
    {isRequired("middle_name") && (
      <span className="text-red-500">*</span>
    )}
  </label>
  <input
    type="text"
    placeholder="Enter Middle Name"
    value={form.data.middle_name}   // ✅ Correct binding
    onChange={(e) => form.setData("middle_name", e.target.value)}
    className={`border rounded-lg px-3 py-2 w-full text-sm ${
      isRequired("middle_name") ? "border-red-400" : ""
    } focus:ring-1 focus:ring-blue-500 focus:outline-none`}
  />
</div>


              {/* Last Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Last Name{" "}
                  {isRequired("last_name") && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="Enter Last Name"
                  value={form.data.last_name}
                  onChange={(e) => form.setData("last_name", e.target.value)}
                  className={`border rounded-lg px-3 py-2 w-full text-sm ${isRequired("last_name") ? "border-red-400" : ""
                    } focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                />
              </div>

             {/* Suffix */}
<div>
  <label className="block text-xs font-medium text-gray-600 mb-1">
    Suffix
  </label>
  <select
    value={form.data.suffix}
    onChange={(e) => form.setData("suffix", e.target.value)}
    className="border rounded-lg px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
  >
    <option value="">-- Select Suffix --</option>
    <option value="Jr.">Jr.</option>
    <option value="Sr.">Sr.</option>
    <option value="II">II</option>
    <option value="III">III</option>
    <option value="IV">IV</option>
    <option value="V">V</option>
    <option value="Other">Other</option>
  </select>
</div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date of Birth{" "}
                  {isRequired("dob") && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="date"
                  value={form.data.dob}
                  onChange={(e) => form.setData("dob", e.target.value)}
                  className={`border rounded-lg px-3 py-2 w-full text-sm ${isRequired("dob") ? "border-red-400" : ""
                    } focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Gender{" "}
                  {isRequired("gender") && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <select
                  value={form.data.gender}
                  onChange={(e) => form.setData("gender", e.target.value)}
                  className={`border rounded-lg px-3 py-2 w-full text-sm ${isRequired("gender") ? "border-red-400" : ""
                    } focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                >
                  <option value="">-- Select Gender --</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Email{" "}
                  {isRequired("email") && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="email"
                  placeholder="Enter Email"
                  value={form.data.email}
                  onChange={(e) => form.setData("email", e.target.value)}
                  className={`border rounded-lg px-3 py-2 w-full text-sm ${isRequired("email") ? "border-red-400" : ""
                    } focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                />
              </div>

              {/* Contact */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Contact{" "}
                  {isRequired("contact") && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="Enter Contact Number"
                  value={form.data.contact}
                  onChange={(e) => form.setData("contact", e.target.value)}
                  className={`border rounded-lg px-3 py-2 w-full text-sm ${isRequired("contact") ? "border-red-400" : ""
                    } focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                />
              </div>

              {/* Address (Full Width) */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Address{" "}
                  {isRequired("address") && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="Enter Address"
                  value={form.data.address}
                  onChange={(e) => form.setData("address", e.target.value)}
                  className={`border rounded-lg px-3 py-2 w-full text-sm ${isRequired("address") ? "border-red-400" : ""
                    } focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                />
              </div>
            </div>
          </div>

          {/* Enrollment Details */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Enrollment Details
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Program / Course */}
              <div>

                {/* Program / Course */}

                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Program / Course{" "}
                  {isRequired("program") && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={form.data.program}
                  onChange={(e) => {
                    form.setData("program", e.target.value);
                    form.setData("major", ""); // reset major when program changes
                  }}
                  className={`border rounded-lg px-3 py-2 w-full text-sm ${isRequired("program") ? "border-red-400" : ""
                    } focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                  required
                >
                  <option value="">-- Select Program --</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Major */}
              {(() => {
                const selectedCourse = courses.find(
                  (c) => String(c.id) === String(form.data.program)
                );

                if (selectedCourse?.majors?.length > 0) {
                  return (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Major (if applicable)
                      </label>
                      <select
                        value={form.data.major || ""}
                        onChange={(e) => form.setData("major", e.target.value)}
                        className="border rounded-lg px-3 py-2 w-full text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">-- Select Major --</option>
                        {selectedCourse.majors.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                return null;
              })()}



{/* Year Level */}
<div>
  <label className="block text-xs font-medium text-gray-600 mb-1">
    Year Level{" "}
    {isRequired("year_level") && <span className="text-red-500">*</span>}
  </label>
  <select
    value={form.data.year_level}
    onChange={(e) => {
      form.setData("year_level", e.target.value);
      form.setData("section", ""); // reset section when year changes
    }}
    className={`border rounded-lg px-3 py-2 w-full text-sm ${
      isRequired("year_level") ? "border-red-400" : ""
    } focus:ring-1 focus:ring-blue-500 focus:outline-none`}
  >
    <option value="">-- Select Year Level --</option>
    {yearLevels.map((yl) => (
      <option key={yl.id} value={yl.id}>
        {yl.year_level}
      </option>
    ))}
  </select>
</div>

              {/* Semester */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Semester{" "}
                  {isRequired("semester") && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={form.data.semester}
                  onChange={(e) => form.setData("semester", e.target.value)}
                  disabled // ✅ prevent user editing
                  className={`border rounded-lg px-3 py-2 w-full text-sm bg-gray-100 cursor-not-allowed ${isRequired("semester") ? "border-red-400" : ""
                    }`}
                >
                  <option value="">-- Select Semester --</option>
                  {semesters.map((sem) => (
                    <option key={sem.id} value={sem.id}>
                      {sem.semester} {/* or sem.term if you store it as "1st", "2nd", etc. */}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Section to be Enrolled{" "}
                  {isRequired("section") && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={form.data.section}
                  onChange={(e) => form.setData("section", e.target.value)}
                  className={`border rounded-lg px-3 py-2 w-full text-sm ${isRequired("section") ? "border-red-400" : ""
                    } focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                >
                  <option value="">-- Select Section --</option>
                  {sections
                    .filter(
                      (sec) =>
                        sec.year_level_id === parseInt(form.data.year_level) &&
                        sec.status // ✅ only active sections
                    )
                    .map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.section}
                      </option>
                    ))}
                </select>
              </div>

            </div>

          </div>

{/* Requirements Upload */}
<div>
  <h2 className="text-sm font-semibold text-gray-700 mb-2">
    Requirements Upload
  </h2>
  <div className="grid sm:grid-cols-2 gap-4">
    {filteredRequirements.length > 0 ? (
      filteredRequirements.map((req) => (
        <div
          key={req.id}
          className="border-2 border-dashed rounded-xl p-4 flex flex-col justify-between items-center text-center hover:border-blue-400 hover:bg-blue-50/30 transition"
        >
          {/* Title */}
          <div className="mb-2">
            <h3 className="font-semibold text-gray-800 text-sm">{req.name}</h3>
            <p className="text-xs text-gray-500">{req.description}</p>
          </div>

          {/* Preview */}
          {selectedFiles[req.id] && (
            <div className="mt-2 mb-3">
              <img
                src={URL.createObjectURL(selectedFiles[req.id])}
                alt={req.name}
                className="w-20 h-20 object-cover rounded-lg mx-auto shadow"
              />
              <p className="text-xs text-green-600 mt-1 truncate max-w-[150px] mx-auto">
                {selectedFiles[req.id].name}
              </p>
            </div>
          )}

          {/* Upload Button */}
          <label className="cursor-pointer px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition flex items-center gap-1">
            <Upload size={14} />
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) => handleFileChange(e, req.id)}
            />
            Upload Image
          </label>

          {/* Status */}
          {selectedFiles[req.id] && (
            <CheckCircle className="text-green-600 mt-2" size={18} />
          )}
        </div>
      ))
    ) : (
      <div className="col-span-full text-center py-6 text-gray-400 text-sm">
        <XCircle size={28} className="mx-auto mb-1" />
        <p>
          {form.data.type
            ? "No requirements available for this student type."
            : "Select a student type to view requirements."}
        </p>
      </div>
    )}
  </div>
</div>

          {/* Submit Button */}
          <div className="text-center pt-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-blue-700 transition"
            >
              Submit Enrollment
            </motion.button>
          </div>
        </form>
      </motion.div>
    </ProgramHeadLayout>
  );
}
