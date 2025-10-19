import React, { useState } from 'react';
import { useForm, usePage, router, Link } from '@inertiajs/react';
import RegistrarLayout from '@/Layouts/RegistrarLayout';
import { Plus, PencilSimple, X, CheckCircle, Circle } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

export default function Semester() {
  const { semesters = { data: [], from: 1, links: [] } } = usePage().props;

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState(null);

  const form = useForm({
    semester: '',
    is_active: false,
  });

  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  const openAddModal = () => {
    form.reset();
    form.setData('semester', '');
    form.setData('is_active', false);
    setEditMode(false);
    setSelectedSemester(null);
    setShowModal(true);
  };

  const openEditModal = (semester) => {
    form.setData({
      semester: semester.semester,
      is_active: semester.is_active,
    });
    setSelectedSemester(semester);
    setEditMode(true);
    setShowModal(true);
  };

  const submit = (e) => {
    e.preventDefault();

    const onSuccess = () => {
      Toast.fire({
        icon: 'success',
        title: editMode ? 'Semester updated!' : 'Semester added!',
      });
      setShowModal(false);
      setEditMode(false);
      setSelectedSemester(null);
      form.reset();
    };

    const onError = () => {
      Toast.fire({
        icon: 'error',
        title: 'Failed to save semester.',
      });
    };

    if (editMode && selectedSemester) {
      form.put(route('registrar.semesters.update', selectedSemester.id), {
        onSuccess,
        onError,
      });
    } else {
      form.post(route('registrar.semester.store'), {
        onSuccess,
        onError,
      });
    }
  };

const toggleStatus = (semester) => {
  Swal.fire({
    title: `Change status for ${semester.semester}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, change',
  }).then((result) => {
    if (result.isConfirmed) {
      router.get(route('registrar.semester.toggle', semester.id), {
        onSuccess: () => {
          Toast.fire({
            icon: 'success',
            title: 'Status updated',
          });
        },
        onError: () => {
          Toast.fire({
            icon: 'error',
            title: 'Failed to update status.',
          });
        },
      });
    }
  });
};


  return (
    <RegistrarLayout>
      <div className="text-gray-800 font-[Poppins] px-6 py-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Semesters</h1>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Plus size={18} />
            Add Semester
          </button>
        </div>

        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-blue-100 text-left uppercase text-gray-600">
              <tr>
                <th className="p-3 w-12">#</th>
                <th className="p-3">Semester</th>
                <th className="p-3 w-24">Status</th>
                <th className="p-3 w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {semesters.data.length > 0 ? (
                semesters.data.map((semester, idx) => (
                  <tr
                    key={semester.id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="p-3">{semesters.from + idx}</td>
                    <td className="p-3">{semester.semester}</td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleStatus(semester)}
                        className="flex items-center gap-1 text-sm font-semibold"
                      >
                        {semester.is_active ? (
                          <CheckCircle size={20} className="text-green-600" />
                        ) : (
                          <Circle size={20} className="text-gray-400" />
                        )}
                        {semester.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => openEditModal(semester)}
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        <PencilSimple size={16} /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center p-4 text-gray-500">
                    No semesters found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {semesters.links.length > 1 && (
          <div className="flex justify-center p-4">
            <nav className="flex gap-1">
              {semesters.links.map((link, index) => (
                <Link
                  key={index}
                  href={link.url || '#'}
                  className={`px-3 py-1 border rounded ${
                    link.active
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                />
              ))}
            </nav>
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    {editMode ? 'Edit Semester' : 'Add Semester'}
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
  Semester
</label>
<select
  value={form.data.semester}
  onChange={(e) => form.setData('semester', e.target.value)}
  className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
  required
>
  <option value="" disabled>Select Semester</option>
  <option value="First Semester">First Semester</option>
  <option value="Second Semester">Second Semester</option>
  <option value="Summer">Summer</option>
</select>
{form.errors.semester && (
  <p className="text-red-600 text-sm">{form.errors.semester}</p>
)}

                  <button
                    type="submit"
                    disabled={form.processing}
                    className={`w-full text-white px-4 py-2 rounded-md transition ${
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
      </div>
    </RegistrarLayout>
  );
}
