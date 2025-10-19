import React, { useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Building2, Layers, BookOpen, ChevronRight } from 'lucide-react';

const groupCoursesByDepartment = (departments = [], courses = []) => {
  const byDepartment = courses.reduce((acc, course) => {
    const depId = course.department_id;
    if (!depId) return acc;
    if (!acc[depId]) acc[depId] = [];
    acc[depId].push(course);
    return acc;
  }, {});

  return departments.map((department) => ({
    ...department,
    courses: byDepartment[department.id] ?? [],
  }));
};

const CourseCard = ({ course }) => {
  const majors = Array.isArray(course.majors) ? course.majors : [];

  return (
    <div className="rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-blue-500">{course.code}</p>
          <h4 className="text-[13px] font-semibold text-slate-900">{course.name}</h4>
          {course.description && (
            <p className="text-[11px] text-slate-600 leading-relaxed">{course.description}</p>
          )}
        </div>
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
          {course.degree_type ?? 'Program'}
        </span>
      </div>

      <div className="mt-2 space-y-2 text-[11px] text-slate-600">
        <div className="flex items-center gap-2">
          <Layers size={12} />
          <span>Status: {course.status ?? 'N/A'}</span>
        </div>
        <div className="rounded-xl border border-dashed border-blue-100 bg-blue-50 px-3 py-2 text-blue-600">
          <div className="flex items-center gap-1 text-[11px] font-medium">
            <ChevronRight size={12} /> Majors
          </div>
          {majors.length === 0 ? (
            <p className="mt-1 text-[10px] text-blue-500">No majors assigned.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-[10px]">
              {majors.map((major) => (
                <li key={major.id} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="font-medium">{major.name}</span>
                  {major.code && <span className="text-blue-400">[{major.code}]</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const DepartmentSection = ({ department }) => {
  const courses = department.courses ?? [];

  return (
    <section className="rounded-2xl border border-blue-100 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-50 px-4 py-3">
        <div className="flex items-center gap-2 text-blue-600">
          <Building2 size={16} />
          <h3 className="text-sm font-semibold text-slate-900">{department.name}</h3>
        </div>
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
          {courses.length} course{courses.length === 1 ? '' : 's'}
        </span>
      </header>

      <div className="grid gap-3 px-4 py-4 md:grid-cols-2">
        {courses.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-blue-100 bg-blue-50 px-4 py-4 text-center text-[11px] text-blue-600">
            No courses listed for this department yet.
          </div>
        ) : (
          courses.map((course) => <CourseCard key={course.id ?? course.code} course={course} />)
        )}
      </div>
    </section>
  );
};

export default function Courses() {
  const { departments = [], courses = [], coursesMeta = {} } = usePage().props;

  const grouped = useMemo(() => {
    return groupCoursesByDepartment(departments, courses);
  }, [departments, courses]);

  const totalCourses = coursesMeta.total ?? courses.length;
  const totalDepartments = grouped.length;
  const withMajors = courses.filter((course) => Array.isArray(course.majors) && course.majors.length > 0).length;

  const currentPage = coursesMeta.current_page ?? 1;
  const links = coursesMeta.links ?? [];

  const handlePageChange = (page) => {
    if (!page || page === currentPage) return;
    router.get(
      route('admin.programs.courses'),
      { page },
      { preserveState: true, preserveScroll: true }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-4 bg-white px-5 py-5 text-[13px] text-slate-800">
        <header className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                Courses & Majors
              </span>
              <h1 className="text-lg font-semibold text-slate-900">Course Catalog Overview</h1>
              <p className="text-[11px] text-slate-600">
                Review academic programs and any majors available for each department-managed course.
              </p>
            </div>

            <div className="grid w-full gap-2 text-[10px] sm:w-auto sm:grid-cols-3">
              <div className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-center shadow-sm">
                <p className="text-[9px] uppercase tracking-wide text-gray-500">Departments</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{totalDepartments}</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-center shadow-sm">
                <p className="text-[9px] uppercase tracking-wide text-gray-500">Courses</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{totalCourses}</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-center shadow-sm">
                <p className="text-[9px] uppercase tracking-wide text-gray-500">With Majors</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{withMajors}</p>
              </div>
            </div>
          </div>
        </header>

        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50 py-12 text-center text-blue-500">
            <BookOpen size={32} className="mb-3 text-blue-300" />
            <p className="text-sm font-semibold">No courses found.</p>
            <p className="mt-1 max-w-sm text-[11px] text-blue-600">
              Courses and majors will appear here once they have been registered within the system.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((department) => (
              <DepartmentSection key={department.id ?? department.name} department={department} />
            ))}
          </div>
        )}

        <PaginationControls meta={{ links, current_page: currentPage }} onNavigate={handlePageChange} />
      </div>
    </AdminLayout>
  );
}

function PaginationControls({ meta, onNavigate }) {
  const links = meta?.links ?? [];
  if (!links.length || links.length <= 3) {
    return null;
  }

  return (
    <div className="flex justify-end pt-4">
      <nav className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1 shadow-sm">
        {links.map((link, index) => {
          const isActive = link.active;
          const isDisabled = !link.url;
          const handleClick = (event) => {
            event.preventDefault();
            if (isDisabled) return;
            const searchParams = new URLSearchParams(link.url.split('?')[1] ?? '');
            const targetPage = Number(searchParams.get('page'));
            onNavigate?.(targetPage);
          };

          return (
            <button
              key={`${link.label}-${index}`}
              onClick={handleClick}
              disabled={isDisabled}
              className={`px-3 py-1 text-[11px] font-medium transition ${
                isActive
                  ? 'rounded-lg bg-blue-600 text-white shadow'
                  : 'text-gray-500 hover:text-blue-600'
              } ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
              dangerouslySetInnerHTML={{ __html: link.label }}
            />
          );
        })}
      </nav>
    </div>
  );
}
