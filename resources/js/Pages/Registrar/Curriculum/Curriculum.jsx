import React, { useState } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import RegistrarLayout from '@/Layouts/RegistrarLayout';
import { Files, FileX, MagnifyingGlass } from 'phosphor-react';

export default function Curriculum() {
  const { curricula = { data: [], links: [] }, courses = [] } = usePage().props;
  const [search, setSearch] = useState('');
  const [activeCourseId, setActiveCourseId] = useState('all');

  const filtered = curricula.data.filter(c =>
    (!search || c.name?.toLowerCase().includes(search.toLowerCase()) || (c.description||'').toLowerCase().includes(search.toLowerCase())) &&
    (activeCourseId === 'all' || c.courses_id?.toString() === activeCourseId.toString())
  );

  return (
    <RegistrarLayout>
      <div className="text-gray-800 font-[Poppins] px-4 py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold">Curricula Overview</h1>
          <p className="text-xs text-gray-500">Browse curricula by course or search name/description.</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="relative w-full sm:w-60">
            <MagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-8 pr-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition"
            />
          </div>

          <select
            value={activeCourseId}
            onChange={e => setActiveCourseId(e.target.value)}
            className="w-full sm:w-48 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition"
          >
            <option value="all">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.length > 0 ? filtered.map(curr => (
            <div
              key={curr.id}
              onClick={() => router.get(route('registrar.curriculum.show', curr.id))}
              className="bg-white rounded-lg shadow border border-gray-200 p-3 flex flex-col justify-between relative cursor-pointer hover:shadow-md transition transform hover:-translate-y-0.5 text-xs"
            >
              <div className="absolute -top-3 left-3 w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center font-bold text-sm">
                {curr.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute top-2 right-2 text-gray-400"><Files size={18} weight="duotone" /></div>

              <div className="mt-6">
                <h3 className="font-semibold truncate">{curr.name}</h3>
                <p className="text-gray-500 line-clamp-2">{curr.description || 'No description'}</p>
              </div>

              <div className="mt-2">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  curr.status === 'approved' ? 'bg-green-100 text-green-700' :
                  curr.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {curr.status}
                </span>
              </div>
            </div>
          )) : (
            <div className="col-span-full flex flex-col items-center justify-center py-8 text-gray-500">
              <FileX size={40} className="text-gray-400 mb-2" weight="duotone" />
              <span className="text-xs font-medium">No curricula found</span>
            </div>
          )}
        </div>

        {/* Pagination */}
        {curricula.links.length > 1 && (
          <div className="flex justify-center p-4">
            <nav className="flex gap-1 text-xs">
              {curricula.links.map((link, i) => (
                <Link
                  key={i}
                  href={link.url || '#'}
                  className={`px-2 py-1 rounded border transition ${
                    link.active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                />
              ))}
            </nav>
          </div>
        )}
      </div>
    </RegistrarLayout>
  );
}
