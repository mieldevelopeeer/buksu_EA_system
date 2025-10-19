import React from "react";
import { Head } from "@inertiajs/react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import EnrollmentReport from "@/Pages/ProgramHead/PHreports/EnrollmentReport";

export default function ProgramHeadEnrollmentReport({ summary = {}, recent = [] }) {
  return (
    <ProgramHeadLayout>
      <Head title="Enrollment Report" />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <EnrollmentReport summary={summary} recent={recent} />
      </div>
    </ProgramHeadLayout>
  );
}
