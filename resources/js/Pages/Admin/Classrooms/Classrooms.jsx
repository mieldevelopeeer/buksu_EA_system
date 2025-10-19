import React, { useState } from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Plus, PencilSimple, X, ChalkboardTeacher, FileX } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

export default function Classrooms() {
  const { classrooms = [] } = usePage().props;

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState(null);

  const form = useForm({
    room_number: '',
    capacity: '',
  });

  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1000,
    timerProgressBar: true,
  });

  const openAddModal = () => {
    form.reset();
    setEditMode(false);
    setSelectedClassroom(null);
    setShowModal(true);
  };

  const openEditModal = (classroom) => {
    form.setData({
      room_number: classroom.room_number,
      capacity: classroom.capacity,
    });
    setSelectedClassroom(classroom);
    setEditMode(true);
    setShowModal(true);
  };

  const submit = (e) => {
    e.preventDefault();
    const onSuccess = () => {
      Toast.fire({
        icon: 'success',
        title: editMode ? 'Classroom updated!' : 'Classroom added!',
      });
      setShowModal(false);
      setEditMode(false);
      setSelectedClassroom(null);
      form.reset();
    };

    const onError = () => {
      Toast.fire({
        icon: 'error',
        title: 'Failed to save classroom.',
      });
    };

    if (editMode && selectedClassroom) {
      form.put(route('admin.classrooms.update', selectedClassroom.id), { onSuccess, onError });
    } else {
      form.post(route('admin.classrooms.store'), { onSuccess, onError });
    }
  };

  return (
    <AdminLayout>
     <div className="px-6 py-4 font-[Poppins]">
  {/* Header */}
  <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-3">
    <h1 className="text-xl font-semibold text-gray-800 tracking-wide">Classrooms</h1>
    <button
      onClick={openAddModal}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm text-sm transition"
    >
      <Plus size={16} />
      Add Classroom
    </button>
  </div>

  {/* Classroom Grid */}
  {classrooms.length > 0 ? (
    <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-6">
      {classrooms.map((room) => (
        <div
          key={room.id}
          className="bg-white rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition p-5 relative flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-4">
            {/* Icon + Info */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full shadow-sm">
                <ChalkboardTeacher size={22} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  Room {room.room_number}
                </h3>
                <p className="text-xs text-gray-500">Capacity: {room.capacity}</p>
              </div>
            </div>

            {/* Edit button */}
            <button
              onClick={() => openEditModal(room)}
              className="p-2 text-gray-500 hover:text-blue-600 transition rounded-full hover:bg-gray-100"
            >
              <PencilSimple size={16} />
            </button>
          </div>

          {/* Optional future info area */}
          {/* <div className="text-xs text-gray-500">Some details...</div> */}
        </div>
      ))}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <FileX size={56} className="mb-3" weight="duotone" />
      <span className="text-sm font-medium">No classrooms found</span>
    </div>
  )}



        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {editMode ? 'Edit Classroom' : 'Add Classroom'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-red-600 transition"
                  >
                    <X size={22} />
                  </button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                 <div>
  <label className="block text-gray-700 font-medium mb-1">Room Number</label>
  <input
    type="text"
    value={form.data.room_number}
    onChange={(e) => form.setData('room_number', e.target.value)}
    className={`w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
      form.errors.room_number ? 'border-red-500' : ''
    }`}
    required
  />
  {form.errors.room_number && (
    <p className="text-red-600 text-sm mt-1">{form.errors.room_number}</p>
  )}
</div>

<div>
  <label className="block text-gray-700 font-medium mb-1">Capacity</label>
  <input
    type="number"
    value={form.data.capacity}
    onChange={(e) => form.setData('capacity', e.target.value)}
    className={`w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
      form.errors.capacity ? 'border-red-500' : ''
    }`}
    required
  />
  {form.errors.capacity && (
    <p className="text-red-600 text-sm mt-1">{form.errors.capacity}</p>
  )}
</div>


                  <button
                    type="submit"
                    disabled={form.processing}
                    className={`w-full py-2 px-4 rounded-lg font-medium text-white transition ${
                      form.processing ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
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
    </AdminLayout>
  );
}
