  import React, { useState } from 'react';
  import { useForm, usePage, router, Link } from '@inertiajs/react';
  import RegistrarLayout from '@/Layouts/RegistrarLayout';
  import { Plus, PencilSimple, X, CheckCircle, Circle } from 'phosphor-react';
  import { motion, AnimatePresence } from 'framer-motion';
  import Swal from 'sweetalert2';

  function getCurrentSchoolYear() {
    const now = new Date();
    const year = now.getFullYear();
    const nextYear = year + 1;
    return `${year}-${nextYear}`;
  }

  export default function AcademicYear() {
    const { academicYears = { data: [], from: 1, links: [] } } = usePage().props;

    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedYear, setSelectedYear] = useState(null);

    const form = useForm({
      school_year: '',
      is_active: false,
    });
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end', // right side
      showConfirmButton: false,
      timer: 1000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });


    const openAddModal = () => {
      form.reset();
      form.setData('school_year', getCurrentSchoolYear());
      form.setData('is_active', false);
      setEditMode(false);
      setSelectedYear(null);
      setShowModal(true);
    };

    const openEditModal = (year) => {
      form.setData({
        school_year: year.school_year,
        is_active: year.is_active,
      });
      setSelectedYear(year);
      setEditMode(true);
      setShowModal(true);
    };


    const submit = (e) => {
      e.preventDefault();

      const onSuccess = () => {
        Toast.fire({
          icon: 'success',
          title: editMode ? 'Academic Year updated!' : 'Academic Year added!'
        });
        setShowModal(false);
        setEditMode(false);
        setSelectedYear(null);
        form.reset();
      };

      const onError = () => {
        Toast.fire({
          icon: 'error',
          title: 'Failed to save academic year.'
        });
      };

      if (editMode && selectedYear) {
        form.put(route('registrar.academic-year.update', selectedYear.id), {
          onSuccess,
          onError,
        });
      } else {
        form.post(route('registrar.academic-year.store'), {
          onSuccess,
          onError,
        });
      }
    };


    const toggleStatus = (year) => {
      Swal.fire({
        title: `Change status for ${year.school_year}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, change',
      }).then((result) => {
        if (result.isConfirmed) {
          router.put(route('registrar.academic-year.toggleStatus', year.id), {
            is_active: !year.is_active,
          }, {
            onSuccess: () => {
              Toast.fire({
                icon: 'success',
                title: 'Status updated'
              });
            },
            onError: () => {
              Toast.fire({
                icon: 'error',
                title: 'Failed to update status.'
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
            <h1 className="text-2xl font-semibold">Academic Years</h1>
            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <Plus size={18} />
              Add Academic Year
            </button>
          </div>

          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-100 text-left uppercase text-gray-600">
                <tr>
                  <th className="p-3 w-12">#</th>
                  <th className="p-3">School Year</th>
                  <th className="p-3 w-24">Status</th>
                  <th className="p-3 w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-800">
                {academicYears.data.length > 0 ? (
                  academicYears.data.map((year, idx) => (
                    <tr
                      key={year.id}
                      className="border-t hover:bg-gray-50 transition"
                    >
                      <td className="p-3">{academicYears.from + idx}</td>
                      <td className="p-3">{year.school_year}</td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleStatus(year)}
                          className="flex items-center gap-1 text-sm font-semibold"
                        >
                          {year.is_active ? (
                            <CheckCircle size={20} className="text-green-600" />
                          ) : (
                            <Circle size={20} className="text-gray-400" />
                          )}
                          {year.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="p-3 flex gap-2">
                        <button
                          onClick={() => openEditModal(year)}
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
                      No academic years found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>


          </div>
          {/* Pagination */}
          {academicYears.links.length > 1 && (
            <div className="flex justify-center p-4">
              <nav className="flex gap-1">
                {academicYears.links.map((link, index) => (
                  <Link
                    key={index}
                    href={link.url || '#'}
                    className={`px-3 py-1 border rounded ${link.active
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
                      {editMode ? 'Edit Academic Year' : 'Add Academic Year'}
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
                      School Year
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2024-2025"
                      value={form.data.school_year}
                      onChange={(e) => form.setData('school_year', e.target.value)}
                      className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    {form.errors.school_year && (
                      <p className="text-red-600 text-sm">{form.errors.school_year}</p>
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
        </div>
      </RegistrarLayout>
    );
  }
