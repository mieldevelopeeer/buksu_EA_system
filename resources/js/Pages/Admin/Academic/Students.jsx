import React, { useMemo, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { GraduationCap, MagnifyingGlass, Eye, FileText, Printer } from 'phosphor-react';

export default function Students({ students = [] }) {
  const [search, setSearch] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);

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

          <label className="relative w-full max-w-xs">
            <MagnifyingGlass size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, ID, or course..."
              className="w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 py-1.5 text-xs shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </header>

        <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white/80 shadow-sm">
          <table className="min-w-full text-[11px]">
            <thead className="bg-gray-50 text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">ID Number</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Course</th>
                <th className="px-3 py-2 text-left">Year Level</th>
                <th className="px-3 py-2 text-left">Semester</th>
                <th className="px-3 py-2 text-left">School Year</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-400 italic">
                    No students matched your search.
                  </td>
                </tr>
              ) : (
                filtered.map((enrollment, index) => {
                  const student = enrollment.student ?? {};
                  const middleInitial = student.mName ? `${student.mName.charAt(0)}. ` : '';

                  return (
                    <tr key={enrollment.id} className="hover:bg-blue-50/40 transition">
                      <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2">{student.id_number ?? '—'}</td>
                      <td className="px-3 py-2">
                        {student.fName ?? ''} {middleInitial}
                        {student.lName ?? ''}
                      </td>
                      <td className="px-3 py-2">{enrollment.course?.code ?? '—'}</td>
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

        {selectedEnrollment && (
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
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <p className="flex">
                      <span className="font-semibold text-gray-600 w-20">Name:</span>
                      <span className="text-gray-800 truncate">
                        {`${selectedEnrollment.student?.lName ?? ''}, ${selectedEnrollment.student?.fName ?? ''} ${selectedEnrollment.student?.mName ?? ''}`.trim()}
                      </span>
                    </p>
                    <p className="flex">
                      <span className="font-semibold text-gray-600 w-20">ID No:</span>
                      <span className="text-gray-800">{selectedEnrollment.student?.id_number ?? 'N/A'}</span>
                    </p>
                    <p className="flex">
                      <span className="font-semibold text-gray-600 w-20">Course/Yr:</span>
                      <span className="text-gray-800">
                        {(selectedEnrollment.course?.code ?? '—')}
                        {selectedEnrollment.major?.code ? ` - ${selectedEnrollment.major.code}` : ''}
                        {' '}
                        {(selectedEnrollment.year_level?.year_level ?? selectedEnrollment.yearLevel?.year_level ?? '')}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="flex">
                      <span className="font-semibold text-gray-600 w-20">Period:</span>
                      <span className="text-gray-800">
                        {(selectedEnrollment.semester?.semester ?? selectedEnrollment.semester?.semester ?? 'N/A')}, {' '}
                        {(selectedEnrollment.school_year?.school_year ?? selectedEnrollment.schoolYear?.school_year ?? selectedEnrollment.school_year_label ?? 'N/A')}
                      </span>
                    </p>
                    <p className="flex">
                      <span className="font-semibold text-gray-600 w-20">Date:</span>
                      <span className="text-gray-800">
                        {selectedEnrollment.enrolled_at
                          ? new Date(selectedEnrollment.enrolled_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : new Date().toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                      </span>
                    </p>
                    <p className="flex">
                      <span className="font-semibold text-gray-600 w-20">Section:</span>
                      <span className="text-gray-800">
                        {selectedEnrollment.section?.section ?? selectedEnrollment.section?.section ?? 'N/A'}
                      </span>
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
                  {(() => {
                    const subjects = selectedEnrollment.enrollment_subjects ?? selectedEnrollment.enrollmentSubjects ?? [];

                    if (!subjects || subjects.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" className="px-2 py-2 text-center text-gray-500">
                            No subjects found.
                          </td>
                        </tr>
                      );
                    }

                    const formatTime = (time) => {
                      if (!time) return 'TBA';
                      const [hourStr, minuteStr] = time.split(':');
                      let hour = parseInt(hourStr, 10);
                      const ampm = hour >= 12 ? 'PM' : 'AM';
                      hour = hour % 12 || 12;
                      return `${hour}:${minuteStr} ${ampm}`;
                    };

                    return subjects.map((subj, idx) => {
                      const curriculum = subj.class_schedule?.curriculum_subject ?? subj.class_schedule?.curriculumSubject;
                      const subject = curriculum?.subject;
                      if (!subject) return null;

                      const lec = curriculum?.lec_unit ?? curriculum?.lecUnit ?? 0;
                      const lab = curriculum?.lab_unit ?? curriculum?.labUnit ?? 0;
                      const units = lec + lab;

                      const scheduleDay = subj.class_schedule?.schedule_day ?? subj.class_schedule?.scheduleDay ?? 'TBA';
                      const startTime = subj.class_schedule?.start_time ?? subj.class_schedule?.startTime;
                      const endTime = subj.class_schedule?.end_time ?? subj.class_schedule?.endTime;
                      const scheduleTime = startTime && endTime ? `${formatTime(startTime)} – ${formatTime(endTime)}` : 'TBA';
                      const room = subj.class_schedule?.classroom?.room_number ?? subj.class_schedule?.classroom?.roomNumber ?? 'TBA';
                      const faculty = subj.class_schedule?.faculty;
                      const instructor = faculty ? `${faculty.lName}, ${faculty.fName}` : 'TBA';

                      return (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className="px-1 py-1 text-center">{subject.code || '-'}</td>
                          <td className="px-1 py-1 break-words">{subject.descriptive_title || '-'}</td>
                          <td className="px-1 py-1 text-center">{units}</td>
                          <td className="px-1 py-1 text-center">{scheduleDay}</td>
                          <td className="px-1 py-1 text-center text-[9px]">{scheduleTime}</td>
                          <td className="px-1 py-1 text-center">{room}</td>
                          <td className="px-1 py-1 text-center break-words">{instructor}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>

              <div className="flex justify-end text-xs mb-6">
                <p className="font-semibold text-gray-700">
                  Total Units:{' '}
                  <span className="ml-2 font-bold">
                    {(() => {
                      const subjects = selectedEnrollment.enrollment_subjects ?? selectedEnrollment.enrollmentSubjects ?? [];
                      return subjects.reduce((sum, subj) => {
                        const curriculum = subj.class_schedule?.curriculum_subject ?? subj.class_schedule?.curriculumSubject;
                        const lec = curriculum?.lec_unit ?? curriculum?.lecUnit ?? 0;
                        const lab = curriculum?.lab_unit ?? curriculum?.labUnit ?? 0;
                        return sum + lec + lab;
                      }, 0);
                    })()}
                  </span>
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
