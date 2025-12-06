import React, { useMemo, useState, useRef } from "react";
import { Head, usePage } from "@inertiajs/react";
import StudentLayout from "@/Layouts/StudentLayout";
import html2canvas from "html2canvas";
import { Download, BookOpen, Layers, Shield } from "lucide-react";

const STATUS_STYLES = {
    enrolled: "border-emerald-200 bg-emerald-50 text-emerald-700",
    reserved: "border-amber-200 bg-amber-50 text-amber-700",
    dropped: "border-rose-200 bg-rose-50 text-rose-700",
};

const formatDateTime = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

const parseDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildTermKey = (entry = {}) =>
    [entry.school_year_start ?? "", entry.school_year_end ?? "", entry.semester_label ?? ""].join("|");

export default function MyEnrolledSub() {
    const { subjects: rawSubjects = [], semester } = usePage().props;
    const [activeTab, setActiveTab] = useState("list");
    const listRef = useRef(null);
    const timetableRef = useRef(null);
    const today = useMemo(() => new Date(), []);

    const terms = useMemo(() => {
        const unique = new Map();

        rawSubjects.forEach((subject) => {
            const key = buildTermKey(subject);
            if (!key || unique.has(key)) return;

            unique.set(key, {
                key,
                label: subject.semester_label ?? subject.semester ?? "Term",
                schoolYear: subject.school_year ?? null,
                startDate: parseDate(subject.school_year_start),
                endDate: parseDate(subject.school_year_end),
            });
        });

        return Array.from(unique.values()).sort((a, b) => {
            const aTime = a.startDate ? a.startDate.getTime() : -Infinity;
            const bTime = b.startDate ? b.startDate.getTime() : -Infinity;
            return bTime - aTime;
        });
    }, [rawSubjects]);

    const activeTermKey = useMemo(() => {
        const match = terms.find((term) => {
            if (!term.startDate || !term.endDate) {
                return false;
            }
            return term.startDate <= today && today <= term.endDate;
        });

        if (match) {
            return match.key;
        }

        return terms[0]?.key ?? null;
    }, [terms, today]);

    const activeTerm = useMemo(() => terms.find((term) => term.key === activeTermKey) ?? null, [terms, activeTermKey]);

    const subjects = useMemo(() => {
        if (!activeTermKey) {
            return rawSubjects;
        }
        return rawSubjects.filter((subject) => buildTermKey(subject) === activeTermKey);
    }, [rawSubjects, activeTermKey]);

    // ✅ Faculty Name
    const formatFacultyName = (faculty) => {
        if (!faculty) return "TBA";
        const { fName, mName, lName } = faculty;
        return [fName, mName, lName].filter(Boolean).join(" ");
    };

    // ✅ Convert 24-hour → 12-hour
    const formatTime = (time) => {
        if (!time) return "";
        const [hour, minute] = time.split(":").map(Number);
        const ampm = hour >= 12 ? "PM" : "AM";
        const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
        return `${formattedHour}:${minute.toString().padStart(2, "0")} ${ampm}`;
    };

    const summary = useMemo(() => {
        const counts = {
            enrolled: 0,
            reserved: 0,
            dropped: 0,
        };
        let totalUnits = 0;

        subjects.forEach((subject) => {
            const statusKey = subject.status?.toLowerCase?.();
            if (statusKey && typeof counts[statusKey] === "number") {
                counts[statusKey] += 1;
            }

            if (!Number.isNaN(Number(subject.total_units))) {
                totalUnits += Number(subject.total_units);
            }
        });

        return { counts, totalUnits };
    }, [subjects]);

    // ✅ Extract timetable (hide dropped subjects)
    const timetable = subjects
        .filter((sub) => sub.schedule && sub.status !== "dropped")
        .map((sub) => ({
            code: sub.code,
            title: sub.descriptive_title,
            day: sub.schedule.day ?? "TBA",
            start: formatTime(sub.schedule.start_time),
            end: formatTime(sub.schedule.end_time),
            room: sub.schedule.room_number ?? "TBA",
        }));

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // ✅ Capture Component as Image
    const downloadImage = (ref, fileName) => {
        if (ref.current) {
            html2canvas(ref.current, { scale: 2 }).then((canvas) => {
                const link = document.createElement("a");
                link.download = `${fileName}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
            });
        }
    };

    return (
        <StudentLayout>
            <Head title="My Enrolled Subjects" />

            <div className="space-y-5 px-3 py-4 md:space-y-6 md:px-6 md:py-6">
                {/* Header */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h1 className="flex items-center gap-2 text-base font-semibold text-gray-800 md:text-xl">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        My Enrolled Subjects
                    </h1>

                    {(semester || activeTerm) && (
                        <div className="flex flex-wrap items-center gap-2 self-start rounded-full border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-1.5 text-blue-700 shadow-sm md:self-auto">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 text-blue-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                            <span className="text-xs font-medium md:text-sm">
                                {activeTerm?.label || semester?.name}
                                {(activeTerm?.schoolYear || semester?.school_year) && (
                                    <span className="ml-1 text-gray-600">
                                        ({activeTerm?.schoolYear || semester?.school_year})
                                    </span>
                                )}
                            </span>
                        </div>
                    )}
                </div>

                {/* Summary */}
                <div className="grid gap-3 rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                        <Layers className="h-8 w-8 text-blue-500" />
                        <div>
                            <p className="text-[11px] uppercase tracking-widest text-slate-400">Total Units</p>
                            <p className="text-xl font-semibold text-slate-900">{summary.totalUnits.toFixed(1)}</p>
                        </div>
                    </div>
                    {[
                        { key: "enrolled", label: "Active" },
                        { key: "dropped", label: "Dropped" },
                    ].map((item) => (
                        <div key={item.key} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                            <Shield className={`h-8 w-8 ${
                                item.key === "dropped"
                                    ? "text-rose-500"
                                    : item.key === "reserved"
                                    ? "text-amber-500"
                                    : "text-emerald-500"
                            }`} />
                            <div>
                                <p className="text-[11px] uppercase tracking-widest text-slate-400">{item.label}</p>
                                <p className="text-xl font-semibold text-slate-900">{summary.counts[item.key]}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2">
                    {["list", "timetable"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`rounded-md px-4 py-1.5 text-xs font-medium transition ${
                                activeTab === tab
                                    ? "bg-blue-600 text-white shadow"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            {tab === "list" ? "List View" : "Timetable"}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {activeTab === "list" ? (
                    <div className="space-y-3">
                        {/* Save Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={() => downloadImage(listRef, "Subject Lists")}
                                className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition hover:border-blue-300 hover:text-blue-600"
                                title="Save as Image"
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline">Save</span>
                            </button>
                        </div>

                        {subjects.length === 0 ? (
                            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700 shadow-sm">
                                You are not enrolled in any subjects this semester.
                            </div>
                        ) : (
                            <div ref={listRef} className="space-y-4">
                                {/* Desktop table */}
                                <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white shadow md:block">
                                    <table className="min-w-full text-[11px] text-gray-700 md:text-xs">
                                        <thead className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Code</th>
                                                <th className="px-3 py-2 text-left">Subject</th>
                                                 <th className="px-3 py-2 text-left">Units</th>
                                                <th className="px-3 py-2 text-left">Day</th>
                                                <th className="px-3 py-2 text-left">Time</th>
                                                <th className="px-3 py-2 text-left">Room</th>
                                                <th className="px-3 py-2 text-left">Faculty</th>
                                                <th className="px-3 py-2 text-left">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {subjects
                                                .filter(sub => sub.status?.toLowerCase() !== 'dropped')
                                                .map((sub, index) => {
                                                    const statusKey = sub.status?.toLowerCase?.();
                                                    const statusTone = STATUS_STYLES[statusKey] ?? "border-slate-200 bg-slate-50 text-slate-600";
                                                return (
                                                    <tr
                                                        key={sub.id ?? index}
                                                        className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition`}
                                                    >
                                                        <td className="px-3 py-2 font-semibold text-gray-900">{sub.code || "—"}</td>
                                                        <td className="px-3 py-2 text-slate-700">
                                                            <p>{sub.descriptive_title || "Untitled Subject"}</p>
                                                            <p className="text-[11px] uppercase tracking-widest text-slate-400">
                                                                {sub.semester_label || "Term"} · {sub.school_year || "SY"}
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-slate-700">{Number(sub.total_units ?? 0).toFixed(1)}</td>
                                                        <td className="px-3 py-2 text-gray-600">{sub.schedule?.day ?? "TBA"}</td>
                                                        <td className="px-3 py-2 text-gray-600">
                                                            {sub.schedule
                                                                ? `${formatTime(sub.schedule.start_time)} - ${formatTime(sub.schedule.end_time)}`
                                                                : "TBA"}
                                                        </td>
                                                        <td className="px-3 py-2">{sub.schedule?.room_number ?? "TBA"}</td>
                                                        <td className="px-3 py-2">{formatFacultyName(sub.faculty)}</td>
                                                        <td className="px-3 py-2">
                                                            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-[11px] font-semibold ${statusTone}`}>
                                                                {sub.status ?? "—"}
                                                            </span>
                                                            {sub.status === "dropped" && (
                                                                <div className="mt-1 text-[11px] text-rose-500">
                                                                    {sub.drop_reason && <p>{sub.drop_reason}</p>}
                                                                    <p>
                                                                        {formatDateTime(sub.dropped_at)}
                                                                        {sub.dropped_by?.name ? ` · ${sub.dropped_by.name}` : ""}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile cards */}
                                <div className="space-y-3 md:hidden">
                                    {subjects
                                        .filter(sub => sub.status?.toLowerCase() !== 'dropped')
                                        .map((sub, index) => (
                                        <div
                                            key={index}
                                            className="rounded-lg border border-gray-200 bg-white p-3 text-[11px] shadow-sm"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-gray-900">{sub.code}</span>
                                                <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                                                    {sub.semester_label || "Term"}
                                                </span>
                                            </div>
                                            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{sub.school_year || "—"}</div>
                                            <div className="mt-1 text-gray-700">{sub.descriptive_title}</div>
                                            <div className="mt-2 grid grid-cols-2 gap-2 text-gray-600">
                                                <div>
                                                    <span className="block text-[10px] uppercase text-gray-400">Time</span>
                                                    <span>
                                                        {sub.schedule
                                                            ? `${formatTime(sub.schedule.start_time)} - ${formatTime(sub.schedule.end_time)}`
                                                            : "TBA"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] uppercase text-gray-400">Room</span>
                                                    <span>{sub.schedule?.room_number ?? "TBA"}</span>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="block text-[10px] uppercase text-gray-400">Faculty</span>
                                                    <span>{formatFacultyName(sub.faculty)}</span>
                                                </div>
                                                <div className="col-span-2 flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                                                            STATUS_STYLES[sub.status?.toLowerCase?.()] ?? "border-slate-200 bg-slate-50 text-slate-600"
                                                        }`}
                                                    >
                                                        {sub.status ?? "—"}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">Units: {Number(sub.total_units ?? 0).toFixed(1)}</span>
                                                </div>
                                                {sub.status === "dropped" && (
                                                    <div className="col-span-2 rounded-md border border-rose-100 bg-rose-50 p-2 text-[10px] text-rose-600">
                                                        <p className="font-semibold">Dropped</p>
                                                        {sub.drop_reason && <p className="italic">{sub.drop_reason}</p>}
                                                        <p>{formatDateTime(sub.dropped_at)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // ✅ Timetable View
                    <div className="space-y-3">
                        <div className="flex justify-end">
                            <button
                                onClick={() => downloadImage(timetableRef, "Subject Timetable")}
                                className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition hover:border-blue-300 hover:text-blue-600"
                                title="Save as Image"
                            >
                                <Download size={16} />
                                <span className="hidden sm:inline">Save</span>
                            </button>
                        </div>

                        {timetable.length === 0 ? (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 shadow-sm">
                                <p className="font-medium">No schedules available</p>
                                <p className="text-xs text-blue-600 mt-1">Timetable information will appear once schedules are assigned.</p>
                            </div>
                        ) : (
                            <div ref={timetableRef} className="overflow-x-auto rounded-lg border border-slate-300 bg-white shadow-lg">
                                <table className="min-w-full border-collapse text-[11px] md:text-xs">
                                    {/* Header */}
                                    <thead>
                                        <tr>
                                            <th className="w-16 border border-slate-300 bg-slate-100 px-2 py-2 text-center font-semibold text-slate-700"></th>
                                            {days.map((day) => (
                                                <th key={day} className="border border-slate-300 bg-blue-600 px-4 py-3 text-center font-bold text-white uppercase tracking-wide">
                                                    {day}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    {/* Body with time slots */}
                                    <tbody>
                                        {["6", "7", "8", "9", "10", "11", "12"].map((hour) => (
                                            <tr key={hour}>
                                                {/* Time slot label */}
                                                <td className="border border-slate-300 bg-slate-50 px-2 py-2 text-center font-semibold text-slate-600">
                                                    <div className="text-xs font-bold">{hour}</div>
                                                    <div className="text-[9px] text-slate-500">{parseInt(hour) >= 12 ? "pm" : "am"}</div>
                                                </td>

                                                {/* Days */}
                                                {days.map((day) => {
                                                    const daySchedules = timetable.filter((t) => t.day?.startsWith(day));
                                                    const scheduleInSlot = daySchedules.find((t) => {
                                                        const startHour = parseInt(t.start.split(":")[0]);
                                                        return startHour == hour;
                                                    });

                                                    return (
                                                        <td
                                                            key={`${day}-${hour}`}
                                                            className="border border-slate-200 bg-white p-1 text-center align-top"
                                                        >
                                                            {scheduleInSlot ? (
                                                                <div className="rounded border-l-4 border-l-blue-500 border border-slate-300 bg-gradient-to-br from-blue-50 to-blue-100 p-2 text-[10px] shadow-sm">
                                                                    <p className="font-bold text-blue-900 uppercase tracking-tight">{scheduleInSlot.code}</p>
                                                                    <p className="mt-0.5 text-[9px] text-blue-800 font-medium">{scheduleInSlot.title}</p>
                                                                    <p className="mt-0.5 text-[9px] text-blue-700 font-semibold">{scheduleInSlot.room}</p>
                                                                    <p className="mt-1 text-[9px] text-blue-600 italic">{scheduleInSlot.start} - {scheduleInSlot.end}</p>
                                                                </div>
                                                            ) : (
                                                                <div className="h-12 bg-white"></div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </StudentLayout>
    );
}
