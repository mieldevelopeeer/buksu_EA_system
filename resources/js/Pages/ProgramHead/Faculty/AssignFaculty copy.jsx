import React, { useState, useEffect } from "react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import { Head, useForm } from "@inertiajs/react";
import { Pencil, PlusCircle, XCircle ,CalendarCheck } from "phosphor-react";
import Swal from "sweetalert2";

export default function AssignFaculty({
  faculties = [],
  sections = [],
  curriculumSubjects = [],
  yearLevels = [],
  classrooms = [],
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [filteredSections, setFilteredSections] = useState([]);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [professionFilter, setProfessionFilter] = useState("");

  const { data, setData, post, put, processing, reset } = useForm({
    faculty_id: "",
    section_id: "",
    year_level_id: "",
    curriculum_subject_id: "",
    schedule_day: "",
    start_time: "",
    end_time: "",
    load_hours: "",
    classroom_id: "",
  });

  // Open Assign modal
  const openModal = (faculty) => {
    setSelectedFaculty(faculty);
    setEditingSchedule(null);
    setData({
      faculty_id: faculty.id,
      section_id: "",
      year_level_id: "",
      curriculum_subject_id: "",
      schedule_day: "",
      start_time: "",
      end_time: "",
      load_hours: "",
      classroom_id: "",
    });
    setModalOpen(true);
  };

  // Open Edit modal
  const openEditModal = (faculty, sched) => {
    setSelectedFaculty(faculty);
    setEditingSchedule(sched);
    setData({
      faculty_id: faculty.id,
      section_id: sched.section_id,
      year_level_id: sched.section?.year_level_id || "",
      curriculum_subject_id: sched.curriculum_subject_id,
      schedule_day: sched.schedule_day,
      start_time: sched.start_time,
      end_time: sched.end_time,
      load_hours: sched.load_hours,
      classroom_id: sched.classroom_id,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedFaculty(null);
    setFilteredSections([]);
    setFilteredSubjects([]);
    setEditingSchedule(null);
    reset();
  };

 // Filter subjects & sections dynamically when Year Level changes
useEffect(() => {
  if (!data.year_level_id) {
    setFilteredSections([]);
    setFilteredSubjects([]);
    return;
  }

  const yearId = Number(data.year_level_id);

  // ✅ Filter subjects based on selected year level
  const filteredSubs = curriculumSubjects.filter(
    (cs) => Number(cs.year_level_id) === yearId && cs.subject
  );

  // ✅ Filter sections based on selected year level
  const filteredSecs = sections.filter((s) => Number(s.year_level_id) === yearId);

  setFilteredSubjects(filteredSubs);
  setFilteredSections(filteredSecs);

  // Reset selection if current value is not in filtered list
  if (!filteredSubs.some((cs) => Number(cs.id) === Number(data.curriculum_subject_id))) {
    setData("curriculum_subject_id", "");
  }
  if (!filteredSecs.some((s) => Number(s.id) === Number(data.section_id))) {
    setData("section_id", "");
  }
}, [data.year_level_id, curriculumSubjects, sections]);


  // Auto-calc load hours
  useEffect(() => {
    if (!data.start_time || !data.end_time) return setData("load_hours", "");
    const start = data.start_time.split(":").map(Number);
    const end = data.end_time.split(":").map(Number);
    const diffHours = (end[0] * 60 + end[1] - (start[0] * 60 + start[1])) / 60;
    setData("load_hours", diffHours > 0 ? Math.round(diffHours) : "");
  }, [data.start_time, data.end_time]);

  // Submit form
  const submitAssignment = (e) => {
    e.preventDefault();

    const onSuccess = () => {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: editingSchedule ? "Schedule updated!" : "Schedule assigned!",
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
      });
      closeModal();
    };

    const onError = (errors) => {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "error",
        title: Object.values(errors).join("\n"),
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    };

    if (editingSchedule) {
      put(route("program-head.faculty.updateSched", editingSchedule.id), {
        onSuccess,
        onError,
      });
    } else {
      post(route("program-head.faculty.addSched"), { onSuccess, onError });
    }
  };

  // Filter faculties
  const displayedFaculties = faculties
    .filter(
      (fac) =>
        fac.fName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fac.lName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((fac) => (departmentFilter ? fac.department?.id === Number(departmentFilter) : true))
    .filter((fac) =>
      professionFilter ? fac.profession?.toLowerCase().includes(professionFilter.toLowerCase()) : true
    );

  return (
    <ProgramHeadLayout>
      <Head title="Assign Faculty" />
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Assign Faculty</h1>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search by name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Departments</option>
          {Array.from(new Set(faculties.map((f) => f.department?.id))).map((id) => {
            const dept = faculties.find((f) => f.department?.id === id)?.department;
            return dept ? (
              <option key={id} value={id}>
                {dept.name}
              </option>
            ) : null;
          })}
        </select>
        <input
          type="text"
          placeholder="Filter by profession"
          value={professionFilter}
          onChange={(e) => setProfessionFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

    {/* Faculty Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {displayedFaculties.map((fac) => (
    <div
      key={fac.id}
      className="relative bg-white rounded-2xl shadow-lg p-5 border border-gray-200 flex flex-col justify-between hover:shadow-2xl transition hover:scale-[1.02]"
    >
      {/* Add Assignment Button (Top Right) */}
      <button
        onClick={() => openModal(fac)}
        className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 bg-blue-600 text-white text-sm font-medium rounded-full shadow-md hover:bg-blue-700 transition"
        title="Add Assignment"
      >
        <PlusCircle size={18} />
      </button>

      {/* Avatar & Name */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
          {fac.fName[0]}{fac.lName[0]}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {fac.fName} {fac.mName ? fac.mName + " " : ""}{fac.lName}
          </h3>
          <p className="text-sm text-gray-500">{fac.department?.name || "-"}</p>
        </div>
      </div>

      {/* Profession */}
      <p className="text-sm text-gray-500 mb-4">{fac.profession || "-"}</p>

      {/* View Schedules */}
      {fac.class_schedules?.length > 0 && (
        <button
          onClick={() => {
            setSelectedFaculty(fac);
            setScheduleModalOpen(true);
          }}
          className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-full shadow-sm hover:bg-blue-100 hover:text-blue-800 transition"
        >
          <CalendarCheck size={16} /> {/* Use any icon you like */}
          View Schedules ({fac.class_schedules.length})
        </button>
      )}
    </div>
  ))}
</div>


{/* View Schedules Modal */}
{scheduleModalOpen && selectedFaculty && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl sm:max-w-4xl p-6 relative 
                    flex flex-col md:flex-row md:gap-6 animate-fade-in">
      
      {/* Left Panel: Faculty Info */}
      <div className="flex-shrink-0 mb-4 md:mb-0 md:w-1/4 bg-blue-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
          {selectedFaculty.fName[0]}{selectedFaculty.lName[0]}
        </div>
        <h2 className="mt-3 text-lg font-semibold text-gray-800">
          {selectedFaculty.fName} {selectedFaculty.lName}
        </h2>
        <span className="text-sm text-gray-500">Schedules</span>
      </div>

      {/* Right Panel: Schedules */}
      <div className="flex-1 max-h-[70vh] overflow-y-auto pr-2 space-y-6">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
          const daySchedules = selectedFaculty.class_schedules?.filter(
            (s) => s.schedule_day === day
          );
          if (!daySchedules?.length) return null;

          return (
            <div key={day}>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                {day}
              </h3>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                {daySchedules.map((sched) => (
                  <div
                    key={sched.id}
                    className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg transition hover:scale-[1.02]"
                  >
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      {sched.curriculum_subject?.subject?.code} —{" "}
                      <span className="font-normal text-gray-700">
                        {sched.curriculum_subject?.subject?.descriptive_title}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">{sched.section?.section}</span> •{" "}
                      Room {sched.classroom?.room_number}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sched.start_time} – {sched.end_time} (
                      {sched.load_hours} hr{sched.load_hours > 1 ? "s" : ""})
                    </p>

                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() => openEditModal(selectedFaculty, sched)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Close Button */}
      <button
        onClick={() => setScheduleModalOpen(false)}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
      >
        <XCircle size={24} />
      </button>
    </div>
  </div>
)}

      {/* Assign / Edit Modal */}
      {modalOpen && (
        <AssignModal
          faculties={faculties}
          yearLevels={yearLevels}
          classrooms={classrooms}
          data={data}
          setData={setData}
          processing={processing}
          closeModal={closeModal}
          submitAssignment={submitAssignment}
          editingSchedule={editingSchedule}
          filteredSections={filteredSections}
          filteredSubjects={filteredSubjects}
        />
      )}
    </ProgramHeadLayout>
  );
}

/* Reusable Components */
function AssignModal({
  faculties,
  yearLevels,
  classrooms,
  data,
  setData,
  processing,
  closeModal,
  submitAssignment,
  editingSchedule,
  filteredSections,
  filteredSubjects,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {editingSchedule ? "Edit Schedule" : "Assign Faculty"}
        </h2>
        <form onSubmit={submitAssignment} className="space-y-3">
          <SelectField
            label="Faculty"
            value={data.faculty_id}
            onChange={(val) => setData("faculty_id", val)}
            options={faculties.map((f) => ({
              value: f.id,
              label: f.fName + " " + (f.mName ? f.mName + " " : "") + f.lName,
            }))}
            disabled
          />

          <SelectField
            label="Year Level"
            value={data.year_level_id}
            onChange={(val) => setData("year_level_id", val)}
            options={yearLevels.map((yl) => ({ value: yl.id, label: yl.year_level }))}
          />

          <SelectField
            label="Subject"
            value={data.curriculum_subject_id}
            onChange={(val) => setData("curriculum_subject_id", val)}
            options={
              filteredSubjects.length
                ? filteredSubjects.map((cs) => ({
                    value: cs.id,
                    label: `${cs.subject?.code || ""} - ${
                      cs.subject?.descriptive_title || ""
                    }`,
                  }))
                : [{ value: "", label: "No subjects available" }]
            }
          />

          <SelectField
            label="Section"
            value={data.section_id}
            onChange={(val) => setData("section_id", val)}
            options={
              filteredSections.length
                ? filteredSections.map((s) => ({ value: s.id, label: s.section }))
                : [{ value: "", label: "No sections available" }]
            }
          />

          <SelectField
            label="Day"
            value={data.schedule_day}
            onChange={(val) => setData("schedule_day", val)}
            options={[
              { value: "Mon", label: "Monday" },
              { value: "Tue", label: "Tuesday" },
              { value: "Wed", label: "Wednesday" },
              { value: "Thu", label: "Thursday" },
              { value: "Fri", label: "Friday" },
              { value: "Sat", label: "Saturday" },
              { value: "Sun", label: "Sunday" },
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <TimeField
              label="Start Time"
              value={data.start_time}
              onChange={(val) => setData("start_time", val)}
            />
            <TimeField
              label="End Time"
              value={data.end_time}
              onChange={(val) => setData("end_time", val)}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Load Hours</label>
            <input
              type="number"
              value={data.load_hours || ""}
              readOnly
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm bg-gray-100 cursor-not-allowed"
            />
          </div>

          <SelectField
            label="Classroom"
            value={data.classroom_id}
            onChange={(val) => setData("classroom_id", val)}
            options={classrooms.map((c) => ({ value: c.id, label: c.room_number }))}
          />

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
              disabled={processing}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className={`px-4 py-2 rounded-lg text-white ${
                processing
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {processing
                ? "Assigning..."
                : editingSchedule
                ? "Update"
                : "Assign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled }) {
  return (
    <div>
      <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        required
        disabled={disabled}
      >
        <option value="">Select {label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TimeField({ label, value, onChange }) {
  return (
    <div>
      <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        required
      />
    </div>
  );
}
