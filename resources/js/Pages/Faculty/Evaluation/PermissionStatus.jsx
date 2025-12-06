import React from "react";
import { Head } from "@inertiajs/react";
import FacultyLayout from "@/Layouts/FacultyLayout";
import { ShieldWarning } from "phosphor-react";

export default function PermissionStatus({ snapshot = {} }) {
  const { hasPermission = false, canPrintCor = false, departmentCourses = [] } = snapshot;

  return (
    <FacultyLayout>
      <Head title="Permission Status" />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-xl rounded-2xl border border-amber-200/70 bg-white/95 p-6 text-center shadow-[0_15px_35px_rgba(250,204,21,0.2)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <ShieldWarning size={32} />
          </div>
          <h1 className="text-xl font-semibold text-slate-800">Permission Required</h1>
          <p className="mt-2 text-sm text-slate-600">
            {!hasPermission
              ? "You currently do not have active enrollment evaluation permissions. Please coordinate with your Program Head to request access."
              : canPrintCor
              ? "Your permissions are active. You may proceed with evaluation tasks."
              : "You have evaluation access but COR printing is disabled for your account. Contact your Program Head if you believe this is a mistake."}
          </p>

          {Array.isArray(departmentCourses) && departmentCourses.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department Courses</p>
              <ul className="mt-1 list-disc pl-5 text-[13px]">
                {departmentCourses.map((course) => (
                  <li key={course.id}>{course.code || course.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </FacultyLayout>
  );
}
