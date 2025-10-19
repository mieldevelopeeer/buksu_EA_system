import React, { useState } from "react";
import { Head } from "@inertiajs/react";
import RegistrarLayout from "@/Layouts/RegistrarLayout";
import { Search } from "lucide-react";

export default function ProgramHeads({ programHeads = [] }) {
  const [search, setSearch] = useState("");

  // Filter program heads based on search
  const filteredHeads = programHeads.filter((head) =>
    `${head.fName} ${head.mName} ${head.lName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <RegistrarLayout>
      <Head title="Program Heads" />
      <div className="p-4 font-sans text-gray-800 text-xs">
        <h1 className="text-sm font-semibold mb-4">Program Heads</h1>

        {/* Search Bar */}
        <div className="flex justify-end mb-4">
          <div className="relative w-full max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search program heads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-full border border-gray-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder-gray-400 text-[11px]"
            />
          </div>
        </div>

        {filteredHeads.length === 0 ? (
          <p className="text-gray-400 text-center py-8 italic text-xs">
            No program heads found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white shadow-sm rounded-lg divide-y divide-gray-200 text-[12px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600 text-[11px] font-medium uppercase tracking-wide">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-gray-600 text-[11px] font-medium uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-gray-600 text-[11px] font-medium uppercase tracking-wide">
                    Department
                  </th>
                  <th className="px-3 py-2 text-left text-gray-600 text-[11px] font-medium uppercase tracking-wide">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHeads.map((head, index) => (
                  <tr
                    key={head.id}
                    className="hover:bg-indigo-50/40 transition"
                  >
                    <td className="px-3 py-2 text-gray-700">{index + 1}</td>
                    <td className="px-3 py-2 text-gray-800">
                      {`${head.lName}, ${head.fName} ${head.mName}`}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {head.department?.name || "N/A"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {head.email || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}
