import React, { useState, useEffect, useMemo } from "react";
import { Head, useForm, usePage, router } from "@inertiajs/react";
import { motion } from "framer-motion";
import imageCompression from "browser-image-compression";
import axios from "axios";
import {
  Upload,
  CheckCircle,
  XCircle,
  GraduationCap,
  IdentificationCard,
  ClipboardText,
  UserCircle,
  Sparkle,
} from "phosphor-react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import Swal from "sweetalert2";

export default function Enrollment() {
  const {
    requirements = [],
    sections = [],
    yearLevels = [],
    semesters = [],
    courses = [],
    schoolYear = null,
  } = usePage().props;

  const [selectedFiles, setSelectedFiles] = useState({});
  const [studentFound, setStudentFound] = useState(false);
  const [emailStatus, setEmailStatus] = useState({ checking: false, exists: false });

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
    major: "",
  });

  const normalizeType = (value = "") => {
    const key = value.trim().toLowerCase();
    const map = {
      freshman: "freshman",
      freshmen: "freshman",
      transferee: "transferee",
      transferees: "transferee",
      shiftee: "shiftee",
      shiftees: "shiftee",
      returnee: "returnee",
      returnees: "returnee",
      old: "old",
      "old/continuing": "old",
    };

    return map[key] ?? key;
  };

  const activeTypeKey = normalizeType(form.data.type ?? "");

  // Auto-fill existing student by ID
  useEffect(() => {
    const delay = setTimeout(() => {
      if (!form.data.id_number) return;
      axios
        .post(route("program-head.enrollment.checkStudent"), {
          id_number: form.data.id_number,
        })
        .then((res) => {
          if (res.data.exists) {
            const s = res.data.student;
            setStudentFound(true);
            form.setData({
              ...form.data,
              type: "Old", 
              first_name: s.fName || "",
              middle_name: s.mName || "",
              last_name: s.lName || "",
              suffix: s.suffix || "",
              dob: s.date_of_birth || "",
             gender: s.gender ? s.gender.toLowerCase() : "",
              email: s.email || "",
              contact: s.contact_no || "",
              address: s.address || "",
              program: s.program_id || "",
              year_level: s.year_level_id || "",
              section: s.section_id || "",
              semester: semesters[0]?.id || "",
            });
          } else {
            setStudentFound(false);
          }
        })
        .catch(console.error);
    }, 600);

    return () => clearTimeout(delay);
  }, [form.data.id_number]);

  // Filter requirements by type
  const filteredRequirements = useMemo(() => {
    if (!Array.isArray(requirements) || !activeTypeKey) return [];

    return requirements.filter((req) => {
      if (!req?.required_for) return false;

      const allowedTypes = req.required_for
        .split(",")
        .map((s) => normalizeType(s));

      return allowedTypes.includes(activeTypeKey);
    });
  }, [requirements, activeTypeKey]);

  const uploadedCount = useMemo(() => Object.keys(selectedFiles).length, [selectedFiles]);
  const requirementCount = useMemo(() => filteredRequirements.length, [filteredRequirements]);
  const activeStudentType = useMemo(() => form.data.type || "Select type", [form.data.type]);
  const selectedCourse = useMemo(() => {
    if (!Array.isArray(courses)) return null;
    return (
      courses.find((course) => String(course.id) === String(form.data.program)) ?? null
    );
  }, [courses, form.data.program]);
  const selectedMajor = useMemo(() => {
    if (!selectedCourse || !Array.isArray(selectedCourse.majors)) return null;
    return (
      selectedCourse.majors.find((major) => String(major.id) === String(form.data.major)) ?? null
    );
  }, [selectedCourse, form.data.major]);


  // Auto-set default semester
  useEffect(() => {
    if (semesters.length > 0 && !form.data.semester) {
      form.setData("semester", semesters[0].id);
    }
  }, [semesters]);

  useEffect(() => {
    const rawEmail = (form.data.email || "").trim();
    if (!rawEmail || rawEmail === "@gmail.com") {
      setEmailStatus({ checking: false, exists: false });
      return;
    }

    let cancelled = false;
    setEmailStatus((prev) => ({ ...prev, checking: true }));

    const delay = setTimeout(() => {
      axios
        .post(route("program-head.enrollment.checkEmail"), {
          email: rawEmail,
          id_number: form.data.id_number || null,
        })
        .then((res) => {
          if (cancelled) return;
          setEmailStatus({ checking: false, exists: Boolean(res.data?.exists) });
        })
        .catch((error) => {
          if (cancelled) return;
          console.error("[Enrollment] Email check failed", error);
          setEmailStatus({ checking: false, exists: false });
        });
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(delay);
    };
  }, [form.data.email, form.data.id_number]);

  useEffect(() => {
    const course = selectedCourse;
    if (!course) return;

    const majors = Array.isArray(course.majors) ? course.majors : [];
    const requiresMajor = majors.length > 0;
    const majorId = requiresMajor ? form.data.major : null;

    if (requiresMajor && !majorId) return;

    let cancelled = false;

    axios
      .post(route("program-head.enrollment.checkCurriculum"), {
        course_id: course.id,
        major_id: requiresMajor ? majorId : null,
      })
      .then((res) => {
        if (cancelled) return;

        const hasCurriculum = Boolean(res.data?.has_curriculum);
        const courseLabel = course.name || course.code || "Selected course";
        const majorLabel = majors.find((m) => String(m.id) === String(majorId))?.name;
        const targetLabel = majorLabel ? `${courseLabel} – ${majorLabel}` : courseLabel;

        if (hasCurriculum) {
          Swal.fire({
            icon: "success",
            title: "Curriculum available",
            text: `${targetLabel} already has an assigned curriculum.`,
            timer: 2200,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            icon: "warning",
            title: "Curriculum missing",
            text: `No curriculum found for ${targetLabel}.`,
          });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[Enrollment] Curriculum check failed", error);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCourse, form.data.program, form.data.major]);

  // File upload
  const handleFileChange = async (e, reqId) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      return alert("Only JPG and PNG images are allowed.");
    }

    let finalFile = file;
    if (file.size > 5 * 1024 * 1024) {
      try {
        finalFile = await imageCompression(file, {
          maxSizeMB: 5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
      } catch (err) {
        console.error(err);
        return alert("Failed to compress image.");
      }
    }

    setSelectedFiles((prev) => ({ ...prev, [reqId]: finalFile }));
  };

  // Submit form
  const handleSubmit = (e) => {
    e.preventDefault();

    if (emailStatus.exists) {
      Swal.fire({
        icon: "error",
        title: "Email already in use",
        text: "Please provide a unique email address before submitting the enrollment.",
      });
      return;
    }

    if (emailStatus.checking) {
      Swal.fire({
        icon: "info",
        title: "Checking email",
        text: "Please wait while we finish validating the email address.",
        timer: 1800,
        showConfirmButton: false,
      });
      return;
    }

    const formData = new FormData();
    Object.keys(form.data).forEach((key) => formData.append(key, form.data[key]));
    Object.keys(selectedFiles).forEach((id) => formData.append(`files[${id}]`, selectedFiles[id]));

    Swal.fire({
      title: "Saving student information...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    router.post(route("program-head.enrollment.submit"), formData, {
      onSuccess: (page) => {
        Swal.close();
        setSelectedFiles({});
        setStudentFound(false);
        form.reset();

        const redirectUrl =
          page?.props?.flash?.redirect_to_subject_load ||
          page?.props?.redirect_to_subject_load ||
          null;

        if (redirectUrl) {
          router.visit(redirectUrl);
          return;
        }

        if (!page?.props?.enrollment_id && !page?.props?.enrollment?.id) {
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Enrollment submitted successfully!",
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
          });
        }
      },
      onError: (errors) => {
        console.error("[Enrollment] Submission failed", errors);
        Swal.close();

        if (errors && Object.keys(errors).length > 0) {
          const errorList = Object.values(errors)
            .flat()
            .map((err) => `<li>${err}</li>`)
            .join("");

          Swal.fire({
            icon: "error",
            title: "Validation Errors",
            html: `<ul style="text-align: left;">${errorList}</ul>`,
          });
        } else {
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "error",
            title: "Failed to submit enrollment!",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          });
        }
      },

    });
  };

  // Required fields
  const requiredFieldsByType = {
    Freshman: [
      "first_name", "last_name", "dob", "gender", "email", "contact", "address", "program", "year_level", "semester", "section",
    ],
    Transferee: [
      "id_number", "first_name", "last_name", "dob", "gender", "email", "program", "year_level", "section",
    ],
    Shiftee: ["id_number", "program", "year_level", "semester", "section"],
    Returnee: ["id_number", "program", "year_level", "section"],
    Old: ["id_number", "program", "semester", "section"],
  };

  const isRequired = (field) => {
    if (!activeTypeKey) return false;

    const matchedEntry = Object.entries(requiredFieldsByType).find(
      ([type]) => normalizeType(type) === activeTypeKey
    );

    return matchedEntry ? matchedEntry[1].includes(field) : false;
  };

  return (
    <ProgramHeadLayout>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="min-h-[calc(100vh-4rem)] overflow-y-auto bg-gradient-to-br from-slate-100 via-slate-50 to-white"
      >
        <div className="mx-auto max-w-5xl px-4 py-6 md:py-8 space-y-6">
          <div className="rounded-2xl border border-slate-200/70 bg-white/95 shadow-[0_16px_32px_rgba(15,23,42,0.08)] ring-1 ring-white/60">
            <div className="flex flex-col gap-3 border-b border-slate-100/70 bg-slate-50/60 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-sky-50/80 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-sky-700">
                  <Sparkle size={11} /> BukSU College Enrollment
                </div>
                <h1 className="text-xl font-semibold text-slate-900 md:text-[1.6rem]">Student Enrollment Overview</h1>
                <p className="text-[12.5px] leading-relaxed text-slate-500">
                  Provide validated information for incoming or continuing students. Required fields are indicated with a
                  <span className="mx-1 font-semibold text-rose-500">*</span> symbol.
                </p>
              </div>

              {form.data.id_number && (
                <div
                  className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm ${
                    studentFound
                      ? "border border-emerald-200/80 bg-emerald-50/90 text-emerald-600"
                      : "border border-amber-200/80 bg-amber-50/90 text-amber-600"
                  }`}
                >
                  <UserCircle size={15} />
                  {studentFound ? "Existing student matched" : "New student record"}
                </div>
              )}
            </div>
            <div className="px-5 py-4">
              {schoolYear && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-sky-100/80 bg-sky-50 px-3 py-2 text-[11.5px] text-slate-600">
                  <ClipboardText size={14} className="text-sky-500" />
                  Academic Year
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 shadow-inner">
                    {schoolYear.school_year}
                  </span>
                </div>
              )}

              <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-sm">
                  <p className="text-[9.5px] font-medium uppercase tracking-wide text-slate-400">Student Type</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-800">{activeStudentType}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-sm">
                  <p className="text-[9.5px] font-medium uppercase tracking-wide text-slate-400">Requirements</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-800">
                    {uploadedCount}/{requirementCount || "—"}
                    <span className="ml-1 text-[10.5px] font-normal text-slate-500">uploaded</span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-sm">
                  <p className="text-[9.5px] font-medium uppercase tracking-wide text-slate-400">Default Semester</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-800">{semesters[0]?.semester || "TBD"}</p>
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm md:p-6"
          >
            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-slate-100 px-3.5 py-3 shadow-inner">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <IdentificationCard size={13} className="text-indigo-500" /> Student ID
                  {isRequired("id_number") && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  placeholder="Enter Student ID"
                  value={form.data.id_number}
                  onChange={(e) => form.setData("id_number", e.target.value)}
                  className={`mt-1.5 w-full rounded-md border px-3 py-1.75 text-[13px] shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 ${
                    form.errors.id_number ? "border-rose-400 bg-rose-50/40" : "border-slate-200 bg-white"
                  }`}
                />
                {form.errors.id_number && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500">{form.errors.id_number}</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-slate-100 px-3.5 py-3 shadow-inner">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <GraduationCap size={13} className="text-blue-500" /> Student Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.data.type}
                  onChange={(e) => {
                    form.setData("type", e.target.value);
                    setSelectedFiles({});
                  }}
                  className="mt-1.5 w-full rounded-md border border-slate-200 px-3 py-1.75 text-[13px] shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 bg-white"
                  required
                >
                  <option value="">-- Select Type --</option>
                  <option value="Freshman">Freshman</option>
                  <option value="Transferee">Transferee</option>
                  <option value="Shiftee">Shiftee</option>
                  <option value="Returnee">Returnee</option>
                  <option value="Old">Old/Continuing</option>
                </select>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-600 text-xs font-semibold">1</span>
                  <h2 className="text-[13.5px] font-semibold text-slate-800">Personal Information</h2>
                </div>
                <span className="rounded-full bg-slate-100/90 px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-500">
                  Step 1 of 3
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-3.5">
                {/* First Name */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
                    First Name
                    {isRequired("first_name") && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter First Name"
                    value={form.data.first_name}
                    onChange={(e) => form.setData("first_name", e.target.value)}
                    className={`border rounded-md px-3 py-1.75 w-full text-[13px] ${isRequired("first_name") ? "border-red-400 bg-rose-50/40" : "border-slate-200/80 bg-slate-50/40"} focus:ring-2 focus:ring-sky-200 focus:outline-none transition-all placeholder:text-slate-400`}
                  />
                </div>
                {/* Middle Name */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
                    Middle Name
                    {isRequired("middle_name") && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Middle Name"
                    value={form.data.middle_name}
                    onChange={(e) => form.setData("middle_name", e.target.value)}
                    className={`border rounded-md px-3 py-1.75 w-full text-[13px] ${isRequired("middle_name") ? "border-red-400 bg-rose-50/40" : "border-slate-200/80 bg-slate-50/40"} focus:ring-2 focus:ring-sky-200 focus:outline-none transition-all placeholder:text-slate-400`}
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
                    Last Name
                    {isRequired("last_name") && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Last Name"
                    value={form.data.last_name}
                    onChange={(e) => form.setData("last_name", e.target.value)}
                    className={`border rounded-md px-3 py-1.75 w-full text-[13px] ${isRequired("last_name") ? "border-red-400 bg-rose-50/40" : "border-slate-200/80 bg-slate-50/40"} focus:ring-2 focus:ring-sky-200 focus:outline-none transition-all placeholder:text-slate-400`}
                  />
                </div>

                {/* Suffix */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">Suffix</label>
                  <select
                    value={form.data.suffix}
                    onChange={(e) => form.setData("suffix", e.target.value)}
                    className="border rounded-md px-3 py-1.75 w-full text-[13px] border-slate-200/80 bg-white focus:ring-2 focus:ring-sky-200 focus:outline-none transition-all"
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
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Date of Birth
                    {isRequired("dob") && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    value={form.data.dob}
                    onChange={(e) => form.setData("dob", e.target.value)}
                    className={`border rounded-md px-3 py-1.5 w-full text-[13px] ${isRequired("dob") ? "border-red-400" : "border-slate-200"} focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Gender
                    {isRequired("gender") && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={form.data.gender}
                    onChange={(e) => form.setData("gender", e.target.value)}
                    className={`border rounded-md px-3 py-1.5 w-full text-[13px] ${isRequired("gender") ? "border-red-400" : "border-slate-200/80"} focus:ring-1 focus:ring-sky-200 focus:outline-none transition-all`}
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
                    Email
                    {isRequired("email") && <span className="text-red-500">*</span>}
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      placeholder="Enter Email"
                      value={form.data.email.replace("@gmail.com", "")}
                      onChange={(e) => form.setData("email", `${e.target.value}@gmail.com`)}
                      className={`border rounded-l-lg px-3 py-2 w-full text-sm ${
                        emailStatus.exists
                          ? "border-rose-400 bg-rose-50/40"
                          : isRequired("email")
                          ? "border-red-400"
                          : "border-slate-200"
                      } focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                    />
                    <span className="inline-flex items-center px-3 py-2 bg-gray-100 border border-l-0 rounded-r-lg text-sm text-gray-600">
                      @gmail.com
                    </span>
                  </div>
                  {emailStatus.exists && (
                    <p className="mt-1 text-[11px] font-medium text-rose-500">
                      This email address is already associated with another student record.
                    </p>
                  )}
                  {emailStatus.checking && !emailStatus.exists && (
                    <p className="mt-1 text-[11px] text-slate-400">Checking email availability…</p>
                  )}
                </div>

                {/* Contact */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Contact
                    {isRequired("contact") && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Contact Number"
                    value={form.data.contact}
                    onChange={(e) => form.setData("contact", e.target.value)}
                    className={`border rounded-md px-3 py-1.5 w-full text-[13px] ${isRequired("contact") ? "border-red-400" : "border-slate-200"} focus:ring-1 focus:ring-blue-500 focus:outline-none`}
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Address
                    {isRequired("address") && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Address"
                    value={form.data.address}
                    onChange={(e) => form.setData("address", e.target.value)}
                    className={`border rounded-md px-3 py-1.5 w-full text-[13px] ${isRequired("address") ? "border-red-400" : "border-slate-200/80"} focus:ring-1 focus:ring-sky-200 focus:outline-none transition-all`}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
                  <ClipboardText size={13} className="text-slate-500" /> Enrollment Details
                </h2>
                <span className="rounded-full bg-slate-100/90 px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-500">
                  Step 2 of 3
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-3.5">
                {/* Program / Course */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Program / Course
                    {isRequired("program") && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={form.data.program}
                    onChange={(e) => {
                      form.setData("program", e.target.value);
                      form.setData("major", "");
                    }}
                    className={`border rounded-md px-3 py-1.5 w-full text-[13px] ${isRequired("program") ? "border-red-400" : "border-slate-200/80"} focus:ring-1 focus:ring-sky-200 focus:outline-none transition-all`}
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
                  const selectedCourse = courses.find((c) => String(c.id) === String(form.data.program));
                  if (selectedCourse?.majors?.length > 0) {
                    return (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Major (if applicable)</label>
                        <select
                          value={form.data.major || ""}
                          onChange={(e) => form.setData("major", e.target.value)}
                          className="border rounded-md px-3 py-1.5 w-full text-[13px] border-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
                  return <div className="hidden md:block" />;
                })()}

                {/* Year Level */}
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Year Level
                    {isRequired("year_level") && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={form.data.year_level}
                    onChange={(e) => {
                      form.setData("year_level", e.target.value);
                      form.setData("section", "");
                    }}
                    className={`border rounded-md px-3 py-1.5 w-full text-[13px] ${isRequired("year_level") ? "border-red-400" : "border-slate-200"} focus:ring-1 focus:ring-blue-500 focus:outline-none`}
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
                  <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
                    Semester
                    {isRequired("semester") && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={form.data.semester}
                    onChange={(e) => form.setData("semester", e.target.value)}
                    disabled
                    className={`border rounded-md px-3 py-1.75 w-full text-[13px] bg-gray-100 text-gray-500 ${isRequired("semester") ? "border-red-400 bg-rose-50/60" : "border-slate-200/80"}`}
                  >
                    <option value="">-- Select Semester --</option>
                    {semesters.map((sem) => (
                      <option key={sem.id} value={sem.id}>
                        {sem.semester}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-600 mb-1">
                    Section to be Enrolled
                    {isRequired("section") && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={form.data.section}
                    onChange={(e) => form.setData("section", e.target.value)}
                    className={`border rounded-md px-3 py-1.75 w-full text-[13px] ${isRequired("section") ? "border-red-400 bg-rose-50/40" : "border-slate-200/80 bg-white"} focus:ring-2 focus:ring-sky-200 focus:outline-none transition-all`}
                  >
                    <option value="">-- Select Section --</option>
                    {sections
                      .filter((sec) => sec.year_level_id === parseInt(form.data.year_level, 10) && sec.status)
                      .map((sec) => {
                        const enrolledCountRaw = sec.enrolled_students_count ?? sec.enrolled_students ?? 0;
                        const limitRaw = sec.student_limit ?? sec.section_limit ?? 0;
                        const parsedEnrolled = Number(enrolledCountRaw);
                        const parsedLimit = Number(limitRaw);
                        const enrolledCount = Number.isFinite(parsedEnrolled) ? parsedEnrolled : 0;
                        const limit = Number.isFinite(parsedLimit) ? parsedLimit : 0;
                        const isFull = limit > 0 ? enrolledCount >= limit : false;
                        const sectionName = sec.section || sec.section_name || `Section ${sec.id}`;
                        const label = limit > 0
                          ? `${sectionName} (${enrolledCount} / ${limit})`
                          : `${sectionName} (${enrolledCount})`;

                        return (
                          <option key={sec.id} value={sec.id} disabled={isFull}>
                            {label}
                            {isFull ? " — Full" : ""}
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-600 text-xs font-semibold">3</span>
                  <h2 className="text-[13.5px] font-semibold text-slate-800">Requirements Upload</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-500">
                  Step 3 of 3
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3.5">
                {filteredRequirements.length > 0 ? (
                  filteredRequirements.map((req) => (
                    <div
                      key={req.id}
                      className="flex h-full flex-col items-center justify-between rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-3.5 text-center transition hover:border-sky-300 hover:bg-sky-50"
                    >
                      <div className="mb-2">
                        <h3 className="font-semibold text-slate-800 text-[13.5px]">{req.name}</h3>
                        <p className="text-[11.5px] text-slate-500 leading-snug">{req.description}</p>
                      </div>
                      {selectedFiles[req.id] && (
                        <div className="mt-2 mb-2.5">
                          <img
                            src={URL.createObjectURL(selectedFiles[req.id])}
                            alt={req.name}
                            className="w-16 h-16 object-cover rounded-md mx-auto shadow"
                          />
                          <p className="text-[11px] text-emerald-600 mt-1 truncate max-w-[140px] mx-auto">
                            {selectedFiles[req.id].name}
                          </p>
                        </div>
                      )}
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-sky-100 px-3 py-1.5 text-[11.5px] font-medium text-sky-700 transition hover:bg-sky-200">
                        <Upload size={12} />
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, req.id)}
                        />
                        Upload Image
                      </label>
                      {selectedFiles[req.id] && <CheckCircle className="text-emerald-500 mt-2" size={16} />}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-5 text-gray-400 text-[13px]">
                    <XCircle size={24} className="mx-auto mb-2 text-slate-300" />
                    {form.data.type
                      ? "No requirements available for this student type."
                      : "Select a student type to view requirements."}
                  </div>
                )}
              </div>
            </section>

            <div className="flex flex-col items-center justify-between gap-2.5 border-t border-slate-100 pt-3 text-center md:flex-row md:text-left">
              <p className="text-[11px] text-slate-500">
                Review the information before submitting. You can re-upload requirements before final submission.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-[12.5px] font-semibold uppercase tracking-wide text-white shadow-[0_12px_24px_rgba(14,165,233,0.25)] transition hover:bg-sky-700"
              >
                <Sparkle size={16} weight="fill" /> Submit Enrollment
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </ProgramHeadLayout>
  );
}
