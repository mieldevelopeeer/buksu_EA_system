
import React from 'react';
import RegistrarLayout from '@/Layouts/RegistrarLayout';
import { Plus } from 'phosphor-react';

export default function Curriculum() {
  return (
    <RegistrarLayout>
      <div className="text-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Curriculum</h1>
          <button className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 transition">
            <Plus size={18} />
            <span>Create Curriculum</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-blue-100 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Curriculum Name</th>
                <th className="px-4 py-2 text-left">Program</th>
                <th className="px-4 py-2 text-left">Year Created</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Replace this with dynamic data */}
              <tr className="border-t">
                <td className="px-4 py-2">BSIT 2025 Curriculum</td>
                <td className="px-4 py-2">BS in Information Technology</td>
                <td className="px-4 py-2">2025</td>
                <td className="px-4 py-2">
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Active</span>
                </td>
                <td className="px-4 py-2 text-center space-x-2">
                  <button className="text-blue-600 hover:underline">Edit</button>
                  <button className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
              {/* Add more rows dynamically */}
            </tbody>
          </table>
        </div>
      </div>
    </RegistrarLayout>
  );
}
