// resources/js/Pages/ProgramHead/Faculty/FacultyLoad.jsx
import React, { useMemo, useState } from "react";
import ProgramHeadLayout from "@/Layouts/ProgramHeadLayout";
import { usePage } from "@inertiajs/react";
import { Pencil, Users, MagnifyingGlass, Book, Eye, Printer, ArrowsDownUp } from "phosphor-react";

export default function FacultyLoad() {
  const { faculties = [], activeSemester } = usePage().props; // controller now provides activeSemester

  // Local state: search, sort, pagination
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name | subjects | units | students | official
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [showModal, setShowModal] = useState(false);
  const [modalFaculty, setModalFaculty] = useState(null);

  // Helpers to safely extract loads and totals
  const getLoads = (f) => (f?.facultyLoads || f?.faculty_loads || f?.class_schedules || []);
  const totalSubjects = (f) => getLoads(f).length;
  const totalUnits = (f) => {
    // Prefer backend aggregate if present
    if (typeof f?.total_units_sum === 'number') return f.total_units_sum;
    return getLoads(f).reduce((sum, x) => sum + (Number(x?.total_units) || 0), 0);
  };
  const officialLoad = (f) => {
    if (typeof f?.official_load_sum === 'number') return f.official_load_sum;
    return getLoads(f).reduce((sum, x) => sum + (Number(x?.official_load) || 0), 0);
  };
  const studentCount = (f) => {
    if (typeof f?.student_count_sum === 'number') return f.student_count_sum;
    return getLoads(f).reduce((sum, x) => sum + (Number(x?.student_count) || 0), 0);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? faculties.filter((f) => (
          `${f.fName || ''} ${f.lName || ''}`.toLowerCase().includes(q) ||
          (f?.department?.name || '').toLowerCase().includes(q)
        ))
      : faculties.slice();

    base.sort((a, b) => {
      if (sortBy === 'name') {
        const an = `${a.fName || ''} ${a.lName || ''}`.toLowerCase();
        const bn = `${b.fName || ''} ${b.lName || ''}`.toLowerCase();
        return an.localeCompare(bn);
      }
      if (sortBy === 'subjects') {
        return totalSubjects(b) - totalSubjects(a);
      }
      if (sortBy === 'units') {
        return totalUnits(b) - totalUnits(a);
      }
      if (sortBy === 'students') {
        return studentCount(b) - studentCount(a);
      }
      if (sortBy === 'official') {
        return officialLoad(b) - officialLoad(a);
      }
      return 0;
    });

    return base;
  }, [faculties, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  return (
    <ProgramHeadLayout>
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users size={20} className="text-blue-600" /> Faculty Load Overview
            </h1>
            <p className="text-xs text-gray-600 mt-1">
              Showing {filtered.length} faculty • Page {page} of {totalPages}
            </p>
            {activeSemester && (
              <div className="mt-1">
                <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Active Semester: {activeSemester.semester}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Sorting */}
            <div className="flex items-center gap-1 border rounded-md px-2 py-1 bg-white">
              <ArrowsDownUp size={16} className="text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="text-xs outline-none"
              >
                <option value="name">Sort: Name</option>
                <option value="subjects">Sort: Subjects</option>
                <option value="units">Sort: Units</option>
                <option value="official">Sort: Official Load</option>
                <option value="students">Sort: Students</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass size={16} className="text-gray-400 absolute left-2 top-2.5" />
            <input
              type="text"
              placeholder="Search by name or department..."
              className="border border-gray-300 rounded-md pl-8 pr-3 py-2 w-full text-sm"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Faculty Load Table */}
        <div className="overflow-x-auto rounded-md border shadow-sm">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-blue-50 text-blue-700">
              <tr>
                <th className="py-2 px-3 text-left">#</th>
                <th className="py-2 px-3 text-left">Faculty</th>
                <th className="py-2 px-3 text-left">Department</th>
                <th className="py-2 px-3 text-left">Subjects</th>
                <th className="py-2 px-3 text-left">Units</th>
                <th className="py-2 px-3 text-left">Official Load</th>
                <th className="py-2 px-3 text-left">Students</th>
                <th className="py-2 px-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length > 0 ? (
                pageItems.map((faculty, idx) => {
                  const subjCount = totalSubjects(faculty);
                  const units = totalUnits(faculty);
                  const offLoad = officialLoad(faculty);
                  const students = studentCount(faculty);
                  return (
                    <tr key={faculty.id} className="hover:bg-gray-50 border-t">
                      <td className="py-2 px-3">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                            {(faculty.fName || '?')[0]}{(faculty.lName || '?')[0]}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{`${faculty.fName || ''} ${faculty.lName || ''}`.trim()}</div>
                            {faculty?.id_number && (
                              <div className="text-[11px] text-gray-500">ID: {faculty.id_number}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {faculty?.department?.name || '—'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="inline-flex items-center gap-1 text-gray-700">
                          <Book size={14} className="text-indigo-600" />
                          <span className="font-medium">{subjCount}</span>
                          <span className="text-xs text-gray-500">subject{subjCount === 1 ? '' : 's'}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="inline-flex items-center gap-1 text-gray-700">
                          <span className="font-medium">{units}</span>
                          <span className="text-xs text-gray-500">units</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="inline-flex items-center gap-1 text-gray-700">
                          <span className="font-medium">{offLoad}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="inline-flex items-center gap-1 text-gray-700">
                          <span className="font-medium">{students}</span>
                          <span className="text-xs text-gray-500">students</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <button className="px-2 py-1 rounded border text-xs inline-flex items-center gap-1 hover:bg-blue-50" onClick={() => { setModalFaculty(faculty); setShowModal(true); }}>
                            <Eye size={14} className="text-blue-700" />
                            View
                          </button>
                          <button className="px-2 py-1 rounded border text-xs inline-flex items-center gap-1 hover:bg-emerald-50">
                            <Printer size={14} className="text-emerald-700" />
                            Print
                          </button>
                          <button className="px-2 py-1 rounded bg-blue-600 text-white text-xs inline-flex items-center gap-1 hover:bg-blue-700">
                            <Pencil size={14} />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500">No faculties found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > pageSize && (
          <div className="flex items-center justify-between mt-3 text-sm">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded border ${page === i + 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
        {/* Details Modal */}
        <LoadsModal open={showModal} onClose={() => setShowModal(false)} faculty={modalFaculty} />
      </div>
    </ProgramHeadLayout>
  );
}

// Simple modal to show faculty loads
function LoadsModal({ open, onClose, faculty }) {
  if (!open || !faculty) return null;
  const loads = (faculty?.facultyLoads || faculty?.faculty_loads || []).slice();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between bg-blue-50">
          <div className="text-sm font-semibold text-gray-800">Loads • {`${faculty.fName || ''} ${faculty.lName || ''}`.trim()}</div>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>✕</button>
        </div>
        <div className="p-3 max-h-[70vh] overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="border p-2 text-left">Curriculum Subj</th>
                <th className="border p-2 text-left">Course ID</th>
                <th className="border p-2 text-left">Type</th>
                <th className="border p-2 text-left">Units</th>
                <th className="border p-2 text-left">Official</th>
                <th className="border p-2 text-left">Students</th>
                <th className="border p-2 text-left">Semester</th>
              </tr>
            </thead>
            <tbody>
              {loads.length > 0 ? loads.map((l) => (
                <tr key={l.id}>
                  <td className="border p-2">{l.curriculum_subject_id}</td>
                  <td className="border p-2">{l.courses_id ?? '—'}</td>
                  <td className="border p-2">{l.type ?? '—'}</td>
                  <td className="border p-2">{l.total_units ?? 0}</td>
                  <td className="border p-2">{l.official_load ?? 0}</td>
                  <td className="border p-2">{l.student_count ?? 0}</td>
                  <td className="border p-2">{l.semester_id}</td>
                </tr>
              )) : (
                <tr>
                  <td className="border p-3 text-center text-gray-500" colSpan={7}>No loads</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t bg-gray-50 flex justify-end">
          <button className="px-3 py-1.5 border rounded text-xs hover:bg-white" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
