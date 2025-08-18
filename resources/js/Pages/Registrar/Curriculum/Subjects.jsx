import React, { useState } from 'react';
import RegistrarLayout from '@/Layouts/RegistrarLayout';
import { useForm, usePage, router } from '@inertiajs/react';
import { Plus, X, Eye, PencilSimple } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

export default function Subjects() {
  const { subjects = { data: [], from: 1, links: [] }, departments = [] } = usePage().props;

  // State for current selected department tab: null means "All"
  const [activeDeptId, setActiveDeptId] = useState(null);

  // State to disable department select in Add modal if department tab active
  const [disableDeptSelect, setDisableDeptSelect] = useState(false);

  // Include department_id in form data
  const form = useForm({
    code: '',
    descriptive_title: '',
    department_id: '',
  });

  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Filter subjects by active department
  const filteredSubjects = activeDeptId
    ? subjects.data.filter((subject) => subject.department_id === activeDeptId)
    : subjects.data;

  const openAddModal = () => {
    form.reset();
    setEditMode(false);
    setSelectedSubject(null);

    if (activeDeptId) {
      form.setData('department_id', activeDeptId);
      setDisableDeptSelect(true); // disable select when specific dept tab is active
    } else {
      form.setData('department_id', '');
      setDisableDeptSelect(false); // enable select for "All" tab
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
    setDisableDeptSelect(false); // always enable department select in edit mode
    setShowModal(true);
  };

  const openViewModal = (subject) => {
    setSelectedSubject(subject);
    setViewModal(true);
  };

  const submit = (e) => {
    e.preventDefault();

    const successMessage = editMode
      ? 'Subject updated successfully!'
      : 'Subject added successfully!';
    const errorMessage = editMode
      ? 'Failed to update subject.'
      : 'Failed to add subject.';

    const onSuccess = () => {
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: successMessage,
        timer: 2000,
        showConfirmButton: false,
      });
      setShowModal(false);
      setEditMode(false);
      setSelectedSubject(null);
      form.reset();
    };

    const onError = () => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
      });
    };

    if (editMode && selectedSubject) {
      form.put(route('registrar.subjects.update', selectedSubject.id), {
        onSuccess,
        onError,
      });
    } else {
      form.post(route('registrar.subjects.store'), {
        onSuccess,
        onError,
      });
    }
  };

  const handlePagination = (url) => {
    if (url) router.visit(url);
  };

  return (
    <RegistrarLayout>
      <div className="text-gray-800 px-6 py-4 font-[Poppins]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-wide">Subjects List</h1>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 shadow transition"
          >
            <Plus size={18} /> Add Subject
          </button>
        </div>

        {/* Department Tabs */}
        <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-300">
          <button
            onClick={() => setActiveDeptId(null)}
            className={`px-4 py-2 rounded-t-md font-semibold ${activeDeptId === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            All
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setActiveDeptId(dept.id)}
              className={`px-4 py-2 rounded-t-md font-semibold ${activeDeptId === dept.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              {dept.name}
            </button>
          ))}
        </div>

        {/* Subjects Table */}
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left uppercase text-gray-600">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Code</th>
                <th className="p-3">Descriptive Title</th>
                <th className="p-3">Department</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((subject, index) => (
                  <tr
                    key={subject.id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="p-3">{subjects.from + index}</td>
                    <td className="p-3">{subject.code}</td>
                    <td className="p-3">{subject.descriptive_title}</td>
                    <td className="p-3">{subject.department?.name || '-'}</td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => openEditModal(subject)}
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                      >
                        <PencilSimple size={16} /> Edit
                      </button>
                      <button
                        onClick={() => openViewModal(subject)}
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition"
                      >
                        <Eye size={16} /> View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-gray-500 p-4">
                    No subjects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center items-center mt-4 space-x-2">
          {subjects?.links?.map((link, index) => (
            <button
              key={index}
              disabled={!link.url}
              dangerouslySetInnerHTML={{ __html: link.label }}
              onClick={() => handlePagination(link.url)}
              className={`px-3 py-1 text-sm border rounded ${link.active
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
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
              className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    {editMode ? 'Edit Subject' : 'Add Subject'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-600 hover:text-red-600 transition"
                  >
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    placeholder="eg., BSIT"
                    value={form.data.code}
                    onChange={(e) => form.setData('code', e.target.value)}
                    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                  />
                  {form.errors.code && (
                    <p className="text-red-600 text-sm">{form.errors.code}</p>
                  )}

                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descriptive Title
                  </label>

                  <input
                    type="text"
                    placeholder="Descriptive Title"
                    value={form.data.descriptive_title}
                    onChange={(e) =>
                      form.setData('descriptive_title', e.target.value)
                    }
                    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                  />
                  {form.errors.descriptive_title && (
                    <p className="text-red-600 text-sm">
                      {form.errors.descriptive_title}
                    </p>
                  )}
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>

                  {/* Department Select */}
                  <select
                    value={form.data.department_id}
                    onChange={(e) => form.setData('department_id', e.target.value)}
                    disabled={disableDeptSelect}
                    className={`w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 ${disableDeptSelect ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {form.errors.department_id && (
                    <p className="text-red-600 text-sm">{form.errors.department_id}</p>
                  )}

                  <button
                    type="submit"
                    disabled={form.processing}
                    className={`w-full text-white px-4 py-2 rounded-md transition ${form.processing ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
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
              className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Subject Info</h2>
                  <button
                    onClick={() => {
                      setViewModal(false);
                      setSelectedSubject(null);
                    }}
                    className="text-gray-600 hover:text-red-600 transition"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <strong>Code:</strong> {selectedSubject.code}
                  </p>
                  <p>
                    <strong>Descriptive Title:</strong> {selectedSubject.descriptive_title}
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
    </RegistrarLayout>
  );
}
