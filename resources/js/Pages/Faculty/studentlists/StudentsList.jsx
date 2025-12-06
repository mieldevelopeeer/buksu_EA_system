import React, { useMemo, useState } from "react";
import { usePage, Link } from "@inertiajs/react";
import FacultyLayout from "@/Layouts/FacultyLayout";

// Function to convert array of objects to CSV string
const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    // Get headers from the first object's keys
    const headers = Object.keys(data[0]);
    
    // Create CSV header row
    let csv = headers.join(',') + '\n';
    
    // Add data rows
    data.forEach(row => {
        const values = headers.map(header => {
            // Escape quotes and wrap in quotes if the value contains commas or quotes
            const value = row[header] || '';
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csv += values.join(',') + '\n';
    });
    
    return csv;
};

// Function to trigger download of CSV file
const downloadCSV = (data, filename = 'students.csv') => {
    const csv = convertToCSV(data);
    if (!csv) return;
    
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Inline SVG icons to avoid external dependencies
const ChevronLeftIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-5 w-5"
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
      clipRule="evenodd"
    />
  </svg>
);

const ChevronRightIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-5 w-5"
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
      clipRule="evenodd"
    />
  </svg>
);

// Pagination component
function Pagination({ currentPage, totalPages, onPageChange }) {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;
    
    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    Next
                </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
                        <span className="font-medium">
                            {Math.min(currentPage * 10, totalPages * 10)}
                        </span>{' '}
                        of <span className="font-medium">{totalPages * 10}</span> results
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                            <span className="sr-only">Previous</span>
                            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                        
                        {startPage > 1 && (
                            <button
                                onClick={() => onPageChange(1)}
                                className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                            >
                                1
                            </button>
                        )}
                        
                        {startPage > 2 && (
                            <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                                ...
                            </span>
                        )}
                        
                        {pages.map((page) => (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                    currentPage === page
                                        ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                        
                        {endPage < totalPages - 1 && (
                            <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                                ...
                            </span>
                        )}
                        
                        {endPage < totalPages && (
                            <button
                                onClick={() => onPageChange(totalPages)}
                                className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                            >
                                {totalPages}
                            </button>
                        )}
                        
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                            <span className="sr-only">Next</span>
                            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
}

export default function StudentsList() {
    const { teachingLoads = [] } = usePage().props;
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedSection, setSelectedSection] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Extract unique subjects and sections for the filter dropdowns
    const { subjects, sections } = useMemo(() => {
        const subjectSet = new Set();
        const sectionSet = new Set();
        
        teachingLoads.forEach(load => {
            // Get subjects
            const subject = load?.subject || {};
            const subjectName = subject.name || "No Subject";
            const displaySubject = subject.code ? `${subject.code} - ${subjectName}` : subjectName;
            subjectSet.add(displaySubject);
            
            // Get sections
            const section = load?.section?.name || load?.section || "No Section";
            if (section) sectionSet.add(section);
        });
        
        return {
            subjects: Array.from(subjectSet).sort(),
            sections: Array.from(sectionSet).sort()
        };
    }, [teachingLoads]);

    // Extract unique students and their subjects
    const allStudents = useMemo(() => {
        const studentMap = new Map();
        
        teachingLoads.forEach(load => {
            const students = Array.isArray(load?.students) ? load.students : [];
            const subject = load?.subject || {};
            const section = load?.section?.name || load?.section || "No Section";
            const subjectName = subject.name || "No Subject";
            const displaySubject = subject.code ? `${subject.code} - ${subjectName}` : subjectName;
            
            // Skip if a subject is selected and it doesn't match
            if (selectedSubject && selectedSubject !== displaySubject) return;
            
            // Skip if a section is selected and it doesn't match
            if (selectedSection && selectedSection !== section) return;
            
            students.forEach(student => {
                const studentId = student?.id || student?.student_id || student?.student_number || Math.random().toString(36).substr(2, 9);
                // Use the pre-formatted name from the controller, fallback to student number if available, otherwise 'No Name'
                const studentName = student?.name || 
                                 (student?.lName || student?.fName 
                                     ? [student.lName, student.fName].filter(Boolean).join(', ')
                                     : student?.student_number || student?.studentNo || "No Name");
                
                if (!studentMap.has(studentId)) {
                    // Get birthdate if available
                    const birthDate = student?.birth_date || student?.birthdate || null;
                    let formattedBirthDate = 'N/A';
                    
                    if (birthDate) {
                        const birthDateObj = new Date(birthDate);
                        if (!isNaN(birthDateObj)) {
                            formattedBirthDate = birthDateObj.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            });
                        }
                    }

                    // Format address if available
                    const formatAddress = (student) => {
                        // Check for direct address first
                        if (student?.address) return student.address;
                        
                        // Use current address fields from StudentDetail model
                        const parts = [
                            student?.current_address_street,
                            student?.current_address_barangay,
                            student?.current_address_municipality,
                            student?.current_address_province
                        ].filter(Boolean);
                        
                        // If no current address, try home address
                        if (parts.length === 0) {
                            const homeParts = [
                                student?.home_address_street,
                                student?.home_address_barangay,
                                student?.home_address_municipality,
                                student?.home_address_province
                            ].filter(Boolean);
                            
                            return homeParts.length > 0 ? homeParts.join(', ') : 'N/A';
                        }
                        
                        return parts.join(', ');
                    };

                    studentMap.set(studentId, {
                        id: studentId,
                        name: studentName,
                        studentNumber: student?.student_number || student?.studentNo || "N/A",
                        program: student?.program || student?.course || "N/A",
                        major: student?.major,
                        yearLevel: student?.year_level || student?.yearLevel || "N/A",
                        email: student?.email || "N/A",
                        phone: student?.phone || student?.contact_number || "N/A",
                        section: student?.section?.name || student?.section || section,
                        status: student?.status || "N/A"
                    });
                }
            });
        });
        
        // Sort students by name (A-Z)
        return Array.from(studentMap.values()).sort((a, b) => 
            a.name.localeCompare(b.name, 'en', {sensitivity: 'base'})
        );
    }, [teachingLoads, selectedSubject, selectedSection]);

    // Calculate pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentStudents = allStudents.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(allStudents.length / itemsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo(0, 0);
    };

    return (
        <FacultyLayout>
            <div className="py-4">
                <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row gap-3 w-full">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Student Roster</h2>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        {allStudents.length} {allStudents.length === 1 ? 'student' : 'students'} found
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 w-full items-end">
                                    <div className="w-full sm:w-64">
                                        <label htmlFor="subject-filter" className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                                        <select
                                            id="subject-filter"
                                            value={selectedSubject}
                                            onChange={(e) => {
                                                setSelectedSubject(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1.5"
                                        >
                                            <option value="">All Subjects</option>
                                            {subjects.map((subject, index) => (
                                                <option key={`subj-${index}`} value={subject}>
                                                    {subject}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-full sm:w-48">
                                        <label htmlFor="section-filter" className="block text-xs font-medium text-gray-700 mb-1">Section</label>
                                        <select
                                            id="section-filter"
                                            value={selectedSection}
                                            onChange={(e) => {
                                                setSelectedSection(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1.5"
                                        >
                                            <option value="">All Sections</option>
                                            {sections.map((section, index) => (
                                                <option key={`sect-${index}`} value={section}>
                                                    {section}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="w-full sm:w-auto">
                                    <button
                                        onClick={() => {
                                            const exportData = allStudents.map(student => ({
                                                'Student Name': student.name,
                                                'Student ID': student.studentNumber,
                                                'Program': student.major ? `${student.program} - ${student.major.split(' ').pop()}` : student.program,
                                                'Year Level': student.yearLevel,
                                                'Section': student.section,
                                                'Phone': student.phone,
                                                'Email': student.email,
                                                'Status': student.status
                                            }));
                                            downloadCSV(exportData, `students_${new Date().toISOString().split('T')[0]}.csv`);
                                        }}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 h-8"
                                    >
                                        <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Export to CSV
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <div className="inline-block min-w-full align-middle">
                                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                                        <table className="min-w-full divide-y divide-gray-300">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-900 sm:pl-6">Student</th>
                                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">Program</th>
                                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">Year</th>
                                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">Section</th>
                                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">Contact</th>
                                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-900">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                {currentStudents.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="px-3 py-4 text-sm text-gray-500 text-center">
                                                            No students found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    currentStudents.map((student) => (
                                                    <tr key={student.id} className="hover:bg-gray-50">
                                                        <td className="whitespace-nowrap py-2 pl-3 pr-2 text-xs sm:pl-4">
                                                            <div className="flex items-center">
                                                                <div className="h-8 w-8 flex-shrink-0 bg-indigo-100 rounded-full flex items-center justify-center">
                                                                    <span className="text-indigo-700 text-xs font-medium">
                                                                        {student.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <div className="ml-2">
                                                                    <div className="font-medium text-gray-900 text-xs">{student.name}</div>
                                                                    <div className="text-gray-500 text-2xs">ID: {student.studentNumber}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="whitespace-nowrap px-2 py-2 text-xs text-gray-500">
                                                            <div className="text-gray-900">{student.program}</div>
                                                            {student.major && (
                                                                <div className="text-2xs text-gray-500">{student.major}</div>
                                                            )}
                                                        </td>
                                                        <td className="whitespace-nowrap px-2 py-2 text-xs text-gray-500">
                                                            {student.yearLevel}
                                                        </td>
                                                        <td className="whitespace-nowrap px-2 py-2 text-xs text-gray-500">
                                                            {student.section}
                                                        </td>
                                                        <td className="whitespace-nowrap px-2 py-2 text-xs text-gray-500">
                                                            <div className="text-gray-900">{student.phone || 'N/A'}</div>
                                                            <div className="text-gray-500 text-2xs">{student.email || ''}</div>
                                                        </td>
                                                        <td className="whitespace-nowrap px-2 py-2">
                                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium ${
                                                                student.status?.toLowerCase() === 'enrolled' 
                                                                    ? 'bg-green-100 text-green-800' 
                                                                    : student.status?.toLowerCase() === 'dropped' 
                                                                        ? 'bg-red-100 text-red-800' 
                                                                        : 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                                {student.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                    {allStudents.length > 0 && (
                                        <Pagination 
                                            currentPage={currentPage} 
                                            totalPages={totalPages} 
                                            onPageChange={handlePageChange} 
                                        />
                                    )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </FacultyLayout>
    );
}
