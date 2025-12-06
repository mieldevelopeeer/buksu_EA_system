import React from "react";
import { Head } from "@inertiajs/react";
import { BellSimple } from "phosphor-react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";

export default function ProgramHeadNotificationsIndex({ notifications = [] }) {
  return (
    <>
      <Head title="Notifications" />
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 font-sans text-slate-700">
        <header className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <BellSimple size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Program Head Notifications</h1>
            <p className="text-sm text-slate-500">Live updates for curriculum and enrollment activities.</p>
          </div>
        </header>

        <section className="space-y-3">
          {notifications.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-400">
              You're all caught up.
            </div>
          )}

          {notifications.map((entry) => (
            <article
              key={entry.id}
              className={`rounded-2xl border px-4 py-3 shadow-sm ${entry.is_read ? "border-slate-200 bg-white" : "border-indigo-100 bg-indigo-50"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">{entry.title}</h2>
                {entry.type && (
                  <span className="rounded-full bg-white/80 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {entry.type.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600">{entry.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                {entry.created_at && <span>{formatDate(entry.created_at)}</span>}
                {entry.url && (
                  <a
                    href={entry.url}
                    className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-indigo-600 transition hover:border-indigo-200 hover:bg-indigo-50"
                  >
                    View details
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}

ProgramHeadNotificationsIndex.layout = (page) => (
  <ProgramHeadLayout>{page}</ProgramHeadLayout>
);

function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}
