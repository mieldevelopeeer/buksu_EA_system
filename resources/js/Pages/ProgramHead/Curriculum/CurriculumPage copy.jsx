import React, { useEffect, useState, useRef } from "react";
import { useForm, usePage, router } from "@inertiajs/react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import { ArrowLeft, PlusCircle, Pencil, UploadSimple, Trash, PencilSimple } from "phosphor-react";
import html2pdf from "html2pdf.js";
import Swal from "sweetalert2";
import Select from "react-select";

export default function CurriculumPage() {
  const { curriculum, curriculumSubjects = [], semesters = [], yearLevels = [] } = usePage().props;

  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [subjectList, setSubjectList] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedType, setSelectedType] = useState("Old");
  const [showActions, setShowActions] = useState(false);

  const form = useForm({
    id: "",
    code: "",
    title: "",
    lec: 0,
    lab: 0,
    prerequisites: "",
    file: null,
    comment :"",
  });

  // Group subjects by year and semester
  const groupedSubjects = curriculumSubjects.reduce((acc, sub) => {
    const semObj = semesters.find((s) => s.id === sub.semesters_id);
    const semName = semObj?.semester || `Semester ${sub.semesters_id}`;

    if (!acc[sub.year_level?.year_level]) acc[sub.year_level?.year_level] = {};
    if (!acc[sub.year_level?.year_level][semName]) acc[sub.year_level?.year_level][semName] = [];
    acc[sub.year_level?.year_level][semName].push(sub);

    return acc;
  }, {});

  // Prepare all years for rendering (including empty years)
  const allYears = yearLevels.map((yl) => ({
    year: yl.year_level,
    subjects: groupedSubjects[yl.year_level] || {}, // empty object if no subjects yet
  }));
  const isApproved = curriculum?.status === "approved";

  const printRef = useRef();

  // Upload curriculum file
  const handleUpload = (e) => {
    e.preventDefault();
    if (!form.data.file) {
      Swal.fire("Error", "Please select a file first.", "error");
      return;
    }
    Swal.fire({
      title: "Uploading...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const formData = new FormData();
    formData.append("file", form.data.file);
    router.post(route("program-head.curricula.uploadFile", curriculum.id), formData, {
      preserveScroll: true,
      forceFormData: true,
      onSuccess: () => {
        Swal.fire("Uploaded!", "File uploaded successfully.", "success");
        form.setData("file", null);
        setShowUploadModal(false);
      },
      onError: () => Swal.fire("Error", "Failed to upload file.", "error"),
    });
  };

// Save subjects to backend
const handleSaveSubject = () => {
  router.post(
    route("program-head.curriculum.storeSubjects", curriculum.id),
    {
      subjects: subjectList.map((s) => ({
        code: s.code,
        title: s.title,
        lec: s.lec || 0,
        lab: s.lab || 0,
        semester_id: s.semester_id,
        prerequisites: s.prerequisites?.length ? s.prerequisites : [],
        type: s.type || "Old",
        year: s.year,
        comment: s.comment || "",   // ✅ include comment
      })),
    },
    {
      preserveScroll: true,
      onSuccess: () => {
        Swal.fire("Success", "Subjects saved successfully!", "success");
        setShowModal(false);
        setSubjectList([]);
      },
      onError: (errors) => {
        console.error(errors);
        Swal.fire("Error", "Failed to save subjects.", "error");
      },
    }
  );
};

// Edit subject
const handleEditSubject = (subject, index) => {
  form.setData({
    id: subject.id,
    code: subject.subject?.code || "",
    title: subject.subject?.descriptive_title || "",
    lec: subject.lec_unit || 0,
    lab: subject.lab_unit || 0,
    prerequisites: subject.prerequisites
      ? subject.prerequisites.map((p) => p.code)
      : [],
    comment: subject.comment || "",   // ✅ preload comment in form
  });
  setSelectedYear(subject.year_level?.year_level || "");
  setSelectedSemester(subject.semesters_id);
  setSelectedType(subject.type || "Old");
  setEditMode(true);
  setEditIndex(index);
  setShowModal(true);
};

const handleUpdateSubject = (e) => {
  e.preventDefault();
  if (editIndex === null) return;

  const updatedSubject = {
    id: form.data.id,
    code: form.data.code,
    title: form.data.title,
    lec: form.data.lec || 0,
    lab: form.data.lab || 0,
    semester_id: selectedSemester,
    year: selectedYear,
    type: selectedType,
    prerequisites: form.data.prerequisites || [],
    comment: form.data.comment || "",   // ✅ include comment
  };

  router.put(
    route("program-head.curriculum.updateSubject", { id: curriculum.id }),
    updatedSubject,
    {
      onSuccess: () => {
        setSubjectList((prev) => {
          const list = [...prev];
          list[editIndex] = updatedSubject;
          return list;
        });

        setEditMode(false);
        setEditIndex(null);
        setShowModal(false);
        form.reset();
        setSelectedYear("");
        setSelectedSemester("");
        setSelectedType("Old");

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Subject updated successfully!",
          showConfirmButton: false,
          timer: 2000,
        });
      },
      onError: (errors) => {
        console.error("Update failed:", errors);
        Swal.fire({
          icon: "error",
          title: "Update failed",
          text: "Please check your input and try again.",
        });
      },
    }
  );
};

  const fetchSubjectTitle = async (code) => {
    if (!code) return;

    try {
      const response = await axios.get(route('program-head.curricula.showSubject', code));
      if (response.data.success) {
        form.setData('title', response.data.subject.title);
      } else {
        form.setData('title', ''); // Clear if not found
      }
    } catch (error) {
      console.error('Failed to fetch subject title:', error);
      form.setData('title', ''); // Clear on error
    }
  };


  // PDF generation
  const handleDownloadPDF = () => {
    const element = printRef.current;
    if (!element) return Swal.fire("Error", "Nothing to export!", "error");
    Swal.fire({
      title: "Generating PDF...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
        html2pdf()
          .set({
            margin: 0.3,
            filename: `${curriculum.course?.name || "curriculum"}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
          })
          .from(element)
          .save()
          .then(() => {
            Swal.close();
            Swal.fire("Success", "PDF has been generated!", "success");
          })
          .catch((err) => {
            Swal.close();
            console.error(err);
            Swal.fire("Error", "Failed to generate PDF.", "error");
          });
      },
    });
  };

  // Backspace key to go back
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Backspace" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
        e.preventDefault();
        window.history.back();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ProgramHeadLayout>
      <div className="px-10 py-8 text-gray-900 font-[Times_New_Roman] bg-gray-100 min-h-screen">
        {/* Header Buttons */}
        <div className="max-w-5xl mx-auto mb-4 flex justify-between items-center">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft size={20} />
            Back
          </button>

          {/* <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
            >
              🖨 Save as PDF
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md shadow-md bg-green-600 text-white hover:bg-green-700 transition-colors duration-200"
            >
              <UploadSimple size={20} weight="bold" />
              Upload File
            </button>
          </div> */}
        </div>

        {/* Curriculum Display */}
        <div
          ref={printRef}
          className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg border border-gray-200 p-4 sm:p-6 font-[Poppins]"
        >
          {allYears.length > 0 ? (
            allYears.map(({ year, subjects }) => (
              <div key={year} className="mb-4 sm:mb-5">
                <h2 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 border-b border-gray-300 pb-1 flex justify-between items-center">
                  {year}
                  {!isApproved && (
                    <button
                      onClick={() => {
                        setShowModal(true);
                        form.reset();
                        setSelectedYear(year);
                        setEditMode(false);
                      }}  
                      className="text-green-600 hover:text-green-800 flex items-center gap-1 text-xs sm:text-sm font-medium"
                    >
                      <PlusCircle size={16} /> Add Subject
                    </button>
                  )}

                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {Object.entries(subjects).map(([sem, subs]) => {
                    const showLabColumn = subs.some((s) => (s.lab_unit || 0) > 0);

                    return (
                      <div
                        key={sem}
                        className="bg-gray-50 border rounded-lg p-3 sm:p-4 shadow-sm overflow-x-auto relative"
                      >
                        <h3 className="text-sm sm:text-base font-medium mb-2 sm:mb-3 text-blue-700 border-b pb-1">
                          {sem}
                        </h3>
                        <table className="w-full text-[11px] sm:text-xs border border-gray-200 rounded-lg overflow-hidden min-w-[320px] font-[Poppins] shadow-sm">
                          <thead>
                            <tr className="bg-gray-50 text-gray-600">
                              <th className="border px-2 py-1 font-medium">Code</th>
                              <th className="border px-2 py-1 font-medium text-left">Title</th>
                              <th className="border px-2 py-1 font-medium text-center">
                                {showLabColumn ? "Lec" : "Unit"}
                              </th>
                              {showLabColumn && (
                                <th className="border px-2 py-1 font-medium text-center">Lab</th>
                              )}
                              <th className="border px-2 py-1 font-medium text-left w-24">Pre-reqs</th>
                              {showActions && (
                                <th className="border px-2 py-1 font-medium text-center">Action</th>
                              )}
                            </tr>
                          </thead>

                          <tbody>
                            {subs.map((sub, index) => (
                              <tr
                                key={sub.id}
                                className="hover:bg-blue-50/40 transition-colors text-[11px]"
                              >
                                <td className="border px-2 py-1 text-center font-semibold text-gray-700">
                                  {sub.subject?.code || "-"}
                                </td>
                                <td className="border px-2 py-1 text-gray-700">
                                  {sub.subject?.descriptive_title || "-"}
                                </td>
                                <td className="border px-2 py-1 text-center">
                                  {sub.lec_unit || 0}
                                </td>
                                {showLabColumn && (
                                  <td className="border px-2 py-1 text-center">
                                    {sub.lab_unit || 0}
                                  </td>
                                )}
                                <td className="border px-2 py-1 text-gray-500 whitespace-nowrap truncate max-w-[90px]">
                                  {sub.prerequisites?.length > 0 ? (
                                    <ul className="list-disc list-inside space-y-0.5">
                                      {sub.prerequisites.map((pre, i) => (
                                        <li key={i} className="text-[10px] text-gray-700">
                                          {pre.code}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-gray-400 italic">None</span>
                                  )}
                                </td>
                                {showActions && (
                                  <td className="border px-2 py-1 text-center">
                                    <button
                                      onClick={() => handleEditSubject(sub, index)}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>

                          {/* ✅ Totals Row */}
                          <tfoot>
                            <tr className="bg-gray-100 font-semibold text-gray-700 text-[11px]">
                              <td className="border px-2 py-1 text-center" colSpan={2}>
                                Total
                              </td>
                              <td className="border px-2 py-1 text-center">
                                {subs.reduce((sum, sub) => sum + (Number(sub.lec_unit) || 0), 0)}
                              </td>
                              {showLabColumn && (
                                <td className="border px-2 py-1 text-center">
                                  {subs.reduce((sum, sub) => sum + (Number(sub.lab_unit) || 0), 0)}
                                </td>
                              )}
                              <td
                                className="border px-2 py-1 text-center text-blue-600"
                                colSpan={showActions ? 2 : 1}
                              >
                                {subs.reduce(
                                  (sum, sub) =>
                                    sum + (Number(sub.lec_unit) || 0) + (Number(sub.lab_unit) || 0),
                                  0
                                )}{" "}
                                units
                              </td>
                            </tr>
                          </tfoot>
                        </table>


                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-6 text-gray-600">
              <div className="w-20 h-20 mb-4">
                <img
                  src="/images/book-transparent.gif"
                  alt="No curriculum"
                  className="w-full h-full object-contain"
                />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                {curriculum ? "Ready to add subjects?" : "No curriculum yet"}
              </h2>
              <p className="text-center text-gray-500 text-xs sm:text-sm max-w-xs">
                {curriculum
                  ? 'Click the "Add Subject" button to start building your curriculum.'
                  : "Please create a curriculum first to manage your subjects."}
              </p>
            </div>
          )}
        </div>


        {/* Add/Edit Subject Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-2">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-5 border border-gray-200 max-h-[90vh] overflow-y-auto">

              {/* Header */}
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-lg font-semibold text-gray-800">
                  {editMode ? "Edit Subject" : "Add Subject"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  ✕
                </button>
              </div>

              {/* Subject Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedYear || !selectedSemester) {
                    Swal.fire("Error", "Please select a semester!", "error");
                    return;
                  }

                  if (editMode) {
                    handleUpdateSubject(e);
                    return;
                  }

                  const semObj = semesters.find((s) => s.id == selectedSemester);

                  const newSubject = {
                    code: form.data.code,
                    title: form.data.title,
                    lec: Number(form.data.lec) || 0,
                    lab: Number(form.data.lab) || 0,
                    prerequisites: Array.isArray(form.data.prerequisites)
                      ? form.data.prerequisites
                      : [],
                    semester_id: selectedSemester,
                    semesterName: semObj?.semester || `Semester ${selectedSemester}`,
                    year: selectedYear,
                    type: selectedType,
                    comment: form.data.comment || "", 
                  };

                  setSubjectList((prev) => [...prev, newSubject]); // append

                  // Reset form for next entry
                  form.reset();
                  setSelectedSemester("");
                  setSelectedType("Old");
                }}
                className="space-y-3"
              >
                {/* Year / Semester / Type */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                    <input
                      type="text"
                      readOnly
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs bg-gray-100"
                      value={selectedYear}
                    />
                  </div>  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                    >
                      <option value="">-- Select --</option>
                      {semesters?.map((sem) => (
                        <option key={sem.id} value={sem.id}>
                          {sem.semester || `Semester ${sem.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                    >
                      <option value="Old">Old</option>
                      <option value="New">New</option>
                    </select>
                  </div>
                </div>

                {/* Code / Title */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subject Code</label>
                  <input
                    type="text"
                    placeholder="e.g. MATH101"
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                    value={form.data.code}
                    onChange={(e) => {
                      form.setData("code", e.target.value);
                      fetchSubjectTitle(e.target.value); // ✅ fetch title on code change
                    }}
                    required
                  />

                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descriptive Title</label>
                  <input
                    type="text"
                    placeholder="e.g. College Algebra"
                    className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                    value={form.data.title}
                    onChange={(e) => form.setData("title", e.target.value)}
                    required
                  />
                </div>

                {/* Lec / Lab */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Lec Units</label>
                    <input
                      type="number"
                      placeholder="3"
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                      value={form.data.lec}
                      onChange={(e) => form.setData("lec", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Lab Units</label>
                    <input
                      type="number"
                      placeholder="1"
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
                      value={form.data.lab}
                      onChange={(e) => form.setData("lab", e.target.value)}
                    />
                  </div>
                </div>

                {/* Prerequisite */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Prerequisite
                  </label>
                  <Select
                    isSearchable
                    isMulti
                    placeholder="Select prerequisite(s)..."
                    className="text-xs"
                    classNamePrefix="select"
                    options={curriculumSubjects?.map((subj) => ({
                      value: subj.subject?.code,
                      label: `${subj.subject?.code} - ${subj.subject?.descriptive_title}`,
                    }))}
                    value={
                      form.data.prerequisites
                        ? curriculumSubjects
                          .filter((s) =>
                            form.data.prerequisites.includes(s.subject?.code)
                          )
                          .map((s) => ({
                            value: s.subject?.code,
                            label: `${s.subject?.code} - ${s.subject?.descriptive_title}`,
                          }))
                        : []
                    }
                    onChange={(selected) =>
                      form.setData(
                        "prerequisites",
                        selected ? selected.map((s) => s.value) : []
                      )
                    }
                  />
                </div>
                       {/* ✅ Comment Field */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Comment</label>
          <textarea
            placeholder="e.g. 60 units of majors"
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs"
            value={form.data.comment || ""}
            onChange={(e) => form.setData("comment", e.target.value)}
          />
        </div>
                <button
                  type="submit"
                  className={`w-full py-1.5 rounded-md text-white text-xs font-medium transition ${editMode ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                  {editMode ? "Update Subject" : "Add Subject"}
                </button>
              </form>

              {/* Pending List & Save All (Scrollable, compact) */}
              {subjectList.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Pending Subjects
                  </h3>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Scrollable container */}
                    <div className="overflow-x-auto overflow-y-auto max-h-36"> {/* Reduced height */}
                      <table className="w-full text-xs min-w-[480px]"> {/* Slightly smaller min-width */}
                        <thead className="bg-gray-100 text-gray-600 font-medium sticky top-0 z-10">
                          <tr>
                            <th className="text-left px-2 py-1 w-20">Code</th>
                            <th className="text-left px-2 py-1">Title</th>
                            <th className="text-left px-2 py-1">Pre-reqs</th>
                            <th className="px-2 py-1 text-center w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectList.map((s, i) => (
                            <tr key={i} className="border-t hover:bg-gray-50 transition">
                              <td className="px-2 py-1 font-medium text-gray-800">{s.code}</td>
                              <td className="px-2 py-1 text-gray-700">{s.title}</td>
                              <td className="px-2 py-1 text-gray-600 whitespace-nowrap truncate max-w-[100px]">
                                {s.prerequisites && s.prerequisites.length > 0 ? (
                                  <ul className="list-disc list-inside text-xs space-y-0.5">
                                    {s.prerequisites.map((pre, idx) => (
                                      <li key={idx} className="font-medium text-gray-700">{pre}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-gray-400 italic">None</span>
                                )}
                              </td>
                              <td className="px-2 py-1 text-center space-x-1">
                                <button
                                  onClick={() => {
                                    form.setData({
                                      code: s.code,
                                      title: s.title,
                                      lec: s.lec,
                                      lab: s.lab,
                                      comment: form.data.comment || "", 
                                      prerequisites: s.prerequisites || [],
                                    });
                                    setSelectedSemester(s.semester_id);
                                    setSelectedType(s.type);
                                    setShowModal(true);
                                    setEditMode(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Edit"
                                >
                                  <PencilSimple size={16} weight="bold" />
                                </button>
                                <button
                                  onClick={() =>
                                    setSubjectList(subjectList.filter((_, idx) => idx !== i))
                                  }
                                  className="text-red-500 hover:text-red-700"
                                  title="Delete"
                                >
                                  <Trash size={16} weight="bold" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-3 flex justify-end gap-2 border-t pt-2">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-md hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveSubject}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition"
                    >
                      Save All
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}



        {/* Floating Action Button */}
        {!isApproved && (
          <button
            onClick={() => setShowActions(!showActions)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl transition
      bg-blue-600 hover:bg-blue-700"
          >
            {showActions ? (
              <span className="text-xl">✕</span>
            ) : (
              <Pencil size={24} weight="bold" />
            )}
          </button>
        )}


      </div>
    </ProgramHeadLayout>
  );
}
