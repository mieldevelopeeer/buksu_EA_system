import React from "react";
import { Head } from "@inertiajs/react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import GradeReport from "@/Pages/ProgramHead/PHreports/GradeReport";

export default function ProgramHeadGradeReport({ summary = {}, recent = [] }) {
  return (
    <ProgramHeadLayout>
      <Head title="Grades Report" />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <GradeReport summary={summary} recent={recent} />
      </div>
    </ProgramHeadLayout>
  );
}
