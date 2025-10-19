import React, { useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { GraduationCap, Eye, UserCircle as DefaultAvatarIcon } from 'phosphor-react';

export default function Grades({ students, filters = {} }) {
  const items = students?.data ?? [];
  const meta = students?.meta ?? {};
  const links = students?.links ?? [];

  const [search, setSearch] = useState(filters.search ?? '');
  const [perPage, setPerPage] = useState(Number(filters.per_page ?? 9));
  const initialised = useRef(false);

  useEffect(() => {
    setSearch(filters.search ?? '');
    setPerPage(Number(filters.per_page ?? 9));
  }, [filters.search, filters.per_page]);

  useEffect(() => {
    if (!initialised.current) {
      initialised.current = true;
      return;
    }

    const timeout = setTimeout(() => {
      router.get(
        route('admin.academic.grades'),
        { search, per_page: perPage },
        { preserveState: true, replace: true }
      );
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  const metrics = useMemo(() => {
    const total = meta.total ?? items.length;
    const active = items.length;
    const courseSet = new Set(items.map((enrollment) => enrollment.course?.code).filter(Boolean));

    return {
      total,
      active,
      courses: courseSet.size,
    };
  }, [items, meta.total]);

  const handlePerPageChange = (event) => {
    const value = Number(event.target.value);
    setPerPage(value);
    router.get(
      route('admin.academic.grades'),
      { search, per_page: value },
      { preserveState: true, replace: true }
    );
  };

  const handlePageChange = (url) => {
    if (!url) return;
    router.get(url, {}, { preserveState: true, replace: true });
  };

  return (
    <AdminLayout>
      <Head title="Student Grades" />

      <div className="p-4 text-xs text-gray-800 space-y-4">
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap size={20} className="text-indigo-400" />
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Grades</h1>
              <p className="text-[11px] text-gray-500">Review grade submissions and open detailed academic records.</p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <label className="relative w-full max-w-xs">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, ID, or course..."
                className="w-full rounded-md border border-gray-200 bg-white pl-3 pr-3 py-1.5 text-xs shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <select
              value={perPage}
              onChange={handlePerPageChange}
              className="w-full max-w-[110px] rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-medium text-gray-600 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {[9, 12, 15, 21].map((option) => (
                <option key={option} value={option}>
                  Show {option}
                </option>
              ))}
            </select>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-indigo-100 bg-white/80 p-4 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-400">Total Records</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{metrics.total}</p>
            <p className="mt-1 text-[11px] text-gray-500">Across all enrolled grade submissions.</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400">Currently Visible</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{metrics.active}</p>
            <p className="mt-1 text-[11px] text-gray-500">Filtered by your search criteria.</p>
          </div>
          <div className="rounded-xl border border-purple-100 bg-white/80 p-4 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-purple-400">Unique Programs</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{metrics.courses}</p>
            <p className="mt-1 text-[11px] text-gray-500">Number of distinct course codes represented.</p>
          </div>
        </section>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/70 py-16 text-center text-gray-400">
            <p className="text-sm font-medium">No grade records found.</p>
            <p className="mt-1 max-w-sm text-[11px]">Adjust your search filters or clear the search field to view all grade submissions.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((enrollment) => {
              const student = enrollment.student ?? {};
              const middleInitial = student.mName ? `${student.mName.charAt(0)}. ` : '';
              const enrolledAt = enrollment.enrolled_at
                ? new Date(enrollment.enrolled_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—';

              const avatar = student.profile_picture
                ? `/storage/${student.profile_picture}`
                : null;

              const initialsRaw = `${(student.fName ?? '').charAt(0)}${(student.lName ?? '').charAt(0)}`.trim();
              const initials = initialsRaw || null;

              return (
                <div
                  key={enrollment.id}
                  className="group rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-indigo-100 bg-indigo-50 text-sm font-semibold text-indigo-600 shadow-sm">
                        {avatar ? (
                          <img src={avatar} alt={`${student.fName ?? 'Student'} avatar`} className="h-full w-full object-cover" />
                        ) : initials ? (
                          initials
                        ) : (
                          <DefaultAvatarIcon size={20} className="text-indigo-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Student</p>
                        <h2 className="text-base font-semibold text-gray-900">
                          {student.fName ?? ''} {middleInitial}
                          {student.lName ?? ''}
                        </h2>
                        <p className="mt-1 text-[11px] text-gray-500">ID: {student.id_number ?? '—'}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-semibold text-indigo-600">
                      {enrollment.course?.code ?? 'No Course'}
                    </span>
                  </header>

                  <dl className="mt-4 space-y-2 text-[11px] text-gray-600">
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-gray-500">Year Level</dt>
                      <dd className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        {enrollment.year_level?.year_level ?? '—'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-gray-500">Semester</dt>
                      <dd className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-semibold text-purple-700">
                        {enrollment.semester?.semester ?? '—'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-gray-500">School Year</dt>
                      <dd className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {enrollment.school_year_label ?? '—'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="font-medium text-gray-500">Section</dt>
                      <dd className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-600">
                        {enrollment.section?.section ?? '—'}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-gray-500">
                    <div>
                      <p className="font-medium text-gray-600">Last Updated</p>
                      <p>{enrolledAt}</p>
                    </div>
                    <Link
                      href={route('admin.academic.grades.show', student.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-600 transition hover:bg-indigo-100"
                    >
                      <Eye size={14} /> View Grades
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {links.length > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-[11px] text-gray-500">
            <span>
              Showing {meta.from ?? 0}-{meta.to ?? 0} of {meta.total ?? items.length} results
            </span>
            <div className="flex items-center gap-1">
              {links.map((link, index) => {
                const label = link.label.replace('&laquo;', '«').replace('&raquo;', '»');
                return (
                  <button
                    key={`${label}-${index}`}
                    type="button"
                    onClick={() => handlePageChange(link.url)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                      link.active
                        ? 'bg-indigo-500 text-white shadow'
                        : link.url
                          ? 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!link.url}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
