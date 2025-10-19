import React, { useEffect, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, UserCircle as DefaultAvatarIcon } from 'phosphor-react';
import { Loader2 } from 'lucide-react';

export default function StudentGrades({
  student = {},
  course = {},
  yearLevel = {},
  section = {},
  semester = {},
  schoolYear = {},
  enrolledSubjects = [],
}) {
  const [loading, setLoading] = useState(true);

  const formatGradeValue = (value) => {
    if (value === null || value === undefined) return '-';
    const num = Number(value);
    if (Number.isNaN(num)) return '-';
    const rounded = Math.round(num * 100) / 100;
    let formatted = rounded.toFixed(2);
    if (/\.0[1-9]$/.test(formatted)) {
      formatted = formatted.replace('.0', '.');
    }
    formatted = formatted.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    if (formatted.startsWith('0.')) {
      formatted = formatted.substring(1);
    }
    return formatted;
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const groupedSubjects = enrolledSubjects.reduce((collection, subject) => {
    const year = subject.class_schedule?.year_level?.year_level ?? 'Unknown Year';
    const sem = subject.class_schedule?.semester?.semester ?? 'Unknown Semester';

    if (!collection[year]) collection[year] = {};
    if (!collection[year][sem]) collection[year][sem] = [];

    const midterm = parseFloat(subject.grades?.midterm);
    const final = parseFloat(subject.grades?.final);
    const validMidterm = !Number.isNaN(midterm);
    const validFinal = !Number.isNaN(final);

    const computedFinal = validMidterm && validFinal ? (midterm + final) / 2 : null;

    const computedRemarks = computedFinal !== null
      ? computedFinal <= 3.0 ? 'Passed' : 'Failed'
      : subject.grades?.remarks ?? 'Incomplete';

    collection[year][sem].push({
      ...subject,
      grades: {
        ...subject.grades,
        midterm: validMidterm ? formatGradeValue(midterm) : subject.grades?.midterm ?? '-',
        final: validFinal ? formatGradeValue(final) : subject.grades?.final ?? '-',
      },
      computedFinalGrade: computedFinal !== null ? formatGradeValue(computedFinal) : null,
      computedRemarks,
    });

    return collection;
  }, {});

  return (
    <AdminLayout>
      <Head title={`Student Grades - ${student.fName ?? 'Student'}`} />

      <div className="p-4 text-xs text-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href={route('admin.academic.grades')}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50"
          >
            <ArrowLeft size={14} /> Back to Grades
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span className="mt-2 text-[11px]">Loading grade record...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="rounded-lg border border-gray-200 bg-white/80 p-4 shadow-sm">
              <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-blue-50 text-base font-semibold text-blue-600 shadow-sm">
                    {student.profile_picture ? (
                      <img src={`/storage/${student.profile_picture}`} alt={`${student.fName ?? 'Student'} avatar`} className="h-full w-full object-cover" />
                    ) : (student.fName || student.lName) ? (
                      `${(student.fName ?? '').charAt(0)}${(student.lName ?? '').charAt(0)}`.trim()
                    ) : (
                      <DefaultAvatarIcon size={26} className="text-blue-300" />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Student</p>
                    <h1 className="text-sm font-semibold text-gray-900">
                      {student.fName ?? ''} {student.mName ?? ''} {student.lName ?? ''}
                    </h1>
                    <p className="mt-1 text-[11px] text-gray-500">ID: {student.id_number ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-600">
                    {course?.code ?? 'No Course'}
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-600">
                    {yearLevel?.year_level ?? '—'}
                  </span>
                </div>
              </header>

              <div className="mt-4 grid gap-3 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-gray-500">Student Number</p>
                  <p className="font-medium text-gray-800">{student.id_number ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">Course</p>
                  <p className="font-medium text-gray-800">{course.code ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">Year Level</p>
                  <p className="font-medium text-gray-800">{yearLevel.year_level ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">Section</p>
                  <p className="font-medium text-gray-800">{section.section ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">Semester</p>
                  <p className="font-medium text-gray-800">{semester.semester ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">School Year</p>
                  <p className="font-medium text-gray-800">{schoolYear.school_year ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium text-gray-800">{student.email ?? '—'}</p>
                </div>
              </div>
            </section>

            {Object.entries(groupedSubjects).map(([year, semesters]) => (
              <section key={year} className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-900">{year}</h2>
                {Object.entries(semesters).map(([sem, subjects]) => (
                  <div key={sem} className="rounded-lg border border-gray-200 bg-white/80 shadow-sm">
                    <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-[11px] font-medium text-gray-600">
                      {sem}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-[11px]">
                        <thead className="bg-gray-50 text-gray-500 uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left">Subject Code</th>
                            <th className="px-3 py-2 text-left">Subject Title</th>
                            <th className="px-3 py-2 text-center">Midterm</th>
                            <th className="px-3 py-2 text-center">Final</th>
                            <th className="px-3 py-2 text-center">Final Grade</th>
                            <th className="px-3 py-2 text-center">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          {subjects.map((subject) => (
                            <tr key={subject.id}>
                              <td className="px-3 py-2 font-medium text-gray-900">
                                {subject.class_schedule?.curriculum_subject?.subject?.code ?? '—'}
                              </td>
                              <td className="px-3 py-2">
                                {subject.class_schedule?.curriculum_subject?.subject?.descriptive_title ?? '—'}
                              </td>
                              <td className="px-3 py-2 text-center">{subject.grades?.midterm ?? '-'}</td>
                              <td className="px-3 py-2 text-center">{subject.grades?.final ?? '-'}</td>
                              <td className="px-3 py-2 text-center">
                                {subject.computedFinalGrade ?? subject.grades?.final ?? '-'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span
                                  className={`rounded-full px-2 py-0.5 font-medium ${subject.computedRemarks === 'Passed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : subject.computedRemarks === 'Failed'
                                      ? 'bg-red-100 text-red-600'
                                      : 'bg-gray-100 text-gray-600'}`}
                                >
                                  {subject.computedRemarks}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
