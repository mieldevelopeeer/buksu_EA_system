import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, UserCircle as DefaultAvatarIcon } from 'phosphor-react';
import { Loader2 } from 'lucide-react';

export default function StudentGrades({
  student = {},
  course = {},
  major = {},
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

  const parseGradeNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  };

  const formatStatusLabel = (value) => {
    if (!value || typeof value !== 'string') return null;
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const statusToneClass = (status) => {
    if (!status) return 'bg-gray-100 text-gray-600';
    const normalized = status.toLowerCase();
    if (/(approved|confirmed|completed|released)/.test(normalized)) {
      return 'bg-emerald-100 text-emerald-700';
    }
    if (/(pending|submitted|waiting|for review|request)/.test(normalized)) {
      return 'bg-amber-100 text-amber-700';
    }
    if (/(rejected|declined|returned|failed)/.test(normalized)) {
      return 'bg-red-100 text-red-600';
    }
    if (/change|revision|update/.test(normalized)) {
      return 'bg-indigo-100 text-indigo-700';
    }
    return 'bg-gray-100 text-gray-600';
  };

  const formatDateTime = (value) => {
    if (!value) return null;
    try {
      return new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (error) {
      return value;
    }
  };

  const GradeCell = ({ value, status, changeStatus }) => (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-medium text-gray-800">{value ?? '-'}</span>
      {status && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusToneClass(status)}`}>
          {status}
        </span>
      )}
      {changeStatus && (
        <span className={`text-[9px] px-2 py-0.5 rounded-full ${statusToneClass(changeStatus)}`}>
          {changeStatus}
        </span>
      )}
    </div>
  );

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const groupedSubjects = useMemo(() => {
    return enrolledSubjects.reduce((collection, subject) => {
      const classSchedule = subject.class_schedule ?? subject.classSchedule;
      const resolvedYearLevel = classSchedule?.year_level?.year_level
        ?? subject.year_level?.year_level
        ?? subject.resolvedCurriculum?.year_level?.year_level
        ?? subject.yearLevel?.year_level
        ?? null;
      const resolvedSemester = classSchedule?.semester?.semester
        ?? subject.semester?.semester
        ?? subject.resolvedCurriculum?.semester?.semester
        ?? subject.semesterLabel
        ?? null;

      const year = resolvedYearLevel ?? 'Unknown Year';
      const sem = resolvedSemester ?? 'Unknown Semester';

      const curriculumFromSchedule = classSchedule?.curriculum_subject ?? classSchedule?.curriculumSubject;
      const curriculumDirect = subject.curriculum_subject ?? subject.curriculumSubject;
      const resolvedCurriculum = curriculumFromSchedule ?? curriculumDirect;
      const subjectMeta = resolvedCurriculum?.subject;
      const lecUnits = Number(resolvedCurriculum?.lec_unit ?? resolvedCurriculum?.lecUnit ?? 0);
      const labUnits = Number(resolvedCurriculum?.lab_unit ?? resolvedCurriculum?.labUnit ?? 0);

      const gradeRecord = subject.grades ?? {};
      const midtermRaw = parseGradeNumber(gradeRecord.midterm);
      const finalRaw = parseGradeNumber(gradeRecord.final);
      const summerRaw = parseGradeNumber(gradeRecord.summer);
      const storedFinalRaw = parseGradeNumber(gradeRecord.grade);

      const computedFinalNumeric =
        storedFinalRaw ?? (midtermRaw !== null && finalRaw !== null ? (midtermRaw + finalRaw) / 2 : null);

      const computedFinalGrade =
        computedFinalNumeric !== null ? formatGradeValue(computedFinalNumeric) : null;

      const computedRemarks = gradeRecord.remarks
        ?? (computedFinalNumeric !== null ? (computedFinalNumeric <= 3.0 ? 'Passed' : 'Failed') : 'Incomplete');

      if (!collection[year]) collection[year] = {};
      if (!collection[year][sem]) collection[year][sem] = [];

      const midterm = parseFloat(subject.grades?.midterm);
      const final = parseFloat(subject.grades?.final);
      const validMidterm = !Number.isNaN(midterm);
      const validFinal = !Number.isNaN(final);

      const finalGradeDisplay =
        computedFinalGrade
        ?? (storedFinalRaw !== null ? formatGradeValue(storedFinalRaw) : gradeRecord.grade ?? '-');

      collection[year][sem].push({
        ...subject,
        class_schedule: classSchedule,
        resolvedCurriculum,
        subjectMeta,
        units: lecUnits + labUnits,
        grades: {
          ...subject.grades,
          midterm: validMidterm ? formatGradeValue(midterm) : subject.grades?.midterm ?? '-',
          final: validFinal ? formatGradeValue(final) : subject.grades?.final ?? '-',
          summer: summerRaw !== null ? formatGradeValue(summerRaw) : subject.grades?.summer ?? '-',
        },
        gradeView: {
          midterm: midtermRaw !== null ? formatGradeValue(midtermRaw) : gradeRecord.midterm ?? '-',
          final: finalRaw !== null ? formatGradeValue(finalRaw) : gradeRecord.final ?? '-',
          summer: summerRaw !== null ? formatGradeValue(summerRaw) : gradeRecord.summer ?? '-',
          finalGrade: finalGradeDisplay,
          statuses: {
            midterm: formatStatusLabel(gradeRecord.midterm_status ?? gradeRecord.midtermStatus),
            final: formatStatusLabel(gradeRecord.final_status ?? gradeRecord.finalStatus),
            summer: formatStatusLabel(gradeRecord.summer_status ?? gradeRecord.summerStatus),
          },
          changeStatuses: {
            midterm: formatStatusLabel(gradeRecord.midterm_change_status ?? gradeRecord.midtermChangeStatus),
            final: formatStatusLabel(gradeRecord.final_change_status ?? gradeRecord.finalChangeStatus),
            summer: formatStatusLabel(gradeRecord.summer_change_status ?? gradeRecord.summerChangeStatus),
          },
          confirmedBy: gradeRecord.confirmed_by ?? gradeRecord.confirmedBy ?? null,
          confirmedAt: gradeRecord.confirmed_at ?? gradeRecord.confirmedAt ?? null,
          remarks: computedRemarks,
        },
        yearLabel: year,
        semesterLabel: sem,
        computedFinalGrade: computedFinalGrade,
        computedRemarks,
      });

      return collection;
    }, {});
  }, [enrolledSubjects]);

  const courseLabel = useMemo(() => {
    return [course.code, major?.code].filter(Boolean).join(' ') || course.name || '—';
  }, [course, major]);

  const formattedName = useMemo(() => {
    return [student.lName, [student.fName, student.mName].filter(Boolean).join(' ').trim()]
      .filter((part) => part && part.trim().length)
      .join(', ');
  }, [student]);

  const periodLabel = useMemo(() => {
    const semesterLabel = semester.semester ?? '—';
    const schoolYearLabel = schoolYear.school_year ?? '—';
    return `${semesterLabel}, ${schoolYearLabel}`;
  }, [semester, schoolYear]);

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
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-600">
                    {courseLabel}
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-600">
                    {yearLevel?.year_level ?? '—'}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-600">
                    {section?.section ?? '—'}
                  </span>
                </div>
              </header>

              <div className="mt-4 grid gap-3 text-[11px] sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-gray-500">Student</p>
                  <p className="font-medium text-gray-800">{formattedName || student.id_number || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">Period</p>
                  <p className="font-medium text-gray-800">{periodLabel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">Course / Major</p>
                  <p className="font-medium text-gray-800">{courseLabel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">Section</p>
                  <p className="font-medium text-gray-800">{section.section ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium text-gray-800">{student.email ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">Last Updated</p>
                  <p className="font-medium text-gray-800">{formatDate(section.updated_at ?? enrolledSubjects?.[0]?.updated_at)}</p>
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
                            <th className="px-3 py-2 text-center">Year Level</th>
                            <th className="px-3 py-2 text-center">Semester</th>
                            <th className="px-3 py-2 text-center">Midterm</th>
                            <th className="px-3 py-2 text-center">Final</th>
                            <th className="px-3 py-2 text-center">Summer</th>
                            <th className="px-3 py-2 text-center">Final Grade</th>
                            <th className="px-3 py-2 text-center">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          {subjects.map((subject) => (
                            <tr key={subject.id}>
                              <td className="px-3 py-2 font-medium text-gray-900">
                                {subject.subjectMeta?.code ??
                                  subject.class_schedule?.curriculum_subject?.subject?.code ??
                                  subject.curriculum_subject?.subject?.code ?? '—'}
                              </td>
                              <td className="px-3 py-2">
                                {subject.subjectMeta?.descriptive_title ??
                                  subject.class_schedule?.curriculum_subject?.subject?.descriptive_title ??
                                  subject.curriculum_subject?.subject?.descriptive_title ?? '—'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                  {subject.yearLabel}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="inline-flex items-center justify-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                                  {subject.semesterLabel}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center align-top">
                                <GradeCell
                                  value={subject.gradeView?.midterm ?? subject.grades?.midterm}
                                  status={subject.gradeView?.statuses?.midterm}
                                  changeStatus={subject.gradeView?.changeStatuses?.midterm}
                                />
                              </td>
                              <td className="px-3 py-2 text-center align-top">
                                <GradeCell
                                  value={subject.gradeView?.final ?? subject.grades?.final}
                                  status={subject.gradeView?.statuses?.final}
                                  changeStatus={subject.gradeView?.changeStatuses?.final}
                                />
                              </td>
                              <td className="px-3 py-2 text-center align-top">
                                <GradeCell
                                  value={subject.gradeView?.summer ?? subject.grades?.summer}
                                  status={subject.gradeView?.statuses?.summer}
                                  changeStatus={subject.gradeView?.changeStatuses?.summer}
                                />
                              </td>
                              <td className="px-3 py-2 text-center align-top">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="font-semibold text-gray-900">
                                    {subject.gradeView?.finalGrade ?? subject.computedFinalGrade ?? subject.grades?.final ?? '-'}
                                  </span>
                                  {(subject.gradeView?.confirmedBy || subject.gradeView?.confirmedAt) && (
                                    <span className="text-[9px] text-gray-500">
                                      {subject.gradeView?.confirmedBy ? `By ${subject.gradeView.confirmedBy}` : ''}
                                      {subject.gradeView?.confirmedAt ? ` • ${formatDateTime(subject.gradeView.confirmedAt)}` : ''}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span
                                  className={`rounded-full px-2 py-0.5 font-medium ${subject.computedRemarks === 'Passed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : subject.computedRemarks === 'Failed'
                                      ? 'bg-red-100 text-red-600'
                                      : 'bg-gray-100 text-gray-600'}`}
                                >
                                  {subject.gradeView?.remarks ?? subject.computedRemarks}
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
