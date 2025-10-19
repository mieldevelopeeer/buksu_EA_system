import React, { useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Building2, Users, Mail, Phone, GraduationCap, UserCircle2 } from 'lucide-react';

const formatProgramHeadName = (head = {}) => {
  const parts = [head.lName, head.fName, head.mName, head.suffix]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);

  if (parts.length === 0) {
    return 'Unassigned';
  }

  const [lastName, firstName, middleName, suffix] = parts;
  const formatted = [
    lastName,
    [firstName, middleName].filter(Boolean).join(' '),
    suffix,
  ]
    .filter(Boolean)
    .join(', ');

  return formatted || 'Unassigned';
};

const formatContact = (head = {}) => {
  const contact = head.contact_no;
  if (!contact) return 'No contact number provided';
  return contact;
};

const formatEmail = (head = {}) => {
  const email = head.email;
  if (!email) return 'No email provided';
  return email;
};

const ProgramHeadCard = ({ head }) => {
  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300">
      <div className="flex flex-wrap items-start justify-between gap-1.5">
        <div className="flex items-center gap-1.5 text-gray-900">
          {head.profile_picture ? (
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-blue-50">
              <img
                src={head.profile_picture}
                alt={formatProgramHeadName(head)}
                className="h-full w-full object-cover"
              />
            </span>
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <UserCircle2 size={18} />
            </span>
          )}
          <div>
            <p className="text-[13px] font-semibold text-gray-900">{formatProgramHeadName(head)}</p>
            {head.department?.name && <p className="text-[10px] text-gray-500">{head.department.name}</p>}
          </div>
        </div>
        {head.id_number && (
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
            ID: {head.id_number}
          </span>
        )}
      </div>

      <div className="mt-2 grid gap-1.5 text-[11px] text-gray-600 sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <Mail size={12} className="text-blue-500" />
          <span className="truncate" title={formatEmail(head)}>
            {formatEmail(head)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Phone size={12} className="text-blue-500" />
          <span>{formatContact(head)}</span>
        </div>
      </div>
    </div>
  );
};

const DepartmentCard = ({ department, heads = [] }) => {
  const hasDescription = Boolean(department.description?.trim());
  const sortedHeads = [...heads].sort((a, b) => {
    const nameA = formatProgramHeadName(a).toLowerCase();
    const nameB = formatProgramHeadName(b).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <article className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 via-sky-500 to-blue-400" />
      <div className="p-4">
        <header className="flex flex-col gap-2 border-b border-dashed border-blue-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-medium text-blue-600">
              <Building2 size={12} /> Department
            </span>
            <h2 className="text-[15px] font-semibold text-slate-900">{department.name}</h2>
            <p className="text-[11px] leading-relaxed text-slate-600">
              {hasDescription ? department.description : 'No description provided for this department.'}
            </p>
          </div>
          <div className="flex flex-col items-start gap-0.5 sm:items-end">
            <span className="rounded-lg bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600">
              {sortedHeads.length} Program Head{sortedHeads.length === 1 ? '' : 's'}
            </span>
            {sortedHeads.length === 0 && (
              <span className="text-[10px] font-medium text-amber-600">Assignment Required</span>
            )}
          </div>
        </header>

        <div className="mt-3 space-y-2.5">
          {sortedHeads.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-blue-100 bg-blue-50 px-3 py-3 text-[12px] text-blue-600">
              <Users size={16} className="text-blue-400" /> No program head assigned yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedHeads.map((head) => (
                <ProgramHeadCard key={head.id} head={head} />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default function Departments() {
  const {
    departments = [],
    departmentsMeta = {},
    programHeads = [],
  } = usePage().props;

  const programHeadList = useMemo(() => {
    return Array.isArray(programHeads) ? programHeads : [];
  }, [programHeads]);

  const headsByDepartment = useMemo(() => {
    return programHeadList.reduce((acc, head) => {
      const departmentId = head.department_id ?? head.departmentId ?? null;
      if (departmentId == null) return acc;
      if (!acc[departmentId]) acc[departmentId] = [];
      acc[departmentId].push(head);
      return acc;
    }, {});
  }, [programHeadList]);

  const departmentList = useMemo(() => {
    const data = Array.isArray(departments) ? departments : [];
    return data.map((department) => ({
      ...department,
      heads: headsByDepartment[department.id] ?? [],
    }));
  }, [departments, headsByDepartment]);

  const stats = useMemo(() => {
    const totalDepartments = departmentsMeta?.total ?? departmentList.length;
    const totalHeads = programHeadList.length;
    const assignedDepartments = departmentList.filter((item) => item.heads.length > 0).length;
    const unassignedDepartments = Math.max(totalDepartments - assignedDepartments, 0);

    return [
      {
        label: 'Total Departments',
        value: totalDepartments,
      },
      {
        label: 'Program Heads',
        value: totalHeads,
      },
      {
        label: 'Assigned Departments',
        value: assignedDepartments,
      },
      {
        label: 'Awaiting Assignment',
        value: unassignedDepartments,
      },
    ];
  }, [departments.meta, departmentList, programHeadList]);

  const currentDepartmentPage = departmentsMeta?.current_page ?? 1;
  const departmentLinks = departmentsMeta?.links ?? [];

  const handleDepartmentPageChange = (page) => {
    if (!page || page === currentDepartmentPage) return;
    router.get(
      route('admin.programs.departments'),
      { page },
      {
        preserveState: true,
        preserveScroll: true,
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-5 bg-white px-5 py-5 text-[13px] text-gray-800">
        <header className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                Departments &amp; Programs
              </span>
              <h1 className="text-lg font-semibold text-slate-900">Department Leadership Overview</h1>
              <p className="text-[11px] text-slate-600">
                Reference current academic departments together with their designated program heads and contact details.
              </p>
            </div>

            <div className="grid w-full gap-2 text-[10px] sm:w-auto sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-center shadow-sm">
                  <p className="text-[9px] uppercase tracking-wide text-gray-500">{stat.label}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        {departmentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50 py-12 text-center text-blue-500">
            <Building2 size={32} className="mb-3 text-blue-300" />
            <p className="text-sm font-semibold">No departments found.</p>
            <p className="mt-1 max-w-sm text-[11px] text-blue-600">
              Departments and program heads will appear here once they have been registered within the system.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {departmentList.map((department) => (
              <DepartmentCard
                key={department.id ?? department.name}
                department={department}
                heads={department.heads}
              />
            ))}
          </div>
        )}

        <PaginationControls
          meta={{ links: departmentLinks, current_page: currentDepartmentPage }}
          onNavigate={handleDepartmentPageChange}
        />
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
