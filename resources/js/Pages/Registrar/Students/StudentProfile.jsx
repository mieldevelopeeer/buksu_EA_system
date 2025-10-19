import React, { useState } from "react";
import { Head } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Search, 
    User, 
    GraduationCap,
     X ,
     IdCard, 
     Mail, 
     BookOpen,
      Layers, 
      Calendar,
       MapPin,
        Phone, 
        CalendarClock,
    VenetianMask,} from "lucide-react";

export default function StudentProfile({ students }) {
    const [search, setSearch] = useState("");
    const [filterCourse, setFilterCourse] = useState("All");
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Extract unique courses
    const courses = [
        "All",
        ...new Set(
            students.map((s) => s.enrollments?.[0]?.course?.code).filter(Boolean)
        ),
    ];

    // Filter + search logic
    const filteredStudents = students.filter((student) => {
        const latestEnrollment = student.enrollments?.[0] || {};
        const fullName = `${student.fName} ${student.lName}`.toLowerCase();

        const matchesSearch = fullName.includes(search.toLowerCase());
        const matchesCourse =
            filterCourse === "All" ||
            latestEnrollment.course?.code === filterCourse;

        return matchesSearch && matchesCourse;
    });

    return (
        <RegistrarLayout>
            <div className="p-6">
                <Head title="Student Profiles" />

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
                        <GraduationCap className="w-7 h-7 text-blue-600" />
                        <span>Student Profiles</span>
                    </h1>

                    {/* Search + Filter */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Course Filter */}
                        <select
                            value={filterCourse}
                            onChange={(e) => setFilterCourse(e.target.value)}
                            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            {courses.map((course, idx) => (
                                <option key={idx} value={course}>
                                    {course}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

     {/* Student List */}
{filteredStudents.length === 0 ? (
  <p className="text-gray-400 text-center py-10">No students found.</p>
) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    {filteredStudents.map((student) => {
      const latestEnrollment = student.enrollments?.[0] || {};

      return (
        <div
          key={student.id}
          className="bg-white border rounded-xl p-6 flex flex-col items-center text-center 
                     hover:shadow-md hover:-translate-y-1 transform transition-all duration-200"
        >
          {/* Profile Picture */}
          {student.profile_picture ? (
            <img
              src={`/storage/${student.profile_picture}`}
              alt={student.fName}
              className="w-20 h-20 rounded-full object-cover border"
            />
          ) : (
            <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gray-100 border">
              <User className="w-10 h-10 text-gray-400" />
            </div>
          )}

          {/* Name */}
          <h2 className="mt-3 font-medium text-gray-800">
            {student.fName} {student.lName}
          </h2>

          {/* Course & Year Level */}
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {latestEnrollment.course?.code && (
              <span className="px-2.5 py-0.5 text-xs text-blue-700 bg-blue-50 rounded-full">
                {latestEnrollment.course?.code}
              </span>
            )}
            {latestEnrollment.year_level?.year_level && (
              <span className="px-2.5 py-0.5 text-xs text-green-700 bg-green-50 rounded-full">
                {latestEnrollment.year_level?.year_level}
              </span>
            )}
          </div>

          {/* Button */}
          <button
            onClick={() => setSelectedStudent(student)}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            View Details
          </button>
        </div>
      );
    })}
  </div>
)}


             {/* Modal */}
{selectedStudent && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-8 relative">
      {/* Close Button */}
      <button
        onClick={() => setSelectedStudent(null)}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Header Section */}
      <div className="flex flex-col items-center text-center">
        {selectedStudent.profile_picture ? (
          <img
            src={`/storage/${selectedStudent.profile_picture}`}
            alt={selectedStudent.fName}
            className="w-32 h-32 rounded-full object-cover border-4 border-indigo-100 shadow-md"
          />
        ) : (
          <div className="w-32 h-32 flex items-center justify-center rounded-full bg-gray-100 border-4 border-indigo-100 shadow-md">
            <User className="w-16 h-16 text-gray-400" />
          </div>
        )}

        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          {selectedStudent.fName} {selectedStudent.lName}
        </h2>
        <p className="text-gray-500 flex items-center gap-2">
          <IdCard className="w-4 h-4 text-blue-600" />
          {selectedStudent.id_number || "N/A"}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t my-6"></div>

      {/* Academic Info */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-green-600" /> Academic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
          <p className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            <span className="font-semibold">Course:</span>{" "}
            {selectedStudent.enrollments?.[0]?.course?.code || "N/A"}
          </p>
          <p className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold">Year Level:</span>{" "}
            {selectedStudent.enrollments?.[0]?.year_level?.year_level || "N/A"}
          </p>
          <p className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            <span className="font-semibold">Semester:</span>{" "}
            {selectedStudent.enrollments?.[0]?.semester?.semester || "N/A"}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t my-6"></div>

      {/* Personal Info */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <User className="w-5 h-5 text-pink-600" /> Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <p className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-red-500" />
            <span className="font-semibold">Email:</span>{" "}
            {selectedStudent.email || "N/A"}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-teal-600" />
            <span className="font-semibold">Contact:</span>{" "}
            {selectedStudent?.contact_no || "N/A"}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-pink-600" />
            <span className="font-semibold">Address:</span>{" "}
            {selectedStudent?.address?.trim() || "N/A"}
          </p>
          <p className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-orange-600" />
            <span className="font-semibold">Birthday:</span>{" "}
            {selectedStudent?.date_of_birth || "N/A"}
          </p>
          <p className="flex items-center gap-2">
            <VenetianMask className="w-4 h-4 text-indigo-500" />
            <span className="font-semibold">Gender:</span>{" "}
            {selectedStudent?.gender || "N/A"}
          </p>
        </div>
      </div>
    </div>
  </div>
)}

            </div>
        </RegistrarLayout>
    );
}
