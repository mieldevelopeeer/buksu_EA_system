import React, { useState, useRef } from "react";
import { Head, usePage } from "@inertiajs/react";
import StudentLayout from "@/Layouts/StudentLayout";
import html2canvas from "html2canvas";
import { Download, BookOpen } from "lucide-react"; // ✅ simple icon

export default function MyEnrolledSub() {
    const { subjects = [], semester } = usePage().props;
    const [activeTab, setActiveTab] = useState("list");
    const listRef = useRef(null);
    const timetableRef = useRef(null);

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

    // ✅ Extract timetable
    const timetable = subjects
        .filter((sub) => sub.schedule)
        .map((sub) => ({
            code: sub.code,
            title: sub.descriptive_title,
            day: sub.schedule.day ?? "TBA",
            start: formatTime(sub.schedule.start_time),
            end: formatTime(sub.schedule.end_time),
            room: sub.schedule.room_number ?? "TBA",
        }));

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

                    {semester && (
                        <div className="flex items-center gap-2 self-start rounded-full border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-1.5 text-blue-700 shadow-sm md:self-auto">
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
                                {semester.name}
                                {semester.school_year && (
                                    <span className="ml-1 text-gray-600">({semester.school_year})</span>
                                )}
                            </span>
                        </div>
                    )}
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
                                                <th className="px-3 py-2 text-left">Day</th>
                                                <th className="px-3 py-2 text-left">Time</th>
                                                <th className="px-3 py-2 text-left">Room</th>
                                                <th className="px-3 py-2 text-left">Faculty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {subjects.map((sub, index) => (
                                                <tr
                                                    key={index}
                                                    className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition`}
                                                >
                                                    <td className="px-3 py-2 font-medium text-gray-900">{sub.code}</td>
                                                    <td className="px-3 py-2">{sub.descriptive_title}</td>
                                                    <td className="px-3 py-2 text-gray-600">{sub.schedule?.day ?? "TBA"}</td>
                                                    <td className="px-3 py-2 text-gray-600">
                                                        {sub.schedule
                                                            ? `${formatTime(sub.schedule.start_time)} - ${formatTime(sub.schedule.end_time)}`
                                                            : "TBA"}
                                                    </td>
                                                    <td className="px-3 py-2">{sub.schedule?.room_number ?? "TBA"}</td>
                                                    <td className="px-3 py-2">{formatFacultyName(sub.faculty)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile cards */}
                                <div className="space-y-3 md:hidden">
                                    {subjects.map((sub, index) => (
                                        <div
                                            key={index}
                                            className="rounded-lg border border-gray-200 bg-white p-3 text-[11px] shadow-sm"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-gray-900">{sub.code}</span>
                                                <span className="text-gray-600">{sub.schedule?.day ?? "TBA"}</span>
                                            </div>
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
                            <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700 shadow-sm">
                                Timetable information will appear once schedules are assigned.
                            </div>
                        ) : (
                            <div ref={timetableRef} className="overflow-x-auto">
                                <table className="min-w-[560px] text-[11px] border border-gray-200 rounded-lg bg-white text-gray-700 shadow md:min-w-full md:text-xs">
                                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 uppercase">
                                        <tr>
                                            {days.map((day) => (
                                                <th key={day} className="px-3 py-2 border border-gray-200 text-center">
                                                    {day}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            {days.map((day) => (
                                                <td
                                                    key={day}
                                                    className="px-3 py-2 border border-gray-200 align-top"
                                                >
                                                    {timetable
                                                        .filter((t) => t.day?.startsWith(day))
                                                        .map((t, i) => (
                                                            <div
                                                                key={i}
                                                                className="mb-2 rounded border border-blue-200 bg-blue-50 p-2 text-blue-800 shadow-sm"
                                                            >
                                                                <span className="block font-semibold">{t.code}</span>
                                                                <span className="text-[10px]">
                                                                    {t.start} - {t.end}
                                                                </span>
                                                                <span className="block text-[10px] italic">{t.room}</span>
                                                            </div>
                                                        ))}
                                                </td>
                                            ))}
                                        </tr>
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
