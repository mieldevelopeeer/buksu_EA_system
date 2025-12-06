import React, { useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, useForm } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { ArrowLeft, Save, Upload } from "lucide-react";
import Swal from "sweetalert2";

const admissionTypes = ["Freshman", "Continuing", "Transferee", "Returnee", "Shiftee"];
const transferStatuses = ["None", "Pending", "Transferred", "Unenrolled"];
const studentStatuses = ["Regular", "Irregular"];
const suffixOptions = ["Jr.", "Sr.", "II", "III", "IV", "V"];
const genderOptions = ["Male", "Female", "Other"];
const OPTIONAL_NOTE = "(If applicable)";

const normalizeRequirementTarget = (value) => {
    if (value === undefined || value === null) {
        return "";
    }

    const text = value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/students?$/i, "")
        .replace(/applicants?$/i, "")
        .replace(/\s+/g, " ")
        .trim();

    const aliasMap = {
        freshman: "freshmen",
        freshmen: "freshmen",
        "new student": "freshmen",
        "new students": "freshmen",
        transferee: "transferee",
        transferees: "transferee",
        transfer: "transferee",
        continuing: "continuing",
        continue: "continuing",
        returnee: "returnee",
        returnees: "returnee",
        shiftee: "shiftee",
        shiftees: "shiftee",
        shift: "shiftee",
        all: "all",
        "all student": "all",
        "all students": "all",
        "all applicant": "all",
        "all applicants": "all",
    };

    return aliasMap[text] ?? text;
};

const cleanupRequirementPreviews = (entries = []) => {
    entries.forEach((entry) => {
        const preview = entry?.previewUrl;
        if (typeof preview === "string" && preview.startsWith("blob:")) {
            URL.revokeObjectURL(preview);
        }
    });
};

const logValidationIssues = (issues = {}) => {
    const entries = Object.entries(issues);

    if (!entries.length || typeof console === "undefined") {
        return;
    }

    console.groupCollapsed("[StudentProfileCreate] Validation warnings");
    entries.forEach(([field, message]) => {
        console.warn(`Field: ${field}`, message);
    });
    console.groupEnd();
};

export default function StudentProfileCreate({ campuses = [], requirementOptions = [] }) {
    const resolvedDefaultCampus = useMemo(() => {
        if (!campuses.length) {
            return "Alubijid";
        }

        const match = campuses.find((campus) =>
            campus?.toString().trim().toLowerCase() === "alubijid"
        );

        return match ?? campuses[0];
    }, [campuses]);

    const { data, setData, post, processing, errors } = useForm({
        // users table
        fName: "",
        mName: "",
        lName: "",
        suffix: "",
        id_number: "",
        contact_no: "",
        address: "",
        profession: "",
        gender: "Other",
        date_of_birth: "",
        profile_picture: null,
        email: "",
        username: "",

        // student details table
        campus: resolvedDefaultCampus,
        birth_date: "",
        place_of_birth: "",
        height_ft: "",
        weight_kg: "",
        contact_number: "",
        email_address: "",
        exam_result: "",

        current_address_street: "",
        current_address_barangay: "",
        current_address_municipality: "",
        current_address_province: "",

        home_address_street: "",
        home_address_barangay: "",
        home_address_municipality: "",
        home_address_province: "",

        father_name: "",
        father_contact: "",
        father_occupation: "",
        mother_maiden_name: "",
        mother_contact: "",
        mother_occupation: "",
        guardian_name: "",
        guardian_contact: "",
        guardian_occupation: "",

        last_school_attended: "",
        college_name: "",
        college_year_graduated: "",
        senior_high_school_name: "",
        senior_high_school_year_graduated: "",
        junior_high_school_name: "",
        junior_high_school_year_graduated: "",
        elementary_school_name: "",
        elementary_school_year_graduated: "",

        admission_type: "Freshman",
        transfer_status: "None",
        student_status: "Regular",
        requirements: [],
    });

    const [clientErrors, setClientErrors] = useState({});

    const clearClientError = (field) => {
        setClientErrors((previous) => {
            if (!previous[field]) {
                return previous;
            }

            const next = { ...previous };
            delete next[field];
            return next;
        });
    };

    const handleChange = (field, value) => {
        if (field === "profile_picture" && value?.target?.files?.[0]) {
            setData(field, value.target.files[0]);
        } else {
            setData(field, value);
        }

        clearClientError(field);
    };

    const admissionRequirementLookup = useMemo(() => {
        const map = new Map();
        const universal = [];

        const normalizeTargets = (raw) => {
            if (Array.isArray(raw)) {
                return raw.map((value) => String(value).trim()).filter(Boolean);
            }

            if (typeof raw === "string") {
                return raw
                    .split(/[,/]/)
                    .map((value) => value.trim())
                    .filter(Boolean);
            }

            return [];
        };

        requirementOptions.forEach((option) => {
            const targets = normalizeTargets(option.required_for);
            const normalizedTargets = targets
                .map(normalizeRequirementTarget)
                .filter(Boolean);

            if (normalizedTargets.length === 0) {
                universal.push(option);
                return;
            }

            let assigned = false;

            normalizedTargets.forEach((target) => {
                if (target === "all") {
                    universal.push(option);
                    assigned = true;
                    return;
                }

                if (!map.has(target)) {
                    map.set(target, []);
                }

                map.get(target).push(option);
                assigned = true;
            });

            if (!assigned) {
                universal.push(option);
            }
        });

        return { map, universal };
    }, [requirementOptions]);

    useEffect(() => {
        if (!data.campus || data.campus === "Alubijid") {
            setData("campus", resolvedDefaultCampus);
        }
    }, [resolvedDefaultCampus]);

    const requirementsRef = useRef(data.requirements);

    useEffect(() => {
        requirementsRef.current = data.requirements;
    }, [data.requirements]);

    useEffect(() => {
        return () => {
            cleanupRequirementPreviews(requirementsRef.current);
        };
    }, []);

    useEffect(() => {
        if (!requirementOptions.length) {
            return;
        }

        const admissionKey = normalizeRequirementTarget(data.admission_type);

        if (!admissionKey) {
            if (data.requirements?.length) {
                cleanupRequirementPreviews(data.requirements);
                setData("requirements", []);
            }
            return;
        }

        const { map, universal } = admissionRequirementLookup;

        const autoOptions = [
            ...universal,
            ...(map.get(admissionKey) || []),
        ];

        if (autoOptions.length === 0) {
            if (data.requirements?.length) {
                cleanupRequirementPreviews(data.requirements);
                setData("requirements", []);
            }
            return;
        }

        const autoIds = Array.from(
            new Set(autoOptions.map((option) => String(option.id)))
        );

        const existingById = new Map(
            (data.requirements || []).map((entry) => [
                String(entry.requirement_id),
                entry,
            ])
        );

        const previousEntries = data.requirements || [];

        const nextRequirements = autoIds.map((id) =>
            existingById.get(id) ?? {
                requirement_id: id,
                is_submitted: false,
                image: null,
                previewUrl: null,
            }
        );

        const hasChanged =
            nextRequirements.length !== (data.requirements || []).length ||
            nextRequirements.some((entry, index) => {
                const previous = data.requirements?.[index];
                return String(previous?.requirement_id ?? "") !== String(entry.requirement_id ?? "");
            });

        if (hasChanged) {
            const removedEntries = previousEntries.filter(
                (entry) => !autoIds.includes(String(entry.requirement_id))
            );

            if (removedEntries.length) {
                cleanupRequirementPreviews(removedEntries);
            }

            setData("requirements", nextRequirements);
            setClientErrors((previous) => {
                if (!Object.keys(previous).some((key) => key.startsWith("requirements."))) {
                    return previous;
                }

                const next = { ...previous };
                Object.keys(next).forEach((key) => {
                    if (key.startsWith("requirements.")) {
                        delete next[key];
                    }
                });
                return next;
            });
        }
    }, [data.admission_type, data.requirements, admissionRequirementLookup, requirementOptions, setData]);

    const validateForm = () => {
        const nextErrors = {};

        const requiredFields = {
            fName: "First name is required.",
            lName: "Last name is required.",
            gender: "Please select a gender.",
            email: "Email address is required.",
            admission_type: "Please select an admission type.",
            transfer_status: "Please select a transfer status.",
            student_status: "Please select a student status.",
        };

        Object.entries(requiredFields).forEach(([field, message]) => {
            if (!String(data[field] ?? "").trim()) {
                nextErrors[field] = message;
            }
        });

        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            nextErrors.email = "Enter a valid email address.";
        }

        const requirementWarnings = {};

        (data.requirements || []).forEach((entry, index) => {
            if (!entry?.image) {
                requirementWarnings[`requirements.${index}.image`] = "Proof image is still missing.";
            }
        });

        const combinedErrors = { ...nextErrors, ...requirementWarnings };
        logValidationIssues(combinedErrors);
        setClientErrors(combinedErrors);

        return Object.keys(combinedErrors).length === 0;
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!validateForm()) {
            return;
        }

        post(route("registrar.students.profile.store"), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                Swal.fire({
                    icon: "success",
                    title: "Student profile created",
                    timer: 2000,
                    showConfirmButton: false,
                });
            },
            onError: () => {
                Swal.fire({
                    icon: "error",
                    title: "Submission failed",
                    text: "Please review the highlighted fields.",
                });
            },
        });
    };

    const handleRequirementFileChange = (index, event) => {
        const file = event.target.files?.[0] ?? null;
        const nextRequirements = data.requirements.map((entry, entryIndex) => {
            if (entryIndex !== index) {
                return entry;
            }

            if (entry?.previewUrl) {
                cleanupRequirementPreviews([entry]);
            }

            if (!file) {
                return {
                    ...entry,
                    image: null,
                    is_submitted: false,
                    previewUrl: null,
                };
            }

            const previewUrl = URL.createObjectURL(file);

            return {
                ...entry,
                image: file,
                is_submitted: true,
                previewUrl,
            };
        });

        setData("requirements", nextRequirements);
        clearClientError(`requirements.${index}.image`);
    };

    const getFieldError = (field) => clientErrors[field] ?? errors[field];
    const getRequirementError = (index, field) =>
        clientErrors[`requirements.${index}.${field}`] ?? errors[`requirements.${index}.${field}`];

    const renderInput = (name, label, options = {}) => {
        const { wrapperClass = "", onChange, className, required = false, note, ...inputProps } = options;
        const errorMessage = getFieldError(name);
        const baseClass = `w-full rounded-lg border ${errorMessage ? "border-red-400" : "border-slate-200"} bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200`;
        const handleInputChange = onChange ?? ((e) => handleChange(name, e.target.value));
        const labelNote = note !== undefined ? note : (!required ? OPTIONAL_NOTE : "");

        return (
            <div className={`flex flex-col gap-1 ${wrapperClass}`}>
                <label htmlFor={name} className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span>{label}</span>
                    {required ? (
                        <span className="ml-1 text-red-500">*</span>
                    ) : labelNote ? (
                        <span className="ml-1 text-[10px] font-normal capitalize text-slate-400">{labelNote}</span>
                    ) : null}
                </label>
                <input
                    id={name}
                    name={name}
                    value={data[name] ?? ""}
                    onChange={handleInputChange}
                    className={className ? `${baseClass} ${className}` : baseClass}
                    required={required}
                    {...inputProps}
                />
                {errorMessage && <span className="text-xs text-red-500">{errorMessage}</span>}
            </div>
        );
    };

    const renderSelect = (name, label, options, selectOptions = {}) => {
        const {
            wrapperClass = "",
            onChange,
            className,
            includePlaceholder,
            note,
            required = false,
            placeholderLabel = "Select",
            ...rest
        } = selectOptions;
        const errorMessage = getFieldError(name);
        const baseClass = `w-full rounded-lg border ${errorMessage ? "border-red-400" : "border-slate-200"} bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200`;
        const handleSelectChange = onChange ?? ((e) => handleChange(name, e.target.value));
        const labelNote = note !== undefined ? note : (!required ? OPTIONAL_NOTE : "");
        const shouldIncludePlaceholder = includePlaceholder !== undefined ? includePlaceholder : !required;

        return (
            <div className={`flex flex-col gap-1 ${wrapperClass}`}>
                <label htmlFor={name} className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span>{label}</span>
                    {required ? (
                        <span className="ml-1 text-red-500">*</span>
                    ) : labelNote ? (
                        <span className="ml-1 text-[10px] font-normal capitalize text-slate-400">{labelNote}</span>
                    ) : null}
                </label>
                <select
                    id={name}
                    name={name}
                    value={data[name] ?? ""}
                    onChange={handleSelectChange}
                    className={className ? `${baseClass} ${className}` : baseClass}
                    required={required}
                    {...rest}
                >
                    {shouldIncludePlaceholder && <option value="">{placeholderLabel}</option>}
                    {options.map((option) => (
                        <option key={option.value ?? option} value={option.value ?? option}>
                            {option.label ?? option}
                        </option>
                    ))}
                </select>
                {errorMessage && <span className="text-xs text-red-500">{errorMessage}</span>}
            </div>
        );
    };

    return (
        <RegistrarLayout>
            <div className="flex min-h-screen flex-col overflow-y-auto bg-gradient-to-br from-white via-blue-50/40 to-slate-50">
                <Head title="Add Student Information" />

                <div className="mx-auto w-full max-w-6xl px-4 py-8">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900">Add Student Information</h1>
                            <p className="text-xs text-slate-500">
                                Provide personal, contact, and academic history details for the new student.
                            </p>
                        </div>

                        <Link
                            href={route("registrar.students.profile")}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back to Student Profiles
                        </Link>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <section className="rounded-2xl border border-blue-100 bg-white/95 p-5 shadow-sm">
                            <h2 className="text-base font-semibold text-slate-800">A. General Information</h2>
                            <p className="mb-4 text-xs text-slate-500">Match the Personal Data Sheet fields for student identity.</p>

                            <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-4">
                                    {renderInput("id_number", "Student Number", { wrapperClass: "md:col-span-4", note: OPTIONAL_NOTE })}
                                </div>

                                <div className="grid gap-4 md:grid-cols-1">
                                    {renderSelect(
                                        "campus",
                                        "Campus",
                                        (campuses.length ? campuses : ["Main", "Alubijid", "Other"]).map((campus) => ({ value: campus, label: campus })),
                                        { wrapperClass: "md:col-span-1", note: OPTIONAL_NOTE }
                                    )}
                                </div>

                                <div className="grid gap-4 md:grid-cols-4">
                                    {renderInput("lName", "Last Name", { required: true })}
                                    {renderInput("fName", "First Name", { required: true })}
                                    {renderInput("mName", "Middle Name")}
                                    {renderSelect("suffix", "Suffix", suffixOptions)}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {renderSelect(
                                        "gender",
                                        "Gender",
                                        genderOptions.map((gender) => ({ value: gender, label: gender })),
                                        { required: true, includePlaceholder: false }
                                    )}
                                </div>

                                <div className="grid gap-4 md:grid-cols-4">
                                    {renderInput("birth_date", "Birth Date", {
                                        type: "date",
                                        wrapperClass: "md:col-span-2",
                                        onChange: (e) => {
                                            const value = e.target.value;
                                            handleChange("birth_date", value);
                                            handleChange("date_of_birth", value);
                                        },
                                    })}
                                    {renderInput("place_of_birth", "Place of Birth", { wrapperClass: "md:col-span-2" })}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {renderInput("height_ft", "Height (ft.)", {
                                        note: OPTIONAL_NOTE,
                                        type: "number",
                                        step: "0.01",
                                        inputMode: "decimal",
                                        min: "0",
                                    })}
                                    {renderInput("weight_kg", "Weight (kg.)", { note: OPTIONAL_NOTE })}
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    {renderInput("contact_number", "Contact Number", {
                                        onChange: (e) => {
                                            const value = e.target.value;
                                            handleChange("contact_number", value);
                                            handleChange("contact_no", value);
                                        },
                                    })}
                                    {renderInput("email_address", "Email Address", {
                                        type: "email",
                                        required: true,
                                        onChange: (e) => {
                                            const value = e.target.value;
                                            handleChange("email_address", value);
                                            handleChange("email", value);
                                        },
                                    })}
                                    {renderInput("exam_result", "Exam Result")}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-blue-100 bg-white/95 p-5 shadow-sm">
                            <h2 className="text-base font-semibold text-slate-800">B. Addresses and Contacts</h2>
                            <div className="space-y-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                    {renderInput("current_address_street", "Current Address: St., Brgy.", { note: OPTIONAL_NOTE })}
                                    {renderInput("current_address_municipality", "Current Address: Mun., Province", { note: OPTIONAL_NOTE })}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {renderInput("home_address_street", "Home Address: St., Brgy.", { note: OPTIONAL_NOTE })}
                                    {renderInput("home_address_municipality", "Home Address: Mun., Province", { note: OPTIONAL_NOTE })}
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    {renderInput("father_name", "Father's Name", { note: OPTIONAL_NOTE })}
                                    {renderInput("father_contact", "Contact No.", { note: OPTIONAL_NOTE })}
                                    {renderInput("father_occupation", "Occupation", { note: OPTIONAL_NOTE })}

                                    {renderInput("mother_maiden_name", "Mother's Maiden Name", { note: OPTIONAL_NOTE })}
                                    {renderInput("mother_contact", "Contact No.", { note: OPTIONAL_NOTE })}
                                    {renderInput("mother_occupation", "Occupation", { note: OPTIONAL_NOTE })}

                                    {renderInput("guardian_name", "Guardian's Name", { note: OPTIONAL_NOTE })}
                                    {renderInput("guardian_contact", "Contact No.", { note: OPTIONAL_NOTE })}
                                    {renderInput("guardian_occupation", "Occupation", { note: OPTIONAL_NOTE })}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-blue-100 bg-white/95 p-5 shadow-sm">
                            <h2 className="text-base font-semibold text-slate-800">C. Educational Background</h2>
                            <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-1">
                                    {renderInput("last_school_attended", "Last School Attended")}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {renderInput("college_name", "College")}
                                    {renderInput("college_year_graduated", "Year Graduated", {
                                        type: "number",
                                        min: "1900",
                                        max: new Date().getFullYear(),
                                    })}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {renderInput("senior_high_school_name", "Senior High School")}
                                    {renderInput("senior_high_school_year_graduated", "Year Graduated", {
                                        type: "number",
                                        min: "1900",
                                        max: new Date().getFullYear(),
                                    })}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {renderInput("junior_high_school_name", "Junior High School")}
                                    {renderInput("junior_high_school_year_graduated", "Year Graduated", {
                                        type: "number",
                                        min: "1900",
                                        max: new Date().getFullYear(),
                                    })}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {renderInput("elementary_school_name", "Elementary")}
                                    {renderInput("elementary_school_year_graduated", "Year Graduated", {
                                        type: "number",
                                        min: "1900",
                                        max: new Date().getFullYear(),
                                    })}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-blue-100 bg-white/95 p-5 shadow-sm">
                            <h2 className="text-base font-semibold text-slate-800">System Details</h2>
                            <div className="grid gap-4 md:grid-cols-3">
                                {renderSelect("admission_type", "Admission Type", admissionTypes, { required: true, includePlaceholder: false })}
                                {renderSelect("transfer_status", "Transfer Status", transferStatuses, { required: true, includePlaceholder: false })}
                                {renderSelect("student_status", "Student Status", studentStatuses, { required: true, includePlaceholder: false })}
                            </div>
                        </section>

                        <section className="space-y-4 rounded-2xl border border-blue-100 bg-white/95 p-5 shadow-sm">
                            <div>
                                <h2 className="text-base font-semibold text-slate-800">Enrollment Requirements</h2>
                                <p className="text-xs text-slate-500">
                                    Upload the documents required for the selected admission type. Fields appear automatically based on the selection above.
                                </p>
                            </div>

                            {requirementOptions.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                                    No requirement definitions available.
                                </div>
                            ) : data.requirements.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/60 px-4 py-6 text-center text-xs text-blue-600">
                                    Select an admission type to view its required documents.
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {data.requirements.map((entry, index) => {
                                        const matchingOption = requirementOptions.find(
                                            (option) => String(option.id) === String(entry.requirement_id)
                                        );
                                        const label = matchingOption ? matchingOption.name : "Requirement";
                                        const previewUrl =
                                            entry?.previewUrl ??
                                            (typeof entry?.image === "string" && entry.image
                                                ? entry.image.startsWith("http")
                                                    ? entry.image
                                                    : `/storage/${entry.image}`
                                                : null);
                                        const fileName =
                                            typeof entry?.image === "string"
                                                ? entry.image.split("/").pop()
                                                : entry?.image?.name;

                                        return (
                                            <div key={`requirement-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                            {label}
                                                        </span>
                                                        {matchingOption?.description && (
                                                            <span className="text-[10px] text-slate-500">
                                                                {matchingOption.description}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100">
                                                            <Upload className="h-4 w-4" />
                                                            Upload proof
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(event) => handleRequirementFileChange(index, event)}
                                                            />
                                                        </label>
                                                        {fileName && (
                                                            <span className="text-[11px] text-slate-500">{fileName}</span>
                                                        )}
                                                    </div>

                                                    {previewUrl && (
                                                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                                            <img
                                                                src={previewUrl}
                                                                alt={`${label} proof preview`}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                    )}

                                                    {getRequirementError(index, "image") && (
                                                        <span className="text-[11px] text-red-500">
                                                            {getRequirementError(index, "image")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <div className="flex justify-end gap-3">
                            <Link
                                href={route("registrar.students.profile")}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Save className="h-4 w-4" />
                                Save Student Info
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </RegistrarLayout>
    );
}
