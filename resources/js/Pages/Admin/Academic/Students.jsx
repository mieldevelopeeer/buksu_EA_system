import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { GraduationCap, MagnifyingGlass, Eye, FileText, Printer } from 'phosphor-react';

export default function Students({ students = [] }) {
  const [search, setSearch] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [perPage, setPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;

    return students.filter((enrollment) => {
      const name = `${enrollment.student?.fName ?? ''} ${enrollment.student?.mName ?? ''} ${enrollment.student?.lName ?? ''}`.toLowerCase();
      const idNumber = enrollment.student?.id_number?.toLowerCase() ?? '';
      const course = enrollment.course?.code?.toLowerCase() ?? '';

      return name.includes(query) || idNumber.includes(query) || course.includes(query);
    });
  }, [students, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, perPage]);

  const paginated = useMemo(() => {
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * perPage;
    const endIndex = startIndex + perPage;
    const currentItems = filtered.slice(startIndex, endIndex);

    return {
      totalItems,
      totalPages,
      currentItems,
      startIndex: totalItems === 0 ? 0 : startIndex + 1,
      endIndex: Math.min(endIndex, totalItems),
      currentPage: safePage,
    };
  }, [filtered, perPage, currentPage]);

  const corContext = useMemo(() => {
    if (!selectedEnrollment) {
      return null;
    }

    const student = selectedEnrollment.student ?? {};
    const course = selectedEnrollment.course ?? {};
    const major = selectedEnrollment.major ?? {};
    const yearLevel = selectedEnrollment.year_level ?? selectedEnrollment.yearLevel ?? {};
    const semester = selectedEnrollment.semester ?? {};
    const schoolYear = selectedEnrollment.school_year ?? selectedEnrollment.schoolYear ?? {};
    const section = selectedEnrollment.section ?? {};
    const subjectsRaw = selectedEnrollment.enrollmentSubjects ?? selectedEnrollment.enrollment_subjects ?? [];

    const formatTime = (time) => {
      if (!time) return 'TBA';
      const [hourStr, minuteStr] = time.split(':');
      let hour = parseInt(hourStr, 10);
      if (Number.isNaN(hour)) return 'TBA';
      const suffix = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${hour}:${minuteStr ?? '00'} ${suffix}`;
    };

    const sanitizeName = (last, first) => {
      const safeLast = (last ?? '').trim();
      const safeFirst = (first ?? '').trim();
      if (safeLast && safeFirst) return `${safeLast}, ${safeFirst}`;
      return safeLast || safeFirst || 'TBA';
    };

    const subjects = subjectsRaw
      .map((subjectRecord, index) => {
        const classSchedule = subjectRecord.classSchedule ?? subjectRecord.class_schedule;
        const curriculumFromSchedule = classSchedule?.curriculumSubject ?? classSchedule?.curriculum_subject;
        const curriculumDirect = subjectRecord.curriculumSubject ?? subjectRecord.curriculum_subject;
        const curriculum = curriculumFromSchedule ?? curriculumDirect;
        const subject = curriculum?.subject;

        if (!subject) {
          return null;
        }

        const lec = Number(curriculum?.lec_unit ?? curriculum?.lecUnit ?? 0);
        const lab = Number(curriculum?.lab_unit ?? curriculum?.labUnit ?? 0);
        const start = classSchedule?.start_time ?? classSchedule?.startTime;
        const end = classSchedule?.end_time ?? classSchedule?.endTime;

        return {
          key: subjectRecord.id ?? `${subject.code ?? 'SUBJ'}-${index}`,
          code: subject.code ?? '—',
          title: subject.descriptive_title ?? '—',
          units: lec + lab,
          day: classSchedule?.schedule_day ?? classSchedule?.scheduleDay ?? 'TBA',
          time: start && end ? `${formatTime(start)} – ${formatTime(end)}` : 'TBA',
          room: classSchedule?.classroom?.room_number ?? classSchedule?.classroom?.roomNumber ?? 'TBA',
          instructor: sanitizeName(classSchedule?.faculty?.lName, classSchedule?.faculty?.fName),
        };
      })
      .filter(Boolean);

    const totalUnits = subjects.reduce((sum, subj) => sum + (Number(subj.units) || 0), 0);

    const formattedName = [
      student.lName ?? '',
      [student.fName, student.mName].filter(Boolean).join(' ').trim(),
    ]
      .filter((part) => part && part.trim().length)
      .join(', ');

    const courseLabel = [course.code, major.code].filter(Boolean).join(' - ');

    const enrolledDate = selectedEnrollment.enrolled_at
      ? new Date(selectedEnrollment.enrolled_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

    return {
      formattedName: formattedName || 'N/A',
      idNumber: student.id_number ?? 'N/A',
      courseLabel: courseLabel || course.name || 'N/A',
      yearLevel: yearLevel.year_level ?? 'N/A',
      semester: semester.semester ?? 'N/A',
      schoolYear: schoolYear.school_year ?? selectedEnrollment.school_year_label ?? 'N/A',
      section: section.section ?? 'N/A',
      enrolledDate,
      subjects,
      totalUnits,
    };
  }, [selectedEnrollment]);

  const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AdminLayout>
      <Head title="Academic Records" />

      <div className="p-4 text-xs text-gray-800 space-y-4">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap size={20} className="text-blue-400" />
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Enrolled Students</h1>
              <p className="text-[11px] text-gray-500">Review active enrollments and open academic records.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-lg sm:items-center sm:justify-end">
            <label className="relative flex-1 min-w-[200px]">
              <MagnifyingGlass size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, ID, or course..."
                className="w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 py-1.5 text-xs shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-gray-500">Rows:</span>
              <select
                value={perPage}
                onChange={(event) => setPerPage(Number(event.target.value))}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 focus:border-blue-400 focus:outline-none"
              >
                {[10, 15, 20, 30, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white/80 shadow-sm">
          <table className="min-w-full text-[11px]">
            <thead className="bg-gray-50 text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">ID Number</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Course / Major</th>
                <th className="px-3 py-2 text-left">Year Level</th>
                <th className="px-3 py-2 text-left">Semester</th>
                <th className="px-3 py-2 text-left">School Year</th>
                <th className="px-3 py-2 text-left">Enrolled Date</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {paginated.totalItems === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-gray-400 italic">
                    No students matched your search.
                  </td>
                </tr>
              ) : (
                paginated.currentItems.map((enrollment, index) => {
                  const student = enrollment.student ?? {};
                  const middleInitial = student.mName ? `${student.mName.charAt(0)}. ` : '';

                  return (
                    <tr key={enrollment.id} className="hover:bg-blue-50/40 transition">
                      <td className="px-3 py-2 text-gray-500">{paginated.startIndex + index}</td>
                      <td className="px-3 py-2">{student.id_number ?? '—'}</td>
                      <td className="px-3 py-2">
                        {student.fName ?? ''} {middleInitial}
                        {student.lName ?? ''}
                      </td>
                      <td className="px-3 py-2">
                        {[enrollment.course?.code, enrollment.major?.code]
                          .filter(Boolean)
                          .join(' ') || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          {enrollment.year_level?.year_level ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                          {enrollment.semester?.semester ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          {enrollment.school_year_label ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2">{formatDate(enrollment.enrolled_at)}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => setSelectedEnrollment(enrollment)}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <FileText size={14} />
                          View COR
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11px] text-gray-600">
          <p>
            Showing{' '}
            <span className="font-semibold text-gray-800">
              {paginated.totalItems === 0 ? 0 : `${paginated.startIndex}-${paginated.endIndex}`}
            </span>{' '}
            of <span className="font-semibold text-gray-800">{paginated.totalItems}</span> students
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={paginated.currentPage === 1}
              className={`px-2 py-1 rounded-md border text-xs font-medium transition ${
                paginated.currentPage === 1
                  ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'text-blue-600 border-blue-200 hover:bg-blue-50'
              }`}
            >
              Prev
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: paginated.totalPages }).slice(0, 5).map((_, idx) => {
                const pageNumber = idx + Math.max(1, Math.min(paginated.totalPages - 4, paginated.currentPage - 2));
                if (pageNumber > paginated.totalPages) return null;
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition ${
                      pageNumber === paginated.currentPage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(paginated.totalPages, prev + 1))}
              disabled={paginated.currentPage === paginated.totalPages}
              className={`px-2 py-1 rounded-md border text-xs font-medium transition ${
                paginated.currentPage === paginated.totalPages
                  ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'text-blue-600 border-blue-200 hover:bg-blue-50'
              }`}
            >
              Next
            </button>
          </div>
        </div>

        {selectedEnrollment && corContext && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
            <div
              className="bg-white w-full max-w-[720px] h-[90vh] shadow-xl rounded-lg p-6 relative overflow-y-auto
                print:w-[210mm] print:h-[297mm] print:max-w-none print:rounded-none print:shadow-none
                print:p-10 print:pt-14 print:pb-16 print:overflow-visible"
            >
              <button
                onClick={() => setSelectedEnrollment(null)}
                className="absolute top-3 right-3 text-gray-500 hover:text-red-600 transition print:hidden text-sm"
              >
                ✖
              </button>

              <div className="text-center mb-4 border-b pb-3 mt-4 print:mt-8">
                <img
                  src="/images/buksu_logo.png"
                  alt="School Logo"
                  className="mx-auto w-12 h-12 md:w-10 md:h-10 mb-1 print:w-14 print:h-14"
                />
                <div className="text-center flex-1">
                  <h1 className="font-extrabold text-base text-gray-900 leading-tight">
                    Bukidnon State University
                  </h1>
                  <h2 className="text-xs font-medium text-gray-700">Alubijid Campus</h2>
                  <p className="text-[10px] text-gray-500">
                    Poblacion, Alubijid, Misamis Oriental
                  </p>
                  <h3 className="font-bold text-sm mt-1 underline decoration-indigo-600">
                    Certificate of Registration (COR)
                  </h3>
                </div>
              </div>

              <div className="bg-white border rounded-lg shadow-sm p-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <p className="flex">
                      <span className="font-semibold text-gray-600 w-24">Name:</span>
                      <span className="text-gray-800 truncate">{corContext.formattedName}</span>
                    </p>
                    <p className="flex">
                      <span className="font-semibold text-gray-600 w-24">ID No:</span>
                      <span className="text-gray-800">{corContext.idNumber}</span>
                    </p>
                    <p className="flex">
                      <span className="font-semibold text-gray-600 w-24">Year Level:</span>
                      <span className="text-gray-800">{corContext.yearLevel}</span>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="flex">
                      <span className="font-semibold text-gray-600 w-24">Period:</span>
                      <span className="text-gray-800">
                        {corContext.semester}, {corContext.schoolYear}
                      </span>
                    </p>
                    <p className="flex">
                      <span className="font-semibold text-gray-600 w-24">Course / Major:</span>
                      <span className="text-gray-800">{corContext.courseLabel}</span>
                    </p>
                    <p className="flex">
                      <span className="font-semibold text-gray-600 w-24">Section:</span>
                      <span className="text-gray-800">{corContext.section}</span>
                    </p>
                    <p className="flex">
                      <span className="font-semibold text-gray-600 w-24">Date:</span>
                      <span className="text-gray-800">{corContext.enrolledDate}</span>
                    </p>
                  </div>
                </div>
              </div>

              <h4 className="text-xs font-semibold mb-1 text-gray-700">Subjects</h4>
              <table className="w-full table-auto text-[10px] mb-4 border-t border-b border-gray-600">
                <thead className="bg-indigo-50 text-gray-700 border-b border-gray-400">
                  <tr>
                    <th className="px-1 py-1 text-left w-16">Code</th>
                    <th className="px-1 py-1 text-left w-44">Descriptive Title</th>
                    <th className="px-1 py-1 text-center w-10">Units</th>
                    <th className="px-1 py-1 text-center w-14">Day</th>
                    <th className="px-1 py-1 text-center w-24">Time</th>
                    <th className="px-1 py-1 text-center w-16">Room</th>
                    <th className="px-1 py-1 text-center w-40">Instructor</th>
                  </tr>
                </thead>
                <tbody>
                  {corContext.subjects.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-2 py-2 text-center text-gray-500">
                        No subjects found.
                      </td>
                    </tr>
                  ) : (
                    corContext.subjects.map((subject) => (
                      <tr key={subject.key} className="border-b border-gray-200">
                        <td className="px-1 py-1 text-center">{subject.code}</td>
                        <td className="px-1 py-1 break-words">{subject.title}</td>
                        <td className="px-1 py-1 text-center">{subject.units}</td>
                        <td className="px-1 py-1 text-center">{subject.day}</td>
                        <td className="px-1 py-1 text-center text-[9px]">{subject.time}</td>
                        <td className="px-1 py-1 text-center">{subject.room}</td>
                        <td className="px-1 py-1 text-center break-words">{subject.instructor}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="flex justify-end text-xs mb-6">
                <p className="font-semibold text-gray-700">
                  Total Units:{' '}
                  <span className="ml-2 font-bold">{corContext.totalUnits}</span>
                </p>
              </div>

              <h4 className="text-xs font-semibold mb-1 text-gray-700">Assessment</h4>
              <table className="w-full text-[11px] mb-4">
                <thead className="text-gray-600 border-b">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">Particulars</th>
                    <th className="px-2 py-1 text-center font-medium">Amount</th>
                    <th className="px-2 py-1 text-center font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-0.5">Tuition Fee (24 x 225/unit)</td>
                    <td className="px-2 py-0.5 text-center">5,400.00</td>
                    <td className="px-2 py-0.5 text-center">5,400.00</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-0.5">Medical and Dental Fee</td>
                    <td className="px-2 py-0.5 text-center">200.00</td>
                    <td className="px-2 py-0.5 text-center">200.00</td>
                  </tr>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-2 py-0.5">Total Assessment</td>
                    <td></td>
                    <td className="px-2 py-0.5 text-center">6,700.00</td>
                  </tr>
                </tbody>
              </table>

              <h4 className="text-xs font-semibold mb-1 text-gray-700">Summary</h4>
              <table className="w-full text-[11px] mb-6">
                <tbody>
                  <tr>
                    <td className="px-2 py-0.5 text-gray-700">Current Assessment</td>
                    <td className="px-2 py-0.5 text-right">6,700.00</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-0.5 text-gray-700">Previous Balance</td>
                    <td className="px-2 py-0.5 text-right">7,932.73</td>
                  </tr>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-2 py-0.5">Current Receivable</td>
                    <td className="px-2 py-0.5 text-right">14,632.73</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 text-center print:hidden">
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-xs font-medium shadow hover:bg-indigo-700 transition"
                >
                  Save / Print COR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
