import React from "react";
import { Head } from "@inertiajs/react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import AttendanceReport from "@/Pages/ProgramHead/PHreports/AttendanceReport";

export default function ProgramHeadAttendanceReport({ summary = {}, recent = [] }) {
  return (
    <ProgramHeadLayout>
      <Head title="Attendance Report" />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <AttendanceReport summary={summary} recent={recent} />
      </div>
    </ProgramHeadLayout>
  );
}
