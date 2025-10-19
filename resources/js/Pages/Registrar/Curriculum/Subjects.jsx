import React, { useState } from 'react';
import RegistrarLayout from '@/Layouts/RegistrarLayout';
import { useForm, usePage, router } from '@inertiajs/react';
import { Plus, X, Eye, PencilSimple } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

export default function Subjects() {
  const { subjects = { data: [], from: 1, links: [] }, departments = [] } = usePage().props;

  const [activeDeptId, setActiveDeptId] = useState(null);
  const [disableDeptSelect, setDisableDeptSelect] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [filterCode, setFilterCode] = useState('');
  const [filterTitle, setFilterTitle] = useState('');

  const form = useForm({
    code: '',
    descriptive_title: '',
    department_id: '',
  });

  const filteredSubjects = subjects.data
    .filter((s) => !activeDeptId || s.department_id === activeDeptId)
    .filter((s) => s.code.toLowerCase().includes(filterCode.toLowerCase()))
    .filter((s) =>
      s.descriptive_title.toLowerCase().includes(filterTitle.toLowerCase())
    );

  const openAddModal = () => {
    form.reset();
    setEditMode(false);
    setSelectedSubject(null);
    if (activeDeptId) {
      form.setData('department_id', activeDeptId);
      setDisableDeptSelect(true);
    } else {
      form.setData('department_id', '');
      setDisableDeptSelect(false);
    }
    setShowModal(true);
  };

  const openEditModal = (subject) => {
    form.setData({
      code: subject.code,
      descriptive_title: subject.descriptive_title,
      department_id: subject.department_id || '',
    });
    setEditMode(true);
    setSelectedSubject(subject);
    setDisableDeptSelect(false);
    setShowModal(true);
  };

  const openViewModal = (subject) => {
    setSelectedSubject(subject);
    setViewModal(true);
  };

  const submit = (e) => {
    e.preventDefault();
    const successMsg = editMode ? 'Subject updated!' : 'Subject added!';
    const errorMsg = editMode ? 'Update failed.' : 'Add failed.';

    const onSuccess = () => {
      Swal.fire({ icon: 'success', text: successMsg, timer: 1500, showConfirmButton: false });
      setShowModal(false);
      setEditMode(false);
      setSelectedSubject(null);
      form.reset();
    };
    const onError = () => Swal.fire({ icon: 'error', text: errorMsg });

    if (editMode && selectedSubject) {
      form.put(route('registrar.subjects.update', selectedSubject.id), { onSuccess, onError });
    } else {
      form.post(route('registrar.subjects.store'), { onSuccess, onError });
    }
  };

  const handlePagination = (url) => url && router.visit(url);

  return (
    <RegistrarLayout>
      <div className="text-gray-800 px-4 py-3 font-[Poppins] text-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Subjects</h1>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1 shadow-sm text-xs"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-3 overflow-x-auto no-scrollbar">
          <div className="flex flex-nowrap gap-2 border-b border-gray-200 pb-1">
            <button
              onClick={() => setActiveDeptId(null)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeDeptId === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setActiveDeptId(dept.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeDeptId === dept.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {dept.name}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Filter by code"
            value={filterCode}
            onChange={(e) => setFilterCode(e.target.value)}
            className="border rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Filter by title"
            value={filterTitle}
            onChange={(e) => setFilterTitle(e.target.value)}
            className="border rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded shadow-sm">
          <table className="min-w-full text-xs">
            <thead className="bg-blue-50 text-blue-600 uppercase">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">Code</th>
                <th className="p-2">Title</th>
                <th className="p-2">Department</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((subject, idx) => (
                  <tr key={subject.id} className="border-t hover:bg-gray-50">
                    <td className="p-2">{subjects.from + idx}</td>
                    <td className="p-2">{subject.code}</td>
                    <td className="p-2">{subject.descriptive_title}</td>
                    <td className="p-2">{subject.department?.name || '-'}</td>
                    <td className="p-2 flex gap-1 justify-center">
                      <button
                        onClick={() => openEditModal(subject)}
                        className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs flex items-center gap-1 hover:bg-blue-200"
                      >
                        <PencilSimple size={12} /> Edit
                      </button>
                      <button
                        onClick={() => openViewModal(subject)}
                        className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs flex items-center gap-1 hover:bg-green-200"
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-gray-500 py-4 italic">
                    No subjects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center mt-3 space-x-1 text-xs">
          {subjects?.links?.map((link, idx) => (
            <button
              key={idx}
              disabled={!link.url}
              dangerouslySetInnerHTML={{ __html: link.label }}
              onClick={() => handlePagination(link.url)}
              className={`px-2 py-1 border rounded ${
                link.active
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          ))}
        </div>

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-5 rounded-lg shadow-lg w-full max-w-sm text-sm"
              >
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-base font-semibold">
                    {editMode ? 'Edit Subject' : 'Add Subject'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={submit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Code</label>
                    <input
                      type="text"
                      value={form.data.code}
                      onChange={(e) => form.setData('code', e.target.value)}
                      className="w-full border rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Title</label>
                    <input
                      type="text"
                      value={form.data.descriptive_title}
                      onChange={(e) => form.setData('descriptive_title', e.target.value)}
                      className="w-full border rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Department</label>
                    <select
                      value={form.data.department_id}
                      onChange={(e) => form.setData('department_id', e.target.value)}
                      disabled={disableDeptSelect}
                      className={`w-full border rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 ${
                        disableDeptSelect ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="">-- Select --</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={form.processing}
                    className={`w-full text-white py-1.5 rounded-md text-xs ${
                      form.processing
                        ? 'bg-blue-400'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {form.processing ? 'Saving...' : 'Save'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Modal */}
        <AnimatePresence>
          {viewModal && selectedSubject && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-5 rounded-lg shadow-lg w-full max-w-sm text-sm"
              >
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-base font-semibold">Subject Info</h2>
                  <button
                    onClick={() => {
                      setViewModal(false);
                      setSelectedSubject(null);
                    }}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-2 text-xs text-gray-700">
                  <p>
                    <strong>Code:</strong> {selectedSubject.code}
                  </p>
                  <p>
                    <strong>Title:</strong> {selectedSubject.descriptive_title}
                  </p>
                  <p>
                    <strong>Department:</strong> {selectedSubject.department?.name || '-'}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom CSS */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </RegistrarLayout>
  );
}
