import React from "react";
import FacultyLayout from "@/Layouts/FacultyLayout";
import { Head, router } from "@inertiajs/react";
import SectionDetails from "./SectionDetails";

export default function SectionDetailsPage({ user, section }) {
  const breadcrumbs = [
    { label: "Classes", href: "/faculty/classes" },
    { label: section?.sectionName || "Section" },
  ];

  return (
    <FacultyLayout user={user}>
      <Head title={`Section: ${section?.sectionName ?? "Details"}`} />

      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-6">
        <div className="space-y-6">

          {/* TOP PANEL (Smaller, Compact) */}
          <div className="rounded-2xl border border-slate-200/70 bg-white/95 px-6 py-4 shadow-sm backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3">

              {/* Breadcrumbs */}
              <nav className="flex items-center text-[11px] font-medium text-slate-500">
                {breadcrumbs.map((item, idx) => (
                  <span key={idx} className="flex items-center">
                    {idx > 0 && (
                      <span className="mx-1 text-slate-300">/</span>
                    )}
                    {item.href ? (
                      <a
                        href={item.href}
                        className="text-slate-700 hover:text-slate-900 transition font-semibold"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span className="text-slate-900 font-semibold">
                        {item.label}
                      </span>
                    )}
                  </span>
                ))}
              </nav>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => router.visit("/faculty/classes")}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1.5 
                           text-[11px] font-medium text-slate-700 shadow hover:bg-slate-50 hover:shadow-md transition-all"
              >
                ← Back
              </button>
            </div>

            {/* Header Title (Compact) */}
            <div className="mt-3">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                {section?.sectionName || "Section"}
              </h1>
              <p className="mt-0.5 text-xs text-slate-600">
                {section?.courseName || "Course"}
                {section?.majorName ? ` • ${section.majorName}` : ""}
              </p>
            </div>
          </div>

          {/* INFORMATION NOTE */}
          <p className="text-[11px] text-slate-500 px-1 italic">
            Only subjects assigned to you are shown. Other subjects belong to different faculty.
          </p>

          {/* DETAILS SECTION (Full Width) */}
          <div className="rounded-2xl bg-white/95 p-6 shadow-sm border border-slate-200/70 backdrop-blur-md w-full">
            <SectionDetails
              section={section}
              onBack={() => router.visit("/faculty/classes")}
            />
          </div>
        </div>
      </div>
    </FacultyLayout>
  );
}
