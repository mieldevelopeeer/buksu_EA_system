import React from "react";
import { Head, usePage } from "@inertiajs/react";
import StudentLayout from "@/Layouts/StudentLayout";
import { BookOpen } from "lucide-react";

const gradeTone = (remarks) => {
  const value = String(remarks || "").toLowerCase();
  if (value === "passed") return "text-green-600";
  if (value === "failed") return "text-red-600";
  return "text-gray-500";
};

const formatScore = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : value ?? "-";

export default function Grades() {
  const { grades = [] } = usePage().props;

  return (
    <StudentLayout>
      <Head title="My Grades" />

      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="flex items-center gap-2 text-lg md:text-xl font-semibold text-gray-800">
            <BookOpen className="w-5 h-5 text-blue-600" />
            My Grades
          </h1>
        </div>

        {grades.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm p-4 rounded-md shadow-sm text-center">
            No grades available yet.
          </div>
        ) : (
          <div className="overflow-x-auto bg-white shadow rounded-lg border border-gray-200">
            <table className="min-w-full text-[12px] md:text-sm text-gray-700">
              <thead className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 uppercase tracking-wider text-xs md:text-sm">
                <tr>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Subject</th>
                  <th className="px-3 py-2 text-center">Midterm</th>
                  <th className="px-3 py-2 text-center">Final</th>
                  <th className="px-3 py-2 text-center">Cumulative</th>
                  <th className="px-3 py-2 text-center">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g, index) => {
                  const cumulativeValue =
                    typeof g.cumulative === "number"
                      ? g.cumulative
                      : typeof g.midterm === "number" && typeof g.final === "number"
                      ? (g.midterm + g.final) / 2
                      : g.grade;
                  const derivedRemarks = (() => {
                    if (g.remarks) return g.remarks;
                    if (typeof cumulativeValue === "number") {
                      return cumulativeValue <= 3 ? "Passed" : "Failed";
                    }
                    return "Pending";
                  })();

                  const tone = gradeTone(derivedRemarks);

                  return (
                    <tr
                      key={index}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-gray-100 transition-colors`}
                    >
                      <td className="px-3 py-2 font-medium text-gray-900">{g.code}</td>
                      <td className="px-3 py-2">{g.title}</td>
                      <td className="px-3 py-2 text-center">{formatScore(g.midterm)}</td>
                      <td className="px-3 py-2 text-center">{formatScore(g.final)}</td>
                      <td className={`px-3 py-2 text-center font-semibold ${tone}`}>
                        {formatScore(cumulativeValue)}
                      </td>
                      <td className={`px-3 py-2 text-center font-medium ${tone}`}>
                        {derivedRemarks}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
