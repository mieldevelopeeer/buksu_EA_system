import React from "react";
import { Clock } from "phosphor-react";
import { router } from "@inertiajs/react";

export default function SectionDetails({ section, onBack }) {
  const handleSubjectClick = (sched) => {
    if (!sched?.id) return;
    router.visit(`/faculty/classes/subject/${sched.id}`);
  };

  if (!section) return null;

  const subjects = section.schedules ?? [];

  const getInitials = (label = "") => {
    const parts = label.trim().split(" ");
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Array of soft pastel colors for cards
  const cardColors = [
    "bg-indigo-50", 
    "bg-green-50", 
    "bg-yellow-50", 
    "bg-pink-50", 
    "bg-purple-50"
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Subjects for
          </p>
          <h3 className="text-[15px] font-semibold text-slate-900">
            {section.sectionName}
          </h3>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-slate-300 px-4 py-1.5 text-[11px] 
                     font-medium text-slate-700 shadow-sm hover:bg-slate-50 
                     transition-all hover:shadow-md"
        >
          ← Back
        </button>
      </div>

      {/* EMPTY STATE */}
      {subjects.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-7 
                      text-center text-sm text-slate-500">
          No subjects assigned to this section yet.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((sched, idx) => {
            const bgColor = cardColors[idx % cardColors.length]; // cycle colors
            return (
              <button
                key={`${section.id}-subject-${idx}`}
                type="button"
                onClick={() => handleSubjectClick(sched)}
                disabled={!sched?.id}
                className={`
                  group flex w-full flex-col overflow-hidden rounded-2xl 
                  border border-slate-200 ${bgColor} 
                  text-left shadow-sm transition transform 
                  hover:-translate-y-1 hover:shadow-lg
                `}
              >
                {/* CARD TOP */}
                <div className="relative flex items-center justify-between border-b border-slate-200 px-4 py-2">
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                    Subject
                  </span>

                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-slate-700">
                    {getInitials(sched.subject || "?")}
                  </span>

                  {/* Glow on hover */}
                  <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_55%)] opacity-0 transition group-hover:opacity-100" />
                </div>

                {/* CONTENT */}
                <div className="flex flex-col px-4 py-3 space-y-2">
                  <h4 className="text-[13px] font-semibold text-slate-900 group-hover:text-slate-800 transition-colors">
                    {sched.subject || "Untitled"}
                  </h4>

                  <p className="line-clamp-2 text-[11px] text-slate-600 leading-snug">
                    {sched.description || "Click to view class details"}
                  </p>

                  {/* SCHEDULE */}
                  <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] tracking-wide text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                      <Clock size={10} />
                      {sched.time || "TBA"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200">
                      {sched.day || "Schedule"}
                    </span>
                  </div>
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-between border-t border-slate-200 bg-white/50 px-4 py-2 text-[10px] text-slate-600">
                  <span className="font-medium">Room {sched.room || "TBA"}</span>
                  <span className="inline-flex items-center gap-1 text-slate-800 font-medium">
                    Open →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
