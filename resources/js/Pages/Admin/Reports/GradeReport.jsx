import React, { useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import ProgramHeadGradeReport from '@/Pages/ProgramHead/PHreports/GradeReport';

const formatProgramLabel = (entry = {}) => {
  return [entry.course_code ?? entry.code, entry.course_name ?? entry.name]
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .join(' · ');
};

export default function GradeReport() {
  const { totals = {}, statusSummary = [], byCourse = [], bySchoolYear = [], recentGrades = [], auth, programHead = null, campusHead = null } = usePage().props;

  const administratorName = useMemo(() => {
    const user = auth?.user;
    if (!user) return null;
    return [user.fName, user.mName, user.lName]
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .join(' ');
  }, [auth?.user]);

  const summary = useMemo(() => {
    const byRemarks = statusSummary.reduce((acc, item) => {
      if (!item?.status) return acc;
      acc[item.status] = item.count ?? 0;
      return acc;
    }, {});

    const topSubjects = byCourse
      .map((course) => ({
        subject: formatProgramLabel(course) || 'Program',
        total: course.records ?? 0,
      }))
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 5);

    return {
      total: totals.records ?? 0,
      average: totals.average ?? null,
      by_remarks: byRemarks,
      top_subjects: topSubjects,
      meta: {
        campus: 'ALUBIJID',
        semester: 'All',
        school_year: 'All',
        instructor: 'Multiple',
        program_head: programHead ?? administratorName ?? 'Administrator',
        campus_head: campusHead ?? 'Registrar',
        subject_code: null,
        subject_description: null,
        schedule: null,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      },
    };
  }, [administratorName, byCourse, statusSummary, totals.average, totals.records]);

  const recent = useMemo(() => {
    return recentGrades.map((entry) => {
      const courseLabel = [entry.course_code, entry.course_name]
        .filter((value) => typeof value === 'string' && value.trim().length > 0 && value !== 'N/A')
        .join(' · ');

      return {
        id: entry.id,
        student: entry.student ?? 'Unnamed',
        student_id: entry.student_id ?? '—',
        subject_code: entry.subject_code ?? '—',
        course: courseLabel || '—',
        semester: entry.semester ?? '—',
        school_year: entry.school_year ?? '—',
        faculty: entry.faculty ?? '—',
        schedule: entry.schedule ?? '—',
        grade: entry.grade ?? '—',
        remarks: entry.remarks ?? entry.status ?? '—',
        updated_at: entry.recorded_at ?? null,
      };
    });
  }, [recentGrades]);

  return (
    <AdminLayout>
      <Head title="Grade Report" />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <ProgramHeadGradeReport
          summary={summary}
          recent={recent}
        />
      </div>
    </AdminLayout>
  );
}
